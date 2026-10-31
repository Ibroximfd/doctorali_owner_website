import { formatMoney, formatNumber, formatPercent } from "@/shared/lib/format";

import { buildContext, type MockContext } from "../engine";
import { cellOf, locations, skladState } from "../sklad-state";
import {
  ADDRESS_RATE,
  PRODUCTS,
  REGION_NAMES,
  SKLADS,
  filialsState,
  productGrant,
  codeOf,
} from "../structure-v2";
import { chiefMoney, filialFlow, operatorsOf, pct, totalsOf } from "../v2-metrics";

/**
 * Namuna AI chat javoblari — **namuna bazaning o'zidan hisoblanadi** (`v2-metrics`), shuning
 * uchun javobdagi raqam ekrandagi raqam bilan bir xil. Savoldagi kalit so'zga qarab mavzu
 * tanlanadi (moliya, konversiya, sklad, filial, xodim); mos mavzu topilmasa — umumiy holat.
 * Davr — oxirgi 30 kun.
 */

/** Javob bo'laklari (namuna ichida) — chatga bitta matn bo'lib boradi (`toText`). */
type Block = {
  type: string;
  title: string;
  items?: readonly unknown[];
  columns?: readonly string[];
  rows?: readonly (readonly string[])[];
};

type AnswerContent = { text: string; blocks: Block[]; suggestions: string[] };

const money = (value: number): string => formatMoney(value);
const count = (value: number): string => formatNumber(value);
const share = (value: number | null): string => formatPercent(value);

const flows = (ctx: MockContext) =>
  filialsState().map((filial) => ({ filial, flow: filialFlow(ctx, filial.id) }));

type Topic = {
  keywords: readonly string[];
  tools: readonly string[];
  build: (ctx: MockContext) => AnswerContent;
};

const overview = (ctx: MockContext): AnswerContent => {
  const rows = flows(ctx);
  const total = totalsOf(
    rows.map((row) => row.flow),
    ["leads", "leadSold", "sold", "inTransit", "delivered", "cancelled", "revenue"],
  );
  const weakest = [...rows].sort(
    (a, b) => (pct(a.flow.leadSold, a.flow.leads) ?? 0) - (pct(b.flow.leadSold, b.flow.leads) ?? 0),
  )[0];
  return {
    text: `Oxirgi 30 kunda ${count(total.sold)} ta zakaz sotildi, ${count(total.delivered)} tasi yetkazildi, tushum ${money(total.revenue)}. Konversiya ${share(pct(total.leadSold, total.leads))}, atkaz ${share(pct(total.cancelled, total.sold))}.`,
    blocks: [
      {
        type: "kpis",
        title: "30 kun",
        items: [
          { label: "Tushum", value: money(total.revenue), delta_pct: 7.4 },
          { label: "Sotildi", value: `${count(total.sold)} ta`, delta_pct: 6.1 },
          { label: "Yo'lda", value: `${count(total.inTransit)} ta`, delta_pct: -3.5 },
          { label: "Atkaz", value: `${count(total.cancelled)} ta`, delta_pct: 4.6 },
        ],
      },
      {
        type: "table",
        title: "Filiallar",
        columns: ["Filial", "Sotildi", "Yetkazildi", "Konversiya", "Tushum"],
        rows: rows.map(({ filial, flow }) => [
          `${codeOf(filial)} · ${filial.name}`,
          count(flow.sold),
          count(flow.delivered),
          share(pct(flow.leadSold, flow.leads)),
          money(flow.revenue),
        ]),
      },
      ...(weakest
        ? [
            {
              type: "bullets",
              title: "E'tibor bering",
              items: [
                `${codeOf(weakest.filial)} konversiyasi eng past — ${share(pct(weakest.flow.leadSold, weakest.flow.leads))}`,
              ],
            },
          ]
        : []),
      { type: "links", title: "Ochish", items: [{ label: "Analitika", kind: "section", id: "analytics" }] },
    ],
    suggestions: ["Pul hozir qayerda?", "Qaysi skladda mahsulot kam?"],
  };
};

