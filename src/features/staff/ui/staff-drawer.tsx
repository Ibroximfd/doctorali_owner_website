"use client";

import { Sparkles, Star, ThumbsDown, ThumbsUp, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { seriesBg } from "@/shared/config/chart-palette";
import { useFormat } from "@/shared/hooks/use-format";
import { toAppError } from "@/shared/lib/app-error";
import { cn } from "@/shared/lib/cn";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Drawer, DrawerSection } from "@/shared/ui/drawer";
import { Funnel } from "@/shared/ui/funnel";
import { MetricDelta } from "@/shared/ui/metric-delta";
import { Rating } from "@/shared/ui/rating";
import { Sparkline } from "@/shared/ui/sparkline";
import { BlockSkeleton, ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useStaffProfileQuery, useStaffView } from "../hooks/use-staff";
import { isStaffRole, metricValue, scoreTone, versusTeam } from "../model/staff.rules";
import type { StaffProfile } from "../model/staff.schema";
import { useMetricFormat, useMetricLabel } from "./metric-format";

const SCORE_TEXT = { good: "text-good", warn: "text-warn", crit: "text-crit" } as const;

/** Xodim profili (`?staff=<id>`): ball va o'rni, voronka, jamoa o'rtachasi bilan taqqoslash, baholar, AI xulosasi. */
export const StaffDrawer = () => {
  const t = useTranslations("staff.profile");
  const tRole = useTranslations("staff.roles");
  const { staffId, closeStaff } = useStaffView();
  const [shownId, setShownId] = useState(staffId);
  if (staffId !== null && staffId !== shownId) setShownId(staffId);
  const query = useStaffProfileQuery(shownId, staffId !== null);
  const profile = query.data?.data;
  const isNotFound = profile === undefined && query.isError && toAppError(query.error).kind === "not-found";

  return (
    <Drawer
      open={staffId !== null}
      onOpenChange={(open) => {
        if (!open) closeStaff();
      }}
      title={profile?.fullName ?? t("title")}
      subtitle={
        profile ? (
          <span className="text-ink-3 text-xs">
            {isStaffRole(profile.role) ? tRole(profile.role) : profile.role}
            {profile.team ? ` · ${profile.team}` : ""}
          </span>
        ) : undefined
      }
    >
      {isNotFound ? (
        <StateBlock icon={UserX} title={t("notFoundTitle")} description={t("notFoundDescription")} />
      ) : (
        <QueryState
          query={query}
          className="flex flex-col gap-4.5"
          skeleton={
            <>
              <BlockSkeleton className="h-28" />
              <ListSkeleton rows={5} />
            </>
          }
        >
          {({ data }) => <ProfileBody profile={data} />}
        </QueryState>
      )}
    </Drawer>
  );
};

