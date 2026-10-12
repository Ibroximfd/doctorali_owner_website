# 03 — FRONTEND TZ: `doctor_ali_owner_next` («Doctor Ali Nazorat» web app)

Sana: 2026-10-02 (kod bilan moslashtirildi: 2026-10-03). Asos: `01_CONCEPT.md` (bo'limlar), `02_BACKEND_TZ.md` (API shakllari), `../design/` (UI prototip — **ko'rinish uchun yagona manba**; egasi tasdiqlagach muzlatiladi).
Kod yozishdan oldin: `clean-code-core` + `nextjs-clean-architecture` + `nextjs-ui` + `dataviz` skilllari o'qiladi.

---

## 1. Stack (mavjud Next loyihalar bilan bir xil avlod)

| Qatlam | Tanlov | Izoh |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript strict + `noUncheckedIndexedAccess` | |
| Stil | Tailwind v4 (`@theme inline`, CSS o'zgaruvchilar `src/app/globals.css`), shadcn/ui (radix-nova), `cva`, `tailwind-merge` | config fayl yo'q |
| Ma'lumot | TanStack Query 5, `ky` 2, **zod** (har javob chegarada parse) | `any` yo'q |
| URL holati | `nuqs` — davr, filial, taqqoslash, tab, jadval filtrlari | ulashiladigan havola |
| Klient holati | Zustand — faqat yon panel holati (`shared/stores/ui-store`) | server ma'lumoti store ga ko'chirilmaydi |
| Grafik | Recharts 3 (`dynamic`, `ssr:false`) + o'z `shared/ui/charts/*` o'ramlari | bitta uslub, `dataviz` qoidalari |
| Jadval | o'z `DataTable` (ustunlar — ma'lumot; telefonda kartalar). Ro'yxatlar serverda sahifalanadi, shuning uchun virtualizatsiya kerak emas | |
| i18n | `next-intl` — `uz` (asosiy), `ru` | UI da literal matn yo'q |
| Mavzu | `next-themes` (`class`), default `system` | |
| Animatsiya | faqat CSS (`tw-animate-css` + token keyframe'lar): panel/varaq ochilishi, lenta yorishishi, jonli nuqta. `prefers-reduced-motion` hurmat qilinadi. Alohida animatsiya kutubxonasi yo'q | |
| Sana | `Intl.DateTimeFormat` (`Asia/Tashkent`) — `shared/lib/format.ts`; kutubxonasiz | |
| Test | Vitest + Testing Library + **MSW** (testlarda tarmoq o'rnida); Playwright (`e2e/`, 3 viewport) | |
| Forma | `react-hook-form` + `zodResolver` (kirish, reja, xulosa vaqti) | |
| PWA | `manifest.webmanifest`, ikonlar, `display: standalone` | push — 2-bosqich |

## 2. Papka tuzilishi

```
src/
├── proxy.ts                               # kirish nazorati (Next 16: `middleware` → `proxy`)
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (panel)/layout.tsx · panel-shell.tsx   # qobiq kompozitsiyasi: signal soni, foydalanuvchi, buyurtma kartasi
│   ├── (panel)/page.tsx                   # Umumiy
│   ├── (panel)/{orders,finance,clinic,logistics,sales,app,products,customers,doctors,alerts,reports,settings,states}/page.tsx
│   ├── api/owner/[...path]/route.ts       # BFF proksi (cookie → Bearer)
│   └── api/auth/{login,verify,logout,ws-ticket}/route.ts
├── features/
│   ├── auth/ overview/ orders/ finance/ clinic/ logistics/ sales/
│   ├── mobile-app/ products/ customers/ doctors/ alerts/ reports/ settings/ states/
│   └── <feature>/{model,api,hooks,ui}/
├── shared/
│   ├── ui/           # Card, StatTile, MetricDelta, ChartCard, DataTable, BarList, StackedBar, Funnel, Drawer, states/*, shell/*, scope/*
│   ├── ui/charts/    # TrendChart, ColumnChart (Recharts, `dynamic`), chart-data (toza funksiyalar)
│   ├── lib/          # http (ky), envelope (zod), camelize, format, scope, app-error, live-channel, *.server.ts
│   ├── hooks/        # useScope/useScopeQuery, useFormat, useOnline, useOrderDrawer, useIdleTimeout, useLiveChannel
│   ├── config/       # env.ts (+ env.server.ts), routes.ts, nav.ts, order-status.ts, chart-palette.ts, regions.ts
│   ├── domain/       # bir nechta bo'lim ishlatadigan shartnoma (alert)
│   ├── meta/         # filiallar va lug'atlar (`meta/`)
│   ├── stores/       # ui-store (Zustand)
│   └── testing/      # FAQAT testlar: renderWithProviders, MSW server, `fixtures/` (namuna backend), SCOPE_CASES
├── i18n/             # locales, request (cookie), set-locale (server action)
└── messages/{uz,ru}/<fazo>.json           # (loyiha ildizida)
```
Qoida: `app → features → shared`; feature'lar bir-birini import qilmaydi (kompozitsiya `app` da). Feature ichida: `ui → hooks → api → model`.

## 3. Marshrutlar va ekranlar

| Yo'l | Ekran | Asosiy bloklar (prototipdagi tartibda) |
|---|---|---|
| `/login` | Kirish | login+parol → SMS/TOTP kod; xato, blok, kod qayta yuborish taymeri |
| `/` | Umumiy | hero tushum + reja · KPI qatori · diqqat (signallar) · tushum trendi · buyurtma oqimi · pul qayerda · filiallar · jonli lenta |
| `/orders` | Buyurtmalar | KPI · voronka · trend · manba · hududlar (tile-xarita + jadval) · atkaz sabablari · tasdiqlash kanali · bosqich vaqtlari · issiqlik jadvali · qotib qolganlar · ro'yxat (+ `?order=<id>` drawer: tafsilot + tarix lentasi) |
| `/finance` | Moliya | 4 ta asosiy ko'rsatkich · pul qayerda · kirim/chiqim · to'lov usullari · xarajatlar · majburiyatlar · qarzlar · kassa yopilishi |
| `/clinic` | Klinika | filial segmenti · KPI · tushum tarkibi · tashriflar · shifokorlar · ombor · kassa/davomat |
| `/logistics` | Yetkazib berish | KPI · kuryerlar jadvali · kunlik trend · hududlar · urinish sabablari · kechikkanlar · transferlar |
| `/sales` | Sotuv jamoasi | KPI · **filiallar — operator jamoalari** (jadval: qator bosilsa panel shu filialga o'tadi) · filiallar sotuvi dinamikasi · sotuvdagi ulush · operatorlar reytingi (+ drawer) · lid voronkasi · manbalar · qo'ng'iroqlar · baholar |
| `/app` | Mobil ilova | KPI · foydalanuvchilar trendi · platforma/versiya/til · voronkalar · konsultatsiyalar · faollik · ball/sovg'a · shifokor ilovasi |
| `/products` | Mahsulotlar | top jadval · toifalar · ombor ogohlantirishlari |
| `/customers` | Mijozlar | KPI · yangi/qaytgan · kogorta jadvali · top mijozlar · hududlar |
| `/doctors` | Shifokorlar | jadval + ko'rsatkichlar |
| `/alerts` | Signallar | daraja filtri · ro'yxat · «ko'rildi» · qoidalar xulosasi |
| `/reports` | Hisobotlar | tayyor hisobotlar · eksport holati · Telegram xulosa |
| `/settings` | Sozlamalar | reja · signal chegaralari · kirish huquqlari · sessiyalar · til/mavzu |

## 4. Global holat — «scope» (davr · filial · taqqoslash)

- `useScope()` (`shared/hooks/use-scope`; global bo'lgani uchun feature emas) URL dan o'qiydi/yozadi: `?period=30d&filial=1,2&compare=previous` (`custom` da `from`/`to`).
- Har query kaliti scope ni o'z ichiga oladi: `orderKeys.summary(scope)`. Scope o'zgarsa hamma blok **bitta** tilim bilan qayta yuklanadi.
- Qayta yuklashda skeleton **emas** — oldingi render 60% shaffoflikda turadi (`placeholderData: keepPreviousData`), joylashuv sakramaydi.
- `staleTime`: bugunni qamragan davr — 60 s (+ `refetchInterval` 60 s, tab ko'rinib turganda); tarixiy — 10 daqiqa.
- **Filiallarni taqqoslaydigan bloklar** (`/sales` dagi filiallar jadvali, dinamikasi, ulushi) `useAllFilialsQuery()` dan foydalanadi: davr va taqqoslash amal qiladi, `filial` esa so'rovga kirmaydi — filial tanlanganda ham ro'yxat to'liq qoladi va qayta yuklanmaydi. Qatorni bosish — `useFilialFocus().toggle(id)`: global filtr shu bitta filialga o'tadi (URL da `?filial=3`), tanlangan qator `aria-pressed` + fon bilan ajraladi, yana bosilsa yoki «Barcha filiallar» — filtr olinadi.
- Har sahifa sarlavhasida «Yangilandi: 14:05» (`generated_at`) va jonli nuqta (WS ulangan bo'lsa).

## 5. Auth va xavfsizlik (BFF)

Moliyaviy ma'lumot — token brauzer JS ga **berilmaydi**:
- `app/api/auth/*` route handlerlar backendga murojaat qiladi va `access`/`refresh` ni **httpOnly, Secure, SameSite=Strict** cookie ga yozadi.
- `app/api/[...path]/route.ts` — `/api/owner/*` ni backendga proksilaydi, cookie dan `Authorization: Bearer` qo'yadi; 401 da bir marta refresh qilib qayta urinadi; refresh ham o'tmasa cookie tozalanadi → `/login`.
- `src/proxy.ts` — cookie yo'q bo'lsa `(panel)` → `/login?next=…` (yupqa; faqat mavjudlik tekshiruvi — haqiqiy nazorat BFF da).
- WS: `GET /api/auth/ws-ticket` qisqa muddatli (60 s) ticket beradi → `wss://…/ws/owner/?token=<ticket>`.
- Sessiya eslab qolinadi (egasi qarori, 2026-10-10): harakatsizlikda chiqarilmaydi; refresh cookie 14 kun, har yangilanishda muddati qaytadan boshlanadi. `useIdleTimeout` faqat Telegram mini app qulfi uchun. `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`.
- BFF backendga `X-Lang: uz|ru` yuboradi (server matnlari — signal sarlavhasi va h.k. — shu tilda keladi).
- `env.ts` / `env.server.ts` (zod): `APP_SERVER` (server-only; `config/servers.mjs` dagi nom — `prod` default, `test`), `BACKEND_ORIGIN` (server-only, ixtiyoriy — serverdan ustun), `NEXT_PUBLIC_WS_URL` (ixtiyoriy), `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (ixtiyoriy), `TELEGRAM_BOT_TOKEN` (server-only, faqat namuna rejimida initData imzosini tekshirish uchun).

### 5.1 Telegram mini app (PIN bilan kirish) — 2026-10-05
Shartnoma: `../doctor_ali_owner_bot/docs/` (`01_CONCEPT`, `02_BACKEND_TZ`). Mini app — shu panelning o'zi, faqat kirish boshqacha.
- **`/tg`** — kirish nuqtasi (bot tugmasi shu manzilni ochadi; `src/proxy.ts` uni yo'naltirmaydi). `features/telegram/ui/telegram-entry.tsx`: Telegram SDK → `POST /api/auth/telegram/status` → bog'lanmagan bo'lsa parol + SMS (`auth` dagi `LoginForm`, `onSignedIn` bilan) → PIN o'rnatish (2 marta) → `link`; bog'langan bo'lsa → PIN → `login`; qulflangan bo'lsa — qolgan vaqt. Kirgach `?next=` ga (`safeNextPath`).
- BFF: `app/api/auth/telegram/{status,login,link}` → backend `/api/owner/telegram/*`. **`status` har chaqirilganda oldingi sessiyani yopadi** — PIN har ochilishda so'raladi. Telegram sessiyasi: refresh 12 soat, `da_owner_channel=tg` belgisi (httpOnly emas, sir emas).
- Panel ichida (`features/telegram/ui/telegram-runtime.tsx`, `panel-shell` da): Telegram mavzusi va ranglari, tizim «orqaga» tugmasi, **60 s dan ortiq fonda** yoki **5 daqiqa harakatsizlik** → chiqish → `/tg?next=<joriy sahifa>` (PIN). Sessiya tugasa ham `/login` emas, `/tg` ga (`shared/lib/channel.ts`).
- Telegram Web (`web.telegram.org`) qo'llanmaydi: u freym ichida ochadi, panel esa `X-Frame-Options: DENY`.

## 6. Ma'lumot qatlami

- `features/x/model` — zod sxemalar `02_BACKEND_TZ` dagi shakllarda (`metricSchema`, `envelopeSchema(dataSchema)`); tiplar `z.infer`.
- `features/x/api` — `ky` chaqiruv + `schema.parse`; xato → `AppError {kind: 'network'|'unauthorized'|'forbidden'|'validation'|'server', code, message}` (qiymat sifatida qaytadi/otiladi — UI `ErrorState` ko'rsatadi).
- Noma'lum enum qiymati (yangi status/sabab) crash qilmaydi — «noma'lum» label.
- **Faqat API** (2026-10-12): ekrandagi har raqam backenddan (`/api/owner/*` BFF orqali) keladi. Namuna rejimi kodda yo'q; namuna ma'lumot faqat testlarda (`shared/testing/fixtures`, MSW orqali), ishchi kod uni import qilsa ESLint xato beradi. Ma'lumot yo'q bo'lsa — «—» yoki bo'sh holat, hech qachon soxta raqam emas.
- Kalitlar chegarada `camelCase` ga o'tadi (`shared/lib/camelize`) — UI `snake_case` ko'rmaydi, har endpoint uchun qo'lda mapper yozilmaydi.

## 7. Dizayn tizimi (tokenlar — prototipdan)

Barcha rang/o'lcham **tokendan**; komponentda hex/px qo'lda yozilmaydi. Tokenlar `globals.css` da (`:root` + `.dark`), Tailwind `@theme inline` orqali utility bo'ladi.

**Chrome (neytral, brend yashiliga og'ishgan):**
| Token | Yorug' | Qorong'i |
|---|---|---|
| `--bg` (sahifa) | `#f3f5f3` | `#0c0f0d` |
| `--surface` (karta) | `#ffffff` | `#141815` |
| `--surface-2` / `--surface-3` | `#f7f9f7` / `#edf0ed` | `#191e1a` / `#202622` |
| `--border` / `--border-strong` | `#e1e5e1` / `#cbd2cc` | `#262d28` / `#374139` |
| `--ink` / `--ink-2` / `--ink-3` | `#111613` / `#48524b` / `#727c75` | `#f1f5f2` / `#b4beb7` / `#828d86` |
| `--accent` / `--accent-ink` / `--accent-soft` | `#17694a` / `#ffffff` / `#e2f1e9` | `#4fc48f` / `#06140d` / `#143021` |

**Buyurtma bosqichlari** (platforma shartnomasidagi tokenlar, validator bilan tekshirilgan qadamlar):
| Token | Yorug' | Qorong'i |
|---|---|---|
| `--order-pending` | `#e08e0b` | `#c98500` |
| `--order-confirmed` | `#0a8fa3` | `#12a3a3` |
| `--order-shipping` | `#4f63d8` | `#6c74ee` |
| `--order-delivered` | `#2fa862` | `#3dab6b` |
| `--order-cancelled` | `#b3261e` | `#c24040` |

**Grafik seriyalari** (kategorik, tartib qat'iy — rang obyektga biriktiriladi, tartibga emas): `--series-1…8` = ko'k `#2a78d6` · to'q sariq `#eb6834` · akva `#1baf7a` · sariq `#eda100` · pushti `#e87ba4` · yashil `#008300` · binafsha `#4a3aa7` · qizil `#e34948` (qorong'i qadamlar prototip CSS ida). Kanallar: Yetkazib berish = 1, Klinika = 2, Konsultatsiya = 3.
**Holat (semantik):** `--good` · `--warn` · `--serious` · `--crit` — har doim **ikon + matn** bilan, faqat rang emas.
**Tipografiya:** `Onest` (UI, sarlavha, katta raqamlar) + `Geist Mono` (jadval raqamlari, ID) — `next/font/google`. Katta raqamlar proporsional; `tabular-nums` faqat ustunlarda.
**Shakl:** radius 8/12/16; karta — 1px chegara, soya yo'q (faqat qalqib chiquvchilar soyali); oraliq shkalasi 4-ga karrali.

### 7.1 Grafik qoidalari (`dataviz`)
- Bitta o'q (ikki o'qli grafik yo'q); ustun ≤ 24px, uchi 4px yumaloq; chiziq 2px; to'r — 1px yaxlit, sust.
- ≥ 2 seriya → legend har doim; yozuvlar — matn tokenlarida, rang faqat belgida.
- Har grafik: hover/fokus tooltip (chiziqda — crosshair, hamma seriya) **va** «Jadval» ko'rinishi (tooltip yagona yo'l emas).
- Filtrlar — sahifa tepasida bitta qatorda; grafik kartasi ichida filtr yo'q.
- Bitta raqam — grafik emas, `StatTile`. Yaqin qiymatlar uchun donut ishlatilmaydi (`StackedBar`/`BarList`).

## 8. Moslashuvchanlik (xatosiz ishlashi shart bo'lgan 3 joylashuv)

| Kenglik | Joylashuv |
|---|---|
| **< 768** (telefon) | Pastki tab-bar: Umumiy · Buyurtmalar · Moliya · Signallar · Yana (sheet — qolgan bo'limlar). Yuqorida ixcham sarlavha + davr chipi; filtrlar bottom-sheet da. KPI — 2 ustun. Jadvallar → **karta ro'yxati**. Drawer → to'liq ekran sheet. Grafik balandligi 200px, o'q yozuvlari siyraklashadi. Teginish nishoni ≥ 44px. `env(safe-area-inset-*)` hisobga olinadi. |
| **768–1279** (planshet/kichik noutbuk) | Yig'ilgan sidebar (ikon rail 64px), KPI 3 ustun, kontent 2 ustun. |
| **≥ 1280** (desktop) | To'liq sidebar 248px (yig'ish mumkin), KPI 6 ustun, kontent 12-ustunli grid; ≥ 1600 da maks. kenglik 1560px, markazda. |

Tekshiriladigan nuqtalar: 360, 390, 768, 1024, 1280, 1440, 1920. Sahifa tanasi **hech qachon gorizontal aylanmaydi**; keng jadval faqat o'z konteynerida aylanadi.

## 9. Holatlar galereyasi (har ma'lumot blokida)

| Holat | Ko'rinish |
|---|---|
| skeleton | haqiqiy kontent shaklida (KPI, grafik, jadval qatorlari) — faqat birinchi yuklashda |
| ready | kontent |
| empty | «Bu davrda ma'lumot yo'q» + davrni kengaytirish tugmasi |
| no-results | «Filtrga mos kelmadi» + «Filtrlarni tozalash» |
| error | bitta tushunarli gap + «Qayta urinish» (o'sha query) — blok darajasida, butun sahifa yiqilmaydi |
| offline | neytral banner: «Internet yo'q — oxirgi ma'lumot 14:05 dagi», keshdagi kontent ko'rinadi |
| stale | `freshness` 10 daqiqadan eski bo'lsa blokda «eskirgan» belgisi |
| forbidden | (`owner_viewer`) «Bu bo'lim sizga ochilmagan» |

Komponentlar `shared/ui/states/*` da bir marta yoziladi va hamma joyda qayta ishlatiladi.

## 10. Qulaylik (a11y)
Semantik HTML, bitta `h1`; klaviatura bilan to'liq boshqaruv; ko'rinadigan fokus halqasi; ikon-tugmalarda `aria-label`; kontrast ≥ 4.5:1; jonli yangilanishlar `aria-live="polite"`; jadval qatori — haqiqiy `button`/`a`; `⌘K` buyruqlar palitrasi (bo'lim, buyurtma raqami, operator, kuryer qidirish).

## 11. Sifat darvozasi va testlar
```
npm run lint && npx tsc --noEmit && npm run test
```
- Vitest: `shared/lib/format` (pul/son/delta), `metric` hisoblari, scope ↔ URL, zod parse (to'g'ri/noto'g'ri fixture), har feature hook (MSW).
- Komponent: `StatTile`, `ChartCard` (jadval ko'rinishiga o'tish), holatlar galereyasi.
- Playwright (`e2e/`, test backendda; akkaunt `E2E_USERNAME` / `E2E_PASSWORD` dan): kirish/chiqish; har bo'lim xatosiz ochilishi va 390 / 768 / 1440 da gorizontal scroll yo'qligi; qorong'i mavzu; davr bo'limdan bo'limga saqlanishi; buyurtma kartasi; telefon tab-bari.
- `next build`/dev server — foydalanuvchi o'zi ishga tushiradi.

## 12. Deploy (taklif)
Mavjud loyihalardagidek: Dockerfile + nginx, `APP_SERVER=test|prod`, alohida subdomen (masalan `boss.` / `nazorat.`). BFF sababli **statik eksport emas** — Node server (`next start`) kerak.
