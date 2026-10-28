import type { SalesMix } from "./warehouse.schema";

/** Chiqim turi: to'liq narx · chegirma · sovg'a. */
export const MIX_KINDS = ["full", "discount", "gift"] as const;
export type MixKind = (typeof MIX_KINDS)[number];

/** Oqim diagrammasi koordinatalari (SVG `viewBox` birliklarida). */
export const FLOW_BOX = { width: 1000, height: 380, top: 16 } as const;
const COLUMN = { source: 24, kind: 400, reason: 760 } as const;
export const NODE_WIDTH = 14;
/** Yorliqlar ustunlari (x, `viewBox` birliklarida): tugundan biroz o'ngda. */
export const LABEL_X = {
  kind: COLUMN.kind + NODE_WIDTH + 10,
  reason: COLUMN.reason + NODE_WIDTH + 10,
} as const;
const KIND_GAP = 18;
const REASON_GAP = 12;
/** Yorliqlar bir-birini bosmasligi uchun eng kichik masofa (birliklar). */
const LABEL_SPACING = 40;

export type FlowNode = { key: string; x: number; y: number; height: number };
/** `line` — oqim o'rta chizig'i (harakatlanuvchi shtrix uchun). */
export type FlowLink = { key: string; kind: MixKind; path: string; line: string; order: number };
export type KindNode = FlowNode & { kind: MixKind; units: number; labelY: number };
export type ReasonNode = FlowNode & {
  kind: MixKind;
  reason: string;
  units: number;
  amount: number;
  labelY: number;
};

export type MixFlow = {
  total: number;
  source: FlowNode;
  kinds: KindNode[];
  reasons: ReasonNode[];
  links: FlowLink[];
};

/** Ikki vertikal kesma orasidagi yumshoq oqim (yuqori va pastki egri). */
export const ribbon = (x0: number, a0: number, a1: number, x1: number, b0: number, b1: number): string => {
  const mid = (x0 + x1) / 2;
  return [
    `M${x0} ${a0}`,
    `C${mid} ${a0} ${mid} ${b0} ${x1} ${b0}`,
    `L${x1} ${b1}`,
    `C${mid} ${b1} ${mid} ${a1} ${x0} ${a1}`,
    "Z",
  ].join(" ");
};

/** Oqim o'rta chizig'i: ikki nuqta orasidagi yumshoq egri. */
export const midline = (x0: number, a: number, x1: number, b: number): string => {
  const mid = (x0 + x1) / 2;
  return `M${x0} ${a} C${mid} ${a} ${mid} ${b} ${x1} ${b}`;
};

/** Yorliqlarni pastga surib to'qnashuvni yo'qotadi, keyin pastki chegaradan oshganini yuqoriga qaytaradi. */
const spreadLabels = (centers: number[]): number[] => {
  const placed: number[] = [];
  centers.forEach((center, index) => {
    const previous = placed[index - 1];
    placed.push(previous === undefined ? center : Math.max(center, previous + LABEL_SPACING));
  });
  const limit = FLOW_BOX.height - LABEL_SPACING / 2;
  for (let index = placed.length - 1; index >= 0; index -= 1) {
    const next = placed[index + 1];
    const ceiling = next === undefined ? limit : next - LABEL_SPACING;
    placed[index] = Math.min(placed[index] ?? 0, ceiling);
  }
  return placed;
};

const unitsOf = (totals: SalesMix["totals"], kind: MixKind): number =>
  kind === "full" ? totals.fullUnits : kind === "discount" ? totals.discountUnits : totals.giftUnits;

/**
 * Sotuv tarkibini oqim (sankey) diagrammasiga aylantiradi: ombordan chiqqan jami → tur → sabab.
 * Balandlik — dona soniga proporsional; sabablar o'z turi ichida (yig'indisi oshsa — siqiladi).
 */
