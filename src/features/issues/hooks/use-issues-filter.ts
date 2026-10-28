"use client";

import { parseAsStringLiteral, useQueryStates } from "nuqs";

import { ISSUE_DOMAINS, ISSUE_TABS, type IssueDomain, type IssueTab } from "../model/issues.rules";

/** Holat guruhi va yo'nalish URL da (`?tab=progress&domain=finance`) — havola ulashiladi. */
export const useIssuesFilter = () => {
  const [{ tab, domain }, setState] = useQueryStates({
    tab: parseAsStringLiteral(ISSUE_TABS).withDefault("open"),
    domain: parseAsStringLiteral(ISSUE_DOMAINS),
  });
  return {
    tab,
    domain,
    setTab: (value: IssueTab) => void setState({ tab: value === "open" ? null : value }),
    toggleDomain: (value: IssueDomain) => void setState({ domain: domain === value ? null : value }),
    reset: () => void setState({ tab: null, domain: null }),
  };
};
