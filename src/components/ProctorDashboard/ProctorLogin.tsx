import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  KeyRound, 
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export interface ProctorUser {
  username: string;
  name: string;
  role: string;
}

export const PROCTOR_ACCOUNTS: ProctorUser[] = [
  { username: 'wahyu8661', name: 'Wahyu, S.Pd.', role: 'Koordinator Pengawas Ujian' },
  { username: 'wahyu', name: 'Wahyu, S.Pd.', role: 'Koordinator Pengawas Ujian' },
  { username: 'sitinurhaliza', name: 'Dra. Hj. Siti Nurhaliza, M.Pd.', role: 'Pengawas Ruang 01' },
  { username: 'ahmadfaiz', name: 'Ahmad Faiz Pratama, S.Kom.', role: 'Pengawas Teknis & IT' },
  { username: 'budisantoso', name: 'Budi Santoso, S.Pd.', role: 'Pengawas Ruang 02' },
  { username: 'dewilestari', name: 'Dewi Lestari, S.Pd.', role: 'Pengawas Ruang 03' },
  { username: 'pengawas', name: 'Pengawas Piket Ujian', role: 'Pengawas Umum' },
  { username: 'admin', name: 'Administrator Kurikulum', role: 'Super Admin' },
];

export const DEFAULT_PROCTOR_PASSWORD = '998877';

interface ProctorLoginProps {
  onLoginSuccess: (user: ProctorUser) => void;
  onBackToStudent: () => void;
}

export const ProctorLogin: React.FC<ProctorLoginProps> = ({
  onLoginSuccess,
  onBackToStudent,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showAccountsHelper, setShowAccountsHelper] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('Harap masukkan username dan kata sandi pengawas.');
      return;
    }

    if (cleanPass !== DEFAULT_PROCTOR_PASSWORD) {
      setError('Kata sandi salah. Pastikan menggunakan sandi pengawas yang telah ditetapkan.');
      return;
    }

    // Match existing account or allow dynamically
    const found = PROCTOR_ACCOUNTS.find((a) => a.username.toLowerCase() === cleanUser);
    const userToLogin: ProctorUser = found || {
      username: cleanUser,
      name: cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1) + ' (Pengawas)',
      role: 'Pengawas Ujian Daring',
    };

    onLoginSuccess(userToLogin);
  };

  const handleSelectAccount = (account: ProctorUser) => {
    setUsername(account.username);
    setPassword(DEFAULT_PROCTOR_PASSWORD);
    setShowAccountsHelper(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Autentikasi Pengawas Ujian
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Area terbatas &bull; Khusus Guru dan Pengawas Resmi
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-950/60 border border-red-500/40 rounded-xl flex items-center gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Username Pengawas
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: wahyu8661 atau sitinurhaliza"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Kata Sandi Pengawas
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi (998877)"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm font-medium font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Account Picker Button */}
          <div className="pt-1 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setShowAccountsHelper(!showAccountsHelper)}
              className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Lihat Daftar Akun Pengawas Terdaftar</span>
            </button>
          </div>

          {/* Accounts Dropdown/Drawer */}
          {showAccountsHelper && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 animate-slide-down">
              <p className="text-[11px] font-bold text-slate-300">
                Pilih Akun Guru / Pengawas (Sandi: <span className="font-mono text-emerald-400">998877</span>):
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {PROCTOR_ACCOUNTS.map((acc, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => handleSelectAccount(acc)}
                    className="w-full text-left p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800/80 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <strong className="text-white block">{acc.name}</strong>
                      <span className="text-[10px] text-indigo-400 font-mono">user: {acc.username}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      Pilih
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all text-xs sm:text-sm"
          >
            <span>Masuk Dashboard Pengawas</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Back to student */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={onBackToStudent}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            &larr; Kembali ke Halaman Masuk Siswa
          </button>
        </div>
      </div>
    </div>
  );
};
