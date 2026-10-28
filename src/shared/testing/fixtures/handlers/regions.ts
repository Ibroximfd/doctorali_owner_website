import { envelope, type MockContext } from "../engine";
import { mockError, type MockHandler } from "../types";

/** Hudud → [buyurtma (30 kun), yetkazilgan ulush, atkaz ulushi, chek, o'sish, qoldiq, kam SKU, kuryer, ishlayotgan, naqd]. */
const ROWS = [
  ["toshkent_shahar", 1840, 0.87, 0.08, 690_000, 12.4, 2434, 1, 9, 7, 18_400_000],
  ["toshkent", 620, 0.8, 0.12, 640_000, 4.1, 0, 0, 3, 2, 2_100_000],
  ["samarqand", 412, 0.62, 0.19, 1_370_000, 38.2, 540, 1, 6, 4, 8_200_000],
  ["fargona", 388, 0.84, 0.09, 610_000, -3.5, 990, 2, 5, 5, 4_600_000],
  ["andijon", 296, 0.71, 0.17, 590_000, 9.8, 560, 0, 3, 1, 12_600_000],
  ["buxoro", 214, 0.4, 0.42, 620_000, -12.6, 0, 0, 2, 0, 0],
  ["namangan", 316, 0.82, 0.1, 600_000, 6.3, 720, 0, 4, 3, 5_300_000],
  ["qashqadaryo", 264, 0.76, 0.14, 650_000, 8.9, 410, 1, 3, 3, 3_900_000],
  ["surxondaryo", 187, 0.69, 0.18, 580_000, 15.2, 260, 1, 2, 2, 2_700_000],
  ["xorazm", 143, 0.58, 0.24, 560_000, -4.8, 180, 2, 2, 1, 3_100_000],
  ["jizzax", 112, 0.78, 0.13, 570_000, 3.4, 0, 0, 1, 1, 900_000],
  ["navoiy", 86, 0.81, 0.11, 630_000, 2.2, 150, 0, 1, 1, 600_000],
  ["sirdaryo", 74, 0.74, 0.15, 550_000, 1.6, 0, 0, 1, 1, 450_000],
  ["qoraqalpogiston", 56, 0.46, 0.31, 540_000, -9.1, 90, 1, 1, 0, 1_200_000],
] as const;

const list = (ctx: MockContext) =>
  envelope(
    ctx,
    ROWS.map(
      ([
        region,
        orders30,
        deliveredShare,
        cancelledShare,
        check,
        growth,
        stock,
        low,
        total,
        working,
        cash,
      ]) => {
        const orders = ctx.flow(orders30);
        const delivered = Math.round(orders * deliveredShare);
        const cancelled = Math.round(orders * cancelledShare);
        const finished = delivered + cancelled;
        return {
          region,
          orders,
          delivered,
          cancelled,
          revenue: delivered * check,
          success_rate: finished > 0 ? Math.round((delivered / finished) * 1000) / 10 : null,
          growth_pct: ctx.compare === "none" ? null : growth,
          stock_units: stock,
          stock_value: stock * 1_100_000,
          low_skus: low,
          couriers_total: total,
          couriers_working: working,
          cash_on_couriers: cash,
        };
      },
    ),
  );

/** Viloyat markazlari (WGS84) — kuryerlar shu atrofida. */
const CENTER: Record<string, readonly [number, number]> = {
  toshkent_shahar: [41.31, 69.28],
  toshkent: [41.0, 69.6],
  samarqand: [39.65, 66.96],
  fargona: [40.38, 71.78],
  andijon: [40.78, 72.34],
  buxoro: [39.77, 64.42],
  namangan: [41.0, 71.67],
  qashqadaryo: [38.86, 65.79],
  surxondaryo: [37.22, 67.28],
  xorazm: [41.55, 60.63],
  jizzax: [40.12, 67.84],
  navoiy: [40.1, 65.38],
  sirdaryo: [40.49, 68.78],
  qoraqalpogiston: [42.46, 59.6],
};

