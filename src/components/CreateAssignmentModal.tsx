import React, { useState } from 'react';
import { X, Upload, Calendar, Clock, FileText, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Course, Assignment } from '../types';
import { generateAssignmentCode, saveAssignment } from '../services/assignmentService';
import { uploadToGasGoogleDrive } from '../services/gasService';

interface CreateAssignmentModalProps {
  courses: Course[];
  instructorId: string;
  instructorEmail: string;
  gasWebAppUrl?: string;
  onClose: () => void;
  onSuccess: (assignment: Assignment) => void;
}

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  courses,
  instructorId,
  instructorEmail,
  gasWebAppUrl,
  onClose,
  onSuccess,
}) => {
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState(generateAssignmentCode());
  const [selectedSecs, setSelectedSecs] = useState<string[]>(['ทั้งหมด']);
  
  // Format local datetime strings for defaults
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const formatDatetimeLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [openAt, setOpenAt] = useState(formatDatetimeLocal(now));
  const [closeAt, setCloseAt] = useState(formatDatetimeLocal(nextWeek));
  const [allowLate, setAllowLate] = useState(true);
  const [allowResubmit, setAllowResubmit] = useState(true);
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(10);
  const [allowedTypes, setAllowedTypes] = useState<('pdf' | 'doc' | 'image' | 'link')[]>([
    'pdf',
    'doc',
    'image',
    'link',
  ]);

  // Worksheet
  const [worksheetFile, setWorksheetFile] = useState<File | null>(null);
  const [worksheetUrl, setWorksheetUrl] = useState('');
  const [worksheetName, setWorksheetName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCourse = courses.find(c => c.id === courseId);

  const toggleType = (t: 'pdf' | 'doc' | 'image' | 'link') => {
    if (allowedTypes.includes(t)) {
      if (allowedTypes.length > 1) {
        setAllowedTypes(allowedTypes.filter(x => x !== t));
      }
    } else {
      setAllowedTypes([...allowedTypes, t]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('กรุณากรอกชื่องาน');
      return;
    }
    if (!courseId || !selectedCourse) {
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
      let finalWorksheetUrl = worksheetUrl;
      let finalWorksheetName = worksheetName;

      // Upload worksheet to Google Drive via GAS if attached
      if (worksheetFile) {
        finalWorksheetName = worksheetFile.name;
        const uploadRes = await uploadToGasGoogleDrive({
          file: worksheetFile,
          studentCode: 'instructor',
          studentName: 'Worksheet',
          assignmentCode: code,
          assignmentTitle: title,
          gasUrl: gasWebAppUrl,
        });
        finalWorksheetUrl = uploadRes.fileUrl;
      }

      const newAssignment = await saveAssignment({
        courseId: selectedCourse.id,
        courseCode: selectedCourse.code,
        courseName: selectedCourse.name,
        academicYear: selectedCourse.academicYear || '',
        semester: selectedCourse.semester || '',
        title: title.trim(),
        description: description.trim(),
        code: code.trim(),
        sections: selectedSecs,
        allowedTypes,
        maxFileSizeMB,
        openAt: new Date(openAt).toISOString(),
        closeAt: new Date(closeAt).toISOString(),
        allowLate,
        allowResubmit,
        worksheetUrl: finalWorksheetUrl || '',
        worksheetName: finalWorksheetName || '',
        status: 'open',
        instructorId,
        instructorEmail,
        gasWebAppUrl: gasWebAppUrl || '',
      });

      onSuccess(newAssignment);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถสร้างงานได้');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">สร้างงานที่มอบหมายใหม่</h3>
            <p className="text-xs text-slate-500">สร้างรหัสงาน 6 หลัก และกำหนดเงื่อนไขการส่งงาน</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center space-x-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
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
                  {c.code} - {c.name}
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
                placeholder="เช่น การบ้านบทที่ 3, มินิโปรเจกต์กลุ่ม"
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
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs"
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
              placeholder="รายละเอียดงาน เช่น ให้นักศึกษาทำแบบฝึกหัดข้อ 1-5 หรือสรุปบทความ..."
              className="w-full text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={allowLate}
                onChange={e => setAllowLate(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">อนุญาตให้ส่งช้า (Late)</span>
                <span className="text-slate-500">บันทึกเป็นสถานะ "ส่งช้า"</span>
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
                <span className="text-slate-500">ใช้ไฟล์ล่าสุดแทนที่ของเดิม</span>
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

          {/* Worksheet Upload (Stored in Google Drive via GAS) */}
          <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-2">
            <span className="text-xs font-semibold text-indigo-900 block">
              แนบไฟล์ใบงาน (Worksheet) ให้นักศึกษาดาวน์โหลด (ถ้ามี)
            </span>
            <p className="text-xs text-slate-500">
              ไฟล์จะถูกเก็บใน Google Drive ผ่าน Google Apps Script นักศึกษาสามารถดาวน์โหลดได้จากหน้าส่งงาน
            </p>
            <div className="flex items-center space-x-3">
              <input
                type="file"
                id="worksheet-upload"
                onChange={e => setWorksheetFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
              />
            </div>
            {worksheetFile && (
              <span className="text-xs text-emerald-700 font-medium block">
                ✓ เลือกไฟล์: {worksheetFile.name} ({(worksheetFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
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
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md shadow-indigo-100"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกและซิงค์ข้อมูล...</span>
                </>
              ) : (
                <span>สร้างงานที่มอบหมาย</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
