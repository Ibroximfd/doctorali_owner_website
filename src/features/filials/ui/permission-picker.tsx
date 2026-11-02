"use client";

import { Lock, RotateCcw } from "lucide-react";
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
  cascadeCount,
  defaultKeys,
  grantableKeys,
  lockedKeys,
  permissionDiff,
  permissionGroups,
  permissionLabel,
  revokedDefaults,
  togglePermission,
  uncataloguedKeys,
  type PermissionMode,
} from "../model/filials.rules";
import type { LeaderRole, Permission } from "../model/filials.schema";

/** Yangi tayinlashda sukut hali ma'lum emas — backend uni o'zi qo'shadi (§D-1). */
const APPOINT_MODE: PermissionMode = { kind: "extras", locked: [] };

/** Katalogdagi `site` (TZ 32 §D-3) → tarjima kaliti. */
const SITES = ["crm", "logist", "both"];

type PickerProps = {
  role: LeaderRole;
  /** Tanlangan to'plam: `full` rejimda — samarali to'liq, `extras` da — qo'shimchalar. */
  value: string[];
  onChange: (next: string[]) => void;
  mode?: PermissionMode;
  disabled?: boolean;
};

/**
 * Dopusk tanlovi: katalog (B-4, TZ 32 §D-3) bo'yicha shu rahbar turiga tegishlilari, guruhlab.
 * Yangi backendda (§D-1) har kalit — sukutdagisi ham — almashtirgich; sukut faqat yorliq,
 * olinganiga «olingan» belgisi. Eski backendda rol bilan keladiganlari qulflangan. Katalog kelmasa —
 * joriy kalitlar faqat ko'rinadi.
 */
