import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Monitor, 
  UserCheck, 
  Volume2, 
  VolumeX, 
  HelpCircle,
  Flame,
  Radio,
  LogOut,
  User
} from 'lucide-react';
import { ProctorUser } from './ProctorDashboard/ProctorLogin';

interface NavbarProps {
  currentView: 'student' | 'proctor';
  onViewChange: (view: 'student' | 'proctor') => void;
  proctorUser: ProctorUser | null;
  onProctorLogout: () => void;
  isConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeViolationsCount?: number;
  onOpenProctorLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  proctorUser,
  onProctorLogout,
  isConnected,
  soundEnabled,
  onToggleSound,
  activeViolationsCount = 0,
  onOpenProctorLogin,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);

  // Hidden shortcut: clicking logo 3 times opens proctor login
  const handleLogoClick = () => {
    const next = logoClickCount + 1;
    if (next >= 3) {
      setLogoClickCount(0);
      onOpenProctorLogin();
    } else {
      setLogoClickCount(next);
      setTimeout(() => setLogoClickCount(0), 2000);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & School Context */}
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-3 cursor-pointer select-none group"
            title="Sistem Ujian Online"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">SIAP-UJIAN</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400 animate-pulse" />
                  PJJ Kabut Asap
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Sistem Ujian Terpadu & Proctoring Pengawasan
              </p>
            </div>
          </div>

          {/* Center: Only visible if Proctor is authenticated */}
          {proctorUser ? (
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => onViewChange('student')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === 'student'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Lihat Mode Siswa</span>
              </button>
              <button
                onClick={() => onViewChange('proctor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                  currentView === 'proctor'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Dashboard Pengawas</span>
                {activeViolationsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute -top-0.5 -right-0.5" />
                )}
              </button>
            </div>
          ) : (
            // For students, no distracting tabs are displayed
            <div className="hidden md:flex items-center text-xs text-slate-400 font-medium">
              <span>Portal Ujian Semester Daring Mandiri</span>
            </div>
          )}

          {/* Right Status Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Proctor User Badge if logged in */}
            {proctorUser && (
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold text-white">{proctorUser.name}</span>
                <button
                  onClick={onProctorLogout}
                  className="ml-1 text-slate-500 hover:text-red-400 p-0.5"
                  title="Keluar dari Akun Pengawas"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Live indicator */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
              title={isConnected ? 'Terhubung dengan Server Sinkronisasi' : 'Mencoba Menghubungkan Kembali'}
            >
              <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              <span className="hidden md:inline">{isConnected ? 'Server Online' : 'Sinkronisasi...'}</span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={onToggleSound}
              className={`p-2 rounded-lg border transition-colors ${
                soundEnabled 
                  ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' 
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800'
              }`}
              title={soundEnabled ? 'Notifikasi Suara Aktif' : 'Notifikasi Suara Dinonaktifkan'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Help / Guidance */}
            <button
              onClick={() => setShowInfo(true)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
              title="Informasi Sistem Proctoring & Panduan Siswa"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Proctor Logout on mobile if logged in */}
            {proctorUser && (
              <button
                onClick={onProctorLogout}
                className="p-2 rounded-lg bg-red-950/40 text-red-400 border border-red-500/30 hover:bg-red-900/40 transition-colors lg:hidden"
                title="Keluar Pengawas"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Panduan Pengawasan Ujian Online</h3>
                <p className="text-xs text-slate-400">Prosedur Ujian Daring Saat Kabut Asap</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-300 mb-6">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex gap-3">
                <span className="font-bold text-indigo-400">1.</span>
                <p><strong className="text-white">Akses Kamera & Layar:</strong> Siswa wajib mengizinkan kamera webcam dan berbagi seluruh layar desktop sebelum memasuki soal.</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex gap-3">
                <span className="font-bold text-indigo-400">2.</span>
                <p><strong className="text-white">Kunci Layar Penuh (Fullscreen):</strong> Sistem otomatis mengunci dalam mode layar penuh. Keluar layar penuh atau beralih tab otomatis memicu teguran ke pengawas.</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex gap-3">
                <span className="font-bold text-indigo-400">3.</span>
                <p><strong className="text-white">Soal Google Form:</strong> Soal Google Form ditampilkan di dalam jendela ujian yang terlindungi anti-kecurangan.</p>
              </div>
            </div>

            <button
              onClick={() => setShowInfo(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all text-xs"
            >
              Saya Mengerti & Siap Ujian
            </button>
          </div>
        </div>
      )}
    </>
  );
};
