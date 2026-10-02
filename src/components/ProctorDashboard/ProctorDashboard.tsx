import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Monitor, 
  AlertTriangle, 
  Lock, 
  Unlock,
  Search, 
  Filter, 
  Settings, 
  FileText, 
  CheckCircle2, 
  Radio,
  RefreshCw, 
  ExternalLink,
  Archive,
  Link2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { CLASS_OPTIONS, ROMBEL_LIST, ExamConfig, StudentSession, ViolationEvent } from '../../types/exam';
import { StudentCard } from './StudentCard';
import { StudentDetailModal } from './StudentDetailModal';
import { ViolationAlertPanel } from './ViolationAlertPanel';
import { ExamSettingsModal } from './ExamSettingsModal';
import { PrintReportModal } from './PrintReportModal';
import { ExamArchiveModal } from './ExamArchiveModal';
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

  // Modals & Panels
  const [showSettings, setShowSettings] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showViolationsDrawer, setShowViolationsDrawer] = useState(false);
  const [showActiveLinksArea, setShowActiveLinksArea] = useState(false);

  // Refresh & copy indicators
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTogglingAccess, setIsTogglingAccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Helper to fetch latest data via REST
  const fetchLatestStudents = () => {
    fetch('/api/students')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStudents((prev) => {
            const map = new Map(prev.map((s) => [s.id, s]));
            data.forEach((s) => {
              const old = map.get(s.id);
              map.set(s.id, {
                ...s,
                cameraFrame: s.cameraFrame || old?.cameraFrame,
                screenFrame: s.screenFrame || old?.screenFrame,
              });
            });
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchLatestStudents();
    fetch('/api/violations')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setViolations(data);
      })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => setIsRefreshing(false), 600);
      });
  };

  // Toggle Exam Access (Buka / Tutup Akses Ujian Langsung)
  const handleToggleExamAccess = async () => {
    setIsTogglingAccess(true);
    const newStatus = !(config.isExamOpen !== false);
    try {
      const res = await fetch('/api/exam/toggle-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isExamOpen: newStatus }),
      });
      const data = await res.json();
      if (data.success && data.config) {
        onUpdateConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to toggle exam access', err);
    } finally {
      setIsTogglingAccess(false);
    }
  };

  const handleCopyLink = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Initialize socket listener for proctoring + periodic live polling
  useEffect(() => {
    socketClient.connect('proctor');

    // Fetch initial REST data
    fetchLatestStudents();

    fetch('/api/violations')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setViolations(data);
      })
      .catch(() => {});

    // Periodic live sync poll every 2.5 seconds
    const pollInterval = setInterval(() => {
      fetchLatestStudents();
    }, 2500);

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

      if (msg.type === 'alert:violation') {
        const v: ViolationEvent = msg.violation;
        setViolations((prev) => [v, ...prev]);
        setActiveToast(v);
        sounds.playSuspiciousAlert();

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
      clearInterval(pollInterval);
    };
  }, []);

  // Filter students based on query, class, and status
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
  const now = Date.now();
  const totalStudents = students.length;
  const isExamOpen = config.isExamOpen !== false;

  const activeStudents = students.filter(
    (s) => s.status === 'active' || (s.status !== 'locked' && s.status !== 'submitted' && now - s.lastHeartbeat < 90000)
  ).length;
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

  const handleInspectStudentById = (studentId: string) => {
    const found = students.find((s) => s.id === studentId);
    if (found) {
      setInspectingStudent(found);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner Context Info */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
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
              Mata Pelajaran: <strong className="text-white">{config.subject}</strong> &bull; Durasi: {config.durationMinutes} Menit
            </p>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleManualRefresh}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Segarkan Data Peserta Terbaru"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-400" />
            <span>Atur Form Soal</span>
          </button>

          <button
            onClick={() => setShowArchiveModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Buka data riwayat dan arsip ujian permanen"
          >
            <Archive className="w-3.5 h-3.5 text-amber-400" />
            <span>Arsip & Riwayat Ujian</span>
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

      {/* DEDICATED PANEL: KONTROL AKSES LINK UJIAN & DAFTAR LINK AKTIF */}
      <div className={`rounded-2xl border p-4 sm:p-5 mb-6 transition-all ${
        isExamOpen
          ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
          : 'bg-gradient-to-r from-slate-900 via-slate-900 to-red-950/50 border-red-500/50 shadow-lg shadow-red-500/10'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-3 rounded-2xl ${
              isExamOpen ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse'
            }`}>
              {isExamOpen ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Kontrol Akses Link Soal Ujian
                </h3>
                {isExamOpen ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    AKSES DIBUKA (Siswa Dapat Mengerjakan)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    AKSES DITUTUP (Lembar Soal Terkunci)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isExamOpen
                  ? 'Siswa yang login dapat melihat dan mengisi formulir Google Form ujian.'
                  : 'Seluruh lembar soal disembunyikan/dikunci seketika di layar seluruh siswa.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            {/* Button to Toggle Open/Closed */}
            <button
              onClick={handleToggleExamAccess}
              disabled={isTogglingAccess}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md ${
                isExamOpen
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              {isExamOpen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              <span>{isExamOpen ? '⛔ Tutup Akses Ujian Sekarang' : '✅ Buka Akses Ujian'}</span>
            </button>

            {/* Button to view all active links */}
            <button
              onClick={() => setShowActiveLinksArea(!showActiveLinksArea)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Lihat Link Ujian Aktif ({ROMBEL_LIST.length} Rombel)</span>
              {showActiveLinksArea ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          </div>
        </div>

        {/* Expandable Area: Active Links per Rombel */}
        {showActiveLinksArea && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider shrink-0">
                  Link Utama / Default:
                </span>
                <span className="text-xs font-mono text-slate-300 truncate" title={config.formUrl}>
                  {config.formUrl || 'Belum diisi'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {config.formUrl && (
                  <>
                    <button
                      onClick={() => handleCopyLink(config.formUrl, 'default')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 rounded-lg flex items-center gap-1"
                    >
                      {copiedKey === 'default' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'default' ? 'Tersalin' : 'Salin'}</span>
                    </button>
                    <a
                      href={config.formUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 text-[11px] font-semibold rounded-lg flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Tes Form</span>
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {ROMBEL_LIST.map((rombel, idx) => {
                const specificUrl = config.rombelFormUrls?.[rombel];
                const activeUrl = specificUrl || config.formUrl;
                const isCustom = Boolean(specificUrl);

                return (
                  <div
                    key={rombel}
                    className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-slate-800 text-[10px] text-slate-400 flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-200 truncate" title={rombel}>
                          {rombel}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate pl-5">
                        {isCustom ? (
                          <span className="text-emerald-400">Link Khusus Aktif</span>
                        ) : (
                          <span className="text-slate-400">Mengikuti Default</span>
                        )}
                        {' • '}{activeUrl}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopyLink(activeUrl, rombel)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Salin Tautan"
                      >
                        {copiedKey === rombel ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={activeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400"
                        title="Uji Tautan Form"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Peserta Terdaftar</p>
            <h3 className="text-2xl font-black text-white mt-1">{totalStudents}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
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
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Peringatan (Mencurigakan)</p>
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
            placeholder="Cari nama atau rombel siswa..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Filter Kelas / Rombel */}
          <div className="flex items-center gap-1.5 flex-1 md:flex-none">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full md:w-64 px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 truncate"
            >
              <option value="ALL">Semua Rombel ({ROMBEL_LIST.length} Kelas)</option>
              {CLASS_OPTIONS.filter((c) => c !== 'Lainnya (Ketik Manual)').map((c) => (
                <option key={c} value={c}>
                  {c}
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
            <option value="offline">Terputus (Offline)</option>
          </select>
        </div>
      </div>

      {/* Main Grid View of Students */}
      {filteredStudents.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="font-extrabold text-white text-base">Belum Ada Siswa yang Terhubung</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Siswa yang memasukkan nama dan rombel di halaman ujian akan langsung muncul di sini secara real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onInspect={(s) => setInspectingStudent(s)}
              onQuickLock={(studentId, willLock) => handleQuickLock(studentId, willLock)}
            />
          ))}
        </div>
      )}

      {/* Real-time Infraction Toast Alert & Drawer */}
      <ViolationAlertPanel
        violations={violations}
        activeToast={activeToast}
        onDismissToast={() => setActiveToast(null)}
        onInspectStudentById={handleInspectStudentById}
        isOpen={showViolationsDrawer}
        onToggleOpen={() => setShowViolationsDrawer(!showViolationsDrawer)}
      />

      {/* Inspector Modal for Selected Student */}
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
          onSave={(newCfg) => {
            onUpdateConfig(newCfg);
            setShowSettings(false);
          }}
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

      {/* Permanent Archive & History Modal */}
      {showArchiveModal && (
        <ExamArchiveModal
          onClose={() => setShowArchiveModal(false)}
          activeStudentsCount={students.length}
          onSessionArchived={() => {
            fetchLatestStudents();
          }}
        />
      )}
    </div>
  );
};
