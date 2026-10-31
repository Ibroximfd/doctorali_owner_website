# Owner sayti × backend v2 — savollar (2026-10-31)

**Kimdan:** owner sayti (`doctor_ali_owner_next`).
**Asos:** `TUZILMA_V2_FRONTEND_QOLLANMA_2026_10_31.md`, backend javoblari `JAVOBLAR_V2_SAVOLLAR_2026_10_31.md` («OWNER SAYTI (B-0..B-15)»).
**Holat:** B-0…B-15 javoblari bo'yicha ulandi. Test serverdagi `v2_owner` bilan olingan jonli javoblar (2026-10-31) panel sxemalari bilan solishtirildi — kichik nusxasi `scripts/contract/live/owner-v2-2026-10-31.json`, test `scripts/contract/live.test.ts`. Haqiqiy rejimda hamma bo'lim backenddan o'qiladi (namuna belgisi va `demo-only` ro'yxati olib tashlandi).
Javobni savol raqami bilan bering: «B-16: …».

---

## Yopilgan savollar (B-0…B-15)

| № | Mavzu | Panelda |
|---|---|---|
| B-0 | Owner test akkaunti | ✅ `v2_owner` (TOTP) — jonli javoblar shu bilan olindi |
| B-1 | Rahbar ismi va logini | ✅ `PATCH heads/{kind}/ {full_name, username}`, `409 username_taken` maydon ostida; telefon tahrirlanmaydi |
| B-2 | Parol tiklash, almashtirish | ✅ `reset-password/` (parol bir marta), `replace/` — bitta atomar so'rov: yangi akkaunt (parol ixtiyoriy) yoki filialdagi o'rin |
| B-3 | Filial belgisi | ✅ `code` yaratish/tahrirlash formasida, `409 code_taken` (lekin qarang: B-16) |
| B-4 | Dopusk katalogi | ✅ `structure/permissions/` — guruh `group`, nom `label`/`label_ru`, `role: both` ikkala rahbarga |
| B-5 | Filialdagi o'rinlar | ✅ `structure/filials/{id}/seats/?q=` — qidiruvli tanlov (qo'lda raqam yo'q) |
| B-6, B-6a | Filial natijasi, auditda ism | ✅ `filials/performance/`; audit qatorida `params.full_name` |
| B-7 | Owner tokeni `/api/sklad/*` | ✅ jonli tasdiqlandi, faqat o'qish |
| B-8, B-8a | Sklad nomi, stock | ✅ qayd |
| B-8b | Daftar filtrlari | ✅ «Sklad» (`?sklad=`) va «Kim» (`?actor_kind=`) filtrlari URL da |
| B-9 | AI topilmasi | ✅ `{kind, title, detail, severity}`; sklad topilmasida `fix` — maslahat sifatida |
| B-10 | `ai/status/` | ✅ bor (`enabled:false` — chat yashirin) |
| B-11…B-14 | `overview|finance|analytics|app /v2/` | ✅ ulandi; `?source=` pul zanjiriga qo'llanmaydi — Moliyada filtr yoqilganda shu izoh chiqadi |
| B-15 | Xodimlar | ✅ `sales/operators/` dan; logistlar — «backend kutilmoqda» |

---

## Jonli javobda yetishmaydi yoki hujjatdan farq qiladi

### B-16. `structure/` — `code` bo'sh, `region` nom
- **Keldi:** uchala filialda `code: ""`; `region: "Toshkent"` (viloyat **nomi**). Hujjat §2.2 da `region` — viloyat kodi (`toshkent_shahar`).
- **Panel:** belgi bo'sh bo'lsa nomning oxirgi so'zidan oladi («Mehrigiyo Toshkent» → «TO»). Viloyat nomi kod sifatida tanilmaydi — kartada xom matn chiqadi.
- **Kerak:** seed'da filial belgilarini to'ldirish; `region` — kod (yoki kod + nom alohida).

