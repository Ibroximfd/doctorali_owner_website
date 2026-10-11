"use client";

import { SEQ_BG, SEQ_TEXT, seqStep } from "@/shared/config/chart-palette";
import { REGION_TILES, TILE_COLS, TILE_ROWS, isRegionCode } from "@/shared/config/regions";
import { cn } from "@/shared/lib/cn";

import { SeqScale } from "./seq-scale";
import { Tip } from "./tip";

export type RegionValue = { code: string; name: string; value: number; valueLabel: string; detail?: string };

type RegionTilesProps = { regions: readonly RegionValue[]; lowLabel: string; highLabel: string };

const CELLS = Array.from({ length: TILE_ROWS * TILE_COLS }, (_, index) => ({
  row: Math.floor(index / TILE_COLS) + 1,
  col: (index % TILE_COLS) + 1,
}));

/**
 * 14 viloyat plitka-xaritasi: joylashuv geografiyaga yaqin, rang — qiymat
 * (bitta rang, ochdan to'qqa). Har plitkada qisqa nom va qiymat yozilgan.
 */
export const RegionTiles = ({ regions, lowLabel, highLabel }: RegionTilesProps) => {
  const max = Math.max(1, ...regions.map((region) => region.value));
  const at = (row: number, col: number) =>
    regions.find(
      (region) =>
        isRegionCode(region.code) &&
        REGION_TILES[region.code].row === row &&
        REGION_TILES[region.code].col === col,
    );

  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {CELLS.map(({ row, col }) => {
          const region = at(row, col);
          if (!region || !isRegionCode(region.code)) return <span key={`${row}-${col}`} aria-hidden />;
          const step = seqStep(region.value, max);
          return (
            <Tip
              key={region.code}
              content={
                <>
                  <div className="font-semibold">{region.name}</div>
                  <div className="num">{region.valueLabel}</div>
                  {region.detail ? <div className="text-2xs text-ink-3">{region.detail}</div> : null}
                </>
              }
            >
              <button
                type="button"
                aria-label={`${region.name}: ${region.valueLabel}`}
                className={cn(
                  "flex aspect-6/5 min-w-0 flex-col items-center justify-center rounded-sm",
                  SEQ_BG[step],
                  SEQ_TEXT[step],
                )}
              >
                <span className="text-2xs font-strong leading-tight tracking-wide">
                  {REGION_TILES[region.code].short}
                </span>
                <span className="num text-2xs leading-tight font-semibold">{region.valueLabel}</span>
              </button>
            </Tip>
          );
        })}
      </div>
      <SeqScale lowLabel={lowLabel} highLabel={highLabel} />
    </div>
  );
};
