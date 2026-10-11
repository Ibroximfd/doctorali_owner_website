# API namunalari (`/api/owner/*`)

Frontend kutayotgan **aniq JSON shakllari**. Har fayl — bitta `GET` endpointning namuna javobi (raqamlar haqiqiy emas).
Avtomatik yaratilgan: `npm run samples` (manba — `src/shared/mocks`). Qo'lda tahrirlanmaydi.
Frontend har javobni zod sxema bilan tekshiradi: `src/features/<bo'lim>/model/*.schema.ts`.

| Endpoint | So'rov | Namuna |
|---|---|---|
| `GET /api/owner/alerts/` | `?period=30d` | [GET_alerts.json](GET_alerts.json) |
| `GET /api/owner/alerts/rules/` | `?period=30d` | [GET_alerts__rules.json](GET_alerts__rules.json) |
| `GET /api/owner/app/consultations/` | `?period=30d` | [GET_app__consultations.json](GET_app__consultations.json) |
| `GET /api/owner/app/devices/` | `?period=30d` | [GET_app__devices.json](GET_app__devices.json) |
| `GET /api/owner/app/doctor-app/` | `?period=30d` | [GET_app__doctor-app.json](GET_app__doctor-app.json) |
| `GET /api/owner/app/engagement/` | `?period=30d` | [GET_app__engagement.json](GET_app__engagement.json) |
| `GET /api/owner/app/loyalty/` | `?period=30d` | [GET_app__loyalty.json](GET_app__loyalty.json) |
| `GET /api/owner/app/summary/` | `?period=30d` | [GET_app__summary.json](GET_app__summary.json) |
| `GET /api/owner/app/timeseries/` | `?period=30d&metric=active_users` | [GET_app__timeseries.json](GET_app__timeseries.json) |
| `GET /api/owner/clinic/branches/` | `?period=30d` | [GET_clinic__branches.json](GET_clinic__branches.json) |
| `GET /api/owner/clinic/doctors/` | `?period=30d` | [GET_clinic__doctors.json](GET_clinic__doctors.json) |
| `GET /api/owner/clinic/summary/` | `?period=30d` | [GET_clinic__summary.json](GET_clinic__summary.json) |
| `GET /api/owner/clinic/timeseries/` | `?period=30d` | [GET_clinic__timeseries.json](GET_clinic__timeseries.json) |
| `GET /api/owner/clinic/warehouse/` | `?period=30d` | [GET_clinic__warehouse.json](GET_clinic__warehouse.json) |
| `GET /api/owner/customers/cohorts/` | `?period=30d` | [GET_customers__cohorts.json](GET_customers__cohorts.json) |
| `GET /api/owner/customers/regions/` | `?period=30d` | [GET_customers__regions.json](GET_customers__regions.json) |
| `GET /api/owner/customers/summary/` | `?period=30d` | [GET_customers__summary.json](GET_customers__summary.json) |
| `GET /api/owner/customers/timeseries/` | `?period=30d` | [GET_customers__timeseries.json](GET_customers__timeseries.json) |
| `GET /api/owner/customers/top/` | `?period=30d` | [GET_customers__top.json](GET_customers__top.json) |
| `GET /api/owner/doctors/` | `?period=30d` | [GET_doctors.json](GET_doctors.json) |
| `GET /api/owner/doctors/summary/` | `?period=30d` | [GET_doctors__summary.json](GET_doctors__summary.json) |
| `GET /api/owner/feed/` | `?period=30d` | [GET_feed.json](GET_feed.json) |
| `GET /api/owner/finance/cash-position/` | `?period=30d` | [GET_finance__cash-position.json](GET_finance__cash-position.json) |
| `GET /api/owner/finance/cashflow/` | `?period=30d` | [GET_finance__cashflow.json](GET_finance__cashflow.json) |
| `GET /api/owner/finance/daily-closings/` | `?period=30d` | [GET_finance__daily-closings.json](GET_finance__daily-closings.json) |
| `GET /api/owner/finance/debts/` | `?period=30d` | [GET_finance__debts.json](GET_finance__debts.json) |
| `GET /api/owner/finance/expenses/` | `?period=30d` | [GET_finance__expenses.json](GET_finance__expenses.json) |
| `GET /api/owner/finance/liabilities/` | `?period=30d` | [GET_finance__liabilities.json](GET_finance__liabilities.json) |
| `GET /api/owner/finance/payment-mix/` | `?period=30d` | [GET_finance__payment-mix.json](GET_finance__payment-mix.json) |
| `GET /api/owner/finance/returns/` | `?period=30d` | [GET_finance__returns.json](GET_finance__returns.json) |
| `GET /api/owner/finance/summary/` | `?period=30d` | [GET_finance__summary.json](GET_finance__summary.json) |
| `GET /api/owner/logistics/attempt-reasons/` | `?period=30d` | [GET_logistics__attempt-reasons.json](GET_logistics__attempt-reasons.json) |
| `GET /api/owner/logistics/couriers/:id/` | `?period=30d` | [GET_logistics__couriers__id.json](GET_logistics__couriers__id.json) |
| `GET /api/owner/logistics/couriers/` | `?period=30d` | [GET_logistics__couriers.json](GET_logistics__couriers.json) |
| `GET /api/owner/logistics/regions/` | `?period=30d` | [GET_logistics__regions.json](GET_logistics__regions.json) |
| `GET /api/owner/logistics/summary/` | `?period=30d` | [GET_logistics__summary.json](GET_logistics__summary.json) |
| `GET /api/owner/logistics/timeseries/` | `?period=30d` | [GET_logistics__timeseries.json](GET_logistics__timeseries.json) |
| `GET /api/owner/logistics/transfers/` | `?period=30d` | [GET_logistics__transfers.json](GET_logistics__transfers.json) |
| `GET /api/owner/me/` | `?period=30d` | [GET_me.json](GET_me.json) |
| `GET /api/owner/meta/` | `?period=30d` | [GET_meta.json](GET_meta.json) |
| `GET /api/owner/orders/:id/` | `?period=30d` | [GET_orders__id.json](GET_orders__id.json) |
| `GET /api/owner/orders/` | `?period=30d` | [GET_orders.json](GET_orders.json) |
| `GET /api/owner/orders/app-funnels/` | `?period=30d` | [GET_orders__app-funnels.json](GET_orders__app-funnels.json) |
| `GET /api/owner/orders/breakdown/` | `?period=30d&by=source` | [GET_orders__breakdown.json](GET_orders__breakdown.json) |
| `GET /api/owner/orders/funnel/` | `?period=30d` | [GET_orders__funnel.json](GET_orders__funnel.json) |
| `GET /api/owner/orders/heatmap/` | `?period=30d` | [GET_orders__heatmap.json](GET_orders__heatmap.json) |
| `GET /api/owner/orders/stage-durations/` | `?period=30d` | [GET_orders__stage-durations.json](GET_orders__stage-durations.json) |
| `GET /api/owner/orders/stuck/` | `?period=30d` | [GET_orders__stuck.json](GET_orders__stuck.json) |
| `GET /api/owner/orders/summary/` | `?period=30d` | [GET_orders__summary.json](GET_orders__summary.json) |
| `GET /api/owner/orders/timeseries/` | `?period=30d` | [GET_orders__timeseries.json](GET_orders__timeseries.json) |
| `GET /api/owner/overview/` | `?period=30d` | [GET_overview.json](GET_overview.json) |
| `GET /api/owner/overview/timeseries/` | `?period=30d` | [GET_overview__timeseries.json](GET_overview__timeseries.json) |
| `GET /api/owner/products/` | `?period=30d` | [GET_products.json](GET_products.json) |
| `GET /api/owner/reports/digest/` | `?period=30d` | [GET_reports__digest.json](GET_reports__digest.json) |
| `GET /api/owner/reports/export/:id/` | `?period=30d` | [GET_reports__export__id.json](GET_reports__export__id.json) |
| `GET /api/owner/reports/exports/` | `?period=30d` | [GET_reports__exports.json](GET_reports__exports.json) |
| `GET /api/owner/sales/calls/` | `?period=30d` | [GET_sales__calls.json](GET_sales__calls.json) |
| `GET /api/owner/sales/filials/` | `?period=30d` | [GET_sales__filials.json](GET_sales__filials.json) |
| `GET /api/owner/sales/filials/timeseries/` | `?period=30d` | [GET_sales__filials__timeseries.json](GET_sales__filials__timeseries.json) |
| `GET /api/owner/sales/lead-sources/` | `?period=30d` | [GET_sales__lead-sources.json](GET_sales__lead-sources.json) |
| `GET /api/owner/sales/leads-funnel/` | `?period=30d` | [GET_sales__leads-funnel.json](GET_sales__leads-funnel.json) |
| `GET /api/owner/sales/operators/:id/` | `?period=30d` | [GET_sales__operators__id.json](GET_sales__operators__id.json) |
| `GET /api/owner/sales/operators/` | `?period=30d` | [GET_sales__operators.json](GET_sales__operators.json) |
| `GET /api/owner/sales/ratings/` | `?period=30d` | [GET_sales__ratings.json](GET_sales__ratings.json) |
| `GET /api/owner/sales/summary/` | `?period=30d` | [GET_sales__summary.json](GET_sales__summary.json) |
| `GET /api/owner/sessions/` | `?period=30d` | [GET_sessions.json](GET_sessions.json) |
| `GET /api/owner/settings/access/` | `?period=30d` | [GET_settings__access.json](GET_settings__access.json) |
| `GET /api/owner/targets/` | `?month=2026-10` | [GET_targets.json](GET_targets.json) |

## Yozuvchi endpointlar (boshliqning o'z sozlamalari va amallari)

So'rov va javob shakllari — `docs/02_BACKEND_TZ.md` va tegishli `*.schema.ts` da.

| Endpoint |
|---|
| `DELETE /api/owner/sessions/:id/` |
| `PATCH /api/owner/alerts/rules/:code/` |
| `POST /api/owner/alerts/:id/ack/` |
| `POST /api/owner/reports/export/` |
| `POST /api/owner/telegram/link/` |
| `POST /api/owner/telegram/login/` |
| `POST /api/owner/telegram/status/` |
| `PUT /api/owner/reports/digest/` |
| `PUT /api/owner/targets/` |
