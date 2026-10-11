# 02 — BACKEND TZ: boshliq paneli uchun `owner` roli va `/api/owner/*`

Sana: 2026-10-02. Kim uchun: **backend jamoasi (Django)**. Asos: `01_CONCEPT.md` (bo'limlar, metrikalar lug'ati §6, signallar §5).
Mavjud endpointlar **o'zgarmaydi** — bu hujjat faqat **yangi** narsalarni so'raydi. Mavjud nom/enumlar (`status`, `payment.method`, `source`, `region`, `created_by.kind`, timeline `kind`) platforma shartnomasidagidek ishlatiladi.

Ustuvorlik: **P0** — panel ishlashi uchun shart · **P1** — 1-reliz ichida · **P2** — keyingi bosqich.


> **Ulash uchun boshlang'ich hujjat — [`BACKEND_HANDOFF.md`](BACKEND_HANDOFF.md)** (auth, umumiy qoidalar, yozuvchi so'rovlar, xatolar, tekshirgich, ulash tartibi). Barcha endpointlar: [`ENDPOINTS.md`](ENDPOINTS.md).
---

## 1. Rol va kirish (P0)

### 1.1 `owner` roli
- Yangi rol `owner`: **filialga bog'lanmagan**, faqat `/api/owner/*` va `/ws/owner/` ga kiradi. `/operator/*`, `/reception/*`, `/operator/logist/*` → `403 owner_scope_only`.
- Barcha `/api/owner/*` — **GET** (istisno: §9 sozlamalar, §8 signal `ack`, §10 eksport so'rovi). Boshqa rollar bu prefiksga → `403 owner_only`.
- `owner_viewer` (P2): `sections: ["finance", …]` va `filials: [1,2]` cheklovi bilan; ruxsat yo'q bo'lim → `403 section_forbidden`; `mask_pii=true` bo'lsa telefonlar `+998 90 *** ** 67`.

### 1.2 Auth
| Endpoint | Tavsif |
|---|---|
| `POST /api/owner/login/ {username, password}` | → `{challenge_id, method:"sms"\|"totp", phone_masked}` (parol to'g'ri bo'lsa 2-bosqich majburiy) |
| `POST /api/owner/login/verify/ {challenge_id, code}` | → `{access, refresh, user:{id, full_name, role, sections, filials, mask_pii}}` |
| `POST /api/user/refresh/ {refresh}` | mavjud |
| `GET /api/owner/me/` | profil + ruxsatlar |
| `GET /api/owner/sessions/` · `DELETE /api/owner/sessions/{id}/` | faol qurilmalar, sessiyani uzish |
| `POST /api/owner/logout/` | refresh tokenni bekor qilish |
| `POST /api/owner/ws-ticket/` | → `{ticket, expires_in: 60}` — WebSocket uchun bir martalik qisqa token (§5); access token URL ga qo'yilmaydi |

Qoidalar: access 15 daqiqa, refresh 14 kun (rotatsiya); 5 xato urinish → 15 daqiqa blok (`429 login_locked`); har kirish `OwnerAuditLog(user, ip, user_agent, action, at)` ga yoziladi.

## 2. Umumiy shartnoma (barcha `/api/owner/*` uchun) (P0)

### 2.1 So'rov parametrlari
| Param | Qiymat | Default |
|---|---|---|
| `period` | `today · yesterday · 7d · 30d · month · prev_month · year · custom` | `today` |
| `date_from`, `date_to` | `YYYY-MM-DD` (`period=custom` da majburiy, ikkalasi ham kiradi) | — |
| `filial` | id, vergul bilan bir nechta (`1,3`); yo'q = barchasi | barchasi |
| `compare` | `previous` (xuddi shu uzunlikdagi oldingi davr) · `yoy` · `none` | `previous` |
| `granularity` | `hour · day · week · month` (timeseries uchun) | davrga qarab avtomatik |
| `page`, `page_size`, `ordering`, `search` | ro'yxatlar uchun | 1 / 25 |

Vaqt mintaqasi har doim `Asia/Tashkent`; davr chegaralari serverda hisoblanadi.

### 2.2 Javob konverti
```jsonc
{
  "period":  {"from": "2026-10-01", "to": "2026-10-02", "granularity": "day", "label": "today"},
  "compare": {"from": "2026-09-30", "to": "2026-10-01"} | null,
  "filials": [1, 2, 3],
  "generated_at": "2026-10-02T14:05:12+05:00",
  "freshness": {"orders": "2026-10-02T14:05:00+05:00", "clinic": "2026-10-02T14:04:30+05:00", "app": "2026-10-02T03:00:00+05:00"},
  "data": { … }
}
```

### 2.3 Metrika shakli (hamma joyda bir xil)
```jsonc
{"value": 284600000, "previous": 251300000, "delta_pct": 13.3, "unit": "uzs" | "count" | "pct" | "min"}
```
`previous`/`delta_pct` — `compare=none` da `null`. `previous = 0` bo'lsa `delta_pct = null`. Pul — so'm, **butun son** (string emas). Foizlar — 1 kasr.

### 2.4 Xatolar
`{"code": "…", "detail": "…"}`: `owner_only` · `section_forbidden` · `invalid_period` · `filial_not_found` · `range_too_large` (granularity=hour va davr > 7 kun) · `export_not_ready`.

### 2.5 Ishlash talablari
- p95 < **500 ms** (agregat jadvaldan), ro'yxatlar < 800 ms.
- Kesh: Redis, kalit = endpoint + parametrlar; `period` bugunni qamrasa TTL 60 s, tarixiy davr — 1 soat.
- `ETag`/`If-None-Match` qo'llab-quvvatlanadi (frontend 60 s da qayta so'raydi).

## 3. Agregat qatlam (P0) — tavsiya etilgan yechim

Har so'rovda jonli jadvallardan hisoblash og'ir. Kunlik fakt jadvallar (Celery beat; bugungi kun har 60 s, kecha va undan oldingi 03:00 da qayta hisoblanadi; tuzatish kiritilsa o'sha kun `dirty` bo'lib qayta hisoblanadi):

| Jadval | O'lchovlar (dimension) | Ko'rsatkichlar |
|---|---|---|
| `fact_order_daily` | date, filial, source, created_by_kind, region, status, payment_method | count, total_amount, payable_amount, points_discount |
| `fact_order_flow_daily` | date, filial | created, confirmed, shipped, delivered, cancelled (o'sha kuni shu holatga **o'tganlar**), `t_confirm_p50/avg`, `t_ship_p50/avg`, `t_deliver_p50/avg` (daqiqa) |
| `fact_order_hourly` | date, hour, filial | created, delivered |
| `fact_cancel_daily` | date, filial, cancel_reason, cancelled_by_type | count, amount |
| `fact_clinic_daily` | date, filial | orders_revenue, treatments_revenue, consultations_revenue, collected{cash,card,terminal}, expenses_by_category, debt_issued, debt_collected, visits{scheduled,arrived,no_show,cancelled}, new_clients, returning_clients |
| `fact_courier_daily` | date, filial, courier | assigned, delivered, cancelled, attempts, avg_minutes, cod_collected, cod_settled |
| `fact_operator_daily` | date, filial, operator | leads_new, leads_converted, orders_created, orders_delivered, sales_amount, commission_earned, commission_paid, calls_out, calls_in, calls_missed, calls_missed_handled, activities_overdue |
| `fact_lead_daily` | date, filial, source, status | count |
| `fact_app_daily` | date, platform, app_version, lang, market | new_users, active_users, push_enabled |
| `fact_product_daily` | date, filial, product, channel (`delivery`/`clinic`) | units, revenue, gift_units |
| `fact_consultation_daily` | date, doctor | created, paid, completed, cancelled, revenue, refunds, rating_sum, rating_count |

Yangi manba jadvali: **`UserDailyActivity(user, date, platform, app_version)`** — unique (user, date); `POST /user/refresh/` yoki istalgan autentifikatsiyalangan so'rovda kuniga bir marta `get_or_create` (ilovada o'zgarish talab qilinmaydi).

