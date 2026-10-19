export type SubmissionStatus = 'on_time' | 'late' | 'missing' | 'sick' | 'excused';

export interface Student {
  id?: string;
  no: string;          // เลขที่
  studentCode: string; // รหัสนักศึกษา เช่น 1650701234
  name: string;        // ชื่อ-นามสกุล
  sec: string;         // กลุ่มเรียน / Section
  email?: string;      // อีเมลสถาบัน (optional)
  courseId: string;
  instructorId: string;
}

export interface Course {
  id: string;
  code: string;        // รหัสวิชา เช่น CS101, IT202
  name: string;        // ชื่อวิชา
  sections: string[];  // รายการกลุ่มเรียน เช่น ["Sec 1", "Sec 2"]
  academicYear?: string;
  semester?: string;
  instructorId: string;
  instructorEmail: string;
  createdAt: string;
  studentCount?: number;
}

export interface Assignment {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  title: string;
  description: string;
  code: string;        // รหัสงาน 6 หลัก เช่น "834921"
  sections: string[];  // กลุ่มเรียนที่เปิดรับ เช่น ["Sec 1", "Sec 2"] หรือ ["ทั้งหมด"]
  academicYear?: string; // เช่น 2569
  semester?: string;     // เช่น 1, 2, summer
  allowedTypes: ('pdf' | 'doc' | 'image' | 'link')[];
  maxFileSizeMB: number;
  openAt: string;      // ISO String วันเวลาเปิดรับ
  closeAt: string;     // ISO String วันเวลาปิดรับ
  allowLate: boolean;  // อนุญาตให้ส่งช้าหรือไม่
  allowResubmit: boolean; // อนุญาตให้ส่งซ้ำก่อนปิดรับหรือไม่
  worksheetUrl?: string;  // ลิงก์ใบงานที่เก็บใน Google Drive
  worksheetName?: string; // ชื่อไฟล์ใบงาน
  status: 'open' | 'closed' | 'scheduled';
  instructorId: string;
  instructorEmail: string;
  gasWebAppUrl?: string;  // Google Apps Script Web App URL
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentCode: string;
  studentName: string;
  studentNo: string;
  sec: string;
  receiptCode: string;   // รหัสใบเสร็จ เช่น REC-20261016-834921-9876
  fileUrl?: string;      // URL ไฟล์ใน Google Drive หรือ download link
  fileName?: string;
  fileSize?: number;     // ขนาดไฟล์เป็น byte
  fileType?: string;
  linkUrl?: string;      // URL งานที่เป็นลิงก์ภายนอก เช่น Canva, Figma, Github
  submittedAt: string;   // ISO String เวลาที่ส่ง
  status: SubmissionStatus;
  score?: number | null;
  feedback?: string;
  instructorNotes?: string;
  updatedAt?: string;
}

export interface InstructorProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  gasWebAppUrl?: string;
  allowedDomains?: string[];
  createdAt: string;
}

export interface SubmissionReceipt {
  receiptCode: string;
  assignmentCode: string;
  assignmentTitle: string;
  courseCode: string;
  courseName: string;
  studentCode: string;
  studentName: string;
  studentNo: string;
  sec: string;
  submittedAt: string;
  status: SubmissionStatus;
  fileName?: string;
  fileUrl?: string;
  linkUrl?: string;
}
