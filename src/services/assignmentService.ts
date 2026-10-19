import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanFirestoreData } from '../firebase';
import { Assignment, Student } from '../types';
import { getCourseStudents } from './courseService';

/**
 * Generate a random 6-digit assignment code (e.g. 583921)
 */
export function generateAssignmentCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create or save an assignment
 */
export async function saveAssignment(
  assignmentData: Omit<Assignment, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  studentRoster?: Student[]
): Promise<Assignment> {
  const assignmentId = assignmentData.id || `assign_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const code = assignmentData.code || generateAssignmentCode();
  const path = `assignments/${assignmentId}`;

  try {
    const fullAssignment: Assignment = {
      ...assignmentData,
      id: assignmentId,
      code,
      gasWebAppUrl: assignmentData.gasWebAppUrl || undefined,
      worksheetUrl: assignmentData.worksheetUrl || undefined,
      worksheetName: assignmentData.worksheetName || undefined,
      createdAt: assignmentData.createdAt || new Date().toISOString(),
    };

    // 1. Save main assignment doc with cleaned data (no undefined fields)
    const assignmentDocPayload = cleanFirestoreData({
      ...fullAssignment,
      gasWebAppUrl: fullAssignment.gasWebAppUrl || null,
      worksheetUrl: fullAssignment.worksheetUrl || null,
      worksheetName: fullAssignment.worksheetName || null,
      description: fullAssignment.description || '',
    });
    await setDoc(doc(db, 'assignments', assignmentId), assignmentDocPayload);

    // 2. Save 6-digit public code lookup mapping
    const codeDocPayload = cleanFirestoreData({
      code,
      assignmentId,
      courseId: fullAssignment.courseId,
      courseCode: fullAssignment.courseCode,
      courseName: fullAssignment.courseName,
      title: fullAssignment.title,
      description: fullAssignment.description || '',
      openAt: fullAssignment.openAt,
      closeAt: fullAssignment.closeAt,
      allowLate: fullAssignment.allowLate,
      allowResubmit: fullAssignment.allowResubmit,
      status: fullAssignment.status,
      instructorId: fullAssignment.instructorId,
      worksheetUrl: fullAssignment.worksheetUrl || null,
      worksheetName: fullAssignment.worksheetName || null,
      academicYear: fullAssignment.academicYear || null,
      semester: fullAssignment.semester || null,
      allowedTypes: fullAssignment.allowedTypes,
      maxFileSizeMB: fullAssignment.maxFileSizeMB,
      gasWebAppUrl: fullAssignment.gasWebAppUrl || null,
    });
    await setDoc(doc(db, 'assignment_codes', code), codeDocPayload);

    // 3. Sync student roster for this assignment so students can query their own studentCode securely
    let rosterToSync = studentRoster;
    if (!rosterToSync || rosterToSync.length === 0) {
      rosterToSync = await getCourseStudents(fullAssignment.courseId);
    }

    if (rosterToSync && rosterToSync.length > 0) {
      // Filter by selected sections if assignment is section-specific
      const filteredRoster = (fullAssignment.sections.length === 0 || fullAssignment.sections.includes('ทั้งหมด'))
        ? rosterToSync
        : rosterToSync.filter(s => fullAssignment.sections.includes(s.sec));

      // Batch write into /assignments/{assignmentId}/roster/{studentCode}
      for (let i = 0; i < filteredRoster.length; i += 400) {
        const chunk = filteredRoster.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(s => {
          const rosterRef = doc(db, 'assignments', assignmentId, 'roster', s.studentCode);
          batch.set(rosterRef, {
            no: s.no,
            studentCode: s.studentCode,
            name: s.name,
            sec: s.sec,
            email: s.email || '',
          });
        });
        await batch.commit();
      }
    }

    return fullAssignment;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Fetch all assignments belonging to instructor
 */
export async function getInstructorAssignments(instructorId: string): Promise<Assignment[]> {
  const path = 'assignments';
  try {
    const q = query(collection(db, path), where('instructorId', '==', instructorId));
    const snapshot = await getDocs(q);
    const assignments: Assignment[] = [];
    snapshot.forEach(d => {
      assignments.push(d.data() as Assignment);
    });
    return assignments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Look up assignment details by 6-digit code
 */
export async function getAssignmentByCode(code: string): Promise<{ assignment: Assignment | null; error?: string }> {
  const cleanCode = code.trim().toUpperCase();
  const path = `assignment_codes/${cleanCode}`;
  try {
    const codeSnap = await getDoc(doc(db, 'assignment_codes', cleanCode));
    if (!codeSnap.exists()) {
      return { assignment: null, error: 'ไม่พบรหัสงานนี้ในระบบ กรุณาตรวจสอบรหัส 6 หลักอีกครั้ง' };
    }

    const codeData = codeSnap.data();
    const assignmentId = codeData.assignmentId;

    // Fetch full assignment doc
    const assignSnap = await getDoc(doc(db, 'assignments', assignmentId));
    if (!assignSnap.exists()) {
      return { assignment: null, error: 'ข้อมูลงานนี้ถูกลบหรือไม่พร้อมใช้งาน' };
    }

    const assignment = assignSnap.data() as Assignment;
    return { assignment };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return { assignment: null, error: 'เกิดข้อผิดพลาดในการค้นหารหัสงาน' };
  }
}

/**
 * Verify student ID against assignment roster without exposing the entire student list
 */
export async function verifyStudentForAssignment(
  assignmentId: string,
  studentCode: string
): Promise<{ success: boolean; student?: Partial<Student>; message?: string }> {
  const cleanCode = studentCode.trim();
  if (!cleanCode) {
    return { success: false, message: 'กรุณากรอกรหัสนักศึกษา' };
  }

  const path = `assignments/${assignmentId}/roster/${cleanCode}`;
  try {
    const rosterSnap = await getDoc(doc(db, 'assignments', assignmentId, 'roster', cleanCode));
    if (!rosterSnap.exists()) {
      return {
        success: false,
        message: `ไม่พบรหัสนักศึกษา "${cleanCode}" ในรายชื่อวิชานี้ กรุณาตรวจสอบรหัสหรือติดต่ออาจารย์ผู้สอน`,
      };
    }

    const data = rosterSnap.data();
    return {
      success: true,
      student: {
        no: data.no || '-',
        studentCode: data.studentCode,
        name: data.name,
        sec: data.sec,
        email: data.email,
      },
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return {
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสนักศึกษา',
    };
  }
}

/**
 * Update assignment status (open, closed) or extend closeAt date
 */
export async function updateAssignmentStatus(
  assignmentId: string,
  code: string,
  status: 'open' | 'closed' | 'scheduled',
  newCloseAt?: string
): Promise<void> {
  const path = `assignments/${assignmentId}`;
  try {
    const updates: Record<string, any> = { status };
    if (newCloseAt) {
      updates.closeAt = newCloseAt;
    }
    await updateDoc(doc(db, 'assignments', assignmentId), updates);

    // Also sync the assignment_codes lookup
    const codeUpdates: Record<string, any> = { status };
    if (newCloseAt) {
      codeUpdates.closeAt = newCloseAt;
    }
    await updateDoc(doc(db, 'assignment_codes', code), codeUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Delete assignment and its code lookup
 */
export async function deleteAssignment(assignmentId: string, code: string): Promise<void> {
  const path = `assignments/${assignmentId}`;
  try {
    await deleteDoc(doc(db, 'assignments', assignmentId));
    if (code) {
      await deleteDoc(doc(db, 'assignment_codes', code.trim().toUpperCase()));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Update an existing assignment and its code lookup mapping
 */
export async function updateAssignment(
  assignmentId: string,
  updates: Partial<Assignment> & { oldCode?: string },
  studentRoster?: Student[]
): Promise<Assignment> {
  const path = `assignments/${assignmentId}`;
  try {
    const assignDocRef = doc(db, 'assignments', assignmentId);
    const snap = await getDoc(assignDocRef);
    if (!snap.exists()) {
      throw new Error('ไม่พบข้อมูลงานที่ต้องการแก้ไข');
    }

    const currentData = snap.data() as Assignment;
    const oldCode = (updates.oldCode || currentData.code || '').trim().toUpperCase();
    const newCode = updates.code ? updates.code.trim().toUpperCase() : oldCode;

    const fullUpdatedAssignment: Assignment = {
      ...currentData,
      ...updates,
      id: assignmentId,
      code: newCode,
    };

    const cleanedPayload = cleanFirestoreData({
      ...fullUpdatedAssignment,
      gasWebAppUrl: fullUpdatedAssignment.gasWebAppUrl || null,
      worksheetUrl: fullUpdatedAssignment.worksheetUrl || null,
      worksheetName: fullUpdatedAssignment.worksheetName || null,
      description: fullUpdatedAssignment.description || '',
    });

    await setDoc(assignDocRef, cleanedPayload, { merge: true });

    // Handle code lookup doc
    const codePayload = cleanFirestoreData({
      code: newCode,
      assignmentId,
      courseId: fullUpdatedAssignment.courseId,
      courseCode: fullUpdatedAssignment.courseCode,
      courseName: fullUpdatedAssignment.courseName,
      title: fullUpdatedAssignment.title,
      description: fullUpdatedAssignment.description || '',
      openAt: fullUpdatedAssignment.openAt,
      closeAt: fullUpdatedAssignment.closeAt,
      allowLate: fullUpdatedAssignment.allowLate,
      allowResubmit: fullUpdatedAssignment.allowResubmit,
      status: fullUpdatedAssignment.status,
      instructorId: fullUpdatedAssignment.instructorId,
      worksheetUrl: fullUpdatedAssignment.worksheetUrl || null,
      worksheetName: fullUpdatedAssignment.worksheetName || null,
      academicYear: fullUpdatedAssignment.academicYear || null,
      semester: fullUpdatedAssignment.semester || null,
      allowedTypes: fullUpdatedAssignment.allowedTypes,
      maxFileSizeMB: fullUpdatedAssignment.maxFileSizeMB,
      gasWebAppUrl: fullUpdatedAssignment.gasWebAppUrl || null,
    });

    if (oldCode && oldCode !== newCode) {
      await deleteDoc(doc(db, 'assignment_codes', oldCode));
    }
    await setDoc(doc(db, 'assignment_codes', newCode), codePayload);

    // If student roster is provided, sync roster
    if (studentRoster && studentRoster.length > 0) {
      const filteredRoster = (fullUpdatedAssignment.sections.length === 0 || fullUpdatedAssignment.sections.includes('ทั้งหมด'))
        ? studentRoster
        : studentRoster.filter(s => fullUpdatedAssignment.sections.includes(s.sec));

      for (let i = 0; i < filteredRoster.length; i += 400) {
        const chunk = filteredRoster.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(s => {
          const rosterRef = doc(db, 'assignments', assignmentId, 'roster', s.studentCode);
          batch.set(rosterRef, {
            no: s.no,
            studentCode: s.studentCode,
            name: s.name,
            sec: s.sec,
            email: s.email || '',
          });
        });
        await batch.commit();
      }
    }

    return fullUpdatedAssignment;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}
