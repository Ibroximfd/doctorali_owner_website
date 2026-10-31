# Endpoint katalogi — frontend chaqiradigan barcha `GET /api/owner/*`

Avtomatik yaratilgan (`npm run endpoints:doc`, manba — `scripts/contract/endpoints.ts`). Qo'lda tahrirlanmaydi.
Tekshiruv: `npm run contract:check` — har qator haqiqiy backendda chaqiriladi va sxema bilan solishtiriladi.

Jami: **23** endpoint. «konvert» — `{period, compare, filials, generated_at, freshness, data}`, «oddiy» — konvertsiz JSON.

| Bo'lim | Endpoint | Parametrlar | Javob | Namuna | Izoh |
|---|---|---|---|---|---|
| Umumiy | `GET /api/owner/meta/` | — | oddiy | [GET_meta.json](api-samples/GET_meta.json) |  |
| Umumiy | `GET /api/owner/me/` | — | oddiy | [GET_me.json](api-samples/GET_me.json) |  |
| Umumiy | `GET /api/owner/overview/v2/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_overview__v2.json](api-samples/GET_overview__v2.json) | B-11 |
| Filiallar | `GET /api/owner/structure/` | — | oddiy | [GET_structure.json](api-samples/GET_structure.json) | v2 §2.1 |
| Filiallar | `GET /api/owner/structure/audit/` | `limit=50` | oddiy | [GET_structure__audit.json](api-samples/GET_structure__audit.json) | v2 §2.8 |
| Filiallar | `GET /api/owner/structure/sklad-grants/:id/` | — | oddiy | [GET_structure__sklad-grants__id.json](api-samples/GET_structure__sklad-grants__id.json) | v2 §2.9 |
| Filiallar | `GET /api/owner/structure/permissions/` | — | oddiy | [GET_structure__permissions.json](api-samples/GET_structure__permissions.json) | B-4 |
| Filiallar | `GET /api/owner/structure/filials/:id/seats/` | — | oddiy | [GET_structure__filials__id__seats.json](api-samples/GET_structure__filials__id__seats.json) | B-5; `q` — qidiruv |
| Filiallar | `GET /api/owner/filials/performance/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_filials__performance.json](api-samples/GET_filials__performance.json) | B-6 |
| Moliya | `GET /api/owner/finance/v2/` | `period` `date_from` `date_to` `compare` `filial` (`source=app` · `source=operator`) | konvert | [GET_finance__v2.json](api-samples/GET_finance__v2.json) | B-12; `source` pul zanjiriga qo'llanmaydi |
| Analitika | `GET /api/owner/analytics/v2/` | `period` `date_from` `date_to` `compare` `filial` (`source=app` · `source=operator`) | konvert | [GET_analytics__v2.json](api-samples/GET_analytics__v2.json) | B-13; `source=app|operator` |
| Ilova | `GET /api/owner/app/v2/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_app__v2.json](api-samples/GET_app__v2.json) | B-14 |
| Xodimlar | `GET /api/owner/sales/operators/` | `period` `date_from` `date_to` `compare` `filial` | konvert | [GET_sales__operators.json](api-samples/GET_sales__operators.json) | B-15 — logistlar uchun manba yo'q |
| Sklad | `GET /api/owner/sklad-api/sklads/` | — | oddiy | [GET_sklad-api__sklads.json](api-samples/GET_sklad-api__sklads.json) |  |
| Sklad | `GET /api/owner/sklad-api/items/` | `pagination=false` | oddiy | [GET_sklad-api__items.json](api-samples/GET_sklad-api__items.json) |  |
| Sklad | `GET /api/owner/sklad-api/stock/` | `pagination=false` | oddiy | [GET_sklad-api__stock.json](api-samples/GET_sklad-api__stock.json) |  |
| Sklad | `GET /api/owner/sklad-api/overview/` | — | oddiy | [GET_sklad-api__overview.json](api-samples/GET_sklad-api__overview.json) |  |
| Sklad | `GET /api/owner/sklad-api/ledger/` | (`movement_type=receipt` · `page=2` `page_size=20`) | oddiy | [GET_sklad-api__ledger.json](api-samples/GET_sklad-api__ledger.json) |  |
| Sklad | `GET /api/owner/sklad-api/ledger/summary/` | — | oddiy | [GET_sklad-api__ledger__summary.json](api-samples/GET_sklad-api__ledger__summary.json) |  |
| Sklad | `GET /api/owner/sklad-api/documents/:id/` | — | oddiy | [GET_sklad-api__documents__id.json](api-samples/GET_sklad-api__documents__id.json) |  |
| AI | `GET /api/owner/ai/status/` | — | oddiy | [GET_ai__status.json](api-samples/GET_ai__status.json) | B-10 |
| AI | `GET /api/owner/ai/analysis/` | — | oddiy | [GET_ai__analysis.json](api-samples/GET_ai__analysis.json) |  |
| Sozlamalar | `GET /api/owner/sessions/` | — | oddiy | [GET_sessions.json](api-samples/GET_sessions.json) |  |
