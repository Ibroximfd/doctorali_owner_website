import { addDays } from "@/shared/lib/scope";

import type { MockContext } from "../engine";

/**
 * Namuna AI javoblari: savoldagi kalit so'zlarga qarab mavzu tanlanadi (savdo,
 * ombor, kuryer, klinika, ilova…). Mos mavzu topilmasa — kunlik umumiy hisobot.
 * Har javobda raqamli bloklar va Excel ilova bor — demo hech qachon bo'sh qolmaydi.
 */

export type AnswerAttachment = { id: number; title: string; format: string; status: string };
export type AnswerContent = {
  text: string;
  blocks: unknown[];
  attachments: AnswerAttachment[];
  suggestions: string[];
};

/** Ilova id → qaysi hisobot fayli yasaladi (demo fayl generatori uchun). */
export const ATTACHMENT_REPORTS: Readonly<Record<number, string>> = {
  33: "daily",
  34: "operators",
  35: "couriers_cod",
  36: "products",
  37: "debts",
  38: "weekly",
  39: "monthly_pl",
};

const dateLabel = (iso: string): string => {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
};

const lastDays = (ctx: MockContext, count: number): string[] =>
  Array.from({ length: count }, (_, index) => addDays(ctx.today, index - count + 1));

const attachment = (id: number, title: string, ctx: MockContext): AnswerAttachment => ({
  id,
  title: `${title} — ${dateLabel(ctx.today)}`,
  format: "xlsx",
  status: "ready",
});

type Topic = { keywords: readonly string[]; build: (ctx: MockContext) => AnswerContent };

/** Kunlik umumiy hisobot — standart javob. */
const daily = (ctx: MockContext): AnswerContent => ({
  text: "Bugun jami tushum 312 mln so'm, kechagidan 8% ko'p.",
  blocks: [
    {
      type: "kpis",
      title: "Bugun",
      items: [
        { label: "Tushum", value: "312 mln so'm", delta_pct: 8.1 },
        { label: "Buyurtmalar", value: "131 ta", delta_pct: 5.6 },
        { label: "Klinika qabullari", value: "74 ta", delta_pct: 2.8 },
        { label: "Ilovada faol", value: "1 284 kishi", delta_pct: 4.2 },
      ],
    },
    {
      type: "table",
      title: "Filiallar",
      columns: ["Filial", "Buyurtma", "Tushum", "Yetkazildi"],
      rows: [
        ["Toshkent", "412", "174 mln", "86%"],
        ["Qo'qon", "196", "81 mln", "83%"],
        ["Samarqand", "131", "57 mln", "79%"],
      ],
    },
    {
      type: "bullets",
      title: "E'tibor bering",
      items: [
        "Samarqandda 14 buyurtma 3 kundan beri yo'lda",
        "Rayhon krem 50 ml omborda 4 dona qoldi — 2 kunga yetadi",
        "Kuryer #12 da 3,2 mln so'm topshirilmagan naqd",
      ],
    },
    {
      type: "chart",
      title: "So'nggi 7 kun",
      kind: "line",
      labels: lastDays(ctx, 7),
      series: [
        { name: "Tushum", values: [268, 281, 274, 295, 288, 290, 312].map((value) => value * 1_000_000) },
      ],
      unit: "uzs",
    },
    {
      type: "links",
      title: "Ochish",
      items: [
        { label: "DA-184011", kind: "order", id: "184011" },
        { label: "Ombor bo'limi", kind: "section", id: "warehouse" },
      ],
    },
    { type: "future_chart" },
  ],
  attachments: [attachment(33, "Kunlik hisobot", ctx)],
  suggestions: ["Klinika bo'yicha batafsil", "Qaysi operator sustlashgan?", "Omborda nima tugayapti?"],
});

