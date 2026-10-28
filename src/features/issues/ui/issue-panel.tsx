"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/cn";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { QueryState } from "@/shared/ui/states";

import { useIssueQuery } from "../hooks/use-issues";
import { IssueDetails } from "./issue-details";
import { IssueDetailsSkeleton, IssueNotFound, isNotFoundError } from "./issue-drawer";

type IssuePanelProps = { issueId: number; severity: string | null; className?: string };

/** Desktopda ro'yxat yonida yopishib turadigan tanlangan muammo paneli. */
export const IssuePanel = ({ issueId, severity, className }: IssuePanelProps) => {
  const t = useTranslations("issues.drawer");
  const reduce = useReducedMotion();
  const query = useIssueQuery(issueId, true);
  const isNotFound = query.data === undefined && query.isError && isNotFoundError(query.error);
  const isCritical = severity === "critical";

  return (
    <motion.aside
      aria-label={t("selected")}
      initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, delay: 0.3, ease: EASE_OUT }}
      className={cn(
        "sticky top-20 rounded-4xl border p-6",
        isCritical ? "border-crit/25 from-crit/10 to-surface/30 bg-linear-to-b" : "panel-surface",
        className,
      )}
    >
      {isNotFound ? (
        <IssueNotFound />
      ) : (
        <QueryState query={query} skeleton={<IssueDetailsSkeleton />}>
          {(detail) => (
            <motion.div
              key={detail.id}
              initial={reduce ? false : { opacity: 0, filter: "blur(6px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
            >
              <IssueDetails issue={detail} showTitle />
            </motion.div>
          )}
        </QueryState>
      )}
    </motion.aside>
  );
};
