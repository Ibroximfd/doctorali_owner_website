# Owner sayti — ma'lumot to'liq emas: hamma zakaz bitta hisobda (backend, 2026-11-05)

**Kimdan:** owner sayti (`doctor_ali_owner_next`).
**Asos:** egasining talabi (2026-11-05), TZ 20 §14 (Bitrix), TZ 30 (BX-1, BX-6), TZ 33 Q-8 (pul manbasi),
TZ 35 (`origin`), jonli javob `scripts/contract/live/owner-v2-2026-10-31.json` (test server).
**Javob:** raqam bilan — «T-1: …».

---

## Egasining talabi

> Owner sahifasini ochganda **hamma zakaz bitta umumiy hisobda** ko'rinsin: ilova, CRM operatorlari,
> Bitrix operatorlari — hammasi birga. Bitrix «boshqa narsa» deb chetga chiqarilmaydi. Kunlik/haftalik
> statistikani ochganda umumiy raqam chiqadi, ichidan esa o'zi xohlasa **filtr bilan ajratib** ko'radi
> (manba, operator, holat, to'lov usuli, filial, viloyat). Ko'rish va tushunish oson bo'lsin.

Ya'ni: **sukut — hammasi**, ajratish — faqat filtr. Hech bir zakaz hech bir kesimdan tushib qolmasin.

---

## Hozir nima noto'g'ri (jonli javob, 2026-10-31)

| # | Kuzatuv | Natija ownerda |
|---|---|---|
| 1 | Owner `?source=app\|operator` yuboradi, backendda zakaz kelib chiqishi `origin = bitrix\|platform` (TZ 35) | Bitrix zakazi «operator» ga kiradimi — noma'lum; alohida ko'rib bo'lmaydi |
| 2 | Bitrix zakazlari hozir **asosiy filialga (Qo'qon)** yoziladi (egasi, 2026-11-05; BX-6 dagi `filial: null` holati shu bilan yopilgan deb tushunyapmiz — tasdiqlang) | Qo'qon raqamlarida CRM + ilova + Bitrix aralash, filial ichida ajratib bo'lmaydi. Qo'qonda `leads: 65`, `sold: 98` — lidsiz Bitrix zakazlari konversiyani buzyapti (T-7) |
| 3 | Bitrix zakazida `operator: null` (BX-1) | `analytics/v2 operators[]` va `sales/operators/` da bu zakazlar yo'q — operator statistikasi to'liq emas |
| 4 | `finance/v2` da faqat pul zanjiri, tushum, bosh kuryer haqi | Zakazlar soni, holati, summasi, manbasi, to'lov usuli **Moliyada yo'q** |
| 5 | `revenue` 82 399 749, pul zanjiri jami 7 150 854 (kuryerda + bosh kuryerda + topshirildi) | ~75 mln qayerda — owner tushunmaydi (oldindan to'lov? Bitrix? eski zakaz?) |
| 6 | `conversion_pct`: jami `0.1` (416 ÷ 10 224 = 4,1%), Toshkent `0.0` (295 ÷ 10 100 = 2,9%), Qo'qon `4.6` (98 ÷ 65) | Konversiya ta'rifi noma'lum, raqam ishonchsiz |
| 7 | Operator `sold: 212`, `delivered: 213`; mahsulot `sold_qty: 111`, `delivered_qty: 115` | Sotildi va yetkazildi har xil sana bo'yicha sanalyapti shekilli — ta'rif kerak |
| 8 | Tushumning ikki manbasi (`Order.total_amount` va `OrderFinance.revenue`, TZ 33 Q-8) | Bo'limlar orasida bir davr uchun har xil son chiqishi mumkin |

---

## So'rovlar

### T-1. Bitta yagona zakaz to'plami — hammasi kiradi
`owner/overview/v2/`, `owner/finance/v2/`, `owner/analytics/v2/`, `owner/filials/performance/`,
`owner/sales/operators/` — **sukut bo'yicha hamma zakaz**: ilova + CRM (platform) + Bitrix.
Filialsiz va operatorsiz zakaz ham jamiga kiradi (T-4).
**Tekshiruv:** bir davr uchun `overview.orders.sold` = `analytics.totals.sold` = Σ `by_origin` = Σ filiallar
(+ «filialsiz» qatori).

### T-2. Manba — bitta filtr, uchta qiymat
Owner uchun manba bitta parametr bo'lsin:

```
?channel=app|crm|bitrix        (bir nechtasi: ?channel=crm,bitrix)
```

| Qiymat | Nima |
|---|---|
| `app` | mijoz ilovadan o'zi bergan |
| `crm` | bizning CRM operatori (`origin=platform`, ilova emas) |
| `bitrix` | Bitrix'dan o'tgan (`origin=bitrix`) |

Yuborilmasa — hammasi. Eski `?source=app|operator` vaqtincha ishlab tursin (`operator` = `crm` + `bitrix`).
Nomni (`channel` yoki boshqa) backend tanlasin — yozing, panel moslanadi.

### T-3. Har javobda kesimlar — owner o'zi ajratadi
`overview/v2` va `finance/v2` `data` ichiga (`analytics/v2` da ham):

```json
"orders": {
  "total": 416, "amount": "82399749",
  "by_status": {
    "pending":   {"count": 12, "amount": "2400000"},
    "confirmed": {"count": 20, "amount": "4100000"},
    "shipping":  {"count": 6,  "amount": "1200000"},
    "delivered": {"count": 374,"amount": "74699749"},
    "cancelled": {"count": 6,  "amount": "1100000"}
  },
  "by_channel": [
    {"channel": "app",    "count": 168, "amount": "...", "delivered": 162, "cancelled": 3},
    {"channel": "crm",    "count": 220, "amount": "...", "delivered": 190, "cancelled": 3},
    {"channel": "bitrix", "count": 28,  "amount": "...", "delivered": 22,  "cancelled": 0}
  ],
  "by_payment": [
    {"method": "cash", "count": 0, "amount": "...", "paid": "..."},
    {"method": "card", "count": 0, "amount": "...", "paid": "..."},
    {"method": "prepaid", "count": 0, "amount": "...", "paid": "..."}
  ]
},
"days": [{"date": "2026-11-01", "orders": 95, "delivered": 80, "cancelled": 6, "amount": "57000000"}]
```

- `by_status` — 5 kanonik status (TZ 35 bilan bir xil).
- `by_channel` va `by_payment` filtr qo'llanganda ham keladi (filtrlangan to'plam ichida).
- `days` — kunlik qator (davr `today` bo'lsa ham bitta qator). Haftalik/oylik ko'rinishni panel shundan yig'adi.
- `by_filial[]` qatorlariga ham shu `by_status` va `by_channel` qo'shilsin.

### T-4. Filialsiz va operatorsiz zakaz yo'qolmasin
- Bitrix zakazlari asosiy filialga (Qo'qon) yoziladi — shu qoida saqlansin. Lekin Qo'qon qatorida
  `by_channel` bo'lishi shart (T-3): owner Qo'qonni ochganda o'z CRM, ilova va Bitrix zakazlarini ajrata olsin.
- Bitrix zakazi uchun lid ham Qo'qonda (yoki operator filialida) bo'lsinmi — yozing; hozir lid soni zakazdan kam.
- Baribir filiali yo'q zakaz qolsa — `by_filial[]` da alohida qatorda: `{"id": null, "name": "", "unassigned": true, …}`.
- Operatori yo'q zakazlar `operators[]` da `{"id": null, "full_name": "", …}` qatorida (TZ 35 qoidasi kabi).
- Bitrix operatori moslanmagan bo'lsa — qatorda `bitrix_user` (ism, id), owner kimligini ko'rsin.
- BX-1 / BX-6 yopilgach, mavjud zakazlarga operator va filialni orqaga to'ldirish (BX-4).

### T-5. Operatorlar — bitta ro'yxat, kanal bilan
`analytics/v2 operators[]` va `sales/operators/` ga Bitrix operatorlari ham kiradi (xarita orqali bizdagi akkaunt).
Har qatorga: `orders`, `amount`, `by_status`, `channels: {"crm": n, "bitrix": n, "app_referral": n}`, `leads`,
`conversion_pct`. `?channel=` filtri shu ro'yxatga ham amal qiladi.
Qo'shimcha filtr: `?operator_id=` — owner bitta operatorning hamma zakazini (qaysi kanaldan bo'lmasin) ko'radi.

### T-6. Pul — yagona manba va tushuntirilgan farq
- Tushum bitta manbadan (Q-8). Qaysi biri — yozing.
- `finance/v2 totals` ga pul qayerda ekanini to'liq yopadigan bo'linish:

```json
"money_breakdown": {
  "revenue": "82399749",
  "prepaid_online": "...",      // karta/oldindan — kuryer orqali o'tmaydi
  "with_couriers": "4654910",
  "with_chiefs": "0",
  "handed_over": "2539944",
  "outside_chain": "...",       // kuryer zanjiridan o'tmagan (Bitrix/eski/qo'lda) — sababi bilan
  "outside_chain_reasons": [{"reason": "legacy_before_v2", "amount": "..."}]
}
```

  Shart: `revenue` = qolgan qatorlar yig'indisi. Owner «82 mln qayerda» savoliga javobni ekranda ko'rsin.
- `with_chiefs` manfiy (`-44000`) — xatomi? (B-18 dagi savol hali ochiq.)
- `?channel=` pul zanjiriga ham qo'llansin (hozir qo'llanmaydi) — mumkin bo'lmasa sababini yozing.

### T-7. Ta'riflar — yozma tasdiq
| Ko'rsatkich | Taklif | Tasdiqlang |
|---|---|---|
| sotildi | davrda **yaratilgan**, bekor qilinmagan zakaz | sana maydoni? |
| yetkazildi | davrda yaratilgan zakazlardan yetkazilgani (kohorta) **yoki** davrda yetkazilgani | qaysi biri? hozir `delivered > sold` chiqyapti |
| tushum | `payable_amount` yig'indisi, bekor qilinganlarsiz | sotildi bo'yichami, yetkazildi bo'yichami? |
| konversiya | davrda yaratilgan lidlardan zakazga aylangani ÷ davrdagi lidlar × 100 | hozirgi `0.1` / `0.0` qanday chiqyapti? |
| atkaz % | atkaz ÷ sotildi × 100 | |

Ixtiyoriy parametr: `?date_field=created|delivered` (TZ 35 dagi kabi) — owner qaysi sana bo'yicha ko'rishni tanlaydi.

### T-8. Qo'shimcha filtrlar (owner javoblarining hammasida bir xil)
`?channel=` · `?operator_id=` · `?status=` · `?payment_method=` · `?region=` · `?filial=` (bor) ·
`?date_from=&date_to=` (bor). Filtr qo'llanganda `period` yonida qo'llangan filtrlar qaytsin
(`"filters": {"channel": ["bitrix"]}`), panel «nima ko'rsatilyapti» deb yozadi.

---

## Panel nima qiladi (backend kelguncha va kelgach)
- Sukut — «Hammasi». Manba filtri: **Hammasi · Ilova · CRM operator · Bitrix**.
- Moliya va Umumiyda «Zakazlar» bloki: holat, kanal, to'lov usuli bo'yicha soni va summasi; kunlik qator.
- Filialsiz / operatorsiz zakaz bo'lsa — ogohlantirish qatori.
- Maydon kelmagan blok «backend kutilmoqda» bo'lib turadi, mavjud raqamlar o'zgarmaydi.

## Savollar
1. T-2 parametr nomi va eski `source` qachongacha ishlaydi?
2. T-3 / T-6 qachon testga chiqadi?
3. BX-1 (Bitrix zakazida operator) yopildimi? BX-6 — Bitrix zakazi asosiy filialga yozilishi barcha
   eski zakazlarga ham to'ldirildimi?