const operators = (ctx: MockContext): AnswerContent => ({
  text: "Bugun 11 operatordan 9 tasi faol. Ikki operatorda faollik keskin tushgan, Samarqand jamoasi rejadan 18% orqada.",
  blocks: [
    {
      type: "kpis",
      title: "Operatorlar — bugun",
      items: [
        { label: "Onlayn", value: "9 / 11", delta_pct: null },
        { label: "Lidlar", value: "486 ta", delta_pct: 6.4 },
        { label: "Konversiya", value: "34,1%", delta_pct: -1.2 },
        { label: "Javobsiz qo'ng'iroq", value: "17 ta", delta_pct: 21.4 },
      ],
    },
    {
      type: "table",
      title: "Sustlashganlar",
      columns: ["Operator", "Filial", "Lid", "Konversiya", "Holat"],
      rows: [
        ["Nodira Yusupova", "Samarqand", "12", "16%", "2 soatdan beri oflayn"],
        ["Bekzod Aliyev", "Qo'qon", "19", "21%", "9 ta muddati o'tgan vazifa"],
        ["Shahzoda Rasulova", "Samarqand", "24", "25%", "Javobsiz qo'ng'iroqlar 6 ta"],
      ],
    },
    {
      type: "chart",
      title: "Filiallar bo'yicha savdo (mln so'm)",
      kind: "bar",
      labels: ["Toshkent", "Qo'qon", "Samarqand"],
      series: [{ name: "Savdo", values: [174_000_000, 81_000_000, 57_000_000] }],
      unit: "uzs",
    },
    {
      type: "bullets",
      title: "Tavsiya",
      items: [
        "Samarqand jamoasiga Toshkentdan 1 operatorni kunduzgi smenaga vaqtincha biriktiring",
        "Javobsiz qo'ng'iroqlarni soat 14:00 gacha qayta chaqirish ro'yxatiga qo'ying",
      ],
    },
    {
      type: "links",
      title: "Ochish",
      items: [
        { label: "Xodimlar reytingi", kind: "section", id: "staff" },
        { label: "Sotuv bo'limi", kind: "section", id: "sales" },
      ],
    },
  ],
  attachments: [attachment(34, "Operatorlar hisoboti", ctx)],
  suggestions: ["Eng yaxshi operatorlar kim?", "Lidlar qayerdan kelyapti?"],
});

const cash = (ctx: MockContext): AnswerContent => ({
  text: "3 ta kuryerda jami 7,8 mln so'm naqd 2 kundan ortiq topshirilmagan. 14 ta buyurtma 3 kundan beri yetkazilmagan.",
  blocks: [
    {
      type: "kpis",
      title: "Naqd pul va yetkazish",
      items: [
        { label: "Topshirilmagan naqd", value: "7,8 mln so'm", delta_pct: 12.5 },
        { label: "Kechikkan buyurtma", value: "14 ta", delta_pct: -6.7 },
        { label: "O'rtacha yetkazish", value: "19 soat", delta_pct: -3.1 },
      ],
    },
    {
      type: "table",
      title: "Kuryerlar",
      columns: ["Kuryer", "Filial", "Naqd", "Eng eskisi"],
      rows: [
        ["Kuryer #12 — Sherzod N.", "Samarqand", "3,2 mln", "3 kun"],
        ["Jasur Karimov", "Toshkent", "2,4 mln", "2 kun"],
        ["Sardor To'xtayev", "Toshkent", "2,2 mln", "2 kun"],
      ],
    },
    {
      type: "bullets",
      title: "Nima qilish kerak",
      items: [
        "Kassir bugun kuryer #12 bilan solishtiruv o'tkazsin",
        "Samarqanddagi 6 ta buyurtmani Urgutdagi bo'sh kuryerlarga biriktirish mumkin (AI taklifi tayyor)",
      ],
    },
    {
      type: "links",
      title: "Ochish",
      items: [
        { label: "Jasur Karimov", kind: "courier", id: "1" },
        { label: "DA-184011", kind: "order", id: "184011" },
        { label: "Muammolar markazi", kind: "section", id: "issues" },
      ],
    },
  ],
  attachments: [attachment(35, "Kuryerlar va naqd pul", ctx)],
  suggestions: ["Kechikkan buyurtmalar ro'yxati", "Kassaga bugun qancha topshirildi?"],
});

