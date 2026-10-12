# BACKEND HANDOFF — «Doctor Ali Nazorat» uchun API: to'liq topshirish hujjati

Sana: 2026-10-05. Kim uchun: **backend jamoasi (Django)**.
Maqsad: backend shu hujjatdagi shartnomani bajarsa, frontend kodga tegmasdan ishlaydi (panel faqat backend bilan ishlaydi; server — `config/servers.mjs`).

Frontend tayyor va namuna ma'lumot bilan to'liq ishlaydi. U backenddan nima kutayotgani quyidagi manbalarda aniq yozilgan; ular orasida ziddiyat bo'lsa, ustunlik tartibi shunday:

| # | Manba | Nima |
|---|---|---|
| 1 | **`npm run contract:check`** | haqiqiy backendni frontend sxemalari bilan avtomatik tekshiradi — oxirgi hakam |
| 2 | **`docs/api-samples/*.json`** | har `GET` endpointning aniq JSON namunasi (68 ta) |
| 3 | **`docs/ENDPOINTS.md`** | barcha `GET` endpointlar katalogi: yo'l, parametrlar, javob turi |
| 4 | **shu hujjat** | umumiy qoidalar, auth, yozuvchi so'rovlar, xatolar, ulash tartibi |
| 5 | `docs/02_BACKEND_TZ.md` | ma'lumot modeli, agregat qatlam, signal qoidalari, ishlash talablari |
| 6 | `docs/01_CONCEPT.md` §6 | **metrikalar lug'ati** — har raqam qanday hisoblanadi |
| 7 | `../doctor_ali_owner_bot/docs/02_BACKEND_TZ.md` | **2-bosqich** — Telegram: PIN bilan kirish va bot xabarlari. Bot sayt ishga tushgandan **keyin** qilinadi |

---

## 1. Ulanish modeli

```
Brauzer ──▶ Next.js (BFF, /api/owner/*) ──Bearer──▶ Django /api/owner/*
             httpOnly cookie da token
```

