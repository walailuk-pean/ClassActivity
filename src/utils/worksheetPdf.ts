/**
 * Helper to generate and download genuine PDF worksheets with full Thai language support
 */
import { Assignment } from '../types';

/**
 * Draw a clean, authentic A4 worksheet onto a Canvas and wrap into a standard PDF-1.4 file
 */
export async function generateWorksheetPdfBlob(assignment: {
  title: string;
  courseCode?: string;
  courseName?: string;
  code?: string;
  closeAt?: string;
  description?: string;
}): Promise<Blob> {
  const width = 1240; // A4 width at 150 DPI
  const height = 1754; // A4 height at 150 DPI

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // 1. Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // 2. Header Banner
  const gradient = ctx.createLinearGradient(40, 40, width - 40, 160);
  gradient.addColorStop(0, '#1e1b4b'); // Deep indigo
  gradient.addColorStop(1, '#312e81');
  ctx.fillStyle = gradient;
  ctx.fillRect(40, 40, width - 80, 160);

  // Institution & System Brand
  ctx.fillStyle = '#a5b4fc';
  ctx.font = 'bold 24px "Sarabun", "Noto Sans Thai", "Thonburi", sans-serif';
  ctx.fillText('มหาวิทยาลัยกรุงเทพ (Bangkok University)', 70, 85);

  // Course Code & Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Sarabun", "Noto Sans Thai", "Thonburi", sans-serif';
  const courseText = `${assignment.courseCode || 'รายวิชา'} : ${assignment.courseName || 'แบบฝึกหัดในชั้นเรียน'}`;
  ctx.fillText(courseText, 70, 135);

  // Code Badge on Right
  ctx.fillStyle = '#4338ca';
  ctx.beginPath();
  ctx.roundRect(width - 270, 65, 200, 70, 12);
  ctx.fill();
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#e0e7ff';
  ctx.font = '16px "Sarabun", sans-serif';
  ctx.fillText('รหัสงาน 6 หลัก', width - 240, 92);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`#${assignment.code || '------'}`, width - 240, 124);

  // 3. Assignment Title Box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(40, 220, width - 80, 130);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 220, width - 80, 130);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 32px "Sarabun", "Noto Sans Thai", sans-serif';
  ctx.fillText(assignment.title || 'ใบงานประจำบทเรียน', 70, 270);

  // Due Date
  const dueDateStr = assignment.closeAt
    ? new Date(assignment.closeAt).toLocaleString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';
  ctx.fillStyle = '#64748b';
  ctx.font = '22px "Sarabun", sans-serif';
  ctx.fillText(`กำหนดส่งงาน: ${dueDateStr} น.`, 70, 315);

  // 4. Student Identification Box (For physical or digital fill-in)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(40, 370, width - 80, 110);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, 370, width - 80, 110);

  ctx.fillStyle = '#334155';
  ctx.font = '22px "Sarabun", sans-serif';
  ctx.fillText('ชื่อ-นามสกุล: ____________________________________________________', 60, 415);
  ctx.fillText('รหัสนักศึกษา: ______________________  Sec: ______  เลขที่: ______', 60, 455);

  // 5. Instructions Section
  ctx.fillStyle = '#4338ca';
  ctx.font = 'bold 26px "Sarabun", sans-serif';
  ctx.fillText('คำชี้แจง / รายละเอียดงาน:', 40, 525);

  ctx.fillStyle = '#1e293b';
  ctx.font = '22px "Sarabun", sans-serif';
  const desc = assignment.description || '1. ให้นักศึกษาตอบคำถามและแสดงวิธีทำในใบงานนี้อย่างละเอียด\n2. บันทึกเป็นไฟล์ PDF หรือ Word แล้วส่งผ่านระบบ ClassSubmit ก่อนเวลาที่กำหนด\n3. ตรวจสอบชื่อ-นามสกุล และรหัสนักศึกษาให้ถูกต้องก่อนกดยืนยันการส่งงาน';
  
  const lines = desc.split('\n');
  let currentY = 565;
  for (const line of lines) {
    // Word wrap long lines
    const words = line.split('');
    let curLine = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = curLine + words[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > width - 120 && n > 0) {
        ctx.fillText(curLine, 60, currentY);
        curLine = words[n];
        currentY += 34;
      } else {
        curLine = testLine;
      }
    }
    ctx.fillText(curLine, 60, currentY);
    currentY += 40;
  }

  // 6. Worksheet Questions & Answer Work Area
  currentY = Math.max(currentY + 20, 720);
  ctx.fillStyle = '#4338ca';
  ctx.font = 'bold 26px "Sarabun", sans-serif';
  ctx.fillText('ส่วนที่ 1: คำถามและพื้นที่ตอบแบบฝึกหัด (Answers & Workspace)', 40, currentY);

  currentY += 35;
  const workAreaHeight = Math.max(height - currentY - 140, 450);

  // Lined work area
  ctx.fillStyle = '#fbfcfe';
  ctx.fillRect(40, currentY, width - 80, workAreaHeight);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, currentY, width - 80, workAreaHeight);

  // Ruled guidelines
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let y = currentY + 45; y < currentY + workAreaHeight - 20; y += 45) {
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(width - 60, y);
    ctx.stroke();
  }

  // Watermark or hint inside workspace
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 20px "Sarabun", sans-serif';
  ctx.fillText('( เขียนคำตอบหรือพิมพ์ข้อความสรุปการเรียนรู้ลงในพื้นที่นี้ )', 80, currentY + 36);

  // 7. Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '18px "Sarabun", sans-serif';
  ctx.fillText('ใบงานอย่างเป็นทางการสำหรับกิจกรรมในชั้นเรียน • ส่งงานผ่าน ClassSubmit (ไม่ต้องล็อกอินอีเมล)', 60, height - 60);

  // Convert canvas to JPEG blob
  const jpegBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Failed to create JPEG blob'))),
      'image/jpeg',
      0.92
    );
  });

  const jpegArrayBuffer = await jpegBlob.arrayBuffer();
  const jpegBytes = new Uint8Array(jpegArrayBuffer);

  // Construct pure PDF-1.4 file containing the image
  return buildPdfFromJpeg(jpegBytes, width, height);
}

