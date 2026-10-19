import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, testConnection, fbSignOut } from './firebase';
import { Navbar } from './components/Navbar';
import { StudentPortal } from './components/StudentPortal';
import { InstructorPortal } from './components/InstructorPortal';
import { BookOpen, Sparkles, Check, ArrowRight, ShieldCheck, Send } from 'lucide-react';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'student' | 'instructor'>('student');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Monitor Auth State
  useEffect(() => {
    // Validate initial connection as per Firebase skill
    testConnection();

    // Check if URL has ?portal=instructor
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('portal') === 'instructor') {
      setCurrentTab('instructor');
    }

    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });

    // Seed initial demo data for fast testing if needed
    seedDemoDataIfEmpty();

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await fbSignOut(auth);
    setUser(null);
    setCurrentTab('student');
  };

  // Seed friendly demo data so the teacher and student can test immediately
  const seedDemoDataIfEmpty = async () => {
    try {
      const demoCodeDoc = await getDoc(doc(db, 'assignment_codes', '834921'));
      if (!demoCodeDoc.exists()) {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // 1. Demo Assignment
        await setDoc(doc(db, 'assignments', 'demo_assign_1'), {
          id: 'demo_assign_1',
          code: '834921',
          courseId: 'demo_course_1',
          courseCode: 'CS101',
          courseName: 'การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น',
          title: 'แบบฝึกหัดที่ 1: การเขียนโปรแกรมแก้ปัญหาพื้นฐาน',
          description: 'ให้นักศึกษาเขียนฟังก์ชันคำนวณและส่งไฟล์สรุปเป็น PDF หรือ Word ขนาดไม่เกิน 10 MB',
          sections: ['ทั้งหมด'],
          allowedTypes: ['pdf', 'doc', 'image', 'link'],
          maxFileSizeMB: 10,
          openAt: now.toISOString(),
          closeAt: nextWeek.toISOString(),
          allowLate: true,
          allowResubmit: true,
          status: 'open',
          instructorId: 'demo_instructor',
          instructorEmail: 'walailuk.p@bumail.net',
          createdAt: now.toISOString(),
        });

        // 2. Demo Code Directory
        await setDoc(doc(db, 'assignment_codes', '834921'), {
          code: '834921',
          assignmentId: 'demo_assign_1',
          courseId: 'demo_course_1',
          courseCode: 'CS101',
          courseName: 'การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น',
          title: 'แบบฝึกหัดที่ 1: การเขียนโปรแกรมแก้ปัญหาพื้นฐาน',
          description: 'ให้นักศึกษาเขียนฟังก์ชันคำนวณและส่งไฟล์สรุปเป็น PDF หรือ Word ขนาดไม่เกิน 10 MB',
          openAt: now.toISOString(),
          closeAt: nextWeek.toISOString(),
          allowLate: true,
          allowResubmit: true,
          status: 'open',
          instructorId: 'demo_instructor',
          allowedTypes: ['pdf', 'doc', 'image', 'link'],
          maxFileSizeMB: 10,
        });

        // 3. Demo Student Roster in assignment
        const demoStudents = [
          { no: '1', studentCode: '1650701001', name: 'นายสมชาย ใจดี', sec: 'Sec 1', email: 'somchai.j@bumail.net' },
          { no: '2', studentCode: '1650701002', name: 'นางสาวสมหญิง รักเรียน', sec: 'Sec 1', email: 'somying.r@bumail.net' },
          { no: '3', studentCode: '1650702001', name: 'นายกิตติกร มั่นคง', sec: 'Sec 2', email: 'kittikorn.m@bumail.net' },
          { no: '4', studentCode: '1650702002', name: 'นางสาวนภัสสร อ่อนหวาน', sec: 'Sec 2', email: 'napatsorn.o@bumail.net' },
        ];

        for (const st of demoStudents) {
          await setDoc(doc(db, 'assignments', 'demo_assign_1', 'roster', st.studentCode), st);
        }
      }
    } catch (e) {
      // Non-blocking
      console.log('Demo seed notice:', e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={tab => setCurrentTab(tab)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Demo Quick Banner for instant testing */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-teal-500/10 border-b border-indigo-100 py-2.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-indigo-950 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>
              <strong>ทดสอบส่งงานได้ทันที:</strong> รหัสงาน 6 หลัก:{' '}
              <button
                onClick={() => {
                  setCurrentTab('student');
                  const input = document.getElementById('assignmentCode') as HTMLInputElement;
                  if (input) {
                    input.value = '834921';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }}
                className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                834921
              </button>{' '}
              | รหัสนักศึกษาทดสอบ:{' '}
              <span className="font-mono font-semibold bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                1650701001
              </span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentTab('student')}
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                currentTab === 'student' ? 'bg-indigo-600 text-white' : 'text-indigo-700 hover:underline'
              }`}
            >
              ส่งงาน (นักศึกษา)
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setCurrentTab('instructor')}
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                currentTab === 'instructor' ? 'bg-indigo-600 text-white' : 'text-indigo-700 hover:underline'
              }`}
            >
              ระบบอาจารย์
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'student' ? (
          <StudentPortal />
        ) : (
          <InstructorPortal
            user={user}
            onLoginSuccess={loggedInUser => {
              setUser(loggedInUser);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-semibold text-slate-800">ClassSubmit - ระบบส่งงานในชั้นเรียน</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ไม่ต้อง Log In อีเมล • ไม่ต้องใช้ QR Code • จัดเก็บไฟล์ลง Google Drive ผ่าน Google Apps Script • Spark Plan Free
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs">
            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-mono">
              Netlify & GitHub Ready
            </span>
            <button
              onClick={() => setCurrentTab(currentTab === 'student' ? 'instructor' : 'student')}
              className="text-indigo-600 hover:underline font-medium"
            >
              สลับไปยัง{currentTab === 'student' ? 'ระบบอาจารย์' : 'หน้านักศึกษา'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