const warehouse = (ctx: MockContext): AnswerContent => ({
  text: "Omborda 3 ta mahsulot kritik darajada kam: eng xavflisi Rayhon krem 50 ml — 2 kunga yetadi.",
  blocks: [
    {
      type: "kpis",
      title: "Ombor",
      items: [
        { label: "Mahsulot turlari", value: "64 ta", delta_pct: null },
        { label: "Kam qolgan", value: "3 ta", delta_pct: 50 },
        { label: "Ombor qiymati", value: "1,42 mlrd so'm", delta_pct: -4.3 },
      ],
    },
    {
      type: "table",
      title: "Tugayotgan mahsulotlar",
      columns: ["Mahsulot", "Qoldiq", "Kunlik sotuv", "Yetadi"],
      rows: [
        ["Rayhon krem 50 ml", "4", "2,1", "2 kun"],
        ["Mehrigiyo balzami", "38", "9,4", "4 kun"],
        ["Zangori choy 100 g", "61", "8,7", "7 kun"],
      ],
    },
    {
      type: "chart",
      title: "Rayhon krem qoldig'i",
      kind: "line",
      labels: lastDays(ctx, 7),
      series: [{ name: "Qoldiq", values: [19, 17, 14, 12, 9, 6, 4] }],
      unit: "count",
    },
    {
      type: "bullets",
      title: "Tavsiya",
      items: ["Ta'minotchiga 200 dona buyurtma qoralamasi tayyor — tasdiqlash kerak"],
    },
    {
      type: "links",
      title: "Ochish",
      items: [
        { label: "Ombor bo'limi", kind: "section", id: "warehouse" },
        { label: "Prognoz", kind: "section", id: "forecast" },
      ],
    },
  ],
  attachments: [attachment(36, "Mahsulotlar qoldig'i", ctx)],
  suggestions: ["Qaysi mahsulot eng ko'p sotildi?", "Keyingi oy prognozi"],
});

const clinic = (ctx: MockContext): AnswerContent => ({
  text: "Klinikada bugun 74 ta qabul, tushum 17,4 mln so'm. Qo'qon filiali kechagidan 11% ko'proq bemor qabul qildi.",
  blocks: [
    {
      type: "kpis",
      title: "Klinika — bugun",
      items: [
        { label: "Qabullar", value: "74 ta", delta_pct: 2.8 },
        { label: "Tushum", value: "17,4 mln so'm", delta_pct: 6.1 },
        { label: "O'rtacha chek", value: "235 ming so'm", delta_pct: 3.2 },
      ],
    },
    {
      type: "table",
      title: "Shifokorlar",
      columns: ["Shifokor", "Filial", "Qabul", "Tushum"],
      rows: [
        ["Dr. Aliyev", "Toshkent", "21", "5,2 mln"],
        ["Dr. Saidova", "Qo'qon", "17", "3,9 mln"],
        ["Dr. Rahimov", "Toshkent", "14", "3,1 mln"],
      ],
    },
    {
      type: "chart",
      title: "Qabullar — 7 kun",
      kind: "bar",
      labels: lastDays(ctx, 7),
      series: [{ name: "Qabul", values: [61, 68, 70, 66, 72, 72, 74] }],
      unit: "count",
    },
    { type: "links", title: "Ochish", items: [{ label: "Klinika bo'limi", kind: "section", id: "clinic" }] },
  ],
  attachments: [attachment(38, "Klinika hisoboti", ctx)],
  suggestions: ["Qaysi shifokorga navbat ko'p?", "Bugungi hisobot"],
});

