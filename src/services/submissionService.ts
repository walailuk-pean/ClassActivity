import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanFirestoreData } from '../firebase';
import { Assignment, Submission, SubmissionReceipt, SubmissionStatus, Student } from '../types';

/**
 * Generate unique receipt code: REC-YYYYMMDD-CODE-XXXX
 */
export function generateReceiptCode(assignmentCode: string): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `REC-${yyyy}${mm}${dd}-${assignmentCode}-${rand}`;
}

/**
 * Determine submission status based on server/current time vs deadline
 */
export function evaluateSubmissionStatus(
  closeAtIso: string,
  allowLate: boolean
): { allowed: boolean; status: SubmissionStatus; message?: string } {
  const now = new Date();
  const deadline = new Date(closeAtIso);

  if (now <= deadline) {
    return { allowed: true, status: 'on_time' };
  }

  // Submitted after deadline
  if (allowLate) {
    return {
      allowed: true,
      status: 'late',
      message: 'ส่งเกินกำหนดเวลา (ระบบบันทึกสถานะ: ส่งช้า)',
    };
  }

  return {
    allowed: false,
    status: 'missing',
    message: 'งานนี้ปิดรับแล้ว และไม่อนุญาตให้ส่งช้า',
  };
}

/**
 * Check if student has already submitted
 */
