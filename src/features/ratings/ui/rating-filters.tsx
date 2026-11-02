"use client";

import { useTranslations } from "next-intl";

import { useRegionName } from "@/shared/meta/use-region-name";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import { Input, Select } from "@/shared/ui/input";

import { useRatingsView } from "../hooks/use-ratings";
import { ACTIVITY, hasFilters, type Activity } from "../model/ratings.rules";

const ANY = "any";
const STAR_OPTIONS = [4, 3, 2, 1] as const;

/**
 * Ro'yxat filtrlari (URL da). Hammasi — kelgan qatorlar ustida: owner endpointi davr va filialdan
 * boshqa filtrni qabul qilmaydi, jamlanma ham server to'plamidan qoladi.
 * Kuryerda qo'shimcha: viloyat, faol/nofaol, minimal reyting.
 */
export const RatingFilters = ({ regions }: { regions?: readonly string[] }) => {
  const t = useTranslations("ratings.filters");
  const regionName = useRegionName();
  const { tab, filters, setFilters, clearFilters } = useRatingsView();
  const isCourier = tab === "couriers";

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="flex flex-wrap items-center gap-2 px-4 pb-3 md:px-5.5"
    >
      <label htmlFor="ratings-q" className="sr-only">
        {t("search")}
      </label>
      <Input
        id="ratings-q"
        type="search"
        className="h-9 w-full text-sm sm:w-56"
        placeholder={t("search")}
        value={filters.q}
        onChange={(event) => setFilters({ q: event.target.value })}
      />
      <Chip pressed={filters.rated} onClick={() => setFilters({ rated: !filters.rated })}>
        {t("rated")}
      </Chip>
      {isCourier ? (
        <>
          <label htmlFor="ratings-region" className="sr-only">
            {t("region")}
          </label>
          <Select
            id="ratings-region"
            className="h-9 w-full text-sm sm:w-48"
            value={filters.region ?? ANY}
            onChange={(event) =>
              setFilters({ region: event.target.value === ANY ? null : event.target.value })
            }
          >
            <option value={ANY}>{t("allRegions")}</option>
            {(regions ?? []).map((code) => (
              <option key={code} value={code}>
                {regionName(code)}
              </option>
            ))}
          </Select>
          <label htmlFor="ratings-min" className="sr-only">
            {t("minScore")}
          </label>
          <Select
            id="ratings-min"
            className="h-9 w-full text-sm sm:w-40"
            value={filters.minScore === null ? ANY : String(filters.minScore)}
            onChange={(event) =>
              setFilters({ minScore: event.target.value === ANY ? null : Number(event.target.value) })
            }
          >
            <option value={ANY}>{t("anyScore")}</option>
            {STAR_OPTIONS.map((stars) => (
              <option key={stars} value={stars}>
                {t("minOption", { stars })}
              </option>
            ))}
          </Select>
          <div role="group" aria-label={t("activityLabel")} className="flex gap-1.5">
            {ACTIVITY.map((value: Activity) => (
              <Chip
                key={value}
                pressed={filters.activity === value}
                onClick={() => setFilters({ activity: value })}
              >
                {t(`activity.${value}`)}
              </Chip>
            ))}
          </div>
        </>
      ) : null}
      {hasFilters(filters) ? (
        <Button size="sm" intent="ghost" onClick={clearFilters}>
          {t("clear")}
        </Button>
      ) : null}
    </div>
  );
};
