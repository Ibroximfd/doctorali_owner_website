import { envelope, sparkline, type MockContext } from "../engine";
import { sample } from "../sample";
import { mockError, type MockHandler } from "../types";

const { app, kpi } = sample;

/**
 * Ilova ko'rsatkichlari filialga bog'lanmagan (`fact_app_daily` da filial
 * o'lchovi yo'q): davr bo'yicha masshtablanadi, filial filtri ta'sir qilmaydi.
 * Voronkalar esa buyurtmalardan olinadi — ular `ctx.flow` bilan (davr × filial).
 */
const periodFlow = (ctx: MockContext, base30d: number): number =>
  Math.max(0, Math.round(base30d * ctx.period.scale));

const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

const isHourly = (ctx: MockContext): boolean => ctx.period.granularity === "hour";

const summary = (ctx: MockContext) =>
  envelope(ctx, {
    users_total: ctx.metric(app.usersTotal, 5.0, "count"),
    new_users: ctx.metric(periodFlow(ctx, app.newUsers), 8.3, "count"),
    // "Umumiy" dagi `app_active_users` bilan bir xil: bir kunlik davrda — DAU, aks holda davr ichidagi faollar.
    active_users: ctx.metric(isHourly(ctx) ? kpi.appDau : kpi.appActive, 6.7, "count"),
    avg_daily_active_users: kpi.appDau,
    app_order_share: ctx.metric(app.orderShare, 2.1, "pct"),
    consultations: ctx.metric(periodFlow(ctx, app.consultations.created), 4.9, "count"),
    push_enabled_rate: ctx.metric(app.pushEnabledRate, -0.6, "pct"),
    sparklines: {
      users_total: sparkline(121, 0.4),
      new_users: sparkline(122),
      active_users: sparkline(123, 0.3),
      app_order_share: sparkline(124, 0.2),
      consultations: sparkline(125),
      push_enabled_rate: sparkline(126, -0.1),
    },
  });

/** Soatlik kesimda bir kishi bir necha soatda faol bo'ladi — soatlar yig'indisi DAU dan katta. */
const HOURLY_OVERLAP = 1.5;

const timeseries = (ctx: MockContext) => {
  const metric = ctx.searchParams.get("metric");
  // Kunlik va undan yirik kesimda har nuqta — o'sha davrning (o'rtacha) kunlik faol foydalanuvchilari.
  const activeTotal = isHourly(ctx)
    ? kpi.appDau * HOURLY_OVERLAP * ctx.period.scale * 30
    : kpi.appDau * ctx.period.labels.length;
  const series = [
    { key: "active_users", values: ctx.series(activeTotal, 131, 0.22) },
    { key: "new_users", values: ctx.series(periodFlow(ctx, app.newUsers), 132, 0.25) },
  ].filter((item) => metric === null || item.key === metric);

  if (series.length === 0) return mockError(400, "invalid_metric");
  return envelope(ctx, { labels: ctx.period.labels, series, compare: null });
};

const usersByShare = (sharePct: number): number => Math.round((app.usersTotal * sharePct) / 100);

/** Hozirgi holat (davrga bog'liq emas): platformalar yig'indisi `users_total` ga teng. */
const devices = (ctx: MockContext) =>
  envelope(ctx, {
    platform: app.platforms.map((row) => ({
      key: row.key,
      users: row.users,
      share_pct: pct(row.users, app.usersTotal),
    })),
    versions: app.versions.map((row) => ({
      version: row.version,
      users: usersByShare(row.share),
      share_pct: row.share,
      is_latest: row.isLatest,
    })),
    langs: app.langs.map((row) => ({ key: row.key, users: usersByShare(row.share), share_pct: row.share })),
    markets: app.markets.map((row) => ({
      key: row.key,
      users: usersByShare(row.share),
      share_pct: row.share,
    })),
  });

const TOP_DOCTORS = 5;

const consultations = (ctx: MockContext) => {
  const base = app.consultations;
  const reasons = app.consultationCancelReasons.map((reason) => ({
    key: reason.key,
    count: periodFlow(ctx, reason.count),
  }));
  // Sabablar alohida yaxlitlanadi — jami ularning yig'indisi bo'lib qolishi uchun shu yerda qo'shiladi.
  const cancelled = reasons.reduce((sum, reason) => sum + reason.count, 0);

  return envelope(ctx, {
    created: periodFlow(ctx, base.created),
    paid: periodFlow(ctx, base.paid),
    completed: periodFlow(ctx, base.completed),
    cancelled,
    revenue: periodFlow(ctx, base.revenue),
    avg_rating: base.avgRating,
    rating_count: periodFlow(ctx, base.ratingCount),
    cancel_reasons: reasons.map((reason) => ({ ...reason, share_pct: pct(reason.count, cancelled) })),
    top_doctors: [...sample.doctors]
      .sort((first, second) => second.online - first.online)
      .slice(0, TOP_DOCTORS)
      .map((doctor) => ({
        id: doctor.id,
        full_name: doctor.name,
        consultations: periodFlow(ctx, doctor.online),
        rating_avg: doctor.rating,
      })),
  });
};

