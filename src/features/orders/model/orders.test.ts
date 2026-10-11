import { describe, expect, it } from "vitest";

import { parseEnvelope, parseJson, timeseriesSchema } from "@/shared/lib/envelope";
import { SCOPE_CASES, mockGet } from "@/shared/testing/mock-api";

import {
  bucketLabels,
  bucketRange,
  clientCancellations,
  collapseTail,
  confirmationColorIndex,
  heatmapGrid,
  newestFirst,
  oldestFirst,
  paymentTone,
  pendingReasonToShow,
  stageMeter,
  stuckHolder,
  timelineDotClass,
  timelineFacts,
  timelineTitleKeys,
  topRows,
  trendSeries,
} from "./orders.rules";
import {
  BREAKDOWN_DIMENSIONS,
  orderDetailSchema,
  ordersBreakdownSchema,
  ordersFunnelSchema,
  ordersHeatmapSchema,
  ordersListSchema,
  ordersSummarySchema,
  stageDurationsSchema,
  stuckOrdersSchema,
  type BreakdownDimension,
  type BreakdownRow,
} from "./orders.schema";

type Query = Record<string, string>;

const MONTH: Query = { period: "30d" };

const summaryFor = (query: Query) =>
  parseEnvelope(ordersSummarySchema, mockGet("orders/summary/", query)).data;
const funnelFor = (query: Query) => parseEnvelope(ordersFunnelSchema, mockGet("orders/funnel/", query)).data;
const trendFor = (query: Query) => parseEnvelope(timeseriesSchema, mockGet("orders/timeseries/", query)).data;
const breakdownFor = (by: BreakdownDimension, query: Query) =>
  parseEnvelope(ordersBreakdownSchema, mockGet("orders/breakdown/", { ...query, by })).data;
const durationsFor = (query: Query) =>
  parseEnvelope(stageDurationsSchema, mockGet("orders/stage-durations/", query)).data;
const heatmapFor = (query: Query) =>
  parseEnvelope(ordersHeatmapSchema, mockGet("orders/heatmap/", query)).data;
const stuckFor = (query: Query) => parseEnvelope(stuckOrdersSchema, mockGet("orders/stuck/", query)).data;
const listFor = (query: Query) => parseJson(ordersListSchema, mockGet("orders/", query));
const detailFor = (id: string) => parseJson(orderDetailSchema, mockGet(`orders/${id}/`));

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
const seriesOf = (query: Query, key: string): number[] =>
  trendFor(query).series.find((series) => series.key === key)?.values ?? [];
const stageCount = (query: Query, status: string): number =>
  funnelFor(query).stages.find((stage) => stage.status === status)?.count ?? -1;

describe("orders contract", () => {
  it.each(SCOPE_CASES)("every aggregate endpoint matches its schema for %o", (query) => {
    expect(() => {
      summaryFor(query);
      funnelFor(query);
      trendFor(query);
      for (const by of BREAKDOWN_DIMENSIONS) breakdownFor(by, query);
      durationsFor(query);
      heatmapFor(query);
      stuckFor(query);
    }).not.toThrow();
  });

  it.each(SCOPE_CASES)("the list and every order in it match the Order model for %o", (query) => {
    const { results } = listFor(query);

    for (const row of results) expect(detailFor(row.id).orderNumber).toBe(row.orderNumber);
  });

  it("rejects a breakdown the screen does not know", () => {
    expect(() => mockGet("orders/breakdown/", { by: "zodiac" })).toThrow(/400/);
  });

  it("answers 404 for an unknown order", () => {
    expect(() => mockGet("orders/00000000-0000-4000-8000-000000000000/")).toThrow(/404/);
  });
});

