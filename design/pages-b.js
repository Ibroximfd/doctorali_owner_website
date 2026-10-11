/* Ekranlar: Moliya, Klinika, Yetkazib berish, Sotuv jamoasi */
(function () {
  const { PAGES, U } = App, { ic, esc } = U;
  const sp = (seed, up = 0.25) => { const r = D.rng(seed); let v = 50; return Array.from({ length: 12 }, () => (v += (r() - 0.5 + up * 0.5) * 12)); };
  const som = (v) => F.m(v) + " so'm";

  /* ===================== MOLIYA ===================== */
  PAGES.finance = {
    title: 'Moliya',
    render(c) {
      const total = App.channels(c).reduce((a, b) => a + b, 0), f = D.fin;
      const col = c.k(f.collected), exp = c.k(f.expenses), net = col - exp, cash = D.cash;
      const liab = D.liabilities.reduce((a, r) => a + r[1], 0), aging = D.debtAging;
      return `
      ${U.head({ t: 'Moliya', s: "Pul oqimi — tushum, yig'ilgan pul, xarajat, qarz va majburiyatlar", acts: `<button class="btn">${ic('dl', 's')}Oylik hisobot (PDF)</button>` })}
      <div class="kpis k4">
        ${U.kpi({ k: 'Tushum', v: F.m(total), unit: "so'm", d: c.dv(10.6), note: 'yetkazildi + klinika + konsultatsiya', spark: sp(41) })}
        ${U.kpi({ k: "Yig'ilgan pul", v: F.m(col), unit: "so'm", d: c.dv(10.0), note: "haqiqatda qo'lga tushgan", spark: sp(42) })}
        ${U.kpi({ k: 'Xarajat', v: F.m(exp), unit: "so'm", d: c.dv(3.5), inv: true, note: `tushumning ${F.pct((f.expenses / f.collected) * 100)}`, spark: sp(43, 0.1) })}
        ${U.kpi({ k: 'Sof qoldiq (taxminiy)', v: F.m(net), unit: "so'm", d: c.dv(11.6), note: "yig'ilgan − xarajat, tannarxsiz", spark: sp(44) })}
      </div>
      <div class="grid">
        ${U.chartCard({ cls: 'c8', title: 'Kirim va chiqim', sub: "Kunlik pul oqimi, so'm", chart: 'fi-flow', after: `<div class="duo" style="margin-top:14px"><div><div class="k">Qaytarishlar</div><div class="v">${F.m(c.k(f.refunds))}<small>so'm</small></div><div class="n">${F.n(c.k(f.refundCount))} ta buyurtma</div></div><div><div class="k">O'rtacha kunlik kirim</div><div class="v">${F.m(f.collected / 30 * c.f.scale)}<small>so'm</small></div><div class="n">${esc(c.p.long.toLowerCase())}</div></div><div><div class="k">Eng katta xarajat</div><div class="v" style="font-size:16px">Ish haqi</div><div class="n">${F.pct((186 / 412) * 100)} · ${F.m(c.k(186e6))} so'm</div></div></div>` })}
        ${U.card({ cls: 'c4', title: 'Pul qayerda turibdi', sub: 'Hozirgi holat', body: U.kv([
          [`<i class="dot" style="background:var(--s1)"></i>Klinika kassalari`, F.m(c.now(cash.tills)), "so'm"],
          ...Object.entries(cash.tillsParts).map(([n, v]) => [`<span class="muted" style="padding-left:17px">${n}</span>`, `<span class="muted">${F.m(c.now(v))}</span>`]),
          [`<i class="dot" style="background:var(--s2)"></i>Kuryerlarda naqd`, F.m(c.now(cash.cod)), '6 kuryer'],
          [`<i class="dot" style="background:var(--s3)"></i>Onlayn hisobda`, F.m(c.now(cash.online)), 'Click · Payme'],
          [`<i class="dot" style="background:var(--s4)"></i>Mijozlar qarzi`, F.m(c.now(cash.debt)), "so'm"],
          [`<span style="padding-left:17px;color:var(--crit)">muddati o'tgan</span>`, `<span style="color:var(--crit)">${F.m(c.now(cash.overdue))}</span>`],
        ]) })}
        ${U.card({ cls: 'c4 m6', title: "To'lov usullari", sub: "Tushum qaysi yo'l bilan to'landi", body: U.stack(D.payMix.map((x, i) => [x[0], c.k(x[1]), `var(--s${i + 1})`]), { col: true }) })}
        ${U.card({ cls: 'c4 m6', title: 'Xarajatlar', sub: `Jami ${som(exp)}`, body: U.barList(D.expenses.map((x) => [x[0], c.k(x[1])]), { fmt: F.m }) })}
        ${U.card({ cls: 'c4', title: 'Majburiyatlar', sub: "Hali to'lanmagan — bizning qarzimiz", body: `${U.kv(D.liabilities.map((r) => [esc(r[0]) + `<span class="muted" style="font-size:11.5px">· ${esc(r[2])}</span>`, F.m(c.now(r[1])), "so'm"]))}<div class="banner" style="margin-top:12px"><span>Jami majburiyat</span><b class="num" style="margin-left:auto">${som(c.now(liab))}</b></div>` })}
        ${U.card({ cls: 'c6', title: 'Mijozlar qarzi', sub: `Ochiq ${som(c.now(cash.debt))} · ${aging.reduce((a, r) => a + r[2], 0)} mijoz`, flush: true, body: `<div style="padding:0 18px 12px">${U.stack(aging.map((r, i) => [r[0], c.now(r[1]), ['var(--seq3)', 'var(--seq4)', 'var(--seq6)'][i]]), { label: 'Qarz muddati', blk: true })}</div>${U.tbl({
          cols: [{ h: 'Eng katta qarzdorlar', main: true }, { h: 'Qoldiq', r: true, num: true }, { h: "Muddati o'tdi", r: true }],
          rows: D.debtors.map((d) => [`<b>${esc(d[0])}</b><div class="muted" style="font-size:11.5px">${esc(d[1])}</div>`, F.n(d[2]), d[3] > 30 ? U.pill('crit', d[3] + ' kun', 'tri') : d[3] > 7 ? U.pill('warn', d[3] + ' kun') : U.pill('neutral', d[3] + ' kun')]),
        })}` })}
        ${U.card({ cls: 'c6', title: 'Kunlik kassa yopilishi', sub: 'Klinika filiallari · sanalgan naqd va kutilgan o\'rtasidagi farq', flush: true, body: U.tbl({
          cols: [{ h: 'Sana', main: true }, { h: 'Filial' }, { h: 'Holat' }, { h: 'Farq', r: true, num: true }, { h: 'Kim yopdi' }],
          rows: D.closings.map((r) => [`<b class="num">${r[0]}</b>`, esc(r[1]), r[2] === 'reopened' ? U.pill('warn', 'Qayta ochilgan', 'refresh') : U.pill('good', 'Yopilgan', 'check'), r[3] ? `<span style="color:var(--${r[3] < 0 ? 'crit' : 'warn'})">${r[3] > 0 ? '+' : '−'}${F.n(Math.abs(r[3]))}</span>` : '0', esc(r[4])]),
        }) })}
      </div>`;
    },
    mount(c) {
      Charts.mount('fi-flow', 'line', { title: 'Kirim va chiqim', labels: c.lab, tf: som, series: [{ name: 'Kirim', color: 'var(--s1)', values: c.ser(D.fin.collected, 51), area: true }, { name: 'Chiqim', color: 'var(--s2)', values: c.ser(D.fin.expenses, 52, 0.05) }] });
    },
  };

  /* ===================== KLINIKA ===================== */
  PAGES.clinic = {
    title: 'Klinika',
    render(c) {
      const cl = D.clinic;
      if (c.f.id !== 'all' && !c.f.clinic) return `${U.head({ t: 'Klinika', s: 'Qabulxona, kassa va ombor' })}<section class="card"><div class="state" style="min-height:320px"><span class="si">${ic('clinic')}</span><b>${esc(c.f.name)} filialida klinika yo'q</b><p>Bu filial faqat yetkazib berish savdosi bilan ishlaydi. Klinika ko'rsatkichlari uchun boshqa filialni tanlang.</p><button class="btn" data-filial="all">Barcha filiallarni ko'rsatish</button></div></section>`;
      const sh = c.f.id === 'all' ? 1 : cl.branches.find((b) => b.name === c.f.name).rev / D.rev.clinic, k = (v) => Math.round(v * sh * c.p.scale);
      const v = cl.visits, rev = k(D.rev.clinic);
      return `
      ${U.head({ t: 'Klinika', s: `Qabulxona, kassa va ombor · ${c.f.id === 'all' ? "Toshkent va Qo'qon" : c.f.name}` })}
      <div class="kpis">
        ${U.kpi({ k: 'Klinika tushumi', v: F.m(rev), unit: "so'm", d: c.dv(7.8), spark: sp(61) })}
        ${U.kpi({ k: 'Tashriflar (keldi)', v: F.n(k(v.arrived)), d: c.dv(5.1), spark: sp(62) })}
        ${U.kpi({ k: 'Kelmaganlar', v: F.pct((v.noShow / v.scheduled) * 100), d: c.dv(-0.9), pp: true, inv: true, spark: sp(63, -0.15) })}
        ${U.kpi({ k: 'Muolajalar', v: F.n(k(894)), d: c.dv(6.2), spark: sp(64) })}
        ${U.kpi({ k: 'Konsultatsiyalar', v: F.n(k(612)), d: c.dv(3.3), spark: sp(65, 0.1) })}
        ${U.kpi({ k: "O'rtacha chek", v: F.n(227000), unit: "so'm", d: c.dv(2.6), spark: sp(66, 0.1) })}
      </div>
      <div class="grid">
        ${U.chartCard({ cls: 'c8', title: 'Tushum tarkibi', sub: "Mahsulot sotuvi, muolaja va konsultatsiya, so'm", chart: 'cl-rev' })}
        ${U.card({ cls: 'c4', title: 'Tashriflar', sub: `${F.n(k(v.scheduled))} ta yozilgan`, body: `${U.stack([['Keldi', k(v.arrived), 'var(--order-delivered)'], ['Kelmadi', k(v.noShow), 'var(--order-pending)'], ['Bekor qilindi', k(v.cancelled), 'var(--order-cancelled)']], { col: true, fmt: F.n })}<div class="duo" style="margin-top:12px"><div><div class="k">Yangi mijozlar</div><div class="v">${F.n(k(cl.newCl))}</div></div><div><div class="k">Qaytganlar</div><div class="v">${F.n(k(cl.retCl))}</div></div></div>` })}
        ${U.card({ cls: 'c12', title: 'Filiallar', sub: 'Aylanma, kassa va intizom', flush: true, body: U.tbl({
          cols: [{ h: 'Filial', main: true }, { h: 'Tushum', r: true, num: true }, { h: 'Tashrif', r: true, num: true }, { h: 'Kelmagan', r: true, num: true }, { h: 'Kassada', r: true, num: true }, { h: 'Ochiq qarz', r: true, num: true }, { h: 'Ombor qiymati', r: true, num: true }, { h: 'Davomat', r: true, num: true }, { h: 'Kechagi kassa' }],
          rows: cl.branches.map((b) => [`<b>${esc(b.name)}</b>`, F.m(b.rev * c.p.scale), F.n(b.visits * c.p.scale), F.pct(b.noShow), F.m(b.till), F.m(b.debt), F.m(b.stock), F.pct(b.att, 0), b.closing === 'closed' ? U.pill('good', 'Yopilgan · farqsiz', 'check') : U.pill('crit', 'Kamomad −180 000', 'oct')]),
        }) })}
        ${U.card({ cls: 'c7', title: 'Shifokorlar', sub: 'Qabul, sotuv va komissiya', flush: true, tools: U.link('doctors', 'Batafsil'), body: U.tbl({
          cols: [{ h: 'Shifokor', main: true }, { h: 'Qabul', r: true, num: true }, { h: 'Sotuv', r: true, num: true }, { h: 'Komissiya', r: true, num: true }, { h: "To'lanmagan", r: true, num: true }],
          rows: D.doctors.slice(0, 5).map((d) => [U.user(d.n, d.sp + ' · ' + d.f), F.n(d.vis * c.p.scale), F.m(d.sales * c.p.scale), F.m(d.com * c.p.scale), d.out ? `<span style="color:var(--serious)">${F.m(d.out)}</span>` : '<span class="muted">0</span>']),
        }) })}
        ${U.card({ cls: 'c5', title: 'Ombor', sub: 'Klinika do\'koni qoldiqlari', tools: U.link('products', 'Mahsulotlar'), body: `<div class="duo"><div><div class="k">Qoldiq qiymati</div><div class="v">${F.m(c.now(cl.stock.value))}<small>so'm</small></div></div><div><div class="k">Nomenklatura</div><div class="v">${cl.stock.sku}<small>tur</small></div></div></div>
          <div class="dr-sec" style="margin-top:14px"><h3>Tugagan</h3>${cl.stock.out.map((o) => `<div class="set-r" style="padding:8px 0"><div class="t"><b>${esc(o[0])}</b><span>${esc(o[1])}</span></div>${U.pill('crit', 'Tugadi', 'oct')}</div>`).join('')}</div>
          <div class="dr-sec" style="margin-top:10px"><h3>Kam qolgan</h3>${cl.stock.low.map((o) => `<div class="set-r" style="padding:8px 0"><div class="t"><b>${esc(o[0])}</b><span>${esc(o[3])} · minimal ${o[2]} dona</span></div>${U.pill('warn', o[1] + ' dona')}</div>`).join('')}</div>` })}
      </div>`;
    },
    mount(c) {
      if (c.f.id !== 'all' && !c.f.clinic) return;
      const sh = c.f.id === 'all' ? 1 : D.clinic.branches.find((b) => b.name === c.f.name).rev / D.rev.clinic;
      Charts.mount('cl-rev', 'cols', { title: 'Klinika tushumi tarkibi', labels: c.lab, tf: som, series: D.clinic.mix.map((m, i) => ({ name: m[0], color: `var(--s${i + 1})`, values: D.series(c.key, m[1] * sh * c.p.scale, 71 + i, 0.1) })) });
    },
  };

  /* ===================== YETKAZIB BERISH ===================== */
  PAGES.logistics = {
    title: 'Yetkazib berish',
    render(c) {
      const cs = D.couriers.filter((x) => c.f.id === 'all' || x.f === c.f.name), k = (v) => Math.round(v * c.p.scale);
      const tot = cs.reduce((a, x) => ({ a: a.a + x.a, d: a.d + x.d, att: a.att + x.att, un: a.un + x.un }), { a: 0, d: 0, att: 0, un: 0 });
      return `
      ${U.head({ t: 'Yetkazib berish', s: 'Logistika, kuryerlar va naqd pul nazorati' })}
      <div class="kpis">
        ${U.kpi({ k: "Hozir yo'lda", v: F.n(c.now(246)), note: `${c.now(21)} tasi kechikkan`, d: null })}
        ${U.kpi({ k: 'Yetkazildi', v: F.n(k(tot.d)), d: c.dv(9.1), spark: sp(81) })}
        ${U.kpi({ k: 'Muvaffaqiyat ulushi', v: F.pct((tot.d / tot.a) * 100), d: c.dv(0.7), pp: true, spark: sp(82, 0.1) })}
        ${U.kpi({ k: "O'rtacha yetkazish vaqti", v: F.dur(1290), d: c.dv(-5.1), inv: true, spark: sp(83, -0.2) })}
        ${U.kpi({ k: 'Muvaffaqiyatsiz urinish', v: F.n(k(tot.att)), d: c.dv(4.2), inv: true, spark: sp(84, 0.1) })}
        ${U.kpi({ k: 'Kuryerlarda naqd', v: F.m(tot.un), unit: "so'm", note: `${cs.filter((x) => x.un).length} kuryerda topshirilmagan`, d: null })}
      </div>
      <div class="grid">
        ${U.card({ cls: 'c12', title: 'Kuryerlar', sub: 'Qatorni bosing — kuryer kartasi ochiladi', flush: true, body: U.tbl({
          cols: [{ h: 'Kuryer', main: true }, { h: 'Yetkazdi / berildi', r: true }, { h: 'Muvaffaqiyat', r: true, num: true }, { h: "O'rtacha vaqt", r: true, num: true }, { h: 'Urinish', r: true, num: true }, { h: "Yig'gan naqd", r: true, num: true }, { h: 'Topshirilmagan', r: true }],
          rows: cs.map((x) => [U.user(x.n, x.f), `<span class="num">${F.n(k(x.d))} / ${F.n(k(x.a))}</span>${U.mini((x.d / x.a) * 100)}`, F.pct((x.d / x.a) * 100), F.dur(x.min), F.n(k(x.att)), F.m(k(x.cod)), x.un ? (x.days >= 2 ? U.pill('crit', `${F.m(x.un)} · ${x.days} kun`, 'oct') : x.days === 1 ? U.pill('warn', `${F.m(x.un)} · kechadan`, 'tri') : `<span class="num">${F.m(x.un)}</span>`) : '<span class="muted">—</span>']),
          attr: (i) => `class="click" tabindex="0" data-person="co:${D.couriers.indexOf(cs[i])}"`,
        }) })}
        ${U.chartCard({ cls: 'c8', title: 'Kunlik yetkazish', sub: 'Yetkazilgan va atkaz bo\'lgan buyurtmalar', chart: 'lg-daily' })}
        ${U.card({ cls: 'c4', title: 'Muvaffaqiyatsiz urinish sabablari', sub: `${F.n(k(tot.att))} ta urinish`, body: U.barList(D.attemptReasons.map((x) => [x[0], Math.round(x[1] * c.s)])) })}
        ${U.card({ cls: 'c6', title: "Hudud bo'yicha yetkazish vaqti", sub: "Jo'natishdan yetkazishgacha, mediana", body: U.barList(D.regionTimes, { fmt: F.dur, share: false }) })}
        ${U.card({ cls: 'c6', title: 'Filiallararo transferlar', sub: "Mahsulot ko'chirish", flush: true, body: U.tbl({
          cols: [{ h: 'Transfer', main: true }, { h: "Yo'nalish" }, { h: 'Holat' }, { h: 'Mahsulot', r: true, num: true }, { h: 'Sana', r: true, num: true }],
          rows: D.transfers.map((t) => [`<b class="num">${t[0]}</b>`, `${esc(t[1])} → ${esc(t[2])}`, U.pill(t[3] === 'qabul qilindi' ? 'good' : t[3] === 'kutilmoqda' ? 'warn' : 'info', t[3][0].toUpperCase() + t[3].slice(1)), t[4] + ' tur', t[5]]),
        }) })}
      </div>`;
    },
    mount(c) {
      const sh = c.f.id === 'all' ? 1 : c.f.scale;
      Charts.mount('lg-daily', 'cols', { title: 'Kunlik yetkazish', labels: c.lab, yf: F.n, series: [{ name: 'Yetkazildi', color: 'var(--order-delivered)', values: D.series(c.key, D.kpi.delivered * c.p.scale * sh, 91) }, { name: 'Atkaz', color: 'var(--order-cancelled)', values: D.series(c.key, 84 * c.p.scale * sh, 92, 0.02) }] });
    },
  };

  /* ===================== SOTUV JAMOASI ===================== */
  /* Har filial — o'z operatorlari yig'indisi; rang filialga biriktirilgan (tartibga emas). */
  function salesTeams(k) {
    return D.FILIALS.filter((f) => f.id !== 'all').map((f, i) => {
      const ops = D.operators.filter((x) => x.f === f.name), s = (key) => ops.reduce((a, x) => a + x[key], 0), m = D.filialTeams[f.id];
      const leads = s('leads'), sales = k(s('sales'));
      return { id: f.id, name: f.name, color: `var(--s${i + 1})`, admin: m.admin, plan: m.plan, done: m.done, d: m.d, ops: ops.length, on: ops.filter((x) => x.on).length, leads: k(leads), cv: ops.reduce((a, x) => a + x.cv * x.leads, 0) / leads, dl: k(s('dl')), sales, per: sales / ops.length, miss: s('miss'), over: s('over'), r: m.r };
    }).sort((a, b) => b.sales - a.sales);
  }
  PAGES.sales = {
    title: 'Sotuv jamoasi',
    render(c) {
      const ops = D.operators.filter((x) => c.f.id === 'all' || x.f === c.f.name), k = (v) => Math.round(v * c.p.scale);
      const sum = (key) => ops.reduce((a, x) => a + x[key], 0), maxS = Math.max(...ops.map((x) => x.sales));
      const lf = D.leadFunnel, lfTot = lf.reduce((a, r) => a + r[1], 0), rt = D.ratings, rMax = Math.max(...rt.dist);
      /* filial jamoalari: filtrdan mustaqil — har doim barcha filiallar yonma-yon */
      const teams = salesTeams(k), coAvg = teams.reduce((a, t) => a + t.sales, 0) / teams.reduce((a, t) => a + t.ops, 0);
      const gapNote = (g) => (Math.abs(g) < 0.5 ? "o'rtacha darajada" : `o'rtachadan ${Math.round(Math.abs(g))}% ${g > 0 ? 'yuqori' : 'past'}`);
      return `
      ${U.head({ t: 'Sotuv jamoasi', s: "Filiallar, operatorlar, lidlar va qo'ng'iroqlar" })}
      <div class="kpis">
        ${U.kpi({ k: 'Yangi lidlar', v: F.n(c.k(lfTot)), d: c.dv(12.4), spark: sp(101) })}
        ${U.kpi({ k: 'Konversiya', v: F.pct(31.0), d: c.dv(1.6), pp: true, spark: sp(102, 0.1) })}
        ${U.kpi({ k: 'Operatorlar sotuvi', v: F.m(k(sum('sales'))), unit: "so'm", d: c.dv(9.8), spark: sp(103) })}
        ${U.kpi({ k: "Qo'ng'iroqlar", v: F.n(c.k(D.calls.total)), d: c.dv(4.4), spark: sp(104, 0.1) })}
        ${U.kpi({ k: "O'tkazib yuborilgan (ochiq)", v: F.n(sum('miss')), note: "hozir · qayta qo'ng'iroq kerak", d: null })}
        ${U.kpi({ k: "Muddati o'tgan dela", v: F.n(sum('over')), note: 'hozir', d: null })}
      </div>
      <div class="grid">
        ${U.card({ cls: 'c12', title: 'Filiallar — operator jamoalari', sub: "Har filial jamoasi yonma-yon · qatorni bosing — butun panel shu filialga o'tadi", flush: true, tools: c.f.id === 'all' ? '' : '<button class="btn" data-filial="all">Barcha filiallar</button>', body: U.tbl({
          cols: [{ h: 'Filial', main: true }, { h: 'Sotuv', r: true }, { h: 'Bir operatorga', r: true }, { h: 'Lid', r: true, num: true }, { h: 'Konversiya', r: true, num: true }, { h: 'Yetkazilgan', r: true, num: true }, { h: "O'tkazib yub.", r: true }, { h: 'Dela', r: true }, { h: 'Baho', r: true }, { h: 'Oy rejasi', r: true }],
          rows: teams.map((t) => { const gap = (t.per / coAvg - 1) * 100, pp = (t.done / t.plan) * 100; return [
            `<div><div style="display:flex;align-items:center;gap:8px"><b>${esc(t.name)}</b>${t.id === c.f.id ? U.pill('good', 'Tanlangan') : ''}</div><small class="muted" style="display:block">Rahbar: ${esc(t.admin)}</small><small class="muted" style="display:block">${t.ops} operator · ${t.on} onlayn</small></div>`,
            `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px"><span class="num">${F.m(t.sales)}</span>${U.delta(c.dv(t.d))}</div>`,
            `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px"><span class="num">${F.m(t.per)}</span>${gap <= -15 ? U.pill('warn', gapNote(gap), 'tri') : `<small class="muted" style="white-space:nowrap">${gapNote(gap)}</small>`}</div>`,
            F.n(t.leads), F.pct(t.cv), F.n(t.dl),
            t.miss >= 10 ? U.pill('serious', String(t.miss), 'call') : `<span class="num">${t.miss}</span>`,
            t.over >= 20 ? U.pill('warn', String(t.over), 'clock') : `<span class="num">${t.over}</span>`,
            U.stars(t.r),
            `<div style="width:96px;margin-left:auto"><span class="num">${F.pct(pp)}</span><div class="meter" style="margin:4px 0 0" role="img" aria-label="${esc(t.name)}: oy rejasi ${F.pct(pp)} bajarildi"><i style="width:${Math.min(100, pp)}%"></i></div></div>`,
          ]; }),
          attr: (i) => { const on = teams[i].id === c.f.id; return `class="click${on ? ' sel' : ''}" tabindex="0" role="button" aria-pressed="${on}" data-filial="${on ? 'all' : teams[i].id}"`; },
        }) })}
        ${U.chartCard({ cls: 'c8', title: 'Filiallar sotuvi dinamikasi', sub: "Operatorlar sotuvi filial kesimida, so'm", chart: 'sl-filials' })}
        ${U.card({ cls: 'c4', title: 'Sotuvdagi ulush', sub: "Operatorlar sotuvi filiallar bo'yicha", body: U.stack(teams.map((t) => [t.name, t.sales, t.color]), { col: true, label: 'Sotuvdagi ulush' }) })}
        ${U.card({ cls: 'c12', title: 'Operatorlar reytingi', sub: "Sotuv bo'yicha tartiblangan · qatorni bosing", flush: true, body: U.tbl({
          cols: [{ h: 'Operator', main: true }, { h: 'Sotuv', r: true }, { h: 'Lid', r: true, num: true }, { h: 'Konversiya', r: true, num: true }, { h: 'Yetkazilgan', r: true, num: true }, { h: 'Komissiya', r: true, num: true }, { h: "O'tkazib yub.", r: true }, { h: 'Dela', r: true }, { h: 'Baho', r: true }],
          rows: ops.map((x, i) => [`<div style="display:flex;align-items:center;gap:6px"><span class="rank">${i + 1}</span>${U.user(x.n, x.f, x.on)}</div>`, `<span class="num">${F.m(k(x.sales))}</span>${U.mini((x.sales / maxS) * 100)}`, F.n(k(x.leads)), F.pct(x.cv), F.n(k(x.dl)), F.m(k(x.com)), x.miss >= 5 ? U.pill('serious', String(x.miss), 'call') : `<span class="num">${x.miss}</span>`, x.over >= 9 ? U.pill('warn', String(x.over), 'clock') : `<span class="num">${x.over}</span>`, x.r < 4 ? `<span style="color:var(--crit)">${U.stars(x.r)}</span>` : U.stars(x.r)]),
          attr: (i) => `class="click" tabindex="0" data-person="op:${D.operators.indexOf(ops[i])}"`,
        }) })}
        ${U.card({ cls: 'c4 m6', title: 'Lidlar voronkasi', sub: 'Davrda kelgan lidlar hozir qaysi bosqichda', body: `<div class="bl">${lf.map((r) => `<div class="bl-r"><div class="nm"><i class="dot" style="background:${r[2]}"></i>${esc(r[0])}</div><div class="vl">${F.n(c.k(r[1]))}<small>${F.pct((r[1] / lfTot) * 100)}</small></div><div class="tr"><i style="width:${(r[1] / 1934) * 100}%;background:${r[2]}"></i></div></div>`).join('')}</div>` })}
        ${U.card({ cls: 'c4 m6', title: 'Lid manbalari', sub: 'Soni va buyurtmaga aylanish ulushi', flush: true, body: U.tbl({ cards: false, cols: [{ h: 'Manba' }, { h: 'Lid', r: true, num: true }, { h: 'Konversiya', r: true }], rows: D.leadSources.map((s) => [esc(s[0]), F.n(c.k(s[1])), `<span class="num">${F.pct(s[2])}</span>${U.mini((s[2] / 52) * 100, s[2] >= 40 ? 'var(--order-delivered)' : '')}`]) }) })}
        ${U.card({ cls: 'c4', title: 'Mutaxassis baholari', sub: `${F.n(c.k(rt.count))} ta baho · mijozlar ilovada qo'ygan`, body: `<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:12px"><b style="font-size:32px;font-weight:650;letter-spacing:-.03em">${F.dec(rt.avg)}</b><span class="muted">/ 5 o'rtacha</span></div><div class="bl">${[5, 4, 3, 2, 1].map((s) => `<div class="bl-r" style="grid-template-columns:34px minmax(0,1fr) 52px;gap:10px"><div class="nm">${s} ${ic('star', 's')}</div><div class="tr" style="grid-column:auto"><i style="width:${(rt.dist[s - 1] / rMax) * 100}%;background:${s <= 2 ? 'var(--order-cancelled)' : 'var(--s1)'}"></i></div><div class="vl">${F.n(c.k(rt.dist[s - 1]))}</div></div>`).join('')}</div>` })}
        ${U.chartCard({ cls: 'c8', title: "Qo'ng'iroqlar", sub: "Javob berilgan va o'tkazib yuborilgan", chart: 'sl-calls', after: `<div class="duo" style="margin-top:14px"><div><div class="k">Javob berildi</div><div class="v">${F.pct((D.calls.answered / D.calls.total) * 100)}</div></div><div><div class="k">O'rtacha davomiylik</div><div class="v">2 d 22 s</div></div><div><div class="k">O'tkazib yuborilgan</div><div class="v">${F.n(c.k(D.calls.missed))}</div><div class="n">${D.calls.unhandled} tasi hal qilinmagan</div></div></div>` })}
        ${U.card({ cls: 'c4', title: "Hal qilinmagan o'tkazib yuborilganlar", sub: "Operator bo'yicha · hozir", body: U.barList([...ops].filter((x) => x.miss).sort((a, b) => b.miss - a.miss).map((x) => [x.n, x.miss]), { share: false, color: 'var(--order-cancelled)' }) })}
      </div>`;
    },
    mount(c) {
      const k = (v) => Math.round(v * c.p.scale);
      Charts.mount('sl-filials', 'line', { title: 'Filiallar sotuvi dinamikasi', labels: c.lab, total: true, tf: (v) => F.m(v) + " so'm", series: salesTeams(k).map((t, i) => ({ name: t.name, color: t.color, values: D.series(c.key, t.sales, 120 + i, 0.12 + i * 0.04) })) });
      Charts.mount('sl-calls', 'cols', { title: "Qo'ng'iroqlar", labels: c.lab, yf: F.n, series: [{ name: 'Javob berilgan', color: 'var(--s1)', values: c.ser(D.calls.answered, 111, 0.08) }, { name: "O'tkazib yuborilgan", color: 'var(--order-cancelled)', values: c.ser(D.calls.missed, 112, 0.02) }] });
    },
  };
})();