/**
 * Builds a valid, standard PDF-1.4 binary file wrapping a JPEG image
 */
function buildPdfFromJpeg(jpegBytes: Uint8Array, imgWidth: number, imgHeight: number): Blob {
  const encoder = new TextEncoder();
  const chunks: any[] = [];

  const writeStr = (s: string) => {
    chunks.push(encoder.encode(s));
  };

  // PDF Page Size A4 points: 595.28 x 841.89
  const pageW = 595;
  const pageH = 842;

  const header = '%PDF-1.4\n';
  writeStr(header);

  const offsets: number[] = [0];
  let currentOffset = header.length;

  const addObj = (objContent: string) => {
    offsets.push(currentOffset);
    const encoded = encoder.encode(objContent);
    chunks.push(encoded);
    currentOffset += encoded.length;
  };

  // Obj 1: Catalog
  addObj(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // Obj 2: Pages
  addObj(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);

  // Obj 3: Page
  addObj(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  // Obj 4: Image XObject
  offsets.push(currentOffset);
  const imgHeader = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`;
  const encodedImgHeader = encoder.encode(imgHeader);
  chunks.push(encodedImgHeader);
  currentOffset += encodedImgHeader.length;

  // JPEG stream data
  chunks.push(jpegBytes);
  currentOffset += jpegBytes.length;

  const imgFooter = `\nendstream\nendobj\n`;
  const encodedImgFooter = encoder.encode(imgFooter);
  chunks.push(encodedImgFooter);
  currentOffset += encodedImgFooter.length;

  // Obj 5: Page Content stream
  const contentStream = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im1 Do\nQ\n`;
  const contentObj = `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`;
  addObj(contentObj);

  // Xref table
  const startXref = currentOffset;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ` 00000 n \n`;
  }
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
  writeStr(xref);

  return new Blob(chunks, { type: 'application/pdf' });
}

/**
 * Universal safe worksheet downloader
 * Triggers actual download on computer/mobile for any URL, data URL, or generates a real PDF
 */
export async function downloadWorksheet(assignment: Partial<Assignment>): Promise<void> {
  const fileName = assignment.worksheetName || `ใบงาน_${assignment.courseCode || 'วิชา'}_${assignment.code || 'งาน'}.pdf`;
  const url = assignment.worksheetUrl;

  // 1. If URL is Base64 data URL
  if (url && url.startsWith('data:')) {
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
      triggerBrowserDownload(blob, fileName);
      return;
    } catch (err) {
      console.warn('Error parsing base64 worksheet, falling back to PDF generator:', err);
    }
  }

  // 2. If URL is a Google Drive Link
  if (url && url.includes('drive.google.com')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const directUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
      // Trigger via anchor
      const a = document.createElement('a');
      a.href = directUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  // 3. If standard valid HTTP URL
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // 4. Default / Demo / Fallback: Generate real, crisp PDF worksheet
  const pdfBlob = await generateWorksheetPdfBlob({
    title: assignment.title || 'แบบฝึกหัดในชั้นเรียน',
    courseCode: assignment.courseCode || 'CS101',
    courseName: assignment.courseName || 'การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น',
    code: assignment.code || '834921',
    closeAt: assignment.closeAt || new Date().toISOString(),
    description: assignment.description,
  });

  triggerBrowserDownload(pdfBlob, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

/**
 * Triggers safe browser file download
 */
function triggerBrowserDownload(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}