describe("orders numbers agree with each other", () => {
  it.each(SCOPE_CASES)("funnel, trend, heatmap and breakdowns add up to the summary for %o", (query) => {
    const summary = summaryFor(query);
    const funnel = funnelFor(query);
    const countsOf = (by: BreakdownDimension) => sum(breakdownFor(by, query).map((row) => row.count));

    expect(stageCount(query, "created")).toBe(summary.orders.value);
    expect(stageCount(query, "delivered")).toBe(summary.delivered.value);
    expect(funnel.cancelled.count + funnel.inProgress.count + (summary.delivered.value ?? 0)).toBe(
      summary.orders.value,
    );
    expect(funnel.inProgress.count).toBeGreaterThanOrEqual(0);

    expect(sum(seriesOf(query, "created"))).toBe(summary.orders.value);
    expect(sum(seriesOf(query, "delivered"))).toBe(summary.delivered.value);
    expect(sum(seriesOf(query, "cancelled"))).toBe(funnel.cancelled.count);
    expect(sum(heatmapFor(query).map((cell) => cell.count))).toBe(summary.orders.value);

    expect(countsOf("source")).toBe(summary.orders.value);
    expect(countsOf("region")).toBe(summary.orders.value);
    expect(countsOf("cancel_reason")).toBe(funnel.cancelled.count);
    expect(countsOf("confirmation_channel")).toBe(stageCount(query, "confirmed"));
  });

  it("shows the approved sample numbers for the last 30 days", () => {
    const summary = summaryFor(MONTH);

    expect(summary.orders.value).toBe(3860);
    expect(summary.confirmedRate.value).toBe(90.4);
    expect(summary.delivered.value).toBe(2912);
    expect(summary.cancelRate.value).toBe(12.6);
    expect(funnelFor(MONTH).inProgress).toEqual({ count: 462, pctOfCreated: 12 });
  });

  it("derives rates and transitions from the same counts", () => {
    const { stages, transitions, cancelled } = funnelFor(MONTH);
    const summary = summaryFor(MONTH);

    expect(transitions.pendingToConfirmed).toBe(summary.confirmedRate.value);
    expect(cancelled.pctOfCreated).toBe(summary.cancelRate.value);
    expect(stages.map((stage) => stage.status)).toEqual(["created", "confirmed", "shipping", "delivered"]);
    expect(stages.map((stage) => stage.count)).toEqual(
      [...stages.map((stage) => stage.count)].sort((a, b) => b - a),
    );
  });

  it("scales with the selected filial", () => {
    expect(summaryFor({ period: "30d", filial: "3" }).orders.value).toBeLessThan(
      summaryFor(MONTH).orders.value ?? 0,
    );
  });

  it("has no comparison numbers when compare is none", () => {
    const query = { period: "30d", compare: "none" };

    expect(summaryFor(query).orders.previous).toBeNull();
    expect(summaryFor(query).cancelRate.deltaPct).toBeNull();
    expect(durationsFor(query).every((stage) => stage.previousP50Min === null)).toBe(true);
    expect(breakdownFor("source", query).every((row) => row.previousCount === null)).toBe(true);
  });

  it("gives the trend one value per label and all 14 regions", () => {
    const trend = trendFor({ period: "7d" });

    expect(trend.labels).toHaveLength(7);
    for (const series of trend.series) expect(series.values).toHaveLength(7);
    expect(breakdownFor("region", MONTH)).toHaveLength(14);
    expect(heatmapFor(MONTH)).toHaveLength(7 * 24);
  });
});

describe("stuck orders mock", () => {
  it("is the current state: the period does not change it, the filial does", () => {
    expect(stuckFor({ period: "today" })).toEqual(stuckFor({ period: "year" }));

    const samarqand = stuckFor({ period: "30d", filial: "3" });
    expect(samarqand.results.map((row) => row.filial)).toEqual(["Samarqand", "Samarqand"]);
    expect(samarqand.count).toBeGreaterThanOrEqual(samarqand.results.length);
  });

  it("counts every order past its rule, not only the listed ones", () => {
    expect(stuckFor(MONTH).count).toBe(48);
  });
});

