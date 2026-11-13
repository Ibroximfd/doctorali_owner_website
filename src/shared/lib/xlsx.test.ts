import { describe, expect, it } from "vitest";

import { buildXlsx, columnName, crc32, sheetNames } from "./xlsx";

/** Testdagi ZIP o'quvchi: markaziy katalog → nom, CRC, ma'lumot (STORE). */
const unzip = (bytes: Uint8Array): Map<string, string> => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files = new Map<string, string>();
  const decoder = new TextDecoder();
  for (let index = 0; index < count; index += 1) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const offset = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.slice(at + 46, at + 46 + nameLength));
    expect(view.getUint32(offset, true)).toBe(0x04034b50);
    const start = offset + 30 + view.getUint16(offset + 26, true);
    const data = bytes.slice(start, start + size);
    expect(crc32(data)).toBe(crc);
    files.set(name, decoder.decode(data));
    at += 46 + nameLength;
  }
  return files;
};

describe("xlsx", () => {
  it("computes the standard CRC-32", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("names columns and sheets the way Excel accepts", () => {
    expect([0, 25, 26, 701, 702].map(columnName)).toEqual(["A", "Z", "AA", "ZZ", "AAA"]);
    expect(sheetNames(["Hisobot", "hisobot", "A/B: [x]?", "", "x".repeat(40)])).toEqual([
      "Hisobot",
      "hisobot (2)",
      "A B x",
      "Sheet4",
      "x".repeat(31),
    ]);
  });

  it("builds a valid package with typed cells and escaped text", () => {
    const files = unzip(
      buildXlsx([
        {
          name: "Jadval",
          headerRow: true,
          rows: [
            ["Filial", "Tushum", "Ulush"],
            ["Qo'qon <T2> & co", { value: 12450000, format: "integer" }, { value: 0.182, format: "percent" }],
            [null, 4.5, ""],
          ],
        },
        { name: "Matn", rows: [[{ value: "Sarlavha", style: "title" }]] },
      ]),
    );
    expect([...files.keys()]).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
      "xl/worksheets/sheet2.xml",
    ]);
    const sheet = files.get("xl/worksheets/sheet1.xml") ?? "";
    expect(sheet).toContain('<c r="B2" s="2"><v>12450000</v></c>');
    expect(sheet).toContain('<c r="C2" s="4"><v>0.182</v></c>');
    expect(sheet).toContain('<c r="B3" s="3"><v>4.5</v></c>');
    expect(sheet).toContain("Qo'qon &lt;T2&gt; &amp; co");
    expect(sheet).toContain('state="frozen"');
    expect(files.get("xl/workbook.xml")).toContain('<sheet name="Matn" sheetId="2" r:id="rId2"/>');
  });
});
