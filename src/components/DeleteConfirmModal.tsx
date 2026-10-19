import React from 'react';
import { AlertTriangle, Trash2, X, RefreshCw } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  itemTitle: string;
  itemCode?: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title = 'ยืนยันการลบงานที่มอบหมาย',
  itemTitle,
  itemCode,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-scale-in">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?
          </p>
          <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold text-slate-800 break-words">{itemTitle}</p>
            {itemCode && (
              <p className="text-xs font-mono text-indigo-700 mt-1">รหัสงาน: #{itemCode}</p>
            )}
          </div>
          <p className="text-xs text-rose-600 mt-3 flex items-center space-x-1">
            <span>⚠️</span>
            <span>การลบจะไม่สามารถกู้คืนได้ และข้อมูลการส่งงานที่เกี่ยวข้องจะถูกลบ</span>
          </p>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-md shadow-rose-100 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังลบข้อมูล...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันการลบ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