## 4. Endpointlar

### 4.1 Meta (P0)
`GET /api/owner/meta/` →
```jsonc
{"filials": [{"id":1,"name":"Toshkent","region":"toshkent_shahar","is_main":true,"has_clinic":true,"has_sales":true}],
 "regions": [{"code":"samarqand","name":"Samarqand viloyati"}],
 "order_sources": [...], "payment_methods": [...], "cancel_reasons": [...], "lead_sources": [...],
 "expense_categories": [...], "first_data_date": "2024-03-01", "currency": "UZS"}
```

### 4.2 Umumiy (P0)
`GET /api/owner/overview/` → `data`:
```jsonc
{
  "revenue": {"total": Metric, "delivery": Metric, "clinic": Metric, "consultation": Metric},
  "plan": {"month": "2026-10", "target": 2400000000, "actual": 152300000, "pct": 6.3, "expected_pct": 6.5} | null,
  "kpis": {"orders": Metric, "delivered": Metric, "delivery_rate": Metric, "avg_check": Metric,
           "clinic_visits": Metric, "new_customers": Metric, "app_active_users": Metric},
  "sparklines": {"orders": [..14 nuqta..], "revenue": [...], "clinic_visits": [...], "new_customers": [...], "app_active_users": [...], "avg_check": [...]},
  "pipeline_now": [{"status":"pending","count":41,"amount":26800000,"stale_count":7}, …5 ta…],   // hozirgi holat (davrdan mustaqil)
  "cash_position": {"clinic_tills": 18400000, "courier_cod": 9400000, "online_received": 12700000, "open_debt": 31200000, "overdue_debt": 8600000},
  "alerts": {"open_total": 9, "critical": 2, "serious": 4, "top": [Alert, … 5 ta]},
  "filials": [{"id":1,"name":"Toshkent","revenue":Metric,"orders":182,"delivery_rate":86.4,"clinic_revenue":41200000,"open_debt":18600000,"courier_cod":5200000}]
}
```
`GET /api/owner/overview/timeseries/?metric=revenue&split=channel` → `{"labels":["2026-09-03",…], "series":[{"key":"delivery","values":[…]},{"key":"clinic",…},{"key":"consultation",…}], "compare":[…]|null}`.

