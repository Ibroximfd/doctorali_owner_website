import type { MockContext } from "../engine";
import type { MockHandler } from "../types";

const ago = (ctx: MockContext, minutes: number) =>
  new Date(ctx.now.getTime() - minutes * 60_000).toISOString();

const health = (ctx: MockContext) => ({
  status: "degraded",
  checked_at: ago(ctx, 0.5),
  uptime_pct_30d: 99.82,
  components: [
    ["database", "ok", 12, null, null],
    ["api", "ok", 84, null, null],
    ["queue", "ok", null, 4, null],
    ["bitrix", "degraded", 2400, 540, "Javob 5 soniyadan oshdi"],
    ["marketplace_erp", "ok", 310, 120, null],
    ["telegram", "ok", 140, null, null],
    ["sms", "down", null, null, "Provayder 503 qaytardi"],
    ["payments", "ok", 220, null, null],
  ].map(([key, status, latency, lag, error]) => ({
    key,
    status,
    latency_ms: latency,
    lag_seconds: lag,
    last_success_at: status === "down" ? ago(ctx, 95) : ago(ctx, 1),
    last_error: error,
  })),
});

const sync = (ctx: MockContext) => ({
  sources: [
    {
      source: "bitrix",
      last_run_at: ago(ctx, 5),
      status: "ok",
      imported: 132,
      failed: 2,
      next_run_at: ago(ctx, -5),
    },
    {
      source: "marketplace_erp",
      last_run_at: ago(ctx, 3),
      status: "ok",
      imported: 418,
      failed: 0,
      next_run_at: ago(ctx, -2),
    },
  ],
  errors: [
    {
      id: 9,
      source: "bitrix",
      at: ago(ctx, 6),
      entity_ref: "DEAL-48211",
      message: "Telefon raqami noto'g'ri",
    },
  ],
});

const audit = (ctx: MockContext) => ({
  count: 2,
  results: [
    {
      id: 2,
      at: ago(ctx, 10),
      actor: "Boshliq",
      action: "notify",
      entity: "issue:501",
      summary: "Sardor Aliyevga Telegram orqali xabar",
    },
    {
      id: 1,
      at: ago(ctx, 60),
      actor: "Sardor Aliyev",
      action: "login",
      entity: "session",
      summary: "Panelga kirdi",
    },
  ],
});

export const systemHandlers: MockHandler[] = [
  { method: "GET", path: "system/health/", resolve: health },
  { method: "GET", path: "system/sync/", resolve: sync },
  { method: "GET", path: "system/audit/", resolve: audit },
];
