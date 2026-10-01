import React from 'react';
import { X, Printer, Download, CheckCircle, ShieldAlert, FileText } from 'lucide-react';
import { ExamConfig, StudentSession } from '../../types/exam';

interface PrintReportModalProps {
  config: ExamConfig;
  students: StudentSession[];
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  config,
  students,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-base text-white">
              Berita Acara & Rekapitulasi Integritas Ujian Daring
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Preview */}
        <div className="p-8 overflow-y-auto bg-white text-slate-900 font-sans print:p-0 flex-1">
          {/* Header Kop Surat */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <h2 className="text-lg font-black uppercase tracking-wider">{config.schoolName}</h2>
            <h3 className="text-base font-bold text-slate-800">
              BERITA ACARA & REKAP PENGAWASAN UJIAN SEMESTER DARING
            </h3>
            <p className="text-xs text-slate-600 italic mt-0.5">
              Pelaksanaan Pembelajaran Jarak Jauh (PJJ) Darurat Kualitas Udara / Kabut Asap
            </p>
          </div>

          {/* Exam Metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="font-semibold text-slate-600">Mata Pelajaran:</span>{' '}
              <strong className="text-slate-900">{config.subject}</strong>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Hari, Tanggal:</span>{' '}
              <span className="text-slate-900">{currentDate}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Media Soal:</span>{' '}
              <span className="text-slate-900">Google Form Terpadu</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Metode Pengawasan:</span>{' '}
              <span className="text-slate-900">Kamera Webcam & Screen Capture Real-Time</span>
            </div>
          </div>

          {/* Table of Students & Violations */}
          <table className="w-full text-xs text-left border-collapse border border-slate-300 mb-6">
            <thead>
              <tr className="bg-slate-100 text-slate-800">
                <th className="border border-slate-300 px-2.5 py-2 font-bold w-10 text-center">No</th>
                <th className="border border-slate-300 px-3 py-2 font-bold">Nama Peserta</th>
                <th className="border border-slate-300 px-2.5 py-2 font-bold text-center">Kelas</th>
                <th className="border border-slate-300 px-2.5 py-2 font-bold text-center">Pelanggaran</th>
                <th className="border border-slate-300 px-3 py-2 font-bold">Catatan Integritas</th>
                <th className="border border-slate-300 px-2.5 py-2 font-bold text-center">Status Akhir</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="border border-slate-300 px-2 py-1.5 text-center">{idx + 1}</td>
                  <td className="border border-slate-300 px-3 py-1.5 font-medium">{s.name}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center">{s.studentClass}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                    <span className={s.violationsCount > 0 ? 'text-red-600' : 'text-slate-600'}>
                      {s.violationsCount}x
                    </span>
                  </td>
                  <td className="border border-slate-300 px-3 py-1.5 text-[11px] text-slate-600">
                    {s.violations.length > 0
                      ? s.violations.map((v) => v.description).slice(-2).join('; ')
                      : 'Tertib & mematuhi kunci layar'}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center uppercase font-bold text-[10px]">
                    <span className={
                      s.status === 'locked' ? 'text-red-700' : s.status === 'warning' ? 'text-amber-700' : 'text-emerald-700'
                    }>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="flex justify-between items-end mt-12 text-xs text-slate-800">
            <div className="text-center">
              <p>Mengetahui,</p>
              <p className="font-bold">Kepala Sekolah</p>
              <div className="h-16" />
              <p className="font-bold underline">( ............................................ )</p>
              <p className="text-slate-500">NIP. ....................................</p>
            </div>

            <div className="text-center">
              <p>{config.schoolName}, {currentDate}</p>
              <p className="font-bold">Pengawas Ujian Daring</p>
              <div className="h-16" />
              <p className="font-bold underline">( ............................................ )</p>
              <p className="text-slate-500">NIP. ....................................</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