### 4.3 Buyurtmalar (P0)
| Endpoint | `data` |
|---|---|
| `GET /orders/summary/` | `{orders, confirmed_rate, delivered, delivery_rate, cancel_rate, avg_check, avg_delivery_minutes}` — hammasi `Metric` |
| `GET /orders/funnel/` | davrda yaratilgan buyurtmalar kogortasi: `[{status, count, amount, pct_of_created}]` + `transitions:{pending_to_confirmed, confirmed_to_shipping, shipping_to_delivered}` (%) |
| `GET /orders/timeseries/` | `series`: `created`, `delivered`, `cancelled` (soni) + `delivered_amount` |
| `GET /orders/breakdown/?by=` | `by ∈ source · created_by_kind · region · filial · payment_method · confirmation_channel · cancel_reason · cancelled_by` → `[{key, label, count, amount, share_pct, delivered, cancelled, previous_count}]` |
| `GET /orders/stage-durations/` | `[{stage:"created_to_confirmed", p50_min, avg_min, p90_min, target_min, previous_p50_min}]` (3 bosqich) |
| `GET /orders/heatmap/` | `[{weekday:1..7, hour:0..23, count}]` — yaratilgan buyurtmalar |
| `GET /orders/stuck/` | qoidadan oshib turganlar: `[{id, order_number, status, since, hours_in_status, amount, filial, operator, courier, lead_name, rule}]` |
| `GET /orders/` | ro'yxat; filtrlar: `status`, `source`, `region`, `payment_method`, `payment_status`, `operator`, `courier`, `has_app`, `min_amount`, `search` (raqam/telefon/ism). Qator: platforma `Order` modelining qisqa shakli |
| `GET /orders/{id}/` | to'liq `Order` (platforma `02` §5) + `timeline[]` (§6) — **faqat o'qish** |
| `GET /orders/app-funnels/` (P1) | `confirm:{push_sent, opened, slid, payment_selected, confirmed}` · `cancel:{step1, step2_kept, step2_continued, step3_cancelled}` (`order.cancel_flow_step` dan) |

### 4.4 Moliya (P0)
| Endpoint | `data` |
|---|---|
| `GET /finance/summary/` | `{revenue, collected, expenses, net_cash, refunds}` (`Metric`) + `by_channel` |
| `GET /finance/cashflow/` | timeseries: `inflow`, `outflow`, `net` |
| `GET /finance/cash-position/` | hozirgi holat: `clinic_tills:[{filial, cash, card, terminal, closed_today}]`, `courier_cod:[{courier, filial, amount, oldest_at, orders}]`, `online:{click, payme, pending}`, `debts:{open, overdue, due_week}` |
| `GET /finance/payment-mix/` | `[{method: cash\|click\|payme\|card\|terminal, amount, count, share_pct}]` (yetkazib berish + klinika birlashtirilgan, `channel` bo'yicha ham) |
| `GET /finance/expenses/` | `{total: Metric, by_category:[{category, amount, share_pct, previous}], by_filial:[…]}` |
| `GET /finance/liabilities/` | `{operator_commission_pending, doctor_payouts_outstanding, cashback_points:{points, uzs_equivalent, expiring_this_month}, gifts:{count, cost_estimate}}` |
| `GET /finance/returns/` | `{count, refund_amount, by_reason:[…], list:[…]}` |
| `GET /finance/debts/` | `{aging:[{bucket:"0-7"\|"8-30"\|"31+", amount, count}], top_debtors:[{client, phone, filial, remaining, overdue_days}], collected: Metric, issued: Metric}` |
| `GET /finance/daily-closings/` | `[{date, filial, status: closed\|open\|reopened, expected_cash, counted_cash, difference, closed_by, closed_at}]` |

### 4.5 Klinika (P0)
| Endpoint | `data` |
|---|---|
| `GET /clinic/summary/` | `{revenue, visits_arrived, no_show_rate, treatments, consultations, avg_check, new_clients, returning_clients}` + `revenue_mix:{products, treatments, consultations}` + `visits:{scheduled, arrived, no_show, cancelled}` + `visit_purposes:[…]` |
| `GET /clinic/timeseries/` | `products`, `treatments`, `consultations` (tushum) yoki `metric=visits` |
| `GET /clinic/branches/` | filial bo'yicha qatorlar (yuqoridagi ko'rsatkichlar + `tills`, `open_debt`, `stock_value`, `closing_status`, `attendance_rate`) |
| `GET /clinic/doctors/` | `[{doctor, specialty, filial, visits, treatments_revenue, sales_revenue, commission_earned, payout_outstanding}]` |
| `GET /clinic/warehouse/` | `{stock_value, sku_count, low:[{product, quantity, min_quantity, filial}], out:[…], received_month, written_off_month, last_count:{date, shortage, surplus}}` |
| `GET /clinic/attendance/` | `{rate, by_employee:[{employee, position, present, absent}]}` (P1) |

