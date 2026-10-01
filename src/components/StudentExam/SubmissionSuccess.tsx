import React from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Award, 
  Clock, 
  Calendar, 
  User, 
  Flame, 
  Download,
  RotateCcw
} from 'lucide-react';

interface SubmissionSuccessProps {
  student: {
    name: string;
    studentClass: string;
    subject: string;
    studentNumber?: string;
  };
  onRestart: () => void;
}

export const SubmissionSuccess: React.FC<SubmissionSuccessProps> = ({
  student,
  onRestart,
}) => {
  const completedAt = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const completedDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-center relative overflow-hidden">
        {/* Glow circle */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Ujian Berhasil Diselesaikan!
        </h2>
        <p className="text-sm text-slate-400 mt-2">
          Jawaban dan data rekaman pengawasan Anda telah tercatat pada server sekolah.
        </p>

        {/* Exam Certificate Card */}
        <div className="my-8 p-5 bg-slate-950 border border-slate-800 rounded-2xl text-left space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Bukti Presensi & Pengerjaan Ujian
            </span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Tervalidasi Sistem
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Nama Peserta:</span>
              <strong className="text-slate-200 text-sm">{student.name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Kelas:</span>
              <strong className="text-slate-200 text-sm">{student.studentClass}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Mata Pelajaran:</span>
              <strong className="text-slate-200 text-sm">{student.subject}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Waktu Selesai:</span>
              <strong className="text-slate-200 text-sm">{completedAt} WIB</strong>
            </div>
          </div>
        </div>

        {/* Haze Health Advice */}
        <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-xs text-amber-200 flex items-start gap-3 text-left mb-8">
          <Flame className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300">Pesan Kesehatan Masa Kabut Asap:</span>
            <p className="text-amber-200/80 mt-0.5 leading-relaxed">
              Setelah menyelesaikan ujian, tetap berada di dalam ruangan, tutup ventilasi jika asap pekat, perbanyak minum air putih, dan gunakan masker saat harus keluar rumah.
            </p>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Kembali ke Halaman Masuk</span>
        </button>
      </div>
    </div>
  );
};
