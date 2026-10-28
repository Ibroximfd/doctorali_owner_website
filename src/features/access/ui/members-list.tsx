"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Ban, CalendarClock, EyeOff, Pencil, ShieldCheck, Store, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { useFormat } from "@/shared/hooks/use-format";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { cn } from "@/shared/lib/cn";
import { formatPhone, initialsOf } from "@/shared/lib/format";
import { useMetaQuery } from "@/shared/meta/use-meta-query";
import { useRegionName } from "@/shared/meta/use-region-name";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Pill, type PillIntent } from "@/shared/ui/pill";
import { ListSkeleton, QueryState, StateBlock } from "@/shared/ui/states";

import { useGrantDrawer, useMembersQuery, useRevokeAccess } from "../hooks/use-access";
import {
  daysLeft,
  isExpiringSoon,
  isMemberStatus,
  sortMembers,
  type MemberStatus,
} from "../model/access.rules";
import type { Member } from "../model/access.schema";
import { SectionChip } from "./section-chip";

const STATUS_INTENT: Record<MemberStatus, PillIntent> = {
  active: "good",
  pending: "info",
  expired: "neutral",
  revoked: "neutral",
};

const MemberCard = ({ member, index, now }: { member: Member; index: number; now: number }) => {
  const t = useTranslations("access.members");
  const format = useFormat();
  const relative = useRelativeTime();
  const reduce = useReducedMotion();
  const regionName = useRegionName();
  const filials = useMetaQuery().data?.filials;
  const { openEdit } = useGrantDrawer();
  const revoke = useRevokeAccess();
  const [isConfirming, setConfirming] = useState(false);
  const isLive = member.status === "active" || member.status === "pending";
  const left = daysLeft(member.expiresAt, now);
  const filialNames = member.filials.map(
    (id) => filials?.find((filial) => filial.id === id)?.name ?? `#${id}`,
  );

  const doRevoke = () =>
    revoke.mutate(member.id, {
      onSuccess: () => {
        toast.success(t("revoked", { name: member.fullName }));
        setConfirming(false);
      },
      onError: () => toast.error(t("failed")),
    });

  return (
    <motion.li
      layout={reduce ? false : "position"}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: isLive ? 1 : 0.6, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay: Math.min(index, 8) * 0.04 }}
      className="bg-surface flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-start"
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <span className="hero-surface text-hero-ink font-strong grid size-11 shrink-0 place-items-center rounded-full text-sm">
          {initialsOf(member.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-md font-semibold">{member.fullName}</h3>
            <Pill intent={isMemberStatus(member.status) ? STATUS_INTENT[member.status] : "neutral"}>
              {isMemberStatus(member.status) ? t(`status.${member.status}`) : member.status}
            </Pill>
            {isExpiringSoon(member, now) ? (
              <Pill intent="warn" icon={CalendarClock}>
                {t("expiresIn", { count: left ?? 0 })}
              </Pill>
            ) : null}
          </div>
          <div className="text-ink-3 text-xs">
            {member.title}
            {member.phone ? ` · ${formatPhone(member.phone)}` : ""}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {member.sections.map((section) => (
              <SectionChip key={section} section={section} />
            ))}
          </div>
          <div className="text-2xs text-ink-3 mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Store aria-hidden className="size-3.5" />
              {filialNames.length ? filialNames.join(", ") : t("allFilials")}
              {member.regions.length ? ` · ${member.regions.map(regionName).join(", ")}` : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock aria-hidden className="size-3.5" />
              {member.expiresAt ? t("until", { date: format.date(member.expiresAt) }) : t("noExpiry")}
            </span>
            {member.maskPii ? (
              <span className="inline-flex items-center gap-1">
                <EyeOff aria-hidden className="size-3.5" />
                {t("masked")}
              </span>
            ) : null}
            <span>
              {member.lastSeenAt ? t("lastSeen", { when: relative(member.lastSeenAt) }) : t("neverSeen")}
            </span>
          </div>
          {member.note ? <p className="text-ink-2 mt-2 text-xs italic">«{member.note}»</p> : null}
        </div>
      </div>
      {isLive ? (
        <div className="flex shrink-0 gap-2 md:flex-col md:items-stretch">
          <Button
            size="sm"
            onClick={() => openEdit(member.id)}
            aria-label={t("edit", { name: member.fullName })}
          >
            <Pencil aria-hidden />
            {t("editShort")}
          </Button>
          <AnimatePresence mode="wait" initial={false}>
            {isConfirming ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex gap-1.5"
              >
                <Button size="sm" intent="danger" disabled={revoke.isPending} onClick={doRevoke}>
                  {t("confirmRevoke")}
                </Button>
                <Button size="sm" intent="ghost" onClick={() => setConfirming(false)}>
                  {t("cancel")}
                </Button>
              </motion.div>
            ) : (
              <motion.div key="revoke" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button
                  size="sm"
                  intent="ghost"
                  className="text-crit w-full"
                  onClick={() => setConfirming(true)}
                >
                  <Ban aria-hidden />
                  {t("revoke")}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : null}
    </motion.li>
  );
};

/** Kimga qaysi bo'lim ochiq — faollar tepada; har kartada doira, muddat va oxirgi kirish. */
export const MembersList = ({ className }: { className?: string }) => {
  const t = useTranslations("access.members");
  const { openNew } = useGrantDrawer();
  const query = useMembersQuery();
  const [showClosed, setShowClosed] = useState(false);

  return (
    <Card className={cn("bg-surface-2", className)}>
      <CardHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button
            size="sm"
            intent="ghost"
            aria-pressed={showClosed}
            onClick={() => setShowClosed((value) => !value)}
          >
            {showClosed ? t("hideClosed") : t("showClosed")}
          </Button>
        }
      />
      <CardBody>
        <QueryState
          query={query}
          skeleton={<ListSkeleton rows={4} />}
          isEmpty={(members) => members.length === 0}
          empty={
            <StateBlock
              icon={UsersRound}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <Button intent="primary" onClick={openNew}>
                  <ShieldCheck aria-hidden />
                  {t("emptyAction")}
                </Button>
              }
            />
          }
        >
          {(members) => {
            const visible = sortMembers(members).filter(
              (member) => showClosed || member.status === "active" || member.status === "pending",
            );
            return (
              <ul className="flex flex-col gap-2.5">
                {visible.map((member, index) => (
                  <MemberCard key={member.id} member={member} index={index} now={query.dataUpdatedAt} />
                ))}
              </ul>
            );
          }}
        </QueryState>
      </CardBody>
    </Card>
  );
};
