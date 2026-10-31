@AGENTS.md

# doctor_ali_owner_next — «Doctor Ali Nazorat» (boshliq paneli)

Owner (boshliq) uchun **boshqaruv va nazorat** paneli — tuzilma v2 (`../mehrigiyo_platform_tz/21_TUZILMA_V2_OWNER_FILIAL_DOSTAVKA_REJA.md`, ayniqsa §12).
Bo'limlar (9): **Umumiy · Filiallar · Moliya · Analitika · Ilova · Xodimlar · Sklad · AI tahlil · Sozlamalar**.
Reja nomlamagan bo'lim yoki funksiya qo'shilmaydi.
Mavjud loyihalar (`../mehrigiyo_*`, `../doctor_ali_clinic_next`, `../mehrigiyo_platform_tz`) **faqat o'qiladi**.

## Hujjatlar (kod yozishdan oldin)
| Fayl | Nima |
|---|---|
| `../mehrigiyo_platform_tz/21_TUZILMA_V2_…md` | **amaldagi shartnoma**: filiallar (Q · T1 · T2), B.L/B.O, umumiy dostavka, sklad = bosh kuryer, pul zanjiri, Owner sayti (§12) |
| `docs/01_CONCEPT.md` | eski konsepsiya (v1 bo'limlari) — metrikalar lug'ati (§6) uchun |
| `docs/02_BACKEND_TZ.md` | API shartnomasi — sxemalar va namunalar shunga aynan mos |
| `docs/03_FRONTEND_TZ.md` | arxitektura, tokenlar, moslashuvchanlik, holatlar |
| `docs/05_FEATURE_GUIDE.md` | **yangi bo'lim qanday quriladi** — retsept va qoidalar |
| `docs/06_ERP_INTEGRATION.md` | ERP dan olingan va yangi bo'limlar (Ombor, Hisob-kitob, Muammolar, Prognoz, AI, Ruxsatlar, Tizim), UI/harakat tizimi |
| `docs/07_BACKEND_TZ_V2.md` | shu bo'limlar uchun backend shartnomasi (AI — Claude API, ruxsatlar, xabar yuborish) |
| `docs/08_PLATFORM_ACCESS_AND_AI_OPS.md` | butun platforma akkauntlari va ruxsatlari (IAM), AI avto-tuzatish, AI chat vositalari, call-center, hudud drill-down, xodimlar reytingi |
| `design/observatory-2026-10-28/` | **amaldagi** tasdiqlangan UI — «tungi observatoriya» (Claude Design canvas artboardlari; qorong'i mavzu asosiy) |
| `design/` (ildiz) | eski birinchi prototip — faqat tarix uchun |

Skilllar: `clean-code-core` + `nextjs-clean-architecture` + `nextjs-ui` (+ grafik uchun `dataviz`).

## Tuzilma
`src/app` (yo'llar, BFF) → `src/features/<x>/{model,api,hooks,ui}` → `src/shared/{ui,lib,hooks,config,meta,domain,testing}`.
Feature boshqa featureni import qilmaydi (ESLint tekshiradi); kompozitsiya `app` da. Namuna: `src/features/overview` (eng sodda), `src/features/filials` (forma + mutatsiya).

## Buzilmaydigan qoidalar
- Har javob chegarada zod bilan tekshiriladi (`parseEnvelope` / `parseJson`); `any` yo'q.
- Token brauzer JS ga berilmaydi: sessiya httpOnly cookie da, so'rovlar BFF (`/api/owner/*`) orqali.
- Dizayn qiymatlari faqat tokenlardan (`src/app/globals.css`); hex / ixtiyoriy Tailwind qiymati yo'q.
- Har ma'lumot bloki `QueryState` ichida: skeleton · bo'sh · xato+qayta urinish · ruxsat yo'q · tayyor.
- UI matni faqat `messages/{uz,ru}/<fazo>.json` dan; ikkala til bir xil kalitlar bilan.
- Panel biznes ma'lumotini o'zgartirmaydi — istisnolar faqat rejadagilar: filial yaratish/tahrirlash, asosiy filial, B.L/B.O tayinlash (yangi akkaunt yoki mavjud o'rin), filial belgisi (`code`), dopusklar, rahbar ismi/logini, parol tiklash, atomar almashtirish (`replace/`, dopusklar ko'chadi), rahbarlikdan olish (akkaunt qoladi) — `owner/structure/*`; **sklad dopuski** (mahsulot × filial, `owner/structure/sklad-grants/`; sklad o'zi faqat ko'riladi — kirim/chiqim/viloyatlar Owner da yo'q), o'z sessiyalari. Har yozuvchi amal forma yoki tasdiq oynasi orqali. Ko'ruvchi (`owner_viewer`) uchun yozuvchi tugmalar `useCanAct()` bilan yashiriladi.
- Harakat: `motion` (`motion/react`); umumiy qismlar — `PageHeader`, `Stagger`/`Reveal`, `AnimatedNumber`, `RegionMap` (holat, ketma-ket `fillOf` yoki guruh `groupOf` rangi + `hoverDetails`). `prefers-reduced-motion` hurmat qilinadi.

## Rejimlar
**Demo (hozirgi default)** — `config/servers.mjs` dagi `DEFAULT_DEMO = true`. BFF backendga chiqmaydi: `backendFetch` → `src/shared/demo/demo-backend.server.ts` → namuna baza (`src/shared/testing/fixtures`). Kirish — alohida demo login/parol (`DEMO_CREDENTIALS`, o'sha faylda). Holat (filiallar, rahbarlar, dopusklar, AI suhbatlari) server xotirasida; qayta ishga tushirilsa boshlang'ich holatga qaytadi. AI chat javobi namuna bazadan **hisoblanadi** (`fixtures/handlers/ai-answers.ts`), ilovasi haqiqiy XLSX (`src/shared/demo/xlsx.ts`). Namuna bazani ishchi kodga faqat `src/shared/demo/` ulaydi (ESLint).

**v2 namuna to'plami** — `src/shared/testing/fixtures/structure-v2.ts` (+ sklad holati, hujjatlar va daftar `sklad-state.ts`) (filiallar Q asosiy · T1 · T2 va ularning B.L/B.O; 5 sklad = 5 bosh kuryer: Vodiy, Toshkent, Markaz, Janub, G'arb; manzil narxi 25 000; mahsulot dopuski) + hisob `v2-metrics.ts`. Har zakazning manbasi bor (`source: "app" | "operator"`): Moliya va Analitikadagi manba filtri (`?source=`) va «Ilova» bo'limi bir xil `appFlow` dan o'qiydi; ilova + operator = hammasi (aniq). Bosh kuryer sayti demo'si xuddi shu to'plamni ishlatadi. **Backend v2 hujjati hali yo'q** — `filials`, `overview`, `finance`, `analytics`, `mobile-app`, `warehouse` sxemalari (`features/*/model/*.schema.ts`) va ularning handlerlari taxminiy shartnoma; hujjat kelganda shular almashtiriladi.

**Backend bilan** — `DEFAULT_DEMO = false` yoki vaqtincha `APP_DEMO=0 npm run dev`. BFF ikki yo'lni uzatadi: `/api/owner/*` va `/api/sklad/*` (owner tokeni sklad API ga faqat o'qish uchun kiradi). Haqiqiy rejimda hamma bo'lim backenddan: `overview|finance|analytics|app /v2/`, Xodimlar — `sales/operators/` (`staff/*` backendda yo'q). Javobda yo'q blok «backend kutilmoqda» bo'lib chiqadi. Jonli javoblar nusxasi va contract test — `scripts/contract/live/`, `scripts/contract/live.test.ts`; sxema o'zgarsa shu test yiqiladi. Backendga savollar: `docs/BACKEND_SAVOLLAR_V2_2026-10-31.md`. Owner test akkaunti — `v2_owner` (TOTP). Serverlar shu faylda (`prod` — `my.imorganic.uz`, default; `test` — `imorganic.uz`); vaqtincha — `APP_SERVER=test`. Boshqa manzil uchun `BACKEND_ORIGIN` (ustun turadi).


## Sifat darvozasi
```
npm run lint && npx tsc --noEmit && npm run test
```
`next dev` / `next build` / Playwright (`npm run test:e2e`) — foydalanuvchi o'zi ishga tushiradi.
