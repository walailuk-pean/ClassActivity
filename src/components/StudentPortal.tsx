import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Search,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Copy,
  Printer,
  ChevronRight,
  FileCheck,
  Info,
  Calendar,
  UserCheck,
} from 'lucide-react';
import { Assignment, Student, SubmissionReceipt, Submission } from '../types';
import { getAssignmentByCode, verifyStudentForAssignment } from '../services/assignmentService';
import { submitAssignment, checkExistingSubmission, evaluateSubmissionStatus } from '../services/submissionService';
import { uploadToGasGoogleDrive, downloadFile } from '../services/gasService';
import { downloadWorksheet } from '../utils/worksheetPdf';
import { downloadReceiptPdf, formatReceiptFileName } from '../utils/receiptPdf';
import { BuBusinessLogo } from './BuLogo';

export const StudentPortal: React.FC = () => {
  // Step state: 1 = Code, 2 = Verify Student ID, 3 = Upload & Submit, 4 = Receipt
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Inputs
  const [assignmentCode, setAssignmentCode] = useState('');
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Loaded Data
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [student, setStudent] = useState<Partial<Student> | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);

  // Status & Loaders
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isVerifyingStudent, setIsVerifyingStudent] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [isDownloadingWorksheet, setIsDownloadingWorksheet] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isDownloadingReceiptPdf, setIsDownloadingReceiptPdf] = useState(false);
  const [downloadReceiptSuccess, setDownloadReceiptSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check URL query parameters for code (e.g. ?code=834921)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam && codeParam.trim().length >= 4) {
      const clean = codeParam.trim().toUpperCase();
      setAssignmentCode(clean);
      handleFetchAssignment(clean);
    }
  }, []);

  // Fetch assignment by 6-digit code
  const handleFetchAssignment = async (codeToFetch?: string) => {
    const code = (codeToFetch || assignmentCode).trim().toUpperCase();
    if (!code) {
      setAssignmentError('กรุณากรอกรหัสงาน 6 หลัก');
      return;
    }

    setIsLoadingAssignment(true);
    setAssignmentError(null);
    try {
      const res = await getAssignmentByCode(code);
      if (res.error || !res.assignment) {
        setAssignmentError(res.error || 'ไม่พบรหัสงานนี้ในระบบ');
        setAssignment(null);
      } else {
        setAssignment(res.assignment);
        setStep(2);
      }
    } catch (err: any) {
      setAssignmentError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoadingAssignment(false);
    }
  };

  // Verify Student ID
  const handleVerifyStudent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!assignment) return;

    const trimmedCode = studentCodeInput.trim();
    if (!trimmedCode) {
      setStudentError('กรุณากรอกรหัสนักศึกษาของคุณ');
      return;
    }

    setIsVerifyingStudent(true);
    setStudentError(null);
    try {
      const res = await verifyStudentForAssignment(assignment.id, trimmedCode);
      if (!res.success || !res.student) {
        setStudentError(res.message || 'ไม่พบรหัสนักศึกษานี้ในรายวิชา');
        setStudent(null);
      } else {
        setStudent(res.student);

        // Check if student already submitted
        const existing = await checkExistingSubmission(assignment.id, trimmedCode);
        setExistingSubmission(existing);

        setStep(3);
      }
    } catch (err: any) {
      setStudentError(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบรหัสนักศึกษา');
    } finally {
      setIsVerifyingStudent(false);
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = (assignment?.maxFileSizeMB || 10) * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(`ขนาดไฟล์เกินกำหนด (สูงสุด ${assignment?.maxFileSizeMB || 10} MB) กรุณาเลือกไฟล์ใหม่`);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setSubmitError(null);
  };

  // Download worksheet safely using universal PDF generator & downloader
  const handleDownloadWorksheet = async () => {
    if (!assignment) return;
    setIsDownloadingWorksheet(true);
    setDownloadSuccess(false);
    try {
      await downloadWorksheet(assignment);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      console.error('Worksheet download error:', err);
      alert('ไม่สามารถดาวน์โหลดใบงานได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsDownloadingWorksheet(false);
    }
  };

  // Submit final work (file upload)
  const handleSubmitWork = async () => {
    if (!assignment || !student) return;

    if (existingSubmission && !selectedFile) {
      setSubmitError('กรุณาเลือกไฟล์งานใหม่ที่คุณต้องการส่ง');
      return;
    }

    if (!selectedFile && !existingSubmission?.fileUrl) {
      setSubmitError('กรุณาเลือกไฟล์งานที่จะส่ง');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setUploadProgressText('กำลังเตรียมข้อมูลการส่งงาน...');

    try {
      let fileUrl = existingSubmission?.fileUrl;
      let fileName = existingSubmission?.fileName;
      let fileSize = existingSubmission?.fileSize;
      let fileType = existingSubmission?.fileType;

      // If uploading a new file
      if (selectedFile) {
        setUploadProgressText('กำลังบันทึกและอัปโหลดไฟล์งาน...');
        const uploadRes = await uploadToGasGoogleDrive({
          file: selectedFile,
          studentCode: student.studentCode || '',
          studentName: student.name,
          assignmentCode: assignment.code,
          assignmentTitle: assignment.title,
          gasUrl: assignment.gasWebAppUrl,
        });

        fileUrl = uploadRes.fileUrl;
        fileName = uploadRes.fileName;
        fileSize = uploadRes.fileSize;
        fileType = uploadRes.fileType;
      }

      setUploadProgressText('กำลังบันทึกข้อมูลและอัปเดตสถานะการส่งงาน...');
      const receiptRes = await submitAssignment({
        assignment,
        student,
        fileUrl,
        fileName,
        fileSize,
        fileType,
      });

      setReceipt(receiptRes);
      setStep(4);

      // Trigger Confetti Celebration!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Safe if confetti fails
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      let errMsg = 'เกิดข้อผิดพลาดในการส่งงาน กรุณาลองใหม่อีกครั้ง';
      if (typeof err?.message === 'string') {
        if (err.message.includes('Missing or insufficient') || err.message.includes('PERMISSION_DENIED')) {
          errMsg = 'ไม่สามารถส่งงานได้ เนื่องจากหมดเวลาส่งหรือระบบจำกัดสิทธิ์ กรุณาติดต่ออาจารย์ผู้สอน';
        } else if (err.message.includes('exceeds maximum size')) {
          errMsg = 'ขนาดไฟล์ใหญ่เกินขีดจำกัด กรุณาลดขนาดไฟล์ก่อนส่ง';
        } else if (err.message.startsWith('{') && err.message.includes('"error"')) {
          try {
            const parsed = JSON.parse(err.message);
            errMsg = parsed.error || errMsg;
          } catch (e) {
            errMsg = err.message;
          }
        } else {
          errMsg = err.message;
        }
      }
      setSubmitError(errMsg);
    } finally {
      setIsSubmitting(false);
      setUploadProgressText('');
    }
  };

  const copyReceiptCode = () => {
    if (!receipt) return;
    navigator.clipboard.writeText(receipt.receiptCode);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const handleDownloadReceiptPdf = async () => {
    if (!receipt) return;
    try {
      setIsDownloadingReceiptPdf(true);
      const filename = await downloadReceiptPdf(receipt);
      setDownloadReceiptSuccess(filename);
      setTimeout(() => setDownloadReceiptSuccess(null), 6000);
    } catch (err: any) {
      console.error('Failed to generate receipt PDF:', err);
      // Fallback to window print in case canvas has unexpected error
      window.print();
    } finally {
      setIsDownloadingReceiptPdf(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setAssignment(null);
    setStudent(null);
    setExistingSubmission(null);
    setReceipt(null);
    setSelectedFile(null);
    setAssignmentCode('');
    setStudentCodeInput('');
  };

  // Evaluate current deadline timing
  const timing = assignment ? evaluateSubmissionStatus(assignment.closeAt, assignment.allowLate) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
      {/* Step Progress Indicators */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
          <span className={step >= 1 ? 'text-indigo-600 font-semibold' : ''}>1. รหัสงาน</span>
          <span className={step >= 2 ? 'text-indigo-600 font-semibold' : ''}>2. ยืนยันตัวตน</span>
          <span className={step >= 3 ? 'text-indigo-600 font-semibold' : ''}>3. แนบไฟล์ส่งงาน</span>
          <span className={step >= 4 ? 'text-indigo-600 font-semibold' : ''}>4. สถานะการส่งงาน</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* ================= STEP 1: Enter Assignment Code ================= */}
      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
              <FileCheck className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ส่งงานในชั้นเรียน</h1>
            <p className="text-sm text-slate-500 mt-1">
              กรอกรหัสงาน 6 หลัก ที่ได้รับจากอาจารย์ผู้สอน (ไม่ต้องล็อกอินอีเมล)
            </p>
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              handleFetchAssignment();
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="assignmentCode" className="block text-sm font-semibold text-slate-700 mb-2 text-center">
                รหัสงาน 6 หลัก (Assignment Code)
              </label>
              <div className="relative max-w-xs mx-auto">
                <input
                  id="assignmentCode"
                  type="text"
                  maxLength={6}
                  value={assignmentCode}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
                    setAssignmentCode(val);
                    setAssignmentError(null);
                  }}
                  placeholder="เช่น 834921"
                  autoFocus
                  className="w-full text-center text-3xl font-mono font-bold tracking-widest py-3 px-4 rounded-xl border-2 border-indigo-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none uppercase transition-all bg-indigo-50/20 text-indigo-900 placeholder:text-slate-300"
                />
              </div>
            </div>

            {assignmentError && (
              <div className="flex items-center space-x-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{assignmentError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoadingAssignment || assignmentCode.trim().length < 4}
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-100 transition-all text-base"
            >
              {isLoadingAssignment ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>กำลังค้นหางาน...</span>
                </>
              ) : (
                <>
                  <span>ค้นหางาน</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ================= STEP 2: Verify Student ID ================= */}
      {step === 2 && assignment && (
        <div className="space-y-4">
          {/* Assignment Header Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 font-medium">
                  {assignment.courseCode} : {assignment.courseName}
                </span>
                <span className="font-mono text-sm bg-indigo-500/30 px-2 py-0.5 rounded border border-indigo-400/30 font-bold">
                  #{assignment.code}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">{assignment.title}</h2>
              {assignment.description && (
                <p className="text-sm text-slate-200 line-clamp-2 mb-3">{assignment.description}</p>
              )}

              {/* Deadline & Status */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-2 border-t border-white/10">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                  <span>กำหนดส่ง: {new Date(assignment.closeAt).toLocaleString('th-TH')}</span>
                </div>
                {timing?.status === 'on_time' ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-medium">
                    เปิดรับงาน (ตรงเวลา)
                  </span>
                ) : timing?.allowed ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 font-medium">
                    เกินกำหนด (ส่งช้า)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 font-medium">
                    ปิดรับงานแล้ว
                  </span>
                )}
              </div>

              {/* Download Worksheet Prominent Banner */}
              {(assignment.worksheetUrl || assignment.worksheetName || assignment.code === '834921') && (
                <div className="mt-5 pt-4 border-t border-white/20">
                  <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 rounded-2xl p-4 sm:p-4.5 text-white shadow-lg border-2 border-amber-300/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/40 text-white shadow-inner">
                        <Download className="w-6 h-6 animate-bounce" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-amber-950 shadow-xs">
                            ไฟล์ใบงานประจำกิจกรรม
                          </span>
                          <span className="text-xs text-amber-100 font-medium">Worksheet</span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold mt-0.5 text-white leading-tight">
                          {assignment.worksheetName || 'ใบงานประจำบทเรียน (PDF)'}
                        </h4>
                        <p className="text-[11px] text-amber-100">
                          คลิกปุ่มดาวน์โหลดเพื่อบันทึกไฟล์ใบงานลงเครื่องและเปิดดูโจทย์
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadWorksheet}
                      disabled={isDownloadingWorksheet}
                      className="inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-white text-amber-950 hover:bg-amber-50 font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all shrink-0 active:scale-95 ring-2 ring-white/80 cursor-pointer disabled:opacity-80"
                    >
                      {isDownloadingWorksheet ? (
                        <>
                          <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                          <span>กำลังดาวน์โหลด...</span>
                        </>
                      ) : downloadSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-emerald-800">ดาวน์โหลดสำเร็จ!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>กดดาวน์โหลดใบงาน</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Student Verification Input Box */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">ขั้นตอนที่ 2: ยืนยันตัวตนด้วยรหัสนักศึกษา</h3>
                <p className="text-xs text-slate-500">ระบบจะตรวจสอบชื่อและกลุ่มเรียน (Sec) จากรายชื่อที่อาจารย์นำเข้า</p>
              </div>
            </div>

            <form onSubmit={handleVerifyStudent} className="space-y-4">
              <div>
                <label htmlFor="studentCode" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  รหัสนักศึกษา (Student ID)
                </label>
                <input
                  id="studentCode"
                  type="text"
                  value={studentCodeInput}
                  onChange={e => {
                    setStudentCodeInput(e.target.value.trim());
                    setStudentError(null);
                  }}
                  placeholder="เช่น 1650701001"
                  autoFocus
                  className="w-full text-lg font-mono font-semibold py-3 px-4 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {studentError && (
                <div className="flex items-start space-x-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{studentError}</span>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-3 px-4 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
                >
                  เปลี่ยนรหัสงาน
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingStudent || !studentCodeInput.trim()}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-100 transition-all text-sm"
                >
                  {isVerifyingStudent ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังตรวจสอบข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <span>ตรวจสอบข้อมูลนักศึกษา</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= STEP 3: Confirm Identity & Submit Work ================= */}
      {step === 3 && assignment && student && (
        <div className="space-y-4">
          {/* Verified Student Badge Card */}
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800">
                      ตรวจสอบผ่านแล้ว
                    </span>
                    <span className="text-xs text-emerald-700 font-mono">Sec: {student.sec}</span>
                  </div>
                  <h3 className="text-lg font-bold text-emerald-950 mt-0.5">{student.name}</h3>
                  <div className="text-xs text-emerald-800 font-mono space-x-3 mt-0.5">
                    <span>รหัส: {student.studentCode}</span>
                    <span>เลขที่: {student.no}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-emerald-700 hover:text-emerald-900 underline font-medium"
              >
                แก้ไข
              </button>
            </div>
          </div>

          {/* Existing Submission Warning if resubmitting */}
          {existingSubmission && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5 shadow-xs">
              <div className="flex items-center space-x-2 font-bold text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>คุณเคยส่งงานนี้แล้วเมื่อ {new Date(existingSubmission.submittedAt).toLocaleString('th-TH')}</span>
              </div>
              <p className="text-amber-800">
                รหัสอ้างอิงเดิม: <span className="font-mono font-bold">{existingSubmission.receiptCode}</span> (ไฟล์เดิม:{' '}
                <span className="font-medium underline">{existingSubmission.fileName || 'ไฟล์ที่ส่งไว้'}</span>)
              </p>
              {assignment.allowResubmit !== false ? (
                <div className="bg-emerald-100/70 text-emerald-800 rounded-xl px-3 py-2 font-medium flex items-center space-x-2 mt-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>สามารถส่งไฟล์งานใหม่แทนที่ของเดิมได้ กรุณาเลือกไฟล์งานใหม่ด้านล่างแล้วกดส่ง</span>
                </div>
              ) : (
                <p className="text-rose-600 font-medium">
                  ✕ งานนี้อาจารย์ไม่อนุญาตให้ส่งซ้ำ คุณไม่สามารถส่งงานใหม่ได้
                </p>
              )}
            </div>
          )}

          {/* Main Upload Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {existingSubmission ? 'ขั้นตอนที่ 3: เลือกไฟล์งานใหม่เพื่อส่งแทนที่' : 'ขั้นตอนที่ 3: แนบไฟล์งาน'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              รองรับไฟล์ PDF, Word (.docx), รูปภาพ (JPG, PNG) ขนาดไม่เกิน {assignment.maxFileSizeMB || 10} MB
            </p>

            {/* File Upload Box */}
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onClick={e => {
                  (e.target as HTMLInputElement).value = '';
                }}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  selectedFile
                    ? 'border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-50'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${
                  selectedFile ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  {selectedFile ? <CheckCircle2 className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                </div>
                {selectedFile ? (
                  <div>
                    <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full mb-1">
                      {existingSubmission ? '✓ เลือกไฟล์ใหม่เรียบร้อยแล้ว' : '✓ เลือกไฟล์เรียบร้อยแล้ว'}
                    </span>
                    <p className="font-bold text-slate-900 text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      ขนาด: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB (คลิกเพื่อเปลี่ยนไฟล์ใหม่)
                    </p>
                  </div>
                ) : existingSubmission ? (
                  <div>
                    <p className="font-semibold text-indigo-700 text-sm">แตะหรือคลิกที่นี่เพื่อเลือกไฟล์งานใหม่</p>
                    <p className="text-xs text-slate-500 mt-1">
                      เลือกไฟล์ใหม่จากเครื่องของคุณเพื่อส่งแทนที่ไฟล์เดิม (สูงสุด {assignment.maxFileSizeMB || 10} MB)
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">แตะหรือคลิกเพื่อเลือกไฟล์งาน</p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF, DOCX, JPG, PNG (ขนาดไม่เกิน {assignment.maxFileSizeMB || 10} MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {submitError && (
              <div className="mt-4 flex items-center space-x-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit Action Button */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex space-x-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                className="py-3 px-4 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={handleSubmitWork}
                disabled={
                  isSubmitting ||
                  Boolean(existingSubmission && assignment.allowResubmit === false) ||
                  !selectedFile
                }
                className={`flex-1 flex items-center justify-center space-x-2 py-3.5 px-6 rounded-xl font-medium text-white transition-all text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  existingSubmission && selectedFile
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{uploadProgressText || 'กำลังส่งงาน...'}</span>
                  </>
                ) : existingSubmission ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{selectedFile ? 'ยืนยันการส่งไฟล์งานใหม่ (แทนที่ของเดิม)' : 'เลือกไฟล์ใหม่ก่อนส่ง'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>ยืนยันการส่งงาน</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 4: Digital Receipt ================= */}
      {step === 4 && receipt && (
        <div className="space-y-6">
          {/* Receipt Print Container */}
          <div
            id="submission-receipt"
            className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8 relative overflow-hidden"
          >
            {/* Top Pattern Decorator */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />

            {/* BU Business Administration Official Brand Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
              <BuBusinessLogo size="md" />
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  OFFICIAL RECEIPT
                </span>
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-[#bc1b11] border border-rose-200">
                  A5 FORMAT
                </span>
              </div>
            </div>

            <div className="text-center pt-1 pb-6 border-b border-dashed border-slate-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">ส่งงานสำเร็จเรียบร้อย!</h2>
              <p className="text-xs text-slate-500 mt-1">หลักฐานส่งงานในชั้นเรียน (Class Activity Submission Confirmation)</p>
            </div>

            {/* Receipt Main Details */}
            <div className="py-6 space-y-4">
              {/* Receipt Code Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                <span className="text-xs text-slate-500 block mb-1">หมายเลขอ้างอิงสถานะการส่งงาน (Reference Code)</span>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-xl sm:text-2xl font-mono font-bold text-indigo-700 tracking-wider">
                    {receipt.receiptCode}
                  </span>
                  <button
                    onClick={copyReceiptCode}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                    title="คัดลอกรหัสอ้างอิงสถานะ"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copiedReceipt && <span className="text-xs text-emerald-600 font-medium">✓ คัดลอกแล้ว</span>}
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">วิชา</span>
                  <span className="font-semibold text-slate-800">{receipt.courseCode}</span>
                  <p className="text-xs text-slate-500">{receipt.courseName}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">งานที่ส่ง</span>
                  <span className="font-semibold text-slate-800">{receipt.assignmentTitle}</span>
                  <p className="text-xs text-slate-500 font-mono">รหัสงาน: #{receipt.assignmentCode}</p>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block">ผู้ส่งงาน</span>
                  <span className="font-semibold text-slate-800">{receipt.studentName}</span>
                  <p className="text-xs text-slate-500 font-mono">
                    รหัส: {receipt.studentCode} | Sec: {receipt.sec} | เลขที่: {receipt.studentNo}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block">วัน-เวลาที่ส่ง</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(receipt.submittedAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <p className="text-xs font-mono text-slate-600">
                    {new Date(receipt.submittedAt).toLocaleTimeString('th-TH')} น.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-sm">
                <span className="text-slate-500">สถานะการส่ง:</span>
                <span
                  className={`font-semibold px-3 py-1 rounded-full text-xs ${
                    receipt.status === 'on_time'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {receipt.status === 'on_time' ? '✓ ส่งตรงเวลา' : '⚠ ส่งช้า (หลังกำหนดเวลา)'}
                </span>
              </div>

              {receipt.fileName && (
                <div className="text-xs text-slate-600 flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">ไฟล์ที่ส่ง: {receipt.fileName}</span>
                  </div>
                  {receipt.fileUrl && (
                    <button
                      type="button"
                      onClick={() => downloadFile(receipt.fileUrl, receipt.fileName)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline shrink-0 ml-2"
                    >
                      ดาวน์โหลดไฟล์งาน
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Receipt Footer Notice */}
            <div className="text-center pt-4 border-t border-dashed border-slate-200 text-xs text-slate-400">
              กรุณาบันทึกภาพหน้าจอนี้ไว้เป็นหลักฐานยืนยันสถานะการส่งงานในชั้นเรียน
            </div>
          </div>

          {/* Download Success Alert */}
          {downloadReceiptSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs flex items-center space-x-3 shadow-xs animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-semibold block text-emerald-950">ดาวน์โหลดหลักฐานการส่งงานสำเร็จ (A5 แนวตั้ง)</span>
                <span className="font-mono text-slate-600 truncate block mt-0.5">{downloadReceiptSuccess}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleDownloadReceiptPdf}
              disabled={isDownloadingReceiptPdf}
              className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-xs"
            >
              {isDownloadingReceiptPdf ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้างเอกสาร PDF (A5)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดหลักฐานการส่งงาน</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={resetFlow}
              className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <span>ส่งงานรายการอื่น</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
