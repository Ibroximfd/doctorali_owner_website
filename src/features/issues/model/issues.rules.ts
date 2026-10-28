import type { Issue } from "./issues.schema";

export const ISSUE_DOMAINS = ["warehouse", "logistics", "finance", "system", "clinic", "sales"] as const;
export type IssueDomain = (typeof ISSUE_DOMAINS)[number];
export const isIssueDomain = (value: string): value is IssueDomain =>
  ISSUE_DOMAINS.some((known) => known === value);

export const ISSUE_SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];
export const isIssueSeverity = (value: string): value is IssueSeverity =>
  ISSUE_SEVERITIES.some((known) => known === value);

export const ISSUE_STATUSES = ["open", "notified", "acknowledged", "in_progress", "resolved"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export const isIssueStatus = (value: string): value is IssueStatus =>
  ISSUE_STATUSES.some((known) => known === value);

export const NOTIFY_CHANNELS = ["telegram", "sms", "app"] as const;
export type NotifyChannel = (typeof NOTIFY_CHANNELS)[number];
export const isNotifyChannel = (value: string): value is NotifyChannel =>
  NOTIFY_CHANNELS.some((known) => known === value);

export const TIMELINE_KINDS = [
  "detected",
  "notified",
  "acknowledged",
  "comment",
  "escalated",
  "resolved",
] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];
export const isTimelineKind = (value: string): value is TimelineKind =>
  TIMELINE_KINDS.some((known) => known === value);

/** Xabar matni chegarasi (backend bilan bir xil). */
export const MESSAGE_MAX = 1000;

const severityRank = (severity: string): number => {
  const index = ISSUE_SEVERITIES.findIndex((known) => known === severity);
  return index === -1 ? ISSUE_SEVERITIES.length : index;
};

/** Ro'yxat tartibi: jiddiyligi, keyin yangisi tepada. Hal qilinganlar oxirida. */
export const sortIssues = (issues: readonly Issue[]): Issue[] =>
  [...issues].sort(
    (a, b) =>
      Number(a.status === "resolved") - Number(b.status === "resolved") ||
      severityRank(a.severity) - severityRank(b.severity) ||
      Date.parse(b.detectedAt) - Date.parse(a.detectedAt),
  );

/**
 * Xabar tayyor matni: mas'ulning ismi, muammo va sabab. Boshliq tahrirlaydi;
 * matnni tilga qarab UI beradi (`template` — tarjimadan).
 */
export const defaultMessage = (
  template: (values: { name: string; title: string; cause: string }) => string,
  issue: Pick<Issue, "title" | "cause">,
  recipientName: string | null,
): string =>
  template({ name: (recipientName ?? "").split(" ")[0] ?? "", title: issue.title, cause: issue.cause }).slice(
    0,
    MESSAGE_MAX,
  );

/** Qabul qiluvchida ishlaydigan kanallardan faqat ma'lumlari. */
export const availableChannels = (channels: readonly string[]): NotifyChannel[] =>
  NOTIFY_CHANNELS.filter((channel) => channels.includes(channel));

/** Holat almashtirgichi: API ning 5 holati 3 guruhga yig'iladi. */
export const ISSUE_TABS = ["open", "progress", "resolved"] as const;
export type IssueTab = (typeof ISSUE_TABS)[number];

export const tabOf = (status: string): IssueTab =>
  status === "resolved"
    ? "resolved"
    : status === "acknowledged" || status === "in_progress"
      ? "progress"
      : "open";

export const countByTab = (issues: readonly Pick<Issue, "status">[]): Record<IssueTab, number> => {
  const counts: Record<IssueTab, number> = { open: 0, progress: 0, resolved: 0 };
  for (const issue of issues) counts[tabOf(issue.status)] += 1;
  return counts;
};

export type DomainSummary = { domain: IssueDomain; count: number; worst: IssueSeverity | null };

/** Har yo'nalish bo'yicha soni va eng jiddiy darajasi (plitka rangi). */
export const summarizeDomains = (issues: readonly Pick<Issue, "domain" | "severity">[]): DomainSummary[] =>
  ISSUE_DOMAINS.map((domain) => {
    const own = issues.filter((issue) => issue.domain === domain);
    const worst =
      ISSUE_SEVERITIES.find((severity) => own.some((issue) => issue.severity === severity)) ?? null;
    return { domain, count: own.length, worst };
  });

/** Holat bosqichi 0..1 — karta halqasi shuncha to'ladi (API da SLA muddati yo'q). */
export const statusProgress = (status: string): number => {
  const index = ISSUE_STATUSES.findIndex((known) => known === status);
  return index === -1 ? 0 : (index + 1) / ISSUE_STATUSES.length;
};

/** Pul ta'siri eng kattasi — sarlavha jumlasidagi «eng qimmati». */
export const costliest = <T extends Pick<Issue, "impact">>(issues: readonly T[]): T | null =>
  issues.reduce<T | null>(
    (best, issue) =>
      issue.impact?.kind === "money" && (best?.impact?.value ?? 0) < issue.impact.value ? issue : best,
    null,
  );

export type AgeUnit = "minutes" | "hours" | "days";

/** Aniqlangandan beri o'tgan vaqt — halqa markazidagi raqam va birlik. */
export const ageOf = (iso: string, now: number): { value: number; unit: AgeUnit } => {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
  if (minutes < 60) return { value: minutes, unit: "minutes" };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { value: hours, unit: "hours" };
  return { value: Math.floor(hours / 24), unit: "days" };
};
