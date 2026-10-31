"use client";

import { useTranslations } from "next-intl";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Field, Input } from "@/shared/ui/input";

import type { AccountFormValues } from "../model/filials.schema";

const FIELDS = [
  { name: "fullName", type: "text", autoComplete: "name" },
  { name: "username", type: "text", autoComplete: "username" },
  { name: "password", type: "password", autoComplete: "new-password" },
] as const;

type AccountFieldsProps = {
  /** Maydon id lari prefiksi — bir sahifada ikki forma bo'lsa to'qnashmasin. */
  idPrefix: string;
  register: UseFormRegister<AccountFormValues>;
  errors: FieldErrors<AccountFormValues>;
  /** Faqat ism va login (tahrirlash) — parol maydonisiz. */
  withPassword?: boolean;
};

/** Yangi akkaunt maydonlari: F.I.Sh., login, parol (tayinlash, almashtirish, tahrirlash). */
export const AccountFields = ({ idPrefix, register, errors, withPassword = true }: AccountFieldsProps) => {
  const t = useTranslations("filials.leader");
  return (
    <div className="flex flex-col gap-3.5">
      {FIELDS.filter((field) => withPassword || field.name !== "password").map((field) => {
        const id = `${idPrefix}-${field.name}`;
        const message = errors[field.name]?.message;
        return (
          <Field
            key={field.name}
            id={id}
            label={t(`fields.${field.name}`)}
            error={message ? t(`errors.${message}`) : undefined}
          >
            <Input
              id={id}
              type={field.type}
              autoComplete={field.autoComplete}
              autoCapitalize={field.name === "username" ? "none" : undefined}
              aria-invalid={Boolean(message)}
              aria-describedby={message ? `${id}-error` : undefined}
              {...register(field.name)}
            />
          </Field>
        );
      })}
    </div>
  );
};
