export type ViolationType = 
  | 'tab_switch' 
  | 'fullscreen_exit' 
  | 'screen_stopped' 
  | 'camera_lost' 
  | 'copy_paste' 
  | 'inspect_attempt' 
  | 'other';

export interface ViolationEvent {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  type: ViolationType;
  description: string;
  timestamp: number;
  snapshotUrl?: string;
}

export type StudentStatus = 'active' | 'warning' | 'locked' | 'submitted' | 'offline';

export interface StudentSession {
  id: string;
  name: string;
  studentClass: string;
  subject: string;
  status: StudentStatus;
  joinedAt: number;
  lastHeartbeat: number;
  violationsCount: number;
  violations: ViolationEvent[];
  cameraFrame?: string;
  screenFrame?: string;
  screenSharingActive: boolean;
  cameraActive: boolean;
  fullscreenActive: boolean;
  notes?: string;
}

export interface ExamConfig {
  title: string;
  subject: string;
  schoolName: string;
  formUrl: string;
  durationMinutes: number;
  maxViolationsAllowed: number;
  allowScreenStopToleranceSec: number;
  isExamStarted: boolean;
}

export const CLASS_OPTIONS = [
  'VII-A', 'VII-B', 'VII-C', 'VII-D', 'VII-E',
  'VIII-A', 'VIII-B', 'VIII-C', 'VIII-D', 'VIII-E',
  'IX-A', 'IX-B', 'IX-C', 'IX-D', 'IX-E',
  'Lainnya (Ketik Manual)'
];

export const SUBJECT_OPTIONS = [
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam (IPA)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Bahasa Inggris',
  'Pendidikan Pancasila & Kewarganegaraan (PPKn)',
  'Pendidikan Agama & Budi Pekerti',
  'Informatika',
  'Seni Budaya & Prakarya'
];
