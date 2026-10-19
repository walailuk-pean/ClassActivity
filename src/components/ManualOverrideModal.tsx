import React, { useState } from 'react';
import { X, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Submission, SubmissionStatus } from '../types';
import { overrideSubmission } from '../services/submissionService';

interface ManualOverrideModalProps {
  submission: Submission;
  assignmentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManualOverrideModal: React.FC<ManualOverrideModalProps> = ({
  submission,
  assignmentId,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState<SubmissionStatus>(submission.status);
  const [score, setScore] = useState<string>(
    submission.score !== null && submission.score !== undefined ? String(submission.score) : ''
  );
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [instructorNotes, setInstructorNotes] = useState(submission.instructorNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const parsedScore = score.trim() !== '' ? parseFloat(score) : null;
      await overrideSubmission(assignmentId, submission.studentCode, {
        status,
        score: parsedScore,
        feedback: feedback.trim(),
        instructorNotes: instructorNotes.trim(),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถปรับปรุงข้อมูลได้');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">แก้ไขสถานะ / ให้คะแนน (Manual Override)</h3>
            <p className="text-xs text-slate-500">
              {submission.studentName} ({submission.studentCode}) - {submission.sec}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              สถานะการส่งงาน *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'on_time', label: 'ส่งตรงเวลา', color: 'emerald' },
                { value: 'late', label: 'ส่งช้า', color: 'amber' },
                { value: 'missing', label: 'ไม่ส่งงาน', color: 'rose' },
                { value: 'excused', label: 'ลากิจ', color: 'blue' },
                { value: 'sick', label: 'ลาป่วย', color: 'purple' },
              ].map(st => (
                <button
                  type="button"
                  key={st.value}
                  onClick={() => setStatus(st.value as SubmissionStatus)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-left transition-all ${
                    status === st.value
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-900 ring-2 ring-indigo-100 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block">{st.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Score Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              คะแนน (ถ้ามี)
            </label>
            <input
              type="number"
              step="any"
              value={score}
              onChange={e => setScore(e.target.value)}
              placeholder="เช่น 10 หรือ 8.5"
              className="w-full text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none"
            />
          </div>

          {/* Feedback to Student */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              ข้อเสนอแนะสำหรับนักศึกษา (Feedback)
            </label>
            <textarea
              rows={2}
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="เช่น ทำงานได้เรียบร้อย ชัดเจน..."
              className="w-full text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none"
            />
          </div>

          {/* Instructor Internal Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              บันทึกช่วยจำของอาจารย์ (ไม่แสดงให้นักศึกษา)
            </label>
            <input
              type="text"
              value={instructorNotes}
              onChange={e => setInstructorNotes(e.target.value)}
              placeholder="เช่น แจ้งลาทางไลน์ล่วงหน้า, ส่งไฟล์ผ่านอีเมลเมื่อ 10:00"
              className="w-full text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
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
