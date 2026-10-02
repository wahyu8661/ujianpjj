import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '20mb' }));

// Persistent Storage Directory
const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'exam_store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface ViolationEvent {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  type: string;
  description: string;
  timestamp: number;
  snapshotUrl?: string;
}

export interface StudentSession {
  id: string;
  name: string;
  studentClass: string;
  subject: string;
  status: 'active' | 'warning' | 'locked' | 'submitted' | 'offline';
  joinedAt: number;
  lastHeartbeat: number;
  violationsCount: number;
  violations: ViolationEvent[];
  cameraFrame?: string;
  screenFrame?: string;
  screenSharingActive: boolean;
  cameraActive: boolean;
  fullscreenActive: boolean;
  notes?: string;
}

export interface ExamConfig {
  title: string;
  subject: string;
  schoolName: string;
  formUrl: string;
  rombelFormUrls?: Record<string, string>;
  durationMinutes: number;
  maxViolationsAllowed: number;
  allowScreenStopToleranceSec: number;
  isExamStarted: boolean;
  isExamOpen: boolean;
}

export interface ExamArchive {
  id: string;
  createdAt: number;
  title: string;
  subject: string;
  schoolName: string;
  totalStudents: number;
  students: StudentSession[];
  violations: ViolationEvent[];
  notes?: string;
}

let examConfig: ExamConfig = {
  title: 'Penilaian Sumatif & Ujian Sekolah Daring',
  subject: 'Bahasa Indonesia & Literasi',
  schoolName: 'SMP - SMA Terpadu',
  formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScP_d300s4H-sample/viewform?embedded=true',
  rombelFormUrls: {},
  durationMinutes: 90,
  maxViolationsAllowed: 3,
  allowScreenStopToleranceSec: 10,
  isExamStarted: true,
  isExamOpen: true,
};

let students = new Map<string, StudentSession>();
let recentViolations: ViolationEvent[] = [];
let examArchives: ExamArchive[] = [];

// Persistence: Load from file
function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.config) {
        examConfig = { ...examConfig, ...data.config, isExamOpen: data.config.isExamOpen !== undefined ? data.config.isExamOpen : true };
      }
      if (Array.isArray(data.students)) {
        students = new Map(data.students.map((s: StudentSession) => [s.id, s]));
      }
      if (Array.isArray(data.violations)) {
        recentViolations = data.violations;
      }
      if (Array.isArray(data.archives)) {
        examArchives = data.archives;
      }
      console.log(`[Store] Loaded ${students.size} students, ${recentViolations.length} violations, and ${examArchives.length} archives from persistent disk.`);
    }
  } catch (err) {
    console.error('[Store] Failed to load store file:', err);
  }
}

// Persistence: Save to file (debounced)
let saveTimeout: any = null;
function scheduleSaveStore() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      // Strip base64 frames from long-term disk json to prevent huge file bloat
      const sanitizedStudents = Array.from(students.values()).map((s) => ({
        ...s,
        cameraFrame: undefined,
        screenFrame: undefined,
      }));

      const payload = {
        config: examConfig,
        students: sanitizedStudents,
        violations: recentViolations.slice(-500),
        archives: examArchives,
        updatedAt: Date.now(),
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Store] Failed to write to disk:', err);
    }
  }, 1000);
}

loadStore();

// WebSocket connection registry
interface ConnectedClient {
  ws: WebSocket;
  role: 'student' | 'proctor';
  studentId?: string;
}

const clients = new Set<ConnectedClient>();

