/**
 * Minimal XLSX (Office Open XML) yozuvchi — tashqi kutubxonasiz. Excel, LibreOffice va Google
 * Sheets ochadi: varaqlar, sarlavha qatori (qalin), raqam va foiz formatlari, ustun kengligi,
 * muzlatilgan sarlavha. Siqilmagan ZIP (STORE) — hisobot kichik, hajm muammo emas.
 */

export type XlsxCell =
  | string
  | number
  | null
  | { value: number; format: "integer" | "decimal" | "percent" }
  | { value: string; style: "bold" | "title" };

export type XlsxSheet = {
  name: string;
  rows: readonly (readonly XlsxCell[])[];
  /** Birinchi qator — jadval sarlavhasi: qalin va muzlatilgan. */
  headerRow?: boolean;
};

/* ---------- ZIP ---------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

type ZipEntry = { name: string; data: Uint8Array };

/** ZIP arxivi (STORE, siqishsiz). Sana — 1980-01-01 (DOS minimal), fayl tarkibiga ta'sir qilmaydi. */
export const zip = (entries: readonly ZipEntry[]): Uint8Array => {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // versiya
    lv.setUint16(6, 0x0800, true); // UTF-8 nomlar
    lv.setUint16(8, 0, true); // STORE
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x21, true); // 1980-01-01
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);

    locals.push(local, entry.data);
    centrals.push(central);
    offset += local.length + size;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const parts = [...locals, ...centrals, end];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

/* ---------- XLSX ---------- */

const escapeXml = (value: string): string =>
  value
    // XML 1.0 da ruxsat etilmagan boshqaruv belgilari
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Ustun harfi: 0 → A, 25 → Z, 26 → AA. */
export const columnName = (index: number): string => {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rest = (n - 1) % 26;
    name = String.fromCharCode(65 + rest) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

/** Varaq nomi: ≤ 31 belgi, `[]:*?/\` yo'q, takrorlanmaydi. */
export const sheetNames = (names: readonly string[]): string[] => {
  const used = new Set<string>();
  return names.map((raw, index) => {
    const base =
      raw
        .replace(/[[\]:*?/\\]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 31) || `Sheet${index + 1}`;
    let name = base;
    for (let n = 2; used.has(name.toLowerCase()); n += 1)
      name = `${base.slice(0, 31 - `(${n})`.length - 1)} (${n})`;
    used.add(name.toLowerCase());
    return name;
  });
};

// Uslublar (styles.xml dagi `cellXfs` tartibi)
const STYLE = { normal: 0, bold: 1, integer: 2, decimal: 3, percent: 4, title: 5 } as const;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts>
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const cellXml = (cell: XlsxCell, ref: string, headerRow: boolean): string => {
  if (cell === null || cell === "") return "";
  if (typeof cell === "number")
    return Number.isFinite(cell)
      ? `<c r="${ref}" s="${Number.isInteger(cell) ? STYLE.integer : STYLE.decimal}"><v>${cell}</v></c>`
      : "";
  if (typeof cell === "string") {
    const style = headerRow ? STYLE.bold : STYLE.normal;
    return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`;
  }
  if (typeof cell.value === "number") {
    if (!Number.isFinite(cell.value)) return "";
    const format = "format" in cell ? cell.format : "decimal";
    return `<c r="${ref}" s="${STYLE[format]}"><v>${cell.value}</v></c>`;
  }
  const style = "style" in cell ? STYLE[cell.style] : STYLE.normal;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.value)}</t></is></c>`;
};

const cellWidth = (cell: XlsxCell): number => {
  if (cell === null) return 0;
  if (typeof cell === "number") return String(cell).length + 3;
  if (typeof cell === "string") return Math.max(...cell.split("\n").map((line) => line.length));
  if ("style" in cell && cell.style === "title") return 0; // sarlavha qatori kenglikni buzmasin
  return String(cell.value).length + 3;
};

const sheetXml = ({ rows, headerRow = false }: XlsxSheet): string => {
  const columns = Math.max(0, ...rows.map((row) => row.length));
  const widths = Array.from({ length: columns }, (_, column) =>
    Math.min(60, Math.max(8, ...rows.map((row) => cellWidth(row[column] ?? null) + 2))),
  );
  const cols =
    columns > 0
      ? `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols>`
      : "";
  const freeze = headerRow
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;
  const body = rows
    .map(
      (row, r) =>
        `<row r="${r + 1}">${row.map((cell, c) => cellXml(cell, `${columnName(c)}${r + 1}`, headerRow && r === 0)).join("")}</row>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}${cols}<sheetData>${body}</sheetData></worksheet>`;
};

/** Varaqlardan `.xlsx` baytlari. */
export const buildXlsx = (sheets: readonly XlsxSheet[]): Uint8Array => {
  const encoder = new TextEncoder();
  const names = sheetNames(sheets.map((sheet) => sheet.name));
  const text = (name: string, value: string): ZipEntry => ({ name, data: encoder.encode(value) });

  return zip([
    text(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${names
        .map(
          (_, index) =>
            `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
        )
        .join("")}</Types>`,
    ),
    text(
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    text(
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names
        .map(
          (name, index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
        )
        .join("")}</sheets></workbook>`,
    ),
    text(
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names
        .map(
          (_, index) =>
            `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
        )
        .join(
          "",
        )}<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ),
    text("xl/styles.xml", STYLES_XML),
    ...sheets.map((sheet, index) => text(`xl/worksheets/sheet${index + 1}.xml`, sheetXml(sheet))),
  ]);
};

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
