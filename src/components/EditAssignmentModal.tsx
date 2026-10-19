import React, { useState } from 'react';
import { X, Upload, Calendar, Clock, FileText, Check, AlertCircle, RefreshCw, Trash2, Download } from 'lucide-react';
import { Course, Assignment } from '../types';
import { generateAssignmentCode } from '../services/assignmentService';
import { uploadToGasGoogleDrive } from '../services/gasService';

interface EditAssignmentModalProps {
  assignment: Assignment;
  courses: Course[];
  gasWebAppUrl?: string;
  onClose: () => void;
  onSuccess: (updatedAssignment: Assignment) => void;
}

export const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({
  assignment,
  courses,
  gasWebAppUrl,
  onClose,
  onSuccess,
}) => {
  const [courseId, setCourseId] = useState(assignment.courseId || courses[0]?.id || '');
  const [title, setTitle] = useState(assignment.title || '');
  const [description, setDescription] = useState(assignment.description || '');
  const [code, setCode] = useState(assignment.code || '');
  const [status, setStatus] = useState<'open' | 'closed' | 'scheduled'>(assignment.status || 'open');
  const [selectedSecs, setSelectedSecs] = useState<string[]>(
    assignment.sections && assignment.sections.length > 0 ? assignment.sections : ['ทั้งหมด']
  );

  // Format datetime-local string
  const formatForInput = (isoStr?: string) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [openAt, setOpenAt] = useState(formatForInput(assignment.openAt));
  const [closeAt, setCloseAt] = useState(formatForInput(assignment.closeAt));
  const [allowLate, setAllowLate] = useState(assignment.allowLate ?? true);
  const [allowResubmit, setAllowResubmit] = useState(assignment.allowResubmit ?? true);
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(assignment.maxFileSizeMB || 10);
  const [allowedTypes, setAllowedTypes] = useState<('pdf' | 'doc' | 'image' | 'link')[]>(
    assignment.allowedTypes && assignment.allowedTypes.length > 0
      ? assignment.allowedTypes
      : ['pdf', 'doc', 'image', 'link']
  );

  // Worksheet state
  const [worksheetFile, setWorksheetFile] = useState<File | null>(null);
  const [existingWorksheetUrl, setExistingWorksheetUrl] = useState(assignment.worksheetUrl || '');
  const [existingWorksheetName, setExistingWorksheetName] = useState(assignment.worksheetName || '');
  const [removeExistingWorksheet, setRemoveExistingWorksheet] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCourse = courses.find(c => c.id === courseId) || courses[0];

  // Available sections for chosen course
  const availableSections = selectedCourse?.sections && selectedCourse.sections.length > 0
    ? selectedCourse.sections
    : ['Sec 1', 'Sec 2'];

  const toggleType = (t: 'pdf' | 'doc' | 'image' | 'link') => {
    if (allowedTypes.includes(t)) {
      if (allowedTypes.length > 1) {
        setAllowedTypes(allowedTypes.filter(x => x !== t));
      }
    } else {
      setAllowedTypes([...allowedTypes, t]);
    }
  };

  const toggleSection = (sec: string) => {
    if (sec === 'ทั้งหมด') {
      setSelectedSecs(['ทั้งหมด']);
      return;
    }

    let next = selectedSecs.filter(s => s !== 'ทั้งหมด');
    if (next.includes(sec)) {
      next = next.filter(s => s !== sec);
      if (next.length === 0) next = ['ทั้งหมด'];
    } else {
      next.push(sec);
    }
    setSelectedSecs(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('กรุณากรอกชื่องาน');
      return;
    }
    if (!code.trim() || code.trim().length !== 6) {
      setError('รหัสงานต้องเป็นตัวเลขหรือตัวอักษร 6 หลัก');
      return;
    }
    if (!selectedCourse) {
      setError('กรุณาเลือกรายวิชา');
      return;
    }
    if (new Date(closeAt) <= new Date(openAt)) {
      setError('วัน-เวลาปิดรับต้องอยู่หลังวัน-เวลาเปิดรับงาน');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let finalWorksheetUrl = removeExistingWorksheet ? '' : existingWorksheetUrl;
      let finalWorksheetName = removeExistingWorksheet ? '' : existingWorksheetName;

      // If new file attached, upload to Drive via GAS
      if (worksheetFile) {
        finalWorksheetName = worksheetFile.name;
        const uploadRes = await uploadToGasGoogleDrive({
          file: worksheetFile,
          studentCode: 'instructor',
          studentName: 'Worksheet',
          assignmentCode: code.trim().toUpperCase(),
          assignmentTitle: title.trim(),
          gasUrl: gasWebAppUrl,
        });
        finalWorksheetUrl = uploadRes.fileUrl;
      }

      const updatedAssignment: Assignment = {
        ...assignment,
        courseId: selectedCourse.id,
        courseCode: selectedCourse.code,
        courseName: selectedCourse.name,
        academicYear: selectedCourse.academicYear || assignment.academicYear || '',
        semester: selectedCourse.semester || assignment.semester || '',
        title: title.trim(),
        description: description.trim(),
        code: code.trim().toUpperCase(),
        sections: selectedSecs,
        allowedTypes,
        maxFileSizeMB,
        openAt: new Date(openAt).toISOString(),
        closeAt: new Date(closeAt).toISOString(),
        allowLate,
        allowResubmit,
        status,
        worksheetUrl: finalWorksheetUrl,
        worksheetName: finalWorksheetName,
      };

      onSuccess(updatedAssignment);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถบันทึกการแก้ไขงานได้');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span>แก้ไขงานที่มอบหมาย</span>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800">
                #{assignment.code}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ปรับปรุงรายละเอียดงาน กำหนดส่ง และเงื่อนไขการส่งงาน
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center space-x-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Course Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              รายวิชา *
            </label>
            <select
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none bg-white font-medium"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name} {c.semester ? `(ภาค ${c.semester}/${c.academicYear})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Title & 6-Digit Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                ชื่องานที่มอบหมาย *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="เช่น การบ้านบทที่ 3, Week 9 : Class Activity 6"
                className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                รหัสงาน 6 หลัก
              </label>
              <div className="flex space-x-1">
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="w-full text-center text-sm font-mono font-bold py-2.5 px-2 rounded-xl border border-indigo-300 bg-indigo-50/30 text-indigo-900 focus:border-indigo-600 outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setCode(generateAssignmentCode())}
                  title="สุ่มรหัสใหม่"
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-medium border border-indigo-200"
                >
                  สุ่ม
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              คำอธิบาย / รายละเอียดคำสั่ง
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="รายละเอียดงาน หรือคำแนะนำ เช่น เซฟไฟล์ด้วย 'รหัสนักศึกษา_ชื่อนักศึกษา_CA6_เลขที่'"
              className="w-full text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>

          {/* Status & Sections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                สถานะการเปิดรับงาน
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none bg-white font-medium"
              >
                <option value="open">🟢 กำลังเปิดรับ (Open)</option>
                <option value="closed">🔴 ปิดรับงานแล้ว (Closed)</option>
                <option value="scheduled">🟡 กำหนดเวลาเปิดล่วงหน้า (Scheduled)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                กลุ่มเรียนที่เปิดรับ (Section)
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => toggleSection('ทั้งหมด')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    selectedSecs.includes('ทั้งหมด')
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ทั้งหมด
                </button>
                {availableSections.map(sec => {
                  const isChecked = selectedSecs.includes(sec);
                  return (
                    <button
                      type="button"
                      key={sec}
                      onClick={() => toggleSection(sec)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sec}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Datetime Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                วัน-เวลาเปิดรับงาน
              </label>
              <input
                type="datetime-local"
                value={openAt}
                onChange={e => setOpenAt(e.target.value)}
                className="w-full text-xs sm:text-sm py-2.5 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                วัน-เวลาปิดรับงาน (กำหนดส่ง) *
              </label>
              <input
                type="datetime-local"
                value={closeAt}
                onChange={e => setCloseAt(e.target.value)}
                className="w-full text-xs sm:text-sm py-2.5 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none"
                required
              />
            </div>
          </div>

          {/* Toggles: Allow Late, Allow Resubmit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={allowLate}
                onChange={e => setAllowLate(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">อนุญาตให้ส่งช้า (Late)</span>
                <span className="text-slate-500">บันทึกเป็นสถานะ "ส่งช้า" หากส่งหลังกำหนด</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={allowResubmit}
                onChange={e => setAllowResubmit(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">อนุญาตให้ส่งซ้ำก่อนปิดรับ</span>
                <span className="text-slate-500">ใช้ไฟล์ล่าสุดแทนที่ของเดิมอัตโนมัติ</span>
              </div>
            </label>
          </div>

          {/* Allowed File Types */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              ประเภทไฟล์ที่รับ
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'pdf', label: 'PDF (.pdf)' },
                { key: 'doc', label: 'Word (.docx/.doc)' },
                { key: 'image', label: 'รูปภาพ (JPG/PNG)' },
                { key: 'link', label: 'ลิงก์งาน (URL)' },
              ].map(t => {
                const active = allowedTypes.includes(t.key as any);
                return (
                  <button
                    type="button"
                    key={t.key}
                    onClick={() => toggleType(t.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Worksheet File Section */}
          <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3">
            <span className="text-xs font-semibold text-indigo-900 block">
              ไฟล์ใบงานแนบ (Worksheet)
            </span>

            {/* Current attached worksheet */}
            {existingWorksheetUrl && !removeExistingWorksheet && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-indigo-200">
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-medium text-slate-800 truncate">
                    {existingWorksheetName || 'ไฟล์ใบงานปัจจุบัน'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <a
                    href={existingWorksheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                    title="เปิดดูไฟล์"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setRemoveExistingWorksheet(true)}
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded text-xs flex items-center space-x-1"
                    title="ลบใบงานนี้ออก"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบใบงาน</span>
                  </button>
                </div>
              </div>
            )}

            {removeExistingWorksheet && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                <span>ใบงานเดิมจะถูกนำออกเมื่อบันทึก</span>
                <button
                  type="button"
                  onClick={() => setRemoveExistingWorksheet(false)}
                  className="font-medium underline hover:text-rose-900"
                >
                  ยกเลิกการลบ
                </button>
              </div>
            )}

            <div>
              <label className="text-[11px] text-slate-600 block mb-1">
                {existingWorksheetUrl && !removeExistingWorksheet
                  ? 'อัปโหลดไฟล์ใหม่เพื่อแทนที่ (ถ้าต้องการเปลี่ยน):'
                  : 'เลือกไฟล์ใบงานแนบใหม่ (PDF, DOCX, รูปภาพ):'}
              </label>
              <input
                type="file"
                id="edit-worksheet-upload"
                onChange={e => setWorksheetFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
              />
              {worksheetFile && (
                <span className="text-xs text-emerald-700 font-medium block mt-1.5">
                  ✓ จะอัปโหลดไฟล์ใหม่: {worksheetFile.name} ({(worksheetFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md shadow-indigo-100 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกการแก้ไข...</span>
                </>
              ) : (
                <span>บันทึกการแก้ไข</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
