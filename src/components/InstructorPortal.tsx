import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Copy,
  Check,
  Clock,
  Calendar,
  FileText,
  ExternalLink,
  Download,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  RefreshCw,
  FolderOpen,
  Settings,
  Sliders,
  Send,
  Trash2,
  Pencil,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { signInWithPopup, googleProvider, auth } from '../firebase';
import { Assignment, Course, Student, Submission, SubmissionStatus } from '../types';
import {
  getInstructorAssignments,
  updateAssignmentStatus,
  updateAssignment,
  deleteAssignment,
} from '../services/assignmentService';
import { getInstructorCourses, getCourseStudents } from '../services/courseService';
import { subscribeToSubmissions, exportSubmissionsToCsv } from '../services/submissionService';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import { EditAssignmentModal } from './EditAssignmentModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ManualOverrideModal } from './ManualOverrideModal';
import { CourseManager } from './CourseManager';
import { GasSetupGuide } from './GasSetupGuide';
import { downloadFile } from '../services/gasService';

interface InstructorPortalProps {
  user: FirebaseUser | null;
  onLoginSuccess: (user: FirebaseUser) => void;
}

export const InstructorPortal: React.FC<InstructorPortalProps> = ({ user, onLoginSuccess }) => {
  // Navigation tabs within Instructor Portal
  const [activeTab, setActiveTab] = useState<'assignments' | 'submissions' | 'courses' | 'gas'>('assignments');

  // Loaded Data
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [currentRoster, setCurrentRoster] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<Assignment | null>(null);
  const [isDeletingAssignment, setIsDeletingAssignment] = useState<boolean>(false);
  const [overrideTarget, setOverrideTarget] = useState<Submission | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Status & Filter
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [filterSec, setFilterSec] = useState('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [gasUrl, setGasUrl] = useState<string>(() => localStorage.getItem('classsubmit_gas_url') || '');

  // Semester and Academic Year Filters
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>('all');
  const [filterSemester, setFilterSemester] = useState<string>('all');

  // Submissions Section View Mode: 'single_section' (ข้อมูลรายกลุ่ม) | 'combined' (ข้อมูลทุกกลุ่ม)
  const [submissionsViewMode, setSubmissionsViewMode] = useState<'single_section' | 'combined'>('single_section');
  const [activeSectionTab, setActiveSectionTab] = useState<string>('all');

  // Auth Error
  const [authError, setAuthError] = useState<string | null>(null);

  // Load instructor courses and assignments when user logs in
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  // Subscribe to real-time submissions when selected assignment changes
  useEffect(() => {
    if (!selectedAssignmentId) return;

    const assignment = assignments.find(a => a.id === selectedAssignmentId);
    if (assignment) {
      // Load roster of the course for cross-referencing
      getCourseStudents(assignment.courseId).then(students => {
        // Filter roster by assignment sections if specified
        if (assignment.sections && assignment.sections.length > 0 && !assignment.sections.includes('ทั้งหมด')) {
          setCurrentRoster(students.filter(s => assignment.sections.includes(s.sec)));
        } else {
          setCurrentRoster(students);
        }
      });
    }

    // Subscribe to Firestore submissions subcollection
    const unsubscribe = subscribeToSubmissions(
      selectedAssignmentId,
      subList => {
        setSubmissions(subList);
      },
      err => console.error('Submissions listener error:', err)
    );

    return () => unsubscribe();
  }, [selectedAssignmentId, assignments]);

  const loadInitialData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [cList, aList] = await Promise.all([
        getInstructorCourses(user.uid),
        getInstructorAssignments(user.uid),
      ]);
      setCourses(cList);
      setAssignments(aList);
      if (aList.length > 0 && !selectedAssignmentId) {
        setSelectedAssignmentId(aList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email || '';
      // Support @bu.ac.th and @bumail.net (Bangkok University) or standard instructor emails
      if (!email.endsWith('@bu.ac.th') && !email.endsWith('@bumail.net')) {
        console.warn(`Logged in with email ${email}. For production, @bu.ac.th is recommended.`);
      }
      onLoginSuccess(result.user);
    } catch (err: any) {
      setAuthError(err.message || 'การเข้าสู่ระบบผ่าน Google ไม่สำเร็จ');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(code);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleCopyDirectLink = (code: string) => {
    const url = `${window.location.origin}/?code=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkId(code);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleToggleStatus = async (assign: Assignment) => {
    const nextStatus = assign.status === 'open' ? 'closed' : 'open';
    try {
      await updateAssignmentStatus(assign.id, assign.code, nextStatus);
      setAssignments(prev =>
        prev.map(a => (a.id === assign.id ? { ...a, status: nextStatus } : a))
      );
    } catch (err) {
      alert('ไม่สามารถเปลี่ยนสถานะงานได้');
    }
  };

  const handleExtend24h = async (assign: Assignment) => {
    try {
      const currentClose = new Date(assign.closeAt);
      const extended = new Date(currentClose.getTime() + 24 * 60 * 60 * 1000).toISOString();
      await updateAssignmentStatus(assign.id, assign.code, 'open', extended);
      setAssignments(prev =>
        prev.map(a => (a.id === assign.id ? { ...a, status: 'open', closeAt: extended } : a))
      );
      alert(`ขยายเวลารับงานรหัส ${assign.code} เพิ่มอีก 24 ชั่วโมงเรียบร้อยแล้ว`);
    } catch (err) {
      alert('ไม่สามารถขยายเวลาได้');
    }
  };

  const handleEditAssignment = async (id: string, updatedData: Assignment) => {
    try {
      const saved = await updateAssignment(id, updatedData, currentRoster);
      setAssignments(prev => prev.map(a => (a.id === id ? saved : a)));
      setEditingAssignment(null);
      showToast(`แก้ไขงาน "${saved.title}" สำเร็จเรียบร้อยแล้ว`, 'success');
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถบันทึกการแก้ไขงานได้', 'error');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    const assign = assignments.find(a => a.id === id) || deletingAssignment;
    if (!assign) return;
    setIsDeletingAssignment(true);
    try {
      await deleteAssignment(assign.id, assign.code);
      setAssignments(prev => prev.filter(a => a.id !== assign.id));
      if (selectedAssignmentId === assign.id) {
        const remaining = assignments.filter(a => a.id !== assign.id);
        setSelectedAssignmentId(remaining[0]?.id || '');
      }
      setDeletingAssignment(null);
      showToast(`ลบงาน "${assign.title}" เรียบร้อยแล้ว`, 'success');
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถลบงานได้', 'error');
    } finally {
      setIsDeletingAssignment(false);
    }
  };

  // Available academic years
  const availableAcademicYears = React.useMemo(() => {
    const years = new Set<string>();
    courses.forEach(c => {
      if (c.academicYear) years.add(c.academicYear);
    });
    assignments.forEach(a => {
      if (a.academicYear) years.add(a.academicYear);
    });
    ['2569', '2568', '2567'].forEach(y => years.add(y));
    return Array.from(years).sort().reverse();
  }, [courses, assignments]);

  const availableSemesters = [
    { value: 'all', label: 'ทุกภาคการศึกษา (All Semesters)' },
    { value: '1', label: 'ภาคเรียนที่ 1' },
    { value: '2', label: 'ภาคเรียนที่ 2' },
    { value: 'summer', label: 'ภาคฤดูร้อน (Summer)' },
  ];

  // Helper matching functions
  const assignmentMatchesFilter = (a: Assignment) => {
    const course = courses.find(c => c.id === a.courseId);
    const aYear = a.academicYear || course?.academicYear;
    const aSem = a.semester || course?.semester;
    const matchYear = filterAcademicYear === 'all' || aYear === filterAcademicYear;
    const matchSem = filterSemester === 'all' || aSem === filterSemester;
    return matchYear && matchSem;
  };

  const courseMatchesFilter = (c: Course) => {
    const matchYear = filterAcademicYear === 'all' || c.academicYear === filterAcademicYear;
    const matchSem = filterSemester === 'all' || c.semester === filterSemester;
    return matchYear && matchSem;
  };

  const filteredAssignments = React.useMemo(() => {
    return assignments.filter(assignmentMatchesFilter);
  }, [assignments, courses, filterAcademicYear, filterSemester]);

  const filteredCourses = React.useMemo(() => {
    return courses.filter(courseMatchesFilter);
  }, [courses, filterAcademicYear, filterSemester]);

  // Keep selectedAssignmentId synchronized with filtered assignments
  useEffect(() => {
    if (filteredAssignments.length > 0) {
      if (!selectedAssignmentId || !filteredAssignments.some(a => a.id === selectedAssignmentId)) {
        setSelectedAssignmentId(filteredAssignments[0].id);
      }
    }
  }, [filteredAssignments, selectedAssignmentId]);

  const handleExportCsv = () => {
    handleExportSectionCsv('all');
  };

  const handleExportSectionCsv = (targetSec: string = 'all') => {
    const assign = assignments.find(a => a.id === selectedAssignmentId);
    if (!assign) return;

    const rosterToExport = targetSec !== 'all'
      ? currentRoster.filter(s => s.sec === targetSec)
      : currentRoster;
    const subsToExport = targetSec !== 'all'
      ? submissions.filter(s => s.sec === targetSec)
      : submissions;

    const csvContent = exportSubmissionsToCsv(assign, rosterToExport, subsToExport);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const secTag = targetSec !== 'all' ? `_${targetSec}` : '_ทุกกลุ่มเรียน';
    link.download = `รายงานส่งงาน_${assign.courseCode}_${assign.code}${secTag}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveGasUrl = async (url: string) => {
    setGasUrl(url);
    localStorage.setItem('classsubmit_gas_url', url);
  };

  // If instructor not logged in yet
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 sm:py-20 text-center">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-6">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">เข้าสู่ระบบสำหรับอาจารย์</h2>
            <p className="text-xs text-slate-500 mt-1">
              จัดการรายวิชา สร้างงานมอบหมาย และตรวจงานแบบเรียลไทม์
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 text-left space-y-1">
            <p className="font-semibold">ระบบการพิสูจน์ตัวตนผ่าน Google Account</p>
            <p className="text-slate-600 text-xs leading-relaxed">
              รองรับอีเมลสถาบัน <span className="font-mono font-semibold">@bu.ac.th</span> และ{' '}
              <span className="font-mono font-semibold">@bumail.net</span> เพื่อความปลอดภัย
            </p>
          </div>

          {authError && (
            <div className="flex items-center space-x-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center space-x-3 py-3.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all shadow-xs"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>เข้าสู่ระบบด้วย Google Account</span>
          </button>
        </div>
      </div>
    );
  }

  // Active Assignment Object
  const currentAssignment = assignments.find(a => a.id === selectedAssignmentId);

  // Submissions Analytics (Overall)
  const totalRoster = currentRoster.length;
  const submittedStudentCodes = new Set(submissions.map(s => s.studentCode));
  const totalSubmitted = submissions.length;
  const onTimeCount = submissions.filter(s => s.status === 'on_time').length;
  const lateCount = submissions.filter(s => s.status === 'late').length;
  const excusedCount = submissions.filter(s => s.status === 'excused' || s.status === 'sick').length;
  const missingCount = Math.max(0, totalRoster - totalSubmitted);
  const submitPercentage = totalRoster > 0 ? Math.round((totalSubmitted / totalRoster) * 100) : 0;

  // Extract all sections for currentAssignment
  const assignmentSections = React.useMemo(() => {
    if (!currentAssignment) return [];
    const secs = new Set<string>();
    if (currentAssignment.sections && currentAssignment.sections.length > 0) {
      currentAssignment.sections.forEach(s => {
        if (s && s !== 'ทั้งหมด') secs.add(s);
      });
    }
    currentRoster.forEach(s => {
      if (s.sec) secs.add(s.sec);
    });
    submissions.forEach(s => {
      if (s.sec) secs.add(s.sec);
    });
    const list = Array.from(secs);
    if (list.length === 0) list.push('Sec 1');
    return list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [currentAssignment, currentRoster, submissions]);

  // Map of studentCode -> submission
  const subMap = React.useMemo(() => {
    const map = new Map<string, Submission>();
    submissions.forEach(s => map.set(s.studentCode, s));
    return map;
  }, [submissions]);

  // Filter Submissions Table (for combined view)
  const filteredSubmissions = submissions.filter(s => {
    const matchSearch =
      s.studentCode.includes(submissionSearch) ||
      s.studentName.toLowerCase().includes(submissionSearch.toLowerCase()) ||
      s.receiptCode.toLowerCase().includes(submissionSearch.toLowerCase());
    const matchSec = filterSec === 'all' || s.sec === filterSec;
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchSec && matchStatus;
  });

  // Comprehensive Section Breakdown with full student roster cross-referencing
  const sectionBreakdown = React.useMemo(() => {
    return assignmentSections.map(sec => {
      const rosterInSec = currentRoster.filter(s => s.sec === sec);
      const subsInSec = submissions.filter(s => s.sec === sec);
      const subCodes = new Set(subsInSec.map(s => s.studentCode));
      const onTime = subsInSec.filter(s => s.status === 'on_time').length;
      const late = subsInSec.filter(s => s.status === 'late').length;
      const excused = subsInSec.filter(s => s.status === 'excused' || s.status === 'sick').length;
      const missingStudents = rosterInSec.filter(s => !subCodes.has(s.studentCode));
      const total = Math.max(rosterInSec.length, subsInSec.length);
      const submitted = subsInSec.length;
      const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;

      // Merged students list for this section
      const list: Array<{
        studentNo: string;
        studentCode: string;
        studentName: string;
        sec: string;
        submission?: Submission;
        status: SubmissionStatus | 'missing';
      }> = rosterInSec.map(st => {
        const sub = subMap.get(st.studentCode);
        return {
          studentNo: st.no,
          studentCode: st.studentCode,
          studentName: st.name,
          sec: st.sec,
          submission: sub,
          status: sub ? sub.status : 'missing',
        };
      });

      // Include any submissions not in roster
      subsInSec.forEach(sub => {
        if (!rosterInSec.some(r => r.studentCode === sub.studentCode)) {
          list.push({
            studentNo: sub.studentNo,
            studentCode: sub.studentCode,
            studentName: sub.studentName,
            sec: sub.sec,
            submission: sub,
            status: sub.status,
          });
        }
      });

      // Filter by search query if any
      const filteredList = list.filter(item => {
        if (!submissionSearch.trim()) return true;
        const q = submissionSearch.toLowerCase();
        return (
          item.studentCode.includes(q) ||
          item.studentName.toLowerCase().includes(q) ||
          item.studentNo.includes(q) ||
          (item.submission?.receiptCode || '').toLowerCase().includes(q)
        );
      }).filter(item => {
        if (filterStatus === 'all') return true;
        return item.status === filterStatus;
      });

      // Sort by studentNo or studentCode
      filteredList.sort((a, b) => {
        const noA = parseInt(a.studentNo) || 0;
        const noB = parseInt(b.studentNo) || 0;
        if (noA !== 0 && noB !== 0) return noA - noB;
        return a.studentCode.localeCompare(b.studentCode);
      });

      return {
        sec,
        total,
        submitted,
        onTime,
        late,
        excused,
        missing: missingStudents.length,
        pct,
        rosterInSec,
        subsInSec,
        studentsList: filteredList,
      };
    });
  }, [assignmentSections, currentRoster, submissions, subMap, submissionSearch, filterStatus]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Sub-Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'assignments' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>งานที่มอบหมาย ({filteredAssignments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'submissions' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>ตรวจงาน & สถิติเรียลไทม์</span>
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'courses' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>จัดการรายวิชา & รายชื่อนักศึกษา ({filteredCourses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('gas')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'gas' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>ตั้งค่า Google Apps Script (Drive)</span>
        </button>
      </div>

      {/* ================= GLOBAL SEMESTER & ACADEMIC YEAR FILTER BAR ================= */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>ตัวกรองภาค/ปีการศึกษา:</span>
          </div>

          {/* Academic Year Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 font-medium">ปีการศึกษา:</span>
            <select
              value={filterAcademicYear}
              onChange={e => setFilterAcademicYear(e.target.value)}
              className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-indigo-600 focus:bg-white transition-colors"
            >
              <option value="all">ทุกปีการศึกษา (All Years)</option>
              {availableAcademicYears.map(yr => (
                <option key={yr} value={yr}>
                  ปี {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 font-medium">ภาคการศึกษา:</span>
            <select
              value={filterSemester}
              onChange={e => setFilterSemester(e.target.value)}
              className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-indigo-600 focus:bg-white transition-colors"
            >
              {availableSemesters.map(sem => (
                <option key={sem.value} value={sem.value}>
                  {sem.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          {(filterAcademicYear !== 'all' || filterSemester !== 'all') && (
            <button
              onClick={() => {
                setFilterAcademicYear('all');
                setFilterSemester('all');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline flex items-center space-x-1 font-medium ml-1"
            >
              <span>✕ ล้างตัวกรอง</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-medium">
            {filteredAssignments.length} งานที่มอบหมาย
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium">
            {filteredCourses.length} รายวิชา
          </span>
        </div>
      </div>

      {/* ================= TAB 1: Assignments Management ================= */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-slate-900">งานที่มอบหมาย (Assignments)</h2>
              <p className="text-xs text-slate-500">
                สร้างงาน กำหนดรหัส 6 หลัก วันเปิด-ปิดรับงาน และแนบใบงานให้นักศึกษา
              </p>
            </div>
            <button
              onClick={() => {
                if (courses.length === 0) {
                  alert('กรุณาสร้างรายวิชาก่อนสร้างงานที่มอบหมาย');
                  setActiveTab('courses');
                  return;
                }
                setShowCreateModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างงานใหม่</span>
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 text-base">ยังไม่มีงานที่มอบหมาย</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                กดปุ่ม "สร้างงานใหม่" เพื่อสร้างรหัสงาน 6 หลักและเปิดรับงานจากนักศึกษา
              </p>
              <button
                onClick={() => {
                  if (courses.length === 0) {
                    setActiveTab('courses');
                  } else {
                    setShowCreateModal(true);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
              >
                + เริ่มต้นสร้างงาน
              </button>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 text-base">ไม่พบงานที่มอบหมายในปีหรือภาคการศึกษาที่เลือก</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                ลองปรับเปลี่ยนตัวกรองปีการศึกษาหรือภาคการศึกษาด้านบน
              </p>
              <button
                onClick={() => {
                  setFilterAcademicYear('all');
                  setFilterSemester('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
              >
                ล้างตัวกรองเพื่อแสดงงานทั้งหมด
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssignments.map(assign => {
                const isCodeCopied = copiedCodeId === assign.code;
                const isLinkCopied = copiedLinkId === assign.code;
                const isOpen = assign.status === 'open';
                const course = courses.find(c => c.id === assign.courseId);
                const displayYear = assign.academicYear || course?.academicYear;
                const displaySem = assign.semester || course?.semester;

                return (
                  <div
                    key={assign.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono">
                            {assign.courseCode}
                          </span>
                          {(displaySem || displayYear) && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {displaySem ? `ภาค ${displaySem}` : ''}{displayYear ? `/${displayYear}` : ''}
                            </span>
                          )}
                          {assign.sections && assign.sections.length > 0 && !assign.sections.includes('ทั้งหมด') && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              {assign.sections.join(', ')}
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            isOpen
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isOpen ? '● กำลังเปิดรับ' : '○ ปิดรับงาน'}
                        </span>
                      </div>

                      {/* Title & Desc */}
                      <h3 className="font-bold text-slate-900 text-base leading-snug mb-1">
                        {assign.title}
                      </h3>
                      {assign.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">{assign.description}</p>
                      )}

                      {/* 6-Digit Code Box */}
                      <div className="my-3 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-indigo-500 font-semibold block uppercase">
                            รหัสงาน 6 หลัก
                          </span>
                          <span className="text-xl font-mono font-bold text-indigo-900">
                            #{assign.code}
                          </span>
                        </div>

                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleCopyCode(assign.code)}
                            className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs transition-colors"
                            title="คัดลอกรหัสงาน"
                          >
                            {isCodeCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleCopyDirectLink(assign.code)}
                            className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs transition-colors"
                            title="คัดลอกลิงก์สำหรับส่งให้นักศึกษา"
                          >
                            {isLinkCopied ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <ExternalLink className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Dates & Constraints */}
                      <div className="space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>กำหนดส่ง: {new Date(assign.closeAt).toLocaleString('th-TH')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px]">
                            {assign.allowLate ? '✓ ส่งช้าได้' : '✕ ห้ามส่งช้า'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px]">
                            {assign.allowResubmit ? '✓ ส่งซ้ำได้' : '✕ ส่งได้ 1 ครั้ง'}
                          </span>
                        </div>
                        {assign.worksheetUrl && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => downloadFile(assign.worksheetUrl, assign.worksheetName)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 text-xs font-semibold transition-colors shadow-xs group cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform shrink-0" />
                              <span className="truncate max-w-[190px]">
                                ใบงาน: {assign.worksheetName || 'ดาวน์โหลด'}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setSelectedAssignmentId(assign.id);
                          setActiveTab('submissions');
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ตรวจงาน</span>
                      </button>

                      <button
                        onClick={() => handleToggleStatus(assign)}
                        className={`p-2 rounded-xl text-xs font-medium border transition-colors ${
                          isOpen
                            ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                            : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                        title={isOpen ? 'ปิดรับงาน' : 'เปิดรับงาน'}
                      >
                        {isOpen ? 'ปิดรับ' : 'เปิดรับ'}
                      </button>

                      <button
                        onClick={() => handleExtend24h(assign)}
                        className="p-2 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                        title="ขยายเวลา 24 ชม."
                      >
                        +24 ชม.
                      </button>

                      <button
                        onClick={() => setEditingAssignment(assign)}
                        className="p-2 rounded-xl text-xs font-medium text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors cursor-pointer"
                        title="แก้ไขงานนี้"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeletingAssignment(assign)}
                        className="p-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                        title="ลบงานนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: Live Submissions & Real-Time Stats ================= */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          {/* Assignment Selector & Export Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                เลือกงานที่มอบหมาย
              </label>
              {filteredAssignments.length === 0 ? (
                <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  ไม่พบงานที่มอบหมายตามตัวกรองภาค/ปีการศึกษาที่เลือก กรุณาล้างตัวกรองด้านบน
                </div>
              ) : (
                <select
                  value={selectedAssignmentId}
                  onChange={e => setSelectedAssignmentId(e.target.value)}
                  className="w-full md:max-w-md text-sm font-semibold py-2.5 px-3 rounded-xl border border-slate-300 bg-white focus:border-indigo-600 outline-none"
                >
                  {filteredAssignments.map(a => {
                    const c = courses.find(item => item.id === a.courseId);
                    const semLabel = a.semester || c?.semester;
                    const yearLabel = a.academicYear || c?.academicYear;
                    return (
                      <option key={a.id} value={a.id}>
                        [{a.code}] {a.courseCode} - {a.title} {semLabel || yearLabel ? `(${semLabel ? `ภาค ${semLabel}/` : ''}${yearLabel || ''})` : ''}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleExportSectionCsv('all')}
                disabled={!currentAssignment}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>ส่งออกรายงาน CSV รวมทุก Section</span>
              </button>
            </div>
          </div>

          {currentAssignment ? (
            <>
              {/* ================= SECTION BREAKDOWN CARDS ================= */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-800">
                      สรุปข้อมูลสถานะการส่งงาน
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {sectionBreakdown.map(secData => (
                    <div
                      key={secData.sec}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs font-mono">
                            กลุ่มเรียน {secData.sec}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {secData.submitted}/{secData.total} คน ({secData.pct}%)
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${secData.pct}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-[11px] text-center pt-1 border-t border-slate-100">
                          <div className="bg-emerald-50 text-emerald-800 rounded-lg p-1 font-medium">
                            ตรงเวลา: {secData.onTime}
                          </div>
                          <div className="bg-amber-50 text-amber-800 rounded-lg p-1 font-medium">
                            ส่งช้า: {secData.late}
                          </div>
                          <div className="bg-rose-50 text-rose-800 rounded-lg p-1 font-medium">
                            ยังไม่ส่ง: {secData.missing}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleExportSectionCsv(secData.sec)}
                        className="mt-3 w-full py-1.5 px-2 rounded-xl text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                        title={`ดาวน์โหลด CSV เฉพาะกลุ่ม ${secData.sec}`}
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        <span>ดาวน์โหลด CSV ({secData.sec})</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ================= VIEW MODE & SEARCH CONTROLS ================= */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* View Mode Toggle */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmissionsViewMode('single_section');
                        if ((activeSectionTab === 'all' || !activeSectionTab) && assignmentSections.length > 0) {
                          setActiveSectionTab(assignmentSections[0]);
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        submissionsViewMode === 'single_section'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ข้อมูลรายกลุ่ม (Section)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmissionsViewMode('combined')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        submissionsViewMode === 'combined'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ข้อมูลทุกกลุ่ม (All Section)
                    </button>
                  </div>

                  {submissionsViewMode === 'single_section' && (
                    <div className="flex items-center gap-1 overflow-x-auto">
                      {assignmentSections.map(sec => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setActiveSectionTab(sec)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium font-mono transition-all cursor-pointer ${
                            activeSectionTab === sec
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {sec}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search & Filter */}
                <div className="flex items-center gap-2">
                  <div className="relative min-w-[220px]">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={submissionSearch}
                      onChange={e => setSubmissionSearch(e.target.value)}
                      placeholder="ค้นหารหัส, ชื่อ, หรือรหัสสถานะ..."
                      className="w-full text-xs py-2 pl-9 pr-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white outline-none"
                  >
                    <option value="all">ทุกสถานะ</option>
                    <option value="on_time">ส่งตรงเวลา</option>
                    <option value="late">ส่งช้า</option>
                    <option value="missing">ยังไม่ส่งงาน</option>
                    <option value="excused">ลากิจ</option>
                    <option value="sick">ลาป่วย</option>
                  </select>
                </div>
              </div>

              {/* ================= SUBMISSIONS DATA TABLES ================= */}
              {submissionsViewMode === 'single_section' ? (
                // ================= MODE 2: SINGLE SPECIFIC SECTION =================
                (() => {
                  const targetSecData =
                    sectionBreakdown.find(s => s.sec === activeSectionTab) || sectionBreakdown[0];
                  if (!targetSecData) {
                    return (
                      <div className="p-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                        ไม่พบข้อมูลในกลุ่มเรียนนี้
                      </div>
                    );
                  }

                  return (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                      <div className="bg-slate-50/90 px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
                            กลุ่มเรียน / Section: {targetSecData.sec}
                          </span>
                          <span className="text-xs text-slate-600">
                            นักศึกษาทั้งหมด <span className="font-semibold text-slate-900">{targetSecData.total}</span> คน
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-semibold text-indigo-700">
                            ส่งแล้ว {targetSecData.submitted} คน ({targetSecData.pct}%)
                          </span>
                        </div>

                        <button
                          onClick={() => handleExportSectionCsv(targetSecData.sec)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-600" />
                          <span>ส่งออก CSV ({targetSecData.sec})</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto max-h-[550px]">
                        {targetSecData.studentsList.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400">
                            ไม่พบข้อมูลนักศึกษาที่ตรงกับเงื่อนไขการค้นหา
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold sticky top-0 border-b border-slate-100 z-10">
                              <tr>
                                <th className="py-3 px-4 w-12">เลขที่</th>
                                <th className="py-3 px-4">รหัสนักศึกษา</th>
                                <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                                <th className="py-3 px-4">กลุ่มเรียน</th>
                                <th className="py-3 px-4">สถานะการส่ง</th>
                                <th className="py-3 px-4">เวลาที่ส่ง</th>
                                <th className="py-3 px-4">งานที่ส่ง</th>
                                <th className="py-3 px-4">รหัสอ้างอิงสถานะ</th>
                                <th className="py-3 px-4">คะแนน</th>
                                <th className="py-3 px-4 text-right">การจัดการ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {targetSecData.studentsList.map(item => {
                                const sub = item.submission;
                                const statusBadges: Record<string, { label: string; class: string }> = {
                                  on_time: { label: 'ส่งตรงเวลา', class: 'bg-emerald-100 text-emerald-800' },
                                  late: { label: 'ส่งช้า', class: 'bg-amber-100 text-amber-800' },
                                  missing: { label: 'ยังไม่ส่งงาน', class: 'bg-rose-100 text-rose-800' },
                                  excused: { label: 'ลากิจ', class: 'bg-blue-100 text-blue-800' },
                                  sick: { label: 'ลาป่วย', class: 'bg-purple-100 text-purple-800' },
                                };
                                const badge = statusBadges[item.status] || {
                                  label: item.status,
                                  class: 'bg-slate-100 text-slate-700',
                                };

                                return (
                                  <tr
                                    key={item.studentCode}
                                    className={`transition-colors ${
                                      item.status === 'missing' ? 'bg-rose-50/20 hover:bg-rose-50/50' : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    <td className="py-2.5 px-4 font-mono font-medium text-slate-500">{item.studentNo}</td>
                                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-900">{item.studentCode}</td>
                                    <td className="py-2.5 px-4 font-semibold text-slate-800">{item.studentName}</td>
                                    <td className="py-2.5 px-4 font-mono text-slate-600">{item.sec}</td>
                                    <td className="py-2.5 px-4">
                                      <span className={`px-2 py-0.5 rounded-full font-medium text-[11px] ${badge.class}`}>
                                        {badge.label}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 text-slate-500 font-mono">
                                      {sub ? `${new Date(sub.submittedAt).toLocaleTimeString('th-TH')} น.` : '-'}
                                    </td>
                                    <td className="py-2.5 px-4">
                                      {sub?.fileUrl ? (
                                        <button
                                          type="button"
                                          onClick={() => downloadFile(sub.fileUrl, sub.fileName)}
                                          className="text-indigo-600 hover:underline flex items-center space-x-1 font-medium truncate max-w-[150px] text-left cursor-pointer"
                                          title={sub.fileName || 'ดาวน์โหลด/เปิดไฟล์'}
                                        >
                                          <FileText className="w-3.5 h-3.5 shrink-0" />
                                          <span className="truncate">{sub.fileName || 'เปิดไฟล์'}</span>
                                        </button>
                                      ) : sub?.linkUrl ? (
                                        <a
                                          href={sub.linkUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-indigo-600 hover:underline flex items-center space-x-1 font-medium truncate max-w-[150px]"
                                          title={sub.linkUrl}
                                        >
                                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                          <span className="truncate">{sub.linkUrl}</span>
                                        </a>
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                                      {sub?.receiptCode || '-'}
                                    </td>
                                    <td className="py-2.5 px-4 font-bold text-slate-800">
                                      {sub?.score !== undefined && sub?.score !== null ? (
                                        <span className="text-emerald-700">{sub.score}</span>
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-4 text-right">
                                      <button
                                        onClick={() => {
                                          if (sub) {
                                            setOverrideTarget(sub);
                                          } else {
                                            const dummySub: Submission = {
                                              id: item.studentCode,
                                              assignmentId: currentAssignment.id,
                                              studentCode: item.studentCode,
                                              studentName: item.studentName,
                                              studentNo: item.studentNo,
                                              sec: item.sec,
                                              receiptCode: `OVERRIDE-${item.studentCode}`,
                                              submittedAt: new Date().toISOString(),
                                              status: 'missing',
                                            };
                                            setOverrideTarget(dummySub);
                                          }
                                        }}
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors cursor-pointer"
                                      >
                                        แก้ไข/ให้คะแนน
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                // ================= MODE 3: COMBINED SINGLE TABLE =================
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto max-h-[550px]">
                    {submissions.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">
                        <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700">ยังไม่มีนักศึกษาส่งงาน</p>
                        <p className="text-xs text-slate-400 mt-1">
                          เมื่อมีนักศึกษาส่งงาน ข้อมูลจะอัปเดตบนหน้านี้โดยอัตโนมัติแบบเรียลไทม์
                        </p>
                      </div>
                    ) : filteredSubmissions.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold sticky top-0 border-b border-slate-100">
                          <tr>
                            <th className="py-3 px-4 w-12">เลขที่</th>
                            <th className="py-3 px-4">รหัสนักศึกษา</th>
                            <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                            <th className="py-3 px-4">Sec</th>
                            <th className="py-3 px-4">สถานะ</th>
                            <th className="py-3 px-4">เวลาที่ส่ง</th>
                            <th className="py-3 px-4">งานที่ส่ง</th>
                            <th className="py-3 px-4">รหัสอ้างอิงสถานะ</th>
                            <th className="py-3 px-4">คะแนน</th>
                            <th className="py-3 px-4 text-right">การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredSubmissions.map(sub => {
                            const statusBadges: Record<SubmissionStatus, { label: string; class: string }> = {
                              on_time: { label: 'ส่งตรงเวลา', class: 'bg-emerald-100 text-emerald-800' },
                              late: { label: 'ส่งช้า', class: 'bg-amber-100 text-amber-800' },
                              missing: { label: 'ไม่ส่งงาน', class: 'bg-rose-100 text-rose-800' },
                              excused: { label: 'ลากิจ', class: 'bg-blue-100 text-blue-800' },
                              sick: { label: 'ลาป่วย', class: 'bg-purple-100 text-purple-800' },
                            };

                            const badge = statusBadges[sub.status] || {
                              label: sub.status,
                              class: 'bg-slate-100 text-slate-700',
                            };

                            return (
                              <tr key={sub.studentCode} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-4 font-mono font-medium text-slate-500">{sub.studentNo}</td>
                                <td className="py-2.5 px-4 font-mono font-bold text-indigo-900">{sub.studentCode}</td>
                                <td className="py-2.5 px-4 font-semibold text-slate-800">{sub.studentName}</td>
                                <td className="py-2.5 px-4 font-mono text-slate-600">{sub.sec}</td>
                                <td className="py-2.5 px-4">
                                  <span className={`px-2 py-0.5 rounded-full font-medium text-[11px] ${badge.class}`}>
                                    {badge.label}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-slate-500 font-mono">
                                  {new Date(sub.submittedAt).toLocaleTimeString('th-TH')} น.
                                </td>
                                <td className="py-2.5 px-4">
                                  {sub.fileUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => downloadFile(sub.fileUrl, sub.fileName)}
                                      className="text-indigo-600 hover:underline flex items-center space-x-1 font-medium truncate max-w-[150px] text-left cursor-pointer"
                                      title={sub.fileName || 'ดาวน์โหลด/เปิดไฟล์'}
                                    >
                                      <FileText className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{sub.fileName || 'เปิดไฟล์'}</span>
                                    </button>
                                  ) : sub.linkUrl ? (
                                    <a
                                      href={sub.linkUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-indigo-600 hover:underline flex items-center space-x-1 font-medium truncate max-w-[150px]"
                                      title={sub.linkUrl}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{sub.linkUrl}</span>
                                    </a>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                                  {sub.receiptCode}
                                </td>
                                <td className="py-2.5 px-4 font-bold text-slate-800">
                                  {sub.score !== undefined && sub.score !== null ? (
                                    <span className="text-emerald-700">{sub.score}</span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <button
                                    onClick={() => setOverrideTarget(sub)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors cursor-pointer"
                                  >
                                    แก้ไข/ให้คะแนน
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
              กรุณาเลือกงานที่ต้องการตรวจ
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: Courses & Rosters ================= */}
      {activeTab === 'courses' && (
        <CourseManager
          instructorId={user.uid}
          instructorEmail={user.email || ''}
          onCoursesUpdated={c => setCourses(c)}
        />
      )}

      {/* ================= TAB 4: Google Apps Script Setup Guide ================= */}
      {activeTab === 'gas' && (
        <GasSetupGuide currentUrl={gasUrl} onSaveUrl={handleSaveGasUrl} />
      )}

      {/* ================= MODAL: Create Assignment ================= */}
      {showCreateModal && (
        <CreateAssignmentModal
          courses={courses}
          instructorId={user.uid}
          instructorEmail={user.email || ''}
          gasWebAppUrl={gasUrl}
          onClose={() => setShowCreateModal(false)}
          onSuccess={newAssign => {
            setAssignments(prev => [newAssign, ...prev]);
            setSelectedAssignmentId(newAssign.id);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* ================= MODAL: Edit Assignment ================= */}
      {editingAssignment && (
        <EditAssignmentModal
          assignment={editingAssignment}
          courses={courses}
          gasWebAppUrl={gasUrl}
          onClose={() => setEditingAssignment(null)}
          onSuccess={updated => handleEditAssignment(updated.id, updated)}
        />
      )}

      {/* ================= MODAL: Delete Confirm ================= */}
      {deletingAssignment && (
        <DeleteConfirmModal
          isOpen={!!deletingAssignment}
          title="ยืนยันการลบงานที่มอบหมาย"
          itemTitle={deletingAssignment.title}
          itemCode={deletingAssignment.code}
          isDeleting={isDeletingAssignment}
          onCancel={() => setDeletingAssignment(null)}
          onConfirm={() => handleDeleteAssignment(deletingAssignment.id)}
        />
      )}

      {/* ================= TOAST NOTIFICATION ================= */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-xl border border-slate-200 bg-white animate-slide-up transition-all">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />}
          <span className="text-xs font-semibold text-slate-800">{toast.message}</span>
        </div>
      )}
    </div>
  );
};