const STATUSES = ["moving", "idle", "no_signal", "off_shift"] as const;
const TASKS = [
  { kind: "delivering", order_number: "DA-184011", address: "Navbahor ko'chasi 12", eta_minutes: 14 },
  { kind: "waiting", order_number: "DA-184022", address: "Bog'ishamol 4", eta_minutes: null },
  null,
  null,
] as const;

const live = (ctx: MockContext) => {
  const row = ROWS.find(([region]) => region === ctx.params.id);
  const center = CENTER[ctx.params.id ?? ""];
  if (!row || !center) return mockError(404, "region_not_found");
  const [region, , , , , , stock, low, total, , cash] = row;
  const couriers = Array.from({ length: total }, (_, index) => {
    const status = STATUSES[index % STATUSES.length] ?? "idle";
    const task = TASKS[index % TASKS.length] ?? null;
    return {
      id: 100 + index,
      full_name:
        [
          "Jasur Karimov",
          "Bekzod Toshmatov",
          "Aziz Rahimov",
          "Sherzod Qodirov",
          "Ulug'bek Sobirov",
          "Doston Nurmatov",
          "Islom Rasulov",
          "Akmal Yo'ldoshev",
          "Nodir Aliyev",
        ][index] ?? `Kuryer ${index + 1}`,
      status,
      lat: status === "off_shift" ? null : center[0] + Math.sin(index) * 0.18,
      lng: status === "off_shift" ? null : center[1] + Math.cos(index) * 0.22,
      heading: status === "moving" ? (index * 70) % 360 : null,
      speed_kmh: status === "moving" ? 34 : status === "idle" ? 0 : null,
      last_signal_at:
        status === "off_shift"
          ? null
          : new Date(ctx.now.getTime() - (status === "no_signal" ? 40 : 1) * 60_000).toISOString(),
      task: status === "moving" || status === "idle" ? task : null,
      assigned_today: 9 + index,
      delivered_today: 5 + index,
      cancelled_today: index % 2,
      cash_on_hand: index === 0 ? Math.round(cash * 0.6) : Math.round((cash * 0.4) / Math.max(1, total - 1)),
      cash_since: new Date(ctx.now.getTime() - (index === 0 ? 30 : 3) * 3_600_000).toISOString(),
    };
  });
  return envelope(ctx, {
    region,
    summary: {
      orders_today: 46,
      delivered_today: 21,
      in_transit: 17,
      pending: 8,
      stuck: low > 0 ? 3 : 0,
      cash_on_couriers: couriers.reduce((sum, courier) => sum + courier.cash_on_hand, 0),
      stock_units: stock,
      stock_value: stock * 1_100_000,
      low_skus: low,
    },
    warehouses:
      stock > 0
        ? [
            {
              id: 1,
              name: `${region === "toshkent_shahar" ? "Toshkent markaziy" : "Viloyat ombori"}`,
              lat: center[0] + 0.03,
              lng: center[1] - 0.04,
              status: low > 0 ? "low" : "ok",
              keeper: "Sardor Aliyev",
              stock_units: stock,
              stock_value: stock * 1_100_000,
              products: [
                {
                  name: "Mehrigiyo balzami",
                  qty: Math.round(stock * 0.2),
                  status: low > 0 ? "critical" : "ok",
                  days_of_cover: low > 0 ? 2.7 : 18.7,
                },
                { name: "Shifobaxsh choy", qty: Math.round(stock * 0.8), status: "ok", days_of_cover: 37.4 },
              ],
            },
          ]
        : [],
    couriers,
    orders: { pending: 8, confirmed: 5, shipping: 17, delivered: 21, cancelled: 4 },
  });
};

export const regionsHandlers: MockHandler[] = [
  { method: "GET", path: "regions/", resolve: list },
  { method: "GET", path: "regions/:id/live/", resolve: live },
];
