/* Namuna ma'lumot (prototip uchun) — haqiqiy raqamlar emas. Asos: 30 kun, barcha filiallar. */
(function () {
  const NOW = new Date(2026, 9, 2, 14, 5);
  const MON = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
  const p2 = (n) => String(n).padStart(2, '0');

  /* ---------- format ---------- */
  const F = {
    n: (x) => Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
    dec: (x, d = 1) => x.toFixed(d).replace('.', ','),
    m(x) {
      const a = Math.abs(x);
      if (a >= 1e9) return F.dec(x / 1e9, 2) + ' mlrd';
      if (a >= 1e8) return Math.round(x / 1e6) + ' mln';
      if (a >= 1e6) return F.dec(x / 1e6, 1) + ' mln';
      return F.n(x);
    },
    pct: (x, d = 1) => F.dec(x, d) + '%',
    dur(min) {
      const h = Math.floor(min / 60), m = Math.round(min % 60);
      return h ? `${h} s${m ? ' ' + m + ' d' : ''}` : `${m} d`;
    },
  };

  /* ---------- seeded random ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hourShape = (h) => 0.08 + Math.exp(-Math.pow(h - 11, 2) / 9) + 0.85 * Math.exp(-Math.pow(h - 17, 2) / 7);

  /* ---------- periods ---------- */
  const PERIODS = {
    today: { label: 'Bugun', long: 'Bugun, 2-oktabr', unit: 'hour', n: 15, scale: 0.02063, cmp: 'kechagi shu vaqtga nisbatan' },
    yesterday: { label: 'Kecha', long: 'Kecha, 1-oktabr', unit: 'hour', n: 24, scale: 0.0338, cmp: 'oldingi kunga nisbatan' },
    '7d': { label: '7 kun', long: 'Oxirgi 7 kun', unit: 'day', n: 7, scale: 0.238, cmp: 'oldingi 7 kunga nisbatan' },
    '30d': { label: '30 kun', long: 'Oxirgi 30 kun', unit: 'day', n: 30, scale: 1, cmp: 'oldingi 30 kunga nisbatan' },
    '90d': { label: '90 kun', long: 'Oxirgi 90 kun', unit: 'week', n: 13, scale: 2.86, cmp: 'oldingi 90 kunga nisbatan' },
    year: { label: 'Yil', long: 'Oxirgi 12 oy', unit: 'month', n: 12, scale: 10.9, cmp: "o'tgan yilga nisbatan" },
    prev_month: { label: 'Sentabr', long: 'Sentabr 2026', unit: 'day', n: 30, scale: 0.975, cmp: 'avgustga nisbatan', end: new Date(2026, 8, 30) },
  };
  function labels(key) {
    const p = PERIODS[key], out = [];
    if (p.unit === 'hour') for (let h = 0; h < p.n; h++) out.push(p2(h) + ':00');
    else if (p.unit === 'day') { const end = p.end || NOW; for (let i = p.n - 1; i >= 0; i--) { const d = new Date(end); d.setDate(end.getDate() - i); out.push(p2(d.getDate()) + '.' + p2(d.getMonth() + 1)); } }
    else if (p.unit === 'week') { const mon = new Date(2026, 8, 28); for (let i = p.n - 1; i >= 0; i--) { const d = new Date(mon); d.setDate(mon.getDate() - i * 7); out.push(p2(d.getDate()) + '.' + p2(d.getMonth() + 1)); } }
    else for (let i = p.n - 1; i >= 0; i--) { const d = new Date(2026, 9 - i, 1); out.push(MON[d.getMonth()]); }
    return out;
  }
  /* total ni n nuqtaga taqsimlaydi (hafta kuni/soat shakli + shovqin + o'sish) */
  function series(key, total, seed, growth = 0.18) {
    const p = PERIODS[key], r = rng(seed), w = [];
    for (let i = 0; i < p.n; i++) {
      let s = 1;
      if (p.unit === 'hour') s = hourShape(i);
      else if (p.unit === 'day') { const end = p.end || NOW; const d = new Date(end); d.setDate(end.getDate() - (p.n - 1 - i)); const wd = d.getDay(); s = wd === 0 ? 0.7 : wd === 6 ? 0.88 : 1; }
      s *= 1 - growth / 2 + (growth * i) / Math.max(1, p.n - 1);
      w.push(s * (0.88 + r() * 0.24));
    }
    const sum = w.reduce((a, b) => a + b, 0);
    return w.map((x) => Math.round((total * x) / sum));
  }

  const FILIALS = [
    { id: 'all', name: 'Barcha filiallar', short: 'Barchasi', scale: 1 },
    { id: 'tsh', name: 'Toshkent', short: 'Toshkent', scale: 0.56, clinic: true },
    { id: 'qqn', name: "Qo'qon", short: "Qo'qon", scale: 0.26, clinic: true },
    { id: 'sam', name: 'Samarqand', short: 'Samarqand', scale: 0.18, clinic: false },
  ];

  const STAGES = [
    { key: 'pending', name: 'Kutilmoqda', v: 'var(--order-pending)' },
    { key: 'confirmed', name: 'Tasdiqlangan', v: 'var(--order-confirmed)' },
    { key: 'shipping', name: "Yo'lga chiqarilgan", v: 'var(--order-shipping)' },
    { key: 'delivered', name: 'Yetkazilgan', v: 'var(--order-delivered)' },
    { key: 'cancelled', name: 'Atkaz', v: 'var(--order-cancelled)' },
  ];

  const D = {
    NOW, PERIODS, FILIALS, STAGES, labels, series, rng,
    /* tushum (so'm) */
    rev: { delivery: 1782e6, clinic: 486e6, consult: 64e6, prevTotal: 2108e6 },
    plan: { month: 'Oktabr', target: 2600e6, actual: 126.9e6, expectedPct: 5.1, last: { name: 'Sentabr', target: 2400e6, actual: 2290e6 } },
    kpi: { orders: 3860, delivered: 2912, cancelled: 486, avgCheck: 612000, visits: 2140, newCustomers: 1284, appActive: 18420 },
    /* hozirgi holat (davrdan mustaqil) */
    pipeNow: [
      { key: 'pending', count: 74, amount: 45.3e6, note: '9 tasi 24 soatdan ortiq', warn: true },
      { key: 'confirmed', count: 142, amount: 86.9e6, note: '18 tasi kuryersiz (3 s+)', warn: true },
      { key: 'shipping', count: 246, amount: 150.6e6, note: '21 tasi kechikkan (48 s+)', warn: true },
      { key: 'delivered', count: 96, amount: 58.8e6, note: 'bugun' },
      { key: 'cancelled', count: 14, amount: 8.6e6, note: 'bugun' },
    ],
    cash: { tills: 18.4e6, tillsParts: { Naqd: 11.2e6, Karta: 4.1e6, Terminal: 3.1e6 }, cod: 9.4e6, online: 12.7e6, debt: 31.2e6, overdue: 8.6e6 },
    filialRows: [
      { name: 'Toshkent', rev: 1306e6, d: 11.8, orders: 2162, rate: 87.1, clinic: 312e6, debt: 18.6e6, cod: 5.2e6 },
      { name: "Qo'qon", rev: 606e6, d: 12.4, orders: 1004, rate: 84.9, clinic: 174e6, debt: 12.6e6, cod: 2.6e6 },
      { name: 'Samarqand', rev: 420e6, d: 4.6, orders: 694, rate: 82.8, clinic: null, debt: null, cod: 1.6e6 },
    ],
    funnel: [
      { key: 'created', name: 'Yaratildi', count: 3860, amount: 2362e6, v: 'var(--ink-3)' },
      { key: 'confirmed', name: 'Tasdiqlandi', count: 3488, amount: 2135e6, v: 'var(--order-confirmed)' },
      { key: 'shipping', name: "Yo'lga chiqdi", count: 3242, amount: 1984e6, v: 'var(--order-shipping)' },
      { key: 'delivered', name: 'Yetkazildi', count: 2912, amount: 1782e6, v: 'var(--order-delivered)' },
    ],
    sources: [['Operator (CRM)', 2316], ['Mijoz ilovasi', 849], ['Shifokor', 386], ['Registratura', 232], ['Sino AI', 77]],
    regions: [
      ['QQ', "Qoraqalpog'iston", 56, 1, 1], ['TV', 'Toshkent viloyati', 498, 1, 5], ['TSH', 'Toshkent shahri', 742, 1, 6], ['NAM', 'Namangan', 316, 1, 7],
      ['XOR', 'Xorazm', 143, 2, 1], ['NAV', 'Navoiy', 86, 2, 2], ['JIZ', 'Jizzax', 112, 2, 3], ['SIR', 'Sirdaryo', 74, 2, 4], ['FAR', "Farg'ona", 388, 2, 6], ['AND', 'Andijon', 352, 2, 7],
      ['BUX', 'Buxoro', 221, 3, 2], ['SAM', 'Samarqand', 421, 3, 3],
      ['QAS', 'Qashqadaryo', 264, 4, 3], ['SUR', 'Surxondaryo', 187, 4, 4],
    ],
    cancelReasons: [['Mijoz rad etdi', 168], ['Javob bermadi', 121], ["Mijoz so'radi", 58], ['Manzil xato', 44], ['Dublikat', 31], ["To'lov o'tmadi", 22], ['Boshqa sabablar', 42]],
    confirmChannels: [['Ilovada surish', 1396], ['Telefon orqali', 1151], ['Ilova checkout', 612], ["Onlayn to'lov", 237], ['Logist / admin', 92]],
    stageTimes: [
      { name: 'Yaratildi → Tasdiq', p50: 110, target: 120, prev: 124 },
      { name: "Tasdiq → Jo'natish", p50: 220, target: 180, prev: 205 },
      { name: "Jo'natish → Yetkazish", p50: 1290, target: 1440, prev: 1360 },
    ],
    stuck: [
      { no: 'DA-183712', st: 'shipping', h: 71, sum: 1240000, who: 'Otabek Yusupov', f: "Qo'qon", why: "Yo'lda 48 s+" },
      { no: 'DA-183940', st: 'confirmed', h: 9, sum: 760000, who: 'kuryersiz', f: 'Toshkent', why: 'Kuryersiz 3 s+' },
      { no: 'DA-183688', st: 'pending', h: 52, sum: 600000, who: 'B. Olimov', f: 'Toshkent', why: 'Tasdiq 24 s+' },
      { no: 'DA-183802', st: 'shipping', h: 58, sum: 1820000, who: 'Alisher Mamatov', f: 'Samarqand', why: "Yo'lda 48 s+" },
      { no: 'DA-183955', st: 'confirmed', h: 6, sum: 480000, who: 'kuryersiz', f: 'Samarqand', why: 'Kuryersiz 3 s+' },
    ],
    orders: [
      { no: 'DA-184032', st: 'confirmed', cl: 'Shuxrat Tojiboyev', ph: '+998 94 060 39 06', reg: 'Samarqand', sum: 600000, pay: 'Naqd', paySt: 'cod', src: 'Operator', op: 'M. Xaydarov', t: '14:02', app: true },
      { no: 'DA-184031', st: 'pending', cl: 'Gulnora Ahmedova', ph: '+998 90 111 22 33', reg: 'Toshkent sh.', sum: 1240000, pay: 'Payme', paySt: 'wait', src: 'Ilova', op: '—', t: '13:58', app: true },
      { no: 'DA-184029', st: 'shipping', cl: 'Rustam Qodirov', ph: '+998 91 345 67 89', reg: "Farg'ona", sum: 760000, pay: 'Naqd', paySt: 'cod', src: 'Shifokor', op: 'D. Karimova', t: '13:41', app: false },
      { no: 'DA-184026', st: 'delivered', cl: 'Mohira Usmonova', ph: '+998 93 222 44 55', reg: 'Andijon', sum: 480000, pay: 'Click', paySt: 'paid', src: 'Ilova', op: '—', t: '13:20', app: true },
      { no: 'DA-184022', st: 'cancelled', cl: 'Anvar Sobirov', ph: '+998 97 700 12 12', reg: 'Buxoro', sum: 920000, pay: '—', paySt: 'none', src: 'Operator', op: 'B. Olimov', t: '12:54', app: false },
      { no: 'DA-184019', st: 'delivered', cl: 'Zilola Rahimova', ph: '+998 99 810 30 30', reg: 'Toshkent v.', sum: 1820000, pay: 'Naqd', paySt: 'paid', src: 'Operator', op: 'M. Yo\'ldosheva', t: '12:31', app: true },
      { no: 'DA-184015', st: 'shipping', cl: 'Farhod Ismoilov', ph: '+998 95 505 05 05', reg: 'Namangan', sum: 600000, pay: 'Naqd', paySt: 'cod', src: 'Registratura', op: '—', t: '12:05', app: false },
      { no: 'DA-184011', st: 'delivered', cl: 'Dilfuza Karimova', ph: '+998 90 987 65 43', reg: 'Toshkent sh.', sum: 760000, pay: 'Naqd', paySt: 'paid', src: 'Operator', op: 'M. Xaydarov', t: '11:52', app: true },
    ],
    payMix: [['Naqd', 1284e6], ['Click', 398e6], ['Payme', 301e6], ['Karta', 196e6], ['Terminal', 153e6]],
    fin: { collected: 2251e6, expenses: 412e6, refunds: 9.8e6, refundCount: 23, prevCollected: 2046e6, prevExpenses: 398e6 },
    expenses: [['Ish haqi', 186e6], ['Ijara', 64e6], ['Sarf materiallari', 58e6], ['Transport', 41e6], ['Boshqa', 24e6], ['Kommunal', 22e6], ["Ta'mirlash", 17e6]],
    liabilities: [
      ['Operator komissiyasi', 38.6e6, "to'lanmagan"], ["Shifokor to'lovlari", 21.4e6, '11 shifokor'], ['Keshbek ballari', 41.2e6, '412 000 ball'], ["Sovg'alar (10-buyurtma)", 13.9e6, '87 ta berildi'],
    ],
    debtAging: [['0–7 kun', 14.2e6, 31], ['8–30 kun', 8.4e6, 18], ['31+ kun', 8.6e6, 14]],
    debtors: [
      ['Baxtiyor Normatov', 'Toshkent', 3.2e6, 46], ['Saida Mirzayeva', "Qo'qon", 2.4e6, 38], ['Olim Rasulov', 'Toshkent', 1.9e6, 33], ['Nargiza Po\'latova', "Qo'qon", 1.1e6, 12], ['Jamshid Aliyev', 'Toshkent', 0.9e6, 5],
    ],
    closings: [
      ['01.10', 'Toshkent', 'closed', 0, 'N. Rahimova'], ['01.10', "Qo'qon", 'closed', -180000, 'S. Jo\'rayeva'],
      ['30.09', 'Toshkent', 'closed', 0, 'N. Rahimova'], ['30.09', "Qo'qon", 'closed', 0, 'S. Jo\'rayeva'],
      ['29.09', 'Toshkent', 'reopened', 20000, 'N. Rahimova'], ['29.09', "Qo'qon", 'closed', 0, 'S. Jo\'rayeva'],
    ],
    clinic: {
      mix: [['Mahsulot sotuvi', 212e6], ['Muolajalar', 198e6], ['Konsultatsiyalar', 76e6]],
      visits: { scheduled: 2486, arrived: 2140, noShow: 232, cancelled: 114 },
      purposes: [['Muolaja', 894], ['Konsultatsiya', 612], ['Mahsulot', 388], ["Ko'rik", 186], ['Boshqa', 60]],
      branches: [
        { name: 'Toshkent', rev: 312e6, visits: 1386, noShow: 8.4, till: 11.6e6, debt: 18.6e6, stock: 182e6, closing: 'closed', att: 96 },
        { name: "Qo'qon", rev: 174e6, visits: 754, noShow: 10.9, till: 6.8e6, debt: 12.6e6, stock: 102e6, closing: 'mismatch', att: 91 },
      ],
      stock: { value: 284e6, sku: 146, low: [['Rayhon krem 50 ml', 4, 10, 'Toshkent'], ['Zira yog\'i kapsula', 6, 12, "Qo'qon"], ['Immun choy', 3, 8, 'Toshkent'], ['Bo\'g\'im geli', 5, 10, "Qo'qon"]], out: [['Na\'matak siropi', "Qo'qon"], ['Qora sedana yog\'i 100 ml', 'Toshkent']] },
      newCl: 486, retCl: 1654,
    },
    doctors: [
      { n: 'Ali Valiyev', sp: 'Terapevt', f: 'Toshkent', on: 214, vis: 386, ord: 96, sales: 58.7e6, com: 8.4e6, out: 3.1e6, r: 4.9, rc: 182 },
      { n: 'Nodira Sultonova', sp: 'Nevrolog', f: 'Toshkent', on: 186, vis: 312, ord: 74, sales: 45.3e6, com: 6.6e6, out: 2.4e6, r: 4.8, rc: 151 },
      { n: 'Sherzod Qosimov', sp: 'Ortoped', f: "Qo'qon", on: 152, vis: 294, ord: 68, sales: 41.6e6, com: 5.9e6, out: 4.8e6, r: 4.7, rc: 133 },
      { n: 'Malika Ergasheva', sp: 'Dermatolog', f: 'Toshkent', on: 141, vis: 268, ord: 59, sales: 36.1e6, com: 5.2e6, out: 0, r: 4.8, rc: 120 },
      { n: 'Javlon Hamidov', sp: 'Gastroenterolog', f: "Qo'qon", on: 128, vis: 241, ord: 51, sales: 31.2e6, com: 4.5e6, out: 5.2e6, r: 4.5, rc: 98 },
      { n: 'Kamola Yusupova', sp: 'Endokrinolog', f: 'Toshkent', on: 147, vis: 239, ord: 38, sales: 23.3e6, com: 3.6e6, out: 5.9e6, r: 4.2, rc: 128 },
    ],
    couriers: [
      { n: 'Jasur Karimov', f: 'Toshkent', a: 448, d: 412, min: 1140, att: 31, cod: 248e6, un: 2.4e6, days: 0 },
      { n: 'Sardor To\'xtayev', f: 'Toshkent', a: 431, d: 386, min: 1260, att: 38, cod: 231e6, un: 1.9e6, days: 0 },
      { n: 'Farrux Aliyev', f: 'Toshkent', a: 377, d: 342, min: 1200, att: 29, cod: 205e6, un: 0, days: 0 },
      { n: 'Bobur Rahimov', f: "Qo'qon", a: 392, d: 344, min: 1380, att: 42, cod: 204e6, un: 1.1e6, days: 0 },
      { n: 'Nodir Xolmatov', f: 'Samarqand', a: 361, d: 318, min: 1500, att: 44, cod: 189e6, un: 0, days: 0 },
      { n: 'Alisher Mamatov', f: 'Samarqand', a: 352, d: 298, min: 1620, att: 51, cod: 176e6, un: 1.6e6, days: 1 },
      { n: 'Islom Qodirov', f: "Qo'qon", a: 330, d: 285, min: 1440, att: 40, cod: 170e6, un: 0, days: 0 },
      { n: 'Dilshod Ergashev', f: 'Toshkent', a: 301, d: 276, min: 1080, att: 22, cod: 168e6, un: 0.9e6, days: 0 },
      { n: 'Otabek Yusupov', f: "Qo'qon", a: 296, d: 251, min: 1500, att: 47, cod: 149e6, un: 1.5e6, days: 2 },
    ],
    attemptReasons: [['Mijoz joyida yo\'q', 148], ['Manzil xato', 86], ['Mijoz rad etdi', 71], ['Boshqa', 39]],
    regionTimes: [['Toshkent shahri', 380], ['Toshkent viloyati', 720], ['Samarqand', 1260], ["Farg'ona vodiysi", 1440], ['Buxoro / Navoiy', 1680], ['Qashqadaryo / Surxondaryo', 1920], ["Xorazm / Qoraqalpog'iston", 2460]],
    transfers: [['TR-0412', 'Toshkent', "Qo'qon", 'yo\'lda', 6, '01.10'], ['TR-0411', 'Toshkent', 'Samarqand', 'qabul qilindi', 4, '30.09'], ['TR-0409', "Qo'qon", 'Toshkent', 'kutilmoqda', 2, '29.09']],
    operators: [
      { n: 'Muhammadjon Xaydarov', f: 'Toshkent', on: true, leads: 412, cv: 38.1, dl: 331, sales: 204.6e6, com: 10.2e6, miss: 2, over: 3, r: 4.8 },
      { n: 'Dilnoza Karimova', f: 'Toshkent', on: true, leads: 388, cv: 36.3, dl: 304, sales: 188.1e6, com: 9.4e6, miss: 0, over: 1, r: 4.9 },
      { n: 'Madina Yo\'ldosheva', f: 'Toshkent', on: true, leads: 342, cv: 34.8, dl: 271, sales: 166.3e6, com: 8.3e6, miss: 1, over: 4, r: 4.7 },
      { n: 'Shahzod Nematov', f: "Qo'qon", on: false, leads: 351, cv: 33.0, dl: 262, sales: 158.7e6, com: 7.9e6, miss: 5, over: 6, r: 4.6 },
      { n: 'Jahongir Tursunov', f: 'Samarqand', on: true, leads: 318, cv: 29.6, dl: 224, sales: 133.9e6, com: 6.7e6, miss: 7, over: 9, r: 4.3 },
      { n: 'Nigora Saidova', f: "Qo'qon", on: true, leads: 296, cv: 31.4, dl: 213, sales: 127.4e6, com: 6.4e6, miss: 3, over: 2, r: 4.6 },
      { n: 'Sevara Abdullayeva', f: 'Samarqand', on: true, leads: 274, cv: 27.7, dl: 186, sales: 110.2e6, com: 5.5e6, miss: 4, over: 7, r: 4.4 },
      { n: 'Bekzod Olimov', f: 'Toshkent', on: false, leads: 251, cv: 24.3, dl: 149, sales: 88.6e6, com: 4.4e6, miss: 9, over: 14, r: 3.9 },
    ],
    /* filial operator jamoalari: rahbar, oy rejasi (yetkazib berish kanali), sotuv o'zgarishi */
    filialTeams: {
      tsh: { admin: 'Rustam Abdullayev', plan: 1100e6, done: 54.3e6, d: 11.8, r: 4.7 },
      qqn: { admin: 'Dilshod Mahmudov', plan: 480e6, done: 25.2e6, d: 12.4, r: 4.6 },
      sam: { admin: 'Aziza Normurodova', plan: 420e6, done: 17.5e6, d: 4.6, r: 4.3 },
    },
    leadFunnel: [['Yangi', 1186, 'var(--seq3)'], ['Aloqada', 1742, 'var(--seq4)'], ["Qayta qo'ng'iroq", 968, 'var(--seq4)'], ['Buyurtma yaratildi', 1934, 'var(--order-delivered)'], ['Spam / Rad', 410, 'var(--order-cancelled)']],
    leadSources: [['Instagram', 2184, 27.4], ['Lidgen', 1310, 33.1], ["Kiruvchi qo'ng'iroq", 936, 41.2], ['Mijoz ilovasi', 811, 36.0], ['Facebook', 499, 22.8], ['Shifokor', 262, 48.5], ['Registratura', 148, 52.0], ["Qo'lda", 90, 30.0]],
    calls: { total: 14820, answered: 12964, missed: 1856, unhandled: 31, avgSec: 142 },
    ratings: { avg: 4.6, count: 1284, dist: [18, 26, 74, 312, 854] },
    app: {
      total: 86400, newU: 4120, active: 18420, dau: 3240, share: 22.0, push: 71, consult: 1286,
      platform: [['Android', 58750], ['iOS', 27650]],
      versions: [['1.0.63', 54, 'oxirgi'], ['1.0.62', 23], ['1.0.61', 11], ['eski versiyalar', 12]],
      langs: [["O'zbekcha", 61], ['Ruscha', 18], ['Ўзбекча (kirill)', 17], ['English', 2], ['Tojikcha', 1.4], ['Arabcha', 0.6]],
      markets: [["O'zbekiston", 96.8], ['Saudiya Arabistoni', 1.9], ['Xalqaro', 1.3]],
      confirmFunnel: [['Push yuborildi', 1612], ['Ilovada ochildi', 1498], ['Surib tasdiqladi', 1421], ["To'lov usuli tanlandi", 1409], ['Tasdiqlandi', 1396]],
      cancelFunnel: [['1 · Sabab tanladi', 214], ['2 · Ushlab qolish ekrani', 187], ['3 · Sabab yozdi', 91], ['Bekor qildi', 58]],
      cons: { created: 1286, paid: 1024, done: 968, cancelled: 142, revenue: 64e6, rating: 4.7, ratings: 812 },
      engagement: [['AI doktor suhbatlari', 6480, 14.2], ['Salomatlik balli faollari', 5210, 8.1], ['Efir tomoshabinlari', 12300, 21.5], ['Kaloriya skaneri', 3940, -3.2], ['Dori eslatmalari', 2115, 5.4], ['Referal orqali kelganlar', 384, 11.0]],
      loyalty: { issued: 178000, spent: 96400, expired: 22100, wallets: 412000, giftsWon: 112, giftsDelivered: 87 },
      doctorApp: { active: 46, orders: 386, amount: 236e6, cons: 968 },
    },
    products: [
      { n: 'Rayhon krem 50 ml', c: 'Kremlar', u: 1842, rev: 412e6, dl: 1506, cl: 336, gift: 31, stock: 4, low: true },
      { n: 'Mehrigiyo balzami', c: 'Balzamlar', u: 1516, rev: 364e6, dl: 1288, cl: 228, gift: 12, stock: 212 },
      { n: 'Qora sedana yog\'i 100 ml', c: "Yog'lar", u: 1284, rev: 257e6, dl: 1010, cl: 274, gift: 0, stock: 0, out: true },
      { n: 'Bo\'g\'im geli', c: 'Gellar', u: 1106, rev: 221e6, dl: 942, cl: 164, gift: 18, stock: 5, low: true },
      { n: 'Immun choy', c: 'Choylar', u: 1420, rev: 170e6, dl: 986, cl: 434, gift: 26, stock: 3, low: true },
      { n: 'Zira yog\'i kapsula', c: "Yog'lar", u: 824, rev: 148e6, dl: 690, cl: 134, gift: 0, stock: 6, low: true },
      { n: 'Na\'matak siropi', c: 'Siroplar', u: 918, rev: 110e6, dl: 604, cl: 314, gift: 0, stock: 0, out: true },
      { n: 'Asalli malham', c: 'Kremlar', u: 642, rev: 96e6, dl: 518, cl: 124, gift: 0, stock: 148 },
    ],
    categories: [['Kremlar', 508e6], ['Balzamlar', 364e6], ["Yog'lar", 405e6], ['Gellar', 221e6], ['Choylar', 170e6], ['Siroplar', 110e6], ['Boshqa', 216e6]],
    customers: {
      total: 61300, newC: 1284, returning: 43.6, repeat: 38.2, ltv: 1480000, perCustomer: 2.4,
      cohorts: [['Aprel', 1108, [100, 36, 27, 22, 19, 17]], ['May', 1164, [100, 38, 28, 23, 20]], ['Iyun', 1092, [100, 35, 27, 21]], ['Iyul', 1210, [100, 39, 29]], ['Avgust', 1246, [100, 41]], ['Sentabr', 1284, [100]]],
      top: [
        ['Dilfuza Karimova', 'Toshkent sh.', 14, 9.8e6, '02.10', true], ['Rustam Qodirov', "Farg'ona", 11, 8.4e6, '02.10', false], ['Zilola Rahimova', 'Toshkent v.', 12, 7.9e6, '02.10', true], ['Shuxrat Tojiboyev', 'Samarqand', 9, 6.2e6, '02.10', true], ['Mohira Usmonova', 'Andijon', 10, 5.6e6, '02.10', true], ['Baxtiyor Normatov', 'Toshkent sh.', 8, 5.1e6, '28.09', false],
      ],
    },
    alerts: [
      { sev: 'crit', cat: 'Naqd pul', t: 'Kuryerda naqd 2 kundan beri topshirilmagan', b: "Otabek Yusupov · Qo'qon · 1 500 000 so'm (4 buyurtma)", ago: '2 kun', go: 'logistics' },
      { sev: 'crit', cat: 'Kassa', t: "Kassa yopilishida kamomad: −180 000 so'm", b: "Qo'qon filiali · 01.10 · yopdi: S. Jo\'rayeva", ago: '17 soat', go: 'finance' },
      { sev: 'serious', cat: 'Buyurtmalar', t: '18 ta tasdiqlangan buyurtma 3 soatdan ortiq kuryersiz', b: 'Toshkent 11 · Samarqand 7 · jami 10,9 mln so\'m', ago: '3 soat', go: 'orders' },
      { sev: 'serious', cat: 'Yetkazish', t: "21 ta buyurtma 48 soatdan ortiq yo'lda", b: "Qo'qon 9 · Samarqand 8 · Toshkent 4", ago: '5 soat', go: 'logistics' },
      { sev: 'serious', cat: "Qo'ng'iroqlar", t: "31 ta o'tkazib yuborilgan qo'ng'iroq hal qilinmagan", b: 'Eng ko\'p: Bekzod Olimov — 9 ta, eng eskisi 4 soat oldin', ago: '4 soat', go: 'sales' },
      { sev: 'serious', cat: 'Atkaz', t: 'Samarqandda atkaz ulushi 17,2%', b: "O'rtacha 12,6% · asosiy sabab: javob bermadi", ago: 'bugun', go: 'orders' },
      { sev: 'moderate', cat: 'Qarz', t: "Muddati o'tgan qarz 8,6 mln so'm", b: '14 mijoz · eng kattasi: B. Normatov — 3,2 mln (46 kun)', ago: '1 kun', go: 'finance' },
      { sev: 'moderate', cat: 'Ombor', t: '2 mahsulot tugadi, 4 tasi kam qoldi', b: "Na\'matak siropi (Qo'qon), Qora sedana yog\'i (Toshkent)", ago: '6 soat', go: 'products' },
      { sev: 'moderate', cat: 'Sotuv jamoasi', t: "Samarqand jamoasi: bir operatorga sotuv o'rtachadan 17% past", b: "122 mln so'm · kompaniya o'rtachasi 147 mln · konversiya 28,7%", ago: '9 soat', go: 'sales' },
      { sev: 'moderate', cat: 'Baho', t: 'Past baho: 2 yulduz — Bekzod Olimov', b: '«Uzoq kutdim, qayta qo\'ng\'iroq qilishmadi» · mijoz: A. Sobirov', ago: '1 soat', go: 'sales' },
    ],
    feed: [
      { t: '14:02', c: 'var(--order-confirmed)', h: '<b>DA-184032</b> mijoz ilovada tasdiqladi · naqd', who: 'Samarqand', am: 600000 },
      { t: '13:58', c: 'var(--order-pending)', h: "<b>DA-184031</b> yaratildi · Payme to'lovi kutilmoqda", who: 'Ilova', am: 1240000 },
      { t: '13:52', c: 'var(--order-delivered)', h: '<b>DA-184011</b> yetkazildi · kuryer Jasur K.', who: 'Toshkent', am: 760000 },
      { t: '13:47', c: 'var(--s2)', h: "<b>Klinika</b> · muolaja to'lovi · terminal", who: "Qo'qon", am: 350000 },
      { t: '13:41', c: 'var(--order-shipping)', h: "<b>DA-184029</b> yo'lga chiqdi · kuryer Bobur R.", who: "Qo'qon", am: 760000 },
      { t: '13:30', c: 'var(--s3)', h: "<b>Konsultatsiya</b> to'landi · dr. Nodira Sultonova", who: 'Ilova', am: 62500 },
      { t: '13:20', c: 'var(--order-delivered)', h: '<b>DA-184026</b> yetkazildi · Click', who: 'Andijon', am: 480000 },
      { t: '12:54', c: 'var(--order-cancelled)', h: '<b>DA-184022</b> atkaz · mijoz rad etdi', who: 'Buxoro', am: 920000 },
    ],
    feedPool: [
      { c: 'var(--order-delivered)', h: '<b>DA-184034</b> yetkazildi · kuryer Sardor T.', who: 'Toshkent', am: 1240000 },
      { c: 'var(--order-confirmed)', h: '<b>DA-184036</b> telefon orqali tasdiqlandi', who: "Qo'qon", am: 600000 },
      { c: 'var(--s2)', h: '<b>Klinika</b> · kassa sotuvi · naqd', who: 'Toshkent', am: 428000 },
      { c: 'var(--order-pending)', h: '<b>DA-184037</b> yaratildi · operator D. Karimova', who: 'Toshkent', am: 1820000 },
      { c: 'var(--s3)', h: "<b>Konsultatsiya</b> to'landi · dr. Ali Valiyev", who: 'Ilova', am: 62500 },
    ],
  };
  window.D = D; window.F = F;
})();