const app = (ctx: MockContext): AnswerContent => ({
  text: "Doctor Ali ilovasida 30 kunda 8 940 faol foydalanuvchi, bugun 1 284 kishi kirdi. 2 316 kishi 30 kundan beri kirmagan.",
  blocks: [
    {
      type: "kpis",
      title: "Ilova",
      items: [
        { label: "Faol (30 kun)", value: "8 940", delta_pct: 7.4 },
        { label: "Bugun", value: "1 284", delta_pct: 4.2 },
        { label: "O'rtacha vaqt", value: "6 daq 40 s", delta_pct: 2.1 },
        { label: "30+ kun kirmagan", value: "2 316", delta_pct: -3.5 },
      ],
    },
    {
      type: "chart",
      title: "Kunlik faol foydalanuvchilar",
      kind: "line",
      labels: lastDays(ctx, 7),
      series: [{ name: "Faol", values: [1102, 1167, 1190, 1215, 1236, 1232, 1284] }],
      unit: "count",
    },
    {
      type: "bullets",
      title: "Tavsiya",
      items: [
        "30+ kun kirmaganlarga shaxsiy chegirma bilan push-xabar yuboring",
        "Konsultatsiya bo'limi eng ko'p vaqt olinadigan joy — u yerga mahsulot tavsiyalarini qo'shing",
      ],
    },
    { type: "links", title: "Ochish", items: [{ label: "Mobil ilova", kind: "section", id: "app" }] },
  ],
  attachments: [attachment(38, "Ilova faolligi", ctx)],
  suggestions: ["Ilovadan qancha buyurtma keldi?", "Bugungi hisobot"],
});

const forecast = (ctx: MockContext): AnswerContent => ({
  text: "Joriy sur'atda oy oxirigacha tushum 9,6 mlrd so'mga yetadi — rejadan 4% yuqori. Eng katta o'sish imkoniyati — Samarqand.",
  blocks: [
    {
      type: "kpis",
      title: "Prognoz",
      items: [
        { label: "Oy oxiri tushumi", value: "9,6 mlrd so'm", delta_pct: 4 },
        { label: "Keyingi 30 kun", value: "10,1 mlrd so'm", delta_pct: 6.3 },
        { label: "Ishonch", value: "82%", delta_pct: null },
      ],
    },
    {
      type: "chart",
      title: "Tushum prognozi (mln so'm)",
      kind: "line",
      labels: lastDays(ctx, 7),
      series: [
        { name: "Haqiqiy", values: [268, 281, 274, 295, 288, 290, 312].map((value) => value * 1_000_000) },
        { name: "Prognoz", values: [272, 278, 284, 290, 296, 302, 308].map((value) => value * 1_000_000) },
      ],
      unit: "uzs",
    },
    {
      type: "bullets",
      title: "O'sish uchun",
      items: [
        "Samarqandda 2 ta qo'shimcha kuryer — oyiga +240 mln so'm kutiladi",
        "Rayhon krem zaxirasini oshirish — tugab qolsa haftasiga ~60 mln yo'qotiladi",
        "Ilovada qayta kirmaganlarni qaytarish — +3–5% buyurtma",
      ],
    },
    {
      type: "links",
      title: "Ochish",
      items: [{ label: "Prognoz bo'limi", kind: "section", id: "forecast" }],
    },
  ],
  attachments: [attachment(39, "Prognoz va reja", ctx)],
  suggestions: ["Qaysi viloyat eng tez o'syapti?", "Omborda nima tugayapti?"],
});

const finance = (ctx: MockContext): AnswerContent => ({
  text: "30 kunda tushum 2,33 mlrd so'm (+10,6%), xarajat 412 mln, sof pul oqimi 1,84 mlrd so'm. Qarzdorlik 31,2 mln so'm.",
  blocks: [
    {
      type: "kpis",
      title: "Moliya — 30 kun",
      items: [
        { label: "Tushum", value: "2,33 mlrd so'm", delta_pct: 10.6 },
        { label: "Xarajat", value: "412 mln so'm", delta_pct: 3.5 },
        { label: "Sof oqim", value: "1,84 mlrd so'm", delta_pct: 11.6 },
        { label: "Qarzdorlik", value: "31,2 mln so'm", delta_pct: -2.4 },
      ],
    },
    {
      type: "table",
      title: "Eng katta qarzdorlar",
      columns: ["Mijoz", "Filial", "Qoldiq", "Kechikish"],
      rows: [
        ["Baxtiyor Normatov", "Toshkent", "3,2 mln", "46 kun"],
        ["Saida Mirzayeva", "Qo'qon", "2,4 mln", "38 kun"],
      ],
    },
    { type: "links", title: "Ochish", items: [{ label: "Moliya bo'limi", kind: "section", id: "finance" }] },
  ],
  attachments: [attachment(37, "Qarzdorlik", ctx)],
  suggestions: ["Oylik foyda va zarar", "Qolib ketgan pul"],
});

