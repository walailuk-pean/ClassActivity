import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Users,
  Upload,
  Download,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Filter,
  Layers,
} from 'lucide-react';
import { Course, Student } from '../types';
import {
  saveCourse,
  getInstructorCourses,
  deleteCourse,
  getCourseStudents,
  parseStudentsCsv,
  batchSaveStudents,
  generateSampleStudentsCsv,
} from '../services/courseService';

interface CourseManagerProps {
  instructorId: string;
  instructorEmail: string;
  onCoursesUpdated: (courses: Course[]) => void;
}

export const CourseManager: React.FC<CourseManagerProps> = ({
  instructorId,
  instructorEmail,
  onCoursesUpdated,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // New Course Modal Form
  const [showNewCourseModal, setShowNewCourseModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSecs, setNewSecs] = useState('Sec 1, Sec 2');
  const [newYear, setNewYear] = useState('2569');
  const [newSemester, setNewSemester] = useState('1');
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  // CSV Import State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<Student[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  // Course Semester & Year Filter
  const [courseFilterYear, setCourseFilterYear] = useState<string>('all');
  const [courseFilterSemester, setCourseFilterSemester] = useState<string>('all');

  // Student Search / Filter & Section View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSec, setFilterSec] = useState<string>('all');
  const [rosterViewMode, setRosterViewMode] = useState<'separated' | 'combined'>('separated');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, [instructorId]);

  const loadCourses = async () => {
    setIsLoadingCourses(true);
    try {
      const data = await getInstructorCourses(instructorId);
      setCourses(data);
      onCoursesUpdated(data);
      if (data.length > 0 && !selectedCourse) {
        setSelectedCourse(data[0]);
        loadStudents(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const loadStudents = async (cId: string) => {
    setIsLoadingStudents(true);
    try {
      const list = await getCourseStudents(cId);
      setStudents(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    setIsSavingCourse(true);
    try {
      const sectionsArray = newSecs
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const courseId = await saveCourse({
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        sections: sectionsArray.length > 0 ? sectionsArray : ['Sec 1'],
        academicYear: newYear.trim(),
        semester: newSemester.trim(),
        instructorId,
        instructorEmail,
      });

      setShowNewCourseModal(false);
      setNewCode('');
      setNewName('');
      await loadCourses();
    } catch (err) {
      alert('ไม่สามารถสร้างรายวิชาได้');
    } finally {
      setIsSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (cId: string) => {
    if (!window.confirm('คุณต้องการลบรายวิชานี้และรายชื่อนักศึกษาทั้งหมดใช่หรือไม่?')) return;
    try {
      await deleteCourse(cId);
      setSelectedCourse(null);
      await loadCourses();
    } catch (err) {
      alert('ไม่สามารถลบรายวิชาได้');
    }
  };

  // Handle CSV file selection and parsing
  const handleCsvSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCourse) return;
    setCsvFile(file);

    try {
      const text = await file.text();
      const { students: parsed, errors } = parseStudentsCsv(text, selectedCourse.id, instructorId);
      setParsedPreview(parsed);
      setParseErrors(errors);
    } catch (err) {
      setParseErrors(['ไม่สามารถอ่านไฟล์ CSV ได้ กรุณาตรวจสอบว่าเป็นไฟล์ Text หรือ UTF-8']);
    }
  };

  const handleSaveImportedStudents = async () => {
    if (!selectedCourse || parsedPreview.length === 0) return;
    setIsImportingCsv(true);
    try {
      await batchSaveStudents(selectedCourse.id, parsedPreview);
      setShowCsvModal(false);
      setCsvFile(null);
      setParsedPreview([]);
      setParseErrors([]);
      await loadStudents(selectedCourse.id);
      alert(`นำเข้ารายชื่อนักศึกษาสำเร็จ ${parsedPreview.length} คน`);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกรายชื่อนักศึกษา');
    } finally {
      setIsImportingCsv(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = generateSampleStudentsCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_roster_template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Available academic years
  const availableYears = React.useMemo(() => {
    const years = new Set<string>();
    courses.forEach(c => {
      if (c.academicYear) years.add(c.academicYear);
    });
    ['2569', '2568', '2567'].forEach(y => years.add(y));
    return Array.from(years).sort().reverse();
  }, [courses]);

  const availableSemesters = [
    { value: 'all', label: 'ทุกภาคการศึกษา' },
    { value: '1', label: 'ภาคเรียนที่ 1' },
    { value: '2', label: 'ภาคเรียนที่ 2' },
    { value: 'summer', label: 'ภาคฤดูร้อน' },
  ];

  // Filter courses by semester & year
  const filteredCourses = courses.filter(course => {
    const matchYear = courseFilterYear === 'all' || course.academicYear === courseFilterYear;
    const matchSem = courseFilterSemester === 'all' || course.semester === courseFilterSemester;
    return matchYear && matchSem;
  });

  // Unique sections for selected course
  const courseSections = React.useMemo(() => {
    if (!selectedCourse) return [];
    const secs = new Set<string>();
    if (selectedCourse.sections && selectedCourse.sections.length > 0) {
      selectedCourse.sections.forEach(s => secs.add(s));
    }
    students.forEach(s => {
      if (s.sec) secs.add(s.sec);
    });
    const list = Array.from(secs);
    if (list.length === 0) list.push('Sec 1');
    return list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [selectedCourse, students]);

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchSearch =
      s.studentCode.includes(searchQuery) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.no.includes(searchQuery);
    const matchSec = filterSec === 'all' || s.sec === filterSec;
    return matchSearch && matchSec;
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">จัดการรายวิชาและรายชื่อนักศึกษา</h2>
          <p className="text-xs text-slate-500">
            นำเข้ารายชื่อนักศึกษาผ่านไฟล์ CSV เพื่อใช้ตรวจสอบยืนยันตัวตนตอนส่งงาน (นักศึกษาไม่ต้องล็อกอินอีเมล)
          </p>
        </div>
        <button
          onClick={() => setShowNewCourseModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มรายวิชาใหม่</span>
        </button>
      </div>

      {/* Courses List & Selected Course Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Courses list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              รายวิชา ({filteredCourses.length}/{courses.length})
            </h3>
          </div>

          {/* Course Year & Semester Filter Bar */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>ตัวกรองภาค/ปีการศึกษา</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">ปีการศึกษา</label>
                <select
                  value={courseFilterYear}
                  onChange={e => setCourseFilterYear(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-indigo-600"
                >
                  <option value="all">ทุกปีการศึกษา</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>ปี {yr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">ภาคการศึกษา</label>
                <select
                  value={courseFilterSemester}
                  onChange={e => setCourseFilterSemester(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-indigo-600"
                >
                  {availableSemesters.map(sem => (
                    <option key={sem.value} value={sem.value}>{sem.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {(courseFilterYear !== 'all' || courseFilterSemester !== 'all') && (
              <button
                onClick={() => {
                  setCourseFilterYear('all');
                  setCourseFilterSemester('all');
                }}
                className="text-[11px] text-rose-600 hover:underline font-medium block pt-1"
              >
                ✕ รีเซ็ตตัวกรองวิชา
              </button>
            )}
          </div>

          {isLoadingCourses ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
              <p className="text-xs text-slate-500">กำลังโหลดรายวิชา...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <BookOpen className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">ยังไม่มีรายวิชา</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">กดปุ่มด้านบนเพื่อสร้างรายวิชาแรกของคุณ</p>
              <button
                onClick={() => setShowNewCourseModal(true)}
                className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
              >
                + เพิ่มรายวิชา
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
              ไม่พบรายวิชาในปี/ภาคการศึกษาที่เลือก
            </div>
          ) : (
            filteredCourses.map(course => {
              const isSelected = selectedCourse?.id === course.id;
              return (
                <div
                  key={course.id}
                  onClick={() => {
                    setSelectedCourse(course);
                    loadStudents(course.id);
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-100 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sm text-indigo-700">{course.code}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {course.semester ? `ภาค ${course.semester}` : 'ภาค 1'}/{course.academicYear || '2569'}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 text-sm mt-1">{course.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">กลุ่มเรียน: {course.sections?.join(', ')}</p>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteCourse(course.id);
                      }}
                      className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="ลบรายวิชา"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Columns: Student Roster for selected course */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCourse ? (
            <div className="space-y-4">
              {/* Card Header & Actions */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-slate-900 text-lg">
                      {selectedCourse.code} : {selectedCourse.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    นักศึกษาทั้งหมด {students.length} คน • แยกเป็น {courseSections.length} Section ({courseSections.join(', ')})
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={downloadSampleCsv}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-white text-xs font-medium transition-colors"
                    title="ดาวน์โหลดตัวอย่างไฟล์ CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ตัวอย่าง CSV</span>
                  </button>
                  <button
                    onClick={() => setShowCsvModal(true)}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>นำเข้า CSV รายชื่อ</span>
                  </button>
                </div>
              </div>

              {/* View Switcher & Search Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาด้วยรหัสนักศึกษา, ชื่อ, หรือเลขที่..."
                    className="w-full text-xs py-2.5 pl-9 pr-3 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* View Mode */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setRosterViewMode('separated');
                        setFilterSec('all');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        rosterViewMode === 'separated' && filterSec === 'all'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      แยกแสดงตาม Section
                    </button>
                    <button
                      type="button"
                      onClick={() => setRosterViewMode('combined')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        rosterViewMode === 'combined'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ตารางรวมทุกกลุ่ม
                    </button>
                  </div>

                  <select
                    value={filterSec}
                    onChange={e => {
                      setFilterSec(e.target.value);
                      if (e.target.value !== 'all') {
                        setRosterViewMode('combined');
                      }
                    }}
                    className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white outline-none"
                  >
                    <option value="all">ทุกกลุ่มเรียน (All Sec)</option>
                    {courseSections.map(sec => (
                      <option key={sec} value={sec}>
                        เฉพาะกลุ่ม {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Content: Separated by Section OR Single Combined Table */}
              {isLoadingStudents ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                  <p className="text-xs text-slate-500">กำลังโหลดรายชื่อ...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">ยังไม่มีรายชื่อนักศึกษาในวิชานี้</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    กดปุ่ม "นำเข้า CSV รายชื่อ" ด้านบน เพื่ออัปโหลดรายชื่อนักศึกษาภาษาไทย (UTF-8)
                  </p>
                  <button
                    onClick={() => setShowCsvModal(true)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    นำเข้าไฟล์ CSV ตอนนี้
                  </button>
                </div>
              ) : rosterViewMode === 'separated' && filterSec === 'all' ? (
                // ================= SEPARATED BY SECTION =================
                <div className="space-y-4">
                  {courseSections.map(sec => {
                    const secStudents = filteredStudents.filter(s => s.sec === sec);
                    return (
                      <div key={sec} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        {/* Section Header */}
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                              กลุ่มเรียน / Section: {sec}
                            </span>
                            <span className="text-xs text-slate-600">
                              จำนวนนักศึกษา: <span className="font-semibold text-slate-900">{secStudents.length}</span> คน
                            </span>
                          </div>
                        </div>

                        {/* Section Student Table */}
                        {secStudents.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            ไม่พบรายชื่อในกลุ่มเรียน {sec}
                          </div>
                        ) : (
                          <div className="overflow-x-auto max-h-[400px]">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50/50 text-slate-500 uppercase tracking-wider font-semibold sticky top-0 border-b border-slate-100">
                                <tr>
                                  <th className="py-2.5 px-4 w-14">เลขที่</th>
                                  <th className="py-2.5 px-4">รหัสนักศึกษา</th>
                                  <th className="py-2.5 px-4">ชื่อ-นามสกุล</th>
                                  <th className="py-2.5 px-4">กลุ่มเรียน (Sec)</th>
                                  <th className="py-2.5 px-4">อีเมลสถาบัน</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {secStudents.map(st => (
                                  <tr key={st.studentCode} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-2.5 px-4 font-mono font-medium text-slate-500">{st.no}</td>
                                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-900">{st.studentCode}</td>
                                    <td className="py-2.5 px-4 font-semibold text-slate-800">{st.name}</td>
                                    <td className="py-2.5 px-4">
                                      <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-700">
                                        {st.sec}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 text-slate-400 font-mono">{st.email || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                // ================= COMBINED OR SPECIFIC SEC TABLE =================
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto max-h-[500px]">
                    {filteredStudents.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold sticky top-0 border-b border-slate-100">
                          <tr>
                            <th className="py-3 px-4 w-14">เลขที่</th>
                            <th className="py-3 px-4">รหัสนักศึกษา</th>
                            <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                            <th className="py-3 px-4">กลุ่มเรียน (Sec)</th>
                            <th className="py-3 px-4">อีเมลสถาบัน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredStudents.map(st => (
                            <tr key={st.studentCode} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-4 font-mono font-medium text-slate-500">{st.no}</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-indigo-900">{st.studentCode}</td>
                              <td className="py-2.5 px-4 font-semibold text-slate-800">{st.name}</td>
                              <td className="py-2.5 px-4">
                                <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-700">
                                  {st.sec}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-400 font-mono">{st.email || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm">เลือกหรือสร้างรายวิชาทางด้านซ้ายเพื่อดูและจัดการรายชื่อนักศึกษา</p>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: New Course ================= */}
      {showNewCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">เพิ่มรายวิชาใหม่</h3>
            <p className="text-xs text-slate-500 mb-4">ระบุรหัสวิชา ชื่อวิชา และกลุ่มเรียน</p>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  รหัสวิชา (Course Code) *
                </label>
                <input
                  type="text"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value.toUpperCase())}
                  placeholder="เช่น CS101, IT202"
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  ชื่อวิชา (Course Name) *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="เช่น การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น"
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  กลุ่มเรียน / Sections (คั่นด้วยจุลภาค ,)
                </label>
                <input
                  type="text"
                  value={newSecs}
                  onChange={e => setNewSecs(e.target.value)}
                  placeholder="เช่น Sec 1, Sec 2, Sec 3"
                  className="w-full text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    ภาคการศึกษา
                  </label>
                  <select
                    value={newSemester}
                    onChange={e => setNewSemester(e.target.value)}
                    className="w-full text-sm py-2 px-3 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                    <option value="3">ภาคฤดูร้อน</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    ปีการศึกษา
                  </label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={e => setNewYear(e.target.value)}
                    placeholder="2569"
                    className="w-full text-sm py-2 px-3 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewCourseModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingCourse}
                  className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  {isSavingCourse ? 'กำลังบันทึก...' : 'บันทึกรายวิชา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CSV Import ================= */}
      {showCsvModal && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">นำเข้ารายชื่อนักศึกษาด้วย CSV (UTF-8)</h3>
                <p className="text-xs text-slate-500">
                  สำหรับวิชา: {selectedCourse.code} - {selectedCourse.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCsvModal(false);
                  setParsedPreview([]);
                  setParseErrors([]);
                  setCsvFile(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Upload Area */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCsvSelected}
              accept=".csv"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/50 rounded-2xl p-6 text-center cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                {csvFile ? csvFile.name : 'คลิกเพื่อเลือกไฟล์ CSV รายชื่อนักศึกษา'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                รองรับภาษาไทย (UTF-8) คอลัมน์: เลขที่, รหัสนักศึกษา, ชื่อ-นามสกุล, กลุ่มเรียน (Sec), อีเมล
              </p>
            </div>

            {parseErrors.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1 max-h-28 overflow-y-auto">
                <div className="font-bold flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>ข้อความแจ้งเตือน:</span>
                </div>
                {parseErrors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}

            {/* Preview Parsed Students */}
            {parsedPreview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>ตัวอย่างข้อมูลที่ตรวจพบ ({parsedPreview.length} รายการ):</span>
                  <span className="text-emerald-600 font-bold">✓ พร้อมนำเข้า</span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-48 text-xs">
                  <table className="w-full text-left divide-y divide-slate-100">
                    <thead className="bg-slate-50 font-semibold text-slate-500">
                      <tr>
                        <th className="py-2 px-3">เลขที่</th>
                        <th className="py-2 px-3">รหัส</th>
                        <th className="py-2 px-3">ชื่อ-นามสกุล</th>
                        <th className="py-2 px-3">Sec</th>
                        <th className="py-2 px-3">อีเมล</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedPreview.slice(0, 10).map((p, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-3 font-mono">{p.no}</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-indigo-700">{p.studentCode}</td>
                          <td className="py-1.5 px-3">{p.name}</td>
                          <td className="py-1.5 px-3 font-mono">{p.sec}</td>
                          <td className="py-1.5 px-3 text-slate-400">{p.email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedPreview.length > 10 && (
                    <div className="p-2 text-center text-xs text-slate-400 bg-slate-50">
                      และอีก {parsedPreview.length - 10} รายการ...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="text-xs text-indigo-600 hover:underline font-medium"
              >
                ดาวน์โหลดไฟล์ตัวอย่าง CSV (UTF-8)
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveImportedStudents}
                  disabled={isImportingCsv || parsedPreview.length === 0}
                  className="px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs"
                >
                  {isImportingCsv ? 'กำลังนำเข้าข้อมูล...' : `ยืนยันนำเข้า (${parsedPreview.length} คน)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
