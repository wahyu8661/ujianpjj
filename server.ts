import express from 'express';
import http from 'http';
import path from 'path';
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

app.use(express.json({ limit: '15mb' }));

// In-memory state for exam session
export interface ViolationEvent {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  type: 'tab_switch' | 'fullscreen_exit' | 'screen_stopped' | 'camera_lost' | 'copy_paste' | 'inspect_attempt' | 'other';
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
}

let examConfig: ExamConfig = {
  title: 'Ujian Tengah / Akhir Semester Daring (PJJ Kabut Asap)',
  subject: 'Bahasa Indonesia & Literasi',
  schoolName: 'SMP Negeri Terpadu Indonesia',
  formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScP_d300s4H-sample/viewform?embedded=true',
  rombelFormUrls: {},
  durationMinutes: 90,
  maxViolationsAllowed: 3,
  allowScreenStopToleranceSec: 10,
  isExamStarted: true,
};

const students = new Map<string, StudentSession>();
const recentViolations: ViolationEvent[] = [];

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
          violations: recentViolations.slice(-50),
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
            type: msg.violationType,
            description: msg.description,
            timestamp: Date.now(),
            snapshotUrl: msg.snapshotUrl,
          };

          student.violationsCount += 1;
          student.violations.push(violation);
          recentViolations.push(violation);

          if (student.violationsCount >= examConfig.maxViolationsAllowed) {
            student.status = 'locked';
          } else {
            student.status = 'warning';
          }

          // Broadcast to proctors
          broadcastToProctors({
            type: 'alert:violation',
            violation,
            student,
          });

          // Send updated status back to student
          sendToStudent(student.id, {
            type: 'student:status_update',
            status: student.status,
            violationsCount: student.violationsCount,
            violation,
          });
        }
        return;
      }

      // Proctor actions
      if (msg.type === 'proctor:action' && clientInfo.role === 'proctor') {
        const target = students.get(msg.targetStudentId);
        if (target) {
          if (msg.action === 'lock') {
            target.status = 'locked';
          } else if (msg.action === 'unlock') {
            target.status = 'active';
          } else if (msg.action === 'reset_violations') {
            target.violationsCount = 0;
            target.status = 'active';
          }

          broadcastToProctors({
            type: 'student:updated',
            student: target,
          });

          sendToStudent(target.id, {
            type: 'proctor:command',
            action: msg.action,
            message: msg.message,
            status: target.status,
          });
        }
        return;
      }

      if (msg.type === 'proctor:update_config' && clientInfo.role === 'proctor') {
        examConfig = { ...examConfig, ...msg.config };
        broadcastToProctors({
          type: 'config:updated',
          config: examConfig,
        });

        // Broadcast to all students as well
        const configMsg = JSON.stringify({
          type: 'config:updated',
          config: examConfig,
        });
        for (const c of clients) {
          if (c.role === 'student' && c.ws.readyState === WebSocket.OPEN) {
            c.ws.send(configMsg);
          }
        }
        return;
      }

    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(clientInfo);
    if (clientInfo.studentId) {
      const student = students.get(clientInfo.studentId);
      if (student) {
        student.status = 'offline';
        broadcastToProctors({
          type: 'student:updated',
          student,
        });
      }
    }
  });
});

// Periodic check for offline students
setInterval(() => {
  const now = Date.now();
  for (const [, student] of students) {
    if (student.status !== 'offline' && student.status !== 'submitted') {
      if (now - student.lastHeartbeat > 20000) {
        student.status = 'offline';
        broadcastToProctors({
          type: 'student:updated',
          student,
        });
      }
    }
  }
}, 10000);

// REST Endpoints
app.get('/api/config', (_req, res) => {
  res.json(examConfig);
});

app.post('/api/config', (req, res) => {
  examConfig = { ...examConfig, ...req.body };
  broadcastToProctors({
    type: 'config:updated',
    config: examConfig,
  });
  res.json({ success: true, config: examConfig });
});

app.get('/api/students', (_req, res) => {
  res.json(Array.from(students.values()));
});

app.get('/api/violations', (_req, res) => {
  res.json(recentViolations.slice(-100));
});

// Seed sample students for realistic proctor demo if empty
function seedDemoExaminees() {
  if (students.size === 0) {
    const demoNames = [
      { name: 'Ahmad Faiz Pratama', studentClass: 'Rombel VII-Abu Bakar As Shiddiq (VII Ikhwan)' },
      { name: 'Siti Nurhaliza', studentClass: 'Rombel VII-Fatimah binti Muhammad (VII Akhwat)' },
      { name: 'Budi Santoso', studentClass: 'Rombel VIII - Umar bin Khattab (VIII Ikhwan)' },
      { name: 'Dewi Lestari', studentClass: 'Rombel VIII - Maryam binti Imron (VIII Akhwat A)' },
    ];

    demoNames.forEach((d, idx) => {
      const id = 'demo-std-' + (idx + 1);
      students.set(id, {
        id,
        name: d.name,
        studentClass: d.studentClass,
        subject: examConfig.subject,
        status: idx === 1 ? 'warning' : 'active',
        joinedAt: Date.now() - 15 * 60 * 1000,
        lastHeartbeat: Date.now(),
        violationsCount: idx === 1 ? 1 : 0,
        violations: idx === 1 ? [{
          id: 'v_demo_1',
          studentId: id,
          studentName: d.name,
          studentClass: d.studentClass,
          type: 'tab_switch',
          description: 'Membuka tab lain / jendela kehilangan fokus',
          timestamp: Date.now() - 4 * 60 * 1000,
        }] : [],
        screenSharingActive: true,
        cameraActive: true,
        fullscreenActive: true,
      });
    });
  }
}
seedDemoExaminees();

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
