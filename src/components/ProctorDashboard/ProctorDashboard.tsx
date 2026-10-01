import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Monitor, 
  AlertTriangle, 
  Lock, 
  Search, 
  Filter, 
  Settings, 
  PlusCircle, 
  FileText, 
  CheckCircle2, 
  Radio,
  Flame,
  Volume2,
  VolumeX,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { CLASS_OPTIONS, ExamConfig, StudentSession, ViolationEvent } from '../../types/exam';
import { StudentCard } from './StudentCard';
import { StudentDetailModal } from './StudentDetailModal';
import { ViolationAlertPanel } from './ViolationAlertPanel';
import { ExamSettingsModal } from './ExamSettingsModal';
import { PrintReportModal } from './PrintReportModal';
import { socketClient } from '../../utils/socket';
import { sounds } from '../../utils/audio';

interface ProctorDashboardProps {
  config: ExamConfig;
  onUpdateConfig: (newConfig: Partial<ExamConfig>) => void;
  soundEnabled: boolean;
}

export const ProctorDashboard: React.FC<ProctorDashboardProps> = ({
  config,
  onUpdateConfig,
  soundEnabled,
}) => {
  const [students, setStudents] = useState<StudentSession[]>([]);
  const [violations, setViolations] = useState<ViolationEvent[]>([]);
  const [activeToast, setActiveToast] = useState<ViolationEvent | null>(null);
  const [inspectingStudent, setInspectingStudent] = useState<StudentSession | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [showViolationsDrawer, setShowViolationsDrawer] = useState(false);

  // Initialize socket listener for proctoring
  useEffect(() => {
    socketClient.connect('proctor');

    // Fetch initial REST data as backup
    fetch('/api/students')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setStudents(data);
      })
      .catch(() => {});

    fetch('/api/violations')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setViolations(data);
      })
      .catch(() => {});

    // Subscribe to real-time events
    const unsubscribe = socketClient.subscribe((msg: any) => {
      if (msg.type === 'initial_state') {
        if (msg.students) setStudents(msg.students);
        if (msg.violations) setViolations(msg.violations);
      }

      if (msg.type === 'student:updated') {
        setStudents((prev) => {
          const index = prev.findIndex((s) => s.id === msg.student.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = { ...next[index], ...msg.student };
            return next;
          }
          return [msg.student, ...prev];
        });

        // Also update inspectingStudent if open
        setInspectingStudent((curr) => {
          if (curr && curr.id === msg.student.id) {
            return { ...curr, ...msg.student };
          }
          return curr;
        });
      }

      if (msg.type === 'student:stream_frame') {
        setStudents((prev) => {
          const index = prev.findIndex((s) => s.id === msg.studentId);
          if (index >= 0) {
            const next = [...prev];
            next[index] = {
              ...next[index],
              cameraFrame: msg.cameraFrame || next[index].cameraFrame,
              screenFrame: msg.screenFrame || next[index].screenFrame,
              lastHeartbeat: Date.now(),
            };
            return next;
          }
          return prev;
        });

        setInspectingStudent((curr) => {
          if (curr && curr.id === msg.studentId) {
            return {
              ...curr,
              cameraFrame: msg.cameraFrame || curr.cameraFrame,
              screenFrame: msg.screenFrame || curr.screenFrame,
            };
          }
          return curr;
        });
      }

      if (msg.type === 'student:telemetry') {
        setStudents((prev) => {
          const index = prev.findIndex((s) => s.id === msg.studentId);
          if (index >= 0) {
            const next = [...prev];
            next[index] = {
              ...next[index],
              lastHeartbeat: msg.lastHeartbeat,
              cameraActive: msg.cameraActive,
              screenSharingActive: msg.screenSharingActive,
              fullscreenActive: msg.fullscreenActive,
              status: msg.status,
            };
            return next;
          }
          return prev;
        });
      }

      // Automatic suspicious activity detection trigger
      if (msg.type === 'alert:violation') {
        const v: ViolationEvent = msg.violation;
        setViolations((prev) => [v, ...prev]);
        setActiveToast(v);
        sounds.playSuspiciousAlert();

        // Update student violation counter and status
        if (msg.student) {
          setStudents((prev) => {
            const index = prev.findIndex((s) => s.id === msg.student.id);
            if (index >= 0) {
              const next = [...prev];
              next[index] = { ...next[index], ...msg.student };
              return next;
            }
            return [msg.student, ...prev];
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentClass.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass =
      selectedClassFilter === 'ALL' || s.studentClass === selectedClassFilter;

    const matchesStatus =
      selectedStatusFilter === 'ALL' || s.status === selectedStatusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  // Calculate statistics
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === 'active').length;
  const warningStudents = students.filter((s) => s.status === 'warning').length;
  const lockedStudents = students.filter((s) => s.status === 'locked').length;

  const handleQuickLock = (studentId: string, willLock: boolean) => {
    socketClient.send({
      type: 'proctor:action',
      targetStudentId: studentId,
      action: willLock ? 'lock' : 'unlock',
      message: willLock ? 'Pengawas mengunci layar ujian Anda.' : 'Pengawas telah membuka kunci layar Anda.',
    });
  };

  const handleSendCommand = (studentId: string, action: string, message?: string) => {
    socketClient.send({
      type: 'proctor:action',
      targetStudentId: studentId,
      action,
      message,
    });
  };

  // Function to add simulated examinee for testing proctor controls
  const handleAddSimulatedStudent = () => {
    const randomClasses = ['VII-A', 'VII-B', 'VIII-A', 'VIII-C', 'IX-B'];
    const randomNames = [
      'Ananda Dwi Putra',
      'Clarissa Aurelia',
      'Dimas Arya Kusuma',
      'Farhan Maulana',
      'Jessica Halim',
      'Rehan Al-Ghazali'
    ];
    const pickName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const pickClass = randomClasses[Math.floor(Math.random() * randomClasses.length)];
    const id = 'sim-' + Date.now();

    const mock: StudentSession = {
      id,
      name: pickName,
      studentClass: pickClass,
      subject: config.subject,
      status: 'active',
      joinedAt: Date.now(),
      lastHeartbeat: Date.now(),
      violationsCount: 0,
      violations: [],
      screenSharingActive: true,
      cameraActive: true,
      fullscreenActive: true,
    };

    setStudents((prev) => [mock, ...prev]);
    sounds.playSuccess();
  };

  const handleInspectStudentById = (studentId: string) => {
    const found = students.find((s) => s.id === studentId);
    if (found) {
      setInspectingStudent(found);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner Context Info */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl shrink-0">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">{config.schoolName}</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Pusat Pengawasan
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Mata Pelajaran: <strong className="text-white">{config.subject}</strong> &bull; Link Form Soal:{' '}
              <a
                href={config.formUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline inline-flex items-center gap-1 font-mono"
              >
                <span>Lihat Google Form</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-400" />
            <span>Atur Form Soal</span>
          </button>

          <button
            onClick={handleAddSimulatedStudent}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Tambah Peserta Uji Coba Demo"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simulasi Siswa Baru</span>
          </button>

          <button
            onClick={() => setShowPrintReport(true)}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Berita Acara</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Peserta</p>
            <h3 className="text-2xl font-black text-white mt-1">{totalStudents}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Normal / Mengerjakan</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{activeStudents}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Terindikasi Curang</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{warningStudents}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-400">Layar Terkunci</p>
            <h3 className="text-2xl font-black text-red-400 mt-1">{lockedStudents}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau kelas siswa..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Filter Kelas */}
          <div className="flex items-center gap-1.5 flex-1 md:flex-none">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full md:w-36 px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Semua Kelas</option>
              {CLASS_OPTIONS.filter((c) => c !== 'Lainnya (Ketik Manual)').map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="active">Normal (Aktif)</option>
            <option value="warning">Peringatan (Mencurigakan)</option>
            <option value="locked">Terkunci</option>
            <option value="submitted">Selesai</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Grid of Examinee Cards */}
      {filteredStudents.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-300">Belum Ada Peserta yang Terhubung</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Siswa yang membuka tautan ujian dan memasukkan nama serta memilih kelas akan langsung muncul secara otomatis di papan pemantauan ini.
          </p>
          <button
            onClick={handleAddSimulatedStudent}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Tambahkan Simulasi Peserta untuk Menguji</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onInspect={(s) => setInspectingStudent(s)}
              onQuickLock={handleQuickLock}
            />
          ))}
        </div>
      )}

      {/* Inspection Modal */}
      {inspectingStudent && (
        <StudentDetailModal
          student={inspectingStudent}
          onClose={() => setInspectingStudent(null)}
          onSendCommand={handleSendCommand}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <ExamSettingsModal
          config={config}
          onClose={() => setShowSettings(false)}
          onSave={onUpdateConfig}
        />
      )}

      {/* Print Report Modal */}
      {showPrintReport && (
        <PrintReportModal
          config={config}
          students={students}
          onClose={() => setShowPrintReport(false)}
        />
      )}

      {/* Real-time Toast & Activity Alerts Drawer */}
      <ViolationAlertPanel
        violations={violations}
        activeToast={activeToast}
        onDismissToast={() => setActiveToast(null)}
        onInspectStudentById={handleInspectStudentById}
        isOpen={showViolationsDrawer}
        onToggleOpen={() => setShowViolationsDrawer(!showViolationsDrawer)}
      />
    </div>
  );
};
