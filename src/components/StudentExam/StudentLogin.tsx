import React, { useState } from 'react';
import { 
  User, 
  GraduationCap, 
  ArrowRight, 
  Camera, 
  MonitorCheck, 
  AlertCircle,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { CLASS_OPTIONS, ExamConfig } from '../../types/exam';

interface StudentLoginProps {
  config: ExamConfig;
  onSubmit: (studentData: {
    name: string;
    studentClass: string;
    subject: string;
  }) => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({ config, onSubmit }) => {
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASS_OPTIONS[0]);
  const [customClass, setCustomClass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Harap masukkan nama lengkap Anda.');
      return;
    }

    const finalClass = selectedClass === 'Lainnya (Ketik Manual)' 
      ? customClass.trim() 
      : selectedClass;

    if (!finalClass) {
      setError('Harap tentukan kelas Anda.');
      return;
    }

    setError('');
    onSubmit({
      name: name.trim(),
      studentClass: finalClass,
      subject: config.subject,
    });
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Alert Notice Kabut Asap */}
      <div className="mb-6 bg-gradient-to-r from-amber-950/60 to-orange-950/60 border border-amber-600/40 rounded-2xl p-4 sm:p-5 shadow-lg flex items-start gap-3.5">
        <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl shrink-0 mt-0.5">
          <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-amber-200">
            Pelaksanaan Ujian Daring (PJJ Kabut Asap)
          </h3>
          <p className="text-xs sm:text-sm text-amber-200/80 mt-1 leading-relaxed">
            Kualitas udara di luar sedang tidak sehat. Tetap di rumah dan kerjakan ujian semester dengan tenang. Sistem akan mengaktifkan <strong>kamera dan pengawasan layar</strong> saat ujian dimulai.
          </p>
        </div>
      </div>

      {/* Main Login Card - Simplified strictly to Name & Class */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-3 shadow-inner">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Masuk Ujian Siswa
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {config.schoolName} &bull; <strong className="text-indigo-400">{config.subject}</strong>
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-950/60 border border-red-500/40 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm text-red-300 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Nama Siswa */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Nama Lengkap Siswa <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ketik Nama Lengkap Anda..."
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-medium"
                required
                autoFocus
              />
            </div>
          </div>

          {/* 2. Pilih Kelas */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Pilih Kelas <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-medium cursor-pointer"
            >
              {CLASS_OPTIONS.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-slate-100">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Custom class if selected */}
          {selectedClass === 'Lainnya (Ketik Manual)' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Ketikkan Nama Kelas Anda
              </label>
              <input
                type="text"
                value={customClass}
                onChange={(e) => setCustomClass(e.target.value)}
                placeholder="Contoh: IX-F"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-medium"
                required
              />
            </div>
          )}

          {/* Info Singkat Akses Kamera & Layar */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-3 text-xs text-slate-400">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>
              Pada tahap selanjutnya, Anda akan diminta mengaktifkan kamera dan berbagi layar untuk pengawasan anti-kecurangan.
            </span>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 group transition-all text-sm"
          >
            <span>Lanjut ke Verifikasi Kamera & Layar</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>

      {/* Feature summary */}
      <div className="grid grid-cols-2 gap-3 mt-6 text-center">
        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex items-center justify-center gap-2">
          <Camera className="w-4 h-4 text-indigo-400" />
          <span>Pengawasan Kamera Aktif</span>
        </div>
        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex items-center justify-center gap-2">
          <MonitorCheck className="w-4 h-4 text-emerald-400" />
          <span>Kunci Layar Penuh</span>
        </div>
      </div>
    </div>
  );
};
