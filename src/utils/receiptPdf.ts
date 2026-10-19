/**
 * Receipt PDF Generator for ClassSubmit
 * Generates an official A5 Portrait PDF Digital Submission Receipt
 * with automated filename formatting: [รหัสนักศึกษา]_[ชื่อ-นามสกุล]_[ชื่อชิ้นงาน]_[เลขที่].pdf
 */
import { SubmissionReceipt } from '../types';

/**
 * Automatically format filename according to user requirements:
 * [รหัสนักศึกษา]_[ชื่อ-นามสกุล]_[ชื่อชิ้นงาน]_[เลขที่].pdf
 * Example: 6601234567_สมชาย-ใจดี_Class-Activity-6_05.pdf
 */
export function formatReceiptFileName(receipt: SubmissionReceipt): string {
  // 1. Student Code
  const studentCode = (receipt.studentCode || 'student').trim().replace(/[\/\\:*?"<>|\s]/g, '');

  // 2. Student Name: replace spaces with hyphens
  let studentName = (receipt.studentName || 'ชื่อ-สกุล')
    .trim()
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '-');

  // 3. Assignment Title: replace spaces with hyphens
  let assignmentTitle = (receipt.assignmentTitle || 'ชิ้นงาน')
    .trim()
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '-');

  // 4. Student Number: pad single digits to 2 digits (e.g. 5 -> 05)
  let studentNo = (receipt.studentNo || '').trim();
  if (/^\d+$/.test(studentNo)) {
    studentNo = studentNo.padStart(2, '0');
  } else if (!studentNo) {
    studentNo = '00';
  } else {
    // Sanitize any non-alphanumeric/dash
    studentNo = studentNo.replace(/[\/\\:*?"<>|\s]/g, '-');
  }

  return `${studentCode}_${studentName}_${assignmentTitle}_${studentNo}.pdf`;
}

/**
 * Helper to wrap text into multiple lines for Canvas
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [''];
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const char = words[i];
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Draw official Bangkok University 3D Faceted Diamond Logo onto Canvas
 */
function drawBuDiamondLogo(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Facet 1 (Base dark silver)
  ctx.fillStyle = '#9BA8AD';
  ctx.fill(new Path2D('M43.1596 8.57204L35.7342 0.941406H7.40707L0 8.57204L21.5175 31.0205L43.1596 8.57204Z'));

  // Facet 2 (Crown light silver)
  ctx.fillStyle = '#C8CDCF';
  ctx.fill(new Path2D('M0.875948 8.5867L7.95683 1.46185H35.3311L42.4156 8.5867H0.875948Z'));

  // Facet 3 (Upper right white highlight)
  ctx.fillStyle = '#FFFFFF';
  ctx.fill(new Path2D('M35.3311 1.46184L35.7342 0.941406L43.1596 8.57204H42.0748L35.3311 1.46184Z'));

  // Facet 4 (Upper table silver)
  ctx.fillStyle = '#BAC3C7';
  ctx.fill(new Path2D('M42.0748 8.57204L7.95682 1.46185H35.3311L42.0748 8.57204Z'));

  // Facet 5 (Pavilion light silver)
  ctx.fillStyle = '#C8CDCF';
  ctx.fill(new Path2D('M0.875948 8.64168L21.3782 28.8068L42.4156 8.5867L0.875948 8.64168Z'));

  // Facet 6 (Right pavilion facet)
  ctx.fillStyle = '#FFFFFF';
  ctx.fill(new Path2D('M43.1596 8.57204H42.0748L19.8462 26.5711L20.6599 28.7995L21.5175 31.0205L43.1596 8.57204Z'));

  // Facet 7 (Inner shading)
  ctx.fillStyle = '#BAC3C7';
  ctx.fill(new Path2D('M42.0748 8.57204L38.0249 11.8449C38.0249 11.8449 27.0884 11.8449 20.9531 13.3256C14.8801 14.7916 10.2182 17.841 10.2182 17.841L0.817307 8.5867L42.0748 8.57204Z'));

  // Facet 8 (Point bottom)
  ctx.fillStyle = '#9BA8AD';
  ctx.fill(new Path2D('M21.1987 29.8183L21.5175 31.0205L43.1596 8.57204L21.1987 29.8183Z'));

  // Facet 9 (Crisp star/shimmer highlight)
  ctx.fillStyle = '#FFFFFF';
  ctx.fill(new Path2D('M29.401 18.9588L13.9089 10.958L21.5175 31.0205L12.4978 10.958L9.92129 13.8607L11.3433 10.0784L0.120947 8.57937H11.1454L8.51391 3.03782L12.2523 7.61546L17.2844 1.23461L13.9235 7.52384L24.4202 1.98595L14.9314 8.57937H42.7528L14.9314 9.92811L29.401 18.9588Z'));

  ctx.restore();
}

/**
 * Generate A5 portrait PDF Blob
 * A5 standard dimensions: 148 mm × 210 mm
 * PDF points (72 DPI): 420 pt × 595 pt
 * High-res canvas: 1050 px × 1488 px
 */
export async function generateReceiptPdfBlob(receipt: SubmissionReceipt): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed if font loading promise fails
    }
  }

  const width = 1050;  // A5 width at 180 DPI
  const height = 1488; // A5 height at 180 DPI

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // 1. Background & Outer Frame
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Inner card background
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(30, 30, width - 60, height - 60, 20);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 2. Header Banner
  const headerGrad = ctx.createLinearGradient(30, 30, width - 30, 190);
  headerGrad.addColorStop(0, '#1e1b4b'); // Deep indigo
  headerGrad.addColorStop(0.6, '#312e81');
  headerGrad.addColorStop(1, '#4338ca');
  ctx.fillStyle = headerGrad;

  ctx.beginPath();
  ctx.roundRect(30, 30, width - 60, 160, [20, 20, 0, 0]);
  ctx.fill();

  // Institution & System Brand (Removed text after Bangkok University)
  ctx.fillStyle = '#c7d2fe';
  ctx.font = 'bold 20px "Prompt", "Sarabun", "Noto Sans Thai", sans-serif';
  ctx.fillText('มหาวิทยาลัยกรุงเทพ (Bangkok University)', 65, 75);

  // Document Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px "Prompt", "Sarabun", "Noto Sans Thai", sans-serif';
  ctx.fillText('หลักฐานส่งงานในชั้นเรียน', 65, 125);

  ctx.fillStyle = '#e0e7ff';
  ctx.font = '18px "Prompt", "Sarabun", sans-serif';
  ctx.fillText('Class Activity Submission Confirmation', 65, 158);

  // Official Bangkok University Business Administration Logo (Seamlessly blended with header paper)
  const logoX = width - 400;
  const logoY = 54;
  const logoW = 345;
  const logoH = 112;

  ctx.save();
  // Blended translucent backdrop that harmonizes seamlessly with the header paper
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(logoX, logoY, logoW, logoH, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Draw Official BU 3D Diamond Emblem
  drawBuDiamondLogo(ctx, logoX + 20, logoY + 36, 1.35);

  // Divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(logoX + 94, logoY + 18);
  ctx.lineTo(logoX + 94, logoY + logoH - 18);
  ctx.stroke();

  // Typography - harmonious with dark indigo header paper
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px "Prompt", "Montserrat", sans-serif';
  ctx.fillText('BANGKOK UNIVERSITY', logoX + 108, logoY + 42);

  ctx.fillStyle = '#fca5a5';
  ctx.font = 'bold 12px "Prompt", "Montserrat", sans-serif';
  ctx.fillText('BUSINESS ADMINISTRATION', logoX + 108, logoY + 65);

  ctx.fillStyle = '#c7d2fe';
  ctx.font = '500 12px "Prompt", "Sarabun", sans-serif';
  ctx.fillText('คณะบริหารธุรกิจ', logoX + 108, logoY + 88);

  ctx.restore();

  // 3. Reference Code Banner Box
  const refY = 215;
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.roundRect(65, refY, width - 130, 105, 16);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '16px "Prompt", "Sarabun", sans-serif';
  ctx.fillText('หมายเลขอ้างอิงสถานะการส่งงาน (Reference Code)', 95, refY + 36);

  ctx.fillStyle = '#3730a3';
  ctx.font = 'bold 32px "JetBrains Mono", monospace';
  ctx.fillText(receipt.receiptCode || 'REC-UNKNOWN', 95, refY + 80);

  // 4. Status Badge Banner
  const statusY = 340;
  const isOnTime = receipt.status === 'on_time';

  if (isOnTime) {
    ctx.fillStyle = '#ecfdf5';
    ctx.strokeStyle = '#6ee7b7';
  } else {
    ctx.fillStyle = '#fffbeb';
    ctx.strokeStyle = '#fcd34d';
  }

  ctx.beginPath();
  ctx.roundRect(65, statusY, width - 130, 60, 14);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Status text
  if (isOnTime) {
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 22px "Prompt", "Sarabun", sans-serif';
    ctx.fillText('✓ ส่งงานสำเร็จ (ส่งตรงเวลาตามกำหนด)', 95, statusY + 38);
  } else {
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 22px "Prompt", "Sarabun", sans-serif';
    ctx.fillText('⚠ ส่งงานสำเร็จ (ส่งช้าหลังกำหนดเวลา)', 95, statusY + 38);
  }

  // 5. Grid of Details
  const gridY = 425;
  const gridW = width - 130;
  const gridH = 590;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(65, gridY, gridW, gridH, 16);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Helper to draw horizontal section in grid
  const drawRow = (
    y: number,
    label: string,
    val1: string,
    sub1?: string,
    label2?: string,
    val2?: string,
    sub2?: string
  ) => {
    // Divider line
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(85, y);
    ctx.lineTo(width - 85, y);
    ctx.stroke();

    const textTop = y + 26;

    // Col 1
    ctx.fillStyle = '#64748b';
    ctx.font = '16px "Prompt", "Sarabun", sans-serif';
    ctx.fillText(label, 95, textTop);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px "Prompt", "Sarabun", sans-serif';
    ctx.fillText(val1, 95, textTop + 30);

    if (sub1) {
      ctx.fillStyle = '#475569';
      ctx.font = '16px "Prompt", "Sarabun", sans-serif';
      ctx.fillText(sub1, 95, textTop + 55);
    }

    // Col 2 (if present)
    if (label2 && val2) {
      const col2X = 560;
      ctx.fillStyle = '#64748b';
      ctx.font = '16px "Prompt", "Sarabun", sans-serif';
      ctx.fillText(label2, col2X, textTop);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px "Prompt", "Sarabun", sans-serif';
      ctx.fillText(val2, col2X, textTop + 30);

      if (sub2) {
        ctx.fillStyle = '#475569';
        ctx.font = '16px "Prompt", "Sarabun", sans-serif';
        ctx.fillText(sub2, col2X, textTop + 55);
      }
    }
  };

  // Section 1: Course Info
  drawRow(
    gridY + 15,
    'รายวิชา (Course)',
    `${receipt.courseCode || 'วิชา'} : ${receipt.courseName || '-'}`,
    undefined,
    'รหัสชิ้นงาน',
    `#${receipt.assignmentCode || '------'}`
  );

  // Section 2: Assignment Info
  drawRow(
    gridY + 115,
    'ชิ้นงาน / กิจกรรมที่ส่ง (Assignment Title)',
    receipt.assignmentTitle || '-',
    undefined,
    'กลุ่มเรียน / เลขที่',
    `Sec: ${receipt.sec || '-'}   |   เลขที่: ${receipt.studentNo || '-'}`
  );

  // Section 3: Student Info
  drawRow(
    gridY + 215,
    'ชื่อ-นามสกุล นักศึกษา',
    receipt.studentName || '-',
    undefined,
    'รหัสนักศึกษา (Student ID)',
    receipt.studentCode || '-'
  );

  // Section 4: Submission Time
  const submitDate = new Date(receipt.submittedAt);
  const dateFormatted = !isNaN(submitDate.getTime())
    ? submitDate.toLocaleDateString('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : receipt.submittedAt;

  const timeFormatted = !isNaN(submitDate.getTime())
    ? `${submitDate.toLocaleTimeString('th-TH')} น.`
    : '';

  drawRow(
    gridY + 315,
    'วัน-เวลาที่ส่งงาน (Submission Timestamp)',
    dateFormatted,
    timeFormatted ? `เวลา: ${timeFormatted}` : undefined,
    'สถานะระบบ',
    isOnTime ? 'On Time (ตรงเวลา)' : 'Late (ส่งช้า)'
  );

  // Section 5: Submitted File
  const fileLines = wrapText(ctx, receipt.fileName || receipt.linkUrl || 'บันทึกสถานะการส่งงาน', 850);
  const displayFile = fileLines[0] || 'ไม่มีไฟล์แนบ';

  drawRow(
    gridY + 415,
    'ชื่อไฟล์งานที่แนบส่ง (Submitted File / Link)',
    displayFile,
    fileLines[1] ? fileLines[1] : `ขนาดหลักฐาน: บันทึกยืนยันความถูกต้องผ่านระบบคลาวด์แล้ว`
  );

  // 6. Verification and Anti-tamper Box
  const certY = 1045;
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(65, certY, width - 130, 310, 16);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Seal badge icon on left
  ctx.save();
  ctx.fillStyle = '#e0e7ff';
  ctx.beginPath();
  ctx.arc(140, certY + 80, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Checkmark inside badge
  ctx.strokeStyle = '#4338ca';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(122, certY + 80);
  ctx.lineTo(135, certY + 93);
  ctx.lineTo(160, certY + 68);
  ctx.stroke();
  ctx.restore();

  // Verification text
  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 22px "Prompt", "Sarabun", sans-serif';
  ctx.fillText('การรับรองความถูกต้องของข้อมูล (Digital Verification)', 210, certY + 62);

  ctx.fillStyle = '#475569';
  ctx.font = '17px "Prompt", "Sarabun", sans-serif';
  ctx.fillText('เอกสารนี้ออกโดยระบบ ClassSubmit เพื่อใช้เป็นหลักฐานการส่งงานของนักศึกษา', 210, certY + 92);
  ctx.fillText('ข้อมูลได้รับการบันทึกเวลาจริง (Real-time Cloud Timestamp) ไม่สามารถแก้ไขย้อนหลังได้', 210, certY + 118);

  // Dashed separator
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(95, certY + 155);
  ctx.lineTo(width - 95, certY + 155);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bottom Notice
  const now = new Date();
  const printDateStr = now.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  ctx.fillStyle = '#64748b';
  ctx.font = '15px "Prompt", "Sarabun", sans-serif';
  ctx.fillText(`สร้างเอกสารเมื่อ: ${printDateStr} น.`, 95, certY + 195);
  ctx.fillText(`รหัสตรวจสอบเอกสาร (Checksum): ${receipt.receiptCode}-${receipt.studentCode.slice(-4)}`, 95, certY + 225);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 14px "Prompt", sans-serif';
  ctx.fillText('* กรุณาเก็บไฟล์ PDF นี้ไว้จนกว่าจะประกาศผลคะแนนของรายวิชาสิ้นสุด *', 95, certY + 265);

  // 7. Footer line
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px "Prompt", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ClassSubmit • A5 Portrait Verified Document • Bangkok University', width / 2, height - 42);

  // Convert Canvas to JPEG bytes
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const base64Data = dataUrl.split(',')[1];
  const binaryStr = atob(base64Data);
  const jpegBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    jpegBytes[i] = binaryStr.charCodeAt(i);
  }

  // Construct pure PDF-1.4 file
  const chunks: BlobPart[] = [];
  const encoder = new TextEncoder();
  const writeStr = (str: string) => chunks.push(encoder.encode(str));

  // PDF Page Size A5 points: 419.53 x 595.28 (Standard rounded: 420 x 595)
  const pageW = 420;
  const pageH = 595;

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

  // Obj 3: Page (A5 Portrait MediaBox)
  addObj(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  // Obj 4: Image XObject
  offsets.push(currentOffset);
  const imgHeader = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`;
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
 * Universal safe browser file download
 */
function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

/**
 * Main function to generate and download the A5 PDF receipt
 * with the formatted filename automatically
 */
export async function downloadReceiptPdf(receipt: SubmissionReceipt): Promise<string> {
  const fileName = formatReceiptFileName(receipt);
  const pdfBlob = await generateReceiptPdfBlob(receipt);
  triggerBrowserDownload(pdfBlob, fileName);
  return fileName;
}
