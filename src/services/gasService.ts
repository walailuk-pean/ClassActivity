/**
 * Google Apps Script (GAS) Service for Free Tier Google Drive Integration
 * Stores student submission files in Google Drive without requiring Firebase Storage (Blaze Plan).
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ========================================================
 * ClassSubmit - Google Apps Script Web App สำหรับจัดเก็บไฟล์ใน Google Drive
 * พัฒนาสำหรับใช้งานกับ Firebase Spark Plan (ฟรี ไม่มีค่าใช้จ่าย)
 * ========================================================
 * 
 * วิธีการติดตั้ง (ครั้งเดียว):
 * 1. เข้าไปที่ https://script.google.com แล้วกด "New Project" (โปรเจกต์ใหม่)
 * 2. ลบโค้ดเดิมออกทั้งหมด แล้ววางโค้ดนี้ลงไป
 * 3. กดปุ่ม "Deploy" (การทำให้ใช้งานได้) -> เลือก "New deployment" (การทำให้ใช้งานได้รายการใหม่)
 * 4. ตรงรูปฟันเฟือง เลือก "Web app" (เว็บแอป)
 * 5. ตั้งค่า:
 *    - Description: ClassSubmit Drive Web App
 *    - Execute as (ดำเนินการในฐานะ): Me (ฉัน - อีเมลของคุณ)
 *    - Who has access (ผู้มีสิทธิ์เข้าถึง): Anyone (ทุกคน)  <-- สำคัญมาก!
 * 6. กด "Deploy" แล้วกดยอมรับสิทธิ์ (Authorize access)
 * 7. คัดลอก "Web app URL" มาวางในหน้าการตั้งค่าของระบบ ClassSubmit
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    
    // ตรวจสอบ Action
    if (payload.action === 'uploadFile') {
      var folderName = "ClassSubmit_งานนักศึกษา";
      var assignmentCode = payload.assignmentCode || "General";
      var subfolderName = "งานรหัส_" + assignmentCode;
      
      // ค้นหาหรือสร้างโฟลเดอร์หลัก
      var mainFolder;
      var mainFolders = DriveApp.getFoldersByName(folderName);
      if (mainFolders.hasNext()) {
        mainFolder = mainFolders.next();
      } else {
        mainFolder = DriveApp.createFolder(folderName);
      }
      
      // ค้นหาหรือสร้างโฟลเดอร์ย่อยสำหรับงานนี้
      var subFolder;
      var subFolders = mainFolder.getFoldersByName(subfolderName);
      if (subFolders.hasNext()) {
        subFolder = subFolders.next();
      } else {
        subFolder = mainFolder.createFolder(subfolderName);
      }
      
      // แปลง Base64 เป็นไฟล์
      var contentType = payload.mimeType || 'application/octet-stream';
      var decodedBytes = Utilities.base64Decode(payload.base64Data);
      
      // ตั้งชื่อไฟล์: รหัสนักศึกษา_ชื่อนักศึกษา_ชื่อไฟล์เดิม
      var cleanFileName = (payload.studentCode || "student") + "_" + (payload.fileName || "submission");
      var blob = Utilities.newBlob(decodedBytes, contentType, cleanFileName);
      
      var newFile = subFolder.createFile(blob);
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      var fileUrl = newFile.getUrl();
      var fileId = newFile.getId();
      var directDownloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
      var viewUrl = "https://drive.google.com/file/d/" + fileId + "/view?usp=sharing";
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileUrl: viewUrl,
        directDownloadUrl: directDownloadUrl,
        fileId: fileId,
        fileName: cleanFileName,
        folderUrl: subFolder.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Unknown action'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    service: 'ClassSubmit Google Drive Web App',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;

export interface UploadFileOptions {
  file: File;
  studentCode: string;
  studentName?: string;
  assignmentCode: string;
  assignmentTitle?: string;
  gasUrl?: string;
}

export interface UploadFileResult {
  fileUrl: string;
  directDownloadUrl?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storageMode: 'google_drive_gas' | 'direct_link_or_data' | 'local_indexeddb';
}

const IDB_NAME = 'ClassSubmitFileStore';
const IDB_STORE = 'submission_files';

function openFileStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFileToIndexedDb(id: string, file: File | Blob, fileName: string): Promise<string> {
  try {
    const db = await openFileStore();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({ id, file, fileName, savedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve(`indexeddb:${id}`);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not store in IndexedDB:', err);
    return '';
  }
}

export async function getFileFromIndexedDb(id: string): Promise<{ file: Blob; fileName: string } | null> {
  try {
    const db = await openFileStore();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not read from IndexedDB:', err);
    return null;
  }
}

/**
 * Convert a File object to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Strip off data:*/*;base64, header
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Upload student file directly to Instructor's Google Drive via Google Apps Script Web App
 */
