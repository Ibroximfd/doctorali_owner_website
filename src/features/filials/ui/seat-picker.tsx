"use client";

import { Check, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDeferredValue, useState } from "react";

import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui/input";
import { ListSkeleton, QueryState } from "@/shared/ui/states";
import { NoResults } from "@/shared/ui/states/states";

import { useSeatsQuery } from "../hooks/use-filials";

type SeatPickerProps = {
  filialId: number;
  value: number | null;
  onChange: (seatId: number) => void;
  /** Ro'yxatdan chiqariladigan o'rin (almashtirishda — hozirgi rahbar). */
  excludeSeatId?: number;
  error?: string;
};

/**
 * Filialdagi mavjud o'rinni qidirib tanlash (B-5): ism yoki login bo'yicha. Faqat shu filial
 * o'rinlari keladi — boshqa filialdagi odamni tanlab bo'lmaydi.
 */
export const SeatPicker = ({ filialId, value, onChange, excludeSeatId, error }: SeatPickerProps) => {
  const t = useTranslations("filials.leader");
  const [search, setSearch] = useState("");
  const query = useSeatsQuery(filialId, useDeferredValue(search));
  const visible = (rows: NonNullable<typeof query.data>) =>
    rows.filter((seat) => seat.seatId !== excludeSeatId);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="seat-search" className="font-mid text-ink-2 text-xs">
        {t("seatSearch")}
      </label>
      <div className="relative">
        <Search aria-hidden className="text-ink-3 absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id="seat-search"
          type="search"
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "seat-search-error" : undefined}
        />
      </div>
      <QueryState
        query={query}
        skeleton={<ListSkeleton rows={3} />}
        isEmpty={(rows) => visible(rows).length === 0}
        empty={
          search.trim() ? (
            <NoResults query={search.trim()} onClear={() => setSearch("")} />
          ) : (
            <p className="text-ink-3 py-2 text-sm">{t("seatEmpty")}</p>
          )
        }
      >
        {(rows) => (
          <ul
            role="radiogroup"
            aria-label={t("seat")}
            className="flex max-h-64 flex-col gap-1 overflow-y-auto"
          >
            {visible(rows).map((seat) => {
              const selected = seat.seatId === value;
              return (
                <li key={seat.seatId}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onChange(seat.seatId)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                      selected ? "border-accent bg-accent/10" : "hover:bg-surface-2",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{seat.fullName}</span>
                      <span className="text-ink-3 block truncate text-xs">
                        {[seat.username, seat.department].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {selected ? <Check aria-hidden className="text-accent size-4 shrink-0" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
      {error ? (
        <p id="seat-search-error" role="alert" className="text-crit text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
};