const ProfileBody = ({ profile }: { profile: StaffProfile }) => {
  const t = useTranslations("staff.profile");
  const tFunnel = useTranslations("staff.funnel");
  const formatMetric = useMetricFormat();
  const metricLabel = useMetricLabel();
  const format = useFormat();

  return (
    <>
      <div className="hero-surface text-hero-ink flex items-center gap-4 rounded-xl p-4">
        <div>
          <div className="text-2xs text-hero-ink-2">{t("score")}</div>
          <div className={cn("num text-3xl font-semibold", profile.score === null ? "" : "text-gilded")}>
            {profile.score === null ? "—" : formatPercent(profile.score)}
          </div>
        </div>
        <div className="text-hero-ink-2 text-xs">
          {t("rank", { rank: profile.rank, of: profile.rankOf })}
          {profile.hiredAt ? <div>{t("since", { date: format.date(profile.hiredAt) })}</div> : null}
        </div>
        <Sparkline values={profile.scoreTrend.values} className="ml-auto w-24" />
      </div>

      {profile.aiSummary ? (
        <div className="bg-gold-soft rounded-xl p-3.5 text-sm">
          <div className="text-gold mb-1 flex items-center gap-1.5 text-xs font-semibold">
            <Sparkles aria-hidden className="size-3.5" />
            {t("ai")}
          </div>
          {profile.aiSummary}
          {profile.strengths.length + profile.weaknesses.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1 text-xs">
              {profile.strengths.map((item) => (
                <li key={item} className="text-good flex items-center gap-1.5">
                  <ThumbsUp aria-hidden className="size-3.5" />
                  {item}
                </li>
              ))}
              {profile.weaknesses.map((item) => (
                <li key={item} className="text-crit flex items-center gap-1.5">
                  <ThumbsDown aria-hidden className="size-3.5" />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <DrawerSection title={t("vsTeam")}>
        <ul className="flex flex-col gap-1.5">
          {profile.columns.map((column) => {
            const value = metricValue(profile.metrics, column.key);
            const average = metricValue(profile.teamAvg, column.key);
            return (
              <li key={column.key} className="flex items-center gap-2 text-xs">
                <span className="text-ink-2 min-w-0 flex-1 truncate">{metricLabel(column.key)}</span>
                <span className="num font-semibold">{formatMetric(value, column.unit)}</span>
                <span className="num text-ink-3 w-20 text-right">{formatMetric(average, column.unit)}</span>
                <span className="w-16 text-right">
                  <MetricDelta value={versusTeam(value, average, column.better)} />
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-2xs text-ink-3 mt-1.5">{t("vsTeamHint")}</p>
      </DrawerSection>

      {profile.funnel.length > 1 ? (
        <DrawerSection title={t("funnel")}>
          <Funnel
            steps={profile.funnel.map((step, index) => ({
              key: step.key,
              label: tFunnel.has(step.key) ? tFunnel(step.key) : step.key,
              count: step.value,
              colorClassName:
                step.key === "cancelled" || step.key === "returned" ? "bg-crit" : seriesBg(index),
            }))}
            renderTransition={(passed) => t("passed", { value: passed })}
          />
        </DrawerSection>
      ) : null}

      {profile.ratings ? (
        <DrawerSection title={t("ratings")}>
          <div className="mb-2 flex items-center gap-2">
            <Rating value={profile.ratings.avg} count={profile.ratings.count} />
          </div>
          <ul className="flex flex-col gap-1">
            {["5", "4", "3", "2", "1"].map((stars) => {
              const count = profile.ratings?.distribution[stars] ?? 0;
              const share =
                profile.ratings && profile.ratings.count > 0 ? (count / profile.ratings.count) * 100 : 0;
              return (
                <li key={stars} className="flex items-center gap-2 text-xs">
                  <span className="num inline-flex w-6 items-center gap-0.5">
                    {stars}
                    <Star aria-hidden className="fill-series-4 text-series-4 size-3" />
                  </span>
                  <span className="bg-surface-3 h-1.5 flex-1 overflow-hidden rounded-full">
                    {/* kenglik — ulush */}
                    <span className="bg-series-4 block h-full rounded-full" style={{ width: `${share}%` }} />
                  </span>
                  <span className="num text-ink-3 w-8 text-right">{formatNumber(count)}</span>
                </li>
              );
            })}
          </ul>
          {profile.recentReviews.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1.5">
              {profile.recentReviews.slice(0, 5).map((review, index) => (
                <li key={index} className="bg-surface-2 rounded-lg px-3 py-2 text-xs">
                  <span
                    className={cn(
                      "num inline-flex items-center gap-0.5 font-semibold",
                      SCORE_TEXT[scoreTone(review.stars * 20)],
                    )}
                  >
                    {review.stars}
                    <Star aria-hidden className="size-3" />
                  </span>{" "}
                  {review.text ?? "—"}
                  <span className="text-2xs text-ink-3 block">{format.dateTime(review.at)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </DrawerSection>
      ) : null}
    </>
  );
};
