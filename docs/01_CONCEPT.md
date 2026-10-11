# 01 — BOSHLIQ PANELI («Doctor Ali Nazorat»): konsepsiya, modullar, metrikalar lug'ati

Sana: 2026-10-02. Holat: **taklif — egasi UI ni tasdiqlagach kodga o'tiladi**.
Loyiha: `doctor_ali_owner_next` (yangi, alohida). Mavjud loyihalar (`mehrigiyo_*`, `doctor_ali_clinic_next`, `mehrigiyo_platform_tz`) **faqat o'qiladi — o'zgartirilmaydi**.
Bog'liq hujjatlar: `02_BACKEND_TZ.md` (API), `03_FRONTEND_TZ.md` (web app), `04_IMPLEMENTATION_PLAN.md` (bosqichlar), `../design/` (UI prototip).
Umumiy domen shartnomasi (statuslar, rollar, timeline): `../../mehrigiyo_platform_tz/02_DOMAIN_MODEL_AND_STATE_MACHINE.md` — shu yerdagi nom va enumlar o'zgarishsiz ishlatiladi.

---

## 1. Maqsad

Boshliq (biznes egasi) **bitta ekrandan butun biznesni** ko'radi: yetkazib berish savdosi (CRM + logist + kuryer), klinika filiallari (qabulxona, kassa, ombor), mobil ilovalar (mijoz ilovasi, shifokor ilovasi) va pul oqimi. Hozir bu ma'lumotlar 4 ta alohida panelda va **har biri bitta filialga yopiq** — umumiy rasm hech qayerda yo'q.

Panel uchta savolga javob beradi:
1. **Hozir nima bo'lyapti?** — nechta buyurtma kutilmoqda / yo'lda / yetkazildi, kassada qancha, kimda naqd pul turibdi.
2. **Qayerda muammo bor?** — tizim o'zi topadi va «Signallar» ga chiqaradi (boshliq qidirmaydi).
3. **Biznes o'syaptimi?** — har ko'rsatkich oldingi davr va oylik reja bilan solishtiriladi.

Panel **faqat o'qish uchun** (read-only): boshliq hech narsani tahrirlamaydi, buyurtma holatini o'zgartirmaydi. Yagona yozuvlar — o'z sozlamalari (reja, signal chegaralari, hisobot jadvali) va signalni «ko'rildi» deb belgilash.

## 2. Foydalanuvchilar va ruxsat

| Rol | Kim | Ko'radi |
|---|---|---|
| `owner` | Biznes egasi | Hamma filial, hamma bo'lim, hamma pul |
| `owner_viewer` (ixtiyoriy, 2-bosqich) | O'rinbosar, bosh hisobchi | `owner` belgilagan bo'limlar va filiallar (masalan hisobchi — faqat Moliya) |

> **Yangi qaror kerak.** Platforma TZ (`00_README`) da «`superadmin` roli kiritilmaydi» deyilgan. `owner` — bu superadmin emas: u **hech narsani o'zgartira olmaydi**, CRM/Logist/Qabulxona panellariga kira olmaydi, faqat `/api/owner/*` agregat endpointlarini o'qiydi. Filiallararo ko'rinish faqat shu rolda bo'ladi.

## 3. Ma'lumot manbalari (mavjud tizimlar — faqat o'qiladi)

| Manba | Loyiha | Beradigan ma'lumot |
|---|---|---|
| Sotuv CRM | `mehrigiyo_crm_next` | lidlar, buyurtmalar, operatorlar, komissiya, qo'ng'iroqlar, dela, baholar |
| Logist | `mehrigiyo_operator_next` | yetkazish, kuryerlar, naqd (COD) yig'ish/topshirish, urinishlar, transferlar |
| Qabulxona | `doctor_ali_clinic_next` | tashriflar, muolaja/konsultatsiya, kassa sotuvi, qarzlar, xarajatlar, ombor, shifokor to'lovlari, davomat, kunlik kassa yopilishi |
| Mijoz ilovasi | `mehrigiyo_app` | foydalanuvchilar, qurilmalar, ilova buyurtmalari, tasdiqlash/bekor voronkasi, konsultatsiyalar, ball/sovg'a, AI doktor, efirlar |
| Shifokor ilovasi | `mehrigiyo_doctor_app` | konsultatsiyalar, shifokor yaratgan buyurtmalar, komissiya/to'lovlar |
| Kuryer ilovasi | `mehrigiyo_kuryer_app` (hali qurilmagan) | yetkazish isboti, naqd topshirish — tayyor bo'lgach ulanadi |

