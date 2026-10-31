import { describe, expect, it } from "vitest";

import { aiStatusSchema, analysisSchema } from "@/features/ai/model/ai.schema";
import { analyticsSchema } from "@/features/analytics/model/analytics.schema";
import { userSchema } from "@/features/auth/model/auth.schema";
import {
  auditSchema,
  catalogSchema,
  performanceSchema,
  structureSchema,
} from "@/features/filials/model/filials.schema";
import { financeSchema } from "@/features/finance/model/finance.schema";
import { appV2Schema } from "@/features/mobile-app/model/mobile-app.schema";
import { overviewSchema } from "@/features/overview/model/overview.schema";
import { salesOperatorsSchema, toLeaderboard, toTeams } from "@/features/staff/model/sales-operators";
import {
  grantsSchema,
  ledgerSchema,
  overviewSchema as skladOverviewSchema,
  skladsSchema,
  stockPageSchema,
  stockSchema,
} from "@/features/warehouse/model/warehouse.schema";
import { parseJson } from "@/shared/lib/envelope";
import { parseFlexible } from "@/shared/lib/lenient";

import live from "./live/owner-v2-2026-10-31.json";

/**
 * Haqiqiy backend javoblari (test server, `v2_owner`, 2026-10-31) — tokensiz, ro'yxatlar 3 tagacha
 * qisqartirilgan. Panel sxemalari shu javoblarni o'qiy olishi shart; maydon yo'qolsa yoki nomi
 * o'zgarsa — shu test yiqiladi.
 */
const body = (path: keyof typeof live): unknown => live[path];

