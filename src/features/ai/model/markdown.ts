/**
 * AI javobi — Claude yozgan Markdown (sarlavha, ro'yxat, jadval, qalin matn). Bu yerda u
 * daraxtga (AST) aylanadi: UI uni React elementlari bilan chizadi (`innerHTML` yo'q — AI matni
 * hech qachon HTML sifatida bajarilmaydi), hisobot fayllari (Excel, PDF) va «nusxa olish» ham
 * shu daraxtdan yig'iladi. Faqat AI ishlatadigan qism qo'llanadi: CommonMark to'liq emas.
 */

export type Inline =
  | { type: "text"; value: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "code"; value: string };

export type Align = "left" | "right" | "center" | null;

export type ListItem = { content: Inline[]; children: Block[] };

export type Block =
  | { type: "heading"; level: number; content: Inline[] }
  | { type: "paragraph"; content: Inline[] }
  | { type: "list"; ordered: boolean; start: number; items: ListItem[] }
  | { type: "table"; header: Inline[][]; align: Align[]; rows: Inline[][][] }
  | { type: "quote"; children: Block[] }
  | { type: "code"; value: string }
  | { type: "rule" };

/* ---------- inline ---------- */

/** Belgi juftligi bilan o'ralgan qism: `**qalin**`, `__qalin__`, `*kursiv*`, `_kursiv_`. */
const EMPHASIS: readonly { marker: string; type: "strong" | "em" }[] = [
  { marker: "**", type: "strong" },
  { marker: "__", type: "strong" },
  { marker: "*", type: "em" },
  { marker: "_", type: "em" },
];

const isWordChar = (char: string | undefined): boolean => char !== undefined && /[\p{L}\p{N}]/u.test(char);

/** `[matn](url)` — havola matni qoladi, manzil tashlanadi (AI javobida tashqi havola kerak emas). */
const LINK = /^\[([^\]]+)\]\([^)]*\)/;

const pushText = (out: Inline[], value: string) => {
  if (value === "") return;
  const last = out.at(-1);
  if (last?.type === "text") last.value += value;
  else out.push({ type: "text", value });
};

export const parseInline = (source: string): Inline[] => {
  const out: Inline[] = [];
  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);
    const char = source[index];

    if (char === "\\" && index + 1 < source.length) {
      pushText(out, source[index + 1] ?? "");
      index += 2;
      continue;
    }
    if (char === "`") {
      const close = source.indexOf("`", index + 1);
      if (close > index + 1) {
        out.push({ type: "code", value: source.slice(index + 1, close) });
        index = close + 1;
        continue;
      }
    }
    const link = LINK.exec(rest);
    if (link) {
      out.push(...parseInline(link[1] ?? ""));
      index += link[0].length;
      continue;
    }
    const emphasis = EMPHASIS.find(({ marker }) => rest.startsWith(marker));
    if (emphasis) {
      const { marker, type } = emphasis;
      const after = source[index + marker.length];
      // `_` so'z ichida (`order_search`) belgi emas; ochuvchidan keyin bo'shliq bo'lmaydi.
      const opens =
        after !== undefined &&
        !/\s/.test(after) &&
        !(marker.startsWith("_") && isWordChar(source[index - 1]));
      const close = opens ? findClose(source, index + marker.length, marker) : -1;
      if (close !== -1) {
        out.push({ type, children: parseInline(source.slice(index + marker.length, close)) });
        index = close + marker.length;
        continue;
      }
      pushText(out, marker);
      index += marker.length;
      continue;
    }
    pushText(out, char ?? "");
    index += 1;
  }
  return out;
};

const findClose = (source: string, from: number, marker: string): number => {
  let at = source.indexOf(marker, from);
  while (at !== -1) {
    const before = source[at - 1];
    const after = source[at + marker.length];
    const valid =
      at > from &&
      before !== undefined &&
      !/\s/.test(before) &&
      // `**` ichidagi `*` kursiv yopuvchisi emas
      !(marker.length === 1 && after === marker) &&
      !(marker.startsWith("_") && isWordChar(after));
    if (valid) return at;
    at = source.indexOf(marker, at + marker.length);
  }
  return -1;
};

