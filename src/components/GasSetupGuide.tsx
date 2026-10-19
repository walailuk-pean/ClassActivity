import React, { useState } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderTree,
  FileCode,
  Github,
  Globe,
} from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE, testGasConnection } from '../services/gasService';

interface GasSetupGuideProps {
  currentUrl?: string;
  onSaveUrl: (url: string) => Promise<void>;
}

export const GasSetupGuide: React.FC<GasSetupGuideProps> = ({ currentUrl = '', onSaveUrl }) => {
  const [gasUrl, setGasUrl] = useState(currentUrl);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTest = async () => {
    if (!gasUrl.trim()) {
      setTestResult({ ok: false, message: 'กรุณาวาง URL ของ Google Apps Script ก่อนทดสอบ' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGasConnection(gasUrl.trim());
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || 'ไม่สามารถเชื่อมต่อได้' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveUrl(gasUrl.trim());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      alert('ไม่สามารถบันทึกการตั้งค่าได้');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title & Banner */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-emerald-300">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Firebase Spark Plan (Free) Compliant</span>
          </div>
          <h2 className="text-2xl font-bold">ระบบจัดเก็บไฟล์ Google Drive ผ่าน Google Apps Script</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            จัดเก็บไฟล์การบ้านและใบงานของนักศึกษาลงใน Google Drive ของอาจารย์โดยตรงผ่าน Google Apps Script Web App
            ฟรี 100% ไม่ต้องอัปเกรดเป็น Firebase Blaze Plan และไม่ต้องใช้ Google Cloud Run
          </p>
        </div>
      </div>

      {/* URL Input & Connection Tester */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <Globe className="w-5 h-5 text-indigo-600" />
          <span>URL เว็บแอป Google Apps Script ของอาจารย์</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Web App URL (https://script.google.com/macros/s/.../exec)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={gasUrl}
              onChange={e => {
                setGasUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
              className="flex-1 text-sm py-2.5 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none font-mono"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !gasUrl.trim()}
                className="px-4 py-2.5 text-xs font-medium rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center space-x-1.5 shrink-0"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>ทดสอบการเชื่อมต่อ</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors shrink-0 shadow-xs"
              >
                {isSaving ? 'กำลังบันทึก...' : 'บันทึก URL'}
              </button>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>บันทึกการตั้งค่า Google Apps Script เรียบร้อยแล้ว! งานใหม่จะบันทึกลง Google Drive ของอาจารย์ทันที</span>
          </div>
        )}

        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${
              testResult.ok
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* 4-Step Setup Guide */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <FolderTree className="w-5 h-5 text-indigo-600" />
          <span>ขั้นตอนการติดตั้ง Google Apps Script (ทำเพียงครั้งเดียว ภายใน 2 นาที)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Step 1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h4 className="font-bold text-slate-900">เปิด Google Apps Script</h4>
            </div>
            <p className="text-slate-600 leading-relaxed">
              ไปที่{' '}
              <a
                href="https://script.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 font-semibold underline inline-flex items-center space-x-1"
              >
                <span>script.google.com</span>
                <ExternalLink className="w-3 h-3 inline" />
              </a>{' '}
              ด้วยบัญชีกูเกิลของอาจารย์ แล้วกดปุ่ม <strong>"New Project" (โปรเจกต์ใหม่)</strong>
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </span>
              <h4 className="font-bold text-slate-900">วางโค้ดที่เตรียมไว้</h4>
            </div>
            <p className="text-slate-600 leading-relaxed">
              ลบโค้ดเริ่มต้นในไฟล์ <code>Code.gs</code> ออกทั้งหมด แล้วกดปุ่ม <strong>"คัดลอกโค้ดสคริปต์"</strong>{' '}
              ด้านล่างนี้ นำไปวางในหน้าต่างแก้ไข
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                3
              </span>
              <h4 className="font-bold text-slate-900">กด Deploy เป็น Web App</h4>
            </div>
            <p className="text-slate-600 leading-relaxed">
              กดปุ่ม <strong>Deploy (การทำให้ใช้งานได้)</strong> &gt; <strong>New deployment</strong> &gt; เลือกประเภท{' '}
              <strong>Web app (เว็บแอป)</strong>
              <br />
              • Execute as (ดำเนินการในฐานะ): <strong>Me (ฉัน)</strong>
              <br />
              • Who has access (ผู้มีสิทธิ์เข้าถึง):{' '}
              <strong className="text-rose-600">Anyone (ทุกคน)</strong> *จำเป็น
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                4
              </span>
              <h4 className="font-bold text-slate-900">นำ URL มาวางและบันทึก</h4>
            </div>
            <p className="text-slate-600 leading-relaxed">
              คัดลอก Web App URL (ลงท้ายด้วย /exec) นำมาวางในช่อง <strong>Web App URL</strong> ด้านบน แล้วกดปุ่ม "บันทึก URL"
            </p>
          </div>
        </div>

        {/* Code Box with 1-Click Copy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
              <FileCode className="w-4 h-4 text-indigo-600" />
              <span>ซอร์สโค้ด Google Apps Script (Code.gs)</span>
            </span>
            <button
              onClick={handleCopyCode}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอกโค้ดสคริปต์'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto max-h-60 leading-relaxed border border-slate-800">
            {GOOGLE_APPS_SCRIPT_CODE}
          </pre>
        </div>
      </div>

      {/* Deployment & Architecture Notes (Netlify / GitHub / No Cloud Run) */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-xs text-slate-600 space-y-3">
        <h4 className="font-bold text-slate-800 flex items-center space-x-2 text-sm">
          <Github className="w-4 h-4 text-slate-900" />
          <span>สถาปัตยกรรมระบบและการ Deploy บน Netlify / GitHub</span>
        </h4>
        <ul className="list-disc list-inside space-y-1.5 leading-relaxed text-slate-600">
          <li>
            <strong>100% Client-Side SPA:</strong> เว็บแอปพลิเคชันนี้ทำงานบน React + Vite โดยติดต่อตรงกับ Firebase Firestore
            และ Firebase Authentication ทำให้สามารถ Deploy บน <strong>Netlify</strong> หรือ <strong>GitHub Pages</strong> ได้ทันที
          </li>
          <li>
            <strong>ไม่มีค่าใช้จ่าย Google Cloud Run:</strong> ไม่จำเป็นต้องเปิดใช้งาน Cloud Run
            เนื่องจากใช้การบันทึกไฟล์ลง Google Drive ผ่าน Google Apps Script Web App โดยตรง
          </li>
          <li>
            <strong>การจัดการ Concurrency:</strong> Google Drive และ Firestore รองรับการส่งงานพร้อมกันจำนวนมากได้อย่างราบรื่น
          </li>
        </ul>
      </div>
    </div>
  );
};
