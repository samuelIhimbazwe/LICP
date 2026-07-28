import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { ReportDocument, ReportSection, ReportTable } from './report-engine.js';

type PdfOp = string;

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_CANDIDATES = [
  join(__dirname, '../assets/firm-logo.jpg'),
  join(process.cwd(), 'assets/firm-logo.jpg'),
  join(process.cwd(), 'server/assets/firm-logo.jpg'),
];
const LOGO_NATIVE_W = 606;
const LOGO_NATIVE_H = 505;

function loadFirmLogo(): Buffer | null {
  for (const path of LOGO_CANDIDATES) {
    try {
      if (existsSync(path)) return readFileSync(path);
    } catch {
      /* next */
    }
  }
  return null;
}

function toPdfSafeText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '*')
    .replace(/[\u00B7\u22C5\u2027]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}

function escapePdf(text: string): string {
  return toPdfSafeText(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) current = next;
    else {
      if (current) lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars) : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatRole(role?: string): string {
  if (!role) return '';
  const map: Record<string, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    compliance_officer: 'Compliance Officer',
    legal_practitioner: 'Legal Practitioner',
    system: 'System',
  };
  return map[role] ?? role.replace(/_/g, ' ');
}

function formatDisplayDate(iso: string): string {
  const d = iso.slice(0, 16).replace('T', ' ');
  const [date, time] = d.split(' ');
  if (!date) return iso.slice(0, 10);
  const [y, m, day] = date.split('-');
  return `${day}/${m}/${y}${time ? ` ${time}` : ''}`;
}

function reportIdFromDate(iso: string): string {
  const stamp = iso.replace(/\D/g, '').slice(0, 12);
  return `RPT-${stamp.slice(0, 4)}-${stamp.slice(4, 10) || '000000'}`;
}

/**
 * One-page report matching ImigishaLink-style layout:
 * left logo+firm, center LICP + report title, right period/generated/id,
 * summary strip, section tables, prepared/approved blocks.
 */