describe("live backend v2 answers (2026-10-31)", () => {
  it("me and structure", () => {
    expect(parseJson(userSchema, body("owner/me/"))).toMatchObject({ role: "owner" });
    const structure = parseJson(structureSchema, body("owner/structure/"));
    expect(structure.results[0]).toMatchObject({ id: 1, code: "", isMain: false });
    expect(structure.results[0]?.chiefLogist?.username).toBe("v2_bl_toshkent");
    expect(parseJson(auditSchema, body("owner/structure/audit/")).results).toEqual([]);
  });

  it("permission catalog: labels in both languages, role and group", () => {
    const catalog = parseJson(catalogSchema, body("owner/structure/permissions/"));
    expect(catalog[0]).toMatchObject({
      key: "view.sibling_departments",
      labelRu: "Видеть соседние отделы",
      role: "chief_operator",
      group: "ko'radi",
    });
  });

  it("filial performance: otkaz, string revenue, trend object", () => {
    const { data } = parseFlexible(performanceSchema, body("owner/filials/performance/"));
    const first = data.filials[0];
    expect(first).toMatchObject({ filialId: 1, cancelled: 4, revenue: 59_993_941, cancelRatePct: 1.5 });
    expect(first?.trend.length).toBe(data.labels.length);
    expect(data.labels.length).toBeGreaterThan(0);
  });

  it("overview/v2: money chain, orders, revenue summed from filials", () => {
    const { data, period } = parseFlexible(overviewSchema, body("owner/overview/v2/"));
    expect(period.label).toBe("30d");
    expect(data.money).toEqual({ atCouriers: 4_654_910, atChiefs: 0, handed: 2_539_944 });
    expect(data.orders.leads.value).toBe(10_224);
    expect(data.orders.cancelled.value).toBe(6);
    expect(data.conversion.value).toBe(0.1);
    expect(data.revenue.value).toBe(data.filials.reduce((sum, row) => sum + row.revenue, 0));
    expect(data.filials[0]).toMatchObject({ code: "TO", cancelled: 4, cancelRatePct: 1.5 });
  });

  it("finance/v2: totals, filials, handovers, regions", () => {
    const { data } = parseFlexible(financeSchema, body("owner/finance/v2/"));
    expect(data.totals).toMatchObject({ revenue: 82_399_749, atCouriers: 4_654_910, handed: 2_539_944 });
    // manfiy qoldiq (`with_chiefs: -44000`) ko'rsatilmaydi
    expect(data.totals.atChiefs).toBe(0);
    expect(data.filials[0]).toMatchObject({ id: 1, name: "Mehrigiyo Toshkent", revenue: 59_993_941 });
    expect(data.chiefs[0]).toMatchObject({ skladId: 43, chiefName: "Test Bosh Kuryer", byFilial: [] });
    expect(data.chiefs[1]?.byFilial[0]).toMatchObject({
      filialId: 2,
      addresses: 8,
      fee: 80_000,
      feePaid: null,
      collected: 1000,
      handed: 55_000,
      pending: 0,
    });
    // manzil soni, haq va narx bosh kuryer × filial qatorlaridan
    expect(data.totals).toMatchObject({ addresses: 14, chiefFee: 140_000, chiefFeePaid: null });
    expect(data.addressRate).toBe(10_000);
    expect(data.filials.find((row) => row.id === 2)).toMatchObject({ addresses: 8, chiefFee: 80_000 });
    expect(data.handovers[0]).toMatchObject({
      id: 4,
      chiefName: "V2 Bosh kuryer (Vodiy)",
      filialId: 2,
      amount: 25_000,
      onTime: false,
    });
    expect(data.regions[0]).toMatchObject({ code: "toshkent_shahar", cancelled: 4, money: 24_904_680 });
  });

  it("analytics/v2: totals, filials, products, operators", () => {
    const { data } = parseFlexible(analyticsSchema, body("owner/analytics/v2/"));
    expect(data.totals).toMatchObject({ leads: 10_224, cancelled: 6, cancelRatePct: 1.4 });
    expect(data.filials[0]).toMatchObject({ id: 1, cancelled: 4, cancelRatePct: 1.5 });
    expect(data.products[0]).toMatchObject({ id: 6, sold: 121, delivered: 96, cancelled: 0 });
    expect(data.operators[0]).toMatchObject({ id: 25, filialId: 1, sold: 212, cancelled: 3 });
    expect(data.trend.labels).toEqual([]);
  });

  it("app/v2: statuses add up, users, referrals", () => {
    const { data } = parseFlexible(appV2Schema, body("owner/app/v2/"));
    expect(data.orders?.statuses).toEqual({
      pending: 1,
      confirmed: 1,
      inTransit: 1,
      delivered: 162,
      cancelled: 3,
    });
    expect(data.orders?.total).toBe(168);
    expect(data.orders?.filials[0]).toMatchObject({ id: 1, total: 60, delivered: 56, cancelled: 2 });
    expect(data.users).toMatchObject({ usersTotal: 54, newUsers: 26, dau: 0, mau: 9 });
    expect(data.operators).toEqual([]);
  });

  it("ai: status and analysis with {kind, title, detail, severity}", () => {
    expect(parseJson(aiStatusSchema, body("owner/ai/status/"))).toMatchObject({ enabled: false });
    const analysis = analysisSchema.parse(body("owner/ai/analysis/"));
    expect(analysis.period).toEqual({ date_from: "2026-10-02", date_to: "2026-10-31" });
    expect(analysis.findings[0]).toMatchObject({ kind: "warehouse_urgent", severity: "urgent" });
    expect(analysis.warehouse_findings[0]).toMatchObject({ area: "couriers", fix: expect.any(String) });
  });

  it("sales/operators builds the staff board", () => {
    const { data } = parseFlexible(salesOperatorsSchema, body("owner/sales/operators/"));
    const board = toLeaderboard(data, null);
    expect(board.rows).toHaveLength(data.length);
    expect(board.rows[0]?.score).toBe(100);
    // `conversion_pct` — foiz; jamoa konversiyasi 100% dan oshmaydi
    for (const team of toTeams(data)) expect(team.metrics.conversionPct ?? 0).toBeLessThanOrEqual(100);
    expect(board.rows[0]?.team).toBe(data.find((row) => row.id === board.rows[0]?.id)?.filial);
  });

  it("sklad: sklads, overview, stock, ledger and grants", () => {
    expect(parseJson(skladsSchema, body("sklad/sklads/"))[0]).toMatchObject({ id: 2 });
    expect(() => parseJson(skladOverviewSchema, body("sklad/overview/"))).not.toThrow();
    const page = stockPageSchema.parse(body("sklad/stock/"));
    expect(page.next).not.toBeNull();
    expect(parseJson(stockSchema, page.results)[0]?.item.id).toBe(14);
    expect(parseJson(ledgerSchema, body("sklad/ledger/")).results[0]?.actor?.kind).toBe("system");
    expect(parseJson(grantsSchema, body("owner/structure/sklad-grants/1/")).items[0]).toMatchObject({
      productId: 9,
    });
  });
});
