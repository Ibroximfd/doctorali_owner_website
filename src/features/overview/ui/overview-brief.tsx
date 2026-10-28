"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSyncExternalStore, type ReactNode } from "react";

import { routes } from "@/shared/config/routes";
import { alertRoute } from "@/shared/domain/alert";
import { useFormat } from "@/shared/hooks/use-format";
import { formatPercent, TIME_ZONE } from "@/shared/lib/format";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { ScopeLink } from "@/shared/ui/scope-link";
import { QueryState } from "@/shared/ui/states";

import { useOverviewQuery } from "../hooks/use-overview";
import { todayTrend } from "../model/overview.rules";
import type { Overview } from "../model/overview.schema";

const subscribe = () => () => {};

type DayPart = "morning" | "day" | "evening" | "night";

/** Toshkent soati bo'yicha salomlashuv (brauzerda hisoblanadi — serverda chizilmaydi). */
const dayPart = (): DayPart => {
  const hour =
    Number(
      new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hour12: false }).format(
        new Date(),
      ),
    ) % 24;
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "day";
  return hour >= 18 && hour < 23 ? "evening" : "night";
};

type OverviewBriefProps = {
  /** Sana va davr qatori (`TodayLine`). */
  dateline: ReactNode;
  /** O'ng ustun — AI brifingi (kompozitsiya `app` da, `features/ai` dan). */
  aside?: ReactNode;
};

/**
 * Bosh sahifa boshi — tahririy «brief»: bitta katta Fraunces jumla, unda asosiy raqamlar
 * rangli urg'u bilan (bugungi tushum, kechagiga nisbatan, kritik signallar), ostida davr
 * tushumi va reja, ikki amal. Sahifadagi yagona `h1`. Jumla faqat haqiqiy ma'lumotdan quriladi.
 */
export const OverviewBrief = ({ dateline, aside }: OverviewBriefProps) => {
  const t = useTranslations("overview");
  const reduce = useReducedMotion();
  const part = useSyncExternalStore(subscribe, dayPart, () => null);
  const query = useOverviewQuery();
  const overview = query.data?.data;

  return (
    <header className="relative isolate mb-6 pt-2 md:mb-8 md:pt-4">
      <div
        aria-hidden
        className="bg-gold/10 absolute -top-24 right-1/4 -z-10 size-72 rounded-full blur-3xl"
      />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="text-ink-2 mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm"
      >
        <span aria-hidden className="relative flex size-2">
          <span className="bg-accent animate-ping-soft absolute inset-0 rounded-full" />
          <span className="bg-accent relative size-2 rounded-full" />
        </span>
        {part ? <span className="text-ink font-medium">{t(`welcome.greeting.${part}`)}</span> : null}
        <span>{dateline}</span>
      </motion.div>

      <div className="grid items-end gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="min-w-0 lg:col-span-8 xl:col-span-9">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
            className="font-display text-hero max-w-5xl"
          >
            {/* ekran o'quvchi va e2e uchun barqaror nom: «Bugungi holat. …» */}
            <span className="sr-only">{t("title")}. </span>
            {overview ? <Headline overview={overview} /> : part ? t(`welcome.greeting.${part}`) : t("title")}
          </motion.h1>

          <QueryState
            query={query}
            skeleton={
              <div className="mt-5 flex flex-col gap-2">
                <span className="skeleton h-4 w-72 max-w-full" />
                <span className="skeleton h-11 w-64 max-w-full rounded-xl" />
              </div>
            }
            className="mt-5"
          >
            {({ data }) => <BriefFooter overview={data} />}
          </QueryState>
        </div>

        {aside ? (
          <motion.aside
            initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: reduce ? 0 : 0.35, ease: EASE_OUT }}
            className="border-t pt-4 lg:col-span-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 xl:col-span-3"
          >
            {aside}
          </motion.aside>
        ) : null}
      </div>
    </header>
  );
};

/** Tahririy jumla: raqamlar rangli, birinchi raqam tagi chiziladi. */
const Headline = ({ overview }: { overview: Overview }) => {
  const t = useTranslations("overview.brief");
  const format = useFormat();
  const reduce = useReducedMotion();
  const trend = todayTrend(overview.revenueQuick);
  const { alerts } = overview;
  const top = alerts.top.find((alert) => alert.severity === "critical") ?? alerts.top[0];

  const tags = {
    money: (chunks: ReactNode) => (
      <span className="text-accent relative inline-block whitespace-nowrap">
        {chunks}
        <motion.span
          aria-hidden
          className="bg-accent absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full"
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: reduce ? 0 : 0.6, ease: EASE_OUT }}
        />
      </span>
    ),
    good: (chunks: ReactNode) => <span className="text-accent">{chunks}</span>,
    bad: (chunks: ReactNode) => <em className="text-crit">{chunks}</em>,
  };

  return (
    <>
      {t.rich("lead", {
        ...tags,
        today: `${format.moneyCompact(overview.revenueQuick.today)} ${format.currency}`,
      })}
      {t.rich(`trend.${trend.kind}`, { ...tags, pct: formatPercent(trend.pct) })}
      {alerts.critical > 0 && top
        ? t.rich("alerts.critical", { ...tags, count: alerts.critical, title: top.title })
        : alerts.openTotal > 0
          ? t.rich("alerts.open", { ...tags, count: alerts.openTotal })
          : t.rich("alerts.none", tags)}
    </>
  );
};

/** Jumla ostida: davr tushumi va reja, so'ng ikki amal — eng muhim signal va AI. */
const BriefFooter = ({ overview }: { overview: Overview }) => {
  const t = useTranslations("overview.brief");
  const format = useFormat();
  const top = overview.alerts.top.find((alert) => alert.severity === "critical") ?? overview.alerts.top[0];
  const tags = {
    money: (chunks: ReactNode) => <span className="num text-ink font-semibold">{chunks}</span>,
    gold: (chunks: ReactNode) => <span className="num text-gold font-semibold">{chunks}</span>,
  };

  return (
    <>
      <p className="text-ink-2 text-md">
        {t.rich("period", {
          ...tags,
          revenue: `${format.moneyCompact(overview.revenue.total.value)} ${format.currency}`,
        })}
        {overview.plan ? (
          <>
            {" · "}
            {t.rich("plan", { ...tags, pct: formatPercent(overview.plan.pct) })}
          </>
        ) : null}
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {top ? (
          <ScopeLink
            href={routes[alertRoute(top.code)]}
            className="bg-accent text-accent-ink shadow-pop inline-flex min-h-11 items-center gap-2.5 rounded-2xl px-4.5 text-sm font-semibold transition-transform hover:-translate-y-px"
          >
            {t("openAlert")}
            <ArrowRight aria-hidden className="size-4" />
          </ScopeLink>
        ) : null}
        <Link
          href={routes.ai}
          className="border-border-strong hover:bg-surface-2 inline-flex min-h-11 items-center gap-2.5 rounded-2xl border px-4.5 text-sm font-semibold transition-colors"
        >
          <span aria-hidden className="bg-accent animate-breathe ring-accent/20 size-4 rounded-full ring-4" />
          {t("askAi")}
        </Link>
      </div>
    </>
  );
};
