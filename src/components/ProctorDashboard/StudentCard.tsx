import React, { useState } from 'react';
import { 
  Camera, 
  Monitor, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Eye, 
  User, 
  Layers,
  Radio,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { StudentSession } from '../../types/exam';

interface StudentCardProps {
  student: StudentSession;
  onInspect: (student: StudentSession) => void;
  onQuickLock: (studentId: string, willLock: boolean) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onInspect,
  onQuickLock,
}) => {
  const [viewMode, setViewMode] = useState<'camera' | 'screen' | 'split'>('camera');

  const getStatusBadge = () => {
    switch (student.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Normal
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Mencurigakan ({student.violationsCount})
          </span>
        );
      case 'locked':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 rounded-full">
            <Lock className="w-3 h-3" />
            Layar Terkunci
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
            Selesai Ujian
          </span>
        );
      case 'offline':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-800/80 border border-slate-700 px-2.5 py-0.5 rounded-full">
            Terputus
          </span>
        );
    }
  };

  const isWarningOrLocked = student.status === 'warning' || student.status === 'locked';

  return (
    <div className={`bg-slate-900 border rounded-2xl overflow-hidden shadow-lg transition-all duration-200 hover:shadow-indigo-500/5 ${
      student.status === 'locked'
        ? 'border-red-600/70 bg-red-950/10'
        : student.status === 'warning'
        ? 'border-amber-500/60 bg-amber-950/10'
        : 'border-slate-800 hover:border-slate-700'
    }`}>
      {/* Top Header of Card */}
      <div className="p-3.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-white truncate">{student.name}</h4>
          </div>
          <div className="flex flex-col gap-0.5 mt-0.5 text-xs text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-indigo-300 truncate max-w-[240px]" title={student.studentClass}>
              {student.studentClass}
            </span>
            <span className="text-[10px] text-slate-500 truncate">{student.subject}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div>{getStatusBadge()}</div>
      </div>

      {/* Video / Screen Stream Viewport */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
        {/* Toggle Mode Controls Overlay (top-right) */}
        <div className="absolute top-2 right-2 z-10 flex items-center bg-slate-900/85 backdrop-blur-md rounded-lg p-0.5 border border-slate-700/60">
          <button
            onClick={() => setViewMode('camera')}
            className={`p-1 rounded text-xs transition-colors ${
              viewMode === 'camera' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Tampilkan Kamera Saja"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('screen')}
            className={`p-1 rounded text-xs transition-colors ${
              viewMode === 'screen' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Tampilkan Layar Siswa Saja"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`p-1 rounded text-xs transition-colors ${
              viewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Tampilkan Keduanya Berdampingan"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stream Rendering Logic */}
        {viewMode === 'camera' && (
          <div className="w-full h-full relative flex items-center justify-center">
            {student.cameraFrame ? (
              <img
                src={student.cameraFrame}
                alt={`Kamera ${student.name}`}
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="text-center p-3 text-slate-500">
                <Camera className="w-7 h-7 mx-auto mb-1 text-slate-600 animate-pulse" />
                <span className="text-[11px]">Menunggu feed kamera...</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] text-slate-300 font-mono flex items-center gap-1">
              <Camera className="w-2.5 h-2.5 text-indigo-400" />
              <span>KAMERA SISWA</span>
            </div>
          </div>
        )}

        {viewMode === 'screen' && (
          <div className="w-full h-full relative flex items-center justify-center">
            {student.screenFrame ? (
              <img
                src={student.screenFrame}
                alt={`Layar ${student.name}`}
                className="w-full h-full object-contain bg-slate-950"
              />
            ) : (
              <div className="text-center p-3 text-slate-500">
                <Monitor className="w-7 h-7 mx-auto mb-1 text-slate-600" />
                <span className="text-[11px]">Menunggu stream layar...</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] text-slate-300 font-mono flex items-center gap-1">
              <Monitor className="w-2.5 h-2.5 text-cyan-400" />
              <span>LAYAR DESKTOP</span>
            </div>
          </div>
        )}

        {viewMode === 'split' && (
          <div className="w-full h-full grid grid-cols-2 divide-x divide-slate-800">
            {/* Left: Camera */}
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
              {student.cameraFrame ? (
                <img
                  src={student.cameraFrame}
                  alt="Kamera"
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <Camera className="w-5 h-5 text-slate-700" />
              )}
              <span className="absolute bottom-1 left-1 text-[8px] bg-black/70 px-1 rounded text-slate-300">
                Kamera
              </span>
            </div>
            {/* Right: Screen */}
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
              {student.screenFrame ? (
                <img
                  src={student.screenFrame}
                  alt="Layar"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Monitor className="w-5 h-5 text-slate-700" />
              )}
              <span className="absolute bottom-1 left-1 text-[8px] bg-black/70 px-1 rounded text-slate-300">
                Layar
              </span>
            </div>
          </div>
        )}

        {/* Hover Inspect Overlay */}
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
          <button
            onClick={() => onInspect(student)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Inspeksi HD</span>
          </button>
        </div>
      </div>

      {/* Card Footer: Violations & Quick Actions */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-xs">
        {/* Infraction meter */}
        <div className="flex items-center gap-1.5">
          {student.violationsCount > 0 ? (
            <div className="flex items-center gap-1 text-red-400 font-bold bg-red-950/40 px-2 py-0.5 rounded border border-red-500/30">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{student.violationsCount} Pelanggaran</span>
            </div>
          ) : (
            <span className="text-slate-400 text-[11px]">Belum ada pelanggaran</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {student.status === 'locked' ? (
            <button
              onClick={() => onQuickLock(student.id, false)}
              className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg transition-colors"
              title="Buka Kunci Layar Siswa"
            >
              <Unlock className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onQuickLock(student.id, true)}
              className="p-1.5 bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-950/30 border border-slate-700 rounded-lg transition-colors"
              title="Kunci Layar Siswa Sekarang"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => onInspect(student)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <span>Detail</span>
          </button>
        </div>
      </div>
    </div>
  );
};
