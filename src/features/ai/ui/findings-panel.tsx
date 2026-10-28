"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Segmented } from "@/shared/ui/segmented";
import { BlockSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useFindingsQuery } from "../hooks/use-ai";
import { FindingCard } from "./finding-card";

/** AI topilmalari: kamomad, xato, shubhali holat — eng jiddiysi tepada. */
export const FindingsPanel = () => {
  const t = useTranslations("ai.findings");
  const [status, setStatus] = useState<"open" | "all">("open");
  const query = useFindingsQuery(status);

  return (
    <section aria-labelledby="ai-findings-title">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div>
          <h2 id="ai-findings-title" className="font-strong text-lg">
            {t("title")}
          </h2>
          <p className="text-ink-3 text-xs">{t("description")}</p>
        </div>
        <Segmented
          className="ml-auto"
          ariaLabel={t("filter")}
          value={status}
          onChange={setStatus}
          options={[
            { value: "open", label: t("open") },
            { value: "all", label: t("all") },
          ]}
        />
      </div>
      <QueryState
        query={query}
        skeleton={
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <BlockSkeleton key={index} className="h-64" />
            ))}
          </div>
        }
        isEmpty={({ results }) => results.length === 0}
        empty={<StateBlock icon={ShieldCheck} title={t("emptyTitle")} description={t("emptyDescription")} />}
      >
        {({ results }) => (
          <div className="grid gap-3 lg:grid-cols-2">
            {results.map((finding, index) => (
              <FindingCard key={finding.id} finding={finding} index={index} />
            ))}
          </div>
        )}
      </QueryState>
    </section>
  );
};