export async function checkExistingSubmission(
  assignmentId: string,
  studentCode: string
): Promise<Submission | null> {
  const path = `assignments/${assignmentId}/submissions/${studentCode}`;
  try {
    const snap = await getDoc(doc(db, 'assignments', assignmentId, 'submissions', studentCode));
    if (snap.exists()) {
      return snap.data() as Submission;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Submit student assignment (student does NOT need to log in)
 */
export async function submitAssignment(params: {
  assignment: Assignment;
  student: Partial<Student>;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  linkUrl?: string;
}): Promise<SubmissionReceipt> {
  const { assignment, student, fileUrl, fileName, fileSize, fileType, linkUrl } = params;

  if (!student.studentCode) {
    throw new Error('ไม่พบข้อมูลรหัสนักศึกษา');
  }

  // 1. Check deadline & late allowance
  const statusCheck = evaluateSubmissionStatus(assignment.closeAt, assignment.allowLate);
  if (!statusCheck.allowed) {
    throw new Error(statusCheck.message || 'งานนี้ปิดรับแล้ว');
  }

  // 2. Check if already submitted
  const existing = await checkExistingSubmission(assignment.id, student.studentCode);
  if (existing && assignment.allowResubmit === false) {
    throw new Error('คุณเคยส่งงานนี้แล้ว และงานนี้ไม่อนุญาตให้ส่งซ้ำ');
  }

  const path = `assignments/${assignment.id}/submissions/${student.studentCode}`;
  const nowIso = new Date().toISOString();
  const receiptCode = existing?.receiptCode || generateReceiptCode(assignment.code);

  const submissionData: Submission = {
    id: student.studentCode,
    assignmentId: assignment.id,
    studentCode: student.studentCode,
    studentName: student.name || 'นักศึกษา',
    studentNo: student.no || '-',
    sec: student.sec || 'Sec 1',
    receiptCode,
    fileUrl: fileUrl || existing?.fileUrl || '',
    fileName: fileName || existing?.fileName || '',
    fileSize: fileSize !== undefined ? fileSize : (existing?.fileSize ?? null as any),
    fileType: fileType || existing?.fileType || '',
    linkUrl: linkUrl || existing?.linkUrl || '',
    submittedAt: nowIso,
    status: statusCheck.status,
    // Preserve any existing instructor grade/feedback if student resubmits
    score: existing?.score !== undefined ? existing.score : null,
    feedback: existing?.feedback || '',
    instructorNotes: existing?.instructorNotes || '',
    updatedAt: nowIso,
  };

  try {
    const cleanedPayload = cleanFirestoreData(submissionData);
    await setDoc(doc(db, 'assignments', assignment.id, 'submissions', student.studentCode), cleanedPayload);

    return {
      receiptCode,
      assignmentCode: assignment.code,
      assignmentTitle: assignment.title,
      courseCode: assignment.courseCode,
      courseName: assignment.courseName,
      studentCode: student.studentCode,
      studentName: student.name || 'นักศึกษา',
      studentNo: student.no || '-',
      sec: student.sec || 'Sec 1',
      submittedAt: nowIso,
      status: statusCheck.status,
      fileName,
      fileUrl,
      linkUrl,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Subscribe to real-time submissions of an assignment (for instructor)
 */
export function subscribeToSubmissions(
  assignmentId: string,
  onData: (submissions: Submission[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = `assignments/${assignmentId}/submissions`;
  const subCollection = collection(db, 'assignments', assignmentId, 'submissions');

  return onSnapshot(
    subCollection,
    snapshot => {
      const submissions: Submission[] = [];
      snapshot.forEach(d => {
        submissions.push(d.data() as Submission);
      });
      // Sort by submittedAt descending
      submissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      onData(submissions);
    },
    error => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
}

/**
 * Manual Override by Instructor: update status, score, or feedback
 */
export async function overrideSubmission(
  assignmentId: string,
  studentCode: string,
  updates: {
    status?: SubmissionStatus;
    score?: number | null;
    feedback?: string;
    instructorNotes?: string;
    studentName?: string;
    studentNo?: string;
    sec?: string;
  }
): Promise<void> {
  const path = `assignments/${assignmentId}/submissions/${studentCode}`;
  try {
    const payload = cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    const subDocRef = doc(db, 'assignments', assignmentId, 'submissions', studentCode);
    const snap = await getDoc(subDocRef);
    if (snap.exists()) {
      await updateDoc(subDocRef, payload);
    } else {
      await setDoc(subDocRef, {
        id: studentCode,
        assignmentId,
        studentCode,
        studentName: updates.studentName || studentCode,
        studentNo: updates.studentNo || '',
        sec: updates.sec || '',
        receiptCode: `OVERRIDE-${Date.now().toString(36).toUpperCase()}`,
        submittedAt: new Date().toISOString(),
        ...payload,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Export complete submissions report to CSV (UTF-8 with BOM for Excel and Google Sheets)
 * Cross-references all enrolled students to show who submitted, who is late, and who hasn't submitted yet
 */
export function exportSubmissionsToCsv(
  assignment: Assignment,
  roster: Student[],
  submissions: Submission[]
): string {
  const BOM = '\uFEFF';
  const headers = [
    'เลขที่',
    'รหัสนักศึกษา',
    'ชื่อ-นามสกุล',
    'กลุ่มเรียน (Sec)',
    'สถานะการส่งงาน',
    'วัน-เวลาที่ส่ง',
    'รหัสอ้างอิงสถานะการส่ง (Reference Code)',
    'ชื่อไฟล์ / ลิงก์',
    'คะแนน',
    'ข้อเสนอแนะอาจารย์',
    'หมายเหตุอาจารย์',
  ];

  const subMap = new Map<string, Submission>();
  submissions.forEach(s => subMap.set(s.studentCode, s));

  const statusLabel = (st: SubmissionStatus | 'not_submitted'): string => {
    switch (st) {
      case 'on_time': return 'ส่งตรงเวลา';
      case 'late': return 'ส่งช้า';
      case 'sick': return 'ลาป่วย';
      case 'excused': return 'ลากิจ';
      case 'missing': return 'ไม่ส่งงาน';
      default: return 'ยังไม่ส่ง';
    }
  };

  const rows: string[] = [];
  rows.push(headers.join(','));

  // If roster is available, list all students in order
  if (roster.length > 0) {
    roster.forEach(st => {
      const sub = subMap.get(st.studentCode);
      const row = [
        `"${st.no}"`,
        `"${st.studentCode}"`,
        `"${st.name}"`,
        `"${st.sec}"`,
        `"${sub ? statusLabel(sub.status) : statusLabel('not_submitted')}"`,
        `"${sub ? new Date(sub.submittedAt).toLocaleString('th-TH') : '-'}"`,
        `"${sub?.receiptCode || '-'}"`,
        `"${sub?.fileName || sub?.linkUrl || '-'}"`,
        `"${sub?.score !== undefined && sub?.score !== null ? sub.score : '-'}"`,
        `"${(sub?.feedback || '').replace(/"/g, '""')}"`,
        `"${(sub?.instructorNotes || '').replace(/"/g, '""')}"`,
      ];
      rows.push(row.join(','));
    });
  } else {
    // If no roster loaded, export recorded submissions
    submissions.forEach(sub => {
      const row = [
        `"${sub.studentNo}"`,
        `"${sub.studentCode}"`,
        `"${sub.studentName}"`,
        `"${sub.sec}"`,
        `"${statusLabel(sub.status)}"`,
        `"${new Date(sub.submittedAt).toLocaleString('th-TH')}"`,
        `"${sub.receiptCode}"`,
        `"${sub.fileName || sub.linkUrl || '-'}"`,
        `"${sub.score !== undefined && sub.score !== null ? sub.score : '-'}"`,
        `"${(sub.feedback || '').replace(/"/g, '""')}"`,
        `"${(sub.instructorNotes || '').replace(/"/g, '""')}"`,
      ];
      rows.push(row.join(','));
    });
  }

  return BOM + rows.join('\r\n');
}
