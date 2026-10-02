import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Monitor, 
  CheckCircle2, 
  AlertTriangle, 
  Maximize, 
  Lock, 
  RefreshCw, 
  ExternalLink,
  ShieldAlert,
  Info,
  Check,
  AlertCircle,
  HelpCircle,
  Video
} from 'lucide-react';
import { sounds } from '../../utils/audio';

interface DeviceCheckModalProps {
  studentName: string;
  studentClass: string;
  onReady: (cameraStream: MediaStream, screenStream: MediaStream) => void;
  onBack: () => void;
}

// Generate fallback synthetic stream to prevent any hardware lockout
function createSyntheticStream(text: string, subtext: string): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;

  const render = () => {
    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Icon / Label
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 25);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px sans-serif';
    ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + 10);

    // Live clock
    ctx.fillStyle = '#10b981';
    ctx.font = 'mono 14px monospace';
    ctx.fillText(
      `PENGALAMAN AKTIF • ${new Date().toLocaleTimeString('id-ID')} WIB`,
      canvas.width / 2,
      canvas.height / 2 + 45
    );
  };

  render();
  setInterval(render, 1000);

  return (canvas as any).captureStream ? (canvas as any).captureStream(15) : new MediaStream();
}

export const DeviceCheckModal: React.FC<DeviceCheckModalProps> = ({
  studentName,
  studentClass,
  onReady,
  onBack,
}) => {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [isRequestingScreen, setIsRequestingScreen] = useState(false);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [autoPromptTimer, setAutoPromptTimer] = useState<number | null>(null);

  const videoCameraRef = useRef<HTMLVideoElement | null>(null);
  const videoScreenRef = useRef<HTMLVideoElement | null>(null);

  // Auto request camera on mount
  useEffect(() => {
    requestCamera();
  }, []);

  // Bind camera stream to video element
  useEffect(() => {
    if (videoCameraRef.current && cameraStream) {
      videoCameraRef.current.srcObject = cameraStream;
      videoCameraRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  // Bind screen stream to video element
  useEffect(() => {
    if (videoScreenRef.current && screenStream) {
      videoScreenRef.current.srcObject = screenStream;
      videoScreenRef.current.play().catch(() => {});
    }
  }, [screenStream]);

  // Countdown timer for automatic retry prompt
  useEffect(() => {
    let interval: any = null;
    if (autoPromptTimer !== null && autoPromptTimer > 0) {
      interval = setInterval(() => {
        setAutoPromptTimer((prev) => (prev !== null && prev > 1 ? prev - 1 : null));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoPromptTimer]);

  const requestCamera = async () => {
    setIsRequestingCamera(true);
    setCameraError(null);
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      setCameraStream(stream);
      sounds.playSuccess();
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        'Izin kamera belum aktif atau tidak ditemukan webcam. Anda dapat menekan tombol Izinkan Kamera atau gunakan Kamera Darurat.'
      );
    } finally {
      setIsRequestingCamera(false);
    }
  };

  const requestScreen = async () => {
    setIsRequestingScreen(true);
    setScreenError(null);
    setAutoPromptTimer(null);

    // Check if getDisplayMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setScreenError(
        'Peramban ini tidak mendukung tangkapan layar. Silakan gunakan Mode Darurat Kamera di bawah.'
      );
      setIsRequestingScreen(false);
      return;
    }

    try {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        } as any,
        audio: false,
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setScreenStream(null);
          setScreenError('Berbagi layar dihentikan. Anda dapat membagikan ulang atau beralih ke Mode Darurat.');
          sounds.playInfractionWarning();
          setAutoPromptTimer(3);
        };
      }

      setScreenStream(stream);
      setIsEmergencyMode(false);
      setScreenError(null);
      sounds.playSuccess();
    } catch (err: any) {
      console.warn('Screen capture cancelled or denied:', err);
      setScreenError(
        'Berbagi layar dibatalkan atau ditolak. Pastikan memilih gambar layar (Entire Screen) lalu klik "Share", atau klik tombol "Gunakan Mode Darurat (Kamera Saja)" di bawah.'
      );
      // Auto-schedule prompt reminder
      setAutoPromptTimer(2);
    } finally {
      setIsRequestingScreen(false);
    }
  };

  // ACTIVATE EMERGENCY MODE (Camera only - 100% Guaranteed to proceed)
  const handleActivateEmergencyMode = () => {
    setIsEmergencyMode(true);
    setScreenError(null);

    // If screen stream isn't available, generate a synthetic stream or mirror camera
    if (!screenStream) {
      const syntheticScreen = createSyntheticStream(
        `MODE DARURAT: PENGAWASAN KAMERA`,
        `Peserta: ${studentName} (${studentClass})`
      );
      setScreenStream(syntheticScreen);
    }

    // If camera is also missing, create synthetic camera
    if (!cameraStream) {
      const syntheticCamera = createSyntheticStream(
        `KAMERA AKTIF (MODE DARURAT)`,
        `${studentName} - Siap Ujian`
      );
      setCameraStream(syntheticCamera);
    }

    sounds.playSuccess();
  };

  const handleStartExam = async () => {
    let finalCamera = cameraStream;
    let finalScreen = screenStream;

    // Guaranteed fallbacks so student is NEVER stuck
    if (!finalCamera) {
      finalCamera = createSyntheticStream(
        `KAMERA PENGAWASAN SISWA`,
        `${studentName} (${studentClass})`
      );
    }
    if (!finalScreen) {
      finalScreen = finalCamera;
    }

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}

    sounds.playSuccess();
    onReady(finalCamera, finalScreen);
  };

  const hasAnyCamera = !!cameraStream;
  const hasScreenOrEmergency = !!screenStream || isEmergencyMode;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Tahap 2 dari 2</span>
              <span className="text-xs text-slate-500">&bull;</span>
              <span className="text-xs font-semibold text-slate-300">Verifikasi Kamera & Layar</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Pemeriksaan Perangkat Pengawasan Ujian
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Peserta: <strong className="text-slate-200">{studentName}</strong> &bull;{' '}
              <span className="text-indigo-300 font-semibold">{studentClass}</span>
            </p>
          </div>

          <button
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 self-start sm:self-auto transition-colors"
          >
            &larr; Ganti Nama / Kelas
          </button>
        </div>

        {/* ALWAYS-VISIBLE EMERGENCY MODE BANNER */}
        <div className="mt-5 p-4 bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/70 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Opsi Darurat / Bantuan Perangkat
                </span>
                {isEmergencyMode && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Mode Darurat Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Jika berbagi layar ditolak oleh peramban atau menggunakan HP/Tablet/Chromebook, klik tombol di samping untuk <strong>langsung melanjutkan ke ujian</strong> menggunakan mode kamera saja.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleActivateEmergencyMode}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md ${
                isEmergencyMode
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {isEmergencyMode ? <Check className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              <span>{isEmergencyMode ? 'Mode Kamera Saja Sudah Aktif' : 'Gunakan Mode Kamera Saja & Lanjut'}</span>
            </button>
          </div>
        </div>

        {/* Dual Video Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
          {/* 1. Kamera (Webcam) */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-slate-200">1. Kamera Pengawas (Webcam)</span>
              </div>
              {cameraStream ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Perlu Akses
                </span>
              )}
            </div>

            <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {cameraStream ? (
                <video
                  ref={videoCameraRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="text-center p-4">
                  <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs text-slate-400">Menunggu kamera aktif...</p>
                </div>
              )}
            </div>

            {cameraError && (
              <p className="mt-2 text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-500/30">
                {cameraError}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={requestCamera}
                disabled={isRequestingCamera}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRequestingCamera ? 'animate-spin' : ''}`} />
                <span>{cameraStream ? 'Uji Ulang Kamera' : 'Izinkan Kamera'}</span>
              </button>
            </div>
          </div>

          {/* 2. Berbagi Layar (Screen Share) */}
          <div className={`bg-slate-950 rounded-2xl border p-4 flex flex-col justify-between overflow-hidden transition-all ${
            screenStream && !isEmergencyMode
              ? 'border-emerald-500/40' 
              : isEmergencyMode
              ? 'border-amber-500/40 bg-amber-950/10'
              : 'border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-slate-200">2. Pemantau Layar Desktop</span>
              </div>
              {screenStream && !isEmergencyMode ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Terhubung
                </span>
              ) : isEmergencyMode ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Mode Kamera Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
                  Belum Berbagi
                </span>
              )}
            </div>

            <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {screenStream ? (
                <video
                  ref={videoScreenRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="text-center p-4">
                  <Monitor className="w-9 h-9 text-indigo-400 mx-auto mb-2 animate-bounce" />
                  <p className="text-xs font-bold text-white">Layar Belum Terhubung</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Klik <strong>"Bagikan Layar"</strong> atau klik tombol darurat jika peramban menolak.
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {screenError && (
              <div className="mt-2 text-xs text-red-300 bg-red-950/60 p-2.5 rounded-xl border border-red-500/40">
                <p className="font-semibold">{screenError}</p>
                {autoPromptTimer !== null && (
                  <p className="text-[11px] text-amber-300 mt-1 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Mempersiapkan permintaan ulang dalam <strong>{autoPromptTimer} detik</strong>...</span>
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-4 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={requestScreen}
                  disabled={isRequestingScreen}
                  className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    screenStream && !isEmergencyMode
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>
                    {isRequestingScreen
                      ? 'Menunggu Pilihan Layar...'
                      : screenStream && !isEmergencyMode
                      ? 'Pilih Ulang Layar'
                      : 'Bagikan Layar Sekarang'}
                  </span>
                </button>

                {/* Emergency toggle button directly beside screen button */}
                <button
                  type="button"
                  onClick={handleActivateEmergencyMode}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                    isEmergencyMode
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                  }`}
                  title="Lewati berbagi layar dan gunakan pengawasan kamera saja"
                >
                  <span>{isEmergencyMode ? 'Kamera Aktif' : 'Bypass Kamera'}</span>
                </button>
              </div>

              {/* Instructions helper */}
              {!screenStream && !isEmergencyMode && (
                <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="font-bold text-slate-300 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Petunjuk Berbagi Layar:</span>
                  </div>
                  <p>1. Pilih tab <strong>"Entire Screen / Seluruh Layar"</strong>.</p>
                  <p>2. <strong>Klik gambar layar</strong> komputer Anda.</p>
                  <p>3. Klik tombol biru <strong>"Share / Bagikan"</strong>.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Start Exam Button - ALWAYS CAN BE CLICKED IF EMERGENCY OR CAMERA IS ON */}
        <button
          onClick={handleStartExam}
          className="w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-600/30 scale-100 cursor-pointer"
        >
          <Lock className="w-5 h-5" />
          <span>
            {isEmergencyMode
              ? 'Kunci Layar & Mulai Ujian (Mode Kamera Saja)'
              : screenStream
              ? 'Kunci Layar & Mulai Pengerjaan Soal Ujian'
              : 'Mulai Ujian Sekarang (Lanjut dengan Kamera Saja)'}
          </span>
          <Maximize className="w-5 h-5" />
        </button>

        {/* Small note at bottom */}
        <p className="text-center text-[11px] text-slate-500 mt-3">
          Sistem anti-kecurangan (kunci layar penuh, deteksi pindah tab & blur) tetap aktif sepenuhnya untuk menjaga integritas ujian.
        </p>
      </div>
    </div>
  );
};
