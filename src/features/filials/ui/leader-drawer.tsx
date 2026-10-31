"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { toAppError } from "@/shared/lib/app-error";
import { Button } from "@/shared/ui/button";
import { Drawer, DrawerSection } from "@/shared/ui/drawer";
import { Segmented } from "@/shared/ui/segmented";

import { useAppointHead, useFilialDialogs } from "../hooks/use-filials";
import { isUsernameTaken, leaderOf, roleDefaults } from "../model/filials.rules";
import {
  accountFormSchema,
  type AccountFormValues,
  type FilialItem,
  type LeaderRole,
} from "../model/filials.schema";
import { AccountFields } from "./account-fields";
import { PasswordOnce } from "./password-once";
import { PermissionPicker, PermissionsForm } from "./permission-picker";
import { SeatPicker } from "./seat-picker";

/**
 * Rahbar o'rni: bo'sh bo'lsa — tayinlash (yangi akkaunt yoki filialdagi mavjud o'rin, §2.5);
 * band bo'lsa — rolning dopusklarini to'liq almashtirish (§2.7). Owner uchun dopusk shipi yo'q.
 */
export const LeaderDrawer = ({ filials }: { filials: readonly FilialItem[] }) => {
  const t = useTranslations("filials");
  const { leaderFilialId, leaderRole, closeLeader } = useFilialDialogs();
  const filial = filials.find((item) => item.id === leaderFilialId) ?? null;
  const leader = filial && leaderRole ? leaderOf(filial, leaderRole) : null;
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);
  const close = () => {
    setIssued(null);
    closeLeader();
  };

  return (
    <Drawer
      open={filial !== null && leaderRole !== null}
      onOpenChange={(open) => (open ? undefined : close())}
      title={
        filial && leaderRole
          ? t(leader ? "leader.permissionsTitle" : "leader.appointTitle", {
              role: t(`roles.long.${leaderRole}`),
              filial: filial.name,
            })
          : t("leader.fallbackTitle")
      }
    >
      {issued ? (
        <>
          <PasswordOnce username={issued.username} password={issued.password} />
          <Button intent="primary" onClick={close}>
            {t("leader.done")}
          </Button>
        </>
      ) : filial && leaderRole ? (
        leader ? (
          <PermissionsForm
            key={leader.roleId}
            role={leaderRole}
            isMain={filial.isMain}
            roleId={leader.roleId}
            current={leader.permissions}
            defaults={roleDefaults(leader)}
            onDone={close}
          />
        ) : (
          <AppointForm
            key={`${filial.id}-${leaderRole}`}
            filial={filial}
            role={leaderRole}
            onIssued={setIssued}
            onDone={close}
          />
        )
      ) : null}
    </Drawer>
  );
};

type Mode = "account" | "seat";

/** Tushunarli matni bor tayinlash xatolari (`filials.leader.failures.*`). */
const APPOINT_FAILURES = ["role_exists", "seat_wrong_filial", "seat_not_found", "filial_not_found"];

const AppointForm = ({
  filial,
  role,
  onIssued,
  onDone,
}: {
  filial: FilialItem;
  role: LeaderRole;
  onIssued: (issued: { username: string; password: string }) => void;
  onDone: () => void;
}) => {
  const t = useTranslations("filials.leader");
  const tCommon = useTranslations("common");
  const appoint = useAppointHead();
  const [mode, setMode] = useState<Mode>("account");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [seatId, setSeatId] = useState<number | null>(null);
  const [seatError, setSeatError] = useState<string | null>(null);
  const account = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    mode: "onTouched",
    defaultValues: { fullName: "", username: "", password: "" },
  });

  const onError = (error: unknown) => {
    const appError = toAppError(error);
    if (isUsernameTaken(appError)) account.setError("username", { message: "usernameTaken" });
    else setFailure(APPOINT_FAILURES.includes(appError.code ?? "") ? (appError.code ?? null) : "failed");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (appoint.isPending) return;
    setFailure(null);
    if (mode === "account")
      void account.handleSubmit((values) =>
        appoint.mutate(
          { filialId: filial.id, kind: role, permissions, mode: "account", account: values },
          {
            onSuccess: (result) => {
              toast.success(t("appointed", { name: result.head.fullName }));
              if (result.password) onIssued({ username: result.head.username, password: result.password });
              else onDone();
            },
            onError,
          },
        ),
      )(event);
    else if (seatId === null) setSeatError(t("errors.seatRequired"));
    else
      appoint.mutate(
        { filialId: filial.id, kind: role, permissions, mode: "seat", seatId },
        {
          onSuccess: (result) => {
            toast.success(t("appointed", { name: result.head.fullName }));
            onDone();
          },
          onError,
        },
      );
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Segmented
        ariaLabel={t("modeLabel")}
        value={mode}
        onChange={setMode}
        options={[
          { value: "account", label: t("modes.account") },
          { value: "seat", label: t("modes.seat") },
        ]}
      />
      {mode === "account" ? (
        <DrawerSection title={t("account")}>
          <AccountFields idPrefix="head" register={account.register} errors={account.formState.errors} />
          <p className="text-ink-3 mt-2 text-xs">{t("passwordNote")}</p>
        </DrawerSection>
      ) : (
        <DrawerSection title={t("seat")}>
          <SeatPicker
            filialId={filial.id}
            value={seatId}
            onChange={(id) => {
              setSeatId(id);
              setSeatError(null);
            }}
            error={seatError ?? undefined}
          />
          <p className="text-ink-3 mt-2 text-xs">{t("seatNote")}</p>
        </DrawerSection>
      )}

      <PermissionPicker
        role={role}
        isMain={filial.isMain}
        value={permissions}
        onChange={setPermissions}
        disabled={appoint.isPending}
      />

      {failure ? (
        <p role="alert" className="text-crit text-sm">
          {t(`failures.${failure}`)}
        </p>
      ) : null}

      <div className="bg-surface sticky bottom-0 flex flex-wrap justify-end gap-2 border-t pt-3">
        <Button onClick={onDone} disabled={appoint.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" intent="primary" disabled={appoint.isPending} aria-busy={appoint.isPending}>
          {appoint.isPending ? t("saving") : t("appoint")}
        </Button>
      </div>
    </form>
  );
};
