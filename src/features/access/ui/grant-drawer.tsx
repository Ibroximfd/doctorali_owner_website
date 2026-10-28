"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Search, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";

import { NAV_ITEMS } from "@/shared/config/nav";
import { useFormat } from "@/shared/hooks/use-format";
import { toAppError } from "@/shared/lib/app-error";
import { cn } from "@/shared/lib/cn";
import { formatPhone } from "@/shared/lib/format";
import { tashkentDate } from "@/shared/lib/scope";
import { useMetaQuery } from "@/shared/meta/use-meta-query";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import { Drawer, DrawerSection } from "@/shared/ui/drawer";
import { Field, Input } from "@/shared/ui/input";
import { EASE_OUT } from "@/shared/ui/motion/reveal";
import { Segmented } from "@/shared/ui/segmented";
import { ListSkeleton, QueryState } from "@/shared/ui/states";
import { Switch } from "@/shared/ui/switch";

import {
  useCandidatesQuery,
  useGrantDrawer,
  useMembersQuery,
  useSaveAccess,
  useTemplatesQuery,
} from "../hooks/use-access";
import { EXPIRY_OPTIONS, GRANTABLE_SECTIONS, addDaysIso, grantIssues, toggleIn } from "../model/access.rules";
import type { GrantInput, Member } from "../model/access.schema";

const EMPTY: GrantInput = {
  userId: 0,
  title: "",
  sections: [],
  filials: [],
  regions: [],
  maskPii: true,
  canExport: false,
  expiresAt: null,
  note: null,
  notify: true,
};

/** Forma ichidagi almashtirgichlar (bayroqlar). `notify` — faqat yangi ruxsatda. */
const TOGGLES = ["maskPii", "canExport", "notify"] as const satisfies readonly (keyof GrantInput)[];

const fromMember = (member: Member): GrantInput => ({
  userId: member.userId,
  title: member.title,
  sections: [...member.sections],
  filials: [...member.filials],
  regions: [...member.regions],
  maskPii: member.maskPii,
  canExport: member.canExport,
  expiresAt: member.expiresAt?.slice(0, 10) ?? null,
  note: member.note,
  notify: false,
});

/** Ruxsat berish / o'zgartirish (`?grant=new|<id>`). */
export const GrantDrawer = () => {
  const t = useTranslations("access.grant");
  const { isOpen, memberId, close } = useGrantDrawer();
  const members = useMembersQuery().data;
  const member = memberId === null ? null : (members?.find((item) => item.id === memberId) ?? null);
  // Har ochilishda forma yangidan quriladi (kalit) — oldingi tanlov qolib ketmasin.
  const formKey = memberId === null ? "new" : `edit-${memberId}-${member ? "ready" : "loading"}`;

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={member ? t("editTitle", { name: member.fullName }) : t("newTitle")}
      subtitle={<span className="text-ink-3 text-xs">{t("subtitle")}</span>}
    >
      {memberId !== null && !member ? (
        <ListSkeleton rows={5} />
      ) : isOpen ? (
        <GrantForm key={formKey} member={member} onDone={close} />
      ) : null}
    </Drawer>
  );
};

