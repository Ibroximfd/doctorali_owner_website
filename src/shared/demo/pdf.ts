import type { Sheet } from "./xlsx";

/**
 * Kichik PDF yozuvchi (kutubxonasiz): sarlavha va jadval qatorlari, A4, kerak
 * bo'lsa bir necha sahifa. Standart Helvetica shrifti — lotin belgilaridan
 * tashqarisi (ʻ, — kabi) yaqin ASCII ga almashtiriladi.
 */

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 40;
const LINE = 14;
const FONT_SIZE = 9;
const TITLE_SIZE = 15;
/** Helvetica 9pt da bir belgining taxminiy eni. */
const CHAR_WIDTH = 4.6;

const ASCII_MAP: Record<string, string> = {
  ʻ: "'",
  ʼ: "'",
  "‘": "'",
  "’": "'",
  "—": "-",
  "–": "-",
  "−": "-",
  "«": '"',
  "»": '"',
  "…": "...",
};

const toLatin = (value: string): string =>
  [...value]
    .map((char) => ASCII_MAP[char] ?? (char.charCodeAt(0) < 256 ? char : "?"))
    .join("")
    .replace(/[\\()]/g, (char) => `\\${char}`);

const fit = (value: string, width: number): string => {
  const max = Math.max(3, Math.floor(width / CHAR_WIDTH));
  return value.length > max ? `${value.slice(0, max - 1)}.` : value;
};

const text = (x: number, y: number, size: number, value: string, bold = false): string =>
  `BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${toLatin(value)}) Tj ET`;

const pagesFor = (title: string, sheets: readonly Sheet[]): string[] => {
  const pages: string[][] = [[]];
  let y = PAGE_HEIGHT - MARGIN;
  const current = () => pages[pages.length - 1] ?? [];
  const nextLine = (height = LINE) => {
    y -= height;
    if (y < MARGIN) {
      pages.push([]);
      y = PAGE_HEIGHT - MARGIN - LINE;
    }
  };

  current().push(text(MARGIN, y - TITLE_SIZE, TITLE_SIZE, title, true));
  nextLine(TITLE_SIZE + LINE);

  for (const sheet of sheets) {
    nextLine(LINE / 2);
    current().push(text(MARGIN, y, 11, sheet.name, true));
    nextLine();
    const columns = Math.max(1, ...sheet.rows.map((row) => row.length));
    const width = (PAGE_WIDTH - MARGIN * 2) / columns;
    sheet.rows.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const value = cell === null ? "" : typeof cell === "number" ? cell.toLocaleString("ru-RU") : cell;
        current().push(text(MARGIN + colIndex * width, y, FONT_SIZE, fit(value, width - 4), rowIndex === 0));
      });
      nextLine();
    });
  }
  return pages.map((lines) => lines.join("\n"));
};

export const buildPdf = (title: string, sheets: readonly Sheet[]): Uint8Array => {
  const pages = pagesFor(title, sheets);
  const objects: string[] = [];
  const add = (body: string): number => objects.push(body);

  const catalog = add("");
  const pagesId = add("");
  const regular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const bold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageIds = pages.map((content) => {
    const stream = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    return add(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> >> /Contents ${stream} 0 R >>`,
    );
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  // Barcha matn latin-1 — bayt uzunligi belgilar soniga teng, shuning uchun ofsetlar to'g'ri.
  let output = "%PDF-1.4\n";
  const offsets = objects.map((body, index) => {
    const offset = output.length;
    output += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return Uint8Array.from(output, (char) => char.charCodeAt(0) & 0xff);
};
