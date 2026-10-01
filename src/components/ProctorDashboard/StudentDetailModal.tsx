import React, { useState } from 'react';
import { 
  X, 
  Camera, 
  Monitor, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Send, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  ShieldAlert,
  MessageSquare,
  FileImage
} from 'lucide-react';
import { StudentSession } from '../../types/exam';

interface StudentDetailModalProps {
  student: StudentSession;
  onClose: () => void;
  onSendCommand: (studentId: string, action: string, message?: string) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  onClose,
  onSendCommand,
}) => {
  const [warningMessage, setWarningMessage] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningMessage.trim()) return;
    onSendCommand(student.id, 'message', warningMessage.trim());
    setWarningMessage('');
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
              {student.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white">{student.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Kelas {student.studentClass}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                  student.status === 'locked'
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : student.status === 'warning'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  Status: {student.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Mata Pelajaran: {student.subject} &bull; Sesi Bergabung: {formatTime(student.joinedAt)} WIB
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Dual Feed Video Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Live Camera View */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
              <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <Camera className="w-4 h-4 text-indigo-400" />
                  <span>Kamera Pengawas (Webcam)</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">LIVE HD</span>
              </div>
              <div className="relative aspect-video bg-black flex items-center justify-center">
                {student.cameraFrame ? (
                  <img
                    src={student.cameraFrame}
                    alt={`Feed Kamera ${student.name}`}
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="text-center p-4 text-slate-500">
                    <Camera className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-pulse" />
                    <span className="text-xs">Menunggu transmisi frame kamera siswa...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Live Screen View */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
              <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span>Pemantauan Layar Desktop</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono">LIVE STREAM</span>
              </div>
              <div className="relative aspect-video bg-black flex items-center justify-center">
                {student.screenFrame ? (
                  <img
                    src={student.screenFrame}
                    alt={`Feed Layar ${student.name}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-4 text-slate-500">
                    <Monitor className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <span className="text-xs">Menunggu transmisi tangkapan layar siswa...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Remote Action Bar */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Aksi Kendali Jarak Jauh:</span>
            </div>

            <div className="flex items-center gap-2">
              {student.status === 'locked' ? (
                <button
                  onClick={() => onSendCommand(student.id, 'unlock')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Buka Kunci Layar Siswa</span>
                </button>
              ) : (
                <button
                  onClick={() => onSendCommand(student.id, 'lock', 'Pengawas mengunci layar ujian Anda.')}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all"
                >
                  <Lock className="w-4 h-4" />
                  <span>Kunci Layar Siswa</span>
                </button>
              )}

              <button
                onClick={() => onSendCommand(student.id, 'reset_violations')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Pelanggaran (0)</span>
              </button>
            </div>
          </div>

          {/* Direct Warning Message to Student */}
          <form onSubmit={handleSendMessage} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Kirimkan Pesan Teguran Langsung ke Layar Peserta:</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={warningMessage}
                onChange={(e) => setWarningMessage(e.target.value)}
                placeholder="Contoh: Harap fokus menatap layar dan jangan menoleh ke samping..."
                className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim</span>
              </button>
            </div>
          </form>

          {/* Chronological Audit Trail of Violations */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">
                  Log Riwayat Pelanggaran & Aktivitas Mencurigakan ({student.violations.length})
                </h4>
              </div>
            </div>

            {student.violations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                <span>Belum ada aktivitas mencurigakan yang terdeteksi untuk siswa ini.</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {student.violations.map((v, i) => (
                  <div
                    key={v.id || i}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="capitalize">{v.type.replace('_', ' ')}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatTime(v.timestamp)} WIB
                          </span>
                        </div>
                        <p className="text-slate-400 mt-0.5">{v.description}</p>
                      </div>
                    </div>

                    {v.snapshotUrl && (
                      <button
                        onClick={() => setSelectedSnapshot(v.snapshotUrl!)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 shrink-0"
                      >
                        <FileImage className="w-3 h-3 text-indigo-400" />
                        <span>Bukti Screenshot</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Snapshot Zoom Modal */}
        {selectedSnapshot && (
          <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
            <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-hidden">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-white">Tangkapan Bukti Pelanggaran Saat Kejadian</span>
                <button
                  onClick={() => setSelectedSnapshot(null)}
                  className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={selectedSnapshot}
                alt="Bukti Pelanggaran"
                className="w-full h-auto rounded-xl border border-slate-800"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
