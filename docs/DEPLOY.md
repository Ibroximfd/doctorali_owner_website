# DEPLOY — saytni (panelni) serverga chiqarish

Sana: 2026-10-09. Kim uchun: **egasi / DevOps**. Har qadamda nima qilinishi va natijada nima chiqishi yozilgan.

## 0. Avval qaror: qaysi rejimda chiqaramiz?

| Rejim | Qachon | Xavf |
|---|---|---|
| **A. Namuna rejimi** (`NEXT_PUBLIC_API_MOCKING=1`) | backend hali tayyor emas, ko'rinishni sinash uchun | **istalgan login va parol bilan kiriladi**, raqamlar soxta. Ochiq internetga faqat himoya bilan (§4) |
| **B. Haqiqiy rejim** (`NEXT_PUBLIC_API_MOCKING=0`, server — `config/servers.mjs`) | backend `contract:check` dan 0 ta ✗ bilan o'tgach (`BACKEND_HANDOFF.md` §8) | yo'q — kirish parol + SMS bilan, ma'lumot haqiqiy |

Productionda A rejim ataylab yoqilishi kerak: `ALLOW_SAMPLE_DATA_IN_PRODUCTION=1` qo'yilmasa, server ishga tushmaydi. Bu flag panel tasodifan «istalgan parol bilan» holatida qolib ketmasligi uchun.

## 1. Sizdan kerak

| Nima | Misol |
|---|---|
| Server (VPS) | Ubuntu 22/24, 1 vCPU, 1–2 GB RAM, Docker o'rnatilgan |
| Domen va DNS | `nazorat.doctorali.uz` → serverning IP manzili (A yozuv) |
| Backend (B rejim) | `config/servers.mjs`: `prod` → `https://my.imorganic.uz` (default), `test` → `https://imorganic.uz` |
| Bot username (ixtiyoriy) | `doctor_ali_nazorat_bot` |

## 2. Muhit o'zgaruvchilari

**Build paytida** — kodga yoziladi, o'zgartirsangiz obrazni qayta build qilish kerak:

| Nomi | A rejim | B rejim |
|---|---|---|
| `NEXT_PUBLIC_API_MOCKING` | `1` | `0` |
| `ALLOW_SAMPLE_DATA_IN_PRODUCTION` | `1` | `0` |
| `NEXT_PUBLIC_WS_URL` | — | `wss://<backend>/ws/owner/` (WS tayyor bo'lsa) |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | ixtiyoriy | ixtiyoriy |

**Ishga tushirish paytida** — `.env.production` faylida, gitga qo'shilmaydi:

```
ALLOW_SAMPLE_DATA_IN_PRODUCTION=0        # A rejimda 1
# APP_SERVER=test                        # default `config/servers.mjs` dagi (prod); test serverga o'tish uchun
# BACKEND_ORIGIN=https://…               # nomlanganlardan boshqa manzil; APP_SERVER dan ustun
# TELEGRAM_BOT_TOKEN=                    # faqat A rejimda; B rejimda QO'YILMAYDI
```

**Serverni almashtirish** — ikki yo'l, ikkisi ham build talab qilmaydi (qiymat ishga tushishda o'qiladi):
- `.env.production` da `APP_SERVER=test` → `docker restart nazorat`;
- yoki `config/servers.mjs` dagi `DEFAULT_SERVER` ni o'zgartirib, kodni serverga yangilash.

Test va prod bir serverda yonma-yon turganda portlar `config/servers.mjs` da: prod — 3000, test — 3001
(`docker run … -p 127.0.0.1:3001:3000 -e APP_SERVER=test`). Konteyner logida birinchi qatorda
`Backend: Test — https://imorganic.uz` ko'rinadi — qaysi serverga ulangani shundan tekshiriladi.

## 3. Docker bilan o'rnatish (tavsiya)

Loyiha papkasini serverga ko'chiring (`git clone` yoki `rsync`), so'ng:

