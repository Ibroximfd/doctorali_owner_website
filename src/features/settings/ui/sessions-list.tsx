"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { useFormat } from "@/shared/hooks/use-format";
import { toAppError } from "@/shared/lib/app-error";
import { Button } from "@/shared/ui/button";
import { Pill } from "@/shared/ui/pill";
import { EmptyState, ListSkeleton, QueryState } from "@/shared/ui/states";

import { useRevokeSession, useSessionsQuery } from "../hooks/use-settings";
import { sessionLabel } from "../model/settings.rules";
import type { Session } from "../model/settings.schema";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { SettingRow } from "./setting-row";

/** Panelga kirgan qurilmalar. Boshqa qurilmani tasdiqlashdan keyin uzish mumkin; joriy qurilma uzilmaydi. */
export const SessionsList = () => {
  const t = useTranslations("settings.security.sessions");
  const tErrors = useTranslations("common.errors");
  const format = useFormat();
  const query = useSessionsQuery();
  const revoke = useRevokeSession();
  const [target, setTarget] = useState<Session | null>(null);

  const closeDialog = () => {
    setTarget(null);
    revoke.reset();
  };

  const confirmRevoke = () => {
    if (target === null || revoke.isPending) return;
    revoke.mutate(target.id, {
      onSuccess: () => {
        toast.success(t("revoked"));
        closeDialog();
      },
    });
  };

  const lastSeen = (session: Session): string =>
    [session.location, session.isCurrent ? t("activeNow") : format.dateTime(session.lastSeenAt)]
      .filter(Boolean)
      .join(" · ");

  return (
    <>
      <QueryState
        query={query}
        skeleton={<ListSkeleton rows={2} className="py-2.5" />}
        isEmpty={(sessions) => sessions.length === 0}
        empty={<EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />}
      >
        {(sessions) => (
          <ul aria-label={t("label")} className="divide-y">
            {sessions.map((session) => (
              <li key={session.id}>
                <SettingRow title={sessionLabel(session)} description={lastSeen(session)}>
                  {session.isCurrent ? (
                    <Pill intent="good">{t("thisDevice")}</Pill>
                  ) : (
                    <Button
                      size="sm"
                      aria-label={t("revokeLabel", { device: sessionLabel(session) })}
                      onClick={() => setTarget(session)}
                    >
                      {t("revoke")}
                    </Button>
                  )}
                </SettingRow>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      {target ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open ? undefined : closeDialog())}
          title={t("confirmTitle")}
          description={t("confirmDescription", { device: sessionLabel(target) })}
          confirmLabel={t("revoke")}
          pendingLabel={t("revoking")}
          isPending={revoke.isPending}
          error={revoke.error ? tErrors(`kind.${toAppError(revoke.error).kind}`) : undefined}
          onConfirm={confirmRevoke}
        />
      ) : null}
    </>
  );
};
