# doctor_ali_owner_next — «Doctor Ali Nazorat» (boshliq paneli)

Biznes egasi uchun yagona nazorat paneli: yetkazib berish savdosi, klinika filiallari, mobil ilovalar va pul oqimi — bitta joyda, **faqat ko'rish uchun**.
Mavjud loyihalar (`mehrigiyo_*`, `doctor_ali_clinic_next`, `mehrigiyo_platform_tz`) bu loyiha uchun **faqat o'qiladi**.

## Ishga tushirish
```bash
npm install
```
```bash
npm run dev
```
`.env.development` da `NEXT_PUBLIC_API_MOCKING=1` — backendsiz, namuna ma'lumot bilan ochiladi: http://localhost:3000
Kirish: **istalgan** login va parol, so'ng **istalgan** 6 xonali kod.

### Haqiqiy backend bilan
`.env.local`:
```
NEXT_PUBLIC_API_MOCKING=0
# ixtiyoriy — jonli hodisalar kanali
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
| `docs/01_CONCEPT.md` | Konsepsiya: bo'limlar, signallar, metrikalar lug'ati, ochiq savollar |
| `docs/02_BACKEND_TZ.md` | Backend jamoasi uchun: `owner` roli, `/api/owner/*`, agregat jadvallar, WS |
| `docs/03_FRONTEND_TZ.md` | Web app: stack, tuzilma, tokenlar, moslashuvchanlik, holatlar |
| `docs/04_IMPLEMENTATION_PLAN.md` | Bosqichlar, bog'liqliklar, xavflar |
| `docs/05_FEATURE_GUIDE.md` | Yangi bo'lim qurish retsepti |
| `docs/api-samples/` | Har endpointning namuna JSON javobi (backend uchun; `npm run samples` qayta yaratadi) |
| `design/` | Tasdiqlangan UI prototip (`preview.html` — lokal; onlayn: https://claude.ai/artifact/Nkbgv351c5CTBkYbTYW5c1) |
| `src/` | Ilova kodi (`app` → `features` → `shared`) |
| `messages/{uz,ru}/` | Tarjimalar |
| `e2e/` | Playwright ssenariylari |