export const buildMixFlow = (mix: SalesMix): MixFlow => {
  const kindUnits = MIX_KINDS.map((kind) => ({ kind, units: unitsOf(mix.totals, kind) })).filter(
    (item) => item.units > 0,
  );
  const total = kindUnits.reduce((sum, item) => sum + item.units, 0);
  const available = FLOW_BOX.height - FLOW_BOX.top;
  const scale = total > 0 ? (available - KIND_GAP * Math.max(0, kindUnits.length - 1)) / total : 0;

  const source: FlowNode = { key: "source", x: COLUMN.source, y: FLOW_BOX.top, height: total * scale };
  const links: FlowLink[] = [];
  const kinds: KindNode[] = [];
  const pending: Omit<ReasonNode, "labelY" | "y">[] = [];
  const reasonFrom: { start: number; end: number; kind: MixKind }[] = [];

  let sourceCursor = FLOW_BOX.top;
  let kindCursor = FLOW_BOX.top;
  kindUnits.forEach(({ kind, units }) => {
    const height = units * scale;
    links.push({
      key: `source-${kind}`,
      kind,
      order: links.length,
      path: ribbon(
        COLUMN.source + NODE_WIDTH,
        sourceCursor,
        sourceCursor + height,
        COLUMN.kind,
        kindCursor,
        kindCursor + height,
      ),
      line: midline(
        COLUMN.source + NODE_WIDTH,
        sourceCursor + height / 2,
        COLUMN.kind,
        kindCursor + height / 2,
      ),
    });
    kinds.push({ key: kind, kind, units, x: COLUMN.kind, y: kindCursor, height, labelY: kindCursor });

    const rows = mix.reasons
      .filter((row) => row.kind === kind && row.units > 0)
      .sort((a, b) => b.units - a.units);
    const sum = rows.reduce((acc, row) => acc + row.units, 0);
    const reasonScale = sum > 0 ? Math.min(scale, height / sum) : 0;
    let inner = kindCursor;
    rows.forEach((row) => {
      const reasonHeight = row.units * reasonScale;
      pending.push({
        key: `${kind}-${row.reason}`,
        kind,
        reason: row.reason,
        units: row.units,
        amount: row.amount,
        x: COLUMN.reason,
        height: reasonHeight,
      });
      reasonFrom.push({ start: inner, end: inner + reasonHeight, kind });
      inner += reasonHeight;
    });

    sourceCursor += height;
    kindCursor += height + KIND_GAP;
  });

  const reasonSum = pending.reduce((acc, row) => acc + row.height, 0);
  const gap =
    pending.length > 0
      ? Math.min(40, Math.max(REASON_GAP, (available - reasonSum) / (pending.length + 1)))
      : 0;
  let reasonCursor = FLOW_BOX.top + Math.max(0, (available - reasonSum - gap * (pending.length - 1)) / 2);
  const placedY = pending.map((row) => {
    const y = reasonCursor;
    reasonCursor += row.height + gap;
    return y;
  });
  const labels = spreadLabels(placedY.map((y, index) => y + (pending[index]?.height ?? 0) / 2));

  const reasons: ReasonNode[] = pending.map((row, index) => {
    const y = placedY[index] ?? FLOW_BOX.top;
    const from = reasonFrom[index];
    if (from) {
      links.push({
        key: `reason-${row.key}`,
        kind: from.kind,
        order: links.length,
        path: ribbon(COLUMN.kind + NODE_WIDTH, from.start, from.end, COLUMN.reason, y, y + row.height),
        line: midline(
          COLUMN.kind + NODE_WIDTH,
          (from.start + from.end) / 2,
          COLUMN.reason,
          y + row.height / 2,
        ),
      });
    }
    return { ...row, y, labelY: labels[index] ?? y };
  });

  const kindLabels = spreadLabels(kinds.map((node) => node.y + node.height / 2));
  const spreadKinds = kinds.map((node, index) => ({ ...node, labelY: kindLabels[index] ?? node.y }));

  return { total, source, kinds: spreadKinds, reasons, links };
};
