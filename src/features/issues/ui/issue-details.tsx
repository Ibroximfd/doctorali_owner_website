"use client";

import { motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/shared/hooks/use-format";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { routes } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { useCanAct } from "@/shared/stores/session-store";
import { Button } from "@/shared/ui/button";
import { DrawerSection } from "@/shared/ui/drawer";
import { KvList } from "@/shared/ui/kv-list";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { ScopeLink } from "@/shared/ui/scope-link";

import { useIssueDrawer } from "../hooks/use-issue-drawer";
import { isIssueSeverity, isIssueStatus, isTimelineKind, type TimelineKind } from "../model/issues.rules";
import type { IssueDetail } from "../model/issues.schema";
import { severityTone } from "./issue-tone";
import { useImpactLabel } from "./issue-impact";
import { NotifyForm } from "./notify-form";

/** Vaqt chizig'idagi nuqta chegarasi — voqea turiga qarab. */
const TIMELINE_DOT: Record<TimelineKind, string> = {
  detected: "border-crit",
  notified: "border-info",
  acknowledged: "border-warn",
  comment: "border-ink-3",
  escalated: "border-serious",
  resolved: "border-good",
};

const AskAi = () => {
  const t = useTranslations("issues.drawer");
  return (
    <Button asChild size="lg">
      <ScopeLink href={routes.ai}>
        <Sparkles aria-hidden />
        {t("askAi")}
      </ScopeLink>
    </Button>
  );
};

type IssueDetailsProps = {
  issue: IssueDetail;
  /** Desktop panelida sarlavha shu yerda (Fraunces); drawerda — uning sarlavha qatorida. */
  showTitle?: boolean;
};

/**
 * Tanlangan muammo: pulslovchi holat, sarlavha, sabab va ta'sir, vaqt chizig'i,
 * diagnostika va «mas'ulga xabar» kompozeri (ko'ruvchiga — faqat AI havolasi).
 */
export const IssueDetails = ({ issue, showTitle = false }: IssueDetailsProps) => {
  const t = useTranslations("issues.drawer");
  const tSeverity = useTranslations("issues.severity");
  const tStatus = useTranslations("issues.status");
  const tTimeline = useTranslations("issues.timeline");
  const format = useFormat();
  const relative = useRelativeTime();
  const reduce = useReducedMotion();
  const impactLabel = useImpactLabel();
  const { isComposing, setComposing } = useIssueDrawer();
  const canAct = useCanAct();
  const impact = impactLabel(issue.impact);
  const isResolved = issue.status === "resolved";
  const tone = severityTone(issue.severity);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="relative flex size-3">
            {isResolved ? null : (
              <span className={cn("animate-ping-soft absolute inset-0 rounded-full", tone.bg)} />
            )}
            <span className={cn("relative size-3 rounded-full", tone.bg)} />
          </span>
          <span className={cn("text-sm font-bold", tone.text)}>
            {[
              isIssueSeverity(issue.severity) ? tSeverity(issue.severity) : issue.severity,
              isIssueStatus(issue.status) ? tStatus(issue.status) : issue.status,
              t("age", { value: relative(issue.detectedAt) }),
            ].join(" · ")}
          </span>
        </div>
        {showTitle ? (
          <h2 className="font-display mt-3.5 text-2xl leading-tight md:text-3xl">{issue.title}</h2>
        ) : null}
        <p className="text-ink-2 mt-2.5 text-base leading-relaxed">{issue.cause}</p>
        {impact ? <p className={cn("mt-2 text-sm font-semibold", tone.text)}>{impact}</p> : null}
      </div>

      {issue.timeline.length > 0 ? (
        <DrawerSection title={t("timeline")}>
          <ol className="relative flex flex-col gap-3.5 pl-6">
            <span
              aria-hidden
              className="from-crit to-crit/10 absolute top-1.5 bottom-1.5 left-1.5 w-0.5 bg-linear-to-b"
            />
            {issue.timeline.map((event, index) => {
              const kind = isTimelineKind(event.kind) ? event.kind : null;
              return (
                <motion.li
                  key={`${event.at}-${index}`}
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT, delay: index * 0.07 }}
                  className="relative"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "bg-bg absolute top-1 -left-6 size-3 rounded-full border-2",
                      kind ? TIMELINE_DOT[kind] : "border-ink-3",
                    )}
                  />
                  <span className="num text-2xs text-ink-3 block">
                    {format.dateTime(event.at)}
                    {event.actor ? ` · ${event.actor}` : ""}
                  </span>
                  <span className="block text-sm">
                    {kind ? tTimeline(kind) : event.kind}
                    {event.channel ? <span className="text-ink-3"> · {event.channel}</span> : null}
                  </span>
                  {event.text ? (
                    <p className="text-ink-2 mt-0.5 text-xs whitespace-pre-line">{event.text}</p>
                  ) : null}
                </motion.li>
              );
            })}
          </ol>
        </DrawerSection>
      ) : null}

      {isResolved || !canAct ? (
        <div>
          <AskAi />
        </div>
      ) : (
        <NotifyForm
          key={issue.id}
          issue={issue}
          autoFocus={isComposing}
          onDone={() => setComposing(false)}
          aside={<AskAi />}
        />
      )}

      {issue.diagnostics.length > 0 ? (
        <DrawerSection title={t("diagnostics")}>
          <KvList
            rows={issue.diagnostics.map((row, index) => ({
              key: `${index}`,
              label: row.label,
              value: row.value,
            }))}
          />
        </DrawerSection>
      ) : null}

      <DrawerSection title={t("details")}>
        <KvList
          rows={[
            { key: "entity", label: t("entity"), value: issue.entity?.label ?? "—" },
            { key: "filial", label: t("filial"), value: issue.filial ?? "—" },
            {
              key: "responsible",
              label: t("responsible"),
              value: issue.responsible?.fullName ?? "—",
              hint: issue.responsible?.role,
            },
            { key: "detected", label: t("detected"), value: format.dateTime(issue.detectedAt) },
          ]}
        />
      </DrawerSection>
    </div>
  );
};
