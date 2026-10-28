/**
 * Kichik XLSX yozuvchi (kutubxonasiz): bir nechta varaq, matn va son kataklari,
 * birinchi qator qalin. Demo rejimdagi hisobot va AI ilovalari uchun yetarli —
 * Excel, LibreOffice va Google Sheets ogohlantirishsiz ochadi.
 * ZIP siqilmagan (STORE) holda yig'iladi: fayllar kichik, kod sodda.
 */

export type Cell = string | number | null;
export type Sheet = { name: string; rows: readonly (readonly Cell[])[] };

const encoder = new TextEncoder();

/* ---------- ZIP (STORE) ---------- */

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const header = (size: number, write: (view: DataView) => void): Uint8Array => {
  const bytes = new Uint8Array(size);
  write(new DataView(bytes.buffer));
  return bytes;
};

const concat = (parts: readonly Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
};

export const zip = (files: readonly { path: string; content: string }[]): Uint8Array => {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.path);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = header(30, (view) => {
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true); // UTF-8 nomlar
      view.setUint32(14, crc, true);
      view.setUint32(18, data.length, true);
      view.setUint32(22, data.length, true);
      view.setUint16(26, name.length, true);
    });
    const central = header(46, (view) => {
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(8, 0x0800, true);
      view.setUint32(16, crc, true);
      view.setUint32(20, data.length, true);
      view.setUint32(24, data.length, true);
      view.setUint16(28, name.length, true);
      view.setUint32(42, offset, true);
    });
    locals.push(local, name, data);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }

  const directory = concat(centrals);
  const end = header(22, (view) => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, files.length, true);
    view.setUint16(10, files.length, true);
    view.setUint32(12, directory.length, true);
    view.setUint32(16, offset, true);
  });
  return concat([...locals, directory, end]);
};

/* ---------- SpreadsheetML ---------- */

const escapeXml = (value: string): string =>
  value.replace(
    /[<>&"]/g,
    (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[char] ?? char,
  );

const columnName = (index: number): string => {
  let name = "";
  for (let rest = index + 1; rest > 0; rest = Math.floor((rest - 1) / 26))
    name = String.fromCharCode(65 + ((rest - 1) % 26)) + name;
  return name;
};

const cellXml = (cell: Cell, ref: string, bold: boolean): string => {
  const style = bold ? ' s="1"' : "";
  if (cell === null || cell === "") return "";
  if (typeof cell === "number" && Number.isFinite(cell)) return `<c r="${ref}"${style}><v>${cell}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(String(cell))}</t></is></c>`;
};

/** Ustun kengligi — eng uzun qiymatga qarab (Excel avtomatik kengaytirmaydi). */
const columnsXml = (rows: Sheet["rows"]): string => {
  const widths: number[] = [];
  for (const row of rows)
    row.forEach((cell, index) => {
      const length = cell === null ? 0 : String(cell).length;
      widths[index] = Math.min(60, Math.max(widths[index] ?? 8, length + 2));
    });
  if (widths.length === 0) return "";
  return `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols>`;
};

const sheetXml = ({ rows }: Sheet): string => {
  const body = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row.map((cell, colIndex) => cellXml(cell, `${columnName(colIndex)}${rowIndex + 1}`, rowIndex === 0)).join("")}</row>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${columnsXml(rows)}<sheetData>${body}</sheetData></worksheet>`;
};

/** Excel varaq nomi: 31 belgi, `[]:*?/\` taqiqlangan. */
const sheetName = (name: string, index: number): string =>
  name
    .replace(/[[\]:*?/\\]/g, " ")
    .slice(0, 31)
    .trim() || `Varaq ${index + 1}`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>`;

export const buildXlsx = (sheets: readonly Sheet[]): Uint8Array => {
  const list = sheets.length > 0 ? sheets : [{ name: "Hisobot", rows: [] }];
  const ns = "http://schemas.openxmlformats.org";
  return zip([
    {
      path: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${ns}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${list.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    },
    {
      path: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      path: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ns}/spreadsheetml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships"><sheets>${list.map((sheet, index) => `<sheet name="${escapeXml(sheetName(sheet.name, index))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`,
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}/package/2006/relationships">${list.map((_, index) => `<Relationship Id="rId${index + 1}" Type="${ns}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${list.length + 1}" Type="${ns}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { path: "xl/styles.xml", content: STYLES },
    ...list.map((sheet, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      content: sheetXml(sheet),
    })),
  ]);
};
