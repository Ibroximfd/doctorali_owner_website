"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";
import { formatDecimal } from "@/shared/lib/format";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { QueryState } from "@/shared/ui/states";

import { useStaffView, useTeamsQuery } from "../hooks/use-staff";
import { metricValue } from "../model/staff.rules";
import type { Team } from "../model/staff.schema";
import { useMetricFormat, useMetricLabel } from "./metric-format";

/**
 * Jamoalar almashtirgichi (call-center / filial): har plitkada jamoa bali, a'zolar soni va konversiya.
 * Bosilsa — reyting shu jamoaga torayadi, yana bosilsa — hammasi. Bitta jamoa bo'lsa ko'rinmaydi.
 */
export const TeamsStrip = () => {
  const t = useTranslations("staff.teams");
  const query = useTeamsQuery();
  return (
    <QueryState
      query={query}
      skeleton={<div className="skeleton mb-4 h-20 w-full rounded-2xl" />}
      isEmpty={({ data }) => data.length < 2}
      empty={<></>}
    >
      {({ data }) => (
        <section aria-label={t("title")} className="mb-4">
          <TeamTiles teams={[...data].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))} />
        </section>
      )}
    </QueryState>
  );
};

const TeamTiles = ({ teams }: { teams: readonly Team[] }) => {
  const t = useTranslations("staff.teams");
  const tBoard = useTranslations("staff.board");
  const formatMetric = useMetricFormat();
  const metricLabel = useMetricLabel();
  const reduce = useReducedMotion();
  const { team, setTeam } = useStaffView();

  return (
    <div role="group" aria-label={tBoard("teams")} className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <TileButton pressed={team === null} onClick={() => setTeam(null)} index={0} reduce={reduce}>
        <span className="text-sm font-bold">{tBoard("allTeams")}</span>
        <span className="text-ink-3 mt-1 block text-xs">
          {t("members", { count: teams.reduce((sum, item) => sum + item.members, 0) })}
        </span>
      </TileButton>
      {teams.map((item, index) => {
        const conversion = metricValue(item.metrics, "conversion_pct");
        return (
          <TileButton
            key={item.id}
            pressed={team === item.id}
            onClick={() => setTeam(team === item.id ? null : item.id)}
            index={index + 1}
            reduce={reduce}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-bold">{item.name}</span>
              <span className="num text-gold shrink-0 text-xl font-semibold">
                {formatDecimal(item.score)}
              </span>
            </span>
            <span className="text-ink-3 mt-1 block truncate text-xs">
              {t("members", { count: item.members })}
              {conversion === null
                ? ""
                : ` · ${metricLabel("conversion_pct")} ${formatMetric(conversion, "pct")}`}
            </span>
          </TileButton>
        );
      })}
    </div>
  );
};

const TileButton = ({
  pressed,
  onClick,
  index,
  reduce,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  index: number;
  reduce: boolean | null;
  children: ReactNode;
}) => (
  <motion.button
    type="button"
    aria-pressed={pressed}
    onClick={onClick}
    initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.1 + Math.min(index, 8) * 0.05 }}
    className={cn(
      "panel-surface min-w-0 rounded-2xl border p-4 text-left transition-colors",
      pressed ? "border-accent/40 bg-accent-soft" : "hover:border-border-strong",
    )}
  >
    {children}
  </motion.button>
);