**Operator filiallari.** Sotuv operatorlari filiallarga biriktirilgan: har filialda o'z operatorlar jamoasi va uni boshqaradigan filial admini bor (hozir: Toshkent, Qo'qon, Samarqand). Boshliq har filial jamoasining natijasini **yonma-yon** ko'radi va bir bosishda butun panelni shu filialga toraytiradi (§4, 6-bo'lim). Filiallar hajmi turlicha bo'lgani uchun adolatli o'lchov — **bir operatorga sotuv** (§6).

Hammasi bitta Django backendda (`my.imorganic.uz`). Boshliq paneli yangi ma'lumot **yig'maydi** — mavjudini filiallararo agregatlaydi. Istisnolar (yangi yig'ish kerak): §7.

## 4. Bo'limlar (navigatsiya)

| # | Bo'lim | Boshliq savoli | Asosiy tarkib |
|---|---|---|---|
| 1 | **Umumiy** | «Bugun ahvol qanday?» | Jami tushum (reja bilan), 6 ta KPI, diqqat talab qiladigan signallar, tushum trendi (kanallar), buyurtma oqimi (5 bosqich, jonli), «pul qayerda», filiallar taqqoslash, jonli lenta |
| 2 | **Buyurtmalar** | «Nechta buyurtma, qayerda turibdi?» | 5 bosqich voronkasi (soni + summa + o'tish %), kunlik trend, manba, hududlar xaritasi (14 viloyat), atkaz sabablari, tasdiqlash kanali, bosqich vaqtlari, soat×kun issiqlik jadvali, qotib qolgan buyurtmalar, buyurtmalar ro'yxati + karta (tarix lentasi) |
| 3 | **Moliya** | «Pul qancha va qayerda?» | Tushum / yig'ilgan / xarajat / sof qoldiq, pul qayerda (kassa, kuryerlarda, onlayn, qarzda), kirim-chiqim, to'lov usullari, xarajat toifalari, majburiyatlar (komissiya, shifokor to'lovi, keshbek), qaytarishlar, qarzdorlar, kassa yopilishi |
| 4 | **Klinika** | «Filiallarda aylanma qanday?» | Filial tanlash, tushum tarkibi (mahsulot/muolaja/konsultatsiya), tashriflar (keldi/kelmadi), shifokorlar, ombor (qoldiq qiymati, tugayotganlar), davomat, kassa holati |
| 5 | **Yetkazib berish** | «Kuryerlar qanday ishlayapti?» | Yo'lda/yetkazildi, o'rtacha vaqt, muvaffaqiyat %, kuryerlar reytingi + naqd, urinish sabablari, hudud bo'yicha vaqt, kechikkanlar, filiallararo transferlar |
| 6 | **Sotuv jamoasi** | «Qaysi filial jamoasi va qaysi operator qanday sotyapti?» | **Filiallar — operator jamoalari** (har filial bir qator: rahbar, operatorlar soni/onlayn, sotuv va o'zgarishi, bir operatorga sotuv, lid, konversiya, yetkazilgan, o'tkazib yuborilgan qo'ng'iroq, dela, baho, oy rejasi; ortda qolgan jamoa belgilanadi; qator bosilsa butun panel shu filialga o'tadi), filiallar sotuvi dinamikasi va ulushi, lidlar, konversiya, operatorlar reytingi, lid voronkasi, lid manbalari, qo'ng'iroqlar (javob/o'tkazib yuborilgan), muddati o'tgan dela, mutaxassis baholari |
| 7 | **Mobil ilova** | «Ilova o'syaptimi, ishlatishyaptimi?» | Foydalanuvchilar (jami/yangi/faol), platforma va versiyalar, til/bozor, tasdiqlash va bekor voronkalari, konsultatsiyalar, faollik (AI doktor, salomatlik, efir), ball va sovg'alar, «Doctor Ali Pro» (shifokor ilovasi) |
| 8 | **Mahsulotlar** | «Nima sotilyapti?» | Top mahsulotlar (dona, tushum, kanal), toifalar, sovg'aga ketganlar, ombor ogohlantirishlari |
| 9 | **Mijozlar** | «Mijoz qaytib kelyaptimi?» | Yangi/qaytgan, takroriy xarid, o'rtacha LTV, kogorta jadvali, top mijozlar, hududlar |
| 10 | **Shifokorlar** | «Shifokor qancha olib kelyapti?» | Konsultatsiya, klinika qabuli, sotuv, komissiya, to'lanmagan, reyting |
| 11 | **Signallar** | «Nimaga e'tibor berishim kerak?» | Barcha ogohlantirishlar: daraja, toifa, vaqt, havola, «ko'rildi» |
| 12 | **Hisobotlar** | «Menga tayyor hujjat kerak» | Kunlik/haftalik/oylik hisobot, Excel/PDF eksport, Telegram kunlik xulosa |
| 13 | **Sozlamalar** | — | Oylik reja, signal chegaralari, kirish huquqlari, xavfsizlik, til/mavzu |

**Global filtr** (hamma bo'limga ta'sir qiladi, URL da saqlanadi): Davr (Bugun · Kecha · 7 kun · 30 kun · Bu oy · O'tgan oy · Yil · Oraliq) · Filial (Barchasi yoki bir nechta) · Taqqoslash (oldingi davr / o'tgan yil / yo'q).

## 5. Signallar (avtomatik ogohlantirishlar)

Tizim qoidalar bo'yicha o'zi tekshiradi; chegaralar Sozlamalarda o'zgaradi.

| Kod | Daraja | Qoida (default) |
|---|---|---|
| `orders.unassigned_courier` | jiddiy | Tasdiqlangan buyurtma **3 soat**dan ortiq kuryersiz |
| `orders.pending_stale` | o'rta | `pending` da **24 soat**dan ortiq turgan buyurtmalar |
| `orders.shipping_late` | jiddiy | Yo'lda **48 soat**dan ortiq / yetkazish sanasi o'tgan |
| `orders.cancel_rate_high` | jiddiy | Kunlik atkaz ulushi **15%** dan yuqori (yoki o'rtachadan 1.5×) |
| `cod.unsettled` | kritik | Kuryerda **1 kundan** ortiq topshirilmagan naqd / summa **5 mln** dan ortiq |
| `clinic.closing_missing` | jiddiy | Filial kassasi kecha yopilmagan |
| `clinic.closing_mismatch` | kritik | Kassa yopilishida farq (kamomad/ortiqcha) **50 000 so'm** dan ortiq |
| `debts.overdue` | o'rta | Muddati o'tgan qarz summasi o'sdi / **10 mln** dan oshdi |
| `stock.out` / `stock.low` | o'rta | Mahsulot tugadi / minimal qoldiqdan past |
| `calls.missed_unhandled` | jiddiy | Qayta qo'ng'iroq qilinmagan o'tkazib yuborilganlar **10** tadan ko'p yoki 2 soatdan eski |
| `activities.overdue` | o'rta | Operatorda muddati o'tgan dela **20** tadan ko'p |
| `ratings.low` | o'rta | Mutaxassis/shifokor bahosi ≤ 2 yulduz |
| `sales.filial_lagging` | o'rta | Filial operatorlar jamoasining **bir operatorga sotuvi** kompaniya o'rtachasidan **15%** dan ortiq past (oxirgi 30 kun) |
| `revenue.drop` | jiddiy | Kunlik tushum o'rtachadan (oxirgi 4 hafta, shu hafta kuni) **30%** past |
| `plan.behind` | o'rta | Oy rejasidan orqada qolish **10%** dan ortiq (kunlik proporsiya bo'yicha) |
| `payouts.outstanding` | o'rta | Shifokor/operatorga to'lanmagan summa chegaradan oshdi |
| `app.payment_failures` | jiddiy | Click/Payme xatolari soati ichida **5** tadan ko'p |

Har signal: sarlavha, nima bo'lgani (raqam bilan), qaysi filial, qachondan beri, **«Ko'rish»** havolasi (tegishli bo'limga filtr bilan o'tadi). Holatlar: `open → acknowledged → resolved` (sabab yo'qolsa tizim o'zi yopadi).

## 6. Metrikalar lug'ati (yagona ta'rif — backend va frontend shunga tayanadi)

Pul — **so'm, butun son**. Vaqt mintaqasi — `Asia/Tashkent`. «Kun» = 00:00–23:59 Toshkent vaqti.

| Metrika | Ta'rif |
|---|---|
| **Yetkazib berish tushumi** | Davrda `delivered` bo'lgan buyurtmalar `payable_amount` yig'indisi (`delivered_at` bo'yicha), qaytarishlar ayirilgan |
| **Klinika tushumi** | Qabulxona `gross_revenue` (kassa sotuvi + muolaja + konsultatsiya), bekor qilinganlarsiz |
| **Onlayn konsultatsiya tushumi** | Ilovada to'langan konsultatsiyalar (`is_paid`, `paid_at` bo'yicha), refund ayirilgan |
| **Jami tushum** | Yuqoridagi uchtasining yig'indisi. Ilova buyurtmasi klinikaga «incoming» bo'lib tushsa **ikki marta sanalmaydi** (yetkazib berish kanalida qoladi) |
| **Yig'ilgan pul** | Haqiqatda qo'lga tushgan: klinika `total_collected` + onlayn to'langan (`paid_at`) + logist qabul qilgan COD (`settle`) |
| **Xarajat** | Qabulxona `expenses` + operator komissiyasi to'lovlari + shifokor to'lovlari (payout) |
| **Sof qoldiq** | Yig'ilgan pul − Xarajat (bu **foyda emas** — tannarx hisobga olinmaydi; UI da «taxminiy» deb yoziladi) |
| **Buyurtmalar** | Davrda yaratilgan buyurtmalar soni (`created_at`) |
| **Tasdiqlash ulushi** | `pending` dan `confirmed` ga o'tganlar ÷ davrda yaratilgan `pending` lar |
| **Yetkazish ulushi** | `delivered` ÷ (`delivered` + `cancelled`) — yakunlanganlar ichida |
| **Atkaz ulushi** | `cancelled` ÷ davrda yaratilganlar |
| **O'rtacha chek** | Yetkazib berish tushumi ÷ yetkazilgan buyurtmalar soni |
| **Bosqich vaqti** | `created→confirmed`, `confirmed→shipped`, `shipped→delivered` — mediana va o'rtacha (timeline `order.status_changed` dan) |
| **Kuryerda naqd** | Yetkazilgan, to'lovi naqd, lekin logist `settle` qilmagan buyurtmalar summasi |
| **Konversiya (lid)** | Birinchi `confirmed` buyurtmasi bor lidlar ÷ davrda yaratilgan lidlar |
| **Operatorlar sotuvi** | Operator yaratgan va davrda `delivered` bo'lgan buyurtmalar `payable_amount` yig'indisi. Filial jamoasi sotuvi = shu filial operatorlari yig'indisi; filiallar yig'indisi = kompaniya bo'yicha operatorlar sotuvi |
| **Bir operatorga sotuv** | Filial jamoasi sotuvi ÷ filialdagi faol operatorlar soni. Kompaniya o'rtachasi = barcha filiallar sotuvi ÷ barcha operatorlar (filiallar o'rtachasining o'rtachasi **emas**) |
| **Filial jamoasi rejasi** | Joriy oy, `yetkazib berish` kanali, shu filial: oy boshidan tushum ÷ reja (Sozlamalardagi filial × kanal rejasi). Reja kiritilmagan bo'lsa ko'rsatilmaydi |
| **Yangi mijoz** | Birinchi yetkazilgan buyurtmasi / birinchi klinika tashrifi shu davrda bo'lgan mijoz |
| **Qaytgan mijoz** | Davrda xarid qilgan, lekin birinchi xaridi oldinroq bo'lgan mijoz |
| **Faol foydalanuvchi (ilova)** | Davrda kamida 1 marta ilovani ochgan (`last_seen_at` / kunlik faollik jadvali) |
| **Reja bajarilishi** | Oy boshidan jami tushum ÷ oylik reja (Sozlamalarda, filial × kanal bo'yicha) |

## 7. Hozir yo'q — yangi yig'ish kerak bo'lgan ma'lumotlar

| Nima | Nega kerak | Yechim |
|---|---|---|
| Filiallararo agregat | Barcha mavjud endpointlar bitta filialga yopiq | `owner` roli + `/api/owner/*` (`02_BACKEND_TZ`) |
| Ilova kunlik faolligi (DAU/MAU) | Faqat `last_seen_at` bor — tarix yo'q | `UserDailyActivity(user, date, platform, app_version)` — token yangilanganda backend yozadi (ilovaga tegilmaydi) |
| Bosqich vaqtlari | Hisoblanmagan | `TimelineEvent(order.status_changed)` dan kunlik agregat |
| Ilova do'kon ko'rsatkichlari (yuklab olish, reyting) | Backendda yo'q | **2-bosqich**: App Store Connect / Google Play API |
| Tannarx / sof foyda | Faqat klinika omborida `costPrice` bor | **2-bosqich**; hozircha «Sof qoldiq» (pul oqimi) |
| Oylik reja | Yo'q | `OwnerTarget` modeli (Sozlamalar) |
| Kuryer ilovasi ma'lumotlari | Ilova hali qurilmagan | Logist ma'lumotlari yetarli; kuryer ilovasi chiqqach geolokatsiya/isbot qo'shiladi |

## 8. Nofunksional talablar

- **Qurilmalar:** telefon (360–430 px), planshet (768–1024), noutbuk/desktop (1280–1920+). Bitta kod, uch joylashuv; telefonda pastki tab-bar, jadvallar kartalarga aylanadi.
- **Tezlik:** birinchi ekran < 2 s (4G), filtr o'zgarishi < 500 ms (kesh), jonli ko'rsatkichlar WS orqali.
- **Yangilik:** «Bugun» ko'rsatkichlari ≤ 60 s kechikish; tarixiy agregatlar tunda qayta hisoblanadi. Har ekranda «yangilangan vaqt» ko'rinadi.
- **Xavfsizlik:** 2 bosqichli kirish (parol + SMS/TOTP), httpOnly cookie sessiya, qurilmalar ro'yxati, har kirish audit jurnalida, sessiya qurilmada eslab qolinadi (refresh 14 kun, har kirishda yangilanadi; egasi qarori 2026-10-10 — harakatsizlikda chiqarish yo'q).
- **Til:** o'zbek (lotin) — asosiy, rus — ikkinchi. Mavzu: yorug' / qorong'i / tizim.
- **O'rnatish:** PWA (telefon bosh ekraniga), 2-bosqichda push-signallar va Telegram xulosa.
- **Holatlar:** har ma'lumot bloki — skeleton · bo'sh · natija yo'q · xato+qayta urinish · oflayn · tayyor.

## 9. Ochiq savollar (javob kelguncha taxmin amal qiladi)

1. `owner` roli qabul qilinadimi (§2)? Taxmin: **ha**, faqat o'qish.
2. Boshliq qo'ng'iroq yozuvlarini eshita oladimi? Hozirgi qaror — faqat filial admini. Taxmin: **1-bosqichda yo'q**.
3. Mijozlarning shaxsiy ma'lumoti (ism/telefon) boshliqqa to'liq ko'rinadimi? Taxmin: **ha** (`owner`), `owner_viewer` uchun telefon maskalanadi.
4. Filiallar ro'yxati: sotuv filiallari va klinika filiallari bitta `Filial` jadvalidami? Taxmin: **ha** (`filial.id` umumiy).
5. Oylik reja kim tomonidan kiritiladi — boshliqning o'zi (taxmin) yoki hisobchi?
6. Telegram xulosa uchun bot bormi yoki yangi bot ochiladi?
7. Klinika saytidan (`reception`) kelgan buyurtmalar qaysi kanalga yoziladi? Taxmin: **Klinika**.
8. Operator bitta filialga biriktirilganmi va filialdan filialga o'tsa eski sotuvi qayerda qoladi? Taxmin: operator **bitta** filialda; sotuv **buyurtma yaratilgan paytdagi** filialga yoziladi (o'tgandan keyin tarix ko'chmaydi).
9. Filial jamoasi «ortda» deb qaysi o'lchov bilan topiladi? Taxmin: **bir operatorga sotuv**, kompaniya o'rtachasidan 15% past (chegara Sozlamalarda o'zgaradi).