### 4.6 Yetkazib berish (P0)
| Endpoint | `data` |
|---|---|
| `GET /logistics/summary/` | `{in_transit_now, delivered, success_rate, avg_delivery_minutes, attempts, cod_unsettled, unassigned_now, late_now}` |
| `GET /logistics/couriers/` | `[{id, full_name, filial, is_active, assigned, delivered, cancelled, success_rate, avg_minutes, attempts, cod_collected, cod_unsettled, oldest_unsettled_at}]` |
| `GET /logistics/timeseries/` | `delivered`, `cancelled`, `attempts` |
| `GET /logistics/regions/` | `[{region, orders, delivered, avg_minutes, success_rate}]` |
| `GET /logistics/attempt-reasons/` | `[{reason, count, share_pct}]` |
| `GET /logistics/transfers/` | `[{id, number, from_filial, to_filial, status, items_count, created_at}]` + sanoq |

### 4.7 Sotuv jamoasi (P0/P1)
| Endpoint | `data` |
|---|---|
| `GET /sales/summary/` | `{leads, conversion, sales_amount, calls_total, calls_missed_unhandled, activities_overdue, avg_rating}` |
| `GET /sales/filials/` | **operator jamoalari filial kesimida** — `[{id, name, admin_name, operators_total, operators_online, leads, conversion_pct, orders_delivered, sales_amount: Metric, sales_per_operator, commission_earned, calls, missed_unhandled, activities_overdue, rating_avg, rating_count, plan:{target, actual, pct}\|null}]`; `filial` filtri **qo'llanmaydi** (§12.5) |
| `GET /sales/filials/timeseries/` | operatorlar sotuvi vaqt qatori, har seriya — bitta filial: `series:[{key:"<filial_id>", values}]` (§12.5) |
| `GET /sales/operators/` | `[{id, full_name, filial, is_online, leads, conversion_pct, orders_created, orders_delivered, sales_amount, commission_earned, commission_pending, calls, missed_unhandled, activities_overdue, rating_avg, rating_count}]` |
| `GET /sales/operators/{id}/` | bitta operator: yuqoridagilar + kunlik trend + lid statuslari |
| `GET /sales/leads-funnel/` | `[{status_id, name, kind, count, share_pct}]` |
| `GET /sales/lead-sources/` | `[{source, leads, converted, conversion_pct, sales_amount}]` |
| `GET /sales/calls/` (P1) | timeseries `answered`, `missed`; `avg_duration_sec`; `missed_reasons:[…]` |
| `GET /sales/ratings/` (P1) | `{avg, count, distribution:{1..5}, low:[{stars, comment, operator, client, at}]}` |

### 4.8 Mobil ilova (P1)
| Endpoint | `data` |
|---|---|
| `GET /app/summary/` | `{users_total, new_users, active_users, app_order_share, consultations, push_enabled_rate}` |
| `GET /app/timeseries/` | `new_users`, `active_users` |
| `GET /app/devices/` | `platform:[{key: ios\|android, users, share_pct}]`, `versions:[{version, users, share_pct, is_latest}]`, `langs:[…]`, `markets:[…]` |
| `GET /app/consultations/` | `{created, paid, completed, cancelled, revenue, avg_rating, cancel_reasons:[…], top_doctors:[…]}` |
| `GET /app/engagement/` | `{ai_doctor_conversations, health_active_users, stream_viewers, food_scans, med_reminders_active, referrals}` (har biri `Metric`; mavjud bo'lmagani `null` — UI «ma'lumot yo'q» ko'rsatadi) |
| `GET /app/loyalty/` | `{points_issued, points_spent, points_expired, wallet_balance_total, gifts_earned, gifts_delivered}` |
| `GET /app/doctor-app/` | `{active_doctors, orders_created, orders_amount, consultations_completed}` |
| `GET /app/stores/` (P2) | App Store / Google Play: yuklab olishlar, reyting, sharhlar |