export const PermissionPicker = ({
  role,
  value,
  onChange,
  mode = APPOINT_MODE,
  disabled = false,
}: PickerProps) => {
  const t = useTranslations("filials.leader");
  const locale = useLocale();
  const catalog = useCatalogQuery();
  const label = (key: string) => permissionLabel(catalog.data, key, locale);

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

  const locked = lockedKeys(mode);
  const grantable = grantableKeys(catalog.data, role, locked);
  const chosen = value.filter((key) => grantable.includes(key)).length;
  const revoked = revokedDefaults(mode, value);
  const extra = uncataloguedKeys(catalog.data, role, value);
  const groupTitle = (group: string) => (t.has(`groups.${group}`) ? t(`groups.${group}`) : group);

  return (
    <div className="flex flex-col gap-5">
      {mode.kind === "extras" && locked.length > 0 ? (
        <DrawerSection title={t("defaultsTitle")}>
          <p className="text-ink-3 mb-2 text-xs">{t("defaultsNote")}</p>
          <ul className="flex flex-wrap gap-1.5">
            {locked.map((key) => (
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
          {t(mode.kind === "full" ? "enabled" : "chosen", { count: chosen, total: grantable.length })}
        </p>
        {revoked.length > 0 ? (
          <Button
            size="sm"
            intent="ghost"
            disabled={disabled}
            onClick={() => onChange([...new Set([...value, ...revoked])])}
          >
            <RotateCcw aria-hidden />
            {t("restoreDefaults", { count: revoked.length })}
          </Button>
        ) : null}
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
      {mode.kind === "full" ? <p className="text-ink-3 -mt-3 text-xs">{t("fullNote")}</p> : null}

      {permissionGroups(catalog.data, role).map((group) => (
        <DrawerSection key={group.group} title={groupTitle(group.group)}>
          <ul className="bg-surface-2/50 flex flex-col divide-y rounded-2xl border">
            {group.items.map((permission) => (
              <PermissionRow
                key={permission.key}
                permission={permission}
                label={label(permission.key)}
                checked={locked.includes(permission.key) || value.includes(permission.key)}
                isLocked={locked.includes(permission.key)}
                isDefault={defaultKeys(mode).includes(permission.key)}
                isRevoked={revoked.includes(permission.key)}
                disabled={disabled}
                onToggle={() => onChange(togglePermission(value, permission.key))}
              />
            ))}
          </ul>
        </DrawerSection>
      ))}

      {extra.length > 0 ? (
        <DrawerSection title={t("uncatalogued")}>
          <p className="text-ink-3 mb-2 text-xs">{t("uncataloguedNote")}</p>
          <ul className="bg-surface-2/50 flex flex-col divide-y rounded-2xl border">
            {extra.map((key) => (
              <li key={key} className="flex items-center gap-3 px-3.5 py-3">
                <label htmlFor={`perm-${key}`} className="num min-w-0 flex-1 text-sm">
                  {label(key)}
                </label>
                <Switch
                  id={`perm-${key}`}
                  disabled={disabled}
                  checked
                  onCheckedChange={() => onChange(togglePermission(value, key))}
                />
              </li>
            ))}
          </ul>
        </DrawerSection>
      ) : null}
    </div>
  );
};

type RowProps = {
  permission: Permission;
  label: string;
  checked: boolean;
  isLocked: boolean;
  isDefault: boolean;
  isRevoked: boolean;
  disabled: boolean;
  onToggle: () => void;
};

/** Bitta kalit: nom, yorliqlar (sukut · olingan · sayt · asosiy filial sukuti) va almashtirgich. */
const PermissionRow = ({
  permission,
  label,
  checked,
  isLocked,
  isDefault,
  isRevoked,
  disabled,
  onToggle,
}: RowProps) => {
  const t = useTranslations("filials.leader");
  const id = `perm-${permission.key}`;
  const site = permission.site && SITES.includes(permission.site) ? permission.site : null;
  return (
    <li className="flex items-center gap-3 px-3.5 py-3">
      <label htmlFor={id} className="min-w-0 flex-1 text-sm">
        <span>{label}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1">
          {isLocked ? (
            <Pill intent="neutral" icon={Lock}>
              {t("withRole")}
            </Pill>
          ) : isRevoked ? (
            <Pill intent="warn">{t("defaultRevoked")}</Pill>
          ) : isDefault ? (
            <Pill intent="info">{t("default")}</Pill>
          ) : null}
          {permission.mainOnly ? <Pill intent="neutral">{t("mainDefault")}</Pill> : null}
          {site ? <span className="text-2xs text-ink-3">{t(`sites.${site}`)}</span> : null}
        </span>
      </label>
      <Switch id={id} disabled={disabled || isLocked} checked={checked} onCheckedChange={onToggle} />
    </li>
  );
};

/** Saqlash xatolari (`filials.leader.saveErrors.*`). */
const SAVE_ERRORS = ["role_not_found", "validation_error", "forbidden", "permission_ceiling"];

/**
 * Band o'rin dopusklari: `PATCH roles/{id}` TO'LIQ ro'yxat (§D-1) — berish, olish, «hammasini olib
 * tashlash». Saqlashdan oldin nima beriladi / olinadi ko'rinadi; kaskad bo'lsa (§D-2a) — ogohlantirish.
 */
export const PermissionsForm = ({
  role,
  roleId,
  current,
  mode,
  onDone,
}: {
  role: LeaderRole;
  roleId: number;
  current: string[];
  mode: PermissionMode;
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
  const clearsEverything = mode.kind === "full" && permissions.length === 0 && changed;

  const submit = () => {
    if (save.isPending || !changed) return;
    setFailure(null);
    save.mutate(
      { roleId, permissions },
      {
        onSuccess: (result) => {
          toast.success(t("permissionsSaved", { added: diff.added.length, removed: diff.removed.length }));
          const cascaded = cascadeCount(result);
          if (cascaded > 0) toast.warning(t("cascadeWarning", { count: cascaded }), { duration: 12_000 });
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
      <p className="text-ink-2 text-sm">
        {t(mode.kind === "full" ? "permissionsNoteFull" : "permissionsNote")}
      </p>
      <PermissionPicker
        role={role}
        value={permissions}
        onChange={setPermissions}
        mode={mode}
        disabled={save.isPending}
      />
      {mode.kind === "full" && diff.removed.length > 0 ? (
        <p className="bg-warn-soft text-warn rounded-xl px-3 py-2 text-xs">{t("cascadeNote")}</p>
      ) : null}
      {clearsEverything ? (
        <p role="alert" className="text-crit text-sm">
          {t("emptyWarning")}
        </p>
      ) : null}
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
