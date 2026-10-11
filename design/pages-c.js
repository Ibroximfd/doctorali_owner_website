/* Ekranlar: Mobil ilova, Mahsulotlar, Mijozlar, Shifokorlar, Signallar, Hisobotlar, Sozlamalar, Holatlar, Kirish */
(function () {
  const { PAGES, U, S } = App, { ic, esc } = U;
  const sp = (seed, up = 0.25) => { const r = D.rng(seed); let v = 50; return Array.from({ length: 12 }, () => (v += (r() - 0.5 + up * 0.5) * 12)); };
  const som = (v) => F.m(v) + " so'm";
  const leaf = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>';

  /* ===================== MOBIL ILOVA ===================== */
  PAGES.app = {
    title: 'Mobil ilova',
    render(c) {
      const a = D.app, k = (v) => Math.round(v * c.p.scale), cf = a.confirmFunnel, xf = a.cancelFunnel, kept = xf[0][1] - xf[3][1];
      const fn = (rows, last) => rows.map((r, i) => ({ name: r[0], count: k(r[1]), v: i === rows.length - 1 ? last : 'var(--s1)' }));
      return `
      ${U.head({ t: 'Mobil ilova', s: '«Doctor Ali» (mijozlar) va «Doctor Ali Pro» (shifokorlar)' })}
      <div class="kpis">
        ${U.kpi({ k: 'Jami foydalanuvchilar', v: F.n(a.total), d: c.dv(5.0), spark: sp(121, 0.4) })}
        ${U.kpi({ k: 'Yangi foydalanuvchilar', v: F.n(k(a.newU)), d: c.dv(8.3), spark: sp(122) })}
        ${U.kpi({ k: 'Faol (30 kun)', v: F.n(a.active), d: c.dv(6.7), note: `kunlik o'rtacha ${F.n(a.dau)}`, spark: sp(123, 0.3) })}
        ${U.kpi({ k: 'Ilova orqali buyurtma', v: F.pct(a.share), d: c.dv(2.1), pp: true, spark: sp(124, 0.2) })}
        ${U.kpi({ k: 'Onlayn konsultatsiya', v: F.n(k(a.consult)), d: c.dv(4.9), spark: sp(125) })}
        ${U.kpi({ k: 'Push yoqilgan', v: F.pct(a.push, 0), d: c.dv(-0.6), pp: true, spark: sp(126, -0.1) })}
      </div>
      <div class="grid">
        ${U.chartCard({ cls: 'c8', title: 'Kunlik faol foydalanuvchilar', sub: 'Kuniga kamida bir marta ilovani ochganlar', chart: 'ap-dau' })}
        ${U.card({ cls: 'c4', title: 'Qurilmalar va versiyalar', sub: `${F.n(a.total)} foydalanuvchi`, body: `<div class="duo">${a.platform.map((p) => `<div><div class="k">${p[0]}</div><div class="v">${F.pct((p[1] / a.total) * 100, 0)}</div><div class="n">${F.n(p[1])}</div></div>`).join('')}</div><div class="dr-sec" style="margin-top:14px"><h3>Ilova versiyasi</h3>${U.barList(a.versions.map((v) => [v[0], v[1], v[2]]), { fmt: (v) => F.pct(v, 0), share: false, tag: true })}</div><div class="dr-sec" style="margin-top:16px"><h3>Bozor</h3>${U.barList(a.markets, { fmt: (v) => F.pct(v), share: false, color: 'var(--s3)' })}</div>` })}
        ${U.chartCard({ cls: 'c4 m6', title: 'Yangi foydalanuvchilar', sub: "Ro'yxatdan o'tganlar", chart: 'ap-new' })}
        ${U.card({ cls: 'c4 m6', title: 'Interfeys tili', sub: 'Foydalanuvchilar ulushi', body: U.barList(a.langs, { fmt: (v) => F.pct(v), share: false }) })}
        ${U.card({ cls: 'c4', title: 'Faollik', sub: 'Ilova imkoniyatlaridan foydalanish', body: U.kv(a.engagement.map((e) => [esc(e[0]), `${F.n(k(e[1]))} ${U.delta(c.dv(e[2]))}`])) })}
        ${U.card({ cls: 'c6', title: 'Buyurtmani tasdiqlash voronkasi', sub: 'Operator yaratgan buyurtma → mijoz ilovada tasdiqlaydi', body: U.funnel(fn(cf, 'var(--order-delivered)'), { loss: true }) })}
        ${U.card({ cls: 'c6', title: 'Bekor qilish voronkasi', sub: '3 bosqichli ushlab qolish oqimi qanday ishlayapti', body: `${U.funnel(fn(xf, 'var(--order-cancelled)'))}<div class="banner" style="margin-top:14px">${ic('shield', 's')}<span><b>${F.n(k(kept))} ta buyurtma saqlab qolindi</b> — bekor qilishni boshlaganlarning ${F.pct((kept / xf[0][1]) * 100)}</span></div>` })}
        ${U.card({ cls: 'c4 m6', title: 'Onlayn konsultatsiyalar', sub: 'Ilovadagi shifokor qabuli', body: `<div class="duo"><div><div class="k">Tushum</div><div class="v">${F.m(k(a.cons.revenue))}<small>so'm</small></div></div><div><div class="k">Baho</div><div class="v">${F.dec(a.cons.rating)}<small>/ 5</small></div><div class="n">${F.n(k(a.cons.ratings))} ta baho</div></div></div><div style="margin-top:10px">${U.kv([['Yaratildi', F.n(k(a.cons.created))], ["To'landi", F.n(k(a.cons.paid)), F.pct((a.cons.paid / a.cons.created) * 100)], ['Yakunlandi', F.n(k(a.cons.done))], ['Bekor qilindi', F.n(k(a.cons.cancelled)), F.pct((a.cons.cancelled / a.cons.created) * 100)]])}</div>` })}
        ${U.card({ cls: 'c4 m6', title: "Ball va sovg'alar", sub: "1% keshbek · har 10-buyurtmaga sovg'a", body: U.kv([['Berilgan ball', F.n(k(a.loyalty.issued))], ['Sarflangan ball', F.n(k(a.loyalty.spent))], ['Kuygan ball (oylik)', F.n(k(a.loyalty.expired))], ['Hamyonlardagi qoldiq', F.n(a.loyalty.wallets), "≈ 41,2 mln so'm"], ["Yutilgan sovg'alar", F.n(k(a.loyalty.giftsWon))], ["Yetkazilgan sovg'alar", F.n(k(a.loyalty.giftsDelivered))]]) })}
        ${U.card({ cls: 'c4', title: 'Doctor Ali Pro', sub: 'Shifokorlar ilovasi', body: `<div class="duo"><div><div class="k">Faol shifokorlar</div><div class="v">${a.doctorApp.active}</div></div><div><div class="k">Yaratgan buyurtmalar</div><div class="v">${F.n(k(a.doctorApp.orders))}</div><div class="n">${som(k(a.doctorApp.amount))}</div></div></div><div class="banner" style="margin-top:12px">${ic('info', 's')}<span>App Store / Google Play reytingi va yuklab olishlar — <b>2-bosqichda</b> ulanadi.</span></div>` })}
      </div>`;
    },
    mount(c) {
      const a = D.app, n = c.lab.length, r = D.rng(131);
      Charts.mount('ap-dau', 'line', { title: 'Kunlik faol foydalanuvchilar', labels: c.lab, yf: F.n, h: 330, series: [{ name: 'Faol foydalanuvchilar', color: 'var(--s1)', values: c.lab.map((_, i) => Math.round(a.dau * (0.86 + (0.22 * i) / Math.max(1, n - 1)) * (0.93 + r() * 0.14) * (c.p.unit === 'hour' ? 0.05 + 0.1 * Math.exp(-Math.pow(i - 13, 2) / 30) : 1))) }] });
      Charts.mount('ap-new', 'cols', { title: 'Yangi foydalanuvchilar', labels: c.lab, yf: F.n, h: 230, series: [{ name: "Ro'yxatdan o'tdi", color: 'var(--s1)', values: D.series(c.key, a.newU * c.p.scale, 132, 0.25) }] });
    },
  };

  /* ===================== MAHSULOTLAR ===================== */
  PAGES.products = {
    title: 'Mahsulotlar',
    render(c) {
      const ps = D.products, units = ps.reduce((a, p) => a + p.u, 0), rev = D.categories.reduce((a, x) => a + x[1], 0), maxR = Math.max(...ps.map((p) => p.rev));
      return `
      ${U.head({ t: 'Mahsulotlar', s: 'Nima sotilyapti — yetkazib berish va klinika do\'koni birga' })}
      <div class="kpis k4">
        ${U.kpi({ k: 'Sotilgan dona', v: F.n(c.k(units)), d: c.dv(7.2), note: 'top 8 mahsulot', spark: sp(141) })}
        ${U.kpi({ k: 'Mahsulot tushumi', v: F.m(c.k(rev)), unit: "so'm", d: c.dv(9.4), spark: sp(142) })}
        ${U.kpi({ k: "Sovg'aga ketgan", v: F.n(c.k(87)), unit: 'dona', d: c.dv(14.0), note: "tannarxi ≈ 13,9 mln so'm" })}
        ${U.kpi({ k: 'Ombor ogohlantirishi', v: '6', unit: 'mahsulot', note: '2 tugagan · 4 kam qolgan', d: null })}
      </div>
      <div class="grid">
        ${U.card({ cls: 'c8', title: 'Top mahsulotlar', sub: "Tushum bo'yicha", flush: true, body: U.tbl({
          cols: [{ h: 'Mahsulot', main: true }, { h: 'Tushum', r: true }, { h: 'Dona', r: true, num: true }, { h: 'Yetkazib berish', r: true, num: true }, { h: 'Klinika', r: true, num: true }, { h: "Sovg'a", r: true, num: true }, { h: 'Qoldiq', r: true }],
          rows: ps.map((p, i) => [`<div style="display:flex;gap:6px;align-items:center"><span class="rank">${i + 1}</span><div><b>${esc(p.n)}</b><div class="muted" style="font-size:11.5px">${esc(p.c)}</div></div></div>`, `<span class="num">${F.m(c.k(p.rev))}</span>${U.mini((p.rev / maxR) * 100)}`, F.n(c.k(p.u)), F.n(c.k(p.dl)), F.n(c.k(p.cl)), p.gift ? F.n(c.k(p.gift)) : '<span class="muted">—</span>', p.out ? U.pill('crit', 'Tugadi', 'oct') : p.low ? U.pill('warn', p.stock + ' dona', 'tri') : `<span class="num">${p.stock}</span>`]),
        }) })}
        ${U.card({ cls: 'c4', title: 'Toifalar', sub: `Jami ${som(c.k(rev))}`, body: U.barList(D.categories.map((x) => [x[0], c.k(x[1])]).sort((a, b) => b[1] - a[1]), { fmt: F.m }) })}
      </div>`;
    },
  };

  /* ===================== MIJOZLAR ===================== */
  PAGES.customers = {
    title: 'Mijozlar',
    render(c) {
      const cu = D.customers, k = (v) => Math.round(v * c.s);
      const q = (v) => (v === 100 ? 6 : Math.max(1, Math.min(5, Math.ceil(v / 9))));
      return `
      ${U.head({ t: 'Mijozlar', s: 'Mijoz qaytib kelyaptimi — yangi, takroriy xarid va qiymat' })}
      <div class="kpis">
        ${U.kpi({ k: 'Jami mijozlar', v: F.n(c.now(cu.total)), d: c.dv(2.1), spark: sp(151, 0.4) })}
        ${U.kpi({ k: 'Yangi mijozlar', v: F.n(k(cu.newC)), d: c.dv(-3.4), spark: sp(152, -0.2) })}
        ${U.kpi({ k: 'Qaytgan mijozlar ulushi', v: F.pct(cu.returning), d: c.dv(1.9), pp: true, spark: sp(153, 0.15) })}
        ${U.kpi({ k: 'Takroriy xarid', v: F.pct(cu.repeat), d: c.dv(0.8), pp: true, note: '90 kun ichida 2+ buyurtma', spark: sp(154, 0.1) })}
        ${U.kpi({ k: "Mijoz qiymati (o'rtacha)", v: F.n(cu.ltv), unit: "so'm", d: c.dv(4.0), spark: sp(155, 0.2) })}
        ${U.kpi({ k: 'Bir mijozga buyurtma', v: F.dec(cu.perCustomer), d: c.dv(1.2), spark: sp(156, 0.1) })}
      </div>
      <div class="grid">
        ${U.card({ cls: 'c7', title: 'Kogorta: mijozlar qaytishi', sub: "Birinchi xarid oyi bo'yicha — keyingi oylarda necha foizi yana xarid qildi", body: `<div class="tw"><table class="cohort"><thead><tr><th>Birinchi xarid</th><th>Mijoz</th>${[0, 1, 2, 3, 4, 5].map((m) => `<th>${m}-oy</th>`).join('')}</tr></thead><tbody>${cu.cohorts.map((r) => `<tr><td><b>${r[0]}</b></td><td class="num muted">${F.n(r[1])}</td>${[0, 1, 2, 3, 4, 5].map((m) => `<td>${r[2][m] != null ? `<span class="q${q(r[2][m])}" data-tip="${r[0]} kogortasi · ${m}-oy|Qaytganlar=${F.pct(r[2][m], 0)}|Mijoz=${F.n((r[1] * r[2][m]) / 100)}" tabindex="0">${r[2][m]}%</span>` : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="scale"><span>kam qaytdi</span>${[1, 2, 3, 4, 5].map((x) => `<i class="q${x}"></i>`).join('')}<span>ko'p qaytdi</span></div>` })}
        ${U.chartCard({ cls: 'c5', title: 'Yangi va qaytgan mijozlar', sub: 'Davrda xarid qilganlar', chart: 'cu-mix' })}
        ${U.card({ cls: 'c7', title: 'Eng qimmatli mijozlar', sub: 'Jami xarid summasi bo\'yicha', flush: true, body: U.tbl({
          cols: [{ h: 'Mijoz', main: true }, { h: 'Buyurtma', r: true, num: true }, { h: 'Jami xarid', r: true, num: true }, { h: 'Oxirgi', r: true, num: true }, { h: 'Ilova' }],
          rows: cu.top.map((t) => [U.user(t[0], t[1]), t[2], F.m(t[3]), t[4], t[5] ? U.pill('good', 'Bor', 'phone') : U.pill('neutral', "Yo'q")]),
        }) })}
        ${U.card({ cls: 'c5', title: 'Mijozlar hududlar bo\'yicha', sub: 'Eng faol 7 hudud', body: U.barList([...D.regions].sort((a, b) => b[2] - a[2]).slice(0, 7).map((r) => [r[1], Math.round(r[2] * 15.9)])) })}
      </div>`;
    },
    mount(c) {
      Charts.mount('cu-mix', 'cols', { title: 'Yangi va qaytgan mijozlar', labels: c.lab, yf: F.n, series: [{ name: 'Qaytgan', color: 'var(--s1)', values: c.ser(1654, 161, 0.2) }, { name: 'Yangi', color: 'var(--s2)', values: c.ser(1284, 162, -0.1) }] });
    },
  };

  /* ===================== SHIFOKORLAR ===================== */
  PAGES.doctors = {
    title: 'Shifokorlar',
    render(c) {
      const k = (v) => Math.round(v * c.p.scale), ds = D.doctors, maxS = Math.max(...ds.map((d) => d.sales));
      return `
      ${U.head({ t: 'Shifokorlar', s: 'Onlayn konsultatsiya, klinika qabuli, sotuv va komissiya' })}
      <div class="kpis k4">
        ${U.kpi({ k: 'Faol shifokorlar', v: '46', d: c.dv(2.0), note: 'davrda kamida 1 qabul' })}
        ${U.kpi({ k: 'Onlayn konsultatsiyalar', v: F.n(k(968)), d: c.dv(4.9), spark: sp(171) })}
        ${U.kpi({ k: 'Shifokorlar orqali sotuv', v: F.m(k(236e6)), unit: "so'm", d: c.dv(11.2), spark: sp(172) })}
        ${U.kpi({ k: "To'lanmagan komissiya", v: F.m(21.4e6), unit: "so'm", note: '11 shifokorga · hozir', d: null })}
      </div>
      <div class="grid">
        ${U.card({ cls: 'c12', title: 'Shifokorlar reytingi', sub: "Sotuv bo'yicha tartiblangan", flush: true, body: U.tbl({
          cols: [{ h: 'Shifokor', main: true }, { h: 'Sotuv', r: true }, { h: 'Onlayn', r: true, num: true }, { h: 'Klinika qabuli', r: true, num: true }, { h: 'Buyurtma', r: true, num: true }, { h: 'Komissiya', r: true, num: true }, { h: "To'lanmagan", r: true, num: true }, { h: 'Baho', r: true }],
          rows: ds.map((d, i) => [`<div style="display:flex;align-items:center;gap:6px"><span class="rank">${i + 1}</span>${U.user(d.n, d.sp + ' · ' + d.f)}</div>`, `<span class="num">${F.m(k(d.sales))}</span>${U.mini((d.sales / maxS) * 100)}`, F.n(k(d.on)), F.n(k(d.vis)), F.n(k(d.ord)), F.m(k(d.com)), d.out ? `<span style="color:var(--serious)">${F.m(d.out)}</span>` : '<span class="muted">0</span>', `${U.stars(d.r)} <span class="muted num" style="font-size:11.5px">(${d.rc})</span>`]),
        }) })}
      </div>`;
    },
  };

  /* ===================== SIGNALLAR ===================== */
  PAGES.alerts = {
    title: 'Signallar', noScope: true,
    render(c) {
      const sev = S.sev || 'all', all = D.alerts.map((a, i) => ({ a, i })), open = all.filter((x) => !S.acked.has(x.i)), done = all.filter((x) => S.acked.has(x.i));
      const cnt = (s) => open.filter((x) => s === 'all' || x.a.sev === s).length, list = open.filter((x) => sev === 'all' || x.a.sev === sev);
      const act = (x) => `<span style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><a class="btn sm" href="#${x.a.go}">Ko'rish${ic('go', 's')}</a><button class="btn sm ghost" data-ack="${x.i}">${ic('check', 's')}Ko'rildi</button><span class="pill neutral">${esc(x.a.cat)}</span></span>`;
      return `
      ${U.head({ t: 'Signallar', s: "Tizim o'zi topgan muammolar — sabab yo'qolsa signal o'zi yopiladi", acts: `<a class="btn" href="#settings">${ic('sliders', 's')}Chegaralarni sozlash</a>` })}
      <div class="grid">
        <section class="card c8">
          <div class="tfilters" style="padding-top:16px">${[['all', 'Barchasi'], ['crit', 'Kritik'], ['serious', 'Jiddiy'], ['moderate', "O'rta"]].map(([s, t]) => `<button class="chip" data-sev="${s}" aria-pressed="${sev === s}">${t}<span class="n">${cnt(s)}</span></button>`).join('')}</div>
          <div class="al">${list.length ? list.map((x) => U.alertItem(x.a, x.i, { tag: 'div', extra: act(x) })).join('') : `<div class="state"><span class="si">${ic('check')}</span><b>${open.length ? 'Bu darajada signal yo\'q' : 'Hammasi joyida'}</b><p>${open.length ? 'Boshqa darajani tanlang.' : "Hozircha e'tibor talab qiladigan narsa yo'q."}</p>${open.length ? '<button class="btn sm" data-sev="all">Barchasini ko\'rsatish</button>' : ''}</div>`}</div>
          ${done.length ? `<div class="card-h" style="border-top:1px solid var(--border);padding-top:14px"><div><h2>Ko'rilgan</h2><p>${done.length} ta · sabab yo'qolgach ro'yxatdan chiqadi</p></div></div><div class="al" style="opacity:.6;margin-top:8px">${done.map((x) => U.alertItem(x.a, x.i, { tag: 'div' })).join('')}</div>` : ''}
        </section>
        ${U.card({ cls: 'c4 as', title: 'Qoidalar', sub: 'Qachon signal chiqadi', tools: U.link('settings', 'Sozlash'), body: U.kv([['Tasdiqlangan, kuryersiz', '3 soat'], ['Kutilmoqda turgan', '24 soat'], ["Yo'lda kechikkan", '48 soat'], ['Kuryerda naqd', "1 kun / 5 mln"], ['Kassa farqi', "50 000 so'm"], ['Atkaz ulushi', '15%'], ["O'tkazib yuborilgan qo'ng'iroq", '10 ta'], ['Tushum pasayishi', '−30%'], ['Reja ortda qolishi', '10 f.p.']]) })}
      </div>`;
    },
  };

  /* ===================== HISOBOTLAR ===================== */
  PAGES.reports = {
    title: 'Hisobotlar', noScope: true,
    render() {
      const reps = [['Kunlik yakun', 'Tushum, buyurtmalar, kassa, signallar — bir sahifada', 'file'], ['Haftalik hisobot', 'Hafta dinamikasi, filiallar va operatorlar taqqoslash', 'chart'], ['Oylik moliya (P&L)', 'Tushum, xarajat, majburiyat, reja bajarilishi', 'wallet'], ['Operatorlar', 'Sotuv, konversiya, komissiya, qo\'ng\'iroqlar', 'headset'], ['Kuryerlar va naqd', 'Yetkazish, naqd yig\'ish va topshirish', 'truck'], ['Qarzdorlar', "Ochiq va muddati o'tgan qarzlar ro'yxati", 'users']];
      return `
      ${U.head({ t: 'Hisobotlar', s: 'Tayyor hujjatlar — Excel yoki PDF, va Telegramga kunlik xulosa' })}
      <div class="grid">
        ${U.card({ cls: 'c7', title: 'Tayyor hisobotlar', sub: 'Davr va filial yuklab olishda tanlanadi', body: reps.map((r) => `<div class="set-r"><span class="al-ic" style="background:var(--surface-3);color:var(--ink-2)">${ic(r[2])}</span><div class="t"><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div><button class="btn sm">${ic('dl', 's')}Excel</button><button class="btn sm">${ic('dl', 's')}PDF</button></div>`).join('') })}
        ${U.card({ cls: 'c5', title: 'Telegram kunlik xulosa', sub: 'Har kuni belgilangan vaqtda bot yuboradi', body: `<div class="set-r"><div class="t"><b>Yoqilgan</b><span>Qabul qiluvchi: Boshliq (shaxsiy chat)</span></div><button class="sw" role="switch" aria-checked="true" aria-label="Kunlik xulosa"></button></div><div class="set-r"><div class="t"><b>Yuborish vaqti</b><span>Toshkent vaqti bilan</span></div><input class="inp" id="dg-time" value="21:00" aria-label="Yuborish vaqti"></div>
          <div class="dr-sec" style="margin-top:14px"><h3>Xabar ko'rinishi</h3><div class="banner" style="display:block;line-height:1.6;font-size:12.5px"><b>Doctor Ali · 2-oktabr yakuni</b><br>Tushum: <b class="num">48,1 mln</b> (kechagidan +6,2%)<br>Buyurtma: <b class="num">131</b> · yetkazildi <b class="num">96</b> · atkaz <b class="num">14</b><br>Klinika: <b class="num">17,4 mln</b> · 74 tashrif<br>Kuryerlarda naqd: <b class="num">9,4 mln</b><br>Ochiq signallar: <b>9</b> (2 kritik)</div></div>` })}
        ${U.card({ cls: 'c12', title: 'Eksport tarixi', sub: 'Fayl havolasi 1 soat amal qiladi', flush: true, body: U.tbl({
          cols: [{ h: 'Hisobot', main: true }, { h: 'Davr' }, { h: 'Filial' }, { h: 'Format' }, { h: 'Holat' }, { h: 'Vaqt', r: true, num: true }],
          rows: [['Oylik moliya (P&L)', 'Sentabr 2026', 'Barchasi', 'PDF', U.pill('good', 'Tayyor', 'check'), '02.10 09:12'], ['Kuryerlar va naqd', '25.09 – 01.10', "Qo'qon", 'Excel', U.pill('good', 'Tayyor', 'check'), '01.10 18:40'], ['Operatorlar', 'Sentabr 2026', 'Toshkent', 'Excel', U.pill('info', 'Tayyorlanmoqda', 'clock'), '02.10 14:03']].map((r) => [`<b>${r[0]}</b>`, ...r.slice(1)]),
        }) })}
      </div>`;
    },
  };

  /* ===================== SOZLAMALAR ===================== */
  PAGES.settings = {
    title: 'Sozlamalar', noScope: true,
    render() {
      const rule = (t, s, v, on = true) => `<div class="set-r"><div class="t"><b>${t}</b><span>${s}</span></div><input class="inp" value="${v}" aria-label="${t}"><button class="sw" role="switch" aria-checked="${on}" aria-label="${t} — yoqish"></button></div>`;
      return `
      ${U.head({ t: 'Sozlamalar', s: 'Reja, signal chegaralari, kirish huquqlari va xavfsizlik' })}
      <div class="grid">
        ${U.card({ cls: 'c6', title: 'Oylik reja — oktabr 2026', sub: "Tushum rejasi, so'm · «Umumiy» sahifadagi reja chizig'i shundan olinadi", body: `${U.tbl({ cards: false, cols: [{ h: 'Filial' }, { h: 'Yetkazib berish', r: true }, { h: 'Klinika', r: true }], rows: [['Toshkent', '1 100 mln', '340 mln'], ["Qo'qon", '480 mln', '190 mln'], ['Samarqand', '420 mln', '—']].map((r) => [`<b>${r[0]}</b>`, `<input class="inp num" style="width:112px;text-align:right" value="${r[1]}" aria-label="${r[0]} yetkazib berish rejasi">`, r[2] === '—' ? '<span class="muted">—</span>' : `<input class="inp num" style="width:112px;text-align:right" value="${r[2]}" aria-label="${r[0]} klinika rejasi">`]) })}<div class="banner" style="margin-top:14px"><span>Jami reja (konsultatsiya 70 mln bilan)</span><b class="num" style="margin-left:auto">2,60 mlrd so'm</b></div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn primary">Saqlash</button></div>` })}
        ${U.card({ cls: 'c6', title: 'Signal chegaralari', sub: "Qiymatdan oshsa «Signallar» ga chiqadi", body: [rule('Tasdiqlangan buyurtma kuryersiz', 'soat', '3'), rule('Kutilmoqda turgan buyurtma', 'soat', '24'), rule("Yo'lda kechikish", 'soat', '48'), rule('Kuryerda topshirilmagan naqd', "so'm", '5 000 000'), rule('Kassa yopilishidagi farq', "so'm", '50 000'), rule('Kunlik atkaz ulushi', '%', '15'), rule("Hal qilinmagan o'tkazib yuborilgan qo'ng'iroqlar", 'ta', '10'), rule('Tushum pasayishi (o\'rtachadan)', '%', '30', false)].join('') })}
        ${U.card({ cls: 'c6', title: 'Kirish huquqlari', sub: "Panelni kim ko'radi · hamma uchun faqat o'qish", flush: true, tools: `<button class="btn sm">Qo'shish</button>`, body: U.tbl({ cols: [{ h: 'Foydalanuvchi', main: true }, { h: "Bo'limlar" }, { h: 'Filial' }, { h: 'Telefonlar' }], rows: [[U.user('Boshliq', 'owner · egasi'), 'Hammasi', 'Barchasi', U.pill('good', "To'liq")], [U.user('Bosh hisobchi', 'owner_viewer'), 'Moliya, Hisobotlar', 'Barchasi', U.pill('neutral', 'Maskalangan')], [U.user("O'rinbosar", 'owner_viewer'), 'Buyurtmalar, Yetkazish, Sotuv', 'Toshkent', U.pill('neutral', 'Maskalangan')]] }) })}
        ${U.card({ cls: 'c6', title: 'Xavfsizlik va ko\'rinish', sub: 'Sessiyalar, til, mavzu', body: `<div class="set-r"><div class="t"><b>Ikki bosqichli kirish</b><span>Parol + SMS kod · har kirishda</span></div>${U.pill('good', 'Yoqilgan', 'shield')}</div><div class="set-r"><div class="t"><b>iPhone 15 · Safari</b><span>Toshkent · hozir faol</span></div>${U.pill('good', 'Bu qurilma')}</div><div class="set-r"><div class="t"><b>MacBook · Chrome</b><span>Toshkent · kecha 21:14</span></div><button class="btn sm">Chiqarish</button></div><div class="set-r"><div class="t"><b>Til</b><span>Interfeys tili</span></div><div class="seg"><button aria-pressed="true">O'zbekcha</button><button aria-pressed="false">Русский</button></div></div><div class="set-r"><div class="t"><b>Mavzu</b><span>Yorug' / qorong'i</span></div><button class="btn sm" data-act="theme">${ic('moon', 's')}Almashtirish</button></div>` })}
      </div>`;
    },
  };

  /* ===================== HOLATLAR GALEREYASI ===================== */
  PAGES.states = {
    title: 'Holatlar galereyasi', noScope: true,
    render() {
      const sk = (w, h, st = '') => `<div class="skel" style="width:${w};height:${h}px;${st}"></div>`;
      return `
      ${U.head({ t: 'Holatlar galereyasi', s: "Har ma'lumot bloki shu 6 holatning barchasini ko'rsata olishi shart" })}
      <div class="grid">
        ${U.card({ cls: 'c12', title: '1 · Yuklanmoqda (skeleton)', sub: "Faqat birinchi ochilishda — haqiqiy kontent shaklida, joylashuv sakramaydi", body: `<div class="kpis" style="margin-bottom:14px">${Array.from({ length: 6 }, () => `<div class="kpi">${sk('60%', 12)}${sk('80%', 24)}${sk('45%', 14)}</div>`).join('')}</div><div style="display:flex;align-items:flex-end;gap:10px;height:150px">${[60, 85, 50, 110, 95, 130, 80, 120, 140, 100, 125, 90].map((h) => sk('100%', h, 'flex:1')).join('')}</div>` })}
        ${U.card({ cls: 'c4 m6', title: "2 · Bo'sh", sub: "Davrda umuman ma'lumot yo'q", body: `<div class="state"><span class="si">${ic('inbox')}</span><b>Bu davrda buyurtma bo'lmagan</b><p>Kengroq davrni tanlab ko'ring.</p><button class="btn sm">Oxirgi 30 kunni ko'rsatish</button></div>` })}
        ${U.card({ cls: 'c4 m6', title: "3 · Natija yo'q", sub: 'Filtr yoki qidiruv hech narsa topmadi', body: `<div class="state"><span class="si">${ic('search')}</span><b>«DA-99999» topilmadi</b><p>Raqam, telefon yoki ism bo'yicha qayta qidiring.</p><button class="btn sm">Filtrlarni tozalash</button></div>` })}
        ${U.card({ cls: 'c4', title: '4 · Xato', sub: 'Faqat shu blok — sahifaning qolgani ishlayveradi', body: `<div class="state"><span class="si crit">${ic('tri')}</span><b>Ma'lumotni yuklab bo'lmadi</b><p>Server javob bermadi. Bir ozdan so'ng qayta urinib ko'ring.</p><button class="btn sm">${ic('refresh', 's')}Qayta urinish</button></div>` })}
        ${U.card({ cls: 'c6', title: '5 · Oflayn', sub: "Neytral banner — keshdagi oxirgi ma'lumot ko'rinib turadi", body: `<div class="banner">${ic('wifi', 's')}<span>Internet yo'q — ko'rsatilayotgan ma'lumot <b>14:05</b> dagi holat</span><button class="btn sm">Qayta ulanish</button></div><div class="duo" style="margin-top:12px;opacity:.7"><div><div class="k">Buyurtmalar</div><div class="v">131</div></div><div><div class="k">Tushum</div><div class="v">48,1<small>mln</small></div></div><div><div class="k">Yetkazildi</div><div class="v">96</div></div></div>` })}
        ${U.card({ cls: 'c6', title: '6 · Eskirgan va ruxsat yo\'q', sub: "Ma'lumot 10 daqiqadan eski bo'lsa belgi; bo'lim yopiq bo'lsa tushuntirish", body: `<div class="banner">${ic('clock', 's')}<span>Klinika ma'lumoti <b>18 daqiqa</b> oldin yangilangan</span><span class="badge-soft" style="margin-left:auto">eskirgan</span></div><div class="state" style="min-height:130px"><span class="si">${ic('lock')}</span><b>Bu bo'lim sizga ochilmagan</b><p>Kirish huquqini boshliq «Sozlamalar» da beradi.</p></div>` })}
        ${U.card({ cls: 'c12', title: "Filtr o'zgarganda", sub: "Skeleton emas: eski kontent xiralashib turadi, yangisi kelgach almashadi — tepadagi davr tugmalarini bosib ko'ring", body: `<div class="banner">${ic('info', 's')}<span>Istalgan sahifada davr yoki filialni o'zgartiring — kontent 0,2 s xiralashadi, joylashuv sakramaydi.</span><a class="btn sm" href="#overview">Umumiy sahifaga</a></div>` })}
      </div>`;
    },
  };

  /* ===================== KIRISH ===================== */
  PAGES.login = {
    title: 'Kirish',
    render() {
      return `<div class="login"><div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:center;width:100%">
        <div class="login-card">
          <div style="display:flex;align-items:center;gap:10px"><span class="brand-mark">${leaf}</span><div class="brand-name">Doctor Ali<span>Nazorat · boshliq paneli</span></div></div>
          <div><h1 style="font-size:20px;font-weight:650;letter-spacing:-.02em">Kirish</h1><p class="muted" style="font-size:13px;margin-top:4px">1-qadam: login va parol</p></div>
          <div class="field"><label for="lg-user">Login</label><input id="lg-user" autocomplete="username" placeholder="boshliq"></div>
          <div class="field"><label for="lg-pass">Parol</label><input id="lg-pass" type="password" autocomplete="current-password" placeholder="••••••••"></div>
          <button class="btn primary" style="height:42px" type="button">Davom etish</button>
          <p class="muted" style="font-size:12px">5 marta xato kiritilsa kirish 15 daqiqaga bloklanadi.</p>
        </div>
        <div class="login-card">
          <div><h1 style="font-size:20px;font-weight:650;letter-spacing:-.02em">Tasdiqlash kodi</h1><p class="muted" style="font-size:13px;margin-top:4px">2-qadam: <span class="num">+998 90 *** ** 67</span> raqamiga SMS yuborildi</p></div>
          <div class="otp" role="group" aria-label="6 xonali kod">${[1, 2, 3, 4, 5, 6].map((i) => `<input id="otp-${i}" inputmode="numeric" maxlength="1" aria-label="${i}-raqam">`).join('')}</div>
          <button class="btn primary" style="height:42px" type="button" data-act="login">Kirish</button>
          <div style="display:flex;justify-content:space-between;font-size:12.5px"><span class="muted">Kodni qayta yuborish: <span class="num">0:42</span></span><a class="link" href="#login">Raqamni o'zgartirish</a></div>
          <div class="banner" style="font-size:12px">${ic('shield', 's')}<span>Har kirish audit jurnaliga yoziladi. 30 daqiqa harakatsizlikdan so'ng sessiya yopiladi.</span></div>
        </div>
      </div></div>`;
    },
  };
})();
