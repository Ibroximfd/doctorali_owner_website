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
| `design/` | tasdiqlangan UI prototip (ko'rinish uchun yagona manba) |

Skilllar: `clean-code-core` + `nextjs-clean-architecture` + `nextjs-ui` (+ grafik uchun `dataviz`).

## Tuzilma
`src/app` (yo'llar, BFF) → `src/features/<x>/{model,api,hooks,ui}` → `src/shared/{ui,lib,hooks,config,mocks,meta,domain}`.
Feature boshqa featureni import qilmaydi (ESLint tekshiradi); kompozitsiya `app` da. Namuna: `src/features/overview`.

## Buzilmaydigan qoidalar
- Har javob chegarada zod bilan tekshiriladi (`parseEnvelope` / `parseJson`); `any` yo'q.
- Token brauzer JS ga berilmaydi: sessiya httpOnly cookie da, so'rovlar BFF (`/api/owner/*`) orqali.
- Dizayn qiymatlari faqat tokenlardan (`src/app/globals.css`); hex / ixtiyoriy Tailwind qiymati yo'q.
- Har ma'lumot bloki `QueryState` ichida: skeleton · bo'sh · xato+qayta urinish · ruxsat yo'q · tayyor.
- UI matni faqat `messages/{uz,ru}/<fazo>.json` dan; ikkala til bir xil kalitlar bilan.
- Panel biznes ma'lumotini o'zgartirmaydi (istisno: o'z sozlamalari, signal "ko'rildi").

## Rejimlar
`NEXT_PUBLIC_API_MOCKING=1` — backendsiz, `src/shared/mocks` javob beradi (istalgan login/parol, istalgan 6 xonali kod).
`NEXT_PUBLIC_API_MOCKING=0` — haqiqiy backend. Serverlar yagona faylda: **`config/servers.mjs`** (`prod` — `my.imorganic.uz`, default; `test` — `imorganic.uz`). Doimiy almashtirish — shu fayldagi `DEFAULT_SERVER`; vaqtincha — `APP_SERVER=test npm run dev`. Boshqa manzil uchun `BACKEND_ORIGIN` (ustun turadi).

**Telegram mini app:** `/tg` (PIN bilan kirish) — `src/features/telegram`, shartnoma `../doctor_ali_owner_bot/docs/`. Bu loyiha botning o'zini o'z ichiga olmaydi.

## Sifat darvozasi
```
npm run lint && npx tsc --noEmit && npm run test
```
`next dev` / `next build` / Playwright (`npm run test:e2e`) — foydalanuvchi o'zi ishga tushiradi.