function broadcastToProctors(data: any) {
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client.role === 'proctor' && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function broadcastToAll(data: any) {
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function sendToStudent(studentId: string, data: any) {
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client.role === 'student' && client.studentId === studentId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  let clientInfo: ConnectedClient = { ws, role: 'student' };
  clients.add(clientInfo);

  ws.on('message', (message: string) => {
    try {
      const msg = JSON.parse(message.toString());

      if (msg.type === 'proctor:register') {
        clientInfo.role = 'proctor';
        // Send initial state to proctor
        ws.send(JSON.stringify({
          type: 'initial_state',
          config: examConfig,
          students: Array.from(students.values()),
          violations: recentViolations.slice(-100),
          archives: examArchives,
        }));
        return;
      }

      if (msg.type === 'student:register') {
        clientInfo.role = 'student';
        clientInfo.studentId = msg.student.id;
        
        const existing = students.get(msg.student.id) || {
          id: msg.student.id,
          name: msg.student.name,
          studentClass: msg.student.studentClass,
          subject: msg.student.subject || examConfig.subject,
          status: 'active',
          joinedAt: Date.now(),
          lastHeartbeat: Date.now(),
          violationsCount: 0,
          violations: [],
          screenSharingActive: true,
          cameraActive: true,
          fullscreenActive: true,
        };

        existing.status = 'active';
        existing.lastHeartbeat = Date.now();
        existing.name = msg.student.name;
        existing.studentClass = msg.student.studentClass;
        students.set(existing.id, existing);
        scheduleSaveStore();

        broadcastToProctors({
          type: 'student:updated',
          student: existing,
        });

        // Send confirmation and config to student
        ws.send(JSON.stringify({
          type: 'student:registered',
          config: examConfig,
          student: existing,
        }));
        return;
      }

      if (msg.type === 'student:heartbeat' && clientInfo.studentId) {
        const student = students.get(clientInfo.studentId);
        if (student) {
          student.lastHeartbeat = Date.now();
          if (msg.cameraActive !== undefined) student.cameraActive = msg.cameraActive;
          if (msg.screenSharingActive !== undefined) student.screenSharingActive = msg.screenSharingActive;
          if (msg.fullscreenActive !== undefined) student.fullscreenActive = msg.fullscreenActive;
          
          broadcastToProctors({
            type: 'student:telemetry',
            studentId: student.id,
            lastHeartbeat: student.lastHeartbeat,
            cameraActive: student.cameraActive,
            screenSharingActive: student.screenSharingActive,
            fullscreenActive: student.fullscreenActive,
            status: student.status,
          });
        }
        return;
      }

      if (msg.type === 'student:stream_frame' && clientInfo.studentId) {
        const student = students.get(clientInfo.studentId);
        if (student) {
          student.lastHeartbeat = Date.now();
          if (msg.cameraFrame) student.cameraFrame = msg.cameraFrame;
          if (msg.screenFrame) student.screenFrame = msg.screenFrame;

          broadcastToProctors({
            type: 'student:stream_frame',
            studentId: student.id,
            cameraFrame: msg.cameraFrame,
            screenFrame: msg.screenFrame,
          });
        }
        return;
      }

      if (msg.type === 'student:violation' && clientInfo.studentId) {
        const student = students.get(clientInfo.studentId);
        if (student) {
          const violation: ViolationEvent = {
            id: 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            studentId: student.id,
            studentName: student.name,
            studentClass: student.studentClass,
            type: msg.violationType || 'other',
            description: msg.description || 'Pelanggaran terdeteksi',
            timestamp: Date.now(),
            snapshotUrl: msg.snapshotUrl,
          };

          student.violations.push(violation);
          student.violationsCount = student.violations.length;
          recentViolations.unshift(violation);

          if (student.violationsCount >= examConfig.maxViolationsAllowed) {
            student.status = 'locked';
            sendToStudent(student.id, {
              type: 'proctor:command',
              action: 'lock',
              message: `Batas pelanggaran (${examConfig.maxViolationsAllowed}) terlampaui. Layar Anda dikunci otomatis. Hubungi Pengawas.`,
            });
          } else {
            student.status = 'warning';
          }

          scheduleSaveStore();

          broadcastToProctors({
            type: 'alert:violation',
            violation,
            student,
          });
        }
        return;
      }

      if (msg.type === 'proctor:action') {
        const { targetStudentId, action, message } = msg;
        const student = students.get(targetStudentId);
        if (student) {
          if (action === 'lock') {
            student.status = 'locked';
          } else if (action === 'unlock') {
            student.status = 'active';
          } else if (action === 'reset_violations') {
            student.violationsCount = 0;
            student.status = 'active';
          }

          scheduleSaveStore();

          broadcastToProctors({
            type: 'student:updated',
            student,
          });

          sendToStudent(targetStudentId, {
            type: 'proctor:command',
            action,
            message,
          });
        }
        return;
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(clientInfo);
  });
});

// Periodic check for offline students (90 seconds timeout)
setInterval(() => {
  const now = Date.now();
  for (const [, student] of students) {
    if (student.status !== 'offline' && student.status !== 'submitted') {
      if (now - student.lastHeartbeat > 90000) {
        student.status = 'offline';
        broadcastToProctors({
          type: 'student:updated',
          student,
        });
      }
    }
  }
}, 10000);

// REST ENDPOINTS

// 1. Exam Configuration
app.get('/api/config', (_req, res) => {
  res.json(examConfig);
});

app.post('/api/config', (req, res) => {
  examConfig = { ...examConfig, ...req.body };
  scheduleSaveStore();
  broadcastToAll({
    type: 'config:updated',
    config: examConfig,
  });
  res.json({ success: true, config: examConfig });
});

// 2. Toggle Exam Access (Buka / Tutup Akses Ujian Langsung)
app.post('/api/exam/toggle-access', (req, res) => {
  const { isExamOpen } = req.body;
  if (typeof isExamOpen === 'boolean') {
    examConfig.isExamOpen = isExamOpen;
  } else {
    examConfig.isExamOpen = !examConfig.isExamOpen;
  }
  scheduleSaveStore();
  broadcastToAll({
    type: 'config:updated',
    config: examConfig,
  });
  console.log(`[Exam Access] Proctor changed exam status to: ${examConfig.isExamOpen ? 'TERBUKA' : 'DITUTUP'}`);
  res.json({ success: true, isExamOpen: examConfig.isExamOpen, config: examConfig });
});

// 3. Students Management
app.get('/api/students', (_req, res) => {
  res.json(Array.from(students.values()));
});

app.post('/api/students/register', (req, res) => {
  const { id, name, studentClass, subject } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'Missing student id or name' });
  }

  const existing = students.get(id) || {
    id,
    name,
    studentClass: studentClass || 'Umum',
    subject: subject || examConfig.subject,
    status: 'active' as const,
    joinedAt: Date.now(),
    lastHeartbeat: Date.now(),
    violationsCount: 0,
    violations: [],
    screenSharingActive: true,
    cameraActive: true,
    fullscreenActive: true,
  };

  existing.status = 'active';
  existing.lastHeartbeat = Date.now();
  existing.name = name;
  if (studentClass) existing.studentClass = studentClass;
  students.set(id, existing);
  scheduleSaveStore();

  broadcastToProctors({
    type: 'student:updated',
    student: existing,
  });

  res.json({ success: true, student: existing });
});

