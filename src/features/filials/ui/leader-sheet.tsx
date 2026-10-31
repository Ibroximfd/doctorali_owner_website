"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Pencil, ShieldCheck, UserMinus, UserRoundCog } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useFormat } from "@/shared/hooks/use-format";
import { toAppError } from "@/shared/lib/app-error";
import { useCanAct } from "@/shared/stores/session-store";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Drawer, DrawerSection } from "@/shared/ui/drawer";
import { KvList } from "@/shared/ui/kv-list";
import { Segmented } from "@/shared/ui/segmented";
import { ListSkeleton, QueryState } from "@/shared/ui/states";

import {
  useAuditQuery,
  useFilialDialogs,
  useReplaceHead,
  useResetHeadPassword,
  useRevokeHead,
  useUpdateHead,
} from "../hooks/use-filials";
import { auditFor, auditNumber, auditPerson, isUsernameTaken, leaderOf } from "../model/filials.rules";
import {
  headEditFormSchema,
  replaceAccountSchema,
  type AccountFormValues,
  type FilialItem,
  type Head,
  type LeaderRole,
} from "../model/filials.schema";
import { AccountFields } from "./account-fields";
import { PasswordOnce } from "./password-once";
import { SeatPicker } from "./seat-picker";

const HISTORY_SHOWN = 6;

/**
 * Rahbar detal oynasi (B.L / B.O): dopusklar (§2.7), ism va login (B-1), parol tiklash va atomar
 * almashtirish (B-2), olib tashlash (rol olinadi, o'rin va akkaunt qoladi). Pastda — audit dan
 * o'rin tarixi.
 */
export const LeaderSheet = ({ filials }: { filials: readonly FilialItem[] }) => {
  const t = useTranslations("filials");
  const { seatFilialId, leaderRole, closeSeat } = useFilialDialogs();
  const filial = filials.find((item) => item.id === seatFilialId) ?? null;
  const leader = filial && leaderRole ? leaderOf(filial, leaderRole) : null;
  const [issued, setIssued] = useState<Issued | null>(null);
  const close = () => {
    setIssued(null);
    closeSeat();
  };

  return (
    <Drawer
      open={seatFilialId !== null && leaderRole !== null}
      onOpenChange={(open) => (open ? undefined : close())}
      title={leader?.fullName ?? t("seat.emptyTitle")}
      subtitle={
        filial && leaderRole ? (
          <span className="text-ink-3 text-xs">
            {t("seat.subtitle", { role: t(`roles.long.${leaderRole}`), filial: filial.name })}
          </span>
        ) : null
      }
    >
      {issued ? <PasswordOnce username={issued.username} password={issued.password} /> : null}
      {filial && leaderRole && leader ? (
        <SeatBody
          key={`${filial.id}-${leaderRole}-${leader.seatId}`}
          filial={filial}
          role={leaderRole}
          leader={leader}
          onIssued={setIssued}
          onClose={close}
        />
      ) : (
        <p className="text-ink-2 text-sm">{t("seat.emptyText")}</p>
      )}
      {filial && leaderRole ? <SeatHistory filial={filial} role={leaderRole} /> : null}
    </Drawer>
  );
};

type Issued = { username: string; password: string };

type SeatBodyProps = {
  filial: FilialItem;
  role: LeaderRole;
  leader: Head;
  onIssued: (issued: Issued) => void;
  onClose: () => void;
};

type View = "main" | "edit" | "replace";

