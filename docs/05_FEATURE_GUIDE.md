# 05 — Feature qurish yo'riqnomasi (kod yozuvchi uchun)

Poydevor tayyor. Har yangi bo'lim **`src/features/overview/`** dagi namunaga aynan o'xshab quriladi. Avval shu papkadagi barcha fayllarni o'qing — bu hujjat faqat xarita.

## 0. O'qish tartibi (kod yozishdan oldin)
1. Skilllar: `~/.claude/skills/clean-code-core/SKILL.md`, `~/.claude/skills/nextjs-clean-architecture/SKILL.md` (+ `references/data-layer.md`, `references/folder-structure.md`, `references/testing.md`), `~/.claude/skills/nextjs-ui/SKILL.md` (+ `references/component-patterns.md`).
2. Next 16: `AGENTS.md` qoidasi — o'zgargan API uchun `node_modules/next/dist/docs/01-app/` ga qarang (`params`/`searchParams` — `Promise`; `middleware` → `proxy`; global `PageProps` helperlari **ishlatilmaydi**, tiplar qo'lda yoziladi).
3. Shartnoma: `docs/02_BACKEND_TZ.md` (endpoint shakllari), `docs/01_CONCEPT.md` §6 (metrika ta'riflari).
4. Ko'rinish: `design/pages-*.js` + `design/data.js` — **tasdiqlangan prototip**; bloklar tarkibi, tartibi va matnlari shundan olinadi.
5. Namuna: `src/features/overview/**`, `src/shared/ui/**`, `src/shared/mocks/{engine,sample,types}.ts`, `src/shared/mocks/handlers/overview.ts`.

## 1. Bitta feature tarkibi
```
src/features/<x>/
├── model/<x>.schema.ts     # zod sxemalar (snake_case — simdagi shakl) + `Camelized<z.infer<…>>` tiplar
├── model/<x>.rules.ts      # toza funksiyalar (hisob, saralash, xaritalash) — React yo'q
├── model/<x>.test.ts       # shartnoma testi (mock ↔ sxema) + qoidalar testi
├── api/<x>.api.ts          # apiGet/apiSend + parseEnvelope/parseJson — domen tipini qaytaradi
├── hooks/use-<x>.ts        # kalit fabrikasi + useQuery/useMutation
└── ui/*.tsx                # bloklar + `<x>-screen.tsx` (+ `<x>-screen.test.tsx`)
src/shared/mocks/handlers/<x>.ts   # shu bo'lim namunalari (`MockHandler[]`)
messages/{uz,ru}/<x>.json          # shu bo'lim tarjimalari
src/app/(panel)/<x>/page.tsx       # server komponent: PageHeader + <XScreen/>
```
Qatlam: `ui → hooks → api → model`. Feature boshqa featureni import **qilmaydi** (ESLint xato beradi); `shared` hech kimni tanimaydi. Kompozitsiya — `app` da.

## 2. Ma'lumot oqimi (namunadan nusxa oling)
```ts
// model: simdagi shakl snake_case; UI camelCase ko'radi
export const ordersSummarySchema = z.object({ orders: metricSchema, cancel_rate: metricSchema });
export type OrdersSummary = Camelized<z.infer<typeof ordersSummarySchema>>;

// api: chegara — tekshiruv shu yerda, `as` yo'q
export const loadOrdersSummary = async (params: QueryParams): Promise<Envelope<OrdersSummary>> =>
  parseEnvelope(ordersSummarySchema, await apiGet("orders/summary/", params));

// hooks: scope har doim kalitda; kesh qoidalari `useScopeQuery` dan
export const useOrdersSummaryQuery = () => {
  const { params, key, options } = useScopeQuery();
  return useQuery({ queryKey: orderKeys.summary(key), queryFn: () => loadOrdersSummary(params), ...options });
};
```
- Konvertli javob (`{period, compare, filials, generated_at, freshness, data}`) → `parseEnvelope(schema, json)`; konvertsiz (ro'yxat, sozlama) → `parseJson(schema, json)`.
- Metrika: `metricSchema` → `{ value, previous, deltaPct }`. Vaqt qatori: `timeseriesSchema` → `{ labels, series:[{key, values}], compare }`.
- Yo'l `/api/owner/` ga nisbatan, **boshida `/` siz, oxirida `/` bilan**: `apiGet("orders/summary/", params)`.
- Davrga bog'liq bo'lmagan so'rov (hozirgi holat, sozlama) `useScopeQuery` siz, o'z `staleTime` bilan yoziladi.
- Filiallarni **o'zaro taqqoslaydigan** so'rov (har filial — bir qator/seriya) `useAllFilialsQuery()` bilan yoziladi: `filial` filtri so'rovga ham, kalitga ham kirmaydi. Namuna: `features/sales` → `useSalesFilialsQuery`.
- Noma'lum enum qiymati (yangi status/sabab) yiqitmaydi: sxemada `z.string()`, UI da tarjima bo'lmasa — qiymatning o'zi yoki "noma'lum".
- Mutatsiya: `useMutation`; muvaffaqiyatda tegishli kalit invalidatsiya qilinadi; natija `sonner` `toast` bilan (`common.saved` / `common.saveFailed`).

## 3. Namuna (mock) qatlam
`src/shared/mocks/handlers/<x>.ts` — `MockHandler[]`. Javob **aynan `02_BACKEND_TZ` shaklida** (snake_case).
```ts
export const ordersHandlers: MockHandler[] = [
  { method: "GET", path: "orders/summary/", resolve: (ctx) => envelope(ctx, { orders: ctx.metric(ctx.flow(sample.kpi.orders), 8.4, "count"), … }) },
  { method: "GET", path: "orders/:id/", resolve: (ctx) => found ?? mockError(404, "order_not_found") },
];
```
Yordamchilar (`engine.ts`): `envelope(ctx, data)`, `apportion(total, weights)` (bo'laklar yig'indisi aynan `total` — KPI va uning ro'yxati farq qilmasin), `sparkline(seed)`.
`ctx`: `flow(n)` — davr×filial bo'yicha masshtab (oqim: soni, summa); `stock(n)` — faqat filial (hozirgi holat); `metric(value, deltaPct, unit)`; `series(total, seed)` — `ctx.period.labels` ga mos qator; `period.{labels,granularity,scale}`; `filials`, `isAllFilials`; `searchParams`, `params`, `body`; `now`.
Raqamlar `sample.ts` dan (faqat o'qiladi; yetishmasa — o'z handler faylingizga qo'shing). Yozuvchi endpointlar holatni modul ichida saqlaydi (`alerts.ts` ga qarang).

## 4. UI to'plami (`src/shared/ui`) — qayta yozmang, ishlating
| Komponent | Vazifa |
|---|---|
| `PageHeader` | sahifa sarlavhasi (bitta `h1`) |
| `Grid`, `span.{full,c8,c7,c6,c5,c4,half6,half4}` | sahifa to'ri (1 / 2 / 12 ustun) |
| `Card`, `CardHeader`, `CardBody` (`flush` — jadval/ro'yxat uchun) | karta |
| `StatRow` (`columns={4\|6}`), `StatTile` | KPI qatori: `label, value, unit, delta, invertDelta, deltaUnit="pp", note, sparkline` |
| `MetricDelta` | o'zgarish belgisi (`invert` — o'sish yomon bo'lsa) |
| `ChartCard` | grafik kartasi: `kind="trend"\|"columns"`, `data: ChartData`, `formatValue`, `formatAxis`, `columnLabel`, `showTotal`, `footer` — legend va grafik↔jadval almashtirgich ichida |
| `BarList` | gorizontal ustunlar ro'yxati (`items`, `format`, `showShare`, `barClassName`) |
| `StackedBar` | butunning qismlari (`legend="row"\|"column"\|"block"`) |
| `Funnel` | voronka (`steps`, `renderTransition`) |
| `Meter` | chegaraga nisbat (`value`, `marker`, `tone`) |
| `Heatmap`, `RegionTiles`, `SeqScale` | issiqlik jadvali, 14 viloyat plitkalari |
| `DataTable` | ustunlar — ma'lumot; telefonda kartalar; `onRowClick`, `rowLabel`, `footer`; `isRowSelected` — qator almashtiruvchi tugma bo'lsa (`aria-pressed` + fon) |
| `KvList`, `MiniStats`, `MiniBar`, `CardLink`, `Banner`, `Pill`, `StageBadge`, `UserCell`, `Avatar`, `Rating`, `Chip`, `Segmented`, `Switch`, `Input`, `Field`, `Button` (`intent="danger"` — qaytarib bo'lmaydigan amal), `Tip` | mayda qismlar |
| `Drawer`, `DrawerSection`, `Sheet`, `Popover*` | qalqib chiquvchilar (Radix) |
| `AlertItem` | signal qatori |
| `QueryState` + `StatRowSkeleton`, `ChartSkeleton`, `ListSkeleton`, `TableSkeleton`, `BlockSkeleton`, `EmptyState`, `NoResults`, `ErrorState`, `StateBlock` | **holatlar galereyasi** |
| `ScopeLink` | ichki havola (filtrni saqlaydi) |

Hooklar: `useScopeQuery`, `useAllFilialsQuery` (filial filtrisiz), `useFilialFocus` (`toggle(id)`, `isFocused(id)`, `clear()`, `hasFocus` — panelni bitta filialga toraytirish), `useScope`, `useFormat` (`money`, `moneyCompact`, `duration`, `time`, `date`, `dateTime`, `bucket`, `month`, `currency`), `usePeriodLabel`, `useRelativeTime`, `useOrderDrawer` (`openOrder(id)`), `useMetaQuery`.
Format: `formatNumber`, `formatPercent`, `formatDecimal`, `formatPhone` (`shared/lib/format`). Ranglar: `seriesColor(i)`, `seriesBg(i)`, `STATUS_COLORS`, `orderStatusStyle(status)` (`shared/config`).

## 5. Majburiy qoidalar
- **Holatlar:** har ma'lumot bloki `QueryState` ichida — skeleton (haqiqiy shaklda) · bo'sh · xato+qayta urinish · ruxsat yo'q · tayyor. Filtrli ro'yxatda natija bo'lmasa — `NoResults` (+ tozalash). Blok xatosi sahifani yiqitmaydi.
- **Tokenlar:** hex / `px` / ixtiyoriy qiymat (`text-[13px]`, `bg-[#…]`) **yo'q**. Faqat `globals.css` dagi tokenlardan kelgan utilitylar. `style` — faqat hisoblangan qiymat (kenglik %, seriya rangi) uchun, izoh bilan.
- **Matn:** UI da literal satr yo'q — `useTranslations("<namespace>")`; ikkala til (`uz`, `ru`) bir xil kalitlar bilan (test tekshiradi). Pul/son/sana — faqat formatlovchi orqali.
- **Grafik:** bitta o'q; bitta raqam — `StatTile`; ≥2 seriya — legend; nominal toifalar bitta rangda (`BarList`); holat ranglari faqat holat ma'nosida; har grafikning jadval egizagi bor (`ChartCard` beradi). Kanallar rangi: `CHANNEL_COLOR`.
- **a11y:** semantik teglar, ikon-tugmada `aria-label`, bosiladigan qator — `DataTable onRowClick` (klaviatura bilan ishlaydi), rang yolg'iz signal emas.
- **Moslashuvchanlik:** telefon (360) → desktop (1920); sahifa gorizontal aylanmaydi; keng jadval `DataTable` bilan kartaga aylanadi.
- **`'use client'`** faqat hook/hodisa ishlatadigan faylda. `page.tsx` — server komponent.
- `any` yo'q, `as` faqat izoh bilan; `import type`; nomlangan eksport (`app/**` dan tashqari).
- Panel **faqat o'qish**: buyurtma/kassa ma'lumotini o'zgartiruvchi amal yo'q (istisno — o'z sozlamalari va signal "ko'rildi").

## 6. Testlar (har featureda)
- `model/<x>.test.ts`: har endpoint namunasi sxemadan o'tadi — `SCOPE_CASES` ning hammasida (`mockGet`, `shared/testing/mock-api`); raqamlar izchilligi (yig'indi = jami); qoidalar.
- `ui/<x>-screen.test.tsx` (`// @vitest-environment jsdom`): `useMockApi()` + `renderWithProviders(<XScreen/>)` — asosiy bloklar ko'rinadi; bitta blok xatosi (`failNext("path/")`) qolganini yiqitmaydi; filtr/drawer kabi asosiy o'zaro ta'sir.
- So'rov rol va nom bo'yicha (`getByRole`, `getByText`), `data-testid` emas.

## 7. Shartnoma o'zgarsa
Sxema yoki namunaga maydon qo'shsangiz: `docs/02_BACKEND_TZ.md` §12 ga yozing va `npm run samples` bilan `docs/api-samples/` ni qayta yarating — backend jamoasi shu ikkisidan o'qiydi.

## 8. Tekshiruv
```
npx tsc --noEmit
npx eslint src/features/<x> src/shared/mocks/handlers/<x>.ts "src/app/(panel)/<x>" --max-warnings=0
npx vitest run src/features/<x> src/i18n
```
`next build` / `next dev` **ishga tushirilmaydi** — ilovani foydalanuvchi o'zi ishga tushiradi.