- Brauzer backendga **to'g'ridan-to'g'ri murojaat qilmaydi**. Barcha so'rovlarni frontend serveri (BFF) yuboradi, shuning uchun **CORS kerak emas**.
- BFF har so'rovga `Authorization: Bearer <access>`, `X-Lang: uz|ru`, mijozning `User-Agent` i va IP si (`X-Forwarded-For`, nginx bergan `X-Real-IP` dan) qo'shadi. Audit jurnali va kirish urinishlari cheklovi shu IP bo'yicha yuritilsin; bu sarlavhalarga faqat BFF dan kelgan so'rovda ishonilsin (BFF ↔ backend yopiq tarmoq yoki IP ro'yxati). Server yaratadigan matnlar (signal sarlavhasi, lenta, hudud nomi) shu tilda qaytishi kerak.
- So'rov yo'llari frontenddagi bilan **bir xil**: brauzer `/api/owner/sales/filials/?period=30d` ga murojaat qiladi, BFF uni `<BACKEND_ORIGIN>/api/owner/sales/filials/?period=30d` ga yuboradi. Yo'llar **`/` bilan tugaydi** (Django uslubi).
- Javob 20 soniyada kelmasa, frontend uni xato deb hisoblaydi. Mo'ljal: p95 < 500 ms (`02_BACKEND_TZ` §2.5).
- `401` kelsa, BFF `POST /api/user/refresh/` bilan tokenni bir marta yangilab, so'rovni qaytadan yuboradi. Refresh ham o'tmasa, foydalanuvchi kirish sahifasiga qaytariladi.

## 2. Kirish (auth)

### 2.1 Sayt: parol + SMS/TOTP
| # | Endpoint | So'rov | Javob `200` | Xatolar |
|---|---|---|---|---|
| 1 | `POST /api/owner/login/` | `{username, password}` | `{challenge_id: string, method: "sms"\|"totp", phone_masked: string\|null}` | `401` login/parol xato · `429 login_locked` (5 xato → 15 daqiqa) |
| 2 | `POST /api/owner/login/verify/` | `{challenge_id, code}` (`code` — 6 raqam) | `{access, refresh, user}`; `user` = §2.3 | `401`/`400` kod xato yoki eskirgan · `429 login_locked` |
| 3 | `POST /api/user/refresh/` | `{refresh}` | `{access, refresh?}` (rotatsiya bo'lsa yangi `refresh`) | `401` |
| 4 | `POST /api/owner/logout/` | `{refresh}` | istalgan `2xx` | — (frontend javobni kutmaydi) |
| 5 | `POST /api/owner/ws-ticket/` | — (Bearer) | `{ticket: string, expires_in: number}` | xato bo'lsa jonli kanal o'chadi, lenta so'rov bilan yangilanadi |

Token muddatlari: access **15 daqiqa**, refresh **14 kun** (sayt) / **12 soat** (Telegram).

### 2.2 Telegram mini app: PIN — **2-bosqich: avval sayt, keyin bot**
> Avval sayt ishga tushadi, bot va mini app undan keyin. Shartnoma tayyor — bot bosqichida shu bo'lim bo'yicha qilinadi; saytning qabul mezonlariga kirmaydi.

`POST /api/owner/telegram/status/`, `…/login/`, `…/link/` (+ P1 `DELETE …/link/`). To'liq shartnoma, PIN qoidalari, `initData` imzosini tekshirish algoritmi va testlar: **`../doctor_ali_owner_bot/docs/02_BACKEND_TZ.md` §1–3, §6**. Javoblar (frontend aynan shularni o'qiydi):
- `status` → `{state: "unlinked"|"pin_required"|"locked", full_name, attempts_left, locked_until}`;
- `login` → `{access, refresh, user}` · `401 pin_invalid` (+`attempts_left`) · `423 pin_locked` (+`locked_until`) · `404 telegram_not_linked` · `400 init_data_invalid|init_data_expired`;
- `link` (Bearer, parol+SMS sessiyasi bilan) → `{ok: true}` · `400 pin_weak` · `409 telegram_already_linked` · `401`/`403 reauth_required`.

### 2.3 Foydalanuvchi (`user` va `GET /api/owner/me/`)
```json
{ "id": 1, "full_name": "Boshliq", "role": "owner", "sections": [], "filials": [], "mask_pii": false }
```
`role`: `owner` | `owner_viewer`. `sections` va `filials` bo'sh bo'lsa — cheklov yo'q. Ruxsat berilmagan bo'lim so'ralsa `403 section_forbidden` qaytariladi, frontend o'sha blokda «ruxsat yo'q» holatini ko'rsatadi.

## 3. Umumiy shartnoma (barcha `GET`)

### 3.1 Filtr parametrlari
`docs/ENDPOINTS.md` dagi «Parametrlar» ustunida `period … filial` ko'rsatilgan endpointlar shu parametrlarni oladi:

| Param | Frontend yuboradigan qiymatlar |
|---|---|
| `period` | `today` `yesterday` `7d` `30d` `month` `prev_month` `year` `custom` («90 kun» `custom` sifatida yuboriladi) |
| `date_from`, `date_to` | faqat `period=custom` da, `YYYY-MM-DD`, ikkalasi ham kiradi |
| `compare` | `previous` · `yoy` · `none` — **har doim yuboriladi** |
| `filial` | `1` yoki `1,2` (o'sish tartibida); yuborilmasa — barcha filiallar |

Boshqa doimiy parametrlar (`metric`, `split`, `by`, `status`, `search`, `page`, `page_size`, `limit`, `month`) katalogda har endpoint qatorida ko'rsatilgan.

### 3.2 Konvert (envelope)
Katalogda «konvert» deb belgilangan javoblar shu shaklda bo'ladi:
```json
{
  "period":  { "from": "2026-09-03", "to": "2026-10-02", "granularity": "day", "label": "Oxirgi 30 kun" },
  "compare": { "from": "2026-08-04", "to": "2026-09-02" },
  "filials": [1, 2, 3],
  "generated_at": "2026-10-02T09:05:00Z",
  "freshness": { "clinic": "2026-10-02T08:50:00Z" },
  "data": { }
}
```
- `compare=none` bo'lsa `compare: null` qaytadi.
- `filials` — javob qaysi filiallar bo'yicha hisoblangani. Filtr bo'lmasa, foydalanuvchiga ruxsat etilgan barcha filiallar.
- `freshness` ixtiyoriy: manba kechikayotgan bo'lsa, ekranda «eskirgan» belgisi chiqadi.
- `granularity` ∈ `hour · day · week · month`.

### 3.3 Qiymat shakllari
- **Metrika:** `{value: number, previous: number|null, delta_pct: number|null, unit?: "uzs"|"count"|"pct"|"min"}`. `delta_pct` — **nisbiy** o'zgarish (`(value − previous) ÷ previous × 100`). Ulush ko'rsatkichlarida (`unit: "pct"`) frontend foiz punktini o'zi hisoblaydi (`value − previous`), shuning uchun `previous` aniq bo'lishi shart. Oldingi qiymat `0` yoki `compare=none` bo'lsa `previous`/`delta_pct` = `null`. «Hozirgi holat» ko'rsatkichlarida ham `null`.
- **Vaqt qatori:** `{labels: string[], series: [{key, values: number[]}], compare?: number[]|null}`. `values` uzunligi `labels` ga teng. `labels` granularitetga qarab: `hour` → `2026-10-02T14:00`, `day` → `2026-10-02`, `week` → haftaning dushanbasi, `month` → `2026-10`.
- **Pul** — so'mda, butun son. **Foiz** — `31.4` (ulush emas, foizning o'zi). **Vaqt** — ISO 8601 UTC (`…Z`). Kun chegarasi — `Asia/Tashkent`.
- Kalitlar `snake_case` da. Frontend ularni o'zi camelCase ga o'giradi.
- **Sxemada yo'q qo'shimcha maydon zarar qilmaydi.** Sxemadagi maydon yo'q bo'lsa yoki turi boshqacha bo'lsa, o'sha blok xato ko'rsatadi, sahifaning qolgan qismi ishlayveradi.
- **Enumlar ochiq:** noma'lum `status`, `kind`, `source`, `reason` yoki kanal xato bermaydi — neytral ko'rinishda chiqadi.
- `null` ruxsat etilgan maydonlar `api-samples` da `null` bilan ko'rsatilgan. Qolganlari **majburiy**: bo'sh ro'yxat `[]` bo'ladi, `null` emas.

### 3.4 Ichki moslik (frontend testlari shunga tayanadi)
Raqamlar bo'limlar orasida bir-biriga teng kelishi shart. Aks holda boshliq ikki xil raqam ko'radi:
- `overview.revenue.total = delivery + clinic + consultation`; ilova orqali kelgan buyurtma ikki marta sanalmaydi.
- `sales/summary.sales_amount` = `sales/operators` yig'indisi = `sales/filials` yig'indisi; har filial qatori = shu filial operatorlari yig'indisi; `sales/filials/timeseries` dagi har seriya yig'indisi = shu filial `sales_amount`.
- `sales/leads-funnel` yig'indisi = `sales/summary.leads` = `sales/lead-sources` yig'indisi.
- `sales/calls` seriyalari yig'indisi = `sales/summary.calls_total`.
- `orders/funnel` bosqichlari = `orders/summary` soni; `orders/breakdown` yig'indisi = davrdagi buyurtmalar.
- `sales/operators/{id}` = ro'yxatdagi shu qator + `trend`; `trend` yig'indisi = `orders_delivered`.
- `filial=1` bilan olingan natija filial adminining mavjud statistikasi bilan bir xil (`02_BACKEND_TZ` §10.2).

## 4. Xatolar

Shakli har doim `{"code": "snake_case_kod", "detail": "matn"}`. Frontend **`code` ga qarab** ishlaydi (`detail` faqat jurnalga yoziladi).

| Status | Frontend nima qiladi |
|---|---|
| `400` / `422` | blokda xato (qayta urinish tugmasisiz) |
| `401` | bir marta refresh → bo'lmasa kirish sahifasi (Telegramda — PIN ekrani) |
| `403` | blokda «ruxsat yo'q» |
| `404` | «topilmadi» (buyurtma, operator, kuryer kartasi) |
| `423` | faqat Telegram PIN qulfi |
| `429` | «juda ko'p urinish» |
| `5xx`, javob yo'q | blokda xato + «Qayta urinish» |

Frontend taniydigan kodlar: `login_locked`, `section_forbidden`, `order_not_found`, `operator_not_found`, `courier_not_found`, `export_not_found`, `alert_not_found`, `rule_not_found`, `validation_error`, `pin_invalid`, `pin_locked`, `pin_weak`, `telegram_not_linked`, `telegram_already_linked`, `reauth_required`, `init_data_invalid`, `init_data_expired`.

## 5. `GET` endpointlar — 68 ta

To'liq ro'yxat: **`docs/ENDPOINTS.md`**. Unda har endpointning parametrlari, javob turi, namuna fayli va izohi bor.

| Bo'lim | Soni | Bo'lim | Soni |
|---|---|---|---|
| Umumiy (meta, me, overview, feed) | 5 | Sotuv jamoasi (filiallar bilan) | 9 |
| Buyurtmalar | 10 | Mobil ilova | 7 |
| Moliya | 9 | Mahsulotlar · Mijozlar · Shifokorlar | 1 · 5 · 2 |
| Klinika | 5 | Signallar · Hisobotlar · Sozlamalar | 2 · 3 · 3 |
| Yetkazib berish | 7 | | |

Har endpointning maydonlari va ma'nosi `02_BACKEND_TZ.md` §4 va §12 da, hisoblash qoidalari `01_CONCEPT.md` §6 da.

## 6. Yozuvchi endpointlar (boshliqning o'z sozlamalari va amallari)

Panel biznes ma'lumotini **o'zgartirmaydi**. Faqat quyidagilar yoziladi:

| Endpoint | So'rov tanasi | Javob |
|---|---|---|
| `POST /api/owner/alerts/{id}/ack/` | — | yangilangan signal (`GET alerts/` dagi `results[]` qatori), `status: "acknowledged"` · `404 alert_not_found` |
| `PATCH /api/owner/alerts/rules/{code}/` | `{enabled?: boolean, params?: {threshold: number ≥ 0}}` | yangilangan qoida `{code, enabled, severity, params:{threshold}, unit}` · `404 rule_not_found` · `400 validation_error` |
| `PUT /api/owner/targets/` | `{month: "2026-10", items: [{filial: number\|null, channel: "total"\|"delivery"\|"clinic"\|"consultation", amount: number}]}` | `{month, items}` (saqlangan holat) |
| `DELETE /api/owner/sessions/{id}/` | — | `204` · `404` (yo'q). Joriy sessiya (`is_current: true`) uchun frontend tugma ko'rsatmaydi |
| `POST /api/owner/reports/export/` | `{report, format, period}` + ixtiyoriy `date_from`, `date_to`, `filial: "1,3"` | `{job_id}` (satr yoki son) |
| `PUT /api/owner/reports/digest/` | `{enabled, time: "21:00", channels: ["telegram"], telegram_chat_id: string\|number\|null, sections: string[]}` | `GET reports/digest/` shakli (`preview` ixtiyoriy) |

`report` qiymatlari: `daily`, `weekly`, `monthly_pl`, `operators`, `couriers_cod`, `debts`, `products`. `format`: `xlsx`, `pdf`. `period`: `today`, `yesterday`, `7d`, `30d`, `month`, `prev_month`, `year`. Eksport holati `GET reports/export/{job_id}/` orqali har 2 soniyada so'raladi: `{status: "pending"|"ready"|"failed", url, expires_at}`.

Har yozuvchi amal audit jurnaliga yoziladi (`02_BACKEND_TZ` §9).

## 7. Jonli kanal va bot xabarlari (bot — 2-bosqich)

- **WebSocket** (P1): `wss://<host>/ws/owner/?token=<ticket>`. Hodisalar `02_BACKEND_TZ.md` §5 da. WS bo'lmasa ham panel ishlaydi: lenta har 15 soniyada, «bugun» ko'rsatkichlari har 60 soniyada so'rov bilan yangilanadi.
- **Telegram bot xabarlari:** backend Telegramga o'zi yozmaydi. Hodisani imzolab bot xizmatiga yuboradi (`POST <bot>/events`). Shartnoma: `../doctor_ali_owner_bot/docs/02_BACKEND_TZ.md` §4. Imzo namunasi: bot loyihasidagi `npm run event:sample`.

## 8. Ulash tartibi (backend tayyor bo'lganda)

**1-qadam — backend o'zi tekshiradi.** Test serverida `owner` foydalanuvchi uchun access token oling va frontend loyihasida ishga tushiring:
```bash
APP_SERVER=test OWNER_ACCESS_TOKEN=<token> npm run contract:check
```
Natijada har endpoint uchun `✓` yoki `✗` chiqadi. `✗` qatorida qaysi maydon mos kelmagani yoziladi, masalan: `data.0.sales_per_operator — Expected number, received string`. Barchasi `✓` bo'lgach, filtrlarning 10 xil holatida tekshiring:
```bash
APP_SERVER=test OWNER_ACCESS_TOKEN=<token> npm run contract:check -- --full
```
Bitta bo'limni tekshirish: `-- --only=sales/`. Skript faqat `GET` yuboradi va hech narsa yozmaydi.

**2-qadam — panelni ulash** (`doctor_ali_owner_next/.env.production` yoki server muhiti):
```
# server — `config/servers.mjs` (prod → my.imorganic.uz, default); boshqasiga: APP_SERVER=test
NEXT_PUBLIC_WS_URL=wss://my.imorganic.uz/ws/owner/   # WS tayyor bo'lsa
```
`TELEGRAM_BOT_TOKEN` panelga **qo'yilmaydi**: haqiqiy rejimda `initData` ni backend tekshiradi.

**3-qadam — Telegram (2-bosqich: sayt ishga tushgandan keyin).** Backend `.env`: `OWNER_BOT_TOKEN`, `OWNER_BOT_EVENTS_URL`, `OWNER_BOT_EVENTS_SECRET`. Bot `.env` dagi `MINI_APP_URL` doimiy domenga (`https://<panel>/tg`) o'zgartiriladi.

**4-qadam — qo'lda tekshiruv** (boshliq yoki QA, 15 daqiqa):
- [ ] Saytda kirish: parol → SMS → «Umumiy» ochiladi; 5 marta noto'g'ri parol → «Juda ko'p urinish».
- [ ] Har bo'lim ochiladi, hech bir blokda «Ma'lumot olinmadi» chiqmaydi.
- [ ] Davr (Bugun / 7 kun / Oraliq), filial va taqqoslash o'zgartirilganda raqamlar o'zgaradi.
- [ ] «Sotuv jamoasi»: filial qatori bosilsa, butun panel shu filialga o'tadi; filiallar yig'indisi KPI ga teng.
- [ ] Buyurtma, operator va kuryer kartalari ochiladi.
- [ ] Signal → «Ko'rildi» ishlaydi; Sozlamalarda reja va signal chegarasi saqlanadi.
- [ ] Eksport: Excel yaratiladi va yuklab olinadi.
- [ ] *(2-bosqich)* Telegram: `/start` → bog'lash → PIN → panel; yopib qayta ochilganda PIN so'raladi; 5 xato PIN → qulf.
- [ ] *(2-bosqich)* Yangi signal ochilganda botdan xabar keladi va «Ko'rish» signallar bo'limini ochadi.
- [ ] 15 daqiqadan keyin ham panel ishlayveradi (token yangilanishi ko'rinmaydi).

## 9. Qabul mezonlari (backend tomoni)

1. `npm run contract:check -- --full` → **0 ✗**.
2. `02_BACKEND_TZ.md` §10 dagi testlar o'tadi (bot loyihasidagi testlar — 2-bosqichda).
3. §3.4 dagi ichki mosliklar avtotestlarda tekshiriladi.
4. `owner` bo'lmagan rol `/api/owner/*` ga murojaat qilsa `403` oladi. `owner_viewer` faqat ruxsat etilgan bo'lim va filiallarni ko'radi.
5. Hech bir javobda, jurnalda yoki xato matnida token, parol yoki PIN chiqmaydi.

## 10. Ochiq qarorlar (backend + egasi)

- `owner` roli platforma TZ dagi «superadmin yo'q» qoidasiga ziddek ko'rinadi. Taklif: `owner` faqat o'qiydi va boshqa panellarga kira olmaydi (`01_CONCEPT` §2). Tasdiq kerak.
- `01_CONCEPT.md` §9 dagi savollar. Javob kelguncha ulardagi taxminlar amal qiladi.
- Shartnomada yangi maydon yoki o'zgarish kerak bo'lsa: frontend jamoasiga ayting. Sxema, endpoint katalogi (`npm run endpoints:doc`) va shu tekshirgich birga yangilanadi.
