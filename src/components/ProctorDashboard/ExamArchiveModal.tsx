import React, { useState, useEffect } from 'react';
import { 
  X, 
  Archive, 
  Download, 
  Calendar, 
  Users, 
  AlertTriangle, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  Save,
  RefreshCw,
  FolderArchive
} from 'lucide-react';
import { ExamArchive, StudentSession } from '../../types/exam';

interface ExamArchiveModalProps {
  onClose: () => void;
  activeStudentsCount: number;
  onSessionArchived: () => void;
}

export const ExamArchiveModal: React.FC<ExamArchiveModalProps> = ({
  onClose,
  activeStudentsCount,
  onSessionArchived,
}) => {
  const [archives, setArchives] = useState<ExamArchive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArchive, setSelectedArchive] = useState<ExamArchive | null>(null);
  const [notes, setNotes] = useState('');
  const [clearActive, setClearActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchArchives = () => {
    setIsLoading(true);
    fetch('/api/archives')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setArchives(data);
      })
      .catch((err) => console.error('Failed to load archives', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchArchives();
  }, []);

  const handleSaveCurrentSession = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes.trim() || 'Sesi ujian diarsipkan oleh pengawas',
          clearActiveAfterSave: clearActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setNotes('');
        fetchArchives();
        onSessionArchived();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadCSV = (archive?: ExamArchive) => {
    if (!archive) {
      window.open('/api/export/csv', '_blank');
      return;
    }

    // Generate CSV for specific archive
    const header = ['No', 'Nama Siswa', 'Rombel/Kelas', 'Mata Pelajaran', 'Status', 'Waktu Masuk', 'Jumlah Pelanggaran', 'Ringkasan Pelanggaran'];
    const rows = archive.students.map((s, idx) => {
      const violationSummary = s.violations.map((v) => `[${v.type}] ${v.description}`).join('; ') || 'Tidak ada pelanggaran';
      const joinedStr = new Date(s.joinedAt).toLocaleString('id-ID');
      return [
        idx + 1,
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.studentClass.replace(/"/g, '""')}"`,
        `"${s.subject.replace(/"/g, '""')}"`,
        s.status.toUpperCase(),
        `"${joinedStr}"`,
        s.violationsCount,
        `"${violationSummary.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([header.join(','), ...rows].join('\r\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Rekap_Ujian_${archive.title.replace(/\s+/g, '_')}_${archive.createdAt}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Arsip & Riwayat Sesi Ujian</h3>
              <p className="text-xs text-slate-400">Data tersimpan di penyimpanan permanen dan dapat diakses kapan saja</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Action Box: Archive Current Active Session */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Save className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Arsipkan Sesi Ujian Berjalan Saat Ini</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Menyimpan rekaman {activeStudentsCount} siswa yang sedang aktif ke dalam basis data permanen.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadCSV()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Unduh CSV Sesi Berjalan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan arsip (misal: Ujian Sesi 1 Pagi)..."
                className="sm:col-span-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSaveCurrentSession}
                disabled={isSaving || activeStudentsCount === 0}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan ke Arsip'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <input
                type="checkbox"
                id="clearActiveCheck"
                checked={clearActive}
                onChange={(e) => setClearActive(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-900"
              />
              <label htmlFor="clearActiveCheck" className="cursor-pointer">
                Kosongkan daftar siswa aktif setelah pengarsipan (untuk memulai sesi ujian baru berikutnya)
              </label>
            </div>

            {saveSuccess && (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Sesi ujian berhasil disimpan ke arsip permanen!</span>
              </div>
            )}
          </div>

          {/* List of Previous Archives */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Archive className="w-3.5 h-3.5 text-indigo-400" />
                <span>Riwayat Ujian Tersimpan ({archives.length} Sesi)</span>
              </h4>
              <button
                type="button"
                onClick={fetchArchives}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Segarkan</span>
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs">Memuat arsip...</div>
            ) : archives.length === 0 ? (
              <div className="p-8 bg-slate-950/40 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
                Belum ada arsip sesi ujian. Gunakan form di atas untuk menyimpan sesi yang telah selesai.
              </div>
            ) : (
              <div className="space-y-2">
                {archives.map((arch) => (
                  <div
                    key={arch.id}
                    className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{arch.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                          {arch.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{new Date(arch.createdAt).toLocaleString('id-ID')} WIB</span>
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <Users className="w-3 h-3 text-indigo-400" />
                          <span>{arch.totalStudents} Peserta</span>
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 text-amber-400">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{arch.violations.length} Pelanggaran</span>
                        </span>
                      </div>
                      {arch.notes && (
                        <p className="text-[11px] text-slate-500 mt-1 italic">
                          Catatan: "{arch.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedArchive(arch)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Rincian</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadCSV(arch)}
                        className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/30 flex items-center gap-1"
                        title="Unduh Rekap Nilai / Peserta Format CSV / Excel"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh CSV</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Archive Details Modal Popup */}
        {selectedArchive && (
          <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h4 className="font-extrabold text-white text-base">{selectedArchive.title}</h4>
                  <p className="text-xs text-slate-400">{selectedArchive.subject} &bull; {new Date(selectedArchive.createdAt).toLocaleString('id-ID')} WIB</p>
                </div>
                <button
                  onClick={() => setSelectedArchive(null)}
                  className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 overflow-y-auto flex-1 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Daftar Peserta ({selectedArchive.students.length} Siswa):
                </h5>
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden">
                  {selectedArchive.students.map((std, i) => (
                    <div key={std.id || i} className="p-3 bg-slate-950 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">{std.name}</span>
                        <div className="text-[11px] text-slate-400">{std.studentClass}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          std.violationsCount > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {std.violationsCount} Pelanggaran
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {std.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between">
                <button
                  type="button"
                  onClick={() => handleDownloadCSV(selectedArchive)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Rekap CSV / Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedArchive(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