### 4.9 Mahsulotlar, mijozlar, shifokorlar (P1)
| Endpoint | `data` |
|---|---|
| `GET /products/` | `[{id, name, category, units, revenue, share_pct, delivery_units, clinic_units, gift_units, stock_quantity, is_low, trend:[…]}]` + `categories:[{name, revenue, share_pct}]` |
| `GET /customers/summary/` | `{total, new, returning_rate, repeat_purchase_rate, avg_ltv, avg_orders_per_customer}` |
| `GET /customers/cohorts/` | `[{cohort:"2026-04", size, retention:[100, 38, 27, …]}]` (oylik, oxirgi 6 oy) |
| `GET /customers/top/` | `[{lead_id, full_name, phone, region, orders_count, total_spent, last_order_at, has_app}]` |
| `GET /customers/regions/` | `[{region, customers, revenue}]` |
| `GET /doctors/` | `[{id, full_name, specialty, online_consultations, clinic_visits, orders_created, sales_amount, commission_earned, payout_outstanding, rating_avg, rating_count}]` |

## 5. Jonli lenta va WebSocket (P1)

`GET /api/owner/feed/?limit=30&before=` — muhim hodisalar (timeline dan filtrlangan): `order.created` (summa ≥ chegaradan), `order.status_changed` (delivered/cancelled), `payment.paid`, `payment.failed`, kassa yopilishi, COD topshirish, signal ochildi.
```jsonc
{"id": 991, "at": "…", "kind": "order.delivered", "filial": "Toshkent", "title": "DA-184011 yetkazildi", "amount": 760000, "actor": "Jasur K.", "ref": {"type":"order","id":"uuid"}}
```
`wss://<host>/ws/owner/?token=<ticket>` (ticket — §1.2 `ws-ticket`, 60 s, bir martalik) hodisalari: `feed_event {event}` · `kpi_tick {orders_today, revenue_today, delivered_today, in_transit_now}` (≤ har 15 s, o'zgarganda) · `pipeline_changed {pipeline_now}` · `alert_opened {alert}` · `alert_resolved {id}`. Ping/pong mavjud `/ws/operator/` dagidek.

## 6. Signallar (P0 — asosiy 6 qoida, P1 — qolgani)

- `OwnerAlertRule(code, enabled, severity, params JSON)` — default qiymatlar `01_CONCEPT` §5.
- `OwnerAlert(id, code, severity: critical|serious|moderate, status: open|acknowledged|resolved, title, body, filial, metric_value, threshold, ref{type,id}|null, opened_at, acknowledged_at, resolved_at)`.
- Tekshiruv: Celery beat har 5 daqiqada; shart yo'qolsa `resolved`. Bir xil (code, filial, ref) uchun bitta ochiq signal (dublikat yo'q).

| Endpoint | Tavsif |
|---|---|
| `GET /api/owner/alerts/?status=&severity=&code=&filial=` | ro'yxat + `counts:{open, critical, serious, moderate}` |
| `POST /api/owner/alerts/{id}/ack/` | «ko'rildi» |
| `GET /api/owner/alerts/rules/` · `PATCH /api/owner/alerts/rules/{code}/ {enabled, params}` | chegaralar |

## 7. Reja (P1)
`OwnerTarget(month, filial|null, channel: total|delivery|clinic|consultation, amount)`.
`GET /api/owner/targets/?month=` · `PUT /api/owner/targets/ {month, items:[{filial, channel, amount}]}`.

## 8. Hisobot va eksport (P1)
- `POST /api/owner/reports/export/ {report: daily|weekly|monthly_pl|operators|couriers_cod|debts|products, format: xlsx|pdf, period…, filial}` → `{job_id}`; `GET /api/owner/reports/export/{job_id}/` → `{status: pending|ready|failed, url, expires_at}` (imzolangan URL, 1 soat).
- Kunlik xulosa: `GET/PUT /api/owner/reports/digest/ {enabled, time:"21:00", channels:["telegram"], telegram_chat_id, sections:[…]}`; Celery belgilangan vaqtda `overview` + ochiq signallarni matn qilib yuboradi.

## 9. Audit va xavfsizlik (P0)
- Har `/api/owner/*` so'rovi `OwnerAuditLog` ga (endpoint, parametrlar, vaqt) — `GET /api/owner/audit/` da o'zining tarixi.
- PII: `owner_viewer.mask_pii` da telefonlar maskalanadi; eksport fayllarida ham.
- Rate limit: 120 so'rov/daq/foydalanuvchi; eksport 10/soat.
- CORS: faqat panel domeni; token faqat BFF (Next.js server) orqali yuriladi — `03_FRONTEND_TZ` §5.