```bash
docker build -t doctor-ali-nazorat --build-arg NEXT_PUBLIC_API_MOCKING=0 .
```
A rejim uchun: `--build-arg NEXT_PUBLIC_API_MOCKING=1 --build-arg ALLOW_SAMPLE_DATA_IN_PRODUCTION=1`.

```bash
docker run -d --name nazorat --restart=always -p 127.0.0.1:3000:3000 --env-file .env.production doctor-ali-nazorat
```
Port faqat `127.0.0.1` da ochiladi, tashqaridan nginx orqali kiriladi.

Tekshirish: `docker logs nazorat` — xato yo'q bo'lishi kerak. `curl -I http://127.0.0.1:3000/login` → `200`.

Yangilash: kodni yangilang → `docker build …` → `docker rm -f nazorat` → `docker run …` (yuqoridagi buyruq).

## 4. HTTPS (nginx + Let's Encrypt)

`/etc/nginx/sites-available/nazorat`:
```nginx
server {
  server_name nazorat.doctorali.uz;

  # Namuna rejimida (A) ochiq internetdan himoya — faqat ofis IP lari:
  # allow 213.230.0.0/16;   deny all;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  client_max_body_size 1m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    # Mijoz IP si backend audit jurnali va urinishlar cheklovi uchun (brauzer soxtalashtira olmaydi).
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto https;
    proxy_read_timeout 60s;
  }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/nazorat /etc/nginx/sites-enabled/
sudo certbot --nginx -d nazorat.doctorali.uz
sudo nginx -t && sudo systemctl reload nginx
```
Natija: `https://nazorat.doctorali.uz` ochiladi va kirish sahifasi chiqadi.

## 5. Ishga tushirgandan keyin — 10 daqiqalik tekshiruv

- [ ] `https://…/login` ochiladi; telefonda ham (Safari, Chrome).
- [ ] Kirish: A — istalgan login, parol va kod; B — haqiqiy parol + SMS.
- [ ] Barcha bo'limlar ochiladi, «Ma'lumot olinmadi» bloki yo'q (B rejimda bo'lsa — `contract:check` ga qayting).
- [ ] Davr, filial va taqqoslash o'zgartirilganda raqamlar o'zgaradi.
- [ ] Yorug' va qorong'i mavzu; uz/ru tillari.
- [ ] Telefonda pastki menyu, jadvallar karta ko'rinishida.
- [ ] Brauzerni yopib qayta ochganda login so'ralmaydi (sessiya eslab qolinadi); «Chiqish» bosilsa — kirish sahifasi.
- [ ] Telegram: bot `.env` dagi `MINI_APP_URL=https://nazorat.doctorali.uz/tg` → botni qayta ishga tushiring → `/start` → PIN.
- [ ] Brauzer konsolida (F12) qizil xato yo'q.

## 6. Muammo bo'lsa

| Belgi | Sabab va yechim |
|---|---|
| Konteyner darhol to'xtaydi, logda `Noma'lum server: "…"` | `APP_SERVER` da `prod`/`test` dan boshqa nom (mavjudlari `config/servers.mjs` da) |
| Ma'lumot boshqa serverdan kelgandek | log birinchi qatoridagi `Backend: …` ni o'qing; `BACKEND_ORIGIN` qolib ketgan bo'lsa u `APP_SERVER` dan ustun turadi |
| Logda `Productionda NEXT_PUBLIC_API_MOCKING=1` | A rejimda `ALLOW_SAMPLE_DATA_IN_PRODUCTION=1` yo'q (build va run da ham) |
| Kirgandan keyin yana kirish sahifasi | sayt `https` da emasmi? Cookie `Secure` — faqat HTTPS da saqlanadi |
| Bloklarda «Ma'lumot olinmadi» | backend javobi shartnomaga mos emas → `npm run contract:check` |
| Telegram mini app oq ekran | `MINI_APP_URL` `/tg` bilan tugaydimi, sayt HTTPS damı; Telegram Web (brauzer) qo'llanmaydi |

Muammo bo'lsa, quyidagilarni yuboring: `docker logs --tail 100 nazorat`, ekran rasmi va qaysi qadamda bo'lgani. **Token va parollarni yubormang.**
