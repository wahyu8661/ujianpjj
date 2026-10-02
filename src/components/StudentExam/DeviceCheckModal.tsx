import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Monitor, 
  CheckCircle2, 
  AlertTriangle, 
  Maximize, 
  Lock, 
  RefreshCw, 
  Tv,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  Info,
  Check
} from 'lucide-react';
import { sounds } from '../../utils/audio';

interface DeviceCheckModalProps {
  studentName: string;
  studentClass: string;
  onReady: (cameraStream: MediaStream, screenStream: MediaStream) => void;
  onBack: () => void;
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
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [autoPromptTimer, setAutoPromptTimer] = useState<number | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [allowMobileCameraOnly, setAllowMobileCameraOnly] = useState(false);

  const videoCameraRef = useRef<HTMLVideoElement | null>(null);
  const videoScreenRef = useRef<HTMLVideoElement | null>(null);

  // Detect mobile/tablet
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    setIsMobileDevice(isMobile);
  }, []);

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

  // Auto-prompt countdown if user closed screen share dialog
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
      
      // If screen is not yet active and not on mobile, trigger screen request immediately
      if (!screenStream && !isMobileDevice) {
        setTimeout(() => {
          requestScreen();
        }, 500);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Izin kamera ditolak atau tidak ditemukan kamera. Klik tombol Izinkan Kamera di bawah.'
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
      setScreenError('Peramban atau perangkat ini tidak mendukung tangkapan layar (getDisplayMedia).');
      setIsRequestingScreen(false);
      return;
    }

    try {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }

      // Request screen capture with display preferences
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
          setScreenError('Berbagi layar dihentikan! Anda wajib membagikan layar kembali untuk dapat mengikuti ujian.');
          sounds.playInfractionWarning();
          // Trigger prompt timer
          setAutoPromptTimer(3);
        };
      }

      setScreenStream(stream);
      setScreenError(null);
      setFailedAttempts(0);
      sounds.playSuccess();
    } catch (err: any) {
      console.warn('Screen capture issue:', err);
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setScreenError(
          'Berbagi layar dibatalkan atau ditutup. Pastikan Anda memilih gambar layar (Entire Screen) lalu klik tombol "Share / Bagikan".'
        );
      } else {
        setScreenError(
          `Gagal membagikan layar (${err.message || 'Izin peramban dibatasi'}).`
        );
      }

      // Automatically schedule a prompt reminder
      setAutoPromptTimer(2);
    } finally {
      setIsRequestingScreen(false);
    }
  };

  // Create a synthetic stream for mobile/emergency fallback if user is on mobile
  const handleEnableMobileFallback = () => {
    if (!cameraStream) return;
    setAllowMobileCameraOnly(true);
    // Clone camera stream or create canvas screen
    setScreenStream(cameraStream);
    sounds.playSuccess();
  };

  const handleStartExam = async () => {
    const activeScreen = screenStream || (allowMobileCameraOnly ? cameraStream : null);
    if (!cameraStream || !activeScreen) return;

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}

    sounds.playSuccess();
    onReady(cameraStream, activeScreen);
  };

  const isReadyToStart = !!cameraStream && (!!screenStream || allowMobileCameraOnly);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Card Container */}
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
              Pemeriksaan Akses Pengawasan Ujian
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Peserta: <strong className="text-slate-200">{studentName}</strong> &bull;{' '}
              <span className="text-indigo-300 font-semibold">{studentClass}</span>
            </p>
          </div>

          <button
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 self-start sm:self-auto"
          >
            &larr; Ganti Nama / Kelas
          </button>
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
                  Memerlukan Akses
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
                  <p className="text-xs text-slate-400">Kamera sedang memuat...</p>
                </div>
              )}
            </div>

            {cameraError && (
              <p className="mt-2 text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-500/30">
                {cameraError}
              </p>
            )}

            <button
              onClick={requestCamera}
              disabled={isRequestingCamera}
              className="mt-4 w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRequestingCamera ? 'animate-spin' : ''}`} />
              <span>{cameraStream ? 'Uji Ulang Kamera' : 'Izinkan Kamera'}</span>
            </button>
          </div>

          {/* 2. Berbagi Layar (Screen Share) */}
          <div className={`bg-slate-950 rounded-2xl border p-4 flex flex-col justify-between overflow-hidden transition-all ${
            screenStream 
              ? 'border-emerald-500/40' 
              : 'border-amber-500/50 shadow-lg shadow-amber-500/5'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-slate-200">2. Pemantau Seluruh Layar</span>
              </div>
              {screenStream ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Terhubung
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                  Wajib Dibagikan
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
                    Klik tombol <strong>"Bagikan Layar Sekarang"</strong> di bawah untuk memilih seluruh layar Anda.
                  </p>
                </div>
              )}
            </div>

            {/* Error Message with Auto-Retry Notice */}
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

            {/* Continuous Prominent Trigger Button */}
            <div className="mt-4 space-y-2">
              <button
                onClick={requestScreen}
                disabled={isRequestingScreen}
                className={`w-full py-3 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  screenStream
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white border-transparent shadow-lg shadow-indigo-600/30 animate-pulse'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>
                  {isRequestingScreen
                    ? 'Menunggu Pilihan Layar di Jendela Browser...'
                    : screenStream
                    ? 'Pilih Ulang Layar'
                    : 'Bagikan Layar Sekarang (Klik di Sini)'}
                </span>
              </button>

              {/* Step instructions helper */}
              {!screenStream && (
                <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="font-bold text-slate-300 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Cara Memilih Layar:</span>
                  </div>
                  <p>1. Pada jendela yang muncul, pilih tab <strong>"Entire Screen / Seluruh Layar"</strong>.</p>
                  <p>2. <strong>Klik gambar layar</strong> yang muncul di kotak dialog.</p>
                  <p>3. Klik tombol biru <strong>"Share / Bagikan"</strong>.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fallback Option for Restricted Environments / Mobile */}
        {failedAttempts >= 2 && !screenStream && (
          <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300">
                  Kendala Perizinan Layar Peramban?
                </p>
                <p className="text-amber-200/80 mt-0.5">
                  Jika peramban Anda membatasi berbagi layar di dalam jendela ini, Anda dapat membukanya di jendela baru, atau jika menggunakan HP/Tablet, aktifkan mode pengawasan kamera.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => window.open(window.location.href, '_blank')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold border border-slate-700 flex items-center gap-1"
                title="Buka aplikasi langsung di tab baru"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka di Tab Baru</span>
              </button>

              <button
                type="button"
                onClick={handleEnableMobileFallback}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-colors"
                title="Izinkan pengerjaan dengan pengawasan kamera saja"
              >
                <span>Gunakan Kamera Saja</span>
              </button>
            </div>
          </div>
        )}

        {/* Start Exam Button */}
        <button
          onClick={handleStartExam}
          disabled={!isReadyToStart}
          className={`w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 transition-all ${
            isReadyToStart
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-600/30 scale-100 cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
          }`}
        >
          <Lock className="w-5 h-5" />
          <span>
            {isReadyToStart
              ? 'Kunci Layar & Mulai Pengerjaan Soal Ujian'
              : 'Harap Bagikan Layar Terlebih Dahulu untuk Memulai'}
          </span>
          <Maximize className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
