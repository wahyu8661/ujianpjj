import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Clock, 
  ShieldAlert, 
  Save, 
  Link2, 
  CheckCircle2, 
  ExternalLink,
  Layers,
  Search,
  Copy,
  Check
} from 'lucide-react';
import { ExamConfig, ROMBEL_LIST, SUBJECT_OPTIONS } from '../../types/exam';

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
  const [activeTab, setActiveTab] = useState<'rombel_links' | 'general'>('rombel_links');
  const [formUrl, setFormUrl] = useState(config.formUrl || '');
  const [rombelFormUrls, setRombelFormUrls] = useState<Record<string, string>>(config.rombelFormUrls || {});
  const [title, setTitle] = useState(config.title);
  const [schoolName, setSchoolName] = useState(config.schoolName);
  const [subject, setSubject] = useState(config.subject);
  const [durationMinutes, setDurationMinutes] = useState(config.durationMinutes);
  const [maxViolationsAllowed, setMaxViolationsAllowed] = useState(config.maxViolationsAllowed);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [searchRombel, setSearchRombel] = useState('');
  const [copiedRombel, setCopiedRombel] = useState<string | null>(null);

  const handleRombelLinkChange = (rombel: string, url: string) => {
    setRombelFormUrls((prev) => ({
      ...prev,
      [rombel]: url,
    }));
  };

  const handleApplyDefaultToAll = () => {
    if (!formUrl.trim()) return;
    const updated: Record<string, string> = {};
    ROMBEL_LIST.forEach((rombel) => {
      updated[rombel] = formUrl.trim();
    });
    setRombelFormUrls(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      formUrl: formUrl.trim(),
      rombelFormUrls,
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

  const filteredRombels = ROMBEL_LIST.filter((r) =>
    r.toLowerCase().includes(searchRombel.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Konfigurasi Link Soal & Pengaturan Ujian</h3>
              <p className="text-xs text-slate-400">Pengaturan Akses Google Form per Rombongan Belajar (Rombel)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-950/60 border-b border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('rombel_links')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'rombel_links'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Link Soal per Rombel ({ROMBEL_LIST.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'general'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Pengaturan Umum Ujian</span>
          </button>
        </div>

        {savedSuccess && (
          <div className="m-4 p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Pengaturan berhasil disimpan dan disinkronkan ke seluruh peserta!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* TAB 1: Link per Rombel */}
          {activeTab === 'rombel_links' && (
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Default fallback link */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                    <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Link Google Form Cadangan / Default (Semua Rombel):</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleApplyDefaultToAll}
                    disabled={!formUrl}
                    className="text-[11px] font-semibold text-indigo-300 bg-indigo-950/80 hover:bg-indigo-900/80 px-2.5 py-1 rounded-lg border border-indigo-500/30 disabled:opacity-50 transition-colors self-start sm:self-auto"
                  >
                    Terapkan Link Ini ke Seluruh Rombel
                  </button>
                </div>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Digunakan otomatis apabila rombel belum memiliki link form khusus di bawah.
                </p>
              </div>

              {/* Rombel list search & summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Daftar Pengisian Link Soal per Rombel ({ROMBEL_LIST.length} Kelas)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Setiap rombel dapat menggunakan link Google Form yang berbeda sesuai soal masing-masing.
                  </p>
                </div>

                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchRombel}
                    onChange={(e) => setSearchRombel(e.target.value)}
                    placeholder="Cari nama rombel..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* List of Rombels with input */}
              <div className="space-y-3">
                {filteredRombels.map((rombel, idx) => {
                  const currentLink = rombelFormUrls[rombel] || '';
                  const isUsingCustom = Boolean(currentLink.trim());
                  const activeUrl = isUsingCustom ? currentLink : formUrl;

                  return (
                    <div
                      key={rombel}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isUsingCustom
                          ? 'bg-slate-950 border-indigo-500/40 shadow-sm shadow-indigo-500/5'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-mono font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-xs text-white">
                            {rombel}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isUsingCustom ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Link Khusus Aktif
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                              Mengikuti Link Default
                            </span>
                          )}

                          {activeUrl && (
                            <a
                              href={activeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 font-medium ml-1"
                              title="Uji buka link di tab baru"
                            >
                              <span>Tes Form</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Input field with rombel name in placeholder & label */}
                      <div className="relative">
                        <input
                          type="url"
                          value={currentLink}
                          onChange={(e) => handleRombelLinkChange(rombel, e.target.value)}
                          placeholder={`Tempel link Google Form untuk: ${rombel}`}
                          className="w-full pl-3 pr-20 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                        />
                        {/* Quick action to copy from default if empty */}
                        {!currentLink && formUrl && (
                          <button
                            type="button"
                            onClick={() => handleRombelLinkChange(rombel, formUrl)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded font-medium border border-slate-700"
                          >
                            Pakai Default
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: General Settings */}
          {activeTab === 'general' && (
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Mata Pelajaran & Nama Sekolah */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Mata Pelajaran Ujian
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
                    Layar siswa terkunci total jika mencapai batas ini.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2 shrink-0">
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
              <span>Simpan & Terapkan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