const SeatBody = ({ filial, role, leader, onIssued, onClose }: SeatBodyProps) => {
  const t = useTranslations("filials.seat");
  const tRole = useTranslations("filials.roles.long");
  const canAct = useCanAct();
  const { openLeader } = useFilialDialogs();
  const [view, setView] = useState<View>("main");
  const [confirm, setConfirm] = useState<"remove" | "reset" | null>(null);
  const revoke = useRevokeHead();
  const reset = useResetHeadPassword();
  const ref = { filialId: filial.id, kind: role };

  if (view === "edit") return <EditForm {...ref} leader={leader} onDone={() => setView("main")} />;
  if (view === "replace")
    return (
      <ReplaceForm
        filial={filial}
        role={role}
        leader={leader}
        onIssued={onIssued}
        onCancel={() => setView("main")}
      />
    );

  return (
    <>
      <DrawerSection title={t("person")}>
        <KvList
          rows={[
            { key: "username", label: t("username"), value: leader.username },
            { key: "seat", label: t("seatId"), value: `#${leader.seatId}` },
            { key: "permissions", label: t("permissions"), value: String(leader.permissions.length) },
          ]}
        />
      </DrawerSection>

      {canAct ? (
        <DrawerSection title={t("actions")}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button className="justify-start" onClick={() => openLeader(filial.id, role)}>
              <ShieldCheck aria-hidden />
              {t("permissionsAction")}
            </Button>
            <Button className="justify-start" onClick={() => setView("edit")}>
              <Pencil aria-hidden />
              {t("edit")}
            </Button>
            <Button className="justify-start" onClick={() => setConfirm("reset")}>
              <KeyRound aria-hidden />
              {t("resetPassword")}
            </Button>
            <Button className="justify-start" onClick={() => setView("replace")}>
              <UserRoundCog aria-hidden />
              {t("replace")}
            </Button>
            <Button
              className="text-crit justify-start sm:col-span-2"
              intent="ghost"
              onClick={() => setConfirm("remove")}
            >
              <UserMinus aria-hidden />
              {t("remove")}
            </Button>
          </div>
        </DrawerSection>
      ) : null}

      <ConfirmDialog
        open={confirm === "reset"}
        onOpenChange={(open) => setConfirm(open ? "reset" : null)}
        title={t("resetTitle", { name: leader.fullName })}
        description={t("resetDescription")}
        confirmLabel={t("resetConfirm")}
        pendingLabel={t("pending")}
        isPending={reset.isPending}
        error={reset.isError ? t("failed") : undefined}
        onConfirm={() =>
          reset.mutate(ref, {
            onSuccess: (result) => {
              setConfirm(null);
              onIssued({ username: result.username ?? leader.username, password: result.password });
            },
          })
        }
      />

      <ConfirmDialog
        open={confirm === "remove"}
        onOpenChange={(open) => setConfirm(open ? "remove" : null)}
        title={t("removeTitle", { name: leader.fullName })}
        description={t("removeDescription", { role: tRole(role), filial: filial.name })}
        confirmLabel={t("removeConfirm")}
        pendingLabel={t("pending")}
        isPending={revoke.isPending}
        error={revoke.isError ? t("failed") : undefined}
        onConfirm={() =>
          revoke.mutate(ref, {
            onSuccess: () => {
              toast.success(t("removed", { name: leader.fullName }));
              setConfirm(null);
              onClose();
            },
          })
        }
      />
    </>
  );
};

/** Ism va login (B-1). Telefon bu yerda tahrirlanmaydi. */
const EditForm = ({
  filialId,
  kind,
  leader,
  onDone,
}: {
  filialId: number;
  kind: LeaderRole;
  leader: Head;
  onDone: () => void;
}) => {
  const t = useTranslations("filials.seat");
  const tCommon = useTranslations("common");
  const update = useUpdateHead();
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(headEditFormSchema),
    mode: "onTouched",
    defaultValues: { fullName: leader.fullName, username: leader.username, password: "" },
  });

  const submit = form.handleSubmit((values) => {
    if (update.isPending) return;
    update.mutate(
      { filialId, kind, values },
      {
        onSuccess: () => {
          toast.success(tCommon("saved"));
          onDone();
        },
        onError: (error) =>
          isUsernameTaken(toAppError(error))
            ? form.setError("username", { message: "usernameTaken" })
            : toast.error(tCommon("saveFailed")),
      },
    );
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
      <DrawerSection title={t("editTitle")}>
        <AccountFields
          idPrefix="edit"
          register={form.register}
          errors={form.formState.errors}
          withPassword={false}
        />
        <p className="text-ink-3 mt-2 text-xs">{t("phoneNote")}</p>
      </DrawerSection>
      <FormFooter pending={update.isPending} label={tCommon("save")} onCancel={onDone} />
    </form>
  );
};

type Mode = "account" | "seat";

/**
 * Almashtirish — bitta atomar so'rov (B-2): dopusklar yangi odamga ko'chadi, eski akkaunt oddiy
 * xodim bo'lib qoladi. Yangi odam — yangi akkaunt (parol ixtiyoriy) yoki filialdagi o'rin.
 */
