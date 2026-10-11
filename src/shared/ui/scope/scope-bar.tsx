"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Building2, CalendarDays, Check, ChevronDown, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { useFormat } from "@/shared/hooks/use-format";
import { useLastUpdated } from "@/shared/hooks/use-last-updated";
import { useScope } from "@/shared/hooks/use-scope";
import { cn } from "@/shared/lib/cn";
import { COMPARE_MODES, type CompareMode, type PeriodKey } from "@/shared/lib/scope";
import { useMetaQuery } from "@/shared/meta/use-meta-query";

import { Button } from "../button";
import { Chip } from "../chip";
import { Input } from "../input";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "../popover";
import { Segmented } from "../segmented";
import { Sheet } from "../sheet";

type PresetKey = Exclude<PeriodKey, "custom">;

const SEGMENT_PERIODS = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "90d",
  "year",
] as const satisfies readonly PresetKey[];
const RANGE_PERIODS = ["month", "prev_month"] as const satisfies readonly PresetKey[];

const isSegmentPeriod = (period: PeriodKey): period is (typeof SEGMENT_PERIODS)[number] =>
  (SEGMENT_PERIODS as readonly string[]).includes(period);

type MenuOptionProps = Omit<ComponentPropsWithoutRef<"button">, "onSelect" | "role"> & {
  checked: boolean;
  /** Bir nechtasi tanlanadigan ro'yxat (filiallar) — `checkbox`, bittasi — `radio`. */
  kind?: "radio" | "checkbox";
  onSelect: () => void;
  children: ReactNode;
};

/** Qolgan proplar tugmaga uzatiladi — `PopoverClose asChild` yopish hodisasini shu orqali ulaydi. */
const MenuOption = ({
  checked,
  kind = "radio",
  onSelect,
  children,
  onClick,
  className,
  ...props
}: MenuOptionProps) => (
  <button
    type="button"
    role={kind === "checkbox" ? "menuitemcheckbox" : "menuitemradio"}
    aria-checked={checked}
    onClick={(event) => {
      onSelect();
      onClick?.(event);
    }}
    className={cn(
      "hover:bg-surface-3 flex h-8.5 w-full items-center gap-2 rounded-sm px-2.5 text-left text-sm",
      checked && "font-semibold",
      className,
    )}
    {...props}
  >
    <span className="flex-1 truncate">{children}</span>
    {checked ? <Check aria-hidden className="text-accent size-4" strokeWidth={2.6} /> : null}
  </button>
);

/** Filtr holati va yorliqlari — desktop qator va telefon varag'i bir xil mantiqdan foydalanadi. */
const useScopeControls = () => {
  const t = useTranslations("scope");
  const { scope, setPeriod, setRange, setFilials, setCompare } = useScope();
  const filials = useMetaQuery().data?.filials ?? [];
  const format = useFormat();

  const periodLabel =
    scope.period === "custom" && scope.from && scope.to
      ? `${format.date(`${scope.from}T12:00:00+05:00`)} – ${format.date(`${scope.to}T12:00:00+05:00`)}`
      : t(`period.${scope.period}`);

  const selectedFilials = filials.filter((filial) => scope.filials.includes(filial.id));
  const filialLabel =
    selectedFilials.length === 0
      ? t("filial.all")
      : selectedFilials.length === 1
        ? (selectedFilials[0]?.name ?? t("filial.all"))
        : t("filial.count", { count: selectedFilials.length });

  const toggleFilial = (id: number) =>
    void setFilials(
      scope.filials.includes(id) ? scope.filials.filter((value) => value !== id) : [...scope.filials, id],
    );

  return {
    t,
    scope,
    filials,
    periodLabel,
    filialLabel,
    setPeriod,
    setRange,
    setFilials,
    setCompare,
    toggleFilial,
  };
};

const RangeForm = ({
  from,
  to,
  onApply,
  insidePopover = true,
}: {
  from: string | null;
  to: string | null;
  onApply: (from: string, to: string) => void;
  /** Popover ichida «Qo'llash» uni yopadi; telefon oynasida (Sheet) yopishni chaqiruvchi o'zi qiladi. */
  insidePopover?: boolean;
}) => {
  const t = useTranslations("scope");
  const [draftFrom, setDraftFrom] = useState(from ?? "");
  const [draftTo, setDraftTo] = useState(to ?? "");
  const isValid = draftFrom !== "" && draftTo !== "" && draftFrom <= draftTo;

  return (
    <div className="flex flex-col gap-2 p-1.5">
      <div className="flex gap-1.5">
        <Input
          type="date"
          aria-label={t("range.from")}
          value={draftFrom}
          max={draftTo || undefined}
          onChange={(event) => setDraftFrom(event.target.value)}
          className="h-8.5 px-2 text-sm"
        />
        <Input
          type="date"
          aria-label={t("range.to")}
          value={draftTo}
          min={draftFrom || undefined}
          onChange={(event) => setDraftTo(event.target.value)}
          className="h-8.5 px-2 text-sm"
        />
      </div>
      {insidePopover ? (
        <PopoverClose asChild>
          <Button intent="primary" size="sm" disabled={!isValid} onClick={() => onApply(draftFrom, draftTo)}>
            {t("range.apply")}
          </Button>
        </PopoverClose>
      ) : (
        <Button intent="primary" size="lg" disabled={!isValid} onClick={() => onApply(draftFrom, draftTo)}>
          {t("range.apply")}
        </Button>
      )}
    </div>
  );
};