export function buildStructuredReportPdf(doc: ReportDocument): Buffer {
  const pageWidth = 612;
  const pageHeight = 792;
  const ml = 36;
  const mr = 36;
  const contentW = pageWidth - ml - mr;
  const contentBottom = 95;
  const companyName = 'Johnson & Associate lawfirm';
  const generatedDisplay = formatDisplayDate(doc.generatedAt);
  const reportId = reportIdFromDate(doc.generatedAt);
  const roleLabel = formatRole(doc.generatedByRole) || 'Authorized User';
  const logoBytes = loadFirmLogo();
  const reportType = (doc.title || 'MANAGEMENT REPORT').toUpperCase().slice(0, 40);

  // Brand colors from firm logo
  const green = { r: 0.05, g: 0.13, b: 0.28 }; // navy (primary, like sample green)
  const gold = { r: 0.72, g: 0.55, b: 0.3 };
  const ink = { r: 0.08, g: 0.08, b: 0.08 };
  const muted = { r: 0.35, g: 0.38, b: 0.4 };
  const stripBg = { r: 0.93, g: 0.94, b: 0.95 };
  const rowAlt = { r: 0.96, g: 0.97, b: 0.97 };
  const line = { r: 0.75, g: 0.78, b: 0.8 };

  const ops: PdfOp[] = [];
  let y = pageHeight - 32;

  const fill = (c: { r: number; g: number; b: number }) => ops.push(`${c.r} ${c.g} ${c.b} rg`);
  const stroke = (c: { r: number; g: number; b: number }) => ops.push(`${c.r} ${c.g} ${c.b} RG`);
  const text = (
    t: string,
    x: number,
    yy: number,
    size: number,
    font: 'F1' | 'F2' = 'F1',
    color = ink
  ) => {
    fill(color);
    ops.push(`BT /${font} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td (${escapePdf(t)}) Tj ET`);
  };
  const center = (t: string, yy: number, size: number, font: 'F1' | 'F2' = 'F1', color = ink) => {
    const w = toPdfSafeText(t).length * size * 0.5;
    text(t, Math.max(ml, (pageWidth - w) / 2), yy, size, font, color);
  };
  const room = (n: number) => y - n >= contentBottom;

  // ---- HEADER ----
  // Left: logo + firm name (like OCOGV / umwana ukundwa / Burera)
  const logoW = 38;
  const logoH = (logoW * LOGO_NATIVE_H) / LOGO_NATIVE_W;
  if (logoBytes) {
    ops.push(`q ${logoW.toFixed(2)} 0 0 ${logoH.toFixed(2)} ${ml.toFixed(2)} ${(y - logoH + 6).toFixed(2)} cm /Im1 Do Q`);
  }
  const leftTextX = ml + logoW + 6;
  text(companyName, leftTextX, y - 2, 8, 'F2', green);
  text('Kigali, Rwanda', leftTextX, y - 13, 7, 'F1', muted);

  // Center: system + report title + type
  center('LICP', y, 16, 'F2', green);
  center(reportType, y - 15, 10, 'F2', green);
  center(`Type: ${reportType}`, y - 27, 8, 'F1', muted);

  // Right: period, generated, id
  const rx = pageWidth - mr - 150;
  text(`Reporting period: ${doc.periodLabel}`, rx, y, 8, 'F1', muted);
  text(`Generated: ${generatedDisplay}`, rx, y - 11, 8, 'F1', muted);
  text(`ID: ${reportId}`, rx, y - 22, 8, 'F1', gold);

  y -= 38;
  // Thick brand rule
  fill(green);
  ops.push(`${ml} ${y} ${contentW} 2.2 re f`);
  y -= 14;

  // ---- SUMMARY STRIP ----
  const stripH = 36;
  fill(stripBg);
  ops.push(`${ml} ${y - stripH} ${contentW} ${stripH} re f`);
  fill(green);
  ops.push(`${ml} ${y - 1.5} ${contentW} 1.5 re f`);
  ops.push(`${ml} ${y - stripH} ${contentW} 1.5 re f`);
  stroke(line);
  ops.push(
    `0.6 w ${ml + contentW / 3} ${y - 8} m ${ml + contentW / 3} ${y - stripH + 8} l S`,
    `${ml + (2 * contentW) / 3} ${y - 8} m ${ml + (2 * contentW) / 3} ${y - stripH + 8} l S`
  );
  const c1 = ml + 12;
  const c2 = ml + contentW / 3 + 12;
  const c3 = ml + (2 * contentW) / 3 + 12;
  text('Report Type', c1, y - 12, 7, 'F1', muted);
  text(reportType.slice(0, 26), c1, y - 25, 8, 'F2', ink);
  text('Period', c2, y - 12, 7, 'F1', muted);
  text(doc.periodLabel.slice(0, 26), c2, y - 25, 8, 'F2', ink);
  text('Sections Included', c3, y - 12, 7, 'F1', muted);
  text(String(doc.sections.length), c3, y - 25, 11, 'F2', green);
  y -= stripH + 18;

  // ---- BODY ----
  const maxRows = Math.max(4, Math.min(10, Math.floor(22 / Math.max(doc.sections.length, 1))));

  const drawMetrics = (metrics: Array<{ label: string; value: string }>) => {
    const cols = 3;
    const gap = 8;
    const boxW = (contentW - gap * (cols - 1)) / cols;
    const boxH = 26;
    for (let i = 0; i < Math.min(metrics.length, 6); i += cols) {
      if (!room(boxH + 6)) return;
      for (let c = 0; c < cols; c++) {
        const m = metrics[i + c];
        if (!m) continue;
        const x = ml + c * (boxW + gap);
        fill(stripBg);
        ops.push(`${x} ${y - boxH + 8} ${boxW} ${boxH} re f`);
        text(m.label.slice(0, 22), x + 6, y - 2, 6, 'F1', muted);
        text(m.value.slice(0, 18), x + 6, y - 14, 9, 'F2', ink);
      }
      y -= boxH + 6;
    }
  };

  const drawTable = (table: ReportTable, sectionTitle: string) => {
    if (!room(36)) return;
    const headers = ['#', ...table.headers];
    const rows = table.rows.slice(0, maxRows).map((row, i) => [String(i + 1), ...row]);
    const colCount = Math.max(headers.length, 1);
    // Narrow first column for row index
    const indexColW = 22;
    const otherW = (contentW - indexColW) / Math.max(colCount - 1, 1);
    const colX = (i: number) => (i === 0 ? ml : ml + indexColW + (i - 1) * otherW);
    const colSlice = (i: number) => (i === 0 ? 3 : 14);

    fill(green);
    ops.push(`${ml} ${y - 4} ${contentW} 14 re f`);
    for (let i = 0; i < headers.length; i++) {
      text(headers[i].toUpperCase().slice(0, colSlice(i)), colX(i) + 4, y - 1, 7, 'F2', { r: 1, g: 1, b: 1 });
    }
    y -= 14;

    for (let ri = 0; ri < rows.length; ri++) {
      if (!room(12)) break;
      if (ri % 2 === 1) {
        fill(rowAlt);
        ops.push(`${ml} ${y - 3} ${contentW} 12 re f`);
      }
      const row = rows[ri];
      for (let i = 0; i < row.length; i++) {
        text(String(row[i] ?? '-').slice(0, i === 0 ? 3 : 16), colX(i) + 4, y, 7, 'F1', ink);
      }
      y -= 12;
    }

    if (room(14)) {
      y -= 4;
      text(`Total ${sectionTitle} in Period`, ml, y, 8, 'F1', muted);
      text(String(table.rows.length), pageWidth - mr - 20, y, 11, 'F2', green);
      y -= 14;
    }
    y -= 6;
  };

  doc.sections.forEach((section, index) => {
    if (!room(30)) return;
    text(`${index + 1}. ${section.title.toUpperCase()}`, ml, y, 10, 'F2', ink);
    y -= 14;

    if (section.summary && room(10)) {
      text(wrapText(section.summary, 95)[0], ml, y, 7, 'F1', muted);
      y -= 10;
    }
    if (section.metrics?.length) drawMetrics(section.metrics);
    if (section.bullets?.length) {
      for (const b of section.bullets.slice(0, 2)) {
        if (!room(9)) break;
        text(`* ${toPdfSafeText(b).slice(0, 92)}`, ml, y, 7, 'F1', ink);
        y -= 9;
      }
      y -= 3;
    }
    const tables = section.tables ?? [];
    if (tables.length) drawTable(tables[0], section.title);
    else y -= 4;
  });

  // ---- PREPARED / APPROVED (directly under body, not forced to page bottom) ----
  y -= 10;
  if (y < contentBottom + 50) y = contentBottom + 50;

  const mid = pageWidth / 2 + 16;
  text('PREPARED BY', ml, y, 9, 'F2', green);
  text('APPROVED BY', mid, y, 9, 'F2', green);
  y -= 8;
  stroke(green);
  ops.push(`1 w ${ml} ${y} m ${ml + 170} ${y} l S`);
  ops.push(`${mid} ${y} m ${mid + 170} ${y} l S`);
  y -= 16;
  text(doc.generatedBy, ml, y, 10, 'F2', ink);
  text('________________', mid, y, 10, 'F1', muted);
  y -= 12;
  text(roleLabel.toUpperCase(), ml, y, 8, 'F1', muted);
  text('Manager / Partner', mid, y, 8, 'F1', muted);
  y -= 12;
  text(generatedDisplay, ml, y, 7, 'F1', muted);
  text('Date: ____________', mid, y, 7, 'F1', muted);

  // Fine footer line
  stroke(line);
  ops.push(`0.4 w ${ml} 28 m ${pageWidth - mr} 28 l S`);
  text(
    `Generated on: ${generatedDisplay} | Generated by: ${doc.generatedBy} | (c) 2026 LICP - Legal Intelligence & Compliance Platform. Confidential.`,
    ml,
    16,
    6,
    'F1',
    muted
  );

  return assemblePdf([ops], pageWidth, pageHeight, logoBytes);
}

