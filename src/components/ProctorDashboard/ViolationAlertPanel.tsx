import React from 'react';
import { 
  AlertTriangle, 
  X, 
  ExternalLink, 
  Clock, 
  Bell, 
  ShieldAlert, 
  User,
  ChevronRight
} from 'lucide-react';
import { ViolationEvent } from '../../types/exam';

interface ViolationAlertPanelProps {
  violations: ViolationEvent[];
  activeToast: ViolationEvent | null;
  onDismissToast: () => void;
  onInspectStudentById: (studentId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const ViolationAlertPanel: React.FC<ViolationAlertPanelProps> = ({
  violations,
  activeToast,
  onDismissToast,
  onInspectStudentById,
  isOpen,
  onToggleOpen,
}) => {
  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <>
      {/* Real-time Floating Toast Alert Banner */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 border-2 border-red-500 rounded-2xl p-4 shadow-2xl animate-bounce-short">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/20 text-red-400 rounded-xl shrink-0 mt-0.5 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30">
                    Aktivitas Mencurigakan
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {formatTime(activeToast.timestamp)}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mt-1">
                  {activeToast.studentName} ({activeToast.studentClass})
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
                  {activeToast.description}
                </p>
              </div>
            </div>

            <button
              onClick={onDismissToast}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                onInspectStudentById(activeToast.studentId);
                onDismissToast();
              }}
              className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              <span>Periksa Layar Sekarang</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button for Drawer */}
      <button
        onClick={onToggleOpen}
        className="fixed bottom-6 left-6 z-40 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold transition-all group"
      >
        <div className="relative">
          <Bell className="w-4 h-4 text-amber-400" />
          {violations.length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
          )}
        </div>
        <span>Log Aktivitas Mencurigakan</span>
        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-amber-400 border border-slate-700">
          {violations.length}
        </span>
      </button>

      {/* Slide-over Drawer for All Violation Logs */}
      {isOpen && (
        <div className="fixed inset-y-0 left-0 z-50 max-w-md w-full bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col animate-slide-right">
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-sm text-white">Log Aktivitas Real-Time</h3>
                <p className="text-[11px] text-slate-400">Total {violations.length} insiden tercatat</p>
              </div>
            </div>

            <button
              onClick={onToggleOpen}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List of Alerts */}
          <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
            {violations.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                <p>Belum ada aktivitas mencurigakan yang terdeteksi.</p>
              </div>
            ) : (
              violations.map((v) => (
                <div
                  key={v.id}
                  onClick={() => onInspectStudentById(v.studentId)}
                  className="p-3 bg-slate-950/80 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-all text-xs"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-bold text-indigo-300">
                      {v.studentName} ({v.studentClass})
                    </span>
                    <span className="text-[10px] font-mono">{formatTime(v.timestamp)}</span>
                  </div>
                  <p className="text-slate-200 font-medium">{v.description}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="capitalize">{v.type.replace('_', ' ')}</span>
                    <span className="text-indigo-400 hover:underline flex items-center gap-0.5">
                      Lihat Feed &rarr;
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};
