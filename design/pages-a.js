/* Ekranlar: Umumiy, Buyurtmalar */
(function () {
  const { PAGES, U } = App, { ic, esc } = U;
  const sp = (seed, up = 0.25) => { const r = D.rng(seed); let v = 50; return Array.from({ length: 12 }, (_, i) => (v += (r() - 0.5 + up * 0.5) * 12)); };
  const CH = [['Yetkazib berish', 'var(--s1)'], ['Klinika', 'var(--s2)'], ['Onlayn konsultatsiya', 'var(--s3)']];

  /* tanlangan filialga ko'ra kanallar bo'yicha tushum (30 kunlik asos) */
  function channels(c) {
    if (c.f.id === 'all') return [D.rev.delivery, D.rev.clinic, D.rev.consult].map((v) => v * c.p.scale);
    const row = D.filialRows.find((r) => r.name === c.f.name);
    return [row.rev - (row.clinic || 0), row.clinic || 0, 0].map((v) => v * c.p.scale);
  }

  App.channels = channels;

  /* ===================== UMUMIY ===================== */
  PAGES.overview = {
    title: 'Umumiy',
    render(c) {
      const ch = channels(c), total = ch.reduce((a, b) => a + b, 0), d = c.dv(10.6), prev = total / (1 + d / 100);
      const pl = D.plan, pct = (pl.actual / pl.target) * 100, ahead = pct - pl.expectedPct;
      const k = D.kpi, alerts = c.openAlerts;
      const rate = (k.delivered / (k.delivered + k.cancelled)) * 100;
      const cash = D.cash, cashItems = [['Klinika kassalarida', c.now(cash.tills), 'var(--s1)'], ['Kuryerlarda (topshirilmagan)', c.now(cash.cod), 'var(--s2)'], ['Onlayn hisobda (Click / Payme)', c.now(cash.online), 'var(--s3)'], ['Mijozlar qarzida', c.now(cash.debt), 'var(--s4)']];
      return `
      ${U.head({ t: 'Bugungi holat', s: `Juma, 2-oktabr 2026 · ${c.f.name} · ${c.p.long}` })}
      <div class="grid" style="margin-bottom:16px">
        <section class="card hero c8">
          <div class="hero-top">
            <div>
              <div class="lbl">Jami tushum · ${esc(c.p.long.toLowerCase())}</div>
              <div class="big">${F.m(total)}<small>so'm</small></div>
              <div class="sub">${U.delta(d)}<span>${App.S.compare ? `${esc(c.cmpName)}: ${F.m(prev)} so'm` : 'yetkazilgan buyurtmalar + klinika + konsultatsiya'}</span></div>
            </div>
            <div class="plan">
              <div class="row"><span>${ic('target', 's')}</span><span style="flex:1">${pl.month} rejasi</span><b class="num">${F.m(c.now(pl.actual))} / ${F.m(c.now(pl.target))}</b></div>
              <div class="meter" role="img" aria-label="Reja ${F.pct(pct)} bajarildi, kunlik sur'at ${F.pct(pl.expectedPct)}"><i style="width:${pct}%"></i><em style="left:${pl.expectedPct}%" title="Bugungi kunga kutilgan daraja"></em></div>
              <div class="row"><span><b>${F.pct(pct)}</b> bajarildi</span><span class="muted">sur'atdan ${F.dec(Math.abs(ahead))} f.p. ${ahead >= 0 ? 'oldinda' : 'orqada'}</span></div>
              <div class="row" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"><span class="muted">${pl.last.name} yakuni</span><span class="num"><b>${F.pct((pl.last.actual / pl.last.target) * 100)}</b> · ${F.m(c.now(pl.last.actual))} / ${F.m(c.now(pl.last.target))}</span></div>
            </div>
          </div>
          <div class="hero-split">${U.stack(CH.map((x, i) => [x[0], ch[i], x[1]]).filter((x) => x[1] > 0), { label: 'Tushum kanallar bo\'yicha', blk: true })}</div>
          <div class="duo">${[['Bugun (14:05 gacha)', 48.1e6, 'kecha shu vaqtda 45,3 mln'], ['Kecha', 78.8e6, 'chorshanbadan +4,1%'], ['Shu hafta', 362e6, 'dushanbadan beri'], ['Oktabr', pl.actual, '2 kun']].map((x) => `<div><div class="k">${x[0]}</div><div class="v">${F.m(c.now(x[1]))}<small>so'm</small></div><div class="n">${x[2]}</div></div>`).join('')}</div>
        </section>
        <section class="card c4">
          <div class="card-h"><div><h2>Diqqat talab qiladi</h2><p>${alerts.length} ta ochiq signal · ${alerts.filter((a) => a.sev === 'crit').length} tasi kritik</p></div><div class="tools">${U.link('alerts', 'Barchasi')}</div></div>
          <div class="card-b flush" style="padding-top:8px"><div class="al">${alerts.length ? alerts.slice(0, 4).map((a) => U.alertItem(a, D.alerts.indexOf(a))).join('') : `<div class="state">${`<span class="si">${ic('check')}</span>`}<b>Hammasi joyida</b><p>Hozircha e'tibor talab qiladigan signal yo'q.</p></div>`}</div></div>
        </section>
      </div>
      <div class="kpis">
        ${U.kpi({ k: 'Buyurtmalar', v: F.n(c.k(k.orders)), d: c.dv(8.4), spark: sp(1) })}
        ${U.kpi({ k: 'Yetkazish ulushi', v: F.pct(rate), d: c.dv(1.2), pp: true, spark: sp(2, 0.1) })}
        ${U.kpi({ k: "O'rtacha chek", v: F.n(k.avgCheck), unit: "so'm", d: c.dv(2.3), spark: sp(3, 0.15) })}
        ${U.kpi({ k: 'Klinika tashriflari', v: F.n(c.k(k.visits)), d: c.dv(5.1), spark: sp(4) })}
        ${U.kpi({ k: 'Yangi mijozlar', v: F.n(c.k(k.newCustomers)), d: c.dv(-3.4), spark: sp(5, -0.2) })}
        ${U.kpi({ k: 'Ilova faol foydalanuvchilari', v: F.n(c.key === 'today' || c.key === 'yesterday' ? D.app.dau : D.app.active), d: c.dv(6.7), spark: sp(6, 0.3) })}
      </div>
      <div class="grid">
        ${U.chartCard({ cls: 'c8', title: 'Tushum trendi', sub: "Kanallar bo'yicha, so'm", chart: 'ov-rev' })}
        <section class="card c4"><div class="card-h"><div><h2>Jonli lenta</h2><p>Muhim hodisalar real vaqtda</p></div><div class="tools"><span class="live"><i></i>Jonli</span></div></div><div class="card-b flush" style="padding-top:8px"><div class="feed" id="feed" aria-live="polite">${D.feed.slice(0, 6).map((e) => `<div class="feed-i"><time>${e.t}</time><i class="dot" style="background:${e.c}"></i><p>${e.h} <span class="muted">· ${esc(e.who)}</span></p><span class="am">${F.n(e.am)}</span></div>`).join('')}</div></div></section>
        ${U.card({ cls: 'c12', title: 'Buyurtma oqimi — hozir', sub: "Har bosqichda nechta buyurtma va qancha summa turibdi", tools: U.link('orders', 'Buyurtmalar'), body: `<div class="pipe">${D.pipeNow.map((s) => { const st = U.stg(s.key); return `<div class="pipe-s" style="--st:${st.v}"><div class="nm"><i class="dot" style="background:${st.v}"></i>${esc(st.name)}</div><div class="ct">${F.n(c.now(s.count))}</div><div class="am">${F.m(c.now(s.amount))} so'm</div><div class="nt ${s.warn ? 'w' : ''}">${s.warn ? ic('tri') : ''}${esc(s.note)}</div></div>`; }).join('')}</div>` })}
        ${U.card({ cls: 'c8', title: 'Filiallar taqqoslash', sub: esc(c.p.long), flush: true, body: U.tbl({
          cols: [{ h: 'Filial', main: true }, { h: 'Tushum', r: true }, { h: 'Buyurtma', r: true, num: true }, { h: 'Yetkazish', r: true, num: true }, { h: 'Klinika', r: true, num: true }, { h: 'Ochiq qarz', r: true, num: true }, { h: 'Kuryerda naqd', r: true, num: true }],
          rows: D.filialRows.map((r) => [`<b>${esc(r.name)}</b>`, `<span class="num">${F.m(r.rev * c.p.scale)}</span> ${U.delta(c.dv(r.d))}`, F.n(r.orders * c.p.scale), F.pct(r.rate), r.clinic ? F.m(r.clinic * c.p.scale) : '<span class="muted">—</span>', r.debt ? F.m(r.debt) : '<span class="muted">—</span>', F.m(r.cod)]),
          foot: ['Jami', `<span class="num">${F.m(D.filialRows.reduce((a, r) => a + r.rev, 0) * c.p.scale)}</span>`, F.n(D.kpi.orders * c.p.scale), F.pct(rate), F.m(D.rev.clinic * c.p.scale), F.m(cash.debt), F.m(cash.cod)],
        }) })}
        ${U.card({ cls: 'c4', title: 'Pul qayerda turibdi', sub: 'Hozirgi holat · davrga bog\'liq emas', tools: U.link('finance', 'Moliya'), body: `${U.stack(cashItems, { col: true, label: 'Pul joylashuvi' })}<div class="banner" style="margin-top:12px">${ic('tri', 's')}<span>Qarzning <b>${F.m(c.now(cash.overdue))} so'm</b> qismi muddati o'tgan</span></div>` })}
      </div>`;
    },
    mount(c) {
      const ch = channels(c);
      Charts.mount('ov-rev', 'line', { title: 'Tushum trendi', labels: c.lab, total: true, series: CH.map((x, i) => ({ name: x[0], color: x[1], values: D.series(c.key, ch[i], 11 + i) })).filter((_, i) => ch[i] > 0), tf: (v) => F.m(v) + " so'm" });
    },
  };

  /* ===================== BUYURTMALAR ===================== */
  const WD = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'], WDL = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
  PAGES.orders = {
    title: 'Buyurtmalar',
    render(c) {
      const k = D.kpi, inProg = k.orders - k.delivered - k.cancelled;
      const fn = D.funnel.map((r) => ({ ...r, count: c.k(r.count), amount: r.amount * c.s }));
      const maxR = Math.max(...D.regions.map((r) => r[2]));
      const tiles = []; for (let row = 1; row <= 4; row++) for (let col = 1; col <= 7; col++) { const r = D.regions.find((x) => x[3] === row && x[4] === col); tiles.push(r ? `<button class="q${Math.min(6, Math.floor((r[2] / maxR) * 6) + 1)}" data-tip="${esc(r[1])}|Buyurtmalar=${F.n(c.k(r[2]))}|Ulush=${F.pct((r[2] / k.orders) * 100)}" aria-label="${esc(r[1])}: ${F.n(c.k(r[2]))} buyurtma"><b>${r[0]}</b><span>${F.n(c.k(r[2]))}</span></button>` : '<span class="e"></span>'); }
      const r = D.rng(77), heat = WD.map((d, wi) => Array.from({ length: 12 }, (_, b) => { const h = b * 2 + 1, base = (0.08 + Math.exp(-Math.pow(h - 11, 2) / 9) + 0.85 * Math.exp(-Math.pow(h - 17, 2) / 7)) * (wi === 6 ? 0.6 : wi === 5 ? 0.85 : 1) * (0.85 + r() * 0.3); return Math.round(base * 58 * c.s); }));
      const hMax = Math.max(1, ...heat.flat());
      const scaleLg = `<div class="scale"><span>kam</span>${[1, 2, 3, 4, 5, 6].map((q) => `<i class="q${q}"></i>`).join('')}<span>ko'p</span></div>`;
      return `
      ${U.head({ t: 'Buyurtmalar', s: 'Yetkazib berish savdosi — CRM, ilova, shifokor va registratura buyurtmalari', acts: `<button class="btn">${ic('dl', 's')}Excel</button>` })}
      <div class="kpis">
        ${U.kpi({ k: 'Jami buyurtma', v: F.n(c.k(k.orders)), d: c.dv(8.4), spark: sp(21) })}
        ${U.kpi({ k: 'Tasdiqlash ulushi', v: F.pct(90.4), d: c.dv(1.2), pp: true, spark: sp(22, 0.1) })}
        ${U.kpi({ k: 'Yetkazildi', v: F.n(c.k(k.delivered)), d: c.dv(9.1), spark: sp(23) })}
        ${U.kpi({ k: 'Atkaz ulushi', v: F.pct(12.6), d: c.dv(-0.8), pp: true, inv: true, spark: sp(24, -0.2) })}
        ${U.kpi({ k: "O'rtacha chek", v: F.n(k.avgCheck), unit: "so'm", d: c.dv(2.3), spark: sp(25, 0.15) })}
        ${U.kpi({ k: "O'rtacha yetkazish vaqti", v: F.dur(1290), d: c.dv(-5.1), inv: true, spark: sp(26, -0.2) })}
      </div>
      <div class="grid">
        ${U.card({ cls: 'c7', title: 'Buyurtma voronkasi', sub: 'Davrda yaratilgan buyurtmalar qayergacha yetib bordi', body: `${U.funnel(fn)}<div class="lg blk" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)"><div class="lg-b"><span class="nm"><i class="swt" style="background:var(--order-cancelled)"></i>Atkaz</span><b>${F.n(c.k(k.cancelled))}<small>${F.pct(12.6)}</small></b></div><div class="lg-b"><span class="nm"><i class="swt" style="background:var(--order-pending)"></i>Hali jarayonda</span><b>${F.n(c.k(inProg))}<small>${F.pct((inProg / k.orders) * 100)}</small></b></div></div>` })}
        ${U.chartCard({ cls: 'c5', title: 'Kunlik dinamika', sub: 'Buyurtmalar soni', chart: 'or-trend' })}
        ${U.card({ cls: 'c4 m6', title: 'Manba', sub: 'Buyurtmani kim yaratdi', body: U.barList(D.sources.map((x) => [x[0], c.k(x[1])])) })}
        ${U.card({ cls: 'c4 m6', title: 'Hududlar', sub: "14 viloyat · buyurtmalar soni", body: `<div class="tiles">${tiles.join('')}</div>${scaleLg}<p class="cap">Eng ko'p: ${[...D.regions].sort((a, b) => b[2] - a[2]).slice(0, 3).map((x) => `${esc(x[1])} — <b class="num">${F.n(c.k(x[2]))}</b>`).join(' · ')}</p>` })}
        ${U.card({ cls: 'c4', title: 'Atkaz sabablari', sub: `${F.n(c.k(k.cancelled))} ta bekor qilingan`, body: `${U.barList(D.cancelReasons.map((x) => [x[0], c.k(x[1])]))}<p class="cap">Mijoz ilovadan o'zi bekor qilgani: <b class="num">${F.n(c.k(17))}</b> ta (xodimlar bilan muammo ${F.n(c.k(9))} · mahsulot bilan ${F.n(c.k(8))})</p>` })}
        ${U.card({ cls: 'c4 m6', title: 'Kim va qanday tasdiqladi', sub: 'Tasdiqlash kanali', body: U.stack(D.confirmChannels.map((x, i) => [x[0], c.k(x[1]), `var(--s${i + 1})`]), { col: true, fmt: F.n }) })}
        ${U.card({ cls: 'c4 m6', title: 'Bosqich vaqtlari', sub: 'Mediana · maqsad bilan solishtirish', body: D.stageTimes.map((t) => { const over = t.p50 > t.target; return `<div style="padding:9px 0;border-bottom:1px solid var(--border)"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span style="font-weight:550;font-size:13px">${esc(t.name)}</span>${U.pill(over ? 'warn' : 'good', over ? 'maqsaddan sekin' : 'maqsadda', over ? 'tri' : 'check')}</div><div style="display:flex;align-items:baseline;gap:8px;margin-top:6px"><b style="font-size:20px;font-weight:650;letter-spacing:-.02em">${F.dur(t.p50)}</b><span class="muted" style="font-size:12px">maqsad ${F.dur(t.target)} · avval ${F.dur(t.prev)}</span></div><div class="meter ${over ? 'warn' : ''}" style="margin-bottom:0"><i style="width:${Math.min(100, (t.p50 / (t.target * 1.5)) * 100)}%"></i><em style="left:66.6%" title="Maqsad"></em></div></div>`; }).join('') })}
        ${U.card({ cls: 'c4', title: 'Qachon buyurtma ko\'p', sub: 'Hafta kuni × soat (yaratilgan buyurtmalar)', body: `<div class="heat"><span></span>${Array.from({ length: 12 }, (_, b) => `<span class="h">${b % 2 ? '' : String(b * 2).padStart(2, '0')}</span>`).join('')}${heat.map((row, wi) => `<span class="d">${WD[wi]}</span>${row.map((v, b) => `<button class="q${Math.min(6, Math.floor((v / hMax) * 6) + 1)}" data-tip="${WDL[wi]} ${String(b * 2).padStart(2, '0')}:00–${String(b * 2 + 2).padStart(2, '0')}:00|Buyurtmalar=${F.n(v)}" aria-label="${WDL[wi]} ${b * 2}:00, ${v} buyurtma"></button>`).join('')}`).join('')}</div>${scaleLg}` })}
        ${U.card({ cls: 'c5', title: 'Qotib qolgan buyurtmalar', sub: 'Qoidadan oshib turganlar — eng eskisi yuqorida', flush: true, tools: U.pill('serious', '48 ta', 'tri'), body: U.tbl({
          cols: [{ h: 'Buyurtma', main: true }, { h: 'Kimda' }, { h: 'Turibdi', r: true, num: true }, { h: 'Summa', r: true, num: true }],
          rows: [...D.stuck].sort((a, b) => b.h - a.h).map((s) => [`<div><b class="num">${s.no}</b><div style="margin-top:3px">${U.stage(s.st)}</div></div>`, `${esc(s.who)}<div class="muted" style="font-size:11.5px">${esc(s.f)}</div>`, `${s.h} soat<div class="muted" style="font-size:11px;font-family:var(--font)">${esc(s.why)}</div>`, F.n(s.sum)]),
          attr: (i) => `class="click" tabindex="0" data-order="DA-184029"`,
        }) })}
        <section class="card c7"><div class="card-h"><div><h2>So'nggi buyurtmalar</h2><p>Qatorni bosing — tafsilot va tarix lentasi ochiladi</p></div></div>
          <div class="tfilters" style="padding-top:12px" id="or-filters"><button class="chip" data-ost="all" aria-pressed="true">Barchasi</button>${D.STAGES.map((s) => `<button class="chip" data-ost="${s.key}" aria-pressed="false"><i class="dot" style="background:${s.v}"></i>${esc(s.name)}</button>`).join('')}</div>
          <div class="card-b flush" style="padding-top:0" id="or-list">${U.tbl({
            cols: [{ h: 'Buyurtma', main: true }, { h: 'Holat' }, { h: 'Mijoz' }, { h: 'Summa', r: true, num: true }, { h: "To'lov" }, { h: 'Manba' }],
            rows: D.orders.map((o) => [`<b class="num">${o.no}</b> <span class="muted num" style="font-size:11.5px">${o.t}</span>`, U.stage(o.st), `${esc(o.cl)}<div class="muted" style="font-size:11.5px">${esc(o.reg)}</div>`, F.n(o.sum), esc(o.pay), esc(o.src)]),
            attr: (i) => `class="click" tabindex="0" data-order="${D.orders[i].no}" data-st="${D.orders[i].st}"`,
          })}<div class="state" id="or-empty" hidden><span class="si">${ic('filter')}</span><b>Filtrga mos buyurtma yo'q</b><p>Boshqa holatni tanlang yoki filtrni tozalang.</p><button class="btn sm" data-ost="all">Filtrni tozalash</button></div></div></section>
      </div>`;
    },
    mount(c) {
      const k = D.kpi;
      Charts.mount('or-trend', 'line', { title: 'Kunlik buyurtmalar', labels: c.lab, yf: F.n, h: 300, series: [{ name: 'Yaratildi', color: 'var(--s1)', values: c.ser(k.orders, 31) }, { name: 'Yetkazildi', color: 'var(--order-delivered)', values: c.ser(k.delivered, 32) }, { name: 'Atkaz', color: 'var(--order-cancelled)', values: c.ser(k.cancelled, 33, 0.02) }] });
      const list = document.getElementById('or-list');
      list.closest('.card').addEventListener('click', (e) => {
        const b = e.target.closest('[data-ost]'); if (!b) return;
        const st = b.dataset.ost; let n = 0;
        document.querySelectorAll('#or-filters .chip').forEach((x) => x.setAttribute('aria-pressed', x.dataset.ost === st));
        list.querySelectorAll('tbody tr').forEach((tr) => { const on = st === 'all' || tr.dataset.st === st; tr.hidden = !on; if (on) n++; });
        list.querySelector('.tw').hidden = !n; document.getElementById('or-empty').hidden = !!n;
      });
    },
  };
})();
