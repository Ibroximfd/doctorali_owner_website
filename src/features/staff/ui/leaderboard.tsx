"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp, Award, Flame, Star, TriangleAlert, Zap, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

import { cn } from "@/shared/lib/cn";
import { formatDecimal, initialsOf } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { NoResults, QueryState, TableSkeleton } from "@/shared/ui/states";

import { useLeaderboardQuery, useStaffView } from "../hooks/use-staff";
import {
  columnAverage,
  isLagging,
  isStaffBadge,
  leadColumn,
  metricValue,
  relativeTone,
  scoreTone,
  sortByRank,
  type RelativeTone,
  type StaffBadge,
} from "../model/staff.rules";
import type { StaffColumn, StaffRow } from "../model/staff.schema";
import { useMetricFormat, useMetricLabel } from "./metric-format";

const BADGE_ICON: Record<StaffBadge, LucideIcon> = {
  top_conversion: Award,
  most_improved: Flame,
  fastest: Zap,
  best_rated: Star,
  needs_attention: TriangleAlert,
};

const TONE_TEXT: Record<RelativeTone, string> = {
  good: "text-good",
  neutral: "text-ink-2",
  warn: "text-warn",
  crit: "text-crit",
};

/** Har ustun o'rtachasi — rang shunga nisbatan beriladi. */
type ColumnStat = StaffColumn & { average: number | null };

/**
 * Reyting jadvali: o'rin · xodim · rol ustunlari (backenddan) · ball. Asosiy foiz ko'rsatkichi —
 * chiziq; «kamroq — yaxshi» ustunlar o'rtachaga nisbatan rangli; orqada qolgan qator — ember fonda.
 * Qator bosilsa — xodim profili.
 */
export const Leaderboard = ({ className }: { className?: string }) => {
  const t = useTranslations("staff.board");
  const tRole = useTranslations("staff.roles");
  const { role, setTeam } = useStaffView();
  const query = useLeaderboardQuery();

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader title={t("title")} description={t("description", { role: tRole(role) })} />
      <CardBody flush>
        <QueryState query={query} skeleton={<TableSkeleton rows={8} />}>
          {({ data }) =>
            data.rows.length === 0 ? (
              <NoResults onClear={() => setTeam(null)} />
            ) : (
              <Board
                rows={sortByRank(data.rows)}
                columns={data.columns.map((column) => ({
                  ...column,
                  average: columnAverage(data.rows, column.key),
                }))}
                lead={leadColumn(data.columns)}
              />
            )
          }
        </QueryState>
      </CardBody>
    </Card>
  );
};

const Board = ({
  rows,
  columns,
  lead,
}: {
  rows: readonly StaffRow[];
  columns: readonly ColumnStat[];
  lead: StaffColumn | null;
}) => {
  const t = useTranslations("staff.board");
  const metricLabel = useMetricLabel();
  // ustunlar soni rolga qarab o'zgaradi: o'rin · xodim · ko'rsatkichlar (asosiysi kengroq) · ball
  const template = [
    "2.5rem",
    "minmax(0,1.6fr)",
    ...columns.map((column) => (column.key === lead?.key ? "minmax(0,1.5fr)" : "minmax(0,0.8fr)")),
    "4.5rem",
  ].join(" ");
  const style = { "--board-cols": template } as CSSProperties;

  return (
    <div className="px-2 pb-3 md:px-4">
      <div
        aria-hidden
        style={style}
        className="text-ink-3 grid-cols-(--board-cols) gap-3.5 border-b px-2 py-2.5 text-xs max-md:hidden md:grid"
      >
        <span>#</span>
        <span>{t("name")}</span>
        {columns.map((column) => (
          <span key={column.key} className={cn("truncate", column.key !== lead?.key && "text-right")}>
            {metricLabel(column.key)}
          </span>
        ))}
        <span className="text-right">{t("score")}</span>
      </div>
      <ol>
        {rows.map((row, index) => (
          <BoardRow
            key={row.id}
            row={row}
            index={index}
            columns={columns}
            leadKey={lead?.key ?? null}
            style={style}
          />
        ))}
      </ol>
    </div>
  );
};

