/* Yengil SVG grafiklar (prototip). Ishlab chiqarishda — Recharts o'ramlari, lekin belgi qoidalari shu:
   chiziq 2px, ustun <=24px va uchi 4px yumaloq, to'r 1px yaxlit, bitta o'q, tooltip + jadval ko'rinishi. */
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const live = [];
  let ro = null;

  /* ---------- tooltip ---------- */
  function tipShow(title, rows, cx, cy, total) {
    const t = document.getElementById('tip');
    t.replaceChildren(mk('h4', '', title));
    rows.forEach((r) => {
      const d = mk('div', 'r'), i = mk('i');
      i.style.background = r.color;
      d.append(i, mk('span', '', r.name), mk('b', '', r.value));
      t.append(d);
    });
    if (total) { const d = mk('div', 'r t'); d.append(mk('span', '', 'Jami'), mk('b', '', total)); t.append(d); }
    t.hidden = false;
    const w = t.offsetWidth, h = t.offsetHeight;
    let L = cx + 14, T = cy - h - 12;
    if (L + w > innerWidth - 8) L = cx - w - 14;
    if (L < 8) L = 8;
    if (T < 8) T = cy + 18;
    t.style.left = L + 'px'; t.style.top = T + 'px';
  }
  function tipHide() { const t = document.getElementById('tip'); if (t) t.hidden = true; }

  function nice(max, n = 4) {
    if (!(max > 0)) return { max: 1, step: 1 };
    const raw = max / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), k = raw / mag;
    const step = (k <= 1 ? 1 : k <= 2 ? 2 : k <= 2.5 ? 2.5 : k <= 5 ? 5 : 10) * mag;
    return { max: Math.ceil(max / step - 1e-9) * step, step };
  }
  function frame(el, cfg, maxVal) {
    const W = Math.max(260, el.clientWidth || 600), H = cfg.h || (W < 480 ? 200 : 250);
    const m = { l: 48, r: 12, t: 10, b: 24 };
    const sc = nice(maxVal), yf = cfg.yf || F.m;
    const y = (v) => m.t + (H - m.t - m.b) * (1 - v / sc.max);
    let g = '';
    for (let v = 0; v <= sc.max + sc.step / 1e6; v += sc.step) {
      g += `<line class="${v === 0 ? 'ax' : 'gl'}" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${esc(v === 0 ? '0' : yf(v).replace(/,0(?=\s|\u00A0|$)/, ''))}</text>`;
    }
    return { W, H, m, y, g };
  }
  function xLabels(labels, xAt, W, H, m) {
    const n = labels.length, maxL = Math.max(2, Math.floor((W - m.l - m.r) / 56)), st = Math.max(1, Math.ceil(n / maxL));
    let s = '';
    for (let i = n - 1; i >= 0; i -= st) s += `<text x="${xAt(i)}" y="${H - 5}" text-anchor="middle">${esc(labels[i])}</text>`;
    return s;
  }

  /* ---------- line / area ---------- */
  function line(el, cfg) {
    const all = cfg.series.flatMap((s) => s.values).concat(cfg.compare ? cfg.compare.values : []);
    const { W, H, m, y, g } = frame(el, cfg, Math.max(...all));
    const n = cfg.labels.length, pw = W - m.l - m.r - 12;
    const x = (i) => m.l + 6 + (n === 1 ? pw / 2 : (i * pw) / (n - 1));
    const path = (vals) => vals.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join('');
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" tabindex="0" aria-label="${esc(cfg.title || 'Grafik')}">${g}${xLabels(cfg.labels, x, W, H, m)}`;
    if (cfg.compare) s += `<path d="${path(cfg.compare.values)}" fill="none" style="stroke:var(--cmp)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    cfg.series.forEach((sr) => {
      if (sr.area || cfg.series.length === 1) s += `<path d="${path(sr.values)}L${x(n - 1)} ${y(0)}L${x(0)} ${y(0)}Z" style="fill:${sr.color}" opacity=".1"/>`;
      s += `<path d="${path(sr.values)}" fill="none" style="stroke:${sr.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      s += `<circle cx="${x(n - 1)}" cy="${y(sr.values[n - 1])}" r="4" style="fill:${sr.color};stroke:var(--surface)" stroke-width="2"/>`;
    });
    s += `<line class="xh" y1="${m.t}" y2="${H - m.b}" x1="0" x2="0" display="none"/>`;
    cfg.series.forEach((sr) => { s += `<circle class="hp" r="4.5" style="fill:${sr.color};stroke:var(--surface)" stroke-width="2" display="none"/>`; });
    s += '</svg>';
    el.innerHTML = s;
    const svg = el.firstChild, xh = svg.querySelector('.xh'), hp = svg.querySelectorAll('.hp');
    const tf = cfg.tf || cfg.yf || F.m;
    let cur = -1;
    function at(i) {
      cur = Math.max(0, Math.min(n - 1, i));
      const r = svg.getBoundingClientRect(), k = r.width / W;
      xh.setAttribute('x1', x(cur)); xh.setAttribute('x2', x(cur)); xh.setAttribute('display', 'inline');
      const rows = cfg.series.map((sr, j) => { hp[j].setAttribute('cx', x(cur)); hp[j].setAttribute('cy', y(sr.values[cur])); hp[j].setAttribute('display', 'inline'); return { color: sr.color, name: sr.name, value: tf(sr.values[cur]) }; });
      if (cfg.compare) rows.push({ color: 'var(--cmp)', name: cfg.compare.name, value: tf(cfg.compare.values[cur]) });
      const total = cfg.total && cfg.series.length > 1 ? tf(cfg.series.reduce((a, sr) => a + sr.values[cur], 0)) : null;
      tipShow(cfg.labels[cur], rows, r.left + x(cur) * k, r.top + y(Math.max(...cfg.series.map((sr) => sr.values[cur]))) * k, total);
    }
    function off() { cur = -1; xh.setAttribute('display', 'none'); hp.forEach((c) => c.setAttribute('display', 'none')); tipHide(); }
    svg.addEventListener('pointermove', (e) => { const r = svg.getBoundingClientRect(); const px = ((e.clientX - r.left) * W) / r.width; at(Math.round(((px - m.l - 6) / pw) * (n - 1))); });
    svg.addEventListener('pointerleave', off);
    svg.addEventListener('blur', off);
    svg.addEventListener('focus', () => { if (svg.matches(':focus-visible')) at(n - 1); });
    svg.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { at((cur < 0 ? n : cur) - 1); e.preventDefault(); } if (e.key === 'ArrowRight') { at((cur < 0 ? -1 : cur) + 1); e.preventDefault(); } if (e.key === 'Escape') off(); });
  }

  /* ---------- columns (stacked) ---------- */
  function cols(el, cfg) {
    const n = cfg.labels.length;
    const totals = cfg.labels.map((_, i) => cfg.series.reduce((a, sr) => a + sr.values[i], 0));
    const { W, H, m, y, g } = frame(el, cfg, Math.max(...totals));
    const band = (W - m.l - m.r) / n, bw = Math.max(3, Math.min(24, band * 0.62)), gap = bw > 8 ? 2 : 1;
    const xc = (i) => m.l + band * (i + 0.5);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" tabindex="0" aria-label="${esc(cfg.title || 'Grafik')}">${g}${xLabels(cfg.labels, xc, W, H, m)}`;
    for (let i = 0; i < n; i++) {
      s += `<rect class="band" data-i="${i}" x="${m.l + band * i}" y="${m.t}" width="${band}" height="${H - m.t - m.b}"/>`;
      let base = 0;
      const vis = cfg.series.filter((sr) => sr.values[i] > 0);
      vis.forEach((sr, j) => {
        const v = sr.values[i], y1 = y(base + v), y0 = y(base), top = j === vis.length - 1;
        const hh = Math.max(1, y0 - y1 - (j ? gap : 0)), xx = xc(i) - bw / 2, yy = y1, r = top ? Math.min(4, hh, bw / 2) : 0;
        s += `<path d="M${xx} ${yy + hh}V${yy + r}Q${xx} ${yy} ${xx + r} ${yy}H${xx + bw - r}Q${xx + bw} ${yy} ${xx + bw} ${yy + r}V${yy + hh}Z" style="fill:${sr.color}" pointer-events="none"/>`;
        base += v;
      });
    }
    s += '</svg>';
    el.innerHTML = s;
    const svg = el.firstChild, bands = svg.querySelectorAll('.band'), tf = cfg.tf || cfg.yf || F.m;
    let cur = -1;
    function at(i) {
      cur = Math.max(0, Math.min(n - 1, i));
      bands.forEach((b, j) => b.classList.toggle('on', j === cur));
      const r = svg.getBoundingClientRect(), k = r.width / W;
      const rows = cfg.series.map((sr) => ({ color: sr.color, name: sr.name, value: tf(sr.values[cur]) }));
      tipShow(cfg.labels[cur], rows, r.left + xc(cur) * k, r.top + y(totals[cur]) * k, cfg.series.length > 1 ? tf(totals[cur]) : null);
    }
    function off() { cur = -1; bands.forEach((b) => b.classList.remove('on')); tipHide(); }
    svg.addEventListener('pointermove', (e) => { const r = svg.getBoundingClientRect(); const px = ((e.clientX - r.left) * W) / r.width; at(Math.floor((px - m.l) / band)); });
    svg.addEventListener('pointerleave', off);
    svg.addEventListener('blur', off);
    svg.addEventListener('focus', () => { if (svg.matches(':focus-visible')) at(n - 1); });
    svg.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { at((cur < 0 ? n : cur) - 1); e.preventDefault(); } if (e.key === 'ArrowRight') { at((cur < 0 ? -1 : cur) + 1); e.preventDefault(); } if (e.key === 'Escape') off(); });
  }

  /* ---------- sparkline: sust chiziq, oxirgi nuqta urg'uda ---------- */
  function spark(vals) {
    const w = 72, h = 26, mx = Math.max(...vals), mn = Math.min(...vals), sp = mx - mn || 1;
    const x = (i) => 3 + (i * (w - 8)) / (vals.length - 1), y = (v) => 4 + (h - 8) * (1 - (v - mn) / sp);
    const d = vals.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join('');
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" fill="none" style="stroke:var(--cmp)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x(vals.length - 1)}" cy="${y(vals[vals.length - 1])}" r="3" style="fill:var(--accent);stroke:var(--surface)" stroke-width="1.5"/></svg>`;
  }

  /* ---------- jadval ko'rinishi (har grafikning egizagi) ---------- */
  function table(cfg) {
    const tf = cfg.tf || cfg.yf || F.m;
    const heads = cfg.series.map((s) => s.name).concat(cfg.compare ? [cfg.compare.name] : []);
    let s = `<div class="ctable"><table class="tbl"><thead><tr><th>${esc(cfg.xName || 'Davr')}</th>${heads.map((h) => `<th class="r">${esc(h)}</th>`).join('')}</tr></thead><tbody>`;
    cfg.labels.forEach((l, i) => {
      s += `<tr><td>${esc(l)}</td>${cfg.series.map((sr) => `<td class="r num">${esc(tf(sr.values[i]))}</td>`).join('')}${cfg.compare ? `<td class="r num muted">${esc(tf(cfg.compare.values[i]))}</td>` : ''}</tr>`;
    });
    return s + '</tbody></table></div>';
  }
  function legend(cfg, box) {
    if (cfg.series.length < 2 && !cfg.compare) return '';
    return `<div class="legend">${cfg.series.map((s) => `<span><i class="${box ? 'box' : ''}" style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}${cfg.compare ? `<span><i style="background:var(--cmp)"></i>${esc(cfg.compare.name)}</span>` : ''}</div>`;
  }

  /* ---------- mount / resize ---------- */
  function mount(id, type, cfg) {
    const host = document.getElementById(id);
    if (!host) return;
    const draw = type === 'line' ? line : cols;
    host.innerHTML = legend(cfg, type !== 'line') + '<div class="chart"></div><div class="tv" hidden></div>';
    const plot = host.querySelector('.chart'), tv = host.querySelector('.tv');
    tv.innerHTML = table(cfg);
    let w = 0;
    const redraw = () => { if (plot.clientWidth && plot.clientWidth !== w) { w = plot.clientWidth; draw(plot, cfg); } };
    live.push({ plot, redraw });
    if (!ro) ro = new ResizeObserver((es) => es.forEach((e) => { const it = live.find((l) => l.plot === e.target); if (it) it.redraw(); }));
    ro.observe(plot);
    redraw();
  }
  function clear() { live.forEach((l) => ro && ro.unobserve(l.plot)); live.length = 0; tipHide(); }

  window.Charts = { mount, clear, spark, tipShow, tipHide, esc };
})();