## 10. Testlar (backend qabul mezoni)
1. `owner` ikkala filial ma'lumotini ko'radi; `admin`/`logist`/`operator` `/api/owner/*` ga `403`.
2. `filial=1` filtri bilan yig'indi = filial adminining mavjud `admin/statistics` natijasi (bir xil davr) — **regressiya solishtiruvi**.
3. `overview.revenue.total = delivery + clinic + consultation`; ilova buyurtmasi ikki marta sanalmaydi.
4. Davr chegaralari Toshkent vaqti bo'yicha (23:59 buyurtma — o'sha kunga).
5. `compare=previous`: 7 kunlik davr uchun oldingi 7 kun; `previous=0` → `delta_pct=null`.
6. Signal: kuryersiz tasdiqlangan buyurtma 3 soatdan oshdi → `open`; kuryer biriktirildi → `resolved`.
7. Yuk: 12 oylik ma'lumotda `overview` p95 < 500 ms.

## 11. Tartib (backend)
| Bosqich | Tarkib |
|---|---|
| **O-B0** | `owner` roli, login+2FA, `meta`, konvert/metrika shakli, `fact_order_*`, `overview`, `orders/*` (summary, funnel, timeseries, breakdown, ro'yxat, detal) |
| **O-B1** | `finance/*`, `clinic/*`, `logistics/*`, `sales/summary|operators|leads-funnel|lead-sources`, signallar (6 asosiy qoida), `feed` |
| **O-B2** | WS `/ws/owner/`, `UserDailyActivity` + `app/*`, `products`, `customers`, `doctors`, `targets`, eksport, Telegram xulosa, qolgan signal qoidalari |
| **O-B3** | `owner_viewer`, do'kon API (App Store/Play), tannarx/foyda |

Frontend backendni kutmaydi: shu hujjatdagi shakllar bo'yicha **MSW mock** bilan quriladi (`03_FRONTEND_TZ` §6). Shakl o'zgarsa — avval shu hujjat yangilanadi.

---

## 12. Frontend bilan moslashtirish — qo'shimchalar va aniqlashtirishlar (2026-10-03, yangilandi 2026-10-05)

Frontend to'liq qurildi (namuna rejimida ishlaydi). Qurish paytida shartnomada **yo'q yoki ochiq qolgan** joylar aniqlandi — quyida ro'yxat. Yuqoridagi bo'limlar bilan zid kelsa, **shu bo'lim va `docs/api-samples/` ustun**.

> **Aniq JSON shakllari:** `docs/api-samples/` — har `GET` endpoint uchun namuna javob (68 ta fayl, `npm run samples` bilan qayta yaratiladi). Frontend har javobni zod bilan tekshiradi: `src/features/<bo'lim>/model/*.schema.ts`. Sxemada yo'q qo'shimcha maydon zarar qilmaydi; sxemadagi maydon yo'q yoki turi boshqa bo'lsa — o'sha blok xato ko'rsatadi.

> **Telegram bot va mini app (2-bosqich: avval sayt, keyin bot):** PIN bilan kirish (`/api/owner/telegram/*`) va bot xabarlari shartnomasi alohida — `../doctor_ali_owner_bot/docs/02_BACKEND_TZ.md`.

### 12.1 Umumiy
- BFF backendga `X-Lang: uz|ru` yuboradi — server yaratadigan matnlar (signal `title`/`body`, lenta `title`, `region_display`) shu tilda qaytsin.
- `90 kun` preseti yo'q: frontend uni `period=custom&date_from&date_to` qilib yuboradi (o'zgarish kerak emas).
- KPI qatorlari uchun ixtiyoriy **`sparklines: {<metrika>: number[]}`** (12 nuqta, mini trend): `overview`, `orders/summary`, `finance/summary`, `clinic/summary`, `logistics/summary`, `sales/summary`, `customers/summary`, `products`, `app/summary`, `doctors/summary`. Bo'lmasa — mini grafik chizilmaydi, xolos.
- Konvertsiz (envelope siz) javoblar: `meta/`, `me/`, `feed/`, `alerts/*`, `orders/` (ro'yxat), `orders/{id}/`, `targets/`, `sessions/`, `settings/access/`, `reports/*`. Ro'yxatlar — `{count?, results: [...]}`.

### 12.2 Yangi endpointlar
| Endpoint | Javob |
|---|---|
| `POST /api/owner/ws-ticket/` | `{ticket, expires_in}` (§1.2) |
| `GET /api/owner/me/` | `{id, full_name, role, sections[], filials[], mask_pii}` |
| `GET /api/owner/customers/timeseries/` | konvert + `{labels, series:[{key:"returning"},{key:"new"}], compare}` |
| `GET /api/owner/logistics/couriers/{id}/` | kuryer qatori + `timeseries:{labels, series:[{key:"delivered"}], compare}`; yo'q → `404 courier_not_found` |
| `GET /api/owner/doctors/summary/` | `{active_doctors, online_consultations, sales_amount: Metric; payout_outstanding, doctors_waiting: number; sparklines}` |
| `GET /api/owner/settings/access/` | `{results:[{id, full_name, role, sections[], filials[], mask_pii}]}` — panelni ko'ra oladiganlar (faqat o'qish) |
| `GET /api/owner/reports/exports/` | `{results:[{job_id, report, format, date_from, date_to, filial: string\|null, status, url, expires_at, created_at}]}` — eksport tarixi |