const regions = (ctx: MockContext): AnswerContent => ({
  text: "Eng ko'p buyurtma Toshkent shahridan (38%), eng tez o'sayotgan — Samarqand (+19%). Qoraqalpog'istonda yetkazish eng sekin.",
  blocks: [
    {
      type: "chart",
      title: "Viloyatlar bo'yicha buyurtmalar",
      kind: "bar",
      labels: ["Toshkent sh.", "Farg'ona", "Samarqand", "Andijon", "Namangan"],
      series: [{ name: "Buyurtma", values: [1467, 612, 498, 371, 344] }],
      unit: "count",
    },
    {
      type: "bullets",
      title: "Xulosa",
      items: [
        "Samarqandda talab o'sdi, lekin kuryerlar yetishmaydi",
        "Qoraqalpog'istonda o'rtacha yetkazish 3,4 kun — pochta hamkorini ko'rib chiqing",
      ],
    },
    {
      type: "links",
      title: "Ochish",
      items: [{ label: "Hududlar xaritasi", kind: "section", id: "overview" }],
    },
  ],
  attachments: [attachment(38, "Hududlar", ctx)],
  suggestions: ["Prognoz", "Kuryerlar holati"],
});

const issues = (ctx: MockContext): AnswerContent => ({
  text: "Hozir 7 ta ochiq muammo bor, 2 tasi kritik: kuryer #12 dagi naqd farqi va Rayhon krem tugashi.",
  blocks: [
    {
      type: "table",
      title: "Ochiq muammolar",
      columns: ["Muammo", "Daraja", "Mas'ul"],
      rows: [
        ["Kuryer #12 da 3,2 mln naqd", "Kritik", "Kassir"],
        ["Rayhon krem 2 kunga yetadi", "Kritik", "Skladchi"],
        ["Samarqandda 14 buyurtma yo'lda", "Yuqori", "Logist"],
      ],
    },
    {
      type: "links",
      title: "Ochish",
      items: [{ label: "Muammolar markazi", kind: "section", id: "issues" }],
    },
  ],
  attachments: [attachment(33, "Muammolar ro'yxati", ctx)],
  suggestions: ["Mas'ullarga xabar yuborilganmi?", "Bugungi hisobot"],
});

/** Tartib muhim: aniqroq mavzu oldin turadi ("kunlik hisobot" — umumiy). */
const TOPICS: readonly Topic[] = [
  { keywords: ["kunlik", "hisobot", "отчет", "отчёт"], build: daily },
  { keywords: ["ilova", "foydalanuvchi", "приложен", "пользовател"], build: app },
  { keywords: ["operator", "sotuv", "lid", "qo'ng'iroq", "оператор", "продаж"], build: operators },
  { keywords: ["kuryer", "naqd", "kassa", "yetkaz", "курьер", "налич", "доставк"], build: cash },
  {
    keywords: ["ombor", "qoldiq", "zaxira", "mahsulot", "tovar", "склад", "остат", "товар"],
    build: warehouse,
  },
  { keywords: ["klinika", "shifokor", "qabul", "bemor", "клиник", "врач"], build: clinic },
  { keywords: ["prognoz", "o'sish", "tavsiya", "reja", "прогноз", "рост"], build: forecast },
  {
    keywords: ["moliya", "foyda", "xarajat", "qarz", "tushum", "pul", "финанс", "долг", "прибыл"],
    build: finance,
  },
  { keywords: ["viloyat", "hudud", "xarita", "регион", "област"], build: regions },
  { keywords: ["muammo", "xato", "signal", "проблем", "ошибк"], build: issues },
];

/** Apostrof turlari (ʻ ’ `) bir xil — "qo‘ng‘iroq" ham topiladi. */
const normalize = (text: string): string => text.toLowerCase().replace(/[ʻʼ‘’`]/g, "'");

export const answerFor = (question: string, ctx: MockContext): AnswerContent => {
  const text = normalize(question);
  const topic = TOPICS.find(({ keywords }) => keywords.some((keyword) => text.includes(keyword)));
  return (topic ?? TOPICS[0] ?? { build: daily }).build(ctx);
};
