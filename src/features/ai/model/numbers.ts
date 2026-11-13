import { formatDecimal, formatNumber, formatPercent } from "@/shared/lib/format";

/**
 * AI jadvalidagi raqamli katak: `12450000`, `12 450 000`, `12,450,000`, `4,5`, `18.2%`,
 * `312000 so'm`. Raqam o'zi va (bo'lsa) birligi ajratiladi — ekranda panelning yagona
 * formatida chiqadi, Excel da esa haqiqiy son bo'ladi.
 */
export type NumericCell = {
  value: number;
  /** Kasr xonalari soni (manbada qancha bo'lsa) — `4,50` → 2. */
  decimals: number;
  percent: boolean;
  /** Raqamdan keyingi qisqa birlik: `so'm`, `ta`, `dona`, `сум`. */
  unit: string | null;
};

const GROUPED_COMMA = /^\d{1,3}(,\d{3})+$/;
const GROUPED_DOT = /^\d{1,3}(\.\d{3})+$/;
const SHAPE = /^([+\-−]?)(\d[\d\s.,  ]*?)\s*(%)?\s*([\p{L}'ʻʼ’.]{1,6})?$/u;

/** Satr → son: `1 234,5` / `1,234.5` / `1.234` (guruh) / `4.5` (kasr). Noto'g'ri — `null`. */
const toNumber = (digits: string): { value: number; decimals: number } | null => {
  // bo'shliq faqat minglik ajratuvchi bo'la oladi: `12 450 000` ha, `+998 90 123 45 67` yo'q
  const spaced = digits.trim().split(/[\s  ]+/);
  if (spaced.length > 1 && spaced.slice(1).some((group) => !/^\d{3}([.,]\d+)?$/.test(group))) return null;
  const compact = digits.replace(/[\s  ]/g, "");
  if (!/^[\d.,]+$/.test(compact) || !/\d$/.test(compact)) return null;
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  let whole = compact;
  let fraction = "";
  if (lastComma !== -1 && lastDot !== -1) {
    const at = Math.max(lastComma, lastDot);
    whole = compact.slice(0, at).replace(/[.,]/g, "");
    fraction = compact.slice(at + 1);
  } else if (lastComma !== -1 || lastDot !== -1) {
    const separator = lastComma !== -1 ? "," : ".";
    const grouped = separator === "," ? GROUPED_COMMA : GROUPED_DOT;
    if (grouped.test(compact)) whole = compact.replaceAll(separator, "");
    else {
      const parts = compact.split(separator);
      if (parts.length !== 2) return null;
      whole = parts[0] ?? "";
      fraction = parts[1] ?? "";
    }
  }
  if (!/^\d+$/.test(whole) || (fraction !== "" && !/^\d+$/.test(fraction))) return null;
  const value = Number(fraction === "" ? whole : `${whole}.${fraction}`);
  return Number.isFinite(value) ? { value, decimals: fraction.length } : null;
};

export const parseNumericCell = (raw: string): NumericCell | null => {
  const match = SHAPE.exec(raw.trim());
  if (!match) return null;
  const parsed = toNumber(match[2] ?? "");
  if (!parsed) return null;
  // yil (`2026`) — son emas, sana qismi: ajratuvchisiz 4 xonali 1900–2100 o'zgarmaydi
  if (
    !match[3] &&
    !match[4] &&
    /^\d{4}$/.test(match[2] ?? "") &&
    parsed.value >= 1900 &&
    parsed.value <= 2100
  )
    return null;
  const negative = match[1] === "-" || match[1] === "−";
  return {
    value: negative ? -parsed.value : parsed.value,
    decimals: parsed.decimals,
    percent: match[3] === "%",
    unit: match[4] ?? null,
  };
};

/** Panel formatida: `12 450 000 so'm`, `4,5`, `18,2%`. Raqam bo'lmasa — asl matn. */
export const formatCell = (raw: string): string => {
  const cell = parseNumericCell(raw);
  if (!cell) return raw;
  const digits = Math.min(cell.decimals, 2);
  const number = cell.percent
    ? formatPercent(cell.value, digits)
    : digits === 0
      ? formatNumber(cell.value)
      : formatDecimal(cell.value, digits);
  return cell.unit ? `${number} ${cell.unit}` : number;
};

/** Ustun raqamli: to'ldirilgan kataklarning kamida yarmi son (ustun o'ngga tekislanadi). */
export const isNumericColumn = (cells: readonly string[]): boolean => {
  const filled = cells.filter((cell) => cell.trim() !== "" && cell.trim() !== "—" && cell.trim() !== "-");
  if (filled.length === 0) return false;
  return filled.filter((cell) => parseNumericCell(cell) !== null).length * 2 >= filled.length;
};
