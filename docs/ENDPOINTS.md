# Endpoint katalogi — frontend chaqiradigan barcha `GET /api/owner/*`

Avtomatik yaratilgan (`npm run samples`, manba — `scripts/contract/endpoints.ts`). Qo'lda tahrirlanmaydi.
Tekshiruv: `npm run contract:check` — har qator haqiqiy backendda chaqiriladi va sxema bilan solishtiriladi.

Jami: **68** endpoint. «konvert» — `{period, compare, filials, generated_at, freshness, data}`, «oddiy» — konvertsiz JSON.

| Bo'lim | Endpoint | Parametrlar | Javob | Namuna | Izoh |
|---|---|---|---|---|---|
| Umumiy | `GET /api/owner/meta/` | — | oddiy | [GET_meta.json](api-samples/GET_meta.json) | filiallar, hududlar, lug'atlar; kunda 1 marta keshlanadi |
| Umumiy | `GET /api/owner/me/` | — | oddiy | [GET_me.json](api-samples/GET_me.json) |  |
| Umumiy | `GET /api/owner/overview/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_overview.json](api-samples/GET_overview.json) |  |
| Umumiy | `GET /api/owner/overview/timeseries/` | `period` `date_from` `date_to` `compare` `filial` `metric=revenue` `split=channel` | konvert | [GET_overview__timeseries.json](api-samples/GET_overview__timeseries.json) |  |
| Umumiy | `GET /api/owner/feed/` | `limit=30` | oddiy | [GET_feed.json](api-samples/GET_feed.json) | jonli lenta; har 15 s so'raladi (WS bo'lsa — jonli) |
| Buyurtmalar | `GET /api/owner/orders/summary/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_orders__summary.json](api-samples/GET_orders__summary.json) |  |
| Buyurtmalar | `GET /api/owner/orders/funnel/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_orders__funnel.json](api-samples/GET_orders__funnel.json) |  |
| Buyurtmalar | `GET /api/owner/orders/timeseries/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_orders__timeseries.json](api-samples/GET_orders__timeseries.json) |  |
| Buyurtmalar | `GET /api/owner/orders/breakdown/` | `period` `date_from` `date_to` `compare` `filial` (`by=source` · `by=region` · `by=cancel_reason` · `by=confirmation_channel`) | konvert | [GET_orders__breakdown.json](api-samples/GET_orders__breakdown.json) |  |
| Buyurtmalar | `GET /api/owner/orders/stage-durations/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_orders__stage-durations.json](api-samples/GET_orders__stage-durations.json) |  |
| Buyurtmalar | `GET /api/owner/orders/heatmap/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_orders__heatmap.json](api-samples/GET_orders__heatmap.json) |  |
| Buyurtmalar | `GET /api/owner/orders/stuck/` | — | konvert | [GET_orders__stuck.json](api-samples/GET_orders__stuck.json) | hozirgi holat: faqat `filial` qabul qiladi, davr yo'q |
| Buyurtmalar | `GET /api/owner/orders/` | `period` `date_from` `date_to` `compare` `filial` `page=1` `page_size=10` (`status=shipping` · `search=DA-18`) | oddiy | [GET_orders.json](api-samples/GET_orders.json) | `status` ∈ pending|confirmed|shipping|delivered|cancelled; `search` — raqam, ism yoki telefon |
| Buyurtmalar | `GET /api/owner/orders/:id/` | — | oddiy | [GET_orders__id.json](api-samples/GET_orders__id.json) | yo'q → 404 `order_not_found` |
| Buyurtmalar | `GET /api/owner/orders/app-funnels/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_orders__app-funnels.json](api-samples/GET_orders__app-funnels.json) | Mobil ilova ekranida ko'rsatiladi |
| Moliya | `GET /api/owner/finance/summary/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_finance__summary.json](api-samples/GET_finance__summary.json) |  |
| Moliya | `GET /api/owner/finance/cashflow/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_finance__cashflow.json](api-samples/GET_finance__cashflow.json) |  |
| Moliya | `GET /api/owner/finance/cash-position/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_finance__cash-position.json](api-samples/GET_finance__cash-position.json) | hozirgi holat; davr e'tiborsiz |
| Moliya | `GET /api/owner/finance/payment-mix/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_finance__payment-mix.json](api-samples/GET_finance__payment-mix.json) |  |
| Moliya | `GET /api/owner/finance/expenses/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_finance__expenses.json](api-samples/GET_finance__expenses.json) |  |
| Moliya | `GET /api/owner/finance/liabilities/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_finance__liabilities.json](api-samples/GET_finance__liabilities.json) |  |
| Moliya | `GET /api/owner/finance/returns/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_finance__returns.json](api-samples/GET_finance__returns.json) |  |
| Moliya | `GET /api/owner/finance/debts/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_finance__debts.json](api-samples/GET_finance__debts.json) |  |
| Moliya | `GET /api/owner/finance/daily-closings/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_finance__daily-closings.json](api-samples/GET_finance__daily-closings.json) |  |
| Klinika | `GET /api/owner/clinic/summary/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_clinic__summary.json](api-samples/GET_clinic__summary.json) |  |
| Klinika | `GET /api/owner/clinic/timeseries/` | `period` `date_from` `date_to` `compare` `filial` `metric=revenue` | konvert | [GET_clinic__timeseries.json](api-samples/GET_clinic__timeseries.json) |  |
| Klinika | `GET /api/owner/clinic/branches/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_clinic__branches.json](api-samples/GET_clinic__branches.json) |  |
| Klinika | `GET /api/owner/clinic/doctors/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_clinic__doctors.json](api-samples/GET_clinic__doctors.json) |  |
| Klinika | `GET /api/owner/clinic/warehouse/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_clinic__warehouse.json](api-samples/GET_clinic__warehouse.json) |  |
| Yetkazib berish | `GET /api/owner/logistics/summary/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_logistics__summary.json](api-samples/GET_logistics__summary.json) |  |
| Yetkazib berish | `GET /api/owner/logistics/couriers/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_logistics__couriers.json](api-samples/GET_logistics__couriers.json) |  |
| Yetkazib berish | `GET /api/owner/logistics/couriers/:id/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_logistics__couriers__id.json](api-samples/GET_logistics__couriers__id.json) | yo'q → 404 `courier_not_found` |
| Yetkazib berish | `GET /api/owner/logistics/timeseries/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_logistics__timeseries.json](api-samples/GET_logistics__timeseries.json) |  |
| Yetkazib berish | `GET /api/owner/logistics/regions/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_logistics__regions.json](api-samples/GET_logistics__regions.json) |  |
| Yetkazib berish | `GET /api/owner/logistics/attempt-reasons/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_logistics__attempt-reasons.json](api-samples/GET_logistics__attempt-reasons.json) |  |
| Yetkazib berish | `GET /api/owner/logistics/transfers/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_logistics__transfers.json](api-samples/GET_logistics__transfers.json) |  |
| Sotuv jamoasi | `GET /api/owner/sales/summary/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_sales__summary.json](api-samples/GET_sales__summary.json) |  |
| Sotuv jamoasi | `GET /api/owner/sales/filials/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_sales__filials.json](api-samples/GET_sales__filials.json) | `filial` e'tiborsiz — har doim barcha filiallar |
| Sotuv jamoasi | `GET /api/owner/sales/filials/timeseries/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_sales__filials__timeseries.json](api-samples/GET_sales__filials__timeseries.json) | `filial` e'tiborsiz; `series[].key` = filial id |
| Sotuv jamoasi | `GET /api/owner/sales/operators/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_sales__operators.json](api-samples/GET_sales__operators.json) |  |
| Sotuv jamoasi | `GET /api/owner/sales/operators/:id/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_sales__operators__id.json](api-samples/GET_sales__operators__id.json) | yo'q → 404 `operator_not_found` |
| Sotuv jamoasi | `GET /api/owner/sales/leads-funnel/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_sales__leads-funnel.json](api-samples/GET_sales__leads-funnel.json) |  |
| Sotuv jamoasi | `GET /api/owner/sales/lead-sources/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_sales__lead-sources.json](api-samples/GET_sales__lead-sources.json) |  |
| Sotuv jamoasi | `GET /api/owner/sales/calls/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_sales__calls.json](api-samples/GET_sales__calls.json) |  |
| Sotuv jamoasi | `GET /api/owner/sales/ratings/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_sales__ratings.json](api-samples/GET_sales__ratings.json) |  |
| Mobil ilova | `GET /api/owner/app/summary/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_app__summary.json](api-samples/GET_app__summary.json) |  |
| Mobil ilova | `GET /api/owner/app/timeseries/` | `period` `date_from` `date_to` `compare` `filial` (`metric=active_users` · `metric=new_users`) | konvert | [GET_app__timeseries.json](api-samples/GET_app__timeseries.json) |  |
| Mobil ilova | `GET /api/owner/app/devices/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_app__devices.json](api-samples/GET_app__devices.json) |  |
| Mobil ilova | `GET /api/owner/app/consultations/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_app__consultations.json](api-samples/GET_app__consultations.json) |  |
| Mobil ilova | `GET /api/owner/app/engagement/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_app__engagement.json](api-samples/GET_app__engagement.json) |  |
| Mobil ilova | `GET /api/owner/app/loyalty/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_app__loyalty.json](api-samples/GET_app__loyalty.json) |  |
| Mobil ilova | `GET /api/owner/app/doctor-app/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_app__doctor-app.json](api-samples/GET_app__doctor-app.json) |  |
| Mahsulotlar | `GET /api/owner/products/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_products.json](api-samples/GET_products.json) |  |
| Mijozlar | `GET /api/owner/customers/summary/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_customers__summary.json](api-samples/GET_customers__summary.json) |  |
| Mijozlar | `GET /api/owner/customers/timeseries/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_customers__timeseries.json](api-samples/GET_customers__timeseries.json) |  |
| Mijozlar | `GET /api/owner/customers/cohorts/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_customers__cohorts.json](api-samples/GET_customers__cohorts.json) |  |
| Mijozlar | `GET /api/owner/customers/top/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_customers__top.json](api-samples/GET_customers__top.json) |  |
| Mijozlar | `GET /api/owner/customers/regions/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_customers__regions.json](api-samples/GET_customers__regions.json) |  |
| Shifokorlar | `GET /api/owner/doctors/summary/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_doctors__summary.json](api-samples/GET_doctors__summary.json) |  |
| Shifokorlar | `GET /api/owner/doctors/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_doctors.json](api-samples/GET_doctors.json) |  |
| Signallar | `GET /api/owner/alerts/` | — | oddiy | [GET_alerts.json](api-samples/GET_alerts.json) |  |
| Signallar | `GET /api/owner/alerts/rules/` | — | oddiy | [GET_alerts__rules.json](api-samples/GET_alerts__rules.json) |  |
| Hisobotlar | `GET /api/owner/reports/exports/` | — | oddiy | [GET_reports__exports.json](api-samples/GET_reports__exports.json) |  |
| Hisobotlar | `GET /api/owner/reports/export/:id/` | — | oddiy | [GET_reports__export__id.json](api-samples/GET_reports__export__id.json) | yo'q → 404 `export_not_found`; tarix bo'sh bo'lsa tekshiruv o'tkazib yuboriladi |
| Hisobotlar | `GET /api/owner/reports/digest/` | — | oddiy | [GET_reports__digest.json](api-samples/GET_reports__digest.json) |  |
| Sozlamalar | `GET /api/owner/targets/` | `month=2026-10` | oddiy | [GET_targets.json](api-samples/GET_targets.json) |  |
| Sozlamalar | `GET /api/owner/sessions/` | — | oddiy | [GET_sessions.json](api-samples/GET_sessions.json) |  |
| Sozlamalar | `GET /api/owner/settings/access/` | — | oddiy | [GET_settings__access.json](api-samples/GET_settings__access.json) |  |