const engagement = (ctx: MockContext) => {
  const { engagement: base, engagementDeltas: deltas } = app;
  return envelope(ctx, {
    ai_doctor_conversations: ctx.metric(
      periodFlow(ctx, base.aiDoctorConversations),
      deltas.aiDoctorConversations,
      "count",
    ),
    health_active_users: ctx.metric(
      periodFlow(ctx, base.healthActiveUsers),
      deltas.healthActiveUsers,
      "count",
    ),
    stream_viewers: ctx.metric(periodFlow(ctx, base.streamViewers), deltas.streamViewers, "count"),
    food_scans: ctx.metric(periodFlow(ctx, base.foodScans), deltas.foodScans, "count"),
    med_reminders_active: ctx.metric(
      periodFlow(ctx, base.medRemindersActive),
      deltas.medRemindersActive,
      "count",
    ),
    referrals: ctx.metric(periodFlow(ctx, base.referrals), deltas.referrals, "count"),
  });
};

const loyalty = (ctx: MockContext) =>
  envelope(ctx, {
    points_issued: periodFlow(ctx, app.loyalty.pointsIssued),
    points_spent: periodFlow(ctx, app.loyalty.pointsSpent),
    points_expired: periodFlow(ctx, app.loyalty.pointsExpired),
    // Hamyon qoldig'i — hozirgi holat; so'mdagi qiymati "Moliya" dagi keshbek majburiyati bilan bir xil.
    wallet_balance_total: app.loyalty.walletBalanceTotal,
    wallet_balance_uzs: sample.liabilities.cashbackUzs,
    gifts_earned: periodFlow(ctx, app.loyalty.giftsEarned),
    gifts_delivered: periodFlow(ctx, app.loyalty.giftsDelivered),
  });

const doctorApp = (ctx: MockContext) =>
  envelope(ctx, {
    active_doctors: app.doctorApp.activeDoctors,
    orders_created: periodFlow(ctx, app.doctorApp.ordersCreated),
    orders_amount: periodFlow(ctx, app.doctorApp.ordersAmount),
    consultations_completed: periodFlow(ctx, app.doctorApp.consultationsCompleted),
  });

const appFunnels = (ctx: MockContext) => {
  const { confirm, cancel } = sample.appFunnels;
  // "Qoldi" — ayirma sifatida: ushlab qolish ekranini ko'rganlar = qolganlar + davom etganlar (yaxlitlashdan keyin ham).
  const seenRetention = ctx.flow(cancel.step2Seen);
  const continued = ctx.flow(cancel.step3);

  return envelope(ctx, {
    confirm: {
      push_sent: ctx.flow(confirm.pushSent),
      opened: ctx.flow(confirm.opened),
      slid: ctx.flow(confirm.slid),
      payment_selected: ctx.flow(confirm.paymentSelected),
      confirmed: ctx.flow(confirm.confirmed),
    },
    cancel: {
      step1: ctx.flow(cancel.step1),
      step2_kept: seenRetention - continued,
      step2_continued: continued,
      step3_cancelled: ctx.flow(cancel.cancelled),
    },
  });
};

/** `mobile-app` bo'limi namunalari (`02_BACKEND_TZ` §4.8 + §4.3 dagi `orders/app-funnels/`). */
export const mobileAppHandlers: MockHandler[] = [
  { method: "GET", path: "app/summary/", resolve: summary },
  { method: "GET", path: "app/timeseries/", resolve: timeseries },
  { method: "GET", path: "app/devices/", resolve: devices },
  { method: "GET", path: "app/consultations/", resolve: consultations },
  { method: "GET", path: "app/engagement/", resolve: engagement },
  { method: "GET", path: "app/loyalty/", resolve: loyalty },
  { method: "GET", path: "app/doctor-app/", resolve: doctorApp },
  { method: "GET", path: "orders/app-funnels/", resolve: appFunnels },
];
