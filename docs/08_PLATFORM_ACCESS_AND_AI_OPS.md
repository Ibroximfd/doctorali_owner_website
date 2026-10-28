# 08 — Platforma akkauntlari va ruxsatlari · Xodimlar reytingi · Call-center to'liq ko'rinish · AI chat (yagona kirish) · AI avto-tuzatish · Hudud drill-down

Sana: 2026-10-28. Kim uchun: **backend jamoasi (Django)**. Oldingi hujjatlar: `07_BACKEND_TZ_V2.md` (bo'limlar, AI asoslari, panel ko'ruvchilari),
`../mehrigiyo_platform_tz/02_DOMAIN_MODEL_AND_STATE_MACHINE.md` (mavjud rollar: `operator`, `admin`, `logist`).
Umumiy qoidalar o'sha-o'sha: `/api/owner/*`, `/` bilan tugaydi, pul — so'm butun son, vaqt — `+05:00`, [K] — konvert, [J] — konvertsiz.

> **Asosiy g'oya.** Owner panel — butun platformaning **bosh boshqaruv nuqtasi**. Boshliq (`owner`) shu yerdan:
> 1. platformadagi **har bir xodim akkauntini** ochadi, bloklaydi, ruxsatini beradi va oladi (CRM, logist, ombor, kuryer ilovasi, kassa, klinika, owner panel);
> 2. biznesning istalgan joyini **eng mayda tafsilotgacha** ko'radi — bo'limlarga kirib yoki **bitta AI chat orqali savol berib**;
> 3. AI topgan xatolarni **bir bosishda tuzattiradi** (xavfsizlari avtomatik tuzatiladi, har birini bekor qilish mumkin).

---

## A. Platforma akkauntlari va ruxsatlari (IAM)

### A.1 Nima o'zgaradi

Hozir har ilovada `role` bitta maydon (`operator | admin | logist`) va ko'rish doirasi kodda qattiq yozilgan.
Yangi model: **bitta odam — bitta akkaunt**, unga **rol shablonlari + aniq ruxsatlar + doira** biriktiriladi; hamma ilova bir xil `has_perm()` bilan tekshiradi.
Mavjud `role` maydoni qoladi (orqaga moslik), lekin manba — yangi grant jadvali (A.8 ko'chirish).

```
Owner panel (boshliq)
   └── IAM servisi (Django app `iam`) ── bitta manba
          ├── CRM / Call-center (operator, filial admini)
          ├── Logist web
          ├── Ombor (sklad boshlig'i, skladchi)
          ├── Kuryer ilovasi (kuryer, kuryerlar boshlig'i)
          ├── Kassa (kassir)
          ├── Klinika (klinika admini, shifokor)
          └── Owner panel ko'ruvchilari (07 §9)
```

### A.2 Model

| Model | Maydonlar |
|---|---|
| `Department` | key (`call_center · warehouse · logistics · couriers · cash · finance · clinic · management`), title |
| `Permission` | key `modul.resurs.amal` (A.3 katalog), title, module, **level** (`view · detail · sensitive · act · manage`), `is_sensitive` |
| `RoleTemplate` | key, title, department, permissions[], default_scope_kind, `max_grantable` (kim kimga bera oladi), is_system |
| `Account` | user (FK `User`), department, title (lavozim), status (`invited · active · blocked · offboarded`), created_by, invited_at, activated_at, last_login_at, `requires_2fa` |
| `AccountGrant` | account, template (null), extra[] (qo'shilgan ruxsatlar), denied[] (olib tashlangan), **scope** `{filials[], regions[], warehouses[], teams[]}` (bo'sh = cheklovsiz), expires_at, granted_by, note |
| `Delegation` | from_account, to_account, permissions[], scope, expires_at — boshliq **filial adminiga** «o'z filiali operatorlarini o'zi boshqarsin» deb huquq beradi |
| `IamEvent` | at, actor, account, kind (`created · invited · activated · granted · changed · revoked · blocked · unblocked · password_reset · sessions_revoked · offboarded · login · login_failed · sensitive_view`), diff JSON, ip, user_agent |

**Samarali ruxsat** = (shablon ∪ extra ∪ delegatsiya) − denied, doira — barcha manbalar doirasining **kesishmasi**; muddati o'tgani hisoblanmaydi.
Kesh: Redis `perm:{user_id}` (o'zgarishda o'chiriladi).

### A.3 Ruxsatlar katalogi (har bo'lim nimani ko'ra oladi)

Darajalar: **view** — yig'ma raqamlar · **detail** — har bir yozuv · **sensitive** — maxfiy (tannarx, maosh, audio, to'liq telefon) · **act** — amal bajarish · **manage** — odamlarni boshqarish.

