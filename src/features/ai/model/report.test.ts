import { describe, expect, it } from "vitest";

import { parseMarkdown } from "./markdown";
import { asksForReport, isStructured, reportFileName, reportSheets, reportTitle, toXlsxCell } from "./report";

const ANSWER = `## Qo'qon — bugun

Jami **42** zakaz.

### Operatorlar
| Operator | Zakaz | Konversiya |
|---|---:|---:|
| Aziza | 12 | 18.5% |
| Bekzod | 7 | 9% |`;

const META = {
  title: "Qo'qon — bugun",
  question: "Bugunlik hisobot kerak qoqon fliali bo'yicha",
  generatedAt: "13.11 12:06",
  labels: { question: "Savol", generated: "Tayyorlandi", summarySheet: "Hisobot", tableSheet: "Jadval" },
};

describe("report", () => {
  it("recognises a report request in uz and ru", () => {
    expect(asksForReport("Bugunlik hisobot kerak qoqon fliali bo'yicha")).toBe(true);
    expect(asksForReport("Дай отчёт по Коканду")).toBe(true);
    expect(asksForReport("Ҳисобот бер")).toBe(true);
    expect(asksForReport("Atkaz nega oshdi?")).toBe(false);
    expect(asksForReport(null)).toBe(false);
  });

  it("offers files only for structured answers or report requests", () => {
    expect(isStructured(parseMarkdown(ANSWER))).toBe(true);
    expect(isStructured(parseMarkdown("Bugun hammasi joyida."))).toBe(false);
  });

  it("titles the report by its first heading, else by the question", () => {
    expect(reportTitle(parseMarkdown(ANSWER), "savol", "AI hisobot")).toBe("Qo'qon — bugun");
    expect(reportTitle(parseMarkdown("Matn"), "  Qo'qon   bo'yicha ", "AI hisobot")).toBe("Qo'qon bo'yicha");
    expect(reportTitle([], null, "AI hisobot")).toBe("AI hisobot");
  });

  it("names the file in Tashkent time", () => {
    expect(reportFileName("AI-hisobot", new Date("2026-11-13T07:06:00Z"))).toBe("AI-hisobot-2026-11-13-1206");
  });

  it("turns cells into real numbers for Excel", () => {
    expect(toXlsxCell("12 450 000")).toEqual({ value: 12450000, format: "integer" });
    expect(toXlsxCell("18.5%")).toEqual({ value: 0.185, format: "percent" });
    expect(toXlsxCell("4,5")).toEqual({ value: 4.5, format: "decimal" });
    expect(toXlsxCell("3 100 000 so'm")).toEqual({ value: 3100000, format: "integer" });
    expect(toXlsxCell("24 dona")).toBe("24 dona");
    expect(toXlsxCell("Aziza")).toBe("Aziza");
    expect(toXlsxCell(" ")).toBeNull();
  });

  it("builds a summary sheet plus one sheet per table", () => {
    const sheets = reportSheets(parseMarkdown(ANSWER), META);
    expect(sheets.map((sheet) => sheet.name)).toEqual(["Hisobot", "Operatorlar"]);
    expect(sheets[0]?.rows.slice(0, 3)).toEqual([
      [{ value: "Qo'qon — bugun", style: "title" }],
      ["Savol: Bugunlik hisobot kerak qoqon fliali bo'yicha"],
      ["Tayyorlandi: 13.11 12:06"],
    ]);
    expect(sheets[0]?.rows).toContainEqual(["Jami 42 zakaz."]);
    expect(sheets[1]).toEqual({
      name: "Operatorlar",
      headerRow: true,
      rows: [
        ["Operator", "Zakaz", "Konversiya"],
        ["Aziza", { value: 12, format: "integer" }, { value: 0.185, format: "percent" }],
        ["Bekzod", { value: 7, format: "integer" }, { value: 0.09, format: "percent" }],
      ],
    });
  });
});