const finance = (ctx: MockContext): AnswerContent => {
  const rows = filialsState().flatMap((filial) =>
    chiefMoney(ctx, filial.id).map((row) => ({ ...row, filial })),
  );
  const total = totalsOf(rows, ["revenue", "atCouriers", "atChief", "handed", "addresses", "fee", "feePaid"]);
  const stuck = [...rows].sort((a, b) => b.atChief - a.atChief)[0];
  const stuckSklad = SKLADS.find((sklad) => sklad.id === stuck?.skladId);
  return {
    text: `Yetkazilgan zakazlardan ${money(total.revenue)} tushdi: filiallarga ${money(total.handed)} topshirildi, bosh kuryerlarda ${money(total.atChief)}, kuryerlarda ${money(total.atCouriers)}.`,
    blocks: [
      {
        type: "kpis",
        title: "Pul qayerda",
        items: [
          { label: "Filiallarga topshirildi", value: money(total.handed), delta_pct: null },
          { label: "Bosh kuryerlarda", value: money(total.atChief), delta_pct: null },
          { label: "Kuryerlarda", value: money(total.atCouriers), delta_pct: null },
          { label: "Bosh kuryer haqi qarzi", value: money(total.fee - total.feePaid), delta_pct: null },
        ],
      },
      {
        type: "table",
        title: "Filiallar bo'yicha",
        columns: ["Filial", "Manzil", "Topshirildi", "Bosh kuryerda", "Haq (to'langan / jami)"],
        rows: filialsState().map((filial) => {
          const own = totalsOf(
            rows.filter((row) => row.filial.id === filial.id),
            ["addresses", "handed", "atChief", "fee", "feePaid"],
          );
          return [
            `${codeOf(filial)} · ${filial.name}`,
            count(own.addresses),
            money(own.handed),
            money(own.atChief),
            `${money(own.feePaid)} / ${money(own.fee)}`,
          ];
        }),
      },
      {
        type: "bullets",
        title: "Xulosa",
        items: [
          `Bir manzil narxi hamma filial uchun bitta — ${money(ADDRESS_RATE)}`,
          ...(stuck && stuckSklad
            ? [
                `Eng ko'p pul ${stuckSklad.chief.full_name} (${stuckSklad.name}) da turibdi — ${codeOf(stuck.filial)} uchun ${money(stuck.atChief)}`,
              ]
            : []),
        ],
      },
      { type: "links", title: "Ochish", items: [{ label: "Moliya", kind: "section", id: "finance" }] },
    ],
    suggestions: ["Qaysi filial konversiyasi past?", "Umumiy holat"],
  };
};

const conversion = (ctx: MockContext): AnswerContent => {
  const operators = filialsState().flatMap((filial) =>
    operatorsOf(ctx, filial.id).map((row) => ({
      ...row,
      code: codeOf(filial),
      rate: pct(row.sold, row.leads) ?? 0,
    })),
  );
  const ranked = [...operators].sort((a, b) => b.rate - a.rate);
  const best = ranked[0];
  const worst = ranked.at(-1);
  return {
    text: "Konversiya va atkaz filiallar bo'yicha, filial ichida — operatorlar bo'yicha.",
    blocks: [
      {
        type: "table",
        title: "Filiallar",
        columns: ["Filial", "Lid", "Sotildi", "Konversiya", "Atkaz"],
        rows: flows(ctx).map(({ filial, flow }) => [
          `${codeOf(filial)} · ${filial.name}`,
          count(flow.leads),
          count(flow.sold),
          share(pct(flow.leadSold, flow.leads)),
          share(pct(flow.cancelled, flow.sold)),
        ]),
      },
      {
        type: "bullets",
        title: "Operatorlar",
        items: [
          ...(best ? [`Eng yuqori: ${best.full_name} (${best.code}) — ${share(best.rate)}`] : []),
          ...(worst ? [`Eng past: ${worst.full_name} (${worst.code}) — ${share(worst.rate)}`] : []),
        ],
      },
      { type: "links", title: "Ochish", items: [{ label: "Analitika", kind: "section", id: "analytics" }] },
    ],
    suggestions: ["Xodimlar reytingi", "Pul hozir qayerda?"],
  };
};

const warehouse = (ctx: MockContext): AnswerContent => {
  const low = skladState(ctx.now).sklads.flatMap((sklad) =>
    PRODUCTS.flatMap((product) => {
      const stores = locations().filter(
        (location) => location.kind === "region" && sklad.regions.includes(location.region),
      );
      const cell = stores.reduce(
        (sum, location) => {
          const own = cellOf(location.id, product.id);
          return { qty: sum.qty + own.on_hand, min: sum.min + own.min };
        },
        { qty: 0, min: 0 },
      );
      return cell.qty < cell.min ? [{ sklad, product, cell }] : [];
    }),
  );
  const ungranted = PRODUCTS.filter((product) => productGrant(product.id) === null);
  return {
    text: low.length
      ? `${low.length} ta pozitsiya minimal qoldiqdan past. Eng xavflisi — ${low[0]?.sklad.name}: ${low[0]?.product.name}.`
      : "Hamma skladda qoldiq minimaldan yuqori.",
    blocks: [
      {
        type: "table",
        title: "Kam qolgan mahsulotlar",
        columns: ["Sklad", "Mahsulot", "Qoldiq", "Minimal"],
        rows: low.map(({ sklad, product, cell }) => [
          sklad.name,
          product.name,
          count(cell.qty),
          count(cell.min),
        ]),
      },
      {
        type: "bullets",
        title: "Dopusk",
        items: ungranted.length
          ? ungranted.map(
              (product) => `${product.name} hech bir filialga berilmagan — qoldig'ini hech kim boshqarmaydi`,
            )
          : ["Har mahsulot bitta filialga berilgan"],
      },
      { type: "links", title: "Ochish", items: [{ label: "Sklad", kind: "section", id: "warehouse" }] },
    ],
    suggestions: ["Skladlar qaysi viloyatlarni qamraydi?", "Umumiy holat"],
  };
};