/** Daraxtdan toza matn (belgilarsiz). */
export const inlineText = (nodes: readonly Inline[]): string =>
  nodes.map((node) => ("children" in node ? inlineText(node.children) : node.value)).join("");

/* ---------- blocks ---------- */

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const BULLET = /^(\s*)([-*+•])\s+(.*)$/;
const ORDERED = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;
const FENCE = /^\s*(```|~~~)/;
const QUOTE = /^\s*>\s?(.*)$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

const isBlank = (line: string) => line.trim() === "";
const indentOf = (line: string) => (/^\s*/.exec(line)?.[0] ?? "").replace(/\t/g, "    ").length;

/** `| a | b |` → `["a", "b"]`; `\|` — katak ichidagi chiziq. */
const splitRow = (line: string): string[] => {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|") && !row.endsWith("\\|")) row = row.slice(0, -1);
  return row.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
};

const alignOf = (cell: string): Align => {
  const left = cell.startsWith(":");
  const right = cell.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return null;
};

const startsBlock = (line: string, next: string | undefined): boolean =>
  HEADING.test(line) ||
  RULE.test(line) ||
  FENCE.test(line) ||
  QUOTE.test(line) ||
  BULLET.test(line) ||
  ORDERED.test(line) ||
  (line.includes("|") && next !== undefined && TABLE_DIVIDER.test(next));

const parseLines = (lines: readonly string[]): Block[] => {
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const next = lines[index + 1];

    if (isBlank(line)) {
      index += 1;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").trim().startsWith(fence[1] ?? "```")) {
        body.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push({ type: "code", value: body.join("\n") });
      index += 1;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1]?.length ?? 1,
        content: parseInline(heading[2] ?? ""),
      });
      index += 1;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    if (line.includes("|") && next !== undefined && TABLE_DIVIDER.test(next)) {
      const header = splitRow(line);
      const align = splitRow(next).map(alignOf);
      const rows: Inline[][][] = [];
      index += 2;
      while (index < lines.length && (lines[index] ?? "").includes("|") && !isBlank(lines[index] ?? "")) {
        const cells = splitRow(lines[index] ?? "");
        // qator ustunlar soniga keltiriladi: kam bo'lsa bo'sh katak, ko'p bo'lsa kesiladi
        rows.push(header.map((_, column) => parseInline(cells[column] ?? "")));
        index += 1;
      }
      blocks.push({
        type: "table",
        header: header.map((cell) => parseInline(cell)),
        align: header.map((_, column) => align[column] ?? null),
        rows,
      });
      continue;
    }

    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (index < lines.length && QUOTE.test(lines[index] ?? "")) {
        body.push(QUOTE.exec(lines[index] ?? "")?.[1] ?? "");
        index += 1;
      }
      blocks.push({ type: "quote", children: parseLines(body) });
      continue;
    }

    if (BULLET.test(line) || ORDERED.test(line)) {
      const [list, consumed] = parseList(lines, index);
      blocks.push(list);
      index = consumed;
      continue;
    }

    const paragraph: string[] = [line.trim()];
    index += 1;
    while (
      index < lines.length &&
      !isBlank(lines[index] ?? "") &&
      !startsBlock(lines[index] ?? "", lines[index + 1])
    ) {
      paragraph.push((lines[index] ?? "").trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", content: parseInline(paragraph.join("\n")) });
  }
  return blocks;
};