/** Sahifa tepasidagi yagona filtr qatori — pastdagi barcha bloklar shu tilimga bo'ysunadi. */
export const ScopeBar = () => {
  const controls = useScopeControls();
  const { t, scope } = controls;
  const queryClient = useQueryClient();
  const format = useFormat();
  const lastUpdated = useLastUpdated();

  return (
    <div className="flex flex-wrap items-center gap-2.5 px-6 pt-3 max-md:hidden">
      <Segmented
        ariaLabel={t("periodLabel")}
        options={SEGMENT_PERIODS.map((period) => ({ value: period, label: t(`period.${period}`) }))}
        value={isSegmentPeriod(scope.period) ? scope.period : null}
        onChange={(period) => void controls.setPeriod(period)}
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button>
            <CalendarDays aria-hidden />
            {isSegmentPeriod(scope.period) ? t("range.trigger") : controls.periodLabel}
            <ChevronDown aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <div role="menu">
            {RANGE_PERIODS.map((period) => (
              <PopoverClose asChild key={period}>
                <MenuOption
                  checked={scope.period === period}
                  onSelect={() => void controls.setPeriod(period)}
                >
                  {t(`period.${period}`)}
                </MenuOption>
              </PopoverClose>
            ))}
          </div>
          <hr className="my-1.5" />
          <RangeForm
            from={scope.from}
            to={scope.to}
            onApply={(from, to) => void controls.setRange(from, to)}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button>
            <Building2 aria-hidden />
            {controls.filialLabel}
            <ChevronDown aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <div role="menu">
            <MenuOption checked={scope.filials.length === 0} onSelect={() => void controls.setFilials([])}>
              {t("filial.all")}
            </MenuOption>
            {controls.filials.map((filial) => (
              <MenuOption
                key={filial.id}
                kind="checkbox"
                checked={scope.filials.includes(filial.id)}
                onSelect={() => controls.toggleFilial(filial.id)}
              >
                {filial.name}
              </MenuOption>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button intent={scope.compare === "none" ? "ghost" : "outline"}>
            <ArrowLeftRight aria-hidden />
            {t(`compare.${scope.compare}`)}
            <ChevronDown aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <div role="menu">
            {COMPARE_MODES.map((mode) => (
              <PopoverClose asChild key={mode}>
                <MenuOption checked={scope.compare === mode} onSelect={() => void controls.setCompare(mode)}>
                  {t(`compareOption.${mode}`)}
                </MenuOption>
              </PopoverClose>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="text-ink-3 ml-auto flex items-center gap-1.5 text-xs whitespace-nowrap">
        {lastUpdated === null ? null : (
          <span>{t("updated", { time: format.time(new Date(lastUpdated).toISOString()) })}</span>
        )}
        <Button
          intent="ghost"
          size="icon"
          aria-label={t("refresh")}
          onClick={() => void queryClient.invalidateQueries()}
        >
          <RefreshCw aria-hidden />
        </Button>
      </div>
    </div>
  );
};

const ALL_PRESETS: readonly PresetKey[] = [...SEGMENT_PERIODS, ...RANGE_PERIODS];

/** Telefon: bitta tugma → pastki varaq (davr, filial, taqqoslash). */
export const MobileScope = () => {
  const controls = useScopeControls();
  const { t, scope } = controls;
  const [open, setOpen] = useState(false);

  return (
    <div className="px-4 pt-3 md:hidden">
      <Button size="lg" className="w-full justify-start" onClick={() => setOpen(true)}>
        <CalendarDays aria-hidden />
        <span className="truncate">
          {controls.periodLabel} · {controls.filialLabel}
        </span>
        <ChevronDown aria-hidden className="ml-auto" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen} title={t("sheetTitle")}>
        <SheetGroup title={t("periodLabel")}>
          {ALL_PRESETS.map((period) => (
            <Chip
              key={period}
              size="lg"
              pressed={scope.period === period}
              onClick={() => void controls.setPeriod(period)}
            >
              {t(`period.${period}`)}
            </Chip>
          ))}
        </SheetGroup>
        {/* Ulashilgan havoladagi oraliqni telefonda ham ko'rish va o'zgartirish mumkin. */}
        <SheetGroup title={t("period.custom")}>
          <div className="w-full">
            <RangeForm
              from={scope.from}
              to={scope.to}
              insidePopover={false}
              onApply={(from, to) => {
                void controls.setRange(from, to);
                setOpen(false);
              }}
            />
          </div>
        </SheetGroup>
        <SheetGroup title={t("filialLabel")}>
          <Chip size="lg" pressed={scope.filials.length === 0} onClick={() => void controls.setFilials([])}>
            {t("filial.all")}
          </Chip>
          {controls.filials.map((filial) => (
            <Chip
              key={filial.id}
              size="lg"
              pressed={scope.filials.includes(filial.id)}
              onClick={() => controls.toggleFilial(filial.id)}
            >
              {filial.name}
            </Chip>
          ))}
        </SheetGroup>
        <SheetGroup title={t("compareLabel")}>
          {COMPARE_MODES.map((mode: CompareMode) => (
            <Chip
              key={mode}
              size="lg"
              pressed={scope.compare === mode}
              onClick={() => void controls.setCompare(mode)}
            >
              {t(`compareOption.${mode}`)}
            </Chip>
          ))}
        </SheetGroup>
        <Button intent="primary" size="lg" className="mt-4.5 w-full" onClick={() => setOpen(false)}>
          {t("done")}
        </Button>
      </Sheet>
    </div>
  );
};

const SheetGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <section>
    <h3 className="text-ink-3 mt-3.5 mb-2 text-xs font-semibold tracking-wider uppercase">{title}</h3>
    <div className="flex flex-wrap gap-2">{children}</div>
  </section>
);
