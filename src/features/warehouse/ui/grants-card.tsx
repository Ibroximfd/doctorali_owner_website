"use client";

import { ArrowRight, PackageOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { toAppError } from "@/shared/lib/app-error";
import { useMetaQuery } from "@/shared/meta/use-meta-query";
import { useCanAct } from "@/shared/stores/session-store";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Select } from "@/shared/ui/input";
import { Pill } from "@/shared/ui/pill";
import { ProductThumb } from "@/shared/ui/product-thumb";
import { QueryState, StateBlock, TableSkeleton } from "@/shared/ui/states";

import { useGrantsQueries, useItemsQuery, useMoveGrant, type GrantMove } from "../hooks/use-warehouse";
import { grantOwners, splitByGrant } from "../model/warehouse.rules";
import type { SkladItem } from "../model/warehouse.schema";

/** Kutilayotgan o'zgarish: tasdiq oynasida nima bo'lishi yoziladi. */
type Pending = GrantMove & { name: string };

const NONE = "none";

/**
 * Mahsulot dopuski (v2 §2.9): har mahsulot — bitta filialga. Berilmaganlar alohida, tepada.
 * Boshqa filialdan olish yoki olib tashlash — tasdiq bilan; `grant_conflict` da qaysi filialda
 * ekani yoziladi va «u yerdan olib, bu yerga berish» taklif qilinadi.
 */
export const GrantsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("warehouse.grants");
  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody flush>
        <p className="text-ink-3 px-4 pb-3 text-xs md:px-5.5">{t("logistNote")}</p>
        <GrantsBody />
      </CardBody>
    </Card>
  );
};

const GrantsBody = () => {
  const t = useTranslations("warehouse.grants");
  const canAct = useCanAct();
  const items = useItemsQuery();
  const filials = useMetaQuery().data?.filials ?? [];
  const grants = useGrantsQueries();
  const move = useMoveGrant();
  const [pending, setPending] = useState<Pending | null>(null);
  const [conflict, setConflict] = useState<Pending | null>(null);
  const loaded = grants.every((query) => query.data !== undefined);
  const owners = grantOwners(grants.flatMap((query) => (query.data ? [query.data] : [])));
  const failed = grants.find((query) => query.error);
  const nameOf = (id: number | null) => filials.find((filial) => filial.id === id)?.name ?? "";

  const run = (change: Pending) =>
    move.mutate(change, {
      onSuccess: () => {
        setPending(null);
        setConflict(null);
        toast.success(
          change.to === null
            ? t("removed", { name: change.name, from: nameOf(change.from) })
            : t("saved", { name: change.name, to: nameOf(change.to) }),
        );
      },
      onError: (error) => {
        setPending(null);
        const appError = toAppError(error);
        const holder = Number(appError.fields.filial);
        if (appError.code === "grant_conflict" && Number.isFinite(holder) && holder !== change.from)
          setConflict({ ...change, from: holder });
        else toast.error(t("failed"));
      },
    });

  /** Berilmagan mahsulotni berish — tasdiqsiz; olib qo'yish va ko'chirish — tasdiq bilan. */
  const request = (item: SkladItem, holder: number | null, next: number | null) => {
    if (next === holder) return;
    const change = { productId: item.id, name: item.name, from: holder, to: next };
    if (holder === null) run(change);
    else setPending(change);
  };

  if (failed && !loaded)
    return (
      <QueryState query={failed} skeleton={null}>
        {() => null}
      </QueryState>
    );

  const row = (item: SkladItem) => {
    const holder = owners.get(item.id) ?? null;
    const busy = move.isPending && move.variables.productId === item.id;
    return (
      <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
        <ProductThumb name={item.name} src={item.image} />
        <span className="min-w-0 flex-1 text-sm font-semibold">{item.name}</span>
        <label className="sr-only" htmlFor={`grant-${item.id}`}>
          {t("pickerLabel", { name: item.name })}
        </label>
        <Select
          id={`grant-${item.id}`}
          className="h-9 w-full text-sm sm:w-48"
          value={holder === null ? NONE : String(holder)}
          disabled={!canAct || move.isPending}
          aria-busy={busy}
          onChange={(event) =>
            request(item, holder, event.target.value === NONE ? null : Number(event.target.value))
          }
        >
          <option value={NONE}>{t("none")}</option>
          {filials.map((filial) => (
            <option key={filial.id} value={filial.id}>
              {filial.name}
            </option>
          ))}
        </Select>
      </li>
    );
  };

  return (
    <>
      <QueryState
        query={items}
        skeleton={<TableSkeleton rows={8} className="px-5" />}
        isEmpty={(data) => data.length === 0}
      >
        {(data) => {
          if (!loaded) return <TableSkeleton rows={8} className="px-5" />;
          const { unassigned, assigned } = splitByGrant(data, owners);
          return (
            <div className="flex flex-col gap-4 px-4 pb-2 md:px-5.5">
              <section aria-labelledby="grants-unassigned">
                <h3 id="grants-unassigned" className="text-ink-2 flex items-center gap-2 text-xs font-medium">
                  {t("unassignedTitle")}
                  <Pill intent={unassigned.length > 0 ? "warn" : "good"}>{unassigned.length}</Pill>
                </h3>
                {unassigned.length > 0 ? (
                  <ul className="flex flex-col divide-y">{unassigned.map(row)}</ul>
                ) : (
                  <p className="text-ink-3 py-2 text-sm">{t("allAssigned")}</p>
                )}
              </section>
              <section aria-labelledby="grants-assigned">
                <h3 id="grants-assigned" className="text-ink-2 flex items-center gap-2 text-xs font-medium">
                  {t("assignedTitle")}
                  <Pill intent="neutral">{assigned.length}</Pill>
                </h3>
                {assigned.length > 0 ? (
                  <ul className="flex flex-col divide-y">{assigned.map(row)}</ul>
                ) : (
                  <StateBlock icon={PackageOpen} title={t("noneAssigned")} />
                )}
              </section>
            </div>
          );
        }}
      </QueryState>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => (open ? undefined : setPending(null))}
        title={
          pending?.to === null
            ? t("removeTitle", { name: pending.name })
            : t("moveTitle", { name: pending?.name ?? "" })
        }
        description={
          pending?.to === null
            ? t("removeDescription", { from: nameOf(pending.from) })
            : t("moveDescription", { from: nameOf(pending?.from ?? null), to: nameOf(pending?.to ?? null) })
        }
        confirmLabel={pending?.to === null ? t("removeConfirm") : t("moveConfirm")}
        pendingLabel={t("pending")}
        isPending={move.isPending}
        onConfirm={() => (pending ? run(pending) : undefined)}
      />

      <ConfirmDialog
        open={conflict !== null}
        onOpenChange={(open) => (open ? undefined : setConflict(null))}
        title={t("conflictTitle", { name: conflict?.name ?? "", filial: nameOf(conflict?.from ?? null) })}
        description={t("moveDescription", {
          from: nameOf(conflict?.from ?? null),
          to: nameOf(conflict?.to ?? null),
        })}
        confirmLabel={t("moveConfirm")}
        pendingLabel={t("pending")}
        isPending={move.isPending}
        onConfirm={() => (conflict ? run(conflict) : undefined)}
      />
      {move.isPending ? (
        <p className="text-ink-3 flex items-center gap-1 px-4 pb-3 text-xs md:px-5.5" aria-live="polite">
          <ArrowRight aria-hidden className="size-3" />
          {t("pending")}
        </p>
      ) : null}
    </>
  );
};
