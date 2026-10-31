# doctor_ali_owner_next — «Doctor Ali Nazorat» (boshliq paneli)

Owner uchun boshqaruv va nazorat paneli (tuzilma v2): call-center filiallari va ularning rahbarlari, pul zanjiri (kuryer → bosh kuryer → filial), analitika, xodimlar, umumiy sklad, AI tahlil va AI chat.

Bo'limlar: **Umumiy · Filiallar · Moliya · Analitika · Ilova · Xodimlar · Sklad · AI tahlil · Sozlamalar**.
Mavjud loyihalar (`mehrigiyo_*`, `doctor_ali_clinic_next`, `mehrigiyo_platform_tz`) bu loyiha uchun **faqat o'qiladi**.

## Ishga tushirish
```bash
npm install
```
```bash
npm run dev
```
Panel faqat backend bilan ishlaydi (namuna rejimi yo'q): http://localhost:3000 — kirish backend bergan login va parol bilan. Server — `config/servers.mjs`.

### Jonli hodisalar (ixtiyoriy)
`.env.local`:
```
NEXT_PUBLIC_WS_URL=wss://my.imorganic.uz/ws/owner/
```

### Serverni almashtirish
Serverlar yagona faylda: **`config/servers.mjs`**.

| Nom | Backend | Panel porti |
|---|---|---|
| `prod` — **default** | `https://my.imorganic.uz` | 3000 |
| `test` | `https://imorganic.uz` | 3001 |

- **Doimiy:** `config/servers.mjs` → `DEFAULT_SERVER = "prod"` qatorini o'zgartirasiz.
- **Vaqtincha** (faylga tegmasdan): `APP_SERVER=test npm run dev`, `APP_SERVER=test npm run build`.

Ishga tushganda terminalda qaysi server ekani yozilib turadi: `Backend: Production — https://my.imorganic.uz`.
Noma'lum nom berilsa (`APP_SERVER=staging`) ilova jimgina ishlamaydi — xato beradi va mavjud nomlarni aytadi.
Nomlanganlardan boshqa manzil (lokal backend) kerak bo'lsa — `BACKEND_ORIGIN=http://127.0.0.1:8000`; u `APP_SERVER` dan ustun.
Backend `docs/02_BACKEND_TZ.md` dagi `/api/owner/*` ni bergan bo'lishi kerak. Brauzer backendga to'g'ridan-to'g'ri murojaat qilmaydi: so'rovlar shu ilovaning BFF qatlami (`/api/owner/*`) orqali o'tadi, token httpOnly cookie da.

## Tekshiruv
```bash
npm run lint && npx tsc --noEmit && npm run test
```
E2E (avval `npm run dev` ishlab turgan bo'lsin):
```bash
npx playwright install chromium
```
```bash
npm run test:e2e
```

## Tarkib
| Yo'l | Nima |
|---|---|
| `../mehrigiyo_platform_tz/21_TUZILMA_V2_OWNER_FILIAL_DOSTAVKA_REJA.md` | **Amaldagi reja** (tuzilma v2, §12 — Owner sayti) |
| `docs/01_CONCEPT.md` | Eski konsepsiya (v1): metrikalar lug'ati |
| `docs/02_BACKEND_TZ.md` | Backend jamoasi uchun: `owner` roli, `/api/owner/*`, agregat jadvallar, WS |
| `docs/03_FRONTEND_TZ.md` | Web app: stack, tuzilma, tokenlar, moslashuvchanlik, holatlar |
| `docs/04_IMPLEMENTATION_PLAN.md` | Bosqichlar, bog'liqliklar, xavflar |
| `docs/05_FEATURE_GUIDE.md` | Yangi bo'lim qurish retsepti |
| `docs/api-samples/` | Har endpointning namuna JSON javobi (shartnoma tuzilgan paytdagi namunalar; endpoint katalogi — `npm run endpoints:doc`) |
| `design/` | Tasdiqlangan UI prototip (`preview.html` — lokal; onlayn: https://claude.ai/artifact/Nkbgv351c5CTBkYbTYW5c1) |
| `src/` | Ilova kodi (`app` → `features` → `shared`) |
| `messages/{uz,ru}/` | Tarjimalar |
| `e2e/` | Playwright ssenariylari |
