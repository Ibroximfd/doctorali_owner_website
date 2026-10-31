import { envelope, type MockContext } from "../engine";
import { AVG_CHECK, filialsState } from "../structure-v2";
import { type MockHandler } from "../types";
import { operatorsOf, pct, selectedFilials } from "../v2-metrics";

/**
 * Xodimlar — `GET /api/owner/sales/operators/` (B-15; `/api/owner/staff/*` backendda yo'q).
 * Shakl — jonli javob (2026-10-31): konvert, `data` — operatorlar massivi, `filial` — nom.
 * Raqamlar Analitika bilan bir manbadan (`v2-metrics`).
 */
const salesOperators = (ctx: MockContext) =>
  envelope(
    ctx,
    selectedFilials(ctx).flatMap((filial) =>
      operatorsOf(ctx, filial.id).map((row, index) => ({
        id: row.id,
        full_name: row.full_name,
        filial: filialsState().find((item) => item.id === filial.id)?.name ?? null,
        is_online: index % 2 === 0,
        leads: row.leads,
        conversion_pct: pct(row.sold, row.leads) ?? 0,
        orders_created: row.sold,
        orders_delivered: row.sold - row.cancelled,
        sales_amount: (row.sold - row.cancelled) * AVG_CHECK,
        commission_earned: Math.round((row.sold - row.cancelled) * AVG_CHECK * 0.03),
        commission_pending: 0,
        calls: row.leads * 2,
        missed_unhandled: index % 3,
        activities_overdue: index % 2,
        rating_avg: index % 3 === 2 ? null : 4.2 + (index % 4) / 10,
        rating_count: index % 3 === 2 ? 0 : 12 + index,
      })),
    ),
  );

export const staffHandlers: MockHandler[] = [
  { method: "GET", path: "sales/operators/", resolve: salesOperators },
];