| Modul | Kalit | Daraja | Nima beradi |
|---|---|---|---|
| **Call-center** | `callcenter.stats.view` | view | jamoa KPI: qo'ng'iroqlar, javob berilgan/o'tkazib yuborilgan, konversiya |
| | `callcenter.operators.detail` | detail | har operator: kun bo'yi faollik, qo'ng'iroqlar, lidlar, buyurtmalar, onlayn vaqt |
| | `callcenter.calls.detail` | detail | har qo'ng'iroq: kim, kimga, qachon, davomiylik, natija, AI xulosasi |
| | `callcenter.recordings.listen` | sensitive | audio yozuvni tinglash (har tinglash jurnalga) |
| | `callcenter.transcripts.view` | sensitive | qo'ng'iroq matni (STT) |
| | `callcenter.leads.detail` | detail | lidlar, manba, bosqich, tarix lentasi |
| | `callcenter.leads.reassign` | act | lidni boshqa operatorga o'tkazish |
| | `callcenter.operators.manage` | manage | operator akkauntlari (o'z doirasida) |
| **Buyurtmalar** | `orders.stats.view` · `orders.detail` · `orders.customer_pii` (sensitive) · `orders.edit` (act) · `orders.cancel` (act) | | |
| **Ombor** | `warehouse.stock.view` | view | qoldiq dona/summa, viloyat bo'yicha, real vaqt |
| | `warehouse.stock.detail` | detail | har mahsulot, har ombor, kunlik harakat |
| | `warehouse.cost.view` | sensitive | tannarx va ombor qiymati tannarxda |
| | `warehouse.inbound.create` | act | prixod kiritish |
| | `warehouse.transfer.create` | act | omborlar orasida ko'chirish |
| | `warehouse.inventory.run` | act | inventarizatsiya, tuzatish |
| | `warehouse.staff.manage` | manage | skladchilar akkaunti (o'z omborida) |
| **Kuryerlar** | `couriers.live.view` (joylashuv, holat) · `couriers.tracks.detail` (kunlik yo'l) · `couriers.cash.view` · `couriers.assign` (act) · `couriers.cash.accept` (act, kassir) · `couriers.manage` (manage, kuryerlar boshlig'i) | | |
| **Moliya** | `finance.revenue.view` · `finance.expenses.detail` · `finance.debts.detail` · `finance.salaries.view` (sensitive) · `finance.cost_profit.view` (sensitive) · `finance.expenses.create` (act) · `finance.payments.record` (act) | | |
| **Hisob-kitob** | `settlements.view` · `settlements.payments.record` (act) | | |
| **Klinika** | `clinic.stats.view` · `clinic.visits.detail` · `clinic.cash.view` · `clinic.staff.manage` | | |
| **Mobil ilova** | `app.analytics.view` · `app.users.detail` (sensitive) | | |
| **Hisobotlar** | `reports.export` (act) | | |
| **AI** | `ai.chat.use` · `ai.findings.view` · `ai.actions.approve` (act) | | |
| **Owner panel** | `owner_panel.<bo'lim>.view` — 07 §9 dagi bo'limlar | | |

Katalog `GET iam/permissions/` dan keladi — panel menyuni va formani shundan quradi (frontend kodida ro'yxat qattiq yozilmaydi).

### A.4 Tayyor shablonlar (boshliq bir bosishda beradi)

| Shablon | Bo'lim | Asosiy ruxsatlar | Doira |
|---|---|---|---|
| **Sklad boshlig'i** | warehouse | `warehouse.stock.*`, `warehouse.inbound.create`, `warehouse.transfer.create`, `warehouse.inventory.run`, `warehouse.staff.manage`, `couriers.live.view` | o'z omborlari |
| **Skladchi** | warehouse | `warehouse.stock.detail`, `warehouse.inbound.create` | bitta ombor |
| **Filial admini (call-center admini)** | call_center | `callcenter.*` (recordings bilan), `orders.detail`, `orders.edit`, `callcenter.operators.manage`, `warehouse.stock.view` | o'z filiali |
| **Operator** | call_center | `callcenter.leads.detail` (o'ziniki), `orders.detail` (o'ziniki) | o'zi |
| **Kuryerlar boshlig'i** | couriers | `couriers.*`, `orders.detail`, `warehouse.stock.view`, `couriers.manage` | hududlar |
| **Logist** | logistics | `orders.detail`, `orders.edit`, `couriers.live.view`, `couriers.assign`, `warehouse.stock.view` | filial |
| **Kassir** | cash | `couriers.cash.view`, `couriers.cash.accept`, `finance.payments.record` | filial |
| **Buxgalter** | finance | `finance.*` (salaries bilan), `settlements.*`, `reports.export` | hammasi |
| **Klinika admini** | clinic | `clinic.*` | klinika filiali |
| **Kuzatuvchi (owner panel)** | management | `owner_panel.<tanlangan>.view` | tanlangan |

Shablon — boshlang'ich nuqta: boshliq formada istalgan ruxsatni qo'shadi yoki olib tashlaydi (`extra` / `denied`).

### A.5 Qoidalar (xavfsizlik)

1. **Eng kam huquq:** yangi akkaunt faqat shablondagini oladi; `sensitive` ruxsatlar alohida belgilanadi va berishda boshliqdan **qayta tasdiq** (parol yoki 2FA kodi) so'raladi.
2. **Taqiq ustun:** `denied` har doim yutadi; doira — kesishma.
3. **O'zidan yuqorini bera olmaydi:** delegatsiya bilan huquq olgan filial admini faqat o'z doirasida va o'zida bor ruxsatlar ichida bera oladi (`max_grantable`).
4. **Darhol kuchga kiradi:** ruxsat o'zgarishi yoki blok — o'sha foydalanuvchining barcha refresh tokenlari bekor, WS uziladi, keyingi so'rov `401`.
5. **Muddat:** `expires_at` o'tganda grant o'chadi, 3 kun oldin boshliqqa va xodimga eslatma.
6. **Owner himoyasi:** `owner` ni bloklab bo'lmaydi; tizimda kamida 1 owner + tiklash yo'li (ikkinchi owner yoki super-admin) bo'lishi shart.
7. **Hamma narsa jurnalda:** har grant o'zgarishi diff bilan (`IamEvent`); `sensitive` ko'rish (audio tinglash, maosh, to'liq telefon) ham yoziladi.
8. **Offboarding:** xodim ketganda bitta amal: akkaunt `offboarded`, sessiyalar o'chadi, lid/buyurtmalari qayta biriktiriladi, kuryer bo'lsa naqd topshirilganligi tekshiriladi — ochiq naqd bo'lsa offboarding bloklanadi (`409 cash_not_settled`).

### A.6 Endpointlar (faqat `owner`, delegatsiya bo'lsa — o'z doirasida)

| Endpoint | Tavsif |
|---|---|
| `GET iam/departments/` | `{results: [{key, title, accounts_count}]}` |
| `GET iam/permissions/` | katalog: `{results: [{key, title, module, level, is_sensitive, description}]}` |
| `GET iam/roles/` | shablonlar: `{results: [{key, title, department, permissions[], is_system}]}` |
| `GET iam/accounts/?department=&status=&search=&filial=` | ro'yxat (`Account` + qisqa grant) |
| `POST iam/accounts/` | yangi akkaunt (pastda) |
| `GET iam/accounts/{id}/` | to'liq: grant, samarali ruxsatlar, doira, sessiyalar soni, oxirgi 20 hodisa |
| `PATCH iam/accounts/{id}/` | lavozim, shablon, extra/denied, doira, muddat |
| `POST iam/accounts/{id}/block/` · `/unblock/` | blok (sabab majburiy) |
| `POST iam/accounts/{id}/reset-password/` | SMS/Telegram orqali bir martalik havola |
| `POST iam/accounts/{id}/revoke-sessions/` | hamma qurilmadan chiqarish |
| `POST iam/accounts/{id}/offboard/` | `{reassign_to: account_id \| null}` → offboarding natijasi |
| `GET iam/accounts/{id}/effective/` | `{permissions: [key], scope: {...}, sources: [{key, from: "template"\|"extra"\|"delegation"}]}` |
| `GET iam/events/?account=&kind=` | IAM jurnali |
| `GET /api/me/permissions/` | **har ilova** uchun: `{permissions: [...], scope: {...}}` — UI tugmalarni shunga qarab ko'rsatadi |

`POST iam/accounts/`:
```jsonc
{"full_name": "Sardor Aliyev", "phone": "+998901234567", "department": "warehouse", "title": "Sklad boshlig'i",
 "role": "warehouse_head", "extra": [], "denied": ["warehouse.cost.view"],
 "scope": {"filials": [1], "regions": [], "warehouses": [1, 4], "teams": []},
 "expires_at": null, "requires_2fa": true, "invite_via": ["sms", "telegram"], "note": "…"}
```
→ `201 Account`. Xatolar: `409 phone_taken` (mavjud odam — `user_id` bilan grant qo'shish taklif qilinadi), `400 permission_unknown`,
`403 grant_exceeds_own` (delegatsiyada), `428 confirmation_required` (sensitive — `X-Confirm-Token` bilan qayta yuboriladi).

`Account` (ro'yxat qatori):
```jsonc
{"id": 31, "user_id": 44, "full_name": "Sardor Aliyev", "phone": "+998901234567", "department": "warehouse",
 "title": "Sklad boshlig'i", "role": "warehouse_head", "status": "active",
 "permissions_count": 9, "sensitive_count": 0, "scope": {"filials": [1], "regions": [], "warehouses": [1, 4], "teams": []},
 "expires_at": null, "last_login_at": "…" | null, "created_at": "…", "unused_permissions": ["warehouse.inventory.run"]}
```

### A.7 Ilovalarda tekshirish

- Har backend endpoint: `@require_perm("warehouse.stock.detail")` + queryset `scope_filter(request.user, model)`.
- Obyekt darajasida: `has_perm(user, key, obj)` — obyektning filial/ombor/hudud doirada ekanini tekshiradi.
- `sensitive` ma'lumot ruxsatsiz so'ralsa — maydon **niqoblanadi** (masalan telefon `+998 90 *** ** 67`), butun javob yiqilmaydi.
- Frontend (CRM, logist, kuryer, owner panel) faqat `GET /api/me/permissions/` bo'yicha tugmalarni yashiradi; himoya — faqat backendda.

### A.8 Hozirgi tizimdan ko'chirish

1. `iam` jadvallari yaratiladi, katalog va shablonlar `migrate` bilan yuklanadi.
2. Mavjud `role=operator|admin|logist` → mos shablon bilan `Account` + `AccountGrant` (doira — hozirgi filial).
3. 2 hafta ikkala yo'l parallel: `has_perm` natijasi eski qoidaga mos kelmasa log (`perm_mismatch`).
4. Mos kelsa — eski `role` tekshiruvlari olib tashlanadi.

### A.9 AI bilan IAM

| Imkoniyat | Qanday |
|---|---|
| Shablon taklifi | boshliq lavozimni yozadi («Samarqand ombori boshlig'i») → AI shablon + doirani taklif qiladi, boshliq tasdiqlaydi |
| Ishlatilmagan huquqlar | 30 kun ishlatilmagan ruxsatlar `unused_permissions` da; AI haftalik «olib tashlash» tavsiyasini beradi (B.4 `iam.trim_unused`, tasdiq bilan) |
| Shubhali faollik | tunda kirish, yangi qurilma + ommaviy eksport, 1 soatda 50+ audio tinglash, ruxsatsiz urinishlar seriyasi → `issues` da `iam.anomaly` + boshliqqa xabar |
| Offboarding yordamchi | AI xodimning ochiq ishlari ro'yxatini tuzadi: lidlar, buyurtmalar, naqd, vazifalar — kimga o'tkazishni taklif qiladi |

---

## B. AI avto-tuzatish (AI Ops)

### B.1 Tamoyil

AI **topadi va tuzatishni taklif qiladi**, lekin o'zgarishni **AI emas, backend xizmati bajaradi**:

```
Tekshiruv (deterministik) → AI tahlil (sabab, ta'sir) → AiAction taklifi (playbook + parametrlar + oldindan ko'rish diff)
   → rejim: auto | approve | suggest
   → bajaruvchi (domen servisi): shartlarni QAYTA tekshiradi → tranzaksiyada bajaradi → natija + undo ma'lumoti
   → jurnal, xabar, `issues` yopiladi
```
AI faqat ro'yxatdagi **playbook** larni tanlay oladi va parametrlarni JSON sxema bo'yicha to'ldiradi (`strict: true` tool). Erkin SQL yoki ixtiyoriy amal yo'q.

### B.2 Rejimlar

| Rejim | Ma'nosi | Kim uchun |
|---|---|---|
| `auto` | darhol bajariladi, boshliq natijani ko'radi, **24 soat ichida bekor qilish** mumkin | qaytariladigan, kam xavfli amallar |
| `approve` | boshliq (yoki `ai.actions.approve` egasi) **bir bosishda tasdiqlaydi** | pul, mijoz, ombor qoldig'iga ta'sir qiladiganlar |
| `suggest` | faqat tavsiya, bajarish tugmasi yo'q | murakkab yoki qaytarib bo'lmaydiganlar |

Boshliq har playbook rejimini o'zi tanlaydi (`ai/autopilot/`); **«Hammasini to'xtatish» tugmasi** (kill-switch) bitta bosishda barcha `auto` larni `approve` ga o'tkazadi.

### B.3 Xavfsizlik

1. Bajarishdan oldin shartlar qayta tekshiriladi (AI ko'rgan holat eskirgan bo'lishi mumkin) — mos kelmasa `status: "stale"`.
2. Har amal idempotent (`idempotency_key`), tranzaksiyada, `undo` uchun oldingi holat saqlanadi.
3. Cheklov: playbook bo'yicha soatiga/kuniga limit (masalan `order.merge_duplicates` ≤ 20/kun); limitdan oshsa — `approve` ga o'tadi.
4. Pul miqdori chegarasi: summasi > 5 mln so'm bo'lgan har qanday amal faqat `approve`.
5. Hamma amal `system/audit` da `actor: "AI (tasdiqladi: Boshliq)"` ko'rinishida.

### B.4 Playbooklar (birinchi to'plam)

| key | Muammo | AI taklifi / bajariladigan amal | Default rejim | Undo |
|---|---|---|---|---|
| `sync.retry` | Bitrix/ERP sinxroni xato | qayta ishga tushirish, kerak bo'lsa davrni bo'lib olish | auto | — |
| `data.normalize_phone` | telefon formati xato | `+998XXXXXXXXX` ga keltirish | auto | ✅ |
| `order.fix_region` | manzil boshqa viloyatda, `region` noto'g'ri | manzildan viloyat/tumanni aniqlab tuzatish | auto | ✅ |
| `order.merge_duplicates` | bir mijoz, bir kun, bir xil tarkib | dublikatni bekor qilib asosiyga bog'lash | approve | ✅ |
| `order.assign_courier` | tasdiqlangan buyurtma 3 soat kuryersiz | tuman bo'yicha yuklamasi kam kuryerga biriktirish | approve (tunda auto) | ✅ |
| `order.escalate_stuck` | 3+ kun yo'lda | logist + kuryerga xabar, mijozga SMS «kechikish uchun uzr» | auto | — |
| `cash.remind_courier` | naqd 24 soatdan beri topshirilmagan | kuryerga eslatma, 48 soatda kuryerlar boshlig'iga | auto | — |
| `stock.reorder_draft` | mahsulot ufqda tugaydi | ta'minotchiga **buyurtma qoralamasi** (miqdor = prognoz) | approve | ✅ |
| `stock.rebalance` | bir omborda ortiqcha, boshqasida tugayapti | omborlar orasida ko'chirish so'rovi | approve | ✅ |
| `lead.reassign_idle` | operator 2 soat faol emas, lidlari kutmoqda | lidlarni bo'sh operatorlarga taqsimlash | approve | ✅ |
| `settlement.remind` | hudud qarzi 30+ kun | hudud mas'uliga to'lov eslatmasi | auto | — |
| `courier.ping` | smena ochiq, signal 30 daqiqa yo'q | kuryerga push + qo'ng'iroq vazifasi logistga | auto | — |
| `iam.trim_unused` | 30 kun ishlatilmagan ruxsat | ruxsatni olib tashlash | approve | ✅ |
| `clinic.cash_gap_task` | kassa yopilishida farq | klinika adminiga tekshirish vazifasi | auto | — |

### B.5 Model

`AiPlaybook(key, title, description, risk: low|medium|high, mode, limits JSON, params_schema JSON, enabled)`
`AiAction(id, playbook, finding FK null, issue FK null, status: proposed|approved|running|done|failed|rejected|stale|undone, mode, title, reason, impact {kind, value}, params JSON, preview JSON, result JSON, undo JSON, proposed_at, decided_at, decided_by, executed_at, undo_until)`

### B.6 Endpointlar

#### `GET ai/actions/?status=proposed|done|all` [J]
```jsonc
{"counts": {"proposed": 4, "auto_today": 11, "undone": 1},
 "results": [{
   "id": 301, "playbook": "order.assign_courier", "risk": "medium", "mode": "approve", "status": "proposed",
   "title": "Samarqanddagi 6 ta buyurtmani kuryerlarga biriktirish",
   "reason": "Tasdiqlangan, 3–5 soatdan beri kuryersiz; Urgut tumanida 2 ta kuryer bo'sh",
   "impact": {"kind": "orders", "value": 6} | null,
   "preview": [{"label": "DA-184011", "before": "kuryer yo'q", "after": "Jasur Karimov"}],
   "proposed_at": "…", "executed_at": null, "undo_until": null, "decided_by": null
 }]}
```
`preview` — oldin/keyin jadvali (ko'pi bilan 50 qator, qolgani `preview_more: n`).

#### `POST ai/actions/{id}/approve/` → `AiAction` (`status: running|done`) · `POST …/reject/` `{reason}` · `POST …/undo/` (faqat `undo_until` gacha)
Xatolar: `409 action_stale` (holat o'zgargan) · `409 undo_expired` · `403 read_only`.

#### `GET ai/autopilot/` · `PUT ai/autopilot/`
```jsonc
{"enabled": true,                                           // kill-switch
 "playbooks": [{"key": "order.fix_region", "title": "…", "risk": "low", "mode": "auto", "allowed_modes": ["auto", "approve", "suggest"], "runs_today": 7}]}
```
`PUT` — `{enabled, playbooks: [{key, mode}]}`; `high` risk playbook uchun `auto` taqiqlangan (`400 mode_not_allowed`).

---

## C. Call-center: har bir ma'lumotgacha

Boshliq (yoki `callcenter.*` ruxsatli xodim) call-centerni **jamoa → operator → qo'ng'iroq** darajasigacha ko'radi.

| Endpoint | Javob |
|---|---|
| `GET callcenter/summary/` [K] | `calls_total, answered, missed, missed_returned, avg_wait_sec, avg_talk_sec, online_now, leads_new, conversion_pct, orders_created` (Metric) |
| `GET callcenter/operators/` [K] | har operator: `online_minutes, idle_minutes, calls_out, calls_in, missed, talk_minutes, leads_worked, orders_created, conversion_pct, quality_score (AI, 0–100) | null, status_now: online|on_call|idle|offline` |
| `GET callcenter/operators/{id}/` [K] | yuqoridagi + soatlik faollik (`timeseries`), oxirgi 50 qo'ng'iroq, AI xulosa («skriptga amal qiladi, e'tirozlarda sust») |
| `GET callcenter/calls/?operator=&result=&direction=&min_duration=&page=` [K] | qo'ng'iroqlar: `id, at, operator, lead {id, name (niqoblangan)}, direction, duration_sec, result (order|callback|no_answer|refused|…), has_recording, ai_summary | null, ai_flags[]` |
| `GET callcenter/calls/{id}/` [J] | + `transcript` (`callcenter.transcripts.view` bo'lsa), `recording_url` (imzolangan, 10 daqiqa; `callcenter.recordings.listen`), `ai_review {score, script, objections, tone, flags[]}` |
| `GET callcenter/heatmap/` [K] | soat × hafta kuni: qo'ng'iroqlar va o'tkazib yuborilganlar |

**AI qo'ng'iroq sifati:** audio → **STT** (nutqni matnga; alohida servis — Claude audio qabul qilmaydi) → matn Claude ga: skript bajarilishi, e'tirozlar, ohang,
shubhali holat (masalan mijozga noto'g'ri narx aytilgan, chegirma va'da qilingan). Natija `ai_review` va operator `quality_score` (kunlik o'rtacha).
Batch API da kechasi (arzon). Audio va matn 1 yil saqlanadi (`02_DOMAIN_MODEL` qoidasi bilan bir xil).

---

## D. AI chat — butun biznes bo'yicha yagona kirish nuqtasi

Boshliq bo'limlarga kirib yurmaydi: **«Samarqanddagi kuryerlar hozir qayerda va qo'lida qancha pul bor?»**, **«Dilnoza bugun nechta qo'ng'iroq qildi, nechtasi buyurtma bo'ldi?»**,
**«Mehrigiyo balzami qaysi viloyatda qancha qoldi?»**, **«Ilovaga 30 kun kirmaganlar ro'yxatini Excel qilib ber»** — AI vositalar orqali o'zi topib beradi.

### D.1 Vositalar katalogi (07 §8.9 ni kengaytiradi; hammasi read-only, `create_report` dan tashqari)

| Guruh | Tool | Parametrlar |
|---|---|---|
| Qidiruv | `search_entities` | `query` → buyurtma, mijoz (niqoblangan), operator, kuryer, ombor, mahsulot, muammo |
| Buyurtmalar | `list_orders` | `status, region, filial, operator, courier, date_from/to, min_amount, stuck_days, limit` |
| | `get_order` | `number` → to'liq karta va tarix |
| Call-center | `get_callcenter_summary`, `list_operators`, `get_operator`, `list_calls`, `get_call` | davr, filial, operator, natija |
| Ombor | `get_stock` | `region, warehouse, product, status` — viloyat va ombor kesimida |
| | `get_sales_mix` | to'liq narx / chegirma / sovg'a — mahsulot, ombor, hudud, sabab kesimida (`07` §2) |
| Kuryerlar | `get_couriers_live` | `region, status` → joylashuv, joriy vazifa, naqd |
| | `get_courier` | `id` → kunlik yo'l, yetkazganlari, naqd tarixi |
| Moliya | `get_finance`, `get_settlements`, `get_cash_position` | davr, filial |
| Klinika | `get_clinic` | davr, filial |
| Ilova | `get_app_activity`, `list_app_users` | `inactive_days, platform, limit` (niqoblangan) |
| Taqqoslash | `compare_periods` | `metric, period_a, period_b, group_by` |
| Prognoz | `get_forecast` | `metric, horizon` |
| Nazorat | `get_issues`, `get_findings`, `get_ai_actions` | holat |
| Xodimlar | `get_staff_leaderboard`, `get_staff_profile`, `get_teams` | rol, jamoa, davr |
| Natija | `create_report` | `kind, period, sections[], format` → fayl |
| | `propose_action` | `playbook, params` → B bo'limdagi `AiAction` (faqat taklif; bajarish — boshliq tasdig'i bilan) |

**Ruxsat bilan:** har tool chaqiruvchi foydalanuvchining samarali ruxsati va doirasi bilan bajariladi (A.2). Ko'ruvchi ruxsati yo'q ma'lumotni so'rasa —
tool `{"error": "permission_denied", "need": "finance.salaries.view"}` qaytaradi, AI buni muloyim tushuntiradi.
**Hajm:** `list_*` toollar ko'pi bilan 200 qator qaytaradi + `total`; ko'proq kerak bo'lsa AI `create_report` taklif qiladi.

### D.2 Javob bloklari (yangi turlar)

07 §8.9 dagi `kpis · table · bullets` ga qo'shimcha:
```jsonc
{"type": "chart", "title": "So'nggi 14 kun tushumi", "kind": "line",          // line · bar
 "labels": ["2026-10-15", "…"], "series": [{"name": "Tushum", "values": [210000000, …]}], "unit": "uzs"}   // uzs · count · pct
{"type": "links", "title": "Ochish", "items": [
  {"label": "DA-184011", "kind": "order", "id": "184011"},                    // order · courier · warehouse · issue · operator · section
  {"label": "Ombor bo'limi", "kind": "section", "id": "warehouse"}]}
```
Panel `links` ni tegishli kartaga aylantiradi (`?order=`, `?courier=`, `?warehouse=`, `?issue=` yoki bo'lim sahifasi).

### D.3 Tez savollar

`GET ai/chat/suggestions/` [J] → `{"results": ["Bugungi hisobot", "Qaysi operator ishlamayapti?", …]}` — AI kunlik holatga qarab 6 ta dolzarb savol tuzadi
(masalan muammo bo'lsa: «Nega Buxoroda atkaz 42%?»). Bo'lmasa panel o'z standart savollarini ko'rsatadi.

---

## E. Hudud drill-down (xaritada viloyatga kirish)

Boshliq xaritada viloyatni bosadi → xarita o'sha viloyatga **yaqinlashadi**, ustida omborlar va kuryerlar nuqta bo'lib chiqadi, yonida —
omborda qancha, kuryerda qancha, kuryer qayerda va nima qilyapti.

### E.1 `GET regions/` [K] — davr + filial (07 §1 dagi `overview/regions/` o'rniga, uni to'liq qoplaydi)
```jsonc
"data": [{
  "region": "samarqand",
  "orders": 412, "delivered": 301, "cancelled": 71, "revenue": 412000000,
  "success_rate": 80.9 | null, "growth_pct": 38.2 | null,
  "stock_units": 540, "stock_value": 312000000, "low_skus": 1,           // hozirgi holat
  "couriers_total": 6, "couriers_working": 4, "cash_on_couriers": 8200000 // hozirgi holat
}]
```

### E.2 `GET regions/{code}/live/` [K] — hozirgi holat (15 s da so'raladi)
```jsonc
"data": {
  "region": "samarqand",
  "summary": {"orders_today": 46, "delivered_today": 21, "in_transit": 17, "pending": 8, "stuck": 3,
              "cash_on_couriers": 8200000, "stock_units": 540, "stock_value": 312000000, "low_skus": 1},
  "warehouses": [{
    "id": 3, "name": "Samarqand", "lat": 39.6542, "lng": 66.9597, "status": "low", "keeper": "Bekzod T." | null,
    "stock_units": 540, "stock_value": 312000000,
    "products": [{"name": "Mehrigiyo balzami", "qty": 140, "status": "ok", "days_of_cover": 18.7 | null}]
  }],
  "couriers": [{
    "id": 12, "full_name": "Jasur Karimov", "status": "moving",                 // moving · idle · no_signal · off_shift
    "lat": 39.66 | null, "lng": 66.94 | null, "heading": 120 | null, "speed_kmh": 34 | null, "last_signal_at": "…" | null,
    "task": {"kind": "delivering", "order_number": "DA-184011", "address": "Urgut, Navbahor 12", "eta_minutes": 14} | null,
                                                                                 // kind: delivering · returning · pickup · waiting
    "assigned_today": 9, "delivered_today": 5, "cancelled_today": 1,
    "cash_on_hand": 4200000, "cash_since": "…" | null
  }],
  "orders": {"pending": 8, "confirmed": 5, "shipping": 17, "delivered": 21, "cancelled": 4}
}
```
- `lat/lng` — WGS84; kuryerda `CourierPing` dan oxirgisi (10 daqiqadan eski bo'lsa ham beriladi, `status` buni bildiradi).
- `address` — `mask_pii` bo'lsa ko'cha va uy raqamisiz (faqat tuman).
- Doira: ko'ruvchi `regions` ga ega bo'lsa boshqa viloyat → `403 region_forbidden`.

---

## F. Xodimlar reytingi va statistikasi (har bir xodim, har jamoa)

Boshliq har bir xodimni — operator, call-center (filial) admini, kuryer, skladchi, logist — va **jamoalarni** (har call-center, har filial) ko'radi:
kimga qancha lid berildi, qanchasi buyurtmaga aylandi, qanchasi atkaz bo'ldi, kuryer qanday baholanyapti, kim o'sdi, kim tushdi.

### F.1 Yagona ball (0–100)

Har rol uchun ko'rsatkichlar **0–100 ga normallashtiriladi** (davr ichida, shu roldagi barcha xodimlar orasida: eng yaxshisi 100, eng yomoni 0;
`better: lower` bo'lsa teskari) va vazn bilan qo'shiladi. Kam ma'lumotli xodim (masalan 10 tadan kam lid) — `score: null`, reytingda oxirida «ma'lumot yetarli emas».

| Rol | Ko'rsatkichlar (vazn) |
|---|---|
| **Operator** | konversiya lid→buyurtma (30%), atkaz ulushi ↓ (20%), yetkazilgan tushum (20%), birinchi javob vaqti ↓ (10%), qo'ng'iroq sifati AI (10%), mijoz bahosi (10%) |
| **Call-center admini** | jamoa konversiyasi (30%), jamoa atkazi ↓ (20%), jamoa tushumi (20%), lid taqsimoti tezligi ↓ (10%), operatorlar o'rtacha bali (20%) |
| **Kuryer** | yetkazish ulushi (30%), o'z vaqtida (20%), mijoz bahosi (20%), naqd intizomi — 24 soatda topshirish (15%), kunlik yetkazish soni (15%) |
| **Skladchi** | yig'ish aniqligi (40%), inventarizatsiya farqi ↓ (30%), yig'ish tezligi ↓ (30%) |
| **Logist** | biriktirish tezligi ↓ (40%), kechikkan buyurtmalar ↓ (30%), qayta biriktirishlar ↓ (30%) |

Vaznlar `StaffScoreConfig` jadvalida — boshliq o'zgartirishi mumkin (P2).

### F.2 Endpointlar

#### `GET staff/leaderboard/?role=operator|admin|courier|warehouse|logist&team=&filial=` [K] — davr bo'yicha
```jsonc
"data": {
  "role": "operator",
  "columns": [                                                    // ustunlar backenddan — panel rolni bilmasa ham chizadi
    {"key": "leads", "unit": "count", "better": "higher"},
    {"key": "orders", "unit": "count", "better": "higher"},
    {"key": "conversion_pct", "unit": "pct", "better": "higher"},
    {"key": "cancel_rate_pct", "unit": "pct", "better": "lower"},
    {"key": "revenue", "unit": "uzs", "better": "higher"},
    {"key": "avg_response_min", "unit": "min", "better": "lower"},
    {"key": "rating", "unit": "rating", "better": "higher"}       // unit: count · pct · uzs · min · rating(1–5)
  ],
  "rows": [{
    "id": 14, "full_name": "Dilnoza Karimova", "team": "Toshkent call-center", "team_id": 2, "filial": "Toshkent",
    "score": 86.4 | null, "rank": 1, "rank_delta": 2 | null,     // +2 — oldingi davrga nisbatan 2 pog'ona yuqori
    "metrics": {"leads": 412, "orders": 158, "conversion_pct": 38.3, "cancel_rate_pct": 9.1, "revenue": 108000000, "avg_response_min": 4.2, "rating": 4.8},
    "trend": [71, 74, 80, 86],                                   // ball, oxirgi 4 hafta
    "badges": ["top_conversion"],                                 // top_conversion · most_improved · fastest · best_rated · needs_attention
    "status_now": "online" | null                                 // online · on_call · idle · offline (operator/kuryer)
  }]
}
```
Metrika kalitlari (rol bo'yicha):
- operator: `leads, contacted, orders, conversion_pct, delivered, cancel_rate_pct, revenue, avg_response_min, calls, talk_minutes, quality_score, rating`
- admin: `team_size, team_leads, team_conversion_pct, team_cancel_rate_pct, team_revenue, team_score, distribution_min`
- courier: `assigned, delivered, success_rate_pct, on_time_pct, avg_delivery_min, rating, rating_count, cash_discipline_pct, per_day, km`
- warehouse: `picks, accuracy_pct, inventory_gap_pct, avg_pick_min`
- logist: `assigned, avg_assign_min, late_pct, reassign_pct`

#### `GET staff/teams/?role=operator` [K]
```jsonc
"data": [{"id": 2, "name": "Toshkent call-center", "lead": "Malika Yusupova (admin)", "members": 12,
          "score": 78.2, "metrics": {"conversion_pct": 34.1, "cancel_rate_pct": 11.2, "revenue": 640000000, "leads": 2100}}]
```

#### `GET staff/{id}/` [K] — xodim profili
```jsonc
"data": {
  "id": 14, "full_name": "Dilnoza Karimova", "role": "operator", "team": "Toshkent call-center", "filial": "Toshkent",
  "hired_at": "2025-03-01" | null, "score": 86.4, "rank": 1, "rank_of": 48,
  "metrics": {…}, "columns": [...],                              // leaderboard bilan bir xil
  "team_avg": {"conversion_pct": 31.0, …},                        // jamoa o'rtachasi — taqqoslash uchun
  "funnel": [{"key": "leads", "value": 412}, {"key": "contacted", "value": 380}, {"key": "orders", "value": 158},
             {"key": "delivered", "value": 139}, {"key": "cancelled", "value": 14}],
  "score_trend": {"labels": ["2026-10-06", …], "values": [71, 74, 80, 86]},
  "ratings": {"avg": 4.8, "count": 96, "distribution": {"5": 80, "4": 12, "3": 3, "2": 1, "1": 0}} | null,
  "recent_reviews": [{"at": "…", "stars": 5, "text": "Juda xushmuomala"}],   // mijoz izohi (kuryer/operator)
  "ai_summary": "Konversiyasi jamoadan 7 p.p. yuqori; kechqurun javob vaqti uzaymoqda…" | null,
  "strengths": ["Tez javob"], "weaknesses": ["Kechki smenada sust"]
}
```
`funnel` kalitlari rolga qarab: kuryer — `assigned, picked, delivered, cancelled, returned`.

**Mijoz bahosi** manbai: buyurtma yetkazilgach mijozga ilova/SMS orqali 1–5 yulduz (kuryer va operator uchun alohida savol). Bu yangi oqim — `Rating(order, target: courier|operator, stars, text, at)`.

**Ruxsat:** `staff.*` — `owner` va ruxsat berilganlar; filial admini faqat o'z jamoasini ko'radi (A.2 doira). AI chat vositasi: `get_staff_leaderboard(role, team)`, `get_staff_profile(id)`.

---

## G. Yana foydali takomillashtirishlar (keyingi bosqich, P2)

| G'oya | Foyda |
|---|---|
| **Ertalabki brifing** (Telegram, 08:00): AI kecha nima bo'lganini 5 qatorda, 3 ta muhim ish va tasdiq kutayotgan AI amallari bilan yuboradi; tugmalar bilan tasdiqlash | boshliq panelga kirmasdan ham boshqaradi |
| **Ovozli savol** (Telegram mini app): ovoz → STT → AI chat | yo'lda ham savol berish |
| **«Agar…» simulyatori**: «narxni 5% oshirsak?», «yana 2 kuryer olsak?» — tarixiy elastiklik va prognoz modeli asosida | qaror oldidan raqam |
| **Maqsadlar (OKR)**: oylik reja → filial/operator/hudud maqsadlariga bo'lish, AI har kuni bajarilishini kuzatadi | reja hammaga ko'rinadi |
| **Mijozni ushlab qolish**: AI 60 kun xarid qilmagan mijozlar segmenti va shaxsiy taklif matnini tayyorlaydi (yuborish — tasdiq bilan) | qayta sotuv |
| **Ta'minotchilar**: buyurtma qoralamasidan to kirimgacha holat, kechikkan yetkazib beruvchilar reytingi | ombor uzilmasin |

---

## H. Qabul mezoni

1. Boshliq yangi «Sklad boshlig'i» akkauntini ochadi → SMS keladi → xodim kiradi va **faqat** o'z omborlari ma'lumotini ko'radi; tannarx (`warehouse.cost.view` denied) niqoblangan.
2. Filial admini delegatsiya bilan faqat o'z filiali operatorlarini ocha oladi; boshqa filial → `403 grant_exceeds_own`.
3. Ruxsat olib tashlangach keyingi so'rov `401`, WS uziladi.
4. `order.fix_region` auto bajarilgach `undo` 24 soat ichida eski qiymatni qaytaradi; `undo_until` dan keyin `409 undo_expired`.
5. Kill-switch o'chirilsa yangi auto amallar `proposed` holatida qoladi.
6. AI chatda «Samarqanddagi kuryerlar qayerda?» → javobda `links` bilan kuryerlar, `get_couriers_live` ko'ruvchi doirasida.
7. `regions/{code}/live/` jami `couriers` soni = `regions/` dagi `couriers_total`.
8. `staff/leaderboard/?role=operator` qatorlari `rank` bo'yicha tartiblangan; `staff/teams/` jamoa `members` yig'indisi = operatorlar soni.
9. `npm run contract:check -- --full` — 0 ta ✗.
