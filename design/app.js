/* Prototip qobig'i: navigatsiya, global filtr (davr · filial · taqqoslash), drawer/sheet, buyruqlar palitrasi. */
(function () {
  const ICONS = {
    home: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    clinic: '<path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-5h6v5M12 8v4M10 10h4"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    headset: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 15v2a2 2 0 0 1-2 2h-1v-6h3zM3 15v2a2 2 0 0 0 2 2h1v-6H3z"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    steth: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 12 0V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 12 0v-4"/><circle cx="20" cy="10" r="2"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h6M16 13H8M16 17H8M10 9H8"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    down: '<path d="m6 9 6 6 6-6"/>', right: '<path d="m9 6 6 6-6 6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
    up: '<path d="m5 12 7-7 7 7M12 19V5"/>', dn: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    tri: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4M12 17h.01"/>',
    oct: '<path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86Z"/><path d="M12 8v4M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-5 4 3 5-7"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    bld: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    wifi: '<path d="M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M19 12.9a10 10 0 0 0-2-1.5M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8a15 15 0 0 0-11.3-3.8M12 20h.01"/>',
    panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    call: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1Z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4ZM22 2 11 13"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    go: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    compare: '<path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5Z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.500-8-4-8-9V5l8-3 8 3Z"/><path d="m9 12 2 2 4-4"/>',
  };
  const esc = Charts.esc;
  const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const stg = (key) => D.STAGES.find((s) => s.key === key) || { name: "noma'lum", v: 'var(--ink-3)' };
  const initials = (n) => n.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const NAV = [
    { id: 'overview', t: 'Umumiy', i: 'home' },
    { g: 'Biznes' },
    { id: 'orders', t: 'Buyurtmalar', i: 'box' }, { id: 'finance', t: 'Moliya', i: 'wallet' }, { id: 'clinic', t: 'Klinika', i: 'clinic' },
    { id: 'logistics', t: 'Yetkazib berish', i: 'truck' }, { id: 'sales', t: 'Sotuv jamoasi', i: 'headset' },
    { g: "O'sish" },
    { id: 'app', t: 'Mobil ilova', i: 'phone' }, { id: 'products', t: 'Mahsulotlar', i: 'leaf' }, { id: 'customers', t: 'Mijozlar', i: 'users' }, { id: 'doctors', t: 'Shifokorlar', i: 'steth' },
    { g: 'Nazorat' },
    { id: 'alerts', t: 'Signallar', i: 'bell', cnt: true }, { id: 'reports', t: 'Hisobotlar', i: 'file' }, { id: 'settings', t: 'Sozlamalar', i: 'sliders' },
    { g: 'Dizayn uchun' },
    { id: 'states', t: 'Holatlar galereyasi', i: 'layers', tag: 'UI' }, { id: 'login', t: 'Kirish ekrani', i: 'lock', tag: 'UI' },
  ];
  const TABS = ['overview', 'orders', 'finance', 'alerts'];
  const PAGES = {};
  const S = { page: 'overview', period: '30d', filial: 'all', compare: true, acked: new Set() };
  const DF = { today: 1.7, yesterday: -0.6, '7d': 0.8, '30d': 1, '90d': 1.25, year: 2.2, prev_month: 0.9 };

  /* ---------- kontekst: tanlangan davr va filialga ko'ra masshtab ---------- */
  function ctx() {
    const p = D.PERIODS[S.period], f = D.FILIALS.find((x) => x.id === S.filial);
    const s = p.scale * f.scale;
    return {
      p, f, s, key: S.period, lab: D.labels(S.period),
      k: (v) => Math.max(0, Math.round(v * s)), now: (v) => Math.round(v * f.scale),
      ser: (total, seed, g) => D.series(S.period, total * s, seed, g),
      dv: (base) => Math.round(base * DF[S.period] * 10) / 10,
      cmpName: p.cmp.replace(' nisbatan', '').replace(/ga$/, ''),
      openAlerts: D.alerts.filter((_, i) => !S.acked.has(i)),
    };
  }

  /* ---------- UI yordamchilari ---------- */
  const U = {
    ic, esc, stg, initials,
    delta(v, o = {}) {
      if (!S.compare || v == null) return '';
      const up = v > 0, flat = Math.abs(v) < 0.05, good = o.inv ? !up : up;
      return `<span class="delta ${flat ? 'flat' : good ? 'good' : 'bad'}" title="${esc(ctx().p.cmp)}">${flat ? '' : ic(up ? 'up' : 'dn')}${F.dec(Math.abs(v))}${o.pp ? ' f.p.' : '%'}</span>`;
    },
    kpi(o) {
      return `<div class="kpi"><div class="k"><span>${esc(o.k)}</span></div><div class="v">${o.v}${o.unit ? `<small>${esc(o.unit)}</small>` : ''}</div><div class="f"><div>${U.delta(o.d, o)}${o.note ? `<div class="cmp">${esc(o.note)}</div>` : ''}</div>${o.spark ? Charts.spark(o.spark) : ''}</div></div>`;
    },
    card(o) {
      return `<section class="card ${o.cls || ''}"${o.id ? ` id="${o.id}"` : ''}><div class="card-h"><div><h2>${esc(o.title)}</h2>${o.sub ? `<p>${esc(o.sub)}</p>` : ''}</div>${o.tools ? `<div class="tools">${o.tools}</div>` : ''}</div><div class="card-b ${o.flush ? 'flush' : ''}">${o.body}</div></section>`;
    },
    chartCard(o) {
      const vt = `<div class="vt" role="group" aria-label="Ko'rinish"><button aria-pressed="true" data-v="chart" aria-label="Grafik" title="Grafik">${ic('chart', 's')}</button><button aria-pressed="false" data-v="table" aria-label="Jadval" title="Jadval">${ic('table', 's')}</button></div>`;
      return U.card({ ...o, tools: (o.tools || '') + vt, body: `<div class="chart-host" id="${o.chart}"></div>${o.after || ''}` });
    },
    link: (page, text) => `<a class="link" href="#${page}">${esc(text)}${ic('right', 's')}</a>`,
    stage: (key) => { const s = stg(key); return `<span class="st"><i class="dot" style="background:${s.v}"></i>${esc(s.name)}</span>`; },
    pill: (kind, text, icon) => `<span class="pill ${kind}">${icon ? ic(icon) : ''}${esc(text)}</span>`,
    barList(rows, o = {}) {
      const max = Math.max(...rows.map((r) => r[1])), sum = rows.reduce((a, r) => a + r[1], 0), fmt = o.fmt || F.n;
      return `<div class="bl">${rows.map((r) => `<div class="bl-r"><div class="nm">${esc(r[0])}${r[2] && o.tag ? `<small>${esc(r[2])}</small>` : ''}</div><div class="vl">${esc(fmt(r[1]))}${o.share === false ? '' : `<small>${F.pct((r[1] / sum) * 100)}</small>`}${o.extra ? `<small>${esc(o.extra(r))}</small>` : ''}</div><div class="tr"><i style="width:${(r[1] / max) * 100}%;${o.color ? 'background:' + o.color : ''}"></i></div></div>`).join('')}</div>`;
    },
    stack(items, o = {}) {
      const sum = items.reduce((a, r) => a + r[1], 0), fmt = o.fmt || F.m;
      return `<div class="stack" role="img" aria-label="${esc(o.label || 'Ulushlar')}">${items.map((r) => `<i style="flex:${r[1]};background:${r[2]}" title="${esc(r[0])}: ${esc(fmt(r[1]))}"></i>`).join('')}</div>${o.blk ? `<div class="lg blk">${items.map((r) => `<div class="lg-b"><span class="nm"><i class="swt" style="background:${r[2]}"></i>${esc(r[0])}</span><b>${esc(fmt(r[1]))}<small>${F.pct((r[1] / sum) * 100)}</small></b></div>`).join('')}</div>` : `<div class="lg ${o.col ? 'col' : ''}">${items.map((r) => `<div class="lg-i"><i class="swt" style="background:${r[2]}"></i><span class="nm">${esc(r[0])}</span><span class="vl">${esc(fmt(r[1]))}</span><span class="sh">${F.pct((r[1] / sum) * 100)}</span></div>`).join('')}</div>`}`;
    },
    funnel(rows, o = {}) {
      const max = rows[0].count;
      return `<div class="fn">${rows.map((r, i) => `${i ? `<div class="fn-s">${ic('dn', 's')}<b>${F.pct((r.count / rows[i - 1].count) * 100)}</b> o'tdi${o.loss ? ` · ${F.n(rows[i - 1].count - r.count)} tasi tushib qoldi` : ''}</div>` : ''}<div class="fn-r"><div class="nm"><i class="dot" style="background:${r.v}"></i><span>${esc(r.name)}</span></div><div class="bar"><i style="width:${(r.count / max) * 100}%;background:${r.v}"></i></div><div class="vl"><b>${F.n(r.count)}</b>${r.amount != null ? `<span>${F.m(r.amount)} so'm</span>` : `<span>${F.pct((r.count / max) * 100)}</span>`}</div></div>`).join('')}</div>`;
    },
    /* cols: [{h, r, main}] — telefonda qatorlar kartaga aylanadi (data-l = sarlavha) */
    tbl(o) {
      const td = (c, v) => `<td class="${c.r ? 'r ' : ''}${c.main ? 'main ' : ''}${c.num ? 'num' : ''}" data-l="${esc(c.h)}">${v}</td>`;
      return `<div class="tw"><table class="tbl ${o.cards === false ? '' : 'cards'}"><thead><tr>${o.cols.map((c) => `<th class="${c.r ? 'r' : ''}">${esc(c.h)}</th>`).join('')}</tr></thead><tbody>${o.rows.map((r, i) => `<tr${o.attr ? ' ' + o.attr(i) : ''}>${r.map((v, j) => td(o.cols[j], v)).join('')}</tr>`).join('')}</tbody>${o.foot ? `<tfoot><tr>${o.foot.map((v, j) => `<td class="${o.cols[j].r ? 'r ' : ''}${o.cols[j].num ? 'num' : ''}">${v}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
    },
    user: (n, sub, on) => `<div class="cell-u"><span class="avatar">${esc(initials(n))}</span><div><b>${esc(n)}</b><small>${on != null ? `<i class="dot" style="width:6px;height:6px;margin-right:5px;background:${on ? 'var(--good)' : 'var(--ink-3)'}"></i>` : ''}${esc(sub)}</small></div></div>`,
    mini: (pct, color) => `<span class="mini"><i style="width:${Math.min(100, pct)}%;${color ? 'background:' + color : ''}"></i></span>`,
    stars: (v) => `<span class="stars">${ic('star')}${F.dec(v)}</span>`,
    sev: { crit: ['oct', 'Kritik'], serious: ['tri', 'Jiddiy'], moderate: ['info', "O'rta"] },
    alertItem(a, i, o = {}) {
      const [icn, lbl] = U.sev[a.sev], cls = a.sev === 'crit' ? 'crit' : a.sev === 'serious' ? 'serious' : 'moderate';
      return `<${o.tag || 'a'} class="al-i" ${o.tag ? '' : `href="#${a.go}"`} data-alert="${i}"><span class="al-ic ${cls}" title="${lbl}">${ic(icn)}</span><span class="al-t"><b>${esc(a.t)}</b><span>${esc(a.b)}</span>${o.extra || ''}</span><span class="al-m">${esc(a.ago)}</span></${o.tag || 'a'}>`;
    },
    head: (o) => `<div class="page-head"><div><h1>${esc(o.t)}</h1>${o.s ? `<p>${esc(o.s)}</p>` : ''}</div>${o.acts ? `<div class="acts">${o.acts}</div>` : ''}</div>`,
    kv: (rows) => `<dl class="kv">${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}${r[2] ? `<small>${esc(r[2])}</small>` : ''}</dd></div>`).join('')}</dl>`,
  };

  /* ---------- qobiq ---------- */
  function navHTML() {
    const n = ctx().openAlerts.length;
    return NAV.map((x) => x.g ? `<div class="nav-label">${esc(x.g)}</div>` : `<a href="#${x.id}" title="${esc(x.t)}" ${x.id === S.page ? 'aria-current="page"' : ''}>${ic(x.i)}<span>${esc(x.t)}</span>${x.cnt && n ? `<b class="cnt">${n}</b>` : ''}${x.tag ? `<em class="tag">${x.tag}</em>` : ''}</a>`).join('');
  }
  function tabbarHTML() {
    const n = ctx().openAlerts.length;
    return TABS.map((id) => { const x = NAV.find((v) => v.id === id); return `<a href="#${id}" ${id === S.page ? 'aria-current="page"' : ''}>${ic(x.i)}${x.cnt && n ? `<b class="cnt">${n}</b>` : ''}<span>${esc(x.t)}</span></a>`; }).join('') + `<button type="button" data-act="more" aria-label="Boshqa bo'limlar">${ic('more')}<span>Yana</span></button>`;
  }
  function scopeHTML() {
    const c = ctx(), seg = ['today', 'yesterday', '7d', '30d', '90d', 'year'];
    return `<div class="seg" role="group" aria-label="Davr">${seg.map((k) => `<button data-period="${k}" aria-pressed="${S.period === k}">${D.PERIODS[k].label}</button>`).join('')}</div>
      <div class="pop-wrap"><button class="btn" data-pop="range" aria-haspopup="true">${ic('cal', 's')}${S.period === 'prev_month' ? 'Sentabr 2026' : 'Oraliq'}${ic('down', 's')}</button></div>
      <div class="pop-wrap"><button class="btn" data-pop="filial" aria-haspopup="true">${ic('bld', 's')}${esc(c.f.name)}${ic('down', 's')}</button></div>
      <button class="btn ${S.compare ? '' : 'ghost'}" data-act="compare" aria-pressed="${S.compare}">${ic('compare', 's')}${S.compare ? 'Taqqoslash: ' + esc(c.cmpName) : 'Taqqoslashsiz'}</button>
      <div class="upd"><span>Yangilandi 14:05</span><button class="icon-btn" data-act="refresh" aria-label="Yangilash">${ic('refresh', 's')}</button></div>`;
  }
  function mScopeHTML() {
    const c = ctx();
    return `<button class="btn" data-act="mscope">${ic('cal', 's')}<span>${esc(c.p.label)} · ${esc(c.f.short)}</span>${ic('down', 's')}</button>`;
  }
  function popHTML(kind) {
    if (kind === 'filial') return `<div class="pop" role="menu">${D.FILIALS.map((f) => `<button class="opt" role="menuitemradio" aria-checked="${S.filial === f.id}" data-filial="${f.id}">${esc(f.name)}${ic('check', 's')}</button>`).join('')}</div>`;
    return `<div class="pop" role="menu"><button class="opt" role="menuitemradio" aria-checked="${S.period === 'prev_month'}" data-period="prev_month">O'tgan oy (sentabr)${ic('check', 's')}</button><button class="opt" role="menuitemradio" aria-checked="false" data-period="90d">Bu chorak${ic('check', 's')}</button><hr><div class="range"><input type="date" id="rng-from" value="2026-09-01" aria-label="Boshlanish"><input type="date" id="rng-to" value="2026-09-30" aria-label="Tugash"></div><div class="range"><button class="btn primary sm" style="flex:1" data-period="prev_month">Qo'llash</button></div></div>`;
  }

  function closeOverlay() {
    const o = document.getElementById('overlay');
    if (!o.firstChild) return;
    o.replaceChildren();
    if (closeOverlay.back) { closeOverlay.back.focus(); closeOverlay.back = null; }
  }
  function overlay(html, cls) {
    closeOverlay.back = document.activeElement;
    document.getElementById('overlay').innerHTML = `<div class="scrim" data-act="close"></div>${html}`;
    const f = document.querySelector('#overlay input, #overlay [data-act="close"].icon-btn, #overlay a');
    if (f) f.focus();
  }
  function closePops() { document.querySelectorAll('.pop').forEach((p) => p.remove()); }

  function openOrder(no) {
    const o = D.orders.find((x) => x.no === no) || D.orders[0], s = stg(o.st);
    const pay = { paid: ['good', "To'langan", 'check'], cod: ['warn', "Yetkazilganda to'lanadi", 'clock'], wait: ['info', "Onlayn to'lov kutilmoqda", 'clock'], none: ['neutral', 'Tanlanmagan'] }[o.paySt];
    const tl = [
      ['var(--ink-3)', 'Buyurtma yaratildi', `${o.src}${o.op !== '—' ? ' · ' + o.op : ''} · 09:14`],
      o.app ? ['var(--info)', 'Mijozga push yuborildi', 'Tasdiqlash talab qilinadi · 09:14'] : ['var(--info)', 'Mijozda ilova yo\'q', 'Telefon orqali tasdiqlanadi · 09:14'],
      ['var(--order-confirmed)', 'Tasdiqlandi', `${o.app ? 'Mijoz ilovada surib tasdiqladi' : 'Operator telefon orqali'} · ${o.pay} · 09:31`],
      ['var(--order-shipping)', "Yo'lga chiqarildi", 'Logist · kuryer Jasur Karimov · 10:20'],
      ['var(--order-delivered)', 'Yetkazildi', `Kuryer · ${o.pay} ${F.n(o.sum)} so'm · 11:52`],
    ].slice(0, { pending: 2, confirmed: 3, shipping: 4, delivered: 5, cancelled: 2 }[o.st]);
    if (o.st === 'cancelled') tl.push(['var(--order-cancelled)', 'Atkaz', 'Operator · sabab: mijoz rad etdi · 12:54']);
    overlay(`<aside class="drawer" role="dialog" aria-modal="true" aria-label="Buyurtma ${o.no}">
      <div class="dr-h"><div style="flex:1;min-width:0"><h2 class="num">${o.no}</h2><div style="margin-top:4px;display:flex;gap:8px;flex-wrap:wrap">${U.stage(o.st)}${U.pill(pay[0], pay[1], pay[2])}</div></div><button class="icon-btn" data-act="close" aria-label="Yopish">${ic('x')}</button></div>
      <div class="dr-b">
        <div class="duo"><div><div class="k">Summa</div><div class="v">${F.n(o.sum)}<small>so'm</small></div></div><div><div class="k">To'lov usuli</div><div class="v" style="font-size:16px">${esc(o.pay)}</div></div></div>
        <div class="dr-sec"><h3>Mijoz</h3>${U.kv([['Ism', esc(o.cl)], ['Telefon', `<span class="num">${o.ph}</span>`], ['Hudud', esc(o.reg)], ['Ilova', o.app ? U.pill('good', "O'rnatilgan", 'phone') : U.pill('neutral', "Yo'q")]])}</div>
        <div class="dr-sec"><h3>Mahsulotlar</h3>${U.kv([['Rayhon krem 50 ml × 1', F.n(o.sum - 120000 > 0 ? o.sum - 120000 : o.sum)], ...(o.sum > 480000 ? [['Immun choy × 1', F.n(120000)]] : []), ["Sovg'a: krem namunasi", '0']])}</div>
        <div class="dr-sec"><h3>Kim ishladi</h3>${U.kv([['Manba', esc(o.src)], ["Mas'ul operator", esc(o.op)], ['Kuryer', o.st === 'shipping' || o.st === 'delivered' ? 'Jasur Karimov' : '—'], ['Filial', 'Toshkent']])}</div>
        <div class="dr-sec"><h3>Tarix lentasi</h3><div class="tl">${tl.reverse().map((e) => `<div class="tl-i"><i class="dot" style="background:${e[0]}"></i><div><b>${esc(e[1])}</b><span>${esc(e[2])}</span></div></div>`).join('')}</div></div>
        <div class="banner">${ic('lock', 's')}<span>Boshliq paneli faqat ko'rish uchun — tahrirlash CRM / logist panelida.</span></div>
      </div></aside>`);
  }
  function openPerson(kind, i) {
    const isOp = kind === 'op', p = (isOp ? D.operators : D.couriers)[i], c = ctx();
    const body = isOp
      ? `<div class="duo"><div><div class="k">Sotuv</div><div class="v">${F.m(c.k(p.sales))}<small>so'm</small></div></div><div><div class="k">Konversiya</div><div class="v">${F.pct(p.cv)}</div></div><div><div class="k">Yetkazilgan</div><div class="v">${F.n(c.k(p.dl))}</div></div><div><div class="k">Baho</div><div class="v">${F.dec(p.r)}<small>/ 5</small></div></div></div>
         <div class="dr-sec"><h3>Ish ko'rsatkichlari</h3>${U.kv([['Lidlar', F.n(c.k(p.leads))], ['Komissiya (hisoblangan)', F.m(c.k(p.com)), "so'm"], ["O'tkazib yuborilgan qo'ng'iroqlar (hal qilinmagan)", String(p.miss)], ["Muddati o'tgan dela", String(p.over)], ['Holat', p.on ? U.pill('good', 'Onlayn') : U.pill('neutral', 'Oflayn')]])}</div>`
      : `<div class="duo"><div><div class="k">Yetkazdi</div><div class="v">${F.n(c.k(p.d))}<small>/ ${F.n(c.k(p.a))}</small></div></div><div><div class="k">Muvaffaqiyat</div><div class="v">${F.pct((p.d / p.a) * 100)}</div></div><div><div class="k">O'rtacha vaqt</div><div class="v" style="font-size:16px">${F.dur(p.min)}</div></div><div><div class="k">Topshirilmagan naqd</div><div class="v">${F.m(p.un)}<small>so'm</small></div></div></div>
         <div class="dr-sec"><h3>Naqd pul</h3>${U.kv([["Yig'gan (davrda)", F.m(c.k(p.cod)), "so'm"], ['Topshirilmagan', F.m(p.un), "so'm"], ['Eng eski topshirilmagan', p.days ? p.days + ' kun oldin' : 'bugun'], ['Muvaffaqiyatsiz urinishlar', F.n(c.k(p.att))]])}</div>`;
    overlay(`<aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(p.n)}"><div class="dr-h"><span class="avatar">${initials(p.n)}</span><div style="flex:1;min-width:0"><h2>${esc(p.n)}</h2><div class="muted" style="font-size:12.5px">${isOp ? 'Operator' : 'Kuryer'} · ${esc(p.f)}</div></div><button class="icon-btn" data-act="close" aria-label="Yopish">${ic('x')}</button></div><div class="dr-b">${body}<div class="dr-sec"><h3>Kunlik dinamika</h3><div id="dr-chart"></div></div></div></aside>`);
    Charts.mount('dr-chart', 'cols', { title: 'Kunlik', labels: c.lab, h: 180, yf: F.n, series: [{ name: isOp ? 'Yetkazilgan buyurtmalar' : 'Yetkazildi', color: 'var(--s1)', values: c.ser(isOp ? p.dl : p.d, 40 + i, 0.1) }] });
  }
  function openMScope() {
    const chips = (items, attr, cur) => items.map(([id, t]) => `<button class="chip" data-${attr}="${id}" aria-pressed="${cur === id}">${esc(t)}</button>`).join('');
    overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="Filtr"><div class="grab"></div><h3>Davr</h3><div class="opts">${chips(Object.entries(D.PERIODS).map(([k, v]) => [k, v.label]), 'period', S.period)}</div><h3>Filial</h3><div class="opts">${chips(D.FILIALS.map((f) => [f.id, f.short]), 'filial', S.filial)}</div><h3>Taqqoslash</h3><div class="set-r" style="border:0;padding:0"><div class="t"><b>Oldingi davr bilan</b><span>Har ko'rsatkich yonida o'zgarish foizi</span></div><button class="sw" role="switch" aria-checked="${S.compare}" data-act="compare" aria-label="Taqqoslash"></button></div><button class="btn primary" data-act="close" style="width:100%;height:44px;margin-top:18px">Tayyor</button></div>`);
  }
  function openMore() {
    overlay(`<div class="sheet" role="dialog" aria-modal="true" aria-label="Bo'limlar"><div class="grab"></div><div class="sheet-nav">${NAV.filter((x) => x.id && !TABS.includes(x.id)).map((x) => `<a href="#${x.id}" ${x.id === S.page ? 'aria-current="page"' : ''}>${ic(x.i, 'l')}${esc(x.t)}</a>`).join('')}</div></div>`);
  }
  function openCmdk() {
    const items = [...NAV.filter((x) => x.id).map((x) => ({ g: "Bo'limlar", t: x.t, i: x.i, h: '#' + x.id })), ...D.orders.slice(0, 4).map((o) => ({ g: 'Buyurtmalar', t: o.no + ' · ' + o.cl, i: 'box', o: o.no, s: stg(o.st).name })), ...D.operators.slice(0, 3).map((p, i) => ({ g: 'Xodimlar', t: p.n, i: 'headset', p: i, s: 'Operator · ' + p.f }))];
    const list = (q) => { let g = ''; return items.filter((x) => x.t.toLowerCase().includes(q.toLowerCase())).map((x, i) => `${x.g !== g ? ((g = x.g), `<div class="grp">${g}</div>`) : ''}<a href="${x.h || '#' + S.page}" class="${i ? '' : 'on'}" ${x.o ? `data-order="${x.o}"` : ''} ${x.p != null ? `data-person="op:${x.p}"` : ''}>${ic(x.i)}${esc(x.t)}${x.s ? `<small>${esc(x.s)}</small>` : ''}</a>`).join('') || '<div class="state" style="min-height:120px"><b>Hech narsa topilmadi</b><p>Boshqa so\'z bilan urinib ko\'ring.</p></div>'; };
    overlay(`<div class="cmdk" role="dialog" aria-modal="true" aria-label="Qidiruv"><input id="cmdk-q" type="search" placeholder="Bo'lim, buyurtma raqami, xodim…" autocomplete="off" aria-label="Qidiruv"><div class="res" id="cmdk-res">${list('')}</div></div>`);
    const q = document.getElementById('cmdk-q');
    q.addEventListener('input', () => { document.getElementById('cmdk-res').innerHTML = list(q.value); });
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = document.querySelector('#cmdk-res a'); if (a) a.click(); } });
  }

  /* ---------- render ---------- */
  function render(soft) {
    const pg = PAGES[S.page] || PAGES.overview, c = ctx(), isLogin = S.page === 'login';
    document.getElementById('app').hidden = isLogin;
    document.getElementById('login').hidden = !isLogin;
    Charts.clear();
    if (isLogin) { document.getElementById('login').innerHTML = pg.render(c); return; }
    document.getElementById('nav').innerHTML = navHTML();
    document.getElementById('tabbar').innerHTML = tabbarHTML();
    document.getElementById('top-title').textContent = pg.title;
    const pip = document.getElementById('bell-pip'); pip.textContent = c.openAlerts.length; pip.hidden = !c.openAlerts.length;
    const sc = document.getElementById('scope'), ms = document.getElementById('mscope');
    sc.innerHTML = pg.noScope ? '' : scopeHTML(); ms.innerHTML = pg.noScope ? '' : mScopeHTML();
    sc.style.display = ms.style.display = pg.noScope ? 'none' : '';
    const view = document.getElementById('view');
    const paint = () => { view.innerHTML = pg.render(c); view.classList.remove('loading'); if (pg.mount) pg.mount(c); };
    /* filtr o'zgarsa: skeleton emas — eski kontent xiralashib turadi, keyin yangisi */
    if (soft) { view.classList.add('loading'); setTimeout(paint, 220); } else { paint(); window.scrollTo(0, 0); }
  }
  function go() {
    const h = location.hash.replace('#', '');
    S.page = PAGES[h] ? h : 'overview';
    closeOverlay(); closePops(); render();
  }
  /* ichki havolalar: hash o'zgarmasa ham (cheklangan freym) sahifa almashadi */
  function nav(id) {
    S.page = PAGES[id] ? id : 'overview';
    try { history.pushState(null, '', '#' + S.page); } catch (_) { /* freymda taqiqlangan bo'lishi mumkin */ }
    closeOverlay(); closePops(); render();
  }

  /* ---------- hodisalar ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-period],[data-filial],[data-act],[data-pop],[data-order],[data-person],[data-v],[data-ack],[data-sev],.sw,#overlay a');
    if (!e.target.closest('.pop-wrap')) closePops();
    const ha = e.target.closest('a[href^="#"]');
    if (ha && !ha.dataset.order && !ha.dataset.person) { e.preventDefault(); nav(ha.getAttribute('href').slice(1)); return; }
    if (!t) return;
    if (t.dataset.pop) { const had = t.parentNode.querySelector('.pop'); closePops(); if (!had) t.insertAdjacentHTML('afterend', popHTML(t.dataset.pop)); return; }
    if (t.dataset.period) { S.period = t.dataset.period; closePops(); if (t.closest('.sheet')) { t.parentNode.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', b === t)); } render(true); return; }
    if (t.dataset.filial) { S.filial = t.dataset.filial; closePops(); if (t.closest('.sheet')) { t.parentNode.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', b === t)); } render(true); return; }
    if (t.dataset.order) { e.preventDefault(); openOrder(t.dataset.order); return; }
    if (t.dataset.person) { e.preventDefault(); const [k, i] = t.dataset.person.split(':'); openPerson(k, +i); return; }
    if (t.dataset.v) { const card = t.closest('.card'), tb = t.dataset.v === 'table'; card.querySelectorAll('.vt button').forEach((b) => b.setAttribute('aria-pressed', b === t)); card.querySelectorAll('.chart, .legend').forEach((x) => (x.hidden = tb)); card.querySelectorAll('.tv').forEach((x) => (x.hidden = !tb)); return; }
    if (t.dataset.ack != null) { S.acked.add(+t.dataset.ack); render(); return; }
    if (t.dataset.sev) { S.sev = t.dataset.sev; render(); return; }
    if (t.classList.contains('sw') && !t.dataset.act) { t.setAttribute('aria-checked', t.getAttribute('aria-checked') !== 'true'); return; }
    const a = t.dataset.act;
    if (a === 'close') closeOverlay();
    else if (a === 'compare') { S.compare = !S.compare; if (t.classList.contains('sw')) t.setAttribute('aria-checked', S.compare); render(true); }
    else if (a === 'refresh') render(true);
    else if (a === 'theme') { const r = document.documentElement, dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; r.dataset.theme = dark ? 'light' : 'dark'; }
    else if (a === 'rail') document.getElementById('side').classList.toggle('rail');
    else if (a === 'cmdk') openCmdk();
    else if (a === 'mscope') openMScope();
    else if (a === 'more') openMore();
    else if (a === 'login') nav('overview');
    else if (t.closest('#overlay') && t.tagName === 'A') closeOverlay();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeOverlay(); closePops(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdk(); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('tr[tabindex]')) { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener('pointerover', (e) => {
    const c = e.target.closest('[data-tip]');
    if (!c) return;
    const r = c.getBoundingClientRect(), [title, ...rows] = c.dataset.tip.split('|');
    Charts.tipShow(title, rows.map((x) => { const [n, v] = x.split('='); return { color: c.dataset.tc || 'var(--s1)', name: n, value: v }; }), r.left + r.width / 2, r.top);
  });
  document.addEventListener('pointerout', (e) => { if (e.target.closest('[data-tip]')) Charts.tipHide(); });
  document.addEventListener('focusin', (e) => { const c = e.target.closest && e.target.closest('[data-tip]'); if (c && c.matches(':focus-visible')) c.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); });
  document.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('[data-tip]')) Charts.tipHide(); });
  window.addEventListener('hashchange', go);
  window.addEventListener('popstate', go);

  /* jonli lenta: har 7 s da yangi hodisa (faqat Umumiy sahifada) */
  let tick = 0;
  setInterval(() => {
    const feed = document.getElementById('feed');
    if (!feed || document.hidden) return;
    const ev = D.feedPool[tick % D.feedPool.length], mm = 6 + tick; tick++;
    feed.insertAdjacentHTML('afterbegin', `<div class="feed-i new"><time>14:${String(mm % 60).padStart(2, '0')}</time><i class="dot" style="background:${ev.c}"></i><p>${ev.h} <span class="muted">· ${esc(ev.who)}</span></p><span class="am">${F.n(ev.am)}</span></div>`);
    if (feed.children.length > 6) feed.lastElementChild.remove();
  }, 7000);

  window.App = { S, PAGES, U, NAV, ctx, start: go };
})();
