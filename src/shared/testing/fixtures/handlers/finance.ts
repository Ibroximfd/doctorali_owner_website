import { addDays } from "@/shared/lib/scope";

import { envelope, type MockContext } from "../engine";
import { ADDRESS_RATE, AVG_CHECK, SKLADS, filialsState, codeOf } from "../structure-v2";
import { type MockHandler } from "../types";
import { chiefMoney, filialFlow, regionFlows, selectedFilials, totalsOf } from "../v2-metrics";

/**
 * «Moliya» — `finance/v2/` (B-12): pul qayerda turibdi, bosh kuryerlar bilan har filial alohida
 * hisob, bitta umumiy manzil narxi. `?source=` pul zanjiriga qo'llanmaydi. Aniq shakl hujjatda
 * yo'q — haqiqiy javob olingach shu fayl moslanadi.
 */

const MONEY_KEYS = ["revenue", "atCouriers", "atChief", "handed", "addresses", "fee", "feePaid"] as const;
const CHAIN_KEYS = ["atCouriers", "atChief", "handed"] as const;

/** Oxirgi topshiriqlar: bosh kuryer → filial, odatda har kuni. Janub → T2 kechikmoqda. */
const handovers = (ctx: MockContext, filialIds: readonly number[]) => {
  const filials = filialsState();
  const rows = [];
  let id = 900;
  for (let day = 0; day < 4; day += 1) {
    for (const sklad of SKLADS) {
      for (const filialId of filialIds) {
        const isLate = sklad.id === 4 && filialId === 3;
        // kechikkan juftlik har kuni emas, 3 kunda bir topshiradi
        if (isLate && day % 3 !== 2) continue;
        const money = chiefMoney(ctx, filialId).find((row) => row.skladId === sklad.id);
        const addresses = Math.max(1, Math.round((money?.addresses ?? 0) / Math.max(1, ctx.period.days)));
        id += 1;
        rows.push({
          id,
          date: addDays(ctx.today, -day),
          sklad_id: sklad.id,
          chief_name: sklad.chief.full_name,
          filial_id: filialId,
          filial_code: filials.find((filial) => filial.id === filialId)?.code ?? "",
          amount: (isLate ? addresses * 3 : addresses) * AVG_CHECK,
          // eng yangisi filialda hali tasdiqlanmagan; kechikkan juftlik — bahsli
          status: isLate ? "disputed" : day === 0 ? "pending" : "confirmed",
        });
      }
    }
  }
  return rows;
};

const finance = (ctx: MockContext) => {
  const filials = selectedFilials(ctx);
  const perFilial = filials.map((filial) => {
    const chiefs = chiefMoney(ctx, filial.id);
    // pul zanjiri manbaga bo'linmaydi (backend B-12): kuryerda · bosh kuryerda · topshirildi — hammasi
    const chain = totalsOf(chiefMoney(ctx, filial.id, "all"), CHAIN_KEYS);
    return { filial, chiefs, money: { ...totalsOf(chiefs, MONEY_KEYS), ...chain } };
  });
  const totals = totalsOf(
    perFilial.map((row) => row.money),
    MONEY_KEYS,
  );

  const regions = new Map<string, { sold: number; delivered: number; cancelled: number }>();
  for (const filial of filials) {
    for (const region of regionFlows(ctx, filial.id)) {
      const current = regions.get(region.code) ?? { sold: 0, delivered: 0, cancelled: 0 };
      regions.set(region.code, {
        sold: current.sold + region.sold,
        delivered: current.delivered + region.delivered,
        cancelled: current.cancelled + region.cancelled,
      });
    }
  }

  // haq «to'landi» deb yopish backendda yo'q (B-18) — namuna ham shunday: to'langani `null`
  return envelope(ctx, {
    address_rate: ADDRESS_RATE,
    fee_paid: null,
    fee_paid_tracked: false,
    totals: {
      revenue: totals.revenue,
      at_couriers: totals.atCouriers,
      at_chiefs: totals.atChief,
      handed: totals.handed,
      addresses: totals.addresses,
      chief_fee: totals.fee,
      chief_fee_paid: null,
    },
    filials: perFilial.map(({ filial, money }) => ({
      id: filial.id,
      code: codeOf(filial),
      name: filial.name,
      is_main: filial.is_main,
      orders_delivered: filialFlow(ctx, filial.id).delivered,
      revenue: money.revenue,
      at_couriers: money.atCouriers,
      at_chiefs: money.atChief,
      handed: money.handed,
      addresses: money.addresses,
      chief_fee: money.fee,
      chief_fee_paid: null,
    })),
    chiefs: SKLADS.map((sklad) => ({
      sklad_id: sklad.id,
      sklad_name: sklad.name,
      chief_name: sklad.chief.full_name,
      regions: [...sklad.regions],
      by_filial: perFilial.map(({ filial, chiefs }) => {
        const row = chiefs.find((item) => item.skladId === sklad.id);
        return {
          filial_id: filial.id,
          filial_code: codeOf(filial),
          addresses: row?.addresses ?? 0,
          fee: row?.fee ?? 0,
          fee_paid: null,
          collected: row?.revenue ?? 0,
          handed: row?.handed ?? 0,
          pending: (row?.atChief ?? 0) + (row?.atCouriers ?? 0),
        };
      }),
    })),
    handovers: handovers(
      ctx,
      filials.map((filial) => filial.id),
    ),
    regions: [...regions.entries()].map(([code, flow]) => ({
      code,
      sold: flow.sold,
      delivered: flow.delivered,
      cancelled: flow.cancelled,
      money: flow.delivered * AVG_CHECK,
    })),
  });
};

export const financeHandlers: MockHandler[] = [{ method: "GET", path: "finance/v2/", resolve: finance }];