const ReplaceForm = ({
  filial,
  role,
  leader,
  onIssued,
  onCancel,
}: Omit<SeatBodyProps, "onClose"> & { onCancel: () => void }) => {
  const t = useTranslations("filials.seat");
  const tLeader = useTranslations("filials.leader");
  const replace = useReplaceHead();
  const [mode, setMode] = useState<Mode>("account");
  const [seatId, setSeatId] = useState<number | null>(null);
  const [seatError, setSeatError] = useState<string | null>(null);
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(replaceAccountSchema),
    mode: "onTouched",
    defaultValues: { fullName: "", username: "", password: "" },
  });

  const run = (person: Parameters<typeof replace.mutate>[0]["person"]) =>
    replace.mutate(
      { filialId: filial.id, kind: role, person },
      {
        onSuccess: (result) => {
          const name = result.head?.fullName ?? "";
          toast.success(tLeader("appointed", { name }));
          if (result.password) onIssued({ username: result.head?.username ?? "", password: result.password });
          onCancel();
        },
        onError: (error) => {
          const appError = toAppError(error);
          if (isUsernameTaken(appError)) form.setError("username", { message: "usernameTaken" });
          else if (appError.code === "seat_wrong_filial") setSeatError(tLeader("failures.seat_wrong_filial"));
          else toast.error(t("replaceFailed"));
        },
      },
    );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (replace.isPending) return;
    if (mode === "account") void form.handleSubmit((account) => run({ mode: "account", account }))(event);
    else if (seatId === null) setSeatError(tLeader("errors.seatRequired"));
    else run({ mode: "seat", seatId });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DrawerSection title={t("replaceTitle")}>
        <p className="text-ink-2 mb-3 text-sm">
          {t("replaceNote", { name: leader.fullName, count: leader.permissions.length })}
        </p>
        <Segmented
          ariaLabel={tLeader("modeLabel")}
          value={mode}
          onChange={setMode}
          options={[
            { value: "account", label: tLeader("modes.account") },
            { value: "seat", label: tLeader("modes.seat") },
          ]}
        />
      </DrawerSection>
      {mode === "account" ? (
        <DrawerSection title={tLeader("account")}>
          <AccountFields idPrefix="replace" register={form.register} errors={form.formState.errors} />
          <p className="text-ink-3 mt-2 text-xs">{t("replacePasswordNote")}</p>
        </DrawerSection>
      ) : (
        <DrawerSection title={tLeader("seat")}>
          <SeatPicker
            filialId={filial.id}
            value={seatId}
            excludeSeatId={leader.seatId}
            onChange={(id) => {
              setSeatId(id);
              setSeatError(null);
            }}
            error={seatError ?? undefined}
          />
        </DrawerSection>
      )}
      <FormFooter pending={replace.isPending} label={t("replaceConfirm")} onCancel={onCancel} />
    </form>
  );
};

const FormFooter = ({
  pending,
  label,
  onCancel,
}: {
  pending: boolean;
  label: string;
  onCancel: () => void;
}) => {
  const t = useTranslations("filials.seat");
  const tCommon = useTranslations("common");
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
      <Button onClick={onCancel} disabled={pending}>
        {tCommon("cancel")}
      </Button>
      <Button type="submit" intent="primary" disabled={pending} aria-busy={pending}>
        {pending ? t("pending") : label}
      </Button>
    </div>
  );
};

/** O'rin tarixi — `structure/audit/` dan shu filial va shu rahbar turi bo'yicha. */
const SeatHistory = ({ filial, role }: { filial: FilialItem; role: LeaderRole }) => {
  const t = useTranslations("filials");
  const format = useFormat();
  const query = useAuditQuery();
  return (
    <DrawerSection title={t("seat.history")}>
      <QueryState
        query={query}
        skeleton={<ListSkeleton rows={3} />}
        isEmpty={(rows) => auditFor(rows, filial.id, role).length === 0}
        empty={<p className="text-ink-3 text-sm">{t("seat.historyEmpty")}</p>}
      >
        {(rows) => (
          <ol className="flex flex-col gap-2.5 border-l pl-4">
            {auditFor(rows, filial.id, role)
              .slice(0, HISTORY_SHOWN)
              .map((row) => (
                <li key={`${row.at}-${row.action}`} className="text-sm">
                  <span className="num text-ink-3 block text-xs">{format.dateTime(row.at)}</span>
                  {t.has(`audit.actions.${row.action}`) ? t(`audit.actions.${row.action}`) : row.action}
                  {auditPerson(row) ? <span className="font-medium"> · {auditPerson(row)}</span> : null}
                  {auditNumber(row, "seatId") !== null ? (
                    <span className="text-ink-3 text-xs">
                      {" "}
                      · {t("seat.seatRef", { id: auditNumber(row, "seatId") ?? 0 })}
                    </span>
                  ) : null}
                </li>
              ))}
          </ol>
        )}
      </QueryState>
    </DrawerSection>
  );
};