### 12.3 Mavjud endpointlarga qo'shilgan / aniqlangan maydonlar
| Endpoint | Nima |
|---|---|
| `overview/` | `revenue_quick:{today, today_same_time_yesterday, yesterday, week, month}` (filtrdan mustaqil); `plan.previous:{month, target, actual, pct}` |
| `feed/` | `{results:[{id, at, kind, filial, title, amount, actor, ref}]}`; `kind` ∈ `order.created\|confirmed\|shipping\|delivered\|cancelled`, `clinic.payment`, `consultation.paid`, `cod.settled`, `alert.opened` (noma'lum tur neytral ko'rsatiladi) |
| `alerts/` | `{counts:{open, critical, serious, moderate}, results:[Alert]}` |
| `alerts/rules/` | `{results:[{code, enabled, severity, params:{threshold}, unit: hours\|days\|uzs\|pct\|count}]}`; `PATCH alerts/rules/{code}/ {enabled?, params?:{threshold}}` → yangilangan qoida |
| `orders/funnel/` | `{stages:[{status, count, amount, pct_of_created}], transitions:{…}, cancelled:{count, pct_of_created}, in_progress:{count, pct_of_created}}` |
| `orders/stuck/` | `{count, results:[…]}` (`count` — qoidadan oshganlarning jami) |
| `orders/` | `{count, results:[{id, order_number, status, payment{method,status}, client{full_name, phones, has_app}, source, delivery{region, region_display}, payable_amount, created_at}]}` |
| `orders/{id}/` | platforma `Order` + `source`, `items[].id`, `timeline[]`; yo'q → `404 order_not_found` |
| `orders/breakdown/` | frontend ishlatadigan `by`: `source`, `region`, `cancel_reason`, `confirmation_channel` |
| `finance/liabilities/` | `doctors_waiting` (to'lov kutayotgan shifokorlar soni) |
| `finance/daily-closings/` | `counted_cash`, `difference`, `closed_by`, `closed_at` — ochiq kun uchun `null` |
| `clinic/branches/` | qator: `{id, name, revenue, visits_arrived, no_show_rate, tills, open_debt, stock_value, closing_status, closing_difference, attendance_rate}` |
| `logistics/summary/` | `cod_unsettled_couriers` (naqd topshirmagan kuryerlar soni) |
| `logistics/transfers/` | `{count, results:[…]}` |
| `doctors/` | qatorga `filial` |
| `sales/summary/` | 7 maydon ham `Metric`; "hozirgi holat" qiymatlarida (`calls_missed_unhandled`, `activities_overdue`) `previous`/`delta_pct` = `null` |
| `sales/operators/{id}/` | ro'yxat qatori maydonlari + `trend` (timeseries, `orders_delivered`); yo'q → `404 operator_not_found` |
| `products/` | `{summary:{units, revenue, gift_units: Metric; gift_cost, stock_out, stock_low}, results:[…], categories:[…]}` |
| `customers/regions/` | `region` — hudud kodi (nomi `meta/` dan) |
| `app/summary/` | `avg_daily_active_users` |
| `app/timeseries/` | `?metric=active_users\|new_users` — har o'lchov alohida so'raladi (bitta o'qda ikki xil masshtab bo'lmasin) |
| `app/consultations/` | `rating_count` |
| `app/loyalty/` | `wallet_balance_uzs` |
| `app/devices/` | `langs`, `markets`: `[{key, users, share_pct}]` |
| `targets/` | `GET ?month=` va `PUT` javobi: `{month, items:[{filial: number\|null, channel, amount}]}` |
| `sessions/` | `{results:[{id, device, browser, location, last_seen_at, is_current}]}` |
| `reports/export/` | so'rov: `{report, format, period, date_from?, date_to?, filial?: "1,3"}`; yo'q → `404 export_not_found` |
| `reports/digest/` | javobga `preview:{date, revenue, revenue_delta_pct, orders, delivered, cancelled, clinic_revenue, clinic_visits, courier_cod, alerts_open, alerts_critical}` (ixtiyoriy; `PUT` da yuborilmaydi) |

### 12.4 Frontend hozircha ishlatmaydigan (shartnomada bor) maydonlar
`clinic/attendance/`, `clinic/timeseries/?metric=visits`, `clinic/summary.visit_purposes`, `sales/calls.missed_reasons`, `app/consultations.{cancel_reasons, top_doctors}`, `finance/{summary.by_channel, expenses.by_filial, returns.by_reason/list, debts.collected/issued}`, `app/stores/` (2-bosqich) — ekranlarda bloki yo'q; keyin qo'shish mumkin.

### 12.5 Operator filiallari statistikasi (2026-10-05, P0)

Boshliq har filial operatorlar jamoasini yonma-yon ko'radi («Sotuv jamoasi» bo'limining birinchi bloki). Ikki yangi endpoint + bitta signal qoidasi. Namuna: `docs/api-samples/GET_sales__filials.json`, `GET_sales__filials__timeseries.json`.

