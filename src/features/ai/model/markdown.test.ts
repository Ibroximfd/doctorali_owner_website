import { describe, expect, it } from "vitest";

import { inlineText, outline, parseInline, parseMarkdown, plainText, tablesOf } from "./markdown";

/** Prod javobiga o'xshash (hujjat 56: «Bugunlik hisobot … qoqon filiali»). */
const REPORT = `## Qo'qon filiali — bugungi hisobot (13.11.2026)

Bugun **42 ta** zakaz tushdi, *kechagidan* 8% ko'p.

### Asosiy raqamlar
| Ko'rsatkich | Qiymat |
|---|---:|
| Zakazlar | 42 |
| Tushum | 12450000 |
| Konversiya | 18.2% |

## Muammolar
1. Kuryerda pul: 3 450 000 so'm
2. Sklad:
   - Kardiomed — 24 dona
   - Gepatofit — 8 dona

---
> Manba: \`finance_summary\`, order_search`;

describe("parseMarkdown", () => {
  it("reads headings, paragraphs, tables and nested lists", () => {
    const blocks = parseMarkdown(REPORT);
    expect(blocks.map((block) => block.type)).toEqual([
      "heading",
      "paragraph",
      "heading",
      "table",
      "heading",
      "list",
      "rule",
      "quote",
    ]);
    const table = blocks[3];
    if (table?.type !== "table") throw new Error("no table");
    expect(table.header.map(inlineText)).toEqual(["Ko'rsatkich", "Qiymat"]);
    expect(table.align).toEqual([null, "right"]);
    expect(table.rows.map((row) => row.map(inlineText))).toEqual([
      ["Zakazlar", "42"],
      ["Tushum", "12450000"],
      ["Konversiya", "18.2%"],
    ]);
    const list = blocks[5];
    if (list?.type !== "list") throw new Error("no list");
    expect(list.ordered).toBe(true);
    expect(list.items).toHaveLength(2);
    const nested = list.items[1]?.children[0];
    expect(nested?.type === "list" && nested.items.map((item) => inlineText(item.content))).toEqual([
      "Kardiomed — 24 dona",
      "Gepatofit — 8 dona",
    ]);
  });

  it("parses bold, italic and code without touching snake_case words", () => {
    expect(parseInline("**42 ta** va *ko'p* `x_y` order_search")).toEqual([
      { type: "strong", children: [{ type: "text", value: "42 ta" }] },
      { type: "text", value: " va " },
      { type: "em", children: [{ type: "text", value: "ko'p" }] },
      { type: "text", value: " " },
      { type: "code", value: "x_y" },
      { type: "text", value: " order_search" },
    ]);
    // yopilmagan belgi — oddiy matn
    expect(inlineText(parseInline("2 * 3 = 6 va **ochiq"))).toBe("2 * 3 = 6 va **ochiq");
  });

  it("keeps table rows aligned to the header width", () => {
    const [table] = parseMarkdown("| A | B | C |\n|---|---|---|\n| 1 | 2 |\n| 1 | 2 | 3 | 4 |");
    if (table?.type !== "table") throw new Error("no table");
    expect(table.rows.map((row) => row.map(inlineText))).toEqual([
      ["1", "2", ""],
      ["1", "2", "3"],
    ]);
  });

  it("plain text answer stays one paragraph per block", () => {
    expect(parseMarkdown("Birinchi qator\nikkinchi\n\nYangi xatboshi").map((block) => block.type)).toEqual([
      "paragraph",
      "paragraph",
    ]);
  });
});

describe("outline, plainText, tablesOf", () => {
  it("splits a long answer into sections by its top heading", () => {
    const { intro, sections } = outline(parseMarkdown(REPORT));
    expect(intro).toEqual([]);
    expect(sections.map((section) => inlineText(section.heading.content))).toEqual([
      "Qo'qon filiali — bugungi hisobot (13.11.2026)",
      "Muammolar",
    ]);
  });

  it("copies clean text: no markdown marks, tables tab-separated", () => {
    const text = plainText(parseMarkdown(REPORT));
    expect(text).not.toMatch(/\*\*|##|\|/);
    expect(text).toContain("Bugun 42 ta zakaz tushdi");
    expect(text).toContain("Tushum\t12450000");
    expect(text).toContain("1. Kuryerda pul: 3 450 000 so'm");
    expect(text).toContain("  • Kardiomed — 24 dona");
  });

  it("collects tables with the heading above them", () => {
    expect(tablesOf(parseMarkdown(REPORT))).toEqual([
      {
        title: "Asosiy raqamlar",
        header: ["Ko'rsatkich", "Qiymat"],
        rows: [
          ["Zakazlar", "42"],
          ["Tushum", "12450000"],
          ["Konversiya", "18.2%"],
        ],
      },
    ]);
  });
});