const sklads = (ctx: MockContext): AnswerContent => {
  const all = skladState(ctx.now).sklads;
  return {
    text: `Butun O'zbekistonda ${all.length} ta sklad — har bosh kuryerga bitta.`,
    blocks: [
      {
        type: "table",
        title: "Skladlar",
        columns: ["Sklad", "Bosh kuryer", "Viloyatlar"],
        rows: all.map((sklad) => [
          sklad.name,
          sklad.chief.full_name,
          sklad.regions.map((code) => REGION_NAMES[code]).join(", "),
        ]),
      },
      { type: "links", title: "Ochish", items: [{ label: "Sklad", kind: "section", id: "warehouse" }] },
    ],
    suggestions: ["Qaysi skladda mahsulot kam?"],
  };
};

const filials = (ctx: MockContext): AnswerContent => {
  const main = filialsState().find((filial) => filial.is_main);
  return {
    text: `${filialsState().length} ta filial. Asosiy filial — ${main ? `${main.code} · ${main.name}` : "belgilanmagan"}.`,
    blocks: [
      {
        type: "table",
        title: "Filiallar va rahbarlar",
        columns: ["Filial", "B.L", "B.O", "Sotildi", "Konversiya"],
        rows: flows(ctx).map(({ filial, flow }) => [
          `${codeOf(filial)} · ${filial.name}${filial.is_main ? " ★" : ""}`,
          filial.leaders.chief_logist?.full_name ?? "—",
          filial.leaders.chief_operator?.full_name ?? "—",
          count(flow.sold),
          share(pct(flow.leadSold, flow.leads)),
        ]),
      },
      { type: "links", title: "Ochish", items: [{ label: "Filiallar", kind: "section", id: "filials" }] },
    ],
    suggestions: ["Qaysi filial konversiyasi past?", "Pul hozir qayerda?"],
  };
};

/** Tartib muhim: aniqroq mavzu oldin turadi. */
const TOPICS: readonly Topic[] = [
  { keywords: ["viloyat", "qamra", "hudud", "регион", "област"], tools: ["sklad_list"], build: sklads },
  {
    keywords: ["sklad", "qoldiq", "mahsulot", "dopusk", "склад", "остат", "товар"],
    tools: ["sklad_stock", "sklad_grants"],
    build: warehouse,
  },
  {
    keywords: ["pul", "moliya", "tushum", "bosh kuryer", "haq", "topshir", "деньг", "финанс", "курьер"],
    tools: ["finance_summary", "chief_handovers"],
    build: finance,
  },
  {
    keywords: ["konversiya", "atkaz", "operator", "xodim", "конверс", "отказ", "оператор", "сотрудник"],
    tools: ["filial_compare", "operator_stats"],
    build: conversion,
  },
  { keywords: ["filial", "b.l", "b.o", "rahbar", "филиал"], tools: ["filial_compare"], build: filials },
];

/** Apostrof turlari (ʻ ’ `) bir xil. */
const normalize = (text: string): string => text.toLowerCase().replace(/[ʻʼ‘’`]/g, "'");

/** Bloklar matnga: owner AI chat javobi — bitta `answer` matni (v2 §8.3). */
const line = (item: unknown): string => {
  if (typeof item === "string") return `• ${item}`;
  if (typeof item === "object" && item !== null && "label" in item && "value" in item)
    return `• ${String(item.label)}: ${String(item.value)}`;
  return "";
};

const toText = (content: AnswerContent): string =>
  [
    content.text,
    ...content.blocks.flatMap((block) => {
      if (block.type === "links") return [];
      const rows = (block.rows ?? []).map(
        (row) =>
          `• ${row.map((cell, index) => (index === 0 ? cell : `${block.columns?.[index] ?? ""}: ${cell}`)).join(", ")}`,
      );
      return [`${block.title}:`, ...(block.items ?? []).map(line).filter(Boolean), ...rows];
    }),
  ].join("\n");

/**
 * `POST owner/ai/chat/` javobi namunasi: matn namuna bazadan hisoblanadi (ekrandagi raqamlar bilan
 * bir xil), `tools_used` — qaysi manbadan, `period` — oxirgi 30 kun.
 */
export const answerFor = (question: string, ctx: MockContext) => {
  const text = normalize(question);
  const topic = TOPICS.find(({ keywords }) => keywords.some((keyword) => text.includes(keyword)));
  const last30 = buildContext({ searchParams: new URLSearchParams({ period: "30d" }), now: ctx.now });
  return {
    answer: toText((topic?.build ?? overview)(last30)),
    tools_used: [...(topic?.tools ?? ["overview_summary", "filial_compare"])],
    period: { date_from: last30.period.from, date_to: last30.period.to },
  };
};