**`GET /api/owner/sales/filials/?period=&compare=`** — konvert + `data: [FilialTeam]`.

| Maydon | Tur | Ta'rif |
|---|---|---|
| `id`, `name` | number, string | filial (`meta/` dagi bilan bir xil `id`) |
| `admin_name` | string \| null | filial admini (operatorlar rahbari); tayinlanmagan — `null` |
| `operators_total` | number | filialga biriktirilgan **faol** (bloklanmagan) operatorlar soni |
| `operators_online` | number | hozir onlayn operatorlar (`sales/operators/.is_online` bilan bir manba) — davrga bog'liq emas |
| `leads` | number | davrda yaratilgan lidlar (shu filial operatorlariga tegishli) |
| `conversion_pct` | number | filial bo'yicha: konvertatsiya bo'lgan lidlar ÷ `leads` (operatorlar foizining oddiy o'rtachasi **emas**) |
| `orders_delivered` | number | davrda `delivered` bo'lgan, shu filial operatorlari yaratgan buyurtmalar |
| `sales_amount` | Metric (`uzs`) | o'sha buyurtmalar `payable_amount` yig'indisi; `previous`/`delta_pct` — `compare` bo'yicha |
| `sales_per_operator` | number | `sales_amount.value ÷ operators_total` (butun so'm; operator yo'q — `0`) |
| `commission_earned` | number | davrda hisoblangan operator komissiyasi yig'indisi |
| `calls` | number | davrdagi qo'ng'iroqlar (kiruvchi + chiquvchi) |
| `missed_unhandled` | number | **hozir** hal qilinmagan o'tkazib yuborilgan qo'ng'iroqlar |
| `activities_overdue` | number | **hozir** muddati o'tgan delalar |
| `rating_avg`, `rating_count` | number \| null, number | mutaxassis baholari (baholar soni bo'yicha vaznli); baho yo'q — `null`, `0` |
| `plan` | `{target, actual, pct}` \| null | **joriy oy**, `OwnerTarget(filial, channel="delivery")`; `actual` — oy boshidan shu filialning yetkazib berish tushumi; reja kiritilmagan — `null`. Davr filtriga bog'liq emas |

Qoidalar:
- **`filial` parametri e'tiborga olinmaydi** — har doim foydalanuvchi ko'ra oladigan barcha filiallar qaytadi (`owner_viewer` uchun — faqat ruxsat etilgan filiallar). Frontend bu so'rovga `filial` yubormaydi: filial tanlanganda ham ro'yxat to'liq turadi, tanlangani belgilanadi.
- Operatori yo'q filial ham qaytadi (`operators_total: 0`, sonlar `0`) — bo'sh jamoa ham ko'rinishi kerak. Tartib — `id` bo'yicha (frontend o'zi sotuv bo'yicha saralaydi).
- **Mos kelishi shart:** har filial qatori = `sales/operators/?filial=<id>` qatorlari yig'indisi; filiallar `sales_amount`, `missed_unhandled`, `activities_overdue` yig'indisi = filtrsiz `sales/summary/` dagi qiymatlar.
- Operator filialdan filialga o'tgan bo'lsa, sotuv buyurtma yaratilgan paytdagi filialga yoziladi (`01_CONCEPT` §9, 8-savol).

**`GET /api/owner/sales/filials/timeseries/?period=&compare=`** — konvert + `{labels, series:[{key, values}], compare: null}`. `series[].key` — filial `id` (satr), `values` — shu filial operatorlar sotuvi (so'm) har `granularity` bo'lagi uchun. Har seriya yig'indisi = `sales/filials/` dagi shu filial `sales_amount.value`. `filial` parametri bu yerda ham e'tiborga olinmaydi.

**Signal `sales.filial_lagging`** (o'rta; `unit: pct`, default `threshold: 15`): filialning oxirgi 30 kundagi `sales_per_operator` qiymati kompaniya o'rtachasidan (`Σ sales ÷ Σ operators_total`) `threshold`% dan ortiq past bo'lsa ochiladi; farq yo'qolsa `resolved`. `filial` — filial nomi, `metric_value` — farq foizi (masalan `17.1`), `ref: {type:"filial", id:"<id>"}`. Faqat operatori bor filiallar va kamida 2 ta shunday filial bo'lganda tekshiriladi. `alerts/rules/` ro'yxatida ham qaytadi.

**Test (qabul mezoni, §10 ga qo'shimcha):** 8. `sales/filials/` da `filial=1` yuborilsa ham barcha filiallar qaytadi; har qator shu filial operatorlari yig'indisiga, filiallar yig'indisi `sales/summary/` ga teng.