describe("orders list mock", () => {
  it("returns the newest orders first", () => {
    const { results } = listFor(MONTH);
    const times = results.map((row) => Date.parse(row.createdAt));

    expect(results[0]?.orderNumber).toBe("DA-184032");
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("filters by status on the server", () => {
    const { results, count } = listFor({ period: "30d", status: "cancelled" });

    expect(results.map((row) => row.orderNumber)).toEqual(["DA-184022"]);
    expect(count).toBe(1);
  });

  it.each([
    ["an order number", "da-184029"],
    ["a client name", "rustam"],
    ["a phone number", "91 345 67"],
  ])("searches by %s", (_what, search) => {
    expect(listFor({ period: "30d", search }).results.map((row) => row.orderNumber)).toEqual(["DA-184029"]);
  });

  it("pages through the matches", () => {
    const first = listFor({ period: "30d", page_size: "5" });
    const second = listFor({ period: "30d", page_size: "5", page: "2" });

    expect(first.count).toBe(13);
    expect(first.results).toHaveLength(5);
    expect(second.results[0]?.id).not.toBe(first.results[0]?.id);
  });

  it("only lists orders created in the period and the selected filial", () => {
    expect(listFor({ period: "yesterday" }).results).toEqual([]);
    expect(listFor({ period: "prev_month" }).results.map((row) => row.orderNumber)).toEqual([
      "DA-183688",
      "DA-183802",
      "DA-183712",
    ]);
    expect(listFor({ period: "30d", filial: "3" }).results.map((row) => row.orderNumber)).toEqual([
      "DA-184032",
      "DA-183955",
      "DA-183802",
    ]);
  });
});

describe("order detail mock", () => {
  const orders = listFor(MONTH).results.map((row) => detailFor(row.id));

  it("has items that add up to the order total, with gifts free", () => {
    for (const order of orders) {
      expect(sum(order.items.map((item) => item.price))).toBe(order.totalAmount);
      expect(order.items.filter((item) => item.isGift).every((item) => item.price === 0)).toBe(true);
    }
  });

  it("tells a timeline that starts with creation and ends in the current status", () => {
    for (const order of orders) {
      const chronological = [...order.timeline].sort((a, b) => a.id - b.id);
      const lastChange = chronological.filter((event) => event.kind === "order.status_changed").at(-1);

      expect(chronological[0]?.kind).toBe("order.created");
      expect(lastChange?.payload.to ?? "pending").toBe(order.status);
      expect(chronological.map((event) => Date.parse(event.createdAt))).toEqual(
        [...chronological.map((event) => Date.parse(event.createdAt))].sort((a, b) => a - b),
      );
    }
  });

  it("explains why a pending order is waiting", () => {
    const pending = orders.filter((order) => order.status === "pending");

    expect(pending.map((order) => order.pendingReason).sort()).toEqual([
      "awaiting_client_confirmation",
      "awaiting_online_payment",
    ]);
    expect(
      orders.filter((order) => order.status !== "pending").every((order) => order.pendingReason === null),
    ).toBe(true);
  });
});

describe("order schemas", () => {
  it("accepts enum values the app has never seen", () => {
    const [row] = listFor(MONTH).results;
    const wire = { ...(mockGet(`orders/${row?.id}/`) as object), status: "on_hold", source: "telegram_bot" };

    expect(parseJson(orderDetailSchema, wire).status).toBe("on_hold");
  });

  it("rejects an order without its number", () => {
    expect(orderDetailSchema.safeParse({ id: "x", status: "pending" }).success).toBe(false);
  });
});

/* ---------- qoidalar ---------- */

const row = (key: string, count: number): BreakdownRow => ({
  key,
  label: key,
  count,
  amount: 0,
  sharePct: 0,
  delivered: 0,
  cancelled: 0,
  previousCount: null,
});

describe("trendSeries", () => {
  it("keeps only the count series, with status colours for delivered and cancelled", () => {
    const series = trendSeries(trendFor(MONTH).series);

    expect(series.map((item) => item.key)).toEqual(["created", "delivered", "cancelled"]);
    expect(series.map((item) => item.color)).toEqual([
      "var(--series-1)",
      "var(--order-delivered)",
      "var(--order-cancelled)",
    ]);
  });
});

describe("breakdown rules", () => {
  const reasons = breakdownFor("cancel_reason", MONTH);

  it("keeps the six biggest cancel reasons and folds the rest into one row", () => {
    const { head, restCount } = collapseTail(reasons, 6);

    expect(head.map((reason) => reason.key)).toEqual([
      "client_refused",
      "no_answer",
      "client_request",
      "wrong_address",
      "duplicate",
      "payment_failed",
    ]);
    expect(restCount).toBe(42);
  });

  it("does not fold when only one row would be hidden", () => {
    const rows = [row("a", 5), row("b", 3), row("c", 1)];

    expect(collapseTail(rows, 2)).toEqual({ head: rows, restCount: 0 });
  });

  it("counts cancellations the clients made themselves in the app", () => {
    expect(clientCancellations(reasons)).toEqual({ staff: 9, product: 8, total: 17 });
    expect(clientCancellations([row("no_answer", 4)])).toEqual({ staff: 0, product: 0, total: 0 });
  });

  it("names the three busiest regions", () => {
    expect(topRows(breakdownFor("region", MONTH), 3).map((region) => region.key)).toEqual([
      "toshkent_shahar",
      "toshkent",
      "samarqand",
    ]);
  });

  it("keeps a confirmation channel's colour stable and gives unknown ones the next free colours", () => {
    expect(confirmationColorIndex("phone", 4)).toBe(1);
    expect(confirmationColorIndex("telegram", 0)).toBe(5);
  });
});

describe("stageMeter", () => {
  it("puts the target at two thirds and flags a slower median", () => {
    expect(stageMeter(110, 120)).toEqual({ value: (110 / 180) * 100, marker: 100 / 1.5, isOver: false });
    expect(stageMeter(220, 180).isOver).toBe(true);
  });

  it("never overflows the track and survives a missing target", () => {
    expect(stageMeter(900, 120).value).toBe(100);
    expect(stageMeter(50, 0).value).toBe(0);
  });
});

describe("heatmap rules", () => {
  it("folds hours into two-hour buckets per weekday without losing orders", () => {
    const cells = heatmapFor(MONTH);
    const grid = heatmapGrid(cells);

    expect(grid.map((day) => day.weekday)).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
    expect(grid.every((day) => day.buckets.length === 12)).toBe(true);
    expect(sum(grid.flatMap((day) => day.buckets))).toBe(3860);
  });

  it("ignores cells outside the week or the day", () => {
    const grid = heatmapGrid([
      { weekday: 1, hour: 3, count: 2 },
      { weekday: 9, hour: 3, count: 5 },
      { weekday: 1, hour: 30, count: 5 },
    ]);

    expect(sum(grid.flatMap((day) => day.buckets))).toBe(2);
    expect(grid[0]?.buckets[1]).toBe(2);
  });

  it("labels buckets by their hour range", () => {
    expect(bucketRange(0)).toBe("00:00–02:00");
    expect(bucketRange(11)).toBe("22:00–24:00");
    expect(bucketLabels().slice(0, 4)).toEqual(["00", "", "04", ""]);
  });
});

describe("stuck order rules", () => {
  it("puts the longest-waiting order first", () => {
    expect(oldestFirst(stuckFor(MONTH).results).map((order) => order.hoursInStatus)).toEqual([
      71, 58, 52, 9, 6,
    ]);
  });

  it("says who is holding the order", () => {
    expect(stuckHolder({ status: "shipping", operator: "Op", courier: "Kuryer" })).toEqual({
      kind: "person",
      name: "Kuryer",
    });
    expect(stuckHolder({ status: "pending", operator: "Op", courier: null })).toEqual({
      kind: "person",
      name: "Op",
    });
    expect(stuckHolder({ status: "confirmed", operator: "Op", courier: null })).toEqual({
      kind: "no_courier",
    });
    expect(stuckHolder({ status: "pending", operator: null, courier: null })).toEqual({ kind: "nobody" });
  });
});

describe("order card rules", () => {
  it("treats an unknown payment status as neutral, not as paid", () => {
    expect(paymentTone("paid")).toBe("good");
    expect(paymentTone("cod_pending")).toBe("warn");
    expect(paymentTone("chargeback")).toBe("neutral");
  });

  it("shows the pending reason unless the payment badge already says it", () => {
    const payment = { method: null, status: "not_selected", paidAmount: 0 };

    expect(
      pendingReasonToShow({ status: "pending", pendingReason: "awaiting_client_confirmation", payment }),
    ).toBe("awaiting_client_confirmation");
    expect(
      pendingReasonToShow({
        status: "pending",
        pendingReason: "awaiting_online_payment",
        payment: { ...payment, status: "online_pending" },
      }),
    ).toBeNull();
    expect(
      pendingReasonToShow({ status: "confirmed", pendingReason: "awaiting_client_confirmation", payment }),
    ).toBeNull();
  });
});

describe("timeline rules", () => {
  const event = (
    id: number,
    kind: string,
    payload: Record<string, unknown> = {},
    createdAt = "2026-10-02T09:00:00Z",
  ) => ({
    id,
    kind,
    actor: { type: "system", name: null },
    payload,
    createdAt,
  });

  it("orders events newest first, later-written first within the same minute", () => {
    const events = [
      event(1, "order.created"),
      event(2, "notification.sent"),
      event(3, "order.status_changed", {}, "2026-10-02T09:30:00Z"),
    ];

    expect(newestFirst(events).map((item) => item.id)).toEqual([3, 2, 1]);
  });

  it("titles a status change by the new status, anything else by its kind", () => {
    expect(timelineTitleKeys(event(1, "order.status_changed", { to: "shipping" }))).toEqual([
      "status.shipping",
      "kinds.order_status_changed",
    ]);
    expect(timelineTitleKeys(event(1, "order.courier_assigned"))).toEqual(["kinds.order_courier_assigned"]);
  });

  it("colours a status change by its status and unknown kinds neutrally", () => {
    expect(timelineDotClass(event(1, "order.status_changed", { to: "delivered" }))).toBe(
      "bg-order-delivered",
    );
    expect(timelineDotClass(event(1, "payment.failed"))).toBe("bg-crit");
    expect(timelineDotClass(event(1, "something.new"))).toBe("bg-ink-3");
  });

  it("reads the facts worth showing from any payload shape", () => {
    expect(timelineFacts({ paymentMethod: "cash", channel: "app_slide" })).toMatchObject({
      paymentMethod: "cash",
      channel: "app_slide",
    });
    expect(timelineFacts({ method: "click", amount: 480_000 })).toMatchObject({
      paymentMethod: "click",
      amount: 480_000,
    });
    expect(timelineFacts({ courier: { fullName: "Bobur Rahimov" } }).courier).toBe("Bobur Rahimov");
    expect(timelineFacts({ reason: "", note: 42 })).toMatchObject({ reason: null, note: null });
  });
});