### B-17. `overview/v2/` — jami tushum va solishtirish yo'q
- **Keldi:** `money_chain`, `orders{lead, sold, in_transit, delivered, otkaz}`, `conversion_pct`, `filials[]`. Hech bir ko'rsatkichda o'tgan davr (`previous`, `delta_pct`) yo'q, `revenue` va atkaz foizi yo'q.
- **Panel:** tushum = filiallar `revenue` yig'indisi, atkaz foizi = `otkaz ÷ sold`; o'zgarish strelkalari chiqmaydi.
- **Kerak:** `revenue` va (konvertda `compare` bor ekan) `previous`/`delta_pct`. Yana: `money_chain.with_chiefs` testda **manfiy** (`-44000`) — bu kutilganmi?

### B-18. `finance/v2/` — to'langan haq va manzil narxi yo'q
- **Keldi:** `totals{revenue, with_couriers, with_chiefs, handed_over}`, `by_filial[{filial:{id,name}, …}]`, `chiefs[{seat_id, full_name, by_filial[{filial, addresses, fee, cash_accepted, handed_over, outstanding, delivered}]}]`, `handovers[{status, chief, filial, amount, expected_amount, confirmed_amount…}]`, `regions[]`, `chiefs_capped`. Summalar — satr (`"80000"`).
- **Panel:** filial va jami manzil soni, bosh kuryer haqi `chiefs[].by_filial[]` dan yig'iladi; manzil narxi = haq ÷ manzil (testda 10 000). Manfiy qoldiq (`with_chiefs: -44000`) 0 bo'lib ko'rsatiladi. Topshiriq `status` `pending`/`disputed` bo'lsa «vaqtida emas».
- **Yo'q / kerak:**
  - `address_rate` (asosiy filial B.L i belgilagan narx) — hisoblash o'rniga;
  - **to'langan haq** (`fee_paid`) — panel «qarz / to'langan» belgisini ko'rsatmaydi, «—» turadi;
  - `with_chiefs` manfiy chiqishi — xatomi yoki bosh kuryer kassasi minusda bo'lishi mumkinmi? (filial 1: −15 000, filial 2: −29 000);
  - `status` qiymatlari ro'yxati; topshiriqda manzillar soni.

### B-19. `analytics/v2/` — trend va operator lidlari yo'q
- **Keldi:** `totals{leads, sold, delivered, otkaz, conversion_pct}`, `by_filial[]`, `products[{item, sold_qty, delivered_qty, otkaz_qty, revenue}]`, `operators[{filial, sold, delivered, otkaz, revenue}]`.
- **Yo'q:** kunlik sotuv/atkaz trendi; operatorda `leads` va `conversion_pct`; jami va mahsulotda atkaz foizi (panel hisoblaydi).
- **Panel:** trend grafigi «backend kutilmoqda»; operator konversiyasi «—».

### B-20. `app/v2/` — tushum, dinamika, referal yo'q
- **Keldi:** `orders{totals{pending, confirmed, shipping, delivered, cancelled}, by_filial[{id, name, statuses}]}`, `users{total, new_in_period, dau, mau, activity_source}`, `referrals{tracked: true, operators: []}`.
- **Yo'q:** ilova zakazlari tushumi, zakazlar va DAU/MAU kunlik dinamikasi; referal ro'yxati testda bo'sh — qator shakli noma'lum.
- **Panel:** zakazlar grafigi «backend kutilmoqda», tushum «—»; DAU/MAU grafigi o'rnida faollik ulushlari (MAU ÷ jami, DAU ÷ MAU, yangilar ulushi). Referal qatori uchun `{id, full_name, filial, invited, ordered}` deb kutyapmiz — tasdiqlang.

### B-21. `filials/performance/` — nom farqi (qayd)
- **Keldi:** `otkaz`, `otkaz_pct`, `trend{labels, sold, delivered}`; umumiy `labels` yo'q. Panel moslandi. Testda «Mehrigiyo Toshkent» `leads: 10100`, `conversion_pct: 0.0` — seed ma'lumotimi?

