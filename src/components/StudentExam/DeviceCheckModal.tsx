import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Monitor, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Maximize, 
  Lock, 
  RefreshCw,
  VideoOff,
  Tv
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

  const videoCameraRef = useRef<HTMLVideoElement | null>(null);
  const videoScreenRef = useRef<HTMLVideoElement | null>(null);

  // Auto request camera on mount
  useEffect(() => {
    requestCamera();
    return () => {
      // Clean up preview streams if cancelled
    };
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
      console.error('Camera access error:', err);
      setCameraError(
        'Izin kamera ditolak atau tidak ditemukan perangkat kamera. Pastikan browser mengizinkan akses kamera Anda.'
      );
    } finally {
      setIsRequestingCamera(false);
    }
  };

  const requestScreen = async () => {
    setIsRequestingScreen(true);
    setScreenError(null);
    try {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
      // Request full screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      // Listen for user clicking native "Stop sharing" chrome banner
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setScreenStream(null);
          setScreenError('Berbagi layar dihentikan! Anda wajib membagikan layar kembali untuk dapat mengikuti ujian.');
        };
      }

      setScreenStream(stream);
      sounds.playSuccess();
    } catch (err: any) {
      console.error('Screen capture error:', err);
      setScreenError(
        'Berbagi layar dibatalkan atau ditolak. Anda harus membagikan layar Anda (Entire Screen) agar pengawas dapat memverifikasi ujian.'
      );
    } finally {
      setIsRequestingScreen(false);
    }
  };

  const handleStartExam = async () => {
    if (!cameraStream || !screenStream) return;

    try {
      // Attempt to enter fullscreen
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {
          console.warn('Fullscreen request rejected by browser');
        });
      }
    } catch {
      // Continue anyway
    }

    sounds.playSuccess();
    onReady(cameraStream, screenStream);
  };

  const isReadyToStart = !!cameraStream && !!screenStream;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Card Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Tahap 2 dari 2</span>
              <span className="text-xs text-slate-500">&bull;</span>
              <span className="text-xs font-semibold text-slate-300">Pemeriksaan Perangkat Pengawasan</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Verifikasi Kamera & Tangkapan Layar
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Peserta: <strong className="text-slate-200">{studentName}</strong> ({studentClass})
            </p>
          </div>

          <button
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 self-start sm:self-auto"
          >
            &larr; Ganti Data Diri
          </button>
        </div>

        {/* Dual Video Previews */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
          {/* 1. Camera Section */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-slate-200">1. Kamera Wajah (Webcam)</span>
              </div>
              {cameraStream ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <VideoOff className="w-3 h-3" />
                  Belum Aktif
                </span>
              )}
            </div>

            {/* Video or Placeholder */}
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
                  <p className="text-xs text-slate-400">Kamera belum tersambung</p>
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
              <span>{cameraStream ? 'Uji Ulang Kamera' : 'Izinkan Akses Kamera'}</span>
            </button>
          </div>

          {/* 2. Screen Share Section */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-slate-200">2. Pemantauan Seluruh Layar</span>
              </div>
              {screenStream ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Terhubung
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <Tv className="w-3 h-3" />
                  Belum Berbagi
                </span>
              )}
            </div>

            {/* Screen Video or Placeholder */}
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
                  <Monitor className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Klik tombol di bawah untuk memilih layar</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    (Disarankan pilih opsi "Entire Screen / Seluruh Layar")
                  </span>
                </div>
              )}
            </div>

            {screenError && (
              <p className="mt-2 text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-500/30">
                {screenError}
              </p>
            )}

            <button
              onClick={requestScreen}
              disabled={isRequestingScreen}
              className={`mt-4 w-full py-2.5 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 transition-colors ${
                screenStream 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRequestingScreen ? 'animate-spin' : ''}`} />
              <span>{screenStream ? 'Pilih Ulang Layar' : 'Bagikan Layar Sekarang'}</span>
            </button>
          </div>
        </div>

        {/* Security / Anti-Cheat Protocols Summary */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Pemberitahuan Sistem Keamanan Ujian (Lockdown Engine)</span>
          </div>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Saat Anda menekan tombol mulai, peramban akan otomatis beralih ke <strong>Layar Penuh (Fullscreen)</strong>.</li>
            <li><strong>DILARANG</strong> menekan tombol ESC, Alt+Tab, membuka tab baru, atau meminimalkan browser.</li>
            <li>Setiap perpindahan tab/jendela dicatat dan dikirim seketika ke <strong>Dashboard Pengawas</strong>.</li>
            <li>Jika pelanggaran mencapai batas 3 kali, pengerjaan soal akan <strong>terkunci otomatis</strong>.</li>
          </ul>
        </div>

        {/* Action Button */}
        <button
          onClick={handleStartExam}
          disabled={!isReadyToStart}
          className={`w-full py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-3 transition-all ${
            isReadyToStart
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-600/30 scale-100 cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
          }`}
        >
          <Lock className="w-5 h-5" />
          <span>
            {isReadyToStart
              ? 'Kunci Layar & Masuk ke Halaman Soal Google Form'
              : 'Aktifkan Kamera & Berbagi Layar Terlebih Dahulu'}
          </span>
          <Maximize className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
