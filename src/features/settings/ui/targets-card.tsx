"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useFormat } from "@/shared/hooks/use-format";
import type { Filial } from "@/shared/meta/meta.schema";
import { useMetaQuery } from "@/shared/meta/use-meta-query";
import { Banner } from "@/shared/ui/banner";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DataTable, type Column } from "@/shared/ui/data-table";
import { Input } from "@/shared/ui/input";
import { EmptyState, QueryState, TableSkeleton } from "@/shared/ui/states";

import { useSaveTargets, useTargetsQuery } from "../hooks/use-settings";
import {
  currentMonth,
  parseAmount,
  preservedItems,
  targetTotals,
  toTargetRows,
  toTargetsInput,
  type TargetRow,
} from "../model/settings.rules";
import {
  targetsFormSchema,
  type EditableChannel,
  type Targets,
  type TargetsFormValues,
} from "../model/settings.schema";

const DASH = "—";

const hasTargets = (filial: Filial): boolean => filial.hasSales || filial.hasClinic;

/** Joriy oyning tushum rejasi (filial × kanal). «Umumiy» sahifadagi reja chizig'i shundan olinadi. */
export const TargetsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("settings.targets");
  const format = useFormat();
  const month = currentMonth(new Date());
  const metaQuery = useMetaQuery();
  const targetsQuery = useTargetsQuery(month);

  return (
    <Card className={className}>
      <CardHeader
        title={t("title", { month: format.month(month).toLowerCase(), year: month.slice(0, 4) })}
        description={t("description")}
      />
      <CardBody flush>
        <QueryState
          query={metaQuery}
          skeleton={<TableSkeleton rows={3} />}
          isEmpty={(meta) => !meta.filials.some(hasTargets)}
          empty={<EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />}
        >
          {(meta) => (
            <QueryState query={targetsQuery} skeleton={<TableSkeleton rows={3} />}>
              {(targets) => <TargetsForm key={targets.month} targets={targets} filials={meta.filials} />}
            </QueryState>
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
};

type TargetsFormProps = { targets: Targets; filials: readonly Filial[] };

const TargetsForm = ({ targets, filials }: TargetsFormProps) => {
  const t = useTranslations("settings.targets");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const save = useSaveTargets();
  // Jadval tuzilishi (qaysi filial, qaysi kanal bor) yuklangan ma'lumotdan; qiymatlar — forma holatida.
  const tableRows = toTargetRows(targets, filials);
  const form = useForm<TargetsFormValues>({
    resolver: zodResolver(targetsFormSchema),
    mode: "onBlur",
    defaultValues: {
      rows: tableRows.map(({ filialId, delivery, clinic }) => ({ filialId, delivery, clinic })),
    },
  });
  const { errors } = form.formState;
  const totals = targetTotals(
    useWatch({ control: form.control, name: "rows" }),
    preservedItems(targets, tableRows),
  );

  const submit = form.handleSubmit((values) => {
    if (save.isPending) return;
    save.mutate(toTargetsInput(targets.month, values.rows, targets), {
      onSuccess: () => {
        toast.success(tCommon("saved"));
        form.reset(values);
      },
      onError: () => toast.error(tCommon("saveFailed")),
    });
  });

  /** Bitta katak: maydon (ko'rinmas yorliq bilan) va uning xatosi; kanal bu filialda bo'lmasa — chiziqcha. */
  const renderAmount = (channel: EditableChannel, row: TargetRow, index: number) => {
    if (row[channel] === null) return <span className="text-ink-3">{DASH}</span>;

    const id = `target-${row.filialId}-${channel}`;
    const error = errors.rows?.[index]?.[channel]?.message;
    return (
      <div className="inline-flex flex-col items-end gap-1">
        <label htmlFor={id} className="sr-only">
          {t(`inputLabel.${channel}`, { filial: row.name })}
        </label>
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="num h-8.5 w-20 px-2.5 text-right text-sm md:w-28"
          {...form.register(`rows.${index}.${channel}`, { setValueAs: parseAmount })}
        />
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-crit text-xs whitespace-normal">
            {t(`errors.${error}`)}
          </p>
        ) : null}
      </div>
    );
  };

  const columns: Column<TargetRow>[] = [
    {
      id: "filial",
      header: t("columns.filial"),
      cell: (row) => <span className="font-semibold">{row.name}</span>,
      footer: t("totalRow"),
    },
    {
      id: "delivery",
      header: t("columns.delivery"),
      align: "right",
      cell: (row, index) => renderAmount("delivery", row, index),
      footer: <span className="num text-xs">{format.moneyCompact(totals.delivery)}</span>,
    },
    {
      id: "clinic",
      header: t("columns.clinic"),
      align: "right",
      cell: (row, index) => renderAmount("clinic", row, index),
      footer: <span className="num text-xs">{format.moneyCompact(totals.clinic)}</span>,
    },
  ];

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <DataTable
        columns={columns}
        rows={tableRows}
        rowKey={(row) => String(row.filialId)}
        keepTableOnMobile
      />
      <div className="flex flex-col gap-3 px-3.5 pt-3 pb-2 md:px-4.5 md:pb-3">
        <Banner
          action={<b className="num font-strong text-ink whitespace-nowrap">{format.money(totals.total)}</b>}
        >
          {totals.consultation > 0
            ? t("grandTotalWithConsultation", { value: format.moneyCompact(totals.consultation) })
            : t("grandTotal")}
        </Banner>
        <div className="flex justify-end">
          <Button type="submit" intent="primary" disabled={save.isPending} aria-busy={save.isPending}>
            {save.isPending ? t("saving") : tCommon("save")}
          </Button>
        </div>
      </div>
    </form>
  );
};
