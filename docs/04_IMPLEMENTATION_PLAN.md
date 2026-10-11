# 04 — IMPLEMENTATSIYA REJASI: boshliq paneli

Sana: 2026-10-02 (holat yangilandi: 2026-10-03). Hujjatlar: `01_CONCEPT` → `02_BACKEND_TZ` → `03_FRONTEND_TZ` → `../design/`.

## 0. Hozirgi bosqich
| Qadam | Holat |
|---|---|
| Mavjud tizimlar inventari (klinika, CRM, logist, ilovalar) | ✅ |
| Konsepsiya, metrikalar lug'ati, signallar | ✅ `01` |
| Backend TZ (`owner` roli, `/api/owner/*`) | ✅ `02` — backend jamoasiga yuboriladi |
| Frontend TZ | ✅ `03` |
| UI prototip (barcha ekranlar, desktop + telefon, yorug' + qorong'i) | ✅ `../design/` — egasi tasdiqladi (2026-10-03) |
| Frontend kodi (F0–F4: barcha 15 ekran, namuna rejimida) | ✅ `src/` — lint · tsc · 813 test yashil; **brauzerda hali ishga tushirilmagan** (`npm run dev` — foydalanuvchida) |
| Shartnoma qo'shimchalari (`02` §12) va JSON namunalar (`api-samples/`) | ✅ backend jamoasiga yuboriladi |
| Haqiqiy API ga ulash (F5) | ⏸ backend `O-B0` ni bergach — server `config/servers.mjs` dan olinadi, `NEXT_PUBLIC_API_MOCKING=0` |

## 1. Tracklar
| Track | Kim | Hujjat |
|---|---|---|
| **O-B** Backend | backend jamoasi (Django) | `02` §11 (O-B0 … O-B3) |
| **O-F** Frontend | Claude Code, `doctor_ali_owner_next` | `03` |

Frontend backendni kutmaydi — MSW mock (`02` shakllarida). Mavjud loyihalar (`mehrigiyo_*`, `doctor_ali_clinic_next`) **o'zgartirilmaydi**.

## 2. Frontend bosqichlari
| Bosqich | Tarkib | Qabul mezoni |
|---|---|---|
| **F0 — poydevor** | Loyiha skeleti, tokenlar (`globals.css`), shriftlar, shell (sidebar/topbar/mobil tab-bar), `scope` (davr·filial·taqqoslash, URL), `shared/ui` (StatTile, MetricDelta, ChartCard, DataTable, states/*), `shared/ui/charts/*`, format util, MSW + fixture, login (BFF, mock), i18n uz/ru, mavzu | Sifat darvozasi yashil; 390/768/1440 da shell xatosiz; holatlar galereyasi sahifasi |
| **F1 — yadro ekranlar** | Umumiy · Buyurtmalar (+ drawer, tarix) · Moliya · Signallar | Prototip bilan vizual mos; mock'da to'liq ishlaydi |
| **F2 — operatsion ekranlar** | Klinika · Yetkazib berish · Sotuv jamoasi (+ filiallar — operator jamoalari, 2026-10-05) | — |
| **F3 — o'sish ekranlari** | Mobil ilova · Mahsulotlar · Mijozlar · Shifokorlar | — |
| **F4 — xizmat** | Hisobotlar (eksport, Telegram xulosa) · Sozlamalar (reja, chegaralar, sessiyalar) · `⌘K` · jonli lenta (WS) · PWA | — |
| **F5 — real API** | Backend tayyor bo'lgach `.env` almashtiriladi (namuna butunlay o'chadi — bittalab emas, chunki u BFF darajasida); zod xato bergan endpointlar `02` §12 bilan solishtirib tuzatiladi; Playwright e2e; yuk/tezlik tekshiruvi | Test serverda (`imorganic.uz`) real raqamlar filial admin statistikasi bilan mos |

Bog'liqlik: F1 real ← O-B0; F2 real ← O-B1; F3/F4 real ← O-B2.

## 3. Rollout
1. Test server + mock → egasiga havola (ko'rib chiqish).
2. O-B0 tayyor → Umumiy/Buyurtmalar real; raqamlar CRM admin statistikasi bilan solishtiriladi (1 filial).
3. Barcha filiallar + Moliya/Klinika → asosiy foydalanish.
4. Telegram xulosa, push, `owner_viewer` — 2-bosqich.

## 4. Xavflar
| Xavf | Yumshatish |
|---|---|
| Backend agregatlari kechiksa | Mock bilan UI to'liq tayyor turadi; real ulanish endpoint bo'yicha bosqichma-bosqich |
| Metrika ta'rifi turlicha tushunilsa (tushum ≠ yig'ilgan pul) | `01` §6 lug'at — yagona manba; UI da har ko'rsatkichda «?» izoh |
| Ikki marta sanash (ilova buyurtmasi klinikada ham ko'rinadi) | `02` §10 test №3 |
| Ilova faolligi tarixi yo'q | `UserDailyActivity` yoqilgan kundan boshlab to'planadi — UI «… dan beri» deb ko'rsatadi |
| Maxfiy moliyaviy ma'lumot | BFF + httpOnly cookie + 2FA + audit (`03` §5, `02` §9) |

## 5. Egasidan kutilayotgan qarorlar
`01_CONCEPT` §9 dagi 7 ta savol + UI prototipni tasdiqlash (yoki o'zgartirishlar ro'yxati).
