"use client";

import { motion, useReducedMotion } from "motion/react";
import { Ban, Check, KeyRound, LogOut, ShieldAlert, Sparkles, Unlock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { toAppError } from "@/shared/lib/app-error";
import { cn } from "@/shared/lib/cn";
import { useMetaQuery } from "@/shared/meta/use-meta-query";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import { Drawer, DrawerSection } from "@/shared/ui/drawer";
import { Field, Input } from "@/shared/ui/input";
import { Pill, type PillIntent } from "@/shared/ui/pill";
import { ListSkeleton, QueryState } from "@/shared/ui/states";
import { Switch } from "@/shared/ui/switch";

import type { AccountCommand } from "../api/iam.api";
import {
  useAccessTab,
  useAccountCommand,
  useAccountQuery,
  useDepartmentsQuery,
  usePermissionsQuery,
  useRolesQuery,
  useSaveAccount,
} from "../hooks/use-iam";
import { toggleIn } from "../model/access.rules";
import {
  accountIssues,
  effectivePermissions,
  groupByModule,
  isPermissionLevel,
  templatesFor,
  type PermissionLevel,
} from "../model/iam.rules";
import type { AccountDetail, AccountInput, PermissionDef, RoleTemplate } from "../model/iam.schema";

const LEVEL_INTENT: Record<PermissionLevel, PillIntent> = {
  view: "neutral",
  detail: "info",
  sensitive: "serious",
  act: "warn",
  manage: "crit",
};

const EMPTY: AccountInput = {
  fullName: "",
  phone: "+998",
  department: "",
  title: "",
  role: null,
  permissions: [],
  scope: { filials: [], regions: [], warehouses: [], teams: [] },
  expiresAt: null,
  requires2fa: false,
  inviteVia: ["sms"],
  note: null,
};

const fromDetail = (detail: AccountDetail, roles: readonly RoleTemplate[]): AccountInput => {
  const template = roles.find((role) => role.key === detail.role)?.permissions ?? [];
  return {
    fullName: detail.fullName,
    phone: detail.phone ?? "+998",
    department: detail.department,
    title: detail.title,
    role: detail.role,
    permissions: effectivePermissions(template, detail.extra, detail.denied),
    scope: { ...detail.scope },
    expiresAt: detail.expiresAt?.slice(0, 10) ?? null,
    requires2fa: detail.requires2fa,
    inviteVia: [],
    note: detail.note,
  };
};

/** Akkaunt ochish / tahrirlash (`?account=new|<id>`): bo'lim, shablon, ruxsatlar matritsasi, doira, xavfsizlik. */
export const AccountDrawer = () => {
  const t = useTranslations("access.account");
  const { isAccountOpen, accountId, closeAccount } = useAccessTab();
  const detail = useAccountQuery(accountId);
  const roles = useRolesQuery();
  const catalog = usePermissionsQuery();
  const isReady =
    roles.data !== undefined &&
    catalog.data !== undefined &&
    (accountId === null || detail.data !== undefined);

  return (
    <Drawer
      open={isAccountOpen}
      onOpenChange={(open) => {
        if (!open) closeAccount();
      }}
      title={detail.data?.fullName ?? t("newTitle")}
      subtitle={<span className="text-ink-3 text-xs">{t("subtitle")}</span>}
    >
      {isAccountOpen && isReady && roles.data && catalog.data ? (
        <AccountForm
          key={accountId ?? "new"}
          detail={detail.data ?? null}
          roles={roles.data}
          catalog={catalog.data}
          onDone={closeAccount}
        />
      ) : isAccountOpen ? (
        // yuklanish yoki xato (qayta urinish bilan) — avval katalog, keyin akkaunt
        catalog.data === undefined ? (
          <QueryState query={catalog} skeleton={<ListSkeleton rows={6} />}>
            {() => null}
          </QueryState>
        ) : (
          <QueryState query={detail} skeleton={<ListSkeleton rows={6} />}>
            {() => <ListSkeleton rows={6} />}
          </QueryState>
        )
      ) : null}
    </Drawer>
  );
};

const AccountForm = ({
  detail,
  roles,
  catalog,
  onDone,
}: {
  detail: AccountDetail | null;
  roles: readonly RoleTemplate[];
  catalog: readonly PermissionDef[];
  onDone: () => void;
}) => {
  const t = useTranslations("access.account");
  const tModule = useTranslations("access.modules");
  const tLevel = useTranslations("access.levels");
  const reduce = useReducedMotion();
  const meta = useMetaQuery().data;
  const departments = useDepartmentsQuery().data ?? [];
  const save = useSaveAccount(detail?.id ?? null);
  const [input, setInput] = useState<AccountInput>(() => (detail ? fromDetail(detail, roles) : EMPTY));
  const [showErrors, setShowErrors] = useState(false);
  const issues = accountIssues(input);
  const template = roles.find((role) => role.key === input.role)?.permissions ?? [];
  const patch = (next: Partial<AccountInput>) => setInput((current) => ({ ...current, ...next }));
  const sensitiveSelected = catalog.filter(
    (item) => item.isSensitive && input.permissions.includes(item.key),
  );

  const applyTemplate = (role: RoleTemplate) =>
    patch({ role: role.key, title: input.title || role.title, permissions: [...role.permissions] });

  const submit = () => {
    if (issues.length > 0) {
      setShowErrors(true);
      return;
    }
    save.mutate(
      { input, template },
      {
        onSuccess: () => {
          toast.success(
            detail ? t("updated", { name: input.fullName }) : t("created", { name: input.fullName }),
          );
          onDone();
        },
        onError: (error) => {
          const code = toAppError(error).code;
          toast.error(
            code === "phone_taken"
              ? t("phoneTaken")
              : code === "grant_exceeds_own"
                ? t("exceedsOwn")
                : code === "confirmation_required"
                  ? t("confirmationRequired")
                  : t("failed"),
          );
        },
      },
    );
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-5"
    >
      {detail ? <AccountCommands detail={detail} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="acc-name"
          label={t("name")}
          error={showErrors && issues.includes("name") ? t("errors.name") : undefined}
        >
          <Input
            id="acc-name"
            value={input.fullName}
            aria-invalid={showErrors && issues.includes("name")}
            onChange={(event) => patch({ fullName: event.target.value })}
          />
        </Field>
        <Field
          id="acc-phone"
          label={t("phone")}
          error={showErrors && issues.includes("phone") ? t("errors.phone") : undefined}
        >
          <Input
            id="acc-phone"
            inputMode="tel"
            value={input.phone}
            disabled={detail !== null}
            aria-invalid={showErrors && issues.includes("phone")}
            onChange={(event) => patch({ phone: event.target.value })}
          />
        </Field>
      </div>

      <DrawerSection title={t("department")}>
        <div role="group" aria-label={t("department")} className="flex flex-wrap gap-1.5">
          {departments.map((item) => (
            <Chip
              key={item.key}
              pressed={input.department === item.key}
              onClick={() => patch({ department: item.key, role: null })}
            >
              {item.title}
            </Chip>
          ))}
        </div>
        {showErrors && issues.includes("department") ? (
          <p role="alert" className="text-crit mt-1.5 text-xs">
            {t("errors.department")}
          </p>
        ) : null}
      </DrawerSection>

      {input.department ? (
        <DrawerSection title={t("template")}>
          <div className="flex flex-wrap gap-1.5">
            {templatesFor(roles, input.department).map((role) => (
              <Chip key={role.key} pressed={input.role === role.key} onClick={() => applyTemplate(role)}>
                <Sparkles aria-hidden className="size-3.5" />
                {role.title}
              </Chip>
            ))}
          </div>
        </DrawerSection>
      ) : null}

      <Field id="acc-title" label={t("title")}>
        <Input
          id="acc-title"
          value={input.title}
          placeholder={t("titlePlaceholder")}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </Field>

      <DrawerSection title={t("permissions", { count: input.permissions.length })}>
        <p className="text-2xs text-ink-3 mb-2">{t("permissionsHint")}</p>
        <div className="flex flex-col gap-3">
          {groupByModule(catalog).map((group) => (
            <fieldset key={group.module} className="rounded-xl border p-3">
              <legend className="px-1 text-xs font-semibold">
                {tModule.has(group.module) ? tModule(group.module) : group.module}
              </legend>
              <ul className="flex flex-col gap-1">
                {group.items.map((permission) => {
                  const isOn = input.permissions.includes(permission.key);
                  const fromTemplate = template.includes(permission.key);
                  return (
                    <li key={permission.key}>
                      <motion.button
                        type="button"
                        aria-pressed={isOn}
                        whileTap={reduce ? undefined : { scale: 0.98 }}
                        onClick={() => patch({ permissions: toggleIn(input.permissions, permission.key) })}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                          isOn ? "bg-accent-soft" : "hover:bg-surface-2",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-4 shrink-0 place-items-center rounded border",
                            isOn ? "bg-accent border-accent text-accent-ink" : "border-border-strong",
                          )}
                        >
                          {isOn ? <Check className="size-3" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{permission.title}</span>
                          {permission.description ? (
                            <span className="text-2xs text-ink-3 block">{permission.description}</span>
                          ) : null}
                        </span>
                        {permission.isSensitive ? (
                          <ShieldAlert aria-label={t("sensitive")} className="text-serious size-3.5" />
                        ) : null}
                        {isPermissionLevel(permission.level) ? (
                          <Pill intent={LEVEL_INTENT[permission.level]}>{tLevel(permission.level)}</Pill>
                        ) : null}
                        {input.role && isOn !== fromTemplate ? (
                          <span className="text-2xs text-gold font-semibold">
                            {isOn ? t("added") : t("removed")}
                          </span>
                        ) : null}
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ))}
        </div>
        {showErrors && issues.includes("permissions") ? (
          <p role="alert" className="text-crit mt-1.5 text-xs">
            {t("errors.permissions")}
          </p>
        ) : null}
        {sensitiveSelected.length > 0 ? (
          <p className="bg-serious-soft text-serious mt-2 rounded-lg px-3 py-2 text-xs">
            {t("sensitiveWarning", { count: sensitiveSelected.length })}
          </p>
        ) : null}
      </DrawerSection>

      <DrawerSection title={t("scope")}>
        <div role="group" aria-label={t("filials")} className="flex flex-wrap gap-1.5">
          <Chip
            pressed={input.scope.filials.length === 0}
            onClick={() => patch({ scope: { ...input.scope, filials: [] } })}
          >
            {t("allFilials")}
          </Chip>
          {meta?.filials.map((filial) => (
            <Chip
              key={filial.id}
              pressed={input.scope.filials.includes(filial.id)}
              onClick={() =>
                patch({ scope: { ...input.scope, filials: toggleIn(input.scope.filials, filial.id) } })
              }
            >
              {filial.name}
            </Chip>
          ))}
        </div>
        <div role="group" aria-label={t("regions")} className="mt-2 flex flex-wrap gap-1.5">
          {meta?.regions.map((region) => (
            <Chip
              key={region.code}
              pressed={input.scope.regions.includes(region.code)}
              onClick={() =>
                patch({ scope: { ...input.scope, regions: toggleIn(input.scope.regions, region.code) } })
              }
            >
              {region.name}
            </Chip>
          ))}
        </div>
        <p className="text-2xs text-ink-3 mt-1.5">{t("scopeHint")}</p>
      </DrawerSection>

      <div className="flex flex-col gap-3 rounded-xl border p-3.5">
        <label className="flex items-start gap-3">
          <Switch
            checked={input.requires2fa}
            onCheckedChange={(checked) => patch({ requires2fa: checked })}
            aria-label={t("twoFactor")}
          />
          <span>
            <span className="block text-sm font-medium">{t("twoFactor")}</span>
            <span className="text-2xs text-ink-3 block">{t("twoFactorHint")}</span>
          </span>
        </label>
        {detail ? null : (
          <div role="group" aria-label={t("invite")} className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium">{t("invite")}</span>
            {(["sms", "telegram"] as const).map((channel) => (
              <Chip
                key={channel}
                pressed={input.inviteVia.includes(channel)}
                onClick={() => patch({ inviteVia: toggleIn(input.inviteVia, channel) })}
              >
                {t(`channel.${channel}`)}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={onDone}>{t("cancel")}</Button>
        <Button type="submit" intent="primary" disabled={save.isPending}>
          <Check aria-hidden />
          {save.isPending ? t("saving") : detail ? t("save") : t("create")}
        </Button>
      </div>
    </form>
  );
};

/** Mavjud akkaunt amallari: blok / blokdan chiqarish, parolni tiklash, hamma qurilmadan chiqarish. */
const AccountCommands = ({ detail }: { detail: AccountDetail }) => {
  const t = useTranslations("access.account");
  const command = useAccountCommand(detail.id);
  const run = (name: AccountCommand) =>
    command.mutate(
      { command: name, reason: name === "block" ? t("blockReason") : undefined },
      { onSuccess: () => toast.success(t(`done.${name}`)), onError: () => toast.error(t("failed")) },
    );
  const isBlocked = detail.status === "blocked";
  return (
    <div className="bg-surface-2 flex flex-wrap gap-2 rounded-xl border p-3">
      <span className="text-2xs text-ink-3 w-full">{t("sessions", { count: detail.sessions })}</span>
      {isBlocked ? (
        <Button size="sm" disabled={command.isPending} onClick={() => run("unblock")}>
          <Unlock aria-hidden />
          {t("unblock")}
        </Button>
      ) : (
        <Button
          size="sm"
          intent="ghost"
          className="text-crit"
          disabled={command.isPending}
          onClick={() => run("block")}
        >
          <Ban aria-hidden />
          {t("block")}
        </Button>
      )}
      <Button size="sm" intent="ghost" disabled={command.isPending} onClick={() => run("reset-password")}>
        <KeyRound aria-hidden />
        {t("resetPassword")}
      </Button>
      <Button size="sm" intent="ghost" disabled={command.isPending} onClick={() => run("revoke-sessions")}>
        <LogOut aria-hidden />
        {t("revokeSessions")}
      </Button>
    </div>
  );
};