/** Ro'yxat: bir xil chekinishdagi bandlar; chuqurroq chekingan qatorlar — ichki bloklar. */
const parseList = (lines: readonly string[], from: number): [Block, number] => {
  const first = lines[from] ?? "";
  const ordered = !BULLET.test(first);
  const pattern = ordered ? ORDERED : BULLET;
  const baseIndent = indentOf(first);
  const start = ordered ? Number(ORDERED.exec(first)?.[2] ?? 1) : 1;
  const items: ListItem[] = [];
  let index = from;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const match = pattern.exec(line);
    if (!match || indentOf(line) !== baseIndent) break;
    const text = [match[3] ?? ""];
    const nested: string[] = [];
    index += 1;
    while (index < lines.length) {
      const current = lines[index] ?? "";
      if (isBlank(current)) {
        // bo'sh qatordan keyin ham chekingan davom — o'sha band; aks holda ro'yxat tugadi
        const after = lines[index + 1];
        if (after !== undefined && !isBlank(after) && indentOf(after) > baseIndent) {
          nested.push("");
          index += 1;
          continue;
        }
        if (after !== undefined && pattern.test(after) && indentOf(after) === baseIndent) {
          index += 1;
        }
        break;
      }
      if (indentOf(current) > baseIndent) {
        nested.push(current.slice(Math.min(indentOf(current), baseIndent + 2)));
        index += 1;
        continue;
      }
      if (pattern.test(current) || startsBlock(current, lines[index + 1])) break;
      // chekinishsiz davom qatori (lazy continuation)
      text.push(current.trim());
      index += 1;
    }
    items.push({ content: parseInline(text.join("\n")), children: parseLines(nested) });
  }
  return [{ type: "list", ordered, start, items }, index];
};

export const parseMarkdown = (source: string): Block[] =>
  parseLines(source.replace(/\r\n?/g, "\n").split("\n"));

/* ---------- bo'limlar ---------- */

export type Section = { heading: Block & { type: "heading" }; blocks: Block[] };
export type Outline = { intro: Block[]; sections: Section[] };

/**
 * Uzun javob bo'limlarga: eng yuqori darajali sarlavha (odatda `##`) bo'yicha. Birinchi
 * sarlavhagacha bo'lgan qism — kirish. Sarlavha bitta bo'lsa ham bo'lim bo'ladi.
 */
export const outline = (blocks: readonly Block[]): Outline => {
  const levels = blocks.flatMap((block) => (block.type === "heading" ? [block.level] : []));
  if (levels.length === 0) return { intro: [...blocks], sections: [] };
  const top = Math.min(...levels);
  const intro: Block[] = [];
  const sections: Section[] = [];
  for (const block of blocks) {
    if (block.type === "heading" && block.level === top) sections.push({ heading: block, blocks: [] });
    else if (sections.length === 0) intro.push(block);
    else sections.at(-1)?.blocks.push(block);
  }
  return { intro, sections };
};

/* ---------- toza matn (nusxa olish) ---------- */

const listText = (block: Block & { type: "list" }, depth: number): string[] =>
  block.items.flatMap((item, position) => {
    const marker = block.ordered ? `${block.start + position}.` : "•";
    const pad = "  ".repeat(depth);
    return [
      `${pad}${marker} ${inlineText(item.content)}`,
      ...item.children.flatMap((child) =>
        child.type === "list" ? listText(child, depth + 1) : [`${pad}  ${blockText(child)}`],
      ),
    ];
  });

const blockText = (block: Block): string => {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return inlineText(block.content);
    case "list":
      return listText(block, 0).join("\n");
    case "table":
      // tab bilan — Excel/Sheets ga qo'yilganda ustunlarga tushadi
      return [block.header, ...block.rows].map((row) => row.map(inlineText).join("\t")).join("\n");
    case "quote":
      return block.children.map(blockText).join("\n\n");
    case "code":
      return block.value;
    case "rule":
      return "—";
  }
};

/** Javob Markdown belgilarisiz: messenjer yoki hujjatga qo'yish uchun. */
export const plainText = (blocks: readonly Block[]): string =>
  blocks
    .map(blockText)
    .filter((text) => text !== "")
    .join("\n\n");

/* ---------- jadvallar ---------- */

export type PlainTable = { title: string | null; header: string[]; rows: string[][] };

/** Javobdagi barcha jadvallar (ichki bloklar bilan) — har biri o'zidan oldingi sarlavha nomi bilan. */
export const tablesOf = (blocks: readonly Block[]): PlainTable[] => {
  const tables: PlainTable[] = [];
  let title: string | null = null;
  const walk = (list: readonly Block[]) => {
    for (const block of list) {
      if (block.type === "heading") title = inlineText(block.content);
      else if (block.type === "table")
        tables.push({
          title,
          header: block.header.map(inlineText),
          rows: block.rows.map((row) => row.map(inlineText)),
        });
      else if (block.type === "quote") walk(block.children);
      else if (block.type === "list") for (const item of block.items) walk(item.children);
    }
  };
  walk(blocks);
  return tables;
};
