"use client";

import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { toAppError } from "@/shared/lib/app-error";
import { Drawer } from "@/shared/ui/drawer";
import { BlockSkeleton, ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useIssueDrawer } from "../hooks/use-issue-drawer";
import { useIssueQuery } from "../hooks/use-issues";
import { IssueDetails } from "./issue-details";

export const IssueDetailsSkeleton = () => (
  <div className="flex flex-col gap-4">
    <BlockSkeleton className="h-28" />
    <ListSkeleton rows={4} />
  </div>
);

/** Topilmadi holati (eskirgan havola) — drawer va panel uchun bir xil. */
export const IssueNotFound = () => {
  const t = useTranslations("issues.drawer");
  return <StateBlock icon={CircleAlert} title={t("notFoundTitle")} description={t("notFoundDescription")} />;
};

export const isNotFoundError = (error: unknown) => toAppError(error).kind === "not-found";

/** Telefon va planshetda tanlangan muammo (`?issue=<id>`) o'ngdan chiqadigan panelda ochiladi. */
export const IssueDrawer = () => {
  const t = useTranslations("issues.drawer");
  const { issueId, closeIssue } = useIssueDrawer();
  const [shownId, setShownId] = useState(issueId);
  if (issueId !== null && issueId !== shownId) setShownId(issueId);

  const query = useIssueQuery(shownId, issueId !== null);
  const issue = query.data;
  const isNotFound = issue === undefined && query.isError && isNotFoundError(query.error);

  return (
    <Drawer
      open={issueId !== null}
      onOpenChange={(open) => {
        if (!open) closeIssue();
      }}
      title={issue?.title ?? t("title")}
    >
      {isNotFound ? (
        <IssueNotFound />
      ) : (
        <QueryState query={query} skeleton={<IssueDetailsSkeleton />}>
          {(detail) => <IssueDetails issue={detail} />}
        </QueryState>
      )}
    </Drawer>
  );
};
