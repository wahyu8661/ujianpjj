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
  rombelFormUrls?: Record<string, string>;
  durationMinutes: number;
  maxViolationsAllowed: number;
  allowScreenStopToleranceSec: number;
  isExamStarted: boolean;
}

export const ROMBEL_LIST = [
  'Rombel VII-Abu Bakar As Shiddiq (VII Ikhwan)',
  'Rombel VII-Fatimah binti Muhammad (VII Akhwat)',
  'Rombel VIII - Maryam binti Imron (VIII Akhwat A)',
  'Rombel VIII-Ruqayyah binti Muhammad (VIII Akhwat B)',
  'Rombel VIII - Umar bin Khattab (VIII Ikhwan)',
  'Rombel IX-Utsman bin Affan (IX Ikhwan)',
  'Rombel IX-Khadijah binti Khuwailid (IX Akhwat)',
  'Rombel X-Aisyah binti Abu Bakar (X Akhwat)',
  'Rombel X-Ali bin Abi Thalib (X Ikhwan)',
  'Rombel XI-Sumayyah binti Khubbath (XI Akhwat)',
  'Rombel XI-Thalhah bin Ubaidillah (XI Ikhwan)',
  'Rombel XII-Sa\'ad bin Abi Waqqash (XII Ikhwan)',
  'Rombel XII-Hafshah binti Umar (XII Akhwat)',
];

export const CLASS_OPTIONS = [
  ...ROMBEL_LIST,
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