app.post('/api/students/heartbeat', (req, res) => {
  const { id, cameraActive, screenSharingActive, fullscreenActive, status } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const student = students.get(id);
  if (student) {
    student.lastHeartbeat = Date.now();
    if (status && status !== 'offline') student.status = status;
    if (cameraActive !== undefined) student.cameraActive = cameraActive;
    if (screenSharingActive !== undefined) student.screenSharingActive = screenSharingActive;
    if (fullscreenActive !== undefined) student.fullscreenActive = fullscreenActive;

    broadcastToProctors({
      type: 'student:telemetry',
      studentId: student.id,
      lastHeartbeat: student.lastHeartbeat,
      cameraActive: student.cameraActive,
      screenSharingActive: student.screenSharingActive,
      fullscreenActive: student.fullscreenActive,
      status: student.status,
    });
  }

  res.json({ success: true });
});

app.post('/api/students/stream', (req, res) => {
  const { id, cameraFrame, screenFrame } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const student = students.get(id);
  if (student) {
    student.lastHeartbeat = Date.now();
    if (cameraFrame) student.cameraFrame = cameraFrame;
    if (screenFrame) student.screenFrame = screenFrame;

    broadcastToProctors({
      type: 'student:stream_frame',
      studentId: student.id,
      cameraFrame,
      screenFrame,
    });
  }

  res.json({ success: true });
});

app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  students.delete(id);
  scheduleSaveStore();
  broadcastToProctors({
    type: 'student:removed',
    studentId: id,
  });
  res.json({ success: true });
});

// Clear active students (after archiving)
app.post('/api/students/reset', (_req, res) => {
  students.clear();
  recentViolations = [];
  scheduleSaveStore();
  broadcastToProctors({
    type: 'initial_state',
    config: examConfig,
    students: [],
    violations: [],
    archives: examArchives,
  });
  res.json({ success: true, message: 'Daftar peserta aktif berhasil dikosongkan.' });
});

// 4. Violations
app.get('/api/violations', (_req, res) => {
  res.json(recentViolations.slice(-100));
});

// 5. Exam Archives & History (Data Tersimpan untuk Diakses di Kemudian Hari)
app.get('/api/archives', (_req, res) => {
  res.json(examArchives);
});

app.post('/api/archives', (req, res) => {
  const { notes, clearActiveAfterSave } = req.body;
  const currentStudentList = Array.from(students.values()).map((s) => ({
    ...s,
    cameraFrame: undefined,
    screenFrame: undefined,
  }));

  const archiveEntry: ExamArchive = {
    id: 'arch_' + Date.now(),
    createdAt: Date.now(),
    title: examConfig.title,
    subject: examConfig.subject,
    schoolName: examConfig.schoolName,
    totalStudents: currentStudentList.length,
    students: currentStudentList,
    violations: [...recentViolations],
    notes: notes || 'Sesi ujian diarsipkan oleh pengawas.',
  };

  examArchives.unshift(archiveEntry);

  if (clearActiveAfterSave) {
    students.clear();
    recentViolations = [];
  }

  scheduleSaveStore();

  broadcastToProctors({
    type: 'initial_state',
    config: examConfig,
    students: Array.from(students.values()),
    violations: recentViolations,
    archives: examArchives,
  });

  res.json({ success: true, archive: archiveEntry, totalArchives: examArchives.length });
});

// 6. CSV Export Endpoint
app.get('/api/export/csv', (_req, res) => {
  const studentList = Array.from(students.values());
  const header = ['No', 'Nama Siswa', 'Rombel/Kelas', 'Mata Pelajaran', 'Status', 'Waktu Masuk', 'Jumlah Pelanggaran', 'Ringkasan Pelanggaran'];
  const rows = studentList.map((s, idx) => {
    const violationSummary = s.violations.map((v) => `[${v.type}] ${v.description}`).join('; ') || 'Tidak ada pelanggaran';
    const joinedStr = new Date(s.joinedAt).toLocaleString('id-ID');
    return [
      idx + 1,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.studentClass.replace(/"/g, '""')}"`,
      `"${s.subject.replace(/"/g, '""')}"`,
      s.status.toUpperCase(),
      `"${joinedStr}"`,
      s.violationsCount,
      `"${violationSummary.replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csv = [header.join(','), ...rows].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Rekap_Ujian_${Date.now()}.csv"`);
  res.send(csv);
});

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