const GrantForm = ({ member, onDone }: { member: Member | null; onDone: () => void }) => {
  const t = useTranslations("access.grant");
  const tNav = useTranslations("nav.items");
  const format = useFormat();
  const reduce = useReducedMotion();
  const meta = useMetaQuery().data;
  const templates = useTemplatesQuery();
  const save = useSaveAccess(member?.id ?? null);
  const [input, setInput] = useState<GrantInput>(() => (member ? fromMember(member) : EMPTY));
  const [personName, setPersonName] = useState(member?.fullName ?? "");
  const [showErrors, setShowErrors] = useState(false);
  const [showRegions, setShowRegions] = useState((member?.regions.length ?? 0) > 0);
  const issues = grantIssues(input);
  const today = tashkentDate(new Date());

  const patch = (next: Partial<GrantInput>) => setInput((current) => ({ ...current, ...next }));
  const expiryValue = (() => {
    if (input.expiresAt === null) return "none";
    const match = EXPIRY_OPTIONS.find((days) => days !== null && addDaysIso(today, days) === input.expiresAt);
    return match ? String(match) : null;
  })();

  const submit = () => {
    if (issues.length > 0) {
      setShowErrors(true);
      return;
    }
    save.mutate(input, {
      onSuccess: () => {
        toast.success(member ? t("updated", { name: personName }) : t("granted", { name: personName }));
        onDone();
      },
      onError: (error) => {
        const appError = toAppError(error);
        toast.error(appError.code === "already_granted" ? t("alreadyGranted") : t("failed"));
      },
    });
  };

  const sectionNames = input.sections.map((section) => tNav(section as (typeof GRANTABLE_SECTIONS)[number]));
  const filialNames = input.filials.map(
    (id) => meta?.filials.find((filial) => filial.id === id)?.name ?? `#${id}`,
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-5"
    >
      {member ? null : (
        <DrawerSection title={t("person")}>
          <PersonPicker
            selectedId={input.userId}
            onPick={(userId, name) => {
              patch({ userId });
              setPersonName(name);
            }}
          />
          {showErrors && issues.includes("person") ? (
            <p role="alert" className="text-crit mt-1.5 text-xs">
              {t("errors.person")}
            </p>
          ) : null}
        </DrawerSection>
      )}

      <DrawerSection title={t("templates")}>
        <QueryState query={templates} skeleton={<ListSkeleton rows={1} />}>
          {(list) => (
            <div className="flex flex-wrap gap-1.5">
              {list.map((template) => (
                <Chip
                  key={template.key}
                  pressed={input.title === template.title}
                  onClick={() =>
                    patch({
                      title: template.title,
                      sections: [...template.sections],
                      maskPii: template.maskPii,
                    })
                  }
                >
                  <Sparkles aria-hidden className="size-3.5" />
                  {template.title}
                </Chip>
              ))}
            </div>
          )}
        </QueryState>
      </DrawerSection>

      <Field
        id="grant-title"
        label={t("title")}
        error={showErrors && issues.includes("title") ? t("errors.title") : undefined}
      >
        <Input
          id="grant-title"
          value={input.title}
          placeholder={t("titlePlaceholder")}
          aria-invalid={showErrors && issues.includes("title")}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </Field>

      <DrawerSection title={t("sections")}>
        <div role="group" aria-label={t("sections")} className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {GRANTABLE_SECTIONS.map((section) => {
            const item = NAV_ITEMS.find((navItem) => navItem.route === section);
            const isOn = input.sections.includes(section);
            return (
              <motion.button
                key={section}
                type="button"
                aria-pressed={isOn}
                whileTap={reduce ? undefined : { scale: 0.96 }}
                onClick={() => patch({ sections: toggleIn(input.sections, section) })}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                  isOn ? "border-accent bg-accent-soft text-accent" : "hover:bg-surface-2 text-ink-2",
                )}
              >
                {item ? <item.icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} /> : null}
                <span className="min-w-0 flex-1 truncate">{tNav(section)}</span>
                {isOn ? <Check aria-hidden className="size-3.5 shrink-0" /> : null}
              </motion.button>
            );
          })}
        </div>
        {showErrors && issues.includes("sections") ? (
          <p role="alert" className="text-crit mt-1.5 text-xs">
            {t("errors.sections")}
          </p>
        ) : null}
      </DrawerSection>

      <DrawerSection title={t("scope")}>
        <div role="group" aria-label={t("filials")} className="flex flex-wrap gap-1.5">
          <Chip pressed={input.filials.length === 0} onClick={() => patch({ filials: [] })}>
            {t("allFilials")}
          </Chip>
          {meta?.filials.map((filial) => (
            <Chip
              key={filial.id}
              pressed={input.filials.includes(filial.id)}
              onClick={() => patch({ filials: toggleIn(input.filials, filial.id) })}
            >
              {filial.name}
            </Chip>
          ))}
        </div>
        <button
          type="button"
          className="text-accent mt-2 text-xs font-medium underline"
          onClick={() => setShowRegions((value) => !value)}
        >
          {showRegions ? t("hideRegions") : t("limitRegions")}
        </button>
        <AnimatePresence initial={false}>
          {showRegions ? (
            <motion.div
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div role="group" aria-label={t("regions")} className="mt-2 flex flex-wrap gap-1.5">
                {meta?.regions.map((region) => (
                  <Chip
                    key={region.code}
                    pressed={input.regions.includes(region.code)}
                    onClick={() => patch({ regions: toggleIn(input.regions, region.code) })}
                  >
                    {region.name}
                  </Chip>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </DrawerSection>

      <DrawerSection title={t("expiry")}>
        <Segmented
          ariaLabel={t("expiry")}
          value={expiryValue}
          onChange={(value) =>
            patch({ expiresAt: value === "none" ? null : addDaysIso(today, Number(value)) })
          }
          options={EXPIRY_OPTIONS.map((days) =>
            days === null
              ? { value: "none", label: t("noExpiry") }
              : { value: String(days), label: t("days", { count: days }) },
          )}
        />
        {input.expiresAt ? (
          <p className="text-ink-3 mt-1.5 text-xs">{t("until", { date: format.date(input.expiresAt) })}</p>
        ) : null}
      </DrawerSection>

      <div className="flex flex-col gap-3 rounded-xl border p-3.5">
        {TOGGLES.filter((key) => key !== "notify" || member === null)
          .map((key) => [key, t(key), t(`${key}Hint`)] as const)
          .map(([key, label, hint]) => (
            <label key={key} className="flex items-start gap-3">
              <Switch
                checked={input[key]}
                onCheckedChange={(checked) => patch({ [key]: checked })}
                aria-label={label}
              />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="text-2xs text-ink-3 block">{hint}</span>
              </span>
            </label>
          ))}
      </div>

      <Field id="grant-note" label={t("note")}>
        <textarea
          id="grant-note"
          rows={2}
          maxLength={300}
          value={input.note ?? ""}
          placeholder={t("notePlaceholder")}
          onChange={(event) => patch({ note: event.target.value || null })}
          className="border-border-strong bg-surface focus-visible:border-accent focus-visible:ring-accent/25 w-full resize-y rounded-md border px-3 py-2 text-base focus-visible:ring-3 focus-visible:outline-none"
        />
      </Field>

      {/* jonli xulosa — boshliq nimaga rozi bo'layotganini bir jumlada ko'radi */}
      <div aria-live="polite" className="hero-surface text-hero-ink rounded-xl p-4 text-sm">
        <div className="text-2xs text-gold mb-1 font-semibold tracking-widest uppercase">
          {t("summaryTitle")}
        </div>
        {t("summary", {
          name: personName || t("someone"),
          sections: sectionNames.length ? sectionNames.join(", ") : "—",
          filials: filialNames.length ? filialNames.join(", ") : t("allFilials").toLowerCase(),
          expiry: input.expiresAt
            ? t("until", { date: format.date(input.expiresAt) })
            : t("noExpiry").toLowerCase(),
        })}
        <div className="text-hero-ink-2 mt-1 text-xs">{t("readOnlyNote")}</div>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={onDone}>{t("cancel")}</Button>
        <Button type="submit" intent="primary" disabled={save.isPending}>
          <Check aria-hidden />
          {save.isPending ? t("saving") : member ? t("save") : t("grantAction")}
        </Button>
      </div>
    </form>
  );
};

/** Xodimni ism yoki telefon bo'yicha topish (asosiy platformadagi xodimlar). */
const PersonPicker = ({
  selectedId,
  onPick,
}: {
  selectedId: number;
  onPick: (userId: number, name: string) => void;
}) => {
  const t = useTranslations("access.grant");
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search.trim());
  const candidates = useCandidatesQuery(deferred, true);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search aria-hidden className="text-ink-3 absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          aria-label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>
      <QueryState query={candidates} skeleton={<ListSkeleton rows={3} />}>
        {(list) =>
          list.length === 0 ? (
            <p className="text-ink-3 text-xs">{t("noCandidates")}</p>
          ) : (
            <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
              {list.map((person) => {
                const isPicked = person.userId === selectedId;
                return (
                  <li key={person.userId}>
                    <button
                      type="button"
                      aria-pressed={isPicked}
                      disabled={person.hasAccess}
                      onClick={() => onPick(person.userId, person.fullName)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-50",
                        isPicked ? "border-accent bg-accent-soft" : "hover:bg-surface-2",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{person.fullName}</span>
                        <span className="text-2xs text-ink-3 block truncate">
                          {person.platformRole}
                          {person.filial ? ` · ${person.filial}` : ""}
                          {person.phone ? ` · ${formatPhone(person.phone)}` : ""}
                        </span>
                      </span>
                      {person.hasAccess ? (
                        <span className="text-2xs text-ink-3">{t("hasAccess")}</span>
                      ) : null}
                      {isPicked ? <Check aria-hidden className="text-accent size-4" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        }
      </QueryState>
    </div>
  );
};
