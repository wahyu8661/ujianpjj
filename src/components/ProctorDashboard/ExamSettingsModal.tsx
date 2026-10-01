import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  FileText, 
  Clock, 
  ShieldAlert, 
  School, 
  Save, 
  Link2,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { ExamConfig, SUBJECT_OPTIONS } from '../../types/exam';

interface ExamSettingsModalProps {
  config: ExamConfig;
  onClose: () => void;
  onSave: (newConfig: Partial<ExamConfig>) => void;
}

export const ExamSettingsModal: React.FC<ExamSettingsModalProps> = ({
  config,
  onClose,
  onSave,
}) => {
  const [formUrl, setFormUrl] = useState(config.formUrl);
  const [title, setTitle] = useState(config.title);
  const [schoolName, setSchoolName] = useState(config.schoolName);
  const [subject, setSubject] = useState(config.subject);
  const [durationMinutes, setDurationMinutes] = useState(config.durationMinutes);
  const [maxViolationsAllowed, setMaxViolationsAllowed] = useState(config.maxViolationsAllowed);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      formUrl: formUrl.trim(),
      title: title.trim(),
      schoolName: schoolName.trim(),
      subject,
      durationMinutes: Number(durationMinutes),
      maxViolationsAllowed: Number(maxViolationsAllowed),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const sampleForms = [
    {
      label: 'Google Form Ujian Contoh 1 (Pilihan Ganda & Essay)',
      url: 'https://docs.google.com/forms/d/e/1FAIpQLSfD_sample1/viewform?embedded=true',
    },
    {
      label: 'Google Form Penilaian Harian / Literasi',
      url: 'https://docs.google.com/forms/d/e/1FAIpQLScP_sample2/viewform?embedded=true',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 text-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Konfigurasi Ujian & Soal Google Form</h3>
              <p className="text-xs text-slate-400">Pengaturan Akses & Kebijakan Proctoring Pengawas</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {savedSuccess && (
          <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Pengaturan berhasil disimpan dan disinkronkan ke seluruh peserta!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Link Google Form */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>URL / Tautan Google Form Soal <span className="text-red-400">*</span></span>
            </label>
            <input
              type="url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://docs.google.com/forms/d/e/.../viewform"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono text-xs"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Guru cukup menempelkan (paste) link Google Form soal ujian di sini. Sistem akan otomatis menyematkan ke layar siswa secara aman.
            </p>

            {/* Quick sample chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[10px] text-slate-400 self-center">Pilihan Contoh:</span>
              {sampleForms.map((s, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setFormUrl(s.url)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-indigo-300 border border-slate-700 transition-colors"
                >
                  Gunakan Form Contoh #{idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Mata Pelajaran & Nama Sekolah */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
                Mata Pelajaran
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
              >
                {SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub} value={sub} className="bg-slate-900 text-slate-100">
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
                Nama Sekolah
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          {/* Judul Ujian */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
              Judul Sesi Ujian
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          {/* Durasi & Batas Pelanggaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Durasi Ujian (Menit)</span>
              </label>
              <input
                type="number"
                min="10"
                max="240"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                <span>Batas Maksimal Pelanggaran</span>
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxViolationsAllowed}
                onChange={(e) => setMaxViolationsAllowed(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
              />
              <span className="text-[10px] text-slate-400">
                Layar siswa akan terkunci total jika mencapai batas ini.
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-xs flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan & Terapkan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
