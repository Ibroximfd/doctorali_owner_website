"use client";

import { Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { toAppError } from "@/shared/lib/app-error";
import { Button } from "@/shared/ui/button";
import { DrawerSection } from "@/shared/ui/drawer";
import { Pill } from "@/shared/ui/pill";
import { Switch } from "@/shared/ui/switch";

import { useCatalogQuery, useSetRolePermissions } from "../hooks/use-filials";
import {
  grantableKeys,
  permissionDiff,
  permissionGroups,
  permissionLabel,
  togglePermission,
} from "../model/filials.rules";
import type { LeaderRole } from "../model/filials.schema";

type PickerProps = {
  role: LeaderRole;
  isMain: boolean;
  /** Qo'shimcha (owner bergan) dopusklar. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Rol bilan birga keladigan — o'chirib bo'lmaydi, alohida ko'rsatiladi. */
  defaults?: readonly string[];
  disabled?: boolean;
};

/**
 * Dopusk tanlovi: katalog (B-4) bo'yicha shu rahbar turiga tegishlilari, guruhlab. Rol bilan
 * keladiganlari — yoqilgan va qulflangan; owner beradiganlari — almashtirgich. Katalog kelmasa —
 * joriy kalitlar faqat ko'rinadi.
 */
export const PermissionPicker = ({
  role,
  isMain,
  value,
  onChange,
  defaults = [],
  disabled = false,
}: PickerProps) => {
  const t = useTranslations("filials.leader");
  const locale = useLocale();
  const catalog = useCatalogQuery();
  const label = (key: string) => permissionLabel(catalog.data, key, locale);
  const groupTitle = (group: string) => (t.has(`groups.${group}`) ? t(`groups.${group}`) : group);

  if (catalog.isPending) return <span className="skeleton block h-24" />;
  if (!catalog.data)
    return (
      <DrawerSection title={t("permissions")}>
        <p className="text-ink-2 text-sm">{t("catalogPending")}</p>
        {value.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {value.map((key) => (
              <li key={key} className="bg-surface-3 rounded-sm px-2 py-0.5 text-xs">
                {label(key)}
              </li>
            ))}
          </ul>
        ) : null}
      </DrawerSection>
    );

  const grantable = grantableKeys(catalog.data, role, isMain, defaults);
  const chosen = value.filter((key) => grantable.includes(key)).length;

  return (
    <div className="flex flex-col gap-5">
      {defaults.length > 0 ? (
        <DrawerSection title={t("defaultsTitle")}>
          <p className="text-ink-3 mb-2 text-xs">{t("defaultsNote")}</p>
          <ul className="flex flex-wrap gap-1.5">
            {defaults.map((key) => (
              <li key={key}>
                <Pill intent="neutral" icon={Lock}>
                  {label(key)}
                </Pill>
              </li>
            ))}
          </ul>
        </DrawerSection>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-ink-2 me-auto text-sm" aria-live="polite">
          {t("chosen", { count: chosen, total: grantable.length })}
        </p>
        <Button
          size="sm"
          intent="ghost"
          disabled={disabled || chosen === grantable.length}
          onClick={() => onChange([...new Set([...value, ...grantable])])}
        >
          {t("selectAll")}
        </Button>
        <Button
          size="sm"
          intent="ghost"
          disabled={disabled || chosen === 0}
          onClick={() => onChange(value.filter((key) => !grantable.includes(key)))}
        >
          {t("clearAll")}
        </Button>
      </div>

      {permissionGroups(catalog.data, role, isMain).map((group) => (
        <DrawerSection key={group.group} title={groupTitle(group.group)}>
          <ul className="bg-surface-2/50 flex flex-col divide-y rounded-2xl border">
            {group.items.map(({ permission, disabled: locked }) => {
              const id = `perm-${permission.key}`;
              const isDefault = defaults.includes(permission.key);
              return (
                <li key={permission.key} className="flex items-center gap-3 px-3.5 py-3">
                  <label htmlFor={id} className="min-w-0 flex-1 text-sm">
                    <span className={locked ? "text-ink-3" : undefined}>{label(permission.key)}</span>
                    {isDefault ? (
                      <span className="text-2xs text-ink-3 mt-0.5 flex items-center gap-1">
                        <Lock aria-hidden className="size-3" />
                        {t("withRole")}
                      </span>
                    ) : permission.mainOnly ? (
                      <span className="text-2xs text-ink-3 mt-0.5 flex items-center gap-1">
                        <Lock aria-hidden className="size-3" />
                        {t("mainOnly")}
                      </span>
                    ) : null}
                  </label>
                  <Switch
                    id={id}
                    disabled={disabled || locked || isDefault}
                    checked={isDefault || (!locked && value.includes(permission.key))}
                    onCheckedChange={() => onChange(togglePermission(value, permission.key))}
                  />
                </li>
              );
            })}
          </ul>
        </DrawerSection>
      ))}
    </div>
  );
};

/** Saqlash xatolari (`filials.leader.saveErrors.*`). */
const SAVE_ERRORS = ["role_not_found", "validation_error", "forbidden"];

/**
 * Band o'rin dopusklari: `PATCH roles/{id}` qo'shimchalarni TO'LIQ almashtiradi — berish, olish,
 * «hammasini olib tashlash». Saqlashdan oldin nima beriladi / olinadi ko'rinadi.
 */
export const PermissionsForm = ({
  role,
  isMain,
  roleId,
  current,
  defaults,
  onDone,
}: {
  role: LeaderRole;
  isMain: boolean;
  roleId: number;
  current: string[];
  defaults: readonly string[];
  onDone: () => void;
}) => {
  const t = useTranslations("filials.leader");
  const tCommon = useTranslations("common");
  const save = useSetRolePermissions();
  const catalog = useCatalogQuery();
  const [permissions, setPermissions] = useState<string[]>(current);
  const [failure, setFailure] = useState<string | null>(null);
  const diff = permissionDiff(current, permissions);
  const changed = diff.added.length + diff.removed.length > 0;

  const submit = () => {
    if (save.isPending || !changed) return;
    setFailure(null);
    save.mutate(
      { roleId, permissions },
      {
        onSuccess: () => {
          toast.success(t("permissionsSaved", { added: diff.added.length, removed: diff.removed.length }));
          onDone();
        },
        onError: (error) => {
          const code = toAppError(error).code ?? "";
          setFailure(SAVE_ERRORS.includes(code) ? code : "failed");
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-ink-2 text-sm">{t("permissionsNote")}</p>
      <PermissionPicker
        role={role}
        isMain={isMain}
        value={permissions}
        onChange={setPermissions}
        defaults={defaults}
        disabled={save.isPending}
      />
      {failure ? (
        <p role="alert" className="text-crit text-sm">
          {t(`saveErrors.${failure}`)}
        </p>
      ) : null}
      <div className="bg-surface sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
        <p className="text-ink-3 me-auto text-xs" aria-live="polite">
          {changed ? t("diff", { added: diff.added.length, removed: diff.removed.length }) : t("noChanges")}
        </p>
        <Button onClick={onDone} disabled={save.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button
          intent="primary"
          disabled={save.isPending || !catalog.data || !changed}
          aria-busy={save.isPending}
          onClick={submit}
        >
          {save.isPending ? t("saving") : tCommon("save")}
        </Button>
      </div>
    </div>
  );
};
