# 06 — ERP integratsiyasi: «Boshqaruv markazi» kengaytmasi

Sana: 2026-10-28. Manba: marketplace uchun qilingan ERP dashboard (`erp 3/`, faqat o'qildi).
Maqsad: ERP da bor, bizda yo'q imkoniyatlarni Doctor Ali boshliq paneliga **bizning arxitektura va dizaynda** qo'shish,
hamda ERP da ham yo'q ikki narsani — **prognoz** va **mas'ulga xabar yuborish**ni — noldan qurish.

Backend shartnomasi: **`07_BACKEND_TZ_V2.md`**. Endpoint katalogi: `ENDPOINTS.md` (`npm run endpoints:doc`).

---

## 1. Farqlar jadvali (gap analysis)

| ERP imkoniyati | Bizda edi | Qaror |
|---|---|---|
| Dashboard: hudud xaritasi (choropleth), hudud reytingi, oldingi davr bilan taqqoslash | 14 viloyat plitkasi, taqqoslash bor | **Umumiy** sahifaga haqiqiy SVG xarita + hudud drill-down (`overview/regions/`) |
| Ombor: ombor bo'yicha qoldiq, kirim/chiqim, kam qoldiq chegarasi, kunlik snapshot | yo'q (faqat klinika do'koni) | **Yangi bo'lim «Ombor»** (`/warehouse`) |
| Kuryerlar: jonli holat (harakatda/turibdi/signal yo'q), hudud kartalari, qo'ldagi naqd, topshirish so'rovlari | kuryer reytingi va COD bor | **Yetkazib berish**ga «Jonli doska» va «Kassaga topshirish» bloklari |
| Moliya: hudud bo'yicha to'lov va qarz, xarajat, B2B dorixonalar qarzi | qarz muddatlari (umumiy) | **Yangi bo'lim «Hisob-kitob»** (`/settlements`) |
| Xodimlar analitikasi (operator samaradorligi) | **Sotuv jamoasi**da bor | qo'shimcha kerak emas (komissiya allaqachon bor) |
| Integratsiyalar holati, import xatolari, audit jurnali | yo'q | **Yangi bo'lim «Tizim holati»** (`/system`) |
| Prognoz | ERP da ham yo'q | **Yangi bo'lim «Prognoz»** (`/forecast`) |
| Muammo sababi + skladchi/kuryer/kassirga xabar | ERP da ham yo'q | **Yangi bo'lim «Muammolar markazi»** (`/issues`) |
| AI nazorat: kamomad, xato, shubhali holat, manbalarni solishtirish, hisobot | ERP da ham yo'q | **Yangi bo'lim «AI tahlil»** (`/ai`) — Claude API backendda (`07` §8) |
| Kuryer GPS treki, buyurtma biriktirish, prixod kiritish | — | **Kiritilmaydi**: bu operatsion ish (logist/skladchi), boshliq paneli emas |

Panel qoidasi o'zgarmaydi: biznes ma'lumotini **o'zgartirmaydi**. Yangi yozuvchi amallar — **mas'ulga xabar yuborish**, AI topilmasiga **baho** va uni **muammoga aylantirish** (faqat o'z yozuvlari; buyurtma/ombor/kassaga tegmaydi).

## 2. Marketplace (ERP) ma'lumoti qanday kiradi

Brauzer faqat bizning backendni ko'radi (BFF). ERP ma'lumotini **backend** o'zi tortadi:
`ERP Kengash API v1` (`/jonatmalar`, `/qoldiqlar`, `/reyslar`, `/korsatkichlar`) → backend sinxron (har 5 daqiqa) → bizning agregat jadvallar.
Har qatorda `source: "doctor_ali" | "marketplace"` maydoni — panel omborlar va kuryerlarni manba belgisi bilan ko'rsatadi.
Sinxron holati va xatolari **Tizim holati** bo'limida (`system/sync/`) ko'rinadi.

## 3. Yangi va kengaytirilgan bo'limlar

| Bo'lim | Yo'l | Guruh | Davr filtri | Bloklar |
|---|---|---|---|---|
| Muammolar markazi | `/issues` | Asosiy | yo'q (hozirgi holat) | hisoblagichlar · domen/holat filtri · muammo ro'yxati · muammo kartasi (sabab, ta'sir, diagnostika, tarix) · **«Xabar yuborish»** oynasi |
| AI tahlil | `/ai` | Asosiy | yo'q | AI holati va sog'lom ball · xavf ostidagi pul · topilmalar (dalil, ishonch, tavsiya) · baho berish va muammoga aylantirish · **AI chat** (savol-javob, «bugungi hisobot» → Excel/PDF yuklab olish, bo'limlar bo'yicha tahlil) · o'sish tavsiyalari · tekshiruvlar · kunlik/haftalik hisobot |
| Ruxsatlar | `/access` | Nazorat (faqat boshliq) | yo'q | kimga qaysi bo'lim ochiq · tayyor shablonlar (call-center admini, logist, buxgalter…) · filial/hudud doirasi · muddat · shaxsiy ma'lumotni yashirish · bir bosishda bekor qilish · «kim nimani ko'rdi» jurnali |
| Prognoz | `/forecast` | Asosiy | o'z ufqi: 7 · 30 · 90 kun | tushum/buyurtma/pul kirimi prognozi (oraliq bilan) · reja bajarilishi · haqiqiy + prognoz grafigi (ishonch oralig'i) · tugaydigan mahsulotlar · hudud prognozi |
| Ombor | `/warehouse` | Biznes | filial + davr (harakat uchun) | KPI · omborlar kartalari (holat rangi, skladchi) · mahsulot qoldig'i jadvali (necha kunga yetadi) · kirim/chiqim grafigi · ombor kartasi (drawer) |
| Hisob-kitob | `/settlements` | Biznes | filial + davr | KPI · hududlar qarzi jadvali · qarz muddatlari · B2B dorixonalar |
| Tizim holati | `/system` | Nazorat | yo'q | umumiy holat · komponentlar (DB, API, navbat, Bitrix, ERP, Telegram, SMS, to'lov) · sinxron va import xatolari · audit jurnali |
| Umumiy (kengaytma) | `/` | — | bor | **Hudud xaritasi**: rang — yetkazish ulushi, bosilsa hudud tafsiloti |
| Yetkazib berish (kengaytma) | `/logistics` | — | bor | **Jonli doska** (kuryer holatlari, hududlar) · **Kassaga topshirish** (kutilayotgan so'rovlar, so'nggi qarorlar) |

## 4. «Mas'ulga xabar» oqimi

```
Backend aniqlaydi (Celery, har 5 daq) ─▶ Issue{open, sabab, ta'sir, mas'ul}
Boshliq: Muammolar markazi ─▶ muammoni ochadi ─▶ «Xabar yuborish»
  ├─ qabul qiluvchi (default — mas'ul: skladchi / logist / kassir / admin)
  ├─ kanal: Telegram · SMS · ilova (push)
  ├─ shoshilinchlik: oddiy · shoshilinch
  └─ matn (shablon tayyor, tahrirlanadi)
POST issues/{id}/notify/ ─▶ har kanal natijasi (yuborildi/xato/navbatda) ─▶ tarixga yoziladi, holat «notified»
Mas'ul «ko'rdim»/«hal qildim» bosadi (o'z ilovasida) ─▶ tarixda ko'rinadi
```
Takroriy bosishdan himoya: tugma so'rov davomida o'chadi; backend bir muammo uchun 60 s ichida ikkinchi xabarni `429 notify_throttled` bilan rad etadi.

## 5. UI va harakat tizimi (yangilanish)

Brend: Doctor Ali — chuqur yashil + tilla (oltin). Mehrigiyo — o'simlik motivlari.

| Qatlam | Nima | Texnika |
|---|---|---|
| Fon | sekin suzuvchi yashil/tilla «aurora» + barg tomirlari naqshi + yengil donadorlik | CSS `transform` animatsiyasi, `prefers-reduced-motion` da to'xtaydi |
| Sahifa kirishi | yangi bo'limlarda yumshoq ko'tarilish, bloklar ketma-ket | `motion` (Framer Motion) variantlari, stagger |
| Bo'lim boshi (hero) | teg + sarlavha + jonli raqamlar + bo'limga xos chizilgan illyustratsiya; sichqonchaga ergashuvchi parallaks, nur o'tishi | `motion` motion-value, SVG |
| Illyustratsiyalar | ombor javonlari, prognoz egri chizig'i, radar, tangalar, tugunlar tarmog'i, kuryer yo'li — hammasi qo'lda chizilgan SVG, animatsiyali qismlar bilan | inline SVG, faqat tokenlar |
| Raqamlar | KPI qiymatlari sanab chiqadi (count-up) | `motion` `animate` |
| Navigatsiya | faol bo'lim belgisi bir joydan ikkinchisiga «oqib» o'tadi | `layoutId` |
| Ikonkalar | yangi bo'limlar uchun brend ikonkalari (barg + xoch motivi) | o'z SVG komponentlari |
| Xarita | O'zbekiston viloyatlari, rang o'tishi animatsiyali, tanlangan hudud nur bilan | SVG yo'llar (`@svg-maps/uzbekistan`, MIT) |

Qoidalar saqlanadi: rang/o'lcham faqat `globals.css` tokenlaridan; har blok `QueryState` holatlari bilan; matn `messages/{uz,ru}`.

## 6. Bosqichlar

| # | Frontend | Backend (`07_BACKEND_TZ_V2`) |
|---|---|---|
| E1 | harakat tizimi, fon, hero, ikonkalar, xarita | `overview/regions/` |
| E2 | Ombor, Hisob-kitob | `warehouse/*`, `settlements/*` |
| E3 | Jonli doska, Kassaga topshirish | `logistics/live/`, `logistics/handovers/` |
| E4 | Muammolar markazi + xabar | `issues/*` (+ Telegram/SMS yuborish) |
| E5 | Prognoz, Tizim holati | `forecast/*`, `system/*`, ERP sinxroni |
| E6 | Ruxsatlar (faqat ko'rish) | `access/*`, `me` kengaytmasi, server tomonda bo'lim/filial/yozish cheklovi (`07` §9) |
| E7 | AI tahlil | `ai/*` — tekshiruvlar (AI siz) → Claude tahlili → topilmalar, hisobotlar |

Frontend barcha bosqichlarni bir vaqtda tayyorlaydi (testlar — namuna backend bilan). Backend endpoint chiqargach `npm run contract:check -- --full` bilan tekshiriladi.

## 7. Kengaytma (2026-10-28, ikkinchi qism) — `08_PLATFORM_ACCESS_AND_AI_OPS.md`

- **Platforma akkauntlari:** Ruxsatlar bo'limida ikkinchi varaq — sklad boshlig'i, skladchi, filial admini, kuryerlar boshlig'i, logist, kassir, buxgalter va klinika admini akkauntlarini ochish. Ruxsatlar matritsasida har modul uchun ko'rish, tafsilot, maxfiy ma'lumot va amal darajasi alohida beriladi; doira, muddat, blok, parolni tiklash va offboarding ham shu yerda.
- **AI avto-tuzatish:** AI tavsiyalar ro'yxatidan kerakli amalni tanlaydi. Har amalda oldin/keyin ko'rinishi bor; uch rejim: avtomatik, tasdiq bilan yoki faqat tavsiya. Avtomatik bajarilganini 24 soat ichida bekor qilish mumkin. Bitta tugma barcha avtomatik amallarni to'xtatadi.
- **AI chat — yagona kirish:** istalgan ma'lumot bitta savol bilan olinadi (vositalar katalogi §D). Javobda grafik va to'g'ridan-to'g'ri havolalar bo'ladi.
- **Hudud drill-down:** xaritada viloyat bosilsa, xarita o'sha viloyatga yaqinlashadi. Omborlar va kuryerlar nuqta bo'lib chiqadi; yonida qoldiq, kuryerning joriy vazifasi va qo'lidagi naqd ko'rinadi.
- **Call-center:** jamoa → operator → qo'ng'iroq darajasigacha ma'lumot, AI qo'ng'iroq sifati bahosi bilan (backend shartnomasi; panelda — AI chat va keyingi bosqichdagi alohida bo'lim orqali).