### B-22. `sales/operators/` — filial nomi, logistlar
- **Keldi:** `filial` — **nom** (satr), id emas. Panel jamoani nom bo'yicha guruhlaydi. `conversion_pct` — foiz (0–100) deb o'qiladi (testda `100.0` bor); ko'p operatorda `leads: 0`. Jamoa konversiyasi = Σ(lid × foiz) ÷ Σ lid. Tasdiqlang: sanoq — lidlardan konvert bo'lganlar (zakaz soni emas)?
- **Kerak:** `filial: {id, name}` (filial filtri va boshqa bo'limlar bilan bog'lash uchun); logistlar uchun manba (B-15 «keyingi to'lqin»); `sales/operators/{id}/` hali tekshirilmadi — panel profilni ro'yxat qatoridan quradi.

### B-23. Sklad
- **`stock/`:** jonli javob sahifali (`count: 309`, `next`). Panel `pagination=false` so'raydi; massiv kelmasa sahifalarni (`page_size=200`, 20 tagacha) o'zi yig'adi. `pagination=false` owner uchun ishlashini tasdiqlang.
- **`ledger/`:** `source.id` zakazda UUID **satr**, hujjatda son — panel ikkalasini o'qiydi. `actor.kind` qiymatlari ro'yxati kerak (panel: `logist | chief_courier | courier | system`).
- **`me/`:** `user.full_name` o'rnida telefon raqami keladi.

### B-24. AI
- **`analysis/`:** `period` — `{from, to}`, hujjatda `{date_from, date_to}` (panel ikkalasini o'qiydi). `ai_summary`, `model` — `null` (kalit yo'q). AI kaliti qo'yilgach chat va xulosani qayta tekshiramiz.

### B-25. `structure/audit/` — testda bo'sh
- **Keldi:** `count: 0`. `params.full_name` (B-6a) jonli tekshirilmadi.

### B-26. Rol bilan keladigan (sukut) huquqlar — `structure/` da yo'q
- **Keldi:** `chief_operator` / `chief_logist` qatorida faqat `permissions` (qo'shimchalar). `effective_permissions` faqat `PATCH roles/{id}` va `heads/` javobida bor.
- **Panel:** dopusk oynasida «Rol bilan birga keladi» bo'limi va qulflangan almashtirgichlar `effective_permissions − permissions` dan chiziladi. `structure/` da yo'q bo'lgani uchun haqiqiy rejimda oyna ochilganda bu bo'lim chiqmaydi — egasi faqat qo'shimchalarni ko'radi.
- **Kerak:** `structure/` dagi rahbar qatoriga `effective_permissions` (yoki alohida `role_defaults`). Yana: katalogda `main_only: true` kalit hozir yo'q — asosiy filialga xos huquqlar (bosh kuryer yaratish, narx) katalogga kirmaydimi?

### B-27. Mahsulot rasmlari — hech bir javobda yo'q
- **Keldi:** `sklad/items|stock|ledger`, `analytics/v2 products[].item`, `structure/sklad-grants` — rasm maydoni (`image`, `image_url`, `photo`) yo'q.
- **Panel:** hamma joyda (qoldiq, harakatlar, hujjat, analitika, mahsulot dopuski) rasm o'rnida nomdan ikki harf. Maydon kelsa — `image | image_url | photo | thumbnail` dan o'qiydi.
- **Kerak:** `sklad/items/` da `image` (to'liq URL, kvadrat, ~96 px yetarli); boshqa javoblarda `item.image` yoki `items/` dagi id orqali. Rasm `/media/` dan bo'lsa — CORS/CSP uchun domenni ayting.

### B-28. Sklad dopuski logist darajasida (E-1)
- **Aniqlashtirildi (E-1):** owner mahsulotni filialga beradi va filialning **hamma logisti** uni boshqaradi; alohida taqsimot yo'q, endpoint kerak emas.