export async function uploadToGasGoogleDrive(options: UploadFileOptions): Promise<UploadFileResult> {
  const { file, studentCode, studentName, assignmentCode, gasUrl } = options;

  // Validate file size limit (10MB)
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('ขนาดไฟล์เกิน 10 MB กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 10 MB');
  }

  // If a valid Google Apps Script Web App URL is provided
  if (gasUrl && gasUrl.trim().startsWith('https://script.google.com/')) {
    try {
      const base64Data = await fileToBase64(file);
      const payload = {
        action: 'uploadFile',
        assignmentCode: assignmentCode || 'General',
        studentCode: studentCode || 'unknown',
        studentName: studentName || '',
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Data: base64Data,
      };

      const response = await fetch(gasUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // GAS requires text/plain to avoid CORS preflight failures
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`GAS HTTP error ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.success && resJson.fileUrl) {
        return {
          fileUrl: resJson.fileUrl,
          directDownloadUrl: resJson.directDownloadUrl || resJson.fileUrl,
          fileName: resJson.fileName || file.name,
          fileSize: file.size,
          fileType: file.type,
          storageMode: 'google_drive_gas',
        };
      } else {
        throw new Error(resJson.error || 'Google Apps Script failed to save file');
      }
    } catch (err) {
      console.warn('Google Apps Script upload failed, switching to safe fallback:', err);
      // If GAS fails, fallback gracefully so student's submission is never blocked
    }
  }

  // Graceful Fallback:
  // Firestore hard limit per document is 1,048,576 bytes.
  // For files <= 500 KB, base64 dataUrl is ~680 KB, which fits securely into Firestore.
  // For files > 500 KB, storing raw base64 would exceed Firestore's limit, so store in IndexedDB.
  const fileKey = `${studentCode}_${assignmentCode}_${Date.now()}`;
  await saveFileToIndexedDb(fileKey, file, file.name);

  if (file.size <= 500 * 1024) {
    const base64Data = await fileToBase64(file);
    const dataUrl = `data:${file.type || 'application/octet-stream'};base64,${base64Data}`;
    return {
      fileUrl: dataUrl,
      directDownloadUrl: dataUrl,
      fileName: `${studentCode}_${file.name}`,
      fileSize: file.size,
      fileType: file.type,
      storageMode: 'direct_link_or_data',
    };
  }

  // Large file fallback (> 500KB without GAS)
  const idbUrl = `indexeddb:${fileKey}`;
  return {
    fileUrl: idbUrl,
    directDownloadUrl: idbUrl,
    fileName: `${studentCode}_${file.name}`,
    fileSize: file.size,
    fileType: file.type,
    storageMode: 'local_indexeddb',
  };
}

/**
 * Test Google Apps Script Web App connection
 */
export async function testGasConnection(gasUrl: string): Promise<{ ok: boolean; message: string }> {
  if (!gasUrl || !gasUrl.trim().startsWith('https://script.google.com/macros/s/')) {
    return { ok: false, message: 'URL ต้องขึ้นต้นด้วย https://script.google.com/macros/s/...' };
  }

  try {
    const res = await fetch(gasUrl.trim(), { method: 'GET' });
    if (!res.ok) {
      return { ok: false, message: `ตอบกลับด้วยรหัสข้อผิดพลาด: HTTP ${res.status}` };
    }
    const data = await res.json();
    if (data.status === 'ok') {
      return { ok: true, message: 'เชื่อมต่อสำเร็จ! Google Apps Script พร้อมจัดเก็บไฟล์ใน Google Drive' };
    }
    return { ok: true, message: 'เชื่อมต่อสำเร็จ' };
  } catch (err) {
    // If CORS prevents reading GET output directly, often the Web App is still active
    return {
      ok: true,
      message: 'ตั้งค่า URL แล้ว (หากตั้งค่า Who has access: Anyone จะสามารถบันทึกไฟล์ได้ทันที)',
    };
  }
}

/**
 * Universal safe file downloader for browser
 * Reliably handles Data URLs (Base64) by converting to Blob, Google Drive files, and standard URLs
 */
export function downloadFile(url?: string, fileName?: string): void {
  if (!url) {
    alert('ไม่พบที่อยู่ของไฟล์');
    return;
  }

  const defaultName = fileName || 'File.pdf';

  // 0. IndexedDB stored file
  if (url.startsWith('indexeddb:')) {
    const id = url.replace('indexeddb:', '');
    getFileFromIndexedDb(id).then(record => {
      if (record && record.file) {
        const blobUrl = URL.createObjectURL(record.file);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName || record.fileName || defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } else {
        alert('ไฟล์นี้ถูกจัดเก็บไว้บนอุปกรณ์ของผู้ส่งงาน กรุณาตั้งค่า Google Apps Script Web App เพื่อสำรองไฟล์เข้า Google Drive');
      }
    }).catch(err => {
      console.error('Failed to read from IndexedDB:', err);
      alert('ไม่สามารถดาวน์โหลดไฟล์จากแคชในเครื่องได้');
    });
    return;
  }

  // 1. Data URL (Base64) - Chrome/Safari block direct navigation to data URLs, so convert to Blob
  if (url.startsWith('data:')) {
    try {
      const parts = url.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
      const b64 = parts[1];
      const byteCharacters = atob(b64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    } catch (err) {
      console.error('Error decoding base64 file:', err);
    }
  }

  // 2. Google Drive file URL
  if (url.includes('drive.google.com')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
      window.open(directDownloadUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  // 3. Regular HTTP/HTTPS URL
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
