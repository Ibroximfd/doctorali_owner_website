import { isIssueSeverity, type IssueSeverity } from "../model/issues.rules";

type SeverityTone = { text: string; stroke: string; bg: string };

/** Jiddiylik ranglari: halqa, summa, plitka chizig'i, holat nuqtasi. Rang doim matn bilan birga. */
const SEVERITY_TONE: Record<IssueSeverity, SeverityTone> = {
  critical: { text: "text-crit", stroke: "stroke-crit", bg: "bg-crit" },
  high: { text: "text-serious", stroke: "stroke-serious", bg: "bg-serious" },
  medium: { text: "text-warn", stroke: "stroke-warn", bg: "bg-warn" },
  low: { text: "text-info", stroke: "stroke-info", bg: "bg-info" },
};

const NEUTRAL_TONE: SeverityTone = { text: "text-ink-2", stroke: "stroke-ink-3", bg: "bg-ink-3" };

export const severityTone = (severity: string | null): SeverityTone =>
  severity !== null && isIssueSeverity(severity) ? SEVERITY_TONE[severity] : NEUTRAL_TONE;
