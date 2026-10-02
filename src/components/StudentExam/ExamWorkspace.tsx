import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Monitor, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Maximize2, 
  Minimize2, 
  Lock, 
  CheckCircle, 
  AlertOctagon, 
  Radio, 
  ExternalLink,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { ExamConfig, StudentSession, ViolationEvent, ViolationType } from '../../types/exam';
import { socketClient } from '../../utils/socket';
import { sounds } from '../../utils/audio';

interface ExamWorkspaceProps {
  student: {
    id: string;
    name: string;
    studentClass: string;
    studentNumber?: string;
    subject: string;
  };
  config: ExamConfig;
  cameraStream: MediaStream;
  screenStream: MediaStream;
  onFinishExam: () => void;
}

export const ExamWorkspace: React.FC<ExamWorkspaceProps> = ({
  student,
  config,
  cameraStream,
  screenStream,
  onFinishExam,
}) => {
  const [liveConfig, setLiveConfig] = useState<ExamConfig>(config);
  const [violationsCount, setViolationsCount] = useState(0);
  const [violations, setViolations] = useState<ViolationEvent[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(true);
  const [timeLeftSec, setTimeLeftSec] = useState(config.durationMinutes * 60);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [currentWarning, setCurrentWarning] = useState<string>('');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [proctorMessage, setProctorMessage] = useState<string | null>(null);

  // Video references for background canvas capturing
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Floating camera HUD position/toggle
  const [hudMinimized, setHudMinimized] = useState(false);

  // 1. Setup Video streams
  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream;
      cameraVideoRef.current.play().catch(() => {});
    }

    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
      screenVideoRef.current.play().catch(() => {});

      const track = screenStream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          setIsScreenSharing(false);
          triggerViolation('screen_stopped', 'Tangkapan layar dihentikan oleh siswa');
        };
      }
    }

    return () => {
      // Don't stop streams until component unmounts entirely
    };
  }, [cameraStream, screenStream]);

  // 2. Register student with WebSocket
  useEffect(() => {
    socketClient.connect('student', {
      id: student.id,
      name: student.name,
      studentClass: student.studentClass,
      subject: student.subject,
    });

    const unsubscribe = socketClient.subscribe((msg: any) => {
      if (msg.type === 'proctor:command') {
        if (msg.action === 'lock') {
          setIsLocked(true);
          setLockReason(msg.message || 'Layar Anda dikunci oleh Pengawas Ujian.');
          sounds.playInfractionWarning();
        } else if (msg.action === 'unlock') {
          setIsLocked(false);
          setLockReason('');
          sounds.playSuccess();
        } else if (msg.action === 'reset_violations') {
          setViolationsCount(0);
          setIsLocked(false);
        } else if (msg.action === 'message') {
          setProctorMessage(msg.message);
          sounds.playSuspiciousAlert();
        }
      }

      if (msg.type === 'config:updated' && msg.config) {
        setLiveConfig(msg.config);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [student]);

  // 3. Periodic Frame Capturing & Heartbeat
  useEffect(() => {
    const captureInterval = setInterval(() => {
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let cameraFrame: string | undefined = undefined;
      let screenFrame: string | undefined = undefined;

      // 1. Capture camera snapshot
      const cam = cameraVideoRef.current;
      if (cam && cam.videoWidth > 0) {
        try {
          canvas.width = 320;
          canvas.height = 240;
          ctx.drawImage(cam, 0, 0, 320, 240);
          cameraFrame = canvas.toDataURL('image/jpeg', 0.45);
        } catch (e) {
          console.warn('Canvas draw camera failed', e);
        }
      }

      // If camera frame is still empty, draw clean proctor status placeholder
      if (!cameraFrame) {
        canvas.width = 320;
        canvas.height = 240;
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, 320, 240);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(student.name, 160, 95);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText(student.studentClass, 160, 120);
        ctx.fillStyle = '#10b981';
        ctx.font = 'mono 11px monospace';
        ctx.fillText(`KAMERA LIVE • ${new Date().toLocaleTimeString('id-ID')} WIB`, 160, 150);
        cameraFrame = canvas.toDataURL('image/jpeg', 0.4);
      }

      // 2. Capture screen snapshot
      const scr = screenVideoRef.current;
      if (scr && scr.videoWidth > 0) {
        try {
          canvas.width = 480;
          canvas.height = 270;
          ctx.drawImage(scr, 0, 0, 480, 270);
          screenFrame = canvas.toDataURL('image/jpeg', 0.4);
        } catch (e) {
          console.warn('Canvas draw screen failed', e);
        }
      }

      // If screen frame is still empty, draw clean proctor status placeholder
      if (!screenFrame) {
        canvas.width = 480;
        canvas.height = 270;
        ctx.fillStyle = '#070b14';
        ctx.fillRect(0, 0, 480, 270);
        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LEMBAR SOAL UJIAN SISWA', 240, 105);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.fillText(`${student.name} • ${student.studentClass}`, 240, 135);
        ctx.fillStyle = '#10b981';
        ctx.font = 'mono 12px monospace';
        ctx.fillText(`TERPANTAU • ${new Date().toLocaleTimeString('id-ID')} WIB`, 240, 165);
        screenFrame = canvas.toDataURL('image/jpeg', 0.35);
      }

      // Send to WebSocket with explicit studentId
      socketClient.send({
        type: 'student:stream_frame',
        studentId: student.id,
        cameraFrame,
        screenFrame,
      });

      // Backup HTTP stream push
      fetch('/api/students/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: student.id,
          cameraFrame,
          screenFrame,
        }),
      }).catch(() => {});

      // Telemetry heartbeat
      socketClient.send({
        type: 'student:heartbeat',
        studentId: student.id,
        cameraActive: cameraStream?.active && cameraStream.getVideoTracks().length > 0,
        screenSharingActive: screenStream?.active && screenStream.getVideoTracks().length > 0 && isScreenSharing,
        fullscreenActive: !!document.fullscreenElement,
      });

      // Backup HTTP heartbeat
      fetch('/api/students/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: student.id,
          cameraActive: cameraStream?.active && cameraStream.getVideoTracks().length > 0,
          screenSharingActive: screenStream?.active && screenStream.getVideoTracks().length > 0 && isScreenSharing,
          fullscreenActive: !!document.fullscreenElement,
          status: isLocked ? 'locked' : violationsCount > 0 ? 'warning' : 'active',
        }),
      }).catch(() => {});
    }, 2500);

    return () => clearInterval(captureInterval);
  }, [cameraStream, screenStream, isScreenSharing, student.id, isLocked, violationsCount]);

  // 4. Timer Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onFinishExam]);

  // 5. Trigger Violation function
  const triggerViolation = (type: ViolationType, description: string) => {
    sounds.playInfractionWarning();

    // Capture snapshot for violation proof
    let snapshotUrl: string | undefined = undefined;
    if (screenVideoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx && screenVideoRef.current.videoWidth > 0) {
        canvas.width = 480;
        canvas.height = 270;
        ctx.drawImage(screenVideoRef.current, 0, 0, canvas.width, canvas.height);
        snapshotUrl = canvas.toDataURL('image/jpeg', 0.4);
      }
    }

    const newCount = violationsCount + 1;
    setViolationsCount(newCount);

    const violationObj: ViolationEvent = {
      id: 'v_' + Date.now(),
      studentId: student.id,
      studentName: student.name,
      studentClass: student.studentClass,
      type,
      description,
      timestamp: Date.now(),
      snapshotUrl,
    };

    setViolations((prev) => [violationObj, ...prev]);

    // Send to server
    socketClient.send({
      type: 'student:violation',
      violationType: type,
      description,
      snapshotUrl,
    });

    // Check lock threshold
    if (newCount >= config.maxViolationsAllowed) {
      setIsLocked(true);
      setLockReason(
        `Ujian Terkunci Otomatis: Anda telah mencapai batas maksimal ${config.maxViolationsAllowed} pelanggaran kecurangan. Silakan hubungi pengawas untuk verifikasi.`
      );
    } else {
      setCurrentWarning(description);
      setShowWarningModal(true);
    }
  };

  // 6. Anti-Cheat Event Listeners (Tab switch, Blur, Fullscreen exit, Key blocker)
  useEffect(() => {
    // Visibility change (tab switch or minimize)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation(
          'tab_switch',
          'Siswa beralih tab peramban atau meminimalkan jendela ujian'
        );
      }
    };

    // Window blur
    let blurDebounce: any = null;
    const handleBlur = () => {
      blurDebounce = setTimeout(() => {
        if (!document.hasFocus()) {
          triggerViolation('tab_switch', 'Jendela ujian kehilangan fokus (membuka aplikasi lain)');
        }
      }, 500);
    };

    const handleFocus = () => {
      if (blurDebounce) clearTimeout(blurDebounce);
    };

    // Fullscreen change
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active && !isLocked) {
        triggerViolation('fullscreen_exit', 'Siswa keluar dari mode Layar Penuh (Fullscreen Exit)');
      }
    };

    // Key blocking: Prevent inspect, copy, paste, reload
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 or F5
      if (e.key === 'F12' || e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('inspect_attempt', `Menekan tombol pintasan keyboard ${e.key}`);
        return false;
      }

      // Ctrl/Cmd + Shift + I/J/C (Devtools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('inspect_attempt', 'Mencoba membuka inspect element devtools');
        return false;
      }

      // Ctrl/Cmd + C, V, U, S, P
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('copy_paste', `Mencoba pintasan Ctrl+${e.key.toUpperCase()} (Salin / Tempel / Print)`);
        return false;
      }

      // Alt + Tab / Windows key notice
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        triggerViolation('tab_switch', 'Menekan kombinasi Alt+Tab');
      }
    };

    // Disable context menu (right click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [violationsCount, isLocked]);

  const requestReenterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Failed to enter fullscreen', err);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Google Form embed URL formatter:
  // If user enters regular edit or view form URL, ensure embedded=true parameter
  const getEmbeddedFormUrl = (url: string) => {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      if (!parsed.searchParams.has('embedded')) {
        parsed.searchParams.set('embedded', 'true');
      }
      return parsed.toString();
    } catch {
      return url;
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Hidden offscreen captures */}
      <video ref={cameraVideoRef} playsInline autoPlay muted className="hidden" />
      <video ref={screenVideoRef} playsInline autoPlay muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Exam Status Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Kamera & Layar Dipantau Pengawas</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-slate-300">
            <span className="font-bold text-white">{student.name}</span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-slate-400">Kelas: <strong className="text-slate-200">{student.studentClass}</strong></span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-slate-400">Mapel: <strong className="text-slate-200">{student.subject}</strong></span>
          </div>
        </div>

        {/* Center: Timer Countdown */}
        <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-inner">
          <Clock className={`w-4 h-4 ${timeLeftSec < 300 ? 'text-red-400 animate-pulse' : 'text-indigo-400'}`} />
          <span className="font-mono text-sm font-bold text-white tracking-wider">
            {formatTimer(timeLeftSec)}
          </span>
          <span className="text-[10px] text-slate-500 uppercase font-semibold hidden sm:inline">Tersisa</span>
        </div>

        {/* Right: Infraction Meter & Finish Button */}
        <div className="flex items-center gap-3">
          {/* Violations Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border font-bold ${
            violationsCount === 0
              ? 'bg-slate-800 text-slate-300 border-slate-700'
              : violationsCount < config.maxViolationsAllowed
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
              : 'bg-red-500/20 text-red-300 border-red-500/40 animate-bounce'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Teguran: {violationsCount} / {config.maxViolationsAllowed}</span>
          </div>

          {/* Fullscreen check icon button */}
          {!isFullscreen && (
            <button
              onClick={requestReenterFullscreen}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center gap-1 animate-pulse"
              title="Kembalikan Layar Penuh"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Layar Penuh</span>
            </button>
          )}

          {/* Submit Exam Button */}
          <button
            onClick={() => setShowConfirmSubmit(true)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all text-xs"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Selesai Ujian</span>
          </button>
        </div>
      </div>

      {/* Proctor Live Message Notification Banner (if any) */}
      {proctorMessage && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between shadow-lg z-30 animate-slide-down">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 shrink-0 animate-bounce" />
            <span>
              <strong>Pesan Pengawas:</strong> "{proctorMessage}"
            </span>
          </div>
          <button
            onClick={() => setProctorMessage(null)}
            className="text-xs bg-indigo-700 hover:bg-indigo-800 px-2 py-0.5 rounded"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Active Video and Canvas Capture Elements (kept in viewport so browser decoder stays active) */}
      <video
        ref={cameraVideoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'fixed', bottom: 0, right: 0, width: 160, height: 120, opacity: 0.01, zIndex: 1, pointerEvents: 'none' }}
      />
      <video
        ref={screenVideoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'fixed', bottom: 0, left: 0, width: 160, height: 90, opacity: 0.01, zIndex: 1, pointerEvents: 'none' }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', bottom: 0, left: 0, width: 1, height: 1, opacity: 0.01, pointerEvents: 'none' }}
      />

      {/* Main Container: Google Form Workspace */}
      <div className="flex-1 w-full h-full relative bg-slate-950 flex flex-col">
        {/* Anti-cheat Watermark Overlay (non-intrusive) */}
        <div className="absolute top-2 left-3 z-10 pointer-events-none opacity-40 text-[10px] text-slate-400 font-mono">
          SESI UJIAN #{student.id.substring(0, 8)} &bull; {student.name} &bull; {student.studentClass}
        </div>

        {/* If Proctor has closed Exam Access */}
        {liveConfig.isExamOpen === false ? (
          <div className="w-full h-full flex-1 flex flex-col items-center justify-center bg-slate-950 p-6 text-center z-20">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center mb-4 animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Akses Lembar Soal Ujian Sedang Ditutup
            </h3>
            <p className="text-sm text-slate-400 max-w-md mt-2 leading-relaxed">
              Pengawas sedang menonaktifkan akses lembar Google Form ujian untuk sementara waktu. Harap tetap tenang di tempat dan menunggu instruksi pengawas untuk membuka kembali lembar soal.
            </p>
            <div className="mt-6 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Pengawasan kamera dan sesi Anda tetap berjalan aman.</span>
            </div>
          </div>
        ) : (
          /* Google Form Iframe Container */
          <div className="w-full h-full flex-1 relative bg-white">
            <iframe
              src={getEmbeddedFormUrl((liveConfig.rombelFormUrls && liveConfig.rombelFormUrls[student.studentClass]) || liveConfig.formUrl)}
              title={`Google Form Ujian - ${student.studentClass}`}
              className="w-full h-full border-none"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
              loading="eager"
            />
          </div>
        )}
      </div>

      {/* Floating Picture-In-Picture Webcam HUD for Student */}
      <div className={`fixed bottom-4 right-4 z-40 transition-all ${
        hudMinimized ? 'w-14 h-14' : 'w-48 sm:w-56'
      }`}>
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header of HUD */}
          <div className="px-2.5 py-1.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-semibold text-white">Kamera Anda</span>
            </div>
            <button
              onClick={() => setHudMinimized(!hudMinimized)}
              className="text-slate-400 hover:text-white"
              title={hudMinimized ? 'Perbesar Kamera' : 'Kecilkan'}
            >
              {hudMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </button>
          </div>

          {/* Video Feed */}
          {!hudMinimized && (
            <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
              <video
                ref={(el) => {
                  if (el && cameraStream) {
                    el.srcObject = cameraStream;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <div className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-medium text-emerald-300 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-red-500 animate-pulse" />
                <span>LIVE FEED</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Warning Alert Modal (Soft infraction) */}
      {showWarningModal && !isLocked && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-md w-full p-6 text-slate-200 shadow-2xl animate-shake">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/40">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="text-center mb-5">
              <h3 className="text-xl font-extrabold text-white">
                Peringatan Pelanggaran #{violationsCount}
              </h3>
              <p className="text-xs text-amber-300 font-semibold mt-1 uppercase tracking-wide">
                Aktivitas Mencurigakan Terdeteksi
              </p>
              <div className="mt-3 p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-200">
                "{currentWarning}"
              </div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 mb-6 space-y-1">
              <p>&bull; Pengawas ujian telah menerima notifikasi insiden ini secara real-time.</p>
              <p>&bull; Sisa toleransi pelanggaran: <strong className="text-amber-400">{config.maxViolationsAllowed - violationsCount} kali lagi</strong>.</p>
              <p>&bull; Melebihi batas akan mengakibatkan lembar ujian <strong>terkunci permanen</strong>.</p>
            </div>

            <button
              onClick={() => {
                setShowWarningModal(false);
                requestReenterFullscreen();
              }}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Kembali ke Soal & Masuk Layar Penuh</span>
            </button>
          </div>
        </div>
      )}

      {/* Screen Sharing Stopped Alert */}
      {!isScreenSharing && !isLocked && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500 rounded-3xl max-w-md w-full p-6 text-slate-200 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/40">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="text-center mb-5">
              <h3 className="text-xl font-extrabold text-white">
                Berbagi Layar Terhenti!
              </h3>
              <p className="text-xs text-red-300 font-semibold mt-1">
                Ujian Ditangguhkan Sementara
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Tangkapan layar Anda telah terputus. Anda wajib membagikan seluruh layar kembali untuk melanjutkan pengisian formulir soal ujian.
              </p>
            </div>

            <button
              onClick={async () => {
                try {
                  const newStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                  if (screenVideoRef.current) {
                    screenVideoRef.current.srcObject = newStream;
                    screenVideoRef.current.play().catch(() => {});
                  }
                  newStream.getVideoTracks()[0].onended = () => {
                    setIsScreenSharing(false);
                    triggerViolation('screen_stopped', 'Tangkapan layar dihentikan kembali');
                  };
                  setIsScreenSharing(true);
                  requestReenterFullscreen();
                  sounds.playSuccess();
                } catch {
                  // user cancelled
                }
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <Monitor className="w-4 h-4" />
              <span>Bagikan Layar Ulang</span>
            </button>
          </div>
        </div>
      )}

      {/* Screen Locked Modal (Limit reached or remote lock) */}
      {isLocked && (
        <div className="fixed inset-0 z-50 bg-red-950/90 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-600 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-slate-200 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-3xl bg-red-600/20 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/40">
              <Lock className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-white">
              Layar Ujian Terkunci!
            </h2>
            <p className="text-xs uppercase tracking-wider font-bold text-red-400 mt-1">
              Akses Pengerjaan Soal Dihentikan
            </p>

            <div className="my-5 p-4 bg-slate-950/80 border border-red-500/30 rounded-2xl text-xs sm:text-sm text-red-200 text-left">
              <p className="font-semibold text-white mb-1">Penyebab Penguncian:</p>
              <p className="text-slate-300">{lockReason || 'Telah melebihi kuota pelanggaran kecurangan.'}</p>
            </div>

            <div className="text-xs text-slate-400 mb-6 space-y-1.5 text-left bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <p className="font-bold text-slate-200">Langkah Penyelesaian:</p>
              <p>1. Jangan menutup halaman atau mematikan perangkat Anda.</p>
              <p>2. Hubungi Pengawas Ujian sekolah Anda untuk memverifikasi kendala.</p>
              <p>3. Pengawas dapat membuka kunci akun Anda secara jarak jauh melalui dashboard pengawas.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  socketClient.send({
                    type: 'student:violation',
                    violationType: 'other',
                    description: 'Siswa meminta bantuan verifikasi pembukaan kunci layar',
                  });
                  sounds.playInfractionWarning();
                }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-colors text-xs"
              >
                Kirim Permintaan Buka Kunci ke Pengawas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Finish Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-200 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white text-center">
              Konfirmasi Selesai Ujian
            </h3>
            <p className="text-xs text-slate-400 text-center mt-1.5 mb-6">
              Pastikan Anda sudah menekan tombol <strong>"Kirim / Submit"</strong> di dalam formulir Google Form sebelum mengakhiri sesi pengawasan ini.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors text-xs"
              >
                Cek Kembali
              </button>
              <button
                onClick={() => {
                  setShowConfirmSubmit(false);
                  onFinishExam();
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all text-xs"
              >
                Ya, Sudah Kirim & Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
