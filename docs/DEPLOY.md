# DEPLOY — saytni (panelni) serverga chiqarish

Sana: 2026-10-09. Kim uchun: **egasi / DevOps**. Har qadamda nima qilinishi va natijada nima chiqishi yozilgan.

## 0. Rejim

**Hozir — DEMO rejim (2026-10-28 dan, taqdimot uchun).** `config/servers.mjs` da `DEFAULT_DEMO = true`: panel backendga umuman murojaat qilmaydi, barcha bo'limlar ichki namuna (mock) bazadan ishlaydi — xarita, AI chat, Excel/PDF hisobotlar ham. Serverga odatdagidek (§3, Docker) chiqariladi; `BACKEND_ORIGIN` / `APP_SERVER` shart emas. Kirish — alohida demo login/parol: `config/servers.mjs` dagi `DEMO_CREDENTIALS` (kerak bo'lsa shu yerda almashtiring). Demo o'zgarishlari (ko'rildi, ruxsatlar, AI suhbatlari) server xotirasida — konteyner qayta ishga tushsa boshlang'ich holatga qaytadi.

**Backend tayyor bo'lganda** — `DEFAULT_DEMO = false` (yoki konteynerga `APP_DEMO=0`). Shunda barcha raqamlar `config/servers.mjs` dagi serverdan keladi. Undan oldin: backend `npm run contract:check -- --full` dan 0 ta ✗ bilan o'tgan bo'lsin (`BACKEND_HANDOFF.md` §8).

## 1. Sizdan kerak

| Nima | Misol |
|---|---|
| Server (VPS) | Ubuntu 22/24, 1 vCPU, 1–2 GB RAM, Docker o'rnatilgan |
| Domen va DNS | `nazorat.doctorali.uz` → serverning IP manzili (A yozuv) |
| Backend | `config/servers.mjs`: `prod` → `https://my.imorganic.uz` (default), `test` → `https://imorganic.uz` |
| Bot username (ixtiyoriy) | `doctor_ali_nazorat_bot` |

## 2. Muhit o'zgaruvchilari

**Build paytida** — kodga yoziladi, o'zgartirsangiz obrazni qayta build qilish kerak:

| Nomi | Qiymat |
|---|---|
| `NEXT_PUBLIC_WS_URL` | `wss://<backend>/ws/owner/` (WS tayyor bo'lsa; ixtiyoriy) |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | ixtiyoriy |

**Ishga tushirish paytida** — `.env.production` faylida, gitga qo'shilmaydi:

```
# APP_SERVER=test                        # default `config/servers.mjs` dagi (prod); test serverga o'tish uchun
# BACKEND_ORIGIN=https://…               # nomlanganlardan boshqa manzil; APP_SERVER dan ustun
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
docker build -t doctor-ali-nazorat .
```

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
- [ ] Kirish: backend bergan login va parol bilan.
- [ ] Barcha bo'limlar ochiladi, «Ma'lumot olinmadi» bloki yo'q (bo'lsa — `npm run contract:check` bilan qaysi maydon mos emasligini toping).
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
| Kirgandan keyin yana kirish sahifasi | sayt `https` da emasmi? Cookie `Secure` — faqat HTTPS da saqlanadi |
| Bloklarda «Ma'lumot olinmadi» | backend javobi shartnomaga mos emas → `npm run contract:check` |
| Telegram mini app oq ekran | `MINI_APP_URL` `/tg` bilan tugaydimi, sayt HTTPS damı; Telegram Web (brauzer) qo'llanmaydi |

Muammo bo'lsa, quyidagilarni yuboring: `docker logs --tail 100 nazorat`, ekran rasmi va qaysi qadamda bo'lgani. **Token va parollarni yubormang.**
