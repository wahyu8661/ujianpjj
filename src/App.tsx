import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StudentLogin } from './components/StudentExam/StudentLogin';
import { DeviceCheckModal } from './components/StudentExam/DeviceCheckModal';
import { ExamWorkspace } from './components/StudentExam/ExamWorkspace';
import { SubmissionSuccess } from './components/StudentExam/SubmissionSuccess';
import { ProctorDashboard } from './components/ProctorDashboard/ProctorDashboard';
import { ProctorLogin, ProctorUser } from './components/ProctorDashboard/ProctorLogin';
import { ExamConfig } from './types/exam';
import { socketClient } from './utils/socket';
import { sounds } from './utils/audio';
import { Lock, Shield } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'student' | 'proctor'>('student');
  const [studentStep, setStudentStep] = useState<'login' | 'device_check' | 'exam' | 'submitted'>('login');
  
  // Proctor authentication state
  const [proctorUser, setProctorUser] = useState<ProctorUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('siap_proctor_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showProctorLoginModal, setShowProctorLoginModal] = useState(false);

  const [studentData, setStudentData] = useState<{
    id: string;
    name: string;
    studentClass: string;
    subject: string;
  } | null>(null);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const [config, setConfig] = useState<ExamConfig>({
    title: 'Ujian Penilaian Semester Daring (PJJ Kabut Asap)',
    subject: 'Bahasa Indonesia & Literasi',
    schoolName: 'SMP Negeri Terpadu Indonesia',
    formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScP_d300s4H-sample/viewform?embedded=true',
    durationMinutes: 90,
    maxViolationsAllowed: 3,
    allowScreenStopToleranceSec: 10,
    isExamStarted: true,
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  // URL Hash detection for proctor access (Only accessible via #pengawas or #/pengawas)
  useEffect(() => {
    const handleUrlRoute = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#pengawas' || hash === '#/pengawas') {
        if (proctorUser) {
          setCurrentView('proctor');
        } else {
          setShowProctorLoginModal(true);
        }
      } else if (currentView === 'proctor' && !proctorUser) {
        setCurrentView('student');
      }
    };

    handleUrlRoute();
    window.addEventListener('hashchange', handleUrlRoute);
    return () => window.removeEventListener('hashchange', handleUrlRoute);
  }, [proctorUser, currentView]);

  // Fetch initial config from server
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.title) {
          setConfig(data);
        }
      })
      .catch(() => {});

    const unsubscribe = socketClient.subscribe((msg: any) => {
      if (msg.type === 'config:updated' && msg.config) {
        setConfig(msg.config);
      }
    });

    const statusCheck = setInterval(() => {
      setIsConnected(socketClient.isSocketOpen());
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(statusCheck);
    };
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setEnabled(next);
  };

  const handleLoginSubmit = (data: {
    name: string;
    studentClass: string;
    subject: string;
  }) => {
    const studentId = 'std_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const studentInfo = {
      id: studentId,
      ...data,
    };
    setStudentData(studentInfo);

    // Register immediately with backend server via REST
    fetch('/api/students/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentInfo),
    }).catch(() => {});

    // Also connect and register via WebSocket
    socketClient.connect('student', studentInfo);
    setStudentStep('device_check');
  };

  const handleDeviceReady = (camStream: MediaStream, scrStream: MediaStream) => {
    setCameraStream(camStream);
    setScreenStream(scrStream);
    setStudentStep('exam');
  };

  const handleFinishExam = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
    }
    sounds.playSuccess();
    setStudentStep('submitted');
  };

  const handleRestartStudent = () => {
    setStudentData(null);
    setCameraStream(null);
    setScreenStream(null);
    setStudentStep('login');
  };

  const handleUpdateConfig = (newConfig: Partial<ExamConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});

    socketClient.send({
      type: 'proctor:update_config',
      config: updated,
    });
  };

  const handleProctorLoginSuccess = (user: ProctorUser) => {
    setProctorUser(user);
    try {
      sessionStorage.setItem('siap_proctor_user', JSON.stringify(user));
    } catch {}
    setShowProctorLoginModal(false);
    setCurrentView('proctor');
    sounds.playSuccess();
    window.location.hash = '#/pengawas';
  };

  const handleProctorLogout = () => {
    setProctorUser(null);
    try {
      sessionStorage.removeItem('siap_proctor_user');
    } catch {}
    setCurrentView('student');
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Bar */}
      <Navbar
        currentView={currentView}
        onViewChange={(view) => {
          if (view === 'proctor' && !proctorUser) {
            setShowProctorLoginModal(true);
          } else {
            setCurrentView(view);
          }
        }}
        proctorUser={proctorUser}
        onProctorLogout={handleProctorLogout}
        isConnected={isConnected}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenProctorLogin={() => setShowProctorLoginModal(true)}
      />

      {/* Main Content View */}
      <main className="flex-1 flex flex-col">
        {/* Proctor View (Restricted by authentication) */}
        {currentView === 'proctor' ? (
          proctorUser ? (
            <ProctorDashboard
              config={config}
              onUpdateConfig={handleUpdateConfig}
              soundEnabled={soundEnabled}
            />
          ) : (
            <ProctorLogin
              onLoginSuccess={handleProctorLoginSuccess}
              onBackToStudent={() => {
                setCurrentView('student');
                window.location.hash = '';
              }}
            />
          )
        ) : (
          /* Student View */
          <div className="flex-1 flex flex-col">
            {studentStep === 'login' && (
              <StudentLogin config={config} onSubmit={handleLoginSubmit} />
            )}

            {studentStep === 'device_check' && studentData && (
              <DeviceCheckModal
                studentName={studentData.name}
                studentClass={studentData.studentClass}
                onReady={handleDeviceReady}
                onBack={() => setStudentStep('login')}
              />
            )}

            {studentStep === 'exam' && studentData && cameraStream && screenStream && (
              <ExamWorkspace
                student={studentData}
                config={config}
                cameraStream={cameraStream}
                screenStream={screenStream}
                onFinishExam={handleFinishExam}
              />
            )}

            {studentStep === 'submitted' && studentData && (
              <SubmissionSuccess
                student={studentData}
                onRestart={handleRestartStudent}
              />
            )}
          </div>
        )}
      </main>

      {/* Proctor Login Modal (Opened via URL /#/pengawas, logo triple click, or discreet footer link) */}
      {showProctorLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <ProctorLogin
            onLoginSuccess={handleProctorLoginSuccess}
            onBackToStudent={() => setShowProctorLoginModal(false)}
          />
        </div>
      )}

      {/* Clean Footer (No public proctor links) */}
      {studentStep === 'login' && currentView === 'student' && (
        <footer className="py-4 text-center border-t border-slate-900 text-xs text-slate-600">
          <p>&copy; {config.schoolName} &bull; Portal Ujian Daring Terpadu</p>
        </footer>
      )}
    </div>
  );
}