const BoardRow = ({
  row,
  index,
  columns,
  leadKey,
  style,
}: {
  row: StaffRow;
  index: number;
  columns: readonly ColumnStat[];
  leadKey: string | null;
  style: CSSProperties;
}) => {
  const t = useTranslations("staff.board");
  const tBadge = useTranslations("staff.badges");
  const formatMetric = useMetricFormat();
  const metricLabel = useMetricLabel();
  const reduce = useReducedMotion();
  const { openStaff } = useStaffView();
  const lagging = isLagging(row);
  const delay = 0.1 + Math.min(index, 10) * 0.05;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay }}
      className="border-b last:border-b-0"
    >
      <button
        type="button"
        onClick={() => openStaff(row.id)}
        aria-label={t("open", { name: row.fullName })}
        style={style}
        className={cn(
          "hover:bg-surface-2 grid w-full grid-cols-2 items-center gap-x-3.5 gap-y-2.5 rounded-xl px-2 py-3 text-left transition-colors md:grid-cols-(--board-cols)",
          lagging && "bg-ember/5 hover:bg-ember/10",
        )}
      >
        <RankCell row={row} />
        <span className="col-span-2 flex min-w-0 items-center gap-2.5 md:col-span-1">
          <span className="num text-ink-3 w-5 shrink-0 text-sm font-semibold md:hidden">{row.rank}</span>
          <span
            aria-hidden
            className="bg-surface-3 text-2xs grid size-8 shrink-0 place-items-center rounded-full font-bold"
          >
            {initialsOf(row.fullName)}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">{row.fullName}</span>
              {row.badges.filter(isStaffBadge).map((badge) => {
                const Icon = BADGE_ICON[badge];
                return (
                  <span
                    key={badge}
                    title={tBadge(badge)}
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full",
                      badge === "needs_attention" ? "bg-crit-soft text-crit" : "bg-gold-soft text-gold",
                    )}
                  >
                    <Icon aria-label={tBadge(badge)} className="size-3" />
                  </span>
                );
              })}
            </span>
            <span className="text-ink-3 block truncate text-xs">{row.team ?? row.filial ?? ""}</span>
          </span>
        </span>
        {columns.map((column) => {
          const value = metricValue(row.metrics, column.key);
          const label = (
            <span className="text-2xs text-ink-3 block md:sr-only">{metricLabel(column.key)}</span>
          );
          if (column.key === leadKey) {
            return (
              <span key={column.key} className="col-span-2 min-w-0 md:col-span-1">
                {label}
                <LeadBar
                  value={value}
                  text={formatMetric(value, column.unit)}
                  lagging={lagging}
                  delay={delay}
                />
              </span>
            );
          }
          const tone = column.better === "lower" ? relativeTone(value, column.average, "lower") : "neutral";
          return (
            <span key={column.key} className="min-w-0 md:text-right">
              {label}
              <span
                className={cn(
                  "num text-sm",
                  column.better === "lower" ? cn("font-semibold", TONE_TEXT[tone]) : "text-ink",
                )}
              >
                {formatMetric(value, column.unit)}
              </span>
            </span>
          );
        })}
        <span className="min-w-0 md:text-right">
          <span className="text-2xs text-ink-3 block md:sr-only">{t("score")}</span>
          <ScoreValue row={row} />
        </span>
      </button>
    </motion.li>
  );
};

const RankCell = ({ row }: { row: StaffRow }) => {
  const t = useTranslations("staff.board");
  return (
    <span className="flex items-center gap-1 max-md:hidden">
      <span className="num text-ink-3 text-sm font-semibold">{row.rank}</span>
      {row.rankDelta ? (
        <span
          className={cn("text-2xs inline-flex items-center", row.rankDelta > 0 ? "text-good" : "text-crit")}
          title={t("rankDelta", { count: row.rankDelta })}
        >
          {row.rankDelta > 0 ? (
            <ArrowUp aria-hidden className="size-3" />
          ) : (
            <ArrowDown aria-hidden className="size-3" />
          )}
          {Math.abs(row.rankDelta)}
        </span>
      ) : null}
    </span>
  );
};

const LeadBar = ({
  value,
  text,
  lagging,
  delay,
}: {
  value: number | null;
  text: string;
  lagging: boolean;
  delay: number;
}) => {
  const reduce = useReducedMotion();
  return (
    <span className="flex items-center gap-2.5">
      <span className="bg-ink/5 h-2 flex-1 overflow-hidden rounded-full">
        {value === null ? null : (
          <motion.span
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay }}
            className={cn(
              "block h-full origin-left rounded-full bg-linear-to-r",
              lagging ? "from-ember/40 to-ember" : "from-accent/40 to-accent",
            )}
            // kenglik — foiz qiymati (0–100)
            style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
          />
        )}
      </span>
      <span className="num w-12 shrink-0 text-right text-sm font-semibold">{text}</span>
    </span>
  );
};

const ScoreValue = ({ row }: { row: StaffRow }) => {
  const t = useTranslations("staff.board");
  if (row.score === null) return <span className="text-ink-3 text-xs">{t("notEnough")}</span>;
  const tone = scoreTone(row.score);
  return (
    <span
      className={cn(
        "num text-base font-semibold",
        row.rank === 1 ? "text-gold" : tone === "crit" ? "text-crit" : "text-ink",
      )}
    >
      {formatDecimal(row.score)}
    </span>
  );
};
