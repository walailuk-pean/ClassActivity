import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanFirestoreData } from '../firebase';
import { Course, Student } from '../types';

/**
 * Create or update a course
 */
export async function saveCourse(
  course: Omit<Course, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): Promise<string> {
  const courseId = course.id || `course_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `courses/${courseId}`;
  try {
    const courseData: Course = {
      ...course,
      id: courseId,
      academicYear: course.academicYear || '',
      semester: course.semester || '',
      createdAt: course.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'courses', courseId), cleanFirestoreData(courseData));
    return courseId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Fetch all courses belonging to instructor
 */
export async function getInstructorCourses(instructorId: string): Promise<Course[]> {
  const path = 'courses';
  try {
    const q = query(collection(db, path), where('instructorId', '==', instructorId));
    const snapshot = await getDocs(q);
    const courses: Course[] = [];
    snapshot.forEach(d => {
      courses.push(d.data() as Course);
    });
    // Sort by createdAt descending
    return courses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Delete a course and its nested students
 */
export async function deleteCourse(courseId: string): Promise<void> {
  const path = `courses/${courseId}`;
  try {
    // Delete course doc
    await deleteDoc(doc(db, 'courses', courseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Fetch all students in a course
 */
export async function getCourseStudents(courseId: string): Promise<Student[]> {
  const path = `courses/${courseId}/students`;
  try {
    const snapshot = await getDocs(collection(db, 'courses', courseId, 'students'));
    const students: Student[] = [];
    snapshot.forEach(d => {
      students.push({ id: d.id, ...d.data() } as Student);
    });
    // Sort by no or studentCode
    return students.sort((a, b) => {
      const numA = parseInt(a.no, 10);
      const numB = parseInt(b.no, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.studentCode.localeCompare(b.studentCode);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Parse CSV text (UTF-8, supports Thai characters) into Student records
 */
export function parseStudentsCsv(csvText: string, courseId: string, instructorId: string): { students: Student[]; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) {
    return { students: [], errors: ['ไฟล์ CSV ว่างเปล่าหรือไม่พบบรรทัดข้อมูล'] };
  }

  // Parse header
  const headers = splitCsvRow(lines[0]).map(h => h.trim().toLowerCase());
  
  // Find column indices
  let noIndex = -1;
  let codeIndex = -1;
  let nameIndex = -1;
  let secIndex = -1;
  let emailIndex = -1;

  headers.forEach((h, idx) => {
    if (h.includes('เลขที่') || h === 'no' || h === '#' || h === 'seq') noIndex = idx;
    if (h.includes('รหัส') || h.includes('code') || h.includes('student id') || h.includes('studentid') || h === 'id') codeIndex = idx;
    if (h.includes('ชื่อ') || h.includes('name') || h.includes('student name')) nameIndex = idx;
    if (h.includes('sec') || h.includes('เซค') || h.includes('กลุ่ม') || h.includes('section')) secIndex = idx;
    if (h.includes('email') || h.includes('อีเมล') || h.includes('mail')) emailIndex = idx;
  });

  // Default fallback if headers weren't named nicely: standard 1=No, 2=Code, 3=Name, 4=Sec, 5=Email
  if (codeIndex === -1 && headers.length >= 2) {
    // If column 0 looks like numbers and column 1 looks like student code (digits)
    codeIndex = 1;
    if (nameIndex === -1 && headers.length >= 3) nameIndex = 2;
    if (noIndex === -1) noIndex = 0;
    if (secIndex === -1 && headers.length >= 4) secIndex = 3;
  }

  if (codeIndex === -1) {
    return { students: [], errors: ['ไม่พบคอลัมน์ "รหัสนักศึกษา" หรือ "Student ID" ในไฟล์ CSV'] };
  }

  const students: Student[] = [];
  const errors: string[] = [];
  const seenCodes = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const row = splitCsvRow(lines[i]);
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

    const studentCode = (row[codeIndex] || '').trim();
    if (!studentCode) continue;

    if (seenCodes.has(studentCode)) {
      errors.push(`แถวที่ ${i + 1}: รหัสนักศึกษา ${studentCode} ซ้ำในไฟล์ CSV (ใช้แถวแรก)`);
      continue;
    }
    seenCodes.add(studentCode);

    const no = noIndex !== -1 ? (row[noIndex] || `${i}`).trim() : `${i}`;
    const name = nameIndex !== -1 ? (row[nameIndex] || `นักศึกษา ${studentCode}`).trim() : `นักศึกษา ${studentCode}`;
    const sec = secIndex !== -1 && row[secIndex]?.trim() ? row[secIndex].trim() : 'Sec 1';
    const email = emailIndex !== -1 ? (row[emailIndex] || '').trim() : undefined;

    students.push({
      id: studentCode,
      no,
      studentCode,
      name,
      sec,
      email,
      courseId,
      instructorId,
    });
  }

  return { students, errors };
}

/**
 * Helper to split CSV row taking into account quotes
 */
function splitCsvRow(rowText: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(s => s.replace(/^["']|["']$/g, '').trim());
}

/**
 * Save multiple students to course subcollection using Firestore batch
 */
export async function batchSaveStudents(courseId: string, students: Student[]): Promise<number> {
  const path = `courses/${courseId}/students`;
  try {
    // Firestore batch limit is 500 writes
    const batches: Promise<void>[] = [];
    for (let i = 0; i < students.length; i += 400) {
      const chunk = students.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach(s => {
        const studentRef = doc(db, 'courses', courseId, 'students', s.studentCode);
        batch.set(studentRef, cleanFirestoreData({ ...s, email: s.email || '' }));
      });
      batches.push(batch.commit());
    }
    await Promise.all(batches);
    return students.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Generate sample CSV template for download
 */
export function generateSampleStudentsCsv(): string {
  // Add BOM for Microsoft Excel Thai display
  const BOM = '\uFEFF';
  const csvContent = 
`เลขที่,รหัสนักศึกษา,ชื่อ-นามสกุล,กลุ่มเรียน,อีเมลสถาบัน
1,1650701001,นายสมชาย ใจดี,Sec 1,somchai.j@bumail.net
2,1650701002,นางสาวสมหญิง รักเรียน,Sec 1,somying.r@bumail.net
3,1650702001,นายกิตติกร มั่นคง,Sec 2,kittikorn.m@bumail.net
4,1650702002,นางสาวนภัสสร อ่อนหวาน,Sec 2,napatsorn.o@bumail.net
`;
  return BOM + csvContent;
}