export function buildSimplePdf(title: string, lines: string[]): Buffer {
  return buildStructuredReportPdf({
    title,
    subtitle: 'Management Report',
    organizationName: 'Johnson & Associate lawfirm',
    generatedAt: new Date().toISOString(),
    generatedBy: 'System',
    generatedByRole: 'system',
    periodLabel: 'N/A',
    filters: {},
    sections: [{ id: 'content', title: 'Report Content', bullets: lines }],
  });
}

function assemblePdf(
  pages: PdfOp[][],
  pageWidth: number,
  pageHeight: number,
  logoJpeg: Buffer | null
): Buffer {
  type Part = { n: number; bytes: Buffer };
  const parts: Part[] = [];
  let next = 1;
  const add = (bytes: Buffer) => {
    const n = next++;
    parts.push({ n, bytes });
    return n;
  };
  const addStr = (s: string) => add(Buffer.from(s, 'utf8'));

  const catalogNum = addStr('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesNum = 2;
  next = 3;
  parts.push({ n: 2, bytes: Buffer.from('PLACEHOLDER') });

  const f1 = addStr('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const f2 = addStr('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  let imageNum: number | null = null;
  if (logoJpeg) {
    const dict =
      `<< /Type /XObject /Subtype /Image /Width ${LOGO_NATIVE_W} /Height ${LOGO_NATIVE_H} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoJpeg.length} >>\nstream\n`;
    imageNum = add(Buffer.concat([Buffer.from(dict, 'utf8'), logoJpeg, Buffer.from('\nendstream', 'utf8')]));
  }

  const pageNums: number[] = [];
  for (const pageOps of pages) {
    const contentStr = pageOps.join('\n');
    const contentNum = addStr(
      `<< /Length ${Buffer.byteLength(contentStr, 'utf8')} >>\nstream\n${contentStr}\nendstream`
    );
    const xObj = imageNum ? ` /XObject << /Im1 ${imageNum} 0 R >>` : '';
    pageNums.push(
      addStr(
        `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
          `/Contents ${contentNum} 0 R /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >>${xObj} >> >>`
      )
    );
  }

  const pagesIdx = parts.findIndex((p) => p.n === pagesNum);
  parts[pagesIdx].bytes = Buffer.from(
    `<< /Type /Pages /Kids [${pageNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageNums.length} >>`,
    'utf8'
  );
  parts.sort((a, b) => a.n - b.n);

  let pdf = Buffer.from('%PDF-1.4\n', 'utf8');
  const offsets: number[] = [0];
  for (const part of parts) {
    offsets[part.n] = pdf.length;
    pdf = Buffer.concat([
      pdf,
      Buffer.from(`${part.n} 0 obj\n`, 'utf8'),
      part.bytes,
      Buffer.from('\nendobj\n', 'utf8'),
    ]);
  }

  const xrefPos = pdf.length;
  let xref = `xref\n0 ${parts.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= parts.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${parts.length + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.concat([pdf, Buffer.from(xref, 'utf8')]);
}
