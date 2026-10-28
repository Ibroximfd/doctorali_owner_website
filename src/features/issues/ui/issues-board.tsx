"use client";

import { AnimatePresence } from "motion/react";
import { PartyPopper } from "lucide-react";
import { useTranslations } from "next-intl";

import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { BlockSkeleton, ListSkeleton, NoResults, QueryState, StateBlock } from "@/shared/ui/states";

import { useIssueDrawer } from "../hooks/use-issue-drawer";
import { ALL_ISSUES, useIssuesQuery } from "../hooks/use-issues";
import { useIssuesFilter } from "../hooks/use-issues-filter";
import { sortIssues, summarizeDomains, tabOf } from "../model/issues.rules";
import { DomainTiles } from "./domain-tiles";
import { IssueCard } from "./issue-card";
import { IssueDrawer } from "./issue-drawer";
import { IssuePanel } from "./issue-panel";

/** Shu kenglikdan boshlab tanlangan muammo ro'yxat yonida turadi; torroqda — drawer. */
const WIDE = "(min-width: 1024px)";

const BoardSkeleton = () => (
  <div className="flex flex-col gap-5">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }, (_, index) => (
        <BlockSkeleton key={index} className="h-18 rounded-2xl" />
      ))}
    </div>
    <ListSkeleton rows={4} />
  </div>
);

/**
 * Muammolar: yo'nalish plitkalari, chapda kartalar, o'ngda (desktopda yopishqoq) tanlangan
 * muammo paneli. Telefonda panel drawer bo'lib ochiladi. Holat guruhi va yo'nalish URL da.
 */
export const IssuesBoard = () => {
  const t = useTranslations("issues.board");
  const { tab, domain, toggleDomain, reset } = useIssuesFilter();
  const { issueId, openIssue } = useIssueDrawer();
  const isWide = useMediaQuery(WIDE);
  const query = useIssuesQuery(ALL_ISSUES);

  return (
    <>
      <QueryState
        query={query}
        skeleton={<BoardSkeleton />}
        isEmpty={({ results }) => results.length === 0}
        empty={<StateBlock icon={PartyPopper} title={t("emptyTitle")} description={t("emptyDescription")} />}
      >
        {({ results }) => {
          const inTab = results.filter((issue) => tabOf(issue.status) === tab);
          const visible = sortIssues(
            domain === null ? inTab : inTab.filter((issue) => issue.domain === domain),
          );
          const selectedId = issueId ?? (isWide ? (visible[0]?.id ?? null) : null);
          const selected = results.find((issue) => issue.id === selectedId) ?? null;

          return (
            <div className="flex flex-col gap-5">
              <DomainTiles summary={summarizeDomains(inTab)} active={domain} onToggle={toggleDomain} />
              <div className="grid items-start gap-5 lg:grid-cols-12">
                <section aria-label={t("title")} className="min-w-0 lg:col-span-7">
                  {visible.length === 0 ? (
                    tab === "open" && domain === null ? (
                      <StateBlock
                        icon={PartyPopper}
                        title={t("emptyTitle")}
                        description={t("emptyDescription")}
                      />
                    ) : (
                      <NoResults onClear={reset} />
                    )
                  ) : (
                    <ul className="flex flex-col gap-3">
                      <AnimatePresence initial={false}>
                        {visible.map((issue, index) => (
                          <IssueCard
                            key={issue.id}
                            issue={issue}
                            order={index}
                            selected={isWide && issue.id === selectedId}
                            onSelect={(id) => openIssue(id)}
                          />
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </section>
                {isWide && selectedId !== null ? (
                  <IssuePanel
                    issueId={selectedId}
                    severity={selected?.severity ?? null}
                    className="lg:col-span-5"
                  />
                ) : null}
              </div>
            </div>
          );
        }}
      </QueryState>
      {isWide ? null : <IssueDrawer />}
    </>
  );
};
