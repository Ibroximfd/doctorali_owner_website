"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useFormat } from "@/shared/hooks/use-format";
import { formatNumber } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Field, Input } from "@/shared/ui/input";
import { ListSkeleton, QueryState } from "@/shared/ui/states";
import { Switch } from "@/shared/ui/switch";

import { useDigestQuery, useSaveDigest } from "../hooks/use-digest";
import { signedPercent, toDigestSettings } from "../model/reports.rules";
import {
  digestTimeSchema,
  type Digest,
  type DigestPreview,
  type DigestTimeInput,
} from "../model/reports.schema";

/** Telegram kunlik xulosa: yoqish, yuborish vaqti va xabar ko'rinishi. */
export const DigestCard = ({ className }: { className?: string }) => {
  const t = useTranslations("reports.digest");
  const query = useDigestQuery();

  return (
    <Card className={className}>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <QueryState query={query} skeleton={<ListSkeleton rows={4} />}>
          {(digest) => <DigestSettingsForm digest={digest} />}
        </QueryState>
      </CardBody>
    </Card>
  );
};

const DigestSettingsForm = ({ digest }: { digest: Digest }) => {
  const t = useTranslations("reports.digest");
  const tCommon = useTranslations("common");
  const timeId = useId();
  const hintId = `${timeId}-hint`;
  const save = useSaveDigest();
  const settings = toDigestSettings(digest);
  const form = useForm<DigestTimeInput>({
    resolver: zodResolver(digestTimeSchema),
    mode: "onBlur",
    defaultValues: { time: digest.time },
  });
  const timeError = form.formState.errors.time?.message;
  const notifyFailure = () => toast.error(tCommon("saveFailed"));

  const toggle = (enabled: boolean) => {
    if (save.isPending) return;
    save.mutate(
      { ...settings, enabled },
      { onSuccess: () => toast.success(tCommon("saved")), onError: notifyFailure },
    );
  };

  const submit = form.handleSubmit(({ time }) => {
    if (save.isPending) return;
    save.mutate(
      { ...settings, time },
      {
        onSuccess: (saved) => {
          toast.success(tCommon("saved"));
          form.reset({ time: saved.time });
        },
        // Kiritilgan qiymat saqlanib qoladi — foydalanuvchi qayta urinadi.
        onError: notifyFailure,
      },
    );
  });

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b pb-3">
        <div className="min-w-0 leading-tight">
          <div className="text-sm font-semibold">{t(digest.enabled ? "enabled" : "disabled")}</div>
          <div className="text-ink-3 mt-0.5 text-xs">
            {t(digest.telegramChatId === null ? "recipientMissing" : "recipientConnected")}
          </div>
        </div>
        <Switch
          checked={digest.enabled}
          disabled={save.isPending}
          aria-label={t("toggle")}
          onCheckedChange={toggle}
        />
      </div>

      <form onSubmit={(event) => void submit(event)} noValidate className="border-b py-3">
        <Field id={timeId} label={t("time")} error={timeError ? t(`errors.${timeError}`) : undefined}>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={timeId}
              // «numeric» klaviaturada «:» yo'q — `0830` ham qabul qilinadi (`normalizeTime`).
              inputMode="numeric"
              autoComplete="off"
              maxLength={5}
              aria-invalid={Boolean(timeError)}
              aria-describedby={timeError ? `${hintId} ${timeId}-error` : hintId}
              className="num w-24"
              {...form.register("time")}
            />
            <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
              {tCommon("save")}
            </Button>
            <span id={hintId} className="text-ink-3 text-xs">
              {t("timeHint")}
            </span>
          </div>
        </Field>
      </form>

      {digest.preview ? <MessagePreview preview={digest.preview} /> : null}
    </>
  );
};

const bold = (chunks: ReactNode) => <b className="num text-ink font-semibold">{chunks}</b>;

/** Bot yuboradigan xabar namunasi — raqamlar serverdan (`preview`), matn tarjimadan. */
const MessagePreview = ({ preview }: { preview: DigestPreview }) => {
  const t = useTranslations("reports.digest.preview");
  const format = useFormat();
  const revenue = format.moneyCompact(preview.revenue);

  return (
    <div className="pt-3">
      <h3 className="text-2xs text-ink-3 mb-2 font-semibold tracking-wider uppercase">{t("title")}</h3>
      <div className="bg-surface-3 text-ink-2 rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed">
        <p className="text-ink font-semibold">
          {t("heading", { date: format.date(`${preview.date}T12:00:00+05:00`) })}
        </p>
        <p>
          {preview.revenueDeltaPct === null
            ? t.rich("revenueNoDelta", { value: revenue, b: bold })
            : t.rich("revenue", { value: revenue, delta: signedPercent(preview.revenueDeltaPct), b: bold })}
        </p>
        <p>
          {t.rich("orders", {
            orders: formatNumber(preview.orders),
            delivered: formatNumber(preview.delivered),
            cancelled: formatNumber(preview.cancelled),
            b: bold,
          })}
        </p>
        <p>
          {t.rich("clinic", {
            value: format.moneyCompact(preview.clinicRevenue),
            visits: formatNumber(preview.clinicVisits),
            b: bold,
          })}
        </p>
        <p>{t.rich("cod", { value: format.moneyCompact(preview.courierCod), b: bold })}</p>
        <p>
          {t.rich("alerts", {
            open: formatNumber(preview.alertsOpen),
            critical: formatNumber(preview.alertsCritical),
            b: bold,
          })}
        </p>
      </div>
    </div>
  );
};
