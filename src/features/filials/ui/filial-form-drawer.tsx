"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { toAppError } from "@/shared/lib/app-error";
import { useMetaQuery } from "@/shared/meta/use-meta-query";
import { Button } from "@/shared/ui/button";
import { Drawer } from "@/shared/ui/drawer";
import { Field, Input, Select } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";

import { useCreateFilial, useFilialDialogs, useUpdateFilial } from "../hooks/use-filials";
import {
  filialCreateSchema,
  filialEditSchema,
  type FilialCreateValues,
  type FilialEditValues,
  type FilialItem,
} from "../model/filials.schema";

/**
 * Filial yaratish (nom, belgi, viloyat — §2.2, B-3) yoki tahrirlash (nom, belgi, faol — §2.3).
 * Viloyat yaratilgandan keyin backendda o'zgarmaydi. Zona va sukut bo'limlar backendda o'zi ochiladi.
 */
export const FilialFormDrawer = ({ filials }: { filials: readonly FilialItem[] }) => {
  const t = useTranslations("filials.form");
  const { editId, isCreating, closeForm } = useFilialDialogs();
  const editing = editId === null ? null : (filials.find((filial) => filial.id === editId) ?? null);

  return (
    <Drawer
      open={isCreating || editing !== null}
      onOpenChange={(open) => (open ? undefined : closeForm())}
      title={editing ? t("editTitle", { name: editing.name }) : t("createTitle")}
    >
      {editing ? (
        <EditForm key={editing.id} filial={editing} onDone={closeForm} />
      ) : isCreating ? (
        <CreateForm onDone={closeForm} />
      ) : null}
    </Drawer>
  );
};

const useErrorText = () => {
  const t = useTranslations("filials.form");
  return (message: string | undefined) => (message ? t(`errors.${message}`) : undefined);
};

/** Nom yoki belgi band — maydon ostida; boshqasi — umumiy xabar. */
const useSaveError = (setError: (field: "name" | "code", error: { message: string }) => void) => {
  const tCommon = useTranslations("common");
  return (error: unknown) => {
    const code = toAppError(error).code;
    if (code === "filial_name_taken") setError("name", { message: "nameTaken" });
    else if (code === "code_taken") setError("code", { message: "codeTaken" });
    else toast.error(tCommon("saveFailed"));
  };
};

const CodeField = ({ error, ...props }: ComponentProps<"input"> & { error?: string }) => {
  const t = useTranslations("filials.form");
  return (
    <Field id="filial-code" label={t("code")} error={error}>
      <Input
        id="filial-code"
        maxLength={8}
        autoCapitalize="characters"
        placeholder={t("codePlaceholder")}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "filial-code-error" : "filial-code-hint"}
        {...props}
      />
      <p id="filial-code-hint" className="text-ink-3 text-xs">
        {t("codeHint")}
      </p>
    </Field>
  );
};

const Footer = ({ pending, label, onCancel }: { pending: boolean; label: string; onCancel: () => void }) => {
  const t = useTranslations("filials.form");
  const tCommon = useTranslations("common");
  return (
    <div className="flex flex-wrap justify-end gap-2 pt-2">
      <Button onClick={onCancel} disabled={pending}>
        {tCommon("cancel")}
      </Button>
      <Button type="submit" intent="primary" disabled={pending} aria-busy={pending}>
        {pending ? t("saving") : label}
      </Button>
    </div>
  );
};

const CreateForm = ({ onDone }: { onDone: () => void }) => {
  const t = useTranslations("filials.form");
  const tCommon = useTranslations("common");
  const errorOf = useErrorText();
  const regions = useMetaQuery().data?.regions ?? [];
  const create = useCreateFilial();
  const form = useForm<FilialCreateValues>({
    resolver: zodResolver(filialCreateSchema),
    mode: "onTouched",
    defaultValues: { name: "", code: "", region: "" },
  });
  const { errors } = form.formState;
  const onError = useSaveError(form.setError);

  const submit = form.handleSubmit((values) => {
    if (create.isPending) return;
    create.mutate(values, {
      onSuccess: () => {
        toast.success(tCommon("saved"));
        onDone();
      },
      onError,
    });
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
      <p className="text-ink-2 text-sm">{t("hint")}</p>
      <Field id="filial-name" label={t("name")} error={errorOf(errors.name?.message)}>
        <Input
          id="filial-name"
          placeholder={t("namePlaceholder")}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "filial-name-error" : undefined}
          {...form.register("name")}
        />
      </Field>
      <CodeField error={errorOf(errors.code?.message)} {...form.register("code")} />
      <Field id="filial-region" label={t("region")}>
        <Select id="filial-region" {...form.register("region")}>
          <option value="">{t("regionPlaceholder")}</option>
          {regions.map((region) => (
            <option key={region.code} value={region.code}>
              {region.name}
            </option>
          ))}
        </Select>
      </Field>
      <Footer pending={create.isPending} label={t("create")} onCancel={onDone} />
    </form>
  );
};

const EditForm = ({ filial, onDone }: { filial: FilialItem; onDone: () => void }) => {
  const t = useTranslations("filials.form");
  const tCommon = useTranslations("common");
  const errorOf = useErrorText();
  const update = useUpdateFilial();
  const form = useForm<FilialEditValues>({
    resolver: zodResolver(filialEditSchema),
    mode: "onTouched",
    defaultValues: { name: filial.name, code: filial.code ?? "", isActive: filial.isActive },
  });
  const { errors } = form.formState;
  const onError = useSaveError(form.setError);

  const submit = form.handleSubmit((values) => {
    if (update.isPending) return;
    update.mutate(
      { id: filial.id, values },
      {
        onSuccess: () => {
          toast.success(tCommon("saved"));
          onDone();
        },
        onError,
      },
    );
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
      <Field id="filial-name" label={t("name")} error={errorOf(errors.name?.message)}>
        <Input
          id="filial-name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "filial-name-error" : undefined}
          {...form.register("name")}
        />
      </Field>
      <CodeField error={errorOf(errors.code?.message)} {...form.register("code")} />
      <Controller
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <div className="flex items-center gap-3 rounded-2xl border px-3.5 py-3">
            <label htmlFor="filial-active" className="min-w-0 flex-1 text-sm">
              {t("active")}
              <span className="text-ink-3 mt-0.5 block text-xs">
                {filial.isMain ? t("activeMainNote") : t("activeNote")}
              </span>
            </label>
            <Switch id="filial-active" checked={field.value} onCheckedChange={field.onChange} />
          </div>
        )}
      />
      <Footer pending={update.isPending} label={tCommon("save")} onCancel={onDone} />
    </form>
  );
};
