@AGENTS.md

# doctor_ali_owner_next — «Doctor Ali Nazorat» (boshliq paneli)

Boshliq uchun **faqat ko'rish** paneli: buyurtmalar, moliya, klinika, yetkazib berish, sotuv, mobil ilova — hamma filial bir joyda.
Mavjud loyihalar (`../mehrigiyo_*`, `../doctor_ali_clinic_next`, `../mehrigiyo_platform_tz`) **faqat o'qiladi**.

## Hujjatlar (kod yozishdan oldin)
| Fayl | Nima |
|---|---|
| `docs/01_CONCEPT.md` | bo'limlar, signallar, **metrikalar lug'ati** (§6) |
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
Feature boshqa featureni import qilmaydi (ESLint tekshiradi); kompozitsiya `app` da. Namuna: `src/features/overview`.

## Buzilmaydigan qoidalar
- Har javob chegarada zod bilan tekshiriladi (`parseEnvelope` / `parseJson`); `any` yo'q.
- Token brauzer JS ga berilmaydi: sessiya httpOnly cookie da, so'rovlar BFF (`/api/owner/*`) orqali.
- Dizayn qiymatlari faqat tokenlardan (`src/app/globals.css`); hex / ixtiyoriy Tailwind qiymati yo'q.
- Har ma'lumot bloki `QueryState` ichida: skeleton · bo'sh · xato+qayta urinish · ruxsat yo'q · tayyor.
- UI matni faqat `messages/{uz,ru}/<fazo>.json` dan; ikkala til bir xil kalitlar bilan.
- Panel biznes ma'lumotini o'zgartirmaydi (istisno: o'z sozlamalari, signal "ko'rildi", mas'ulga xabar, AI topilmasiga baho, ruxsat berish — faqat boshliq). Ko'ruvchi (`owner_viewer`) uchun yozuvchi tugmalar `useCanAct()` bilan yashiriladi.
- Harakat: `motion` (`motion/react`); umumiy qismlar — `SectionHero`, `Stagger`/`Reveal`, `AnimatedNumber`, `RegionMap`, `shared/ui/illustrations`. `prefers-reduced-motion` hurmat qilinadi.

## Rejimlar
**Demo (hozirgi default)** — `config/servers.mjs` dagi `DEFAULT_DEMO = true`. BFF backendga chiqmaydi: `backendFetch` → `src/shared/demo/demo-backend.server.ts` → namuna baza (`src/shared/testing/fixtures`, javoblar shartnomaga aynan mos). Kirish — alohida demo login/parol (`DEMO_CREDENTIALS`, o'sha faylda). Holat (ko'rildi, ruxsatlar, AI suhbatlari, eksportlar) server xotirasida; qayta ishga tushirilsa boshlang'ich holatga qaytadi. Hisobot va AI ilovalari haqiqiy XLSX/PDF bo'lib yuklanadi (`src/shared/demo/xlsx.ts`, `pdf.ts`). AI chat javobi savol mavzusiga qarab (`fixtures/handlers/ai-answers.ts`). Namuna bazani ishchi kodga faqat `src/shared/demo/` ulaydi (ESLint).

**Backend bilan** — `DEFAULT_DEMO = false` yoki vaqtincha `APP_DEMO=0 npm run dev`. Serverlar shu faylda (`prod` — `my.imorganic.uz`, default; `test` — `imorganic.uz`); vaqtincha — `APP_SERVER=test`. Boshqa manzil uchun `BACKEND_ORIGIN` (ustun turadi).

**Telegram mini app:** `/tg` (PIN bilan kirish) — `src/features/telegram`, shartnoma `../doctor_ali_owner_bot/docs/`. Bu loyiha botning o'zini o'z ichiga olmaydi.

## Sifat darvozasi
```
npm run lint && npx tsc --noEmit && npm run test
```
`next dev` / `next build` / Playwright (`npm run test:e2e`) — foydalanuvchi o'zi ishga tushiradi.
