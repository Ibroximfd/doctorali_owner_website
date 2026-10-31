import type { RegionCode } from "@/shared/config/regions";
import { addDays, tashkentDate } from "@/shared/lib/scope";

import { apportion, rng } from "./engine";
import { PRODUCTS, REGION_NAMES, SKLADS, STOCK, filialsState } from "./structure-v2";

/**
 * Sklad API (`/api/sklad/*`) holati — TZ 18 §3 modeli: ombor (`location`: viloyat yoki kuryer),
 * qoldiq `location × item`, daftar (o'chirilmaydi) va hujjat. v2: 1 bosh kuryer = 1 sklad,
 * sklad viloyatlarni guruhlaydi (`GET sklads/`). Owner ko'rinishi — logist bilan bir xil API.
 * Owner faqat o'qiydi (egasining qarori) — namunada yozuv yo'q; tarix boshlang'ich holatdan.
 */

export type Actor = { id: number; full_name: string; kind: "system" | "logist" | "courier" | "owner" };
export type DocumentType = "receipt" | "write_off" | "courier_load" | "courier_return" | "adjustment";

export type Location = {
  id: number;
  kind: "region" | "courier";
  name: string;
  region: RegionCode;
  is_primary: boolean;
  is_active: boolean;
  courier: { id: number; full_name: string; phone: string } | null;
};

export type SkladRecord = {
  id: number;
  name: string;
  regions: RegionCode[];
  is_active: boolean;
  chief: { id: number; full_name: string };
  created_at: string;
};

type DocumentLine = {
  item: { id: number; name: string };
  quantity: number;
  before: number | null;
  after: number | null;
};

export type SkladDocument = {
  id: number;
  number: string;
  type: DocumentType;
  status: "confirmed" | "cancelled";
  location: { id: number; name: string; region: RegionCode };
  courier: { id: number; full_name: string } | null;
  reason: string | null;
  supplier: string;
  ref_number: string;
  note: string;
  lines: DocumentLine[];
  total_qty: number;
  lines_count: number;
  created_by: Actor;
  created_at: string;
};

export type LedgerRow = {
  id: number;
  created_at: string;
  region: RegionCode;
  location: { id: number; name: string; kind: "region" | "courier" };
  item: { id: number; name: string };
  movement_type: string;
  quantity: number;
  balance_after: number;
  source: { type: "order" | "document" | "adjustment"; id: number; number: string };
  actor: Actor;
  note: string;
};

const PREFIX: Record<DocumentType, string> = {
  receipt: "KIR",
  write_off: "CHQ",
  courier_load: "KYU",
  courier_return: "KQB",
  adjustment: "TZ",
};
const SYSTEM: Actor = { id: 0, full_name: "Tizim", kind: "system" };

const REGION_CODES = Object.keys(REGION_NAMES) as RegionCode[];

/** Har viloyatda bitta viloyat ombori (`is_primary`); har skladda bitta kuryerlar ombori. */
const LOCATIONS: readonly Location[] = [
  ...REGION_CODES.map((code, index) => ({
    id: 100 + index,
    kind: "region" as const,
    name: `${REGION_NAMES[code]} ombori`,
    region: code,
    is_primary: true,
    is_active: true,
    courier: null,
  })),
  ...SKLADS.map((sklad) => ({
    id: 200 + sklad.id,
    kind: "courier" as const,
    name: `${sklad.name} kuryerlari`,
    region: sklad.regions[0] ?? "toshkent_shahar",
    is_primary: false,
    is_active: true,
    courier: { id: 300 + sklad.id, full_name: `${sklad.name} kuryerlari`, phone: "" },
  })),
];

export const locations = (): readonly Location[] => LOCATIONS;
const locationOf = (id: number) => LOCATIONS.find((location) => location.id === id);
const regionLocation = (code: RegionCode) =>
  LOCATIONS.find((location) => location.kind === "region" && location.region === code);

type Cell = { on_hand: number; min: number };
const key = (locationId: number, itemId: number) => `${locationId}:${itemId}`;

type State = {
  seeded: boolean;
  sklads: SkladRecord[];
  stock: Map<string, Cell>;
  ledger: LedgerRow[];
  documents: Map<number, SkladDocument>;
  nextLedgerId: number;
  nextDocumentId: number;
};

/** Sklad qoldig'i uning viloyat omborlariga teng bo'linadi, kuryerdagisi — kuryerlar omboriga. */
const initialStock = (): Map<string, Cell> => {
  const cells = new Map<string, Cell>();
  for (const sklad of SKLADS) {
    const regional = sklad.regions.flatMap((code) => {
      const location = regionLocation(code);
      return location ? [location] : [];
    });
    for (const product of PRODUCTS) {
      const base = STOCK[sklad.id]?.[product.id] ?? { qty: 0, courier: 0, min: 0 };
      const qty = apportion(
        base.qty,
        regional.map(() => 1),
      );
      const min = apportion(
        base.min,
        regional.map(() => 1),
      );
      regional.forEach((location, index) =>
        cells.set(key(location.id, product.id), { on_hand: qty[index] ?? 0, min: min[index] ?? 0 }),
      );
      cells.set(key(200 + sklad.id, product.id), { on_hand: base.courier, min: 0 });
    }
  }
  return cells;
};

const freshState = (): State => ({
  seeded: false,
  sklads: SKLADS.map((sklad) => ({
    id: sklad.id,
    name: `${sklad.name} sklad`,
    regions: [...sklad.regions],
    is_active: true,
    chief: { id: sklad.chief.id, full_name: sklad.chief.full_name },
    created_at: "2026-10-30T10:00:00+05:00",
  })),
  stock: initialStock(),
  ledger: [],
  documents: new Map(),
  nextLedgerId: 77_001,
  nextDocumentId: 501,
});

let state = freshState();

export const resetSklad = (): void => {
  state = freshState();
};

export const cellOf = (locationId: number, itemId: number): Cell =>
  state.stock.get(key(locationId, itemId)) ?? { on_hand: 0, min: 0 };

const productRef = (id: number) => ({
  id,
  name: PRODUCTS.find((product) => product.id === id)?.name ?? `#${id}`,
});
const pad = (value: number) => String(value).padStart(2, "0");
const stamp = (date: string, minutes: number) =>
  `${date}T${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}:00+05:00`;

const mainLogist = (): Actor => ({
  id: 92,
  full_name:
    filialsState().find((filial) => filial.is_main)?.leaders.chief_logist?.full_name ?? "Bosh logist",
  kind: "logist",
});

/* ---------- boshlang'ich tarix ---------- */

type SeedEvent = {
  at: string;
  location: Location;
  itemId: number;
  type: string;
  qty: number;
  actor: Actor;
  documentType: DocumentType | null;
  reason: string | null;
  orderNumber: string | null;
  /** Bir hujjatning ikki tomoni (ombor −, kuryer +) bitta hujjatga yig'iladi. */
  group: string;
};

/**
 * Oxirgi 21 kun: 5 kunda bir kirim, har kuni kuryerga berish va avtomatik sotuv (kuryer −),
 * ba'zan qabul, bitta chiqim va bitta tuzatish. Qoldiq hozirgi holatdan orqaga hisoblanadi —
 * daftardagi oxirgi `balance_after` jadvaldagi qoldiq bilan aynan tutashadi.
 */
const seedEvents = (today: string): SeedEvent[] => {
  const random = rng(4242);
  const logist = mainLogist();
  const events: SeedEvent[] = [];
  for (let day = 20; day >= 0; day -= 1) {
    const date = addDays(today, -day);
    for (const sklad of SKLADS) {
      const store = regionLocation(sklad.regions[0] ?? "toshkent_shahar");
      const couriers = locationOf(200 + sklad.id);
      if (!store || !couriers) continue;
      const pick = (offset: number) => PRODUCTS[(day + sklad.id + offset) % PRODUCTS.length]?.id ?? 11;
      const base = { actor: logist, reason: null, orderNumber: null } as const;
      if (day % 5 === 0) {
        const itemId = pick(0);
        const qty = Math.max(4, Math.floor(cellOf(store.id, itemId).on_hand / 4));
        const at = stamp(date, 9 * 60 + sklad.id * 7);
        events.push({
          ...base,
          at,
          location: store,
          itemId,
          type: "receipt",
          qty,
          documentType: "receipt",
          group: `r${at}${store.id}`,
        });
      }
      const loadId = pick(1);
      const load = Math.max(1, Math.floor(cellOf(couriers.id, loadId).on_hand / 6));
      const loadAt = stamp(date, 10 * 60 + sklad.id * 5);
      const loadGroup = `l${loadAt}${sklad.id}`;
      events.push({
        ...base,
        at: loadAt,
        location: store,
        itemId: loadId,
        type: "courier_load",
        qty: -load,
        documentType: "courier_load",
        group: loadGroup,
      });
      events.push({
        ...base,
        at: loadAt,
        location: couriers,
        itemId: loadId,
        type: "courier_load",
        qty: load,
        documentType: "courier_load",
        group: loadGroup,
      });
      const sold = 1 + Math.floor(random() * 3);
      events.push({
        ...base,
        actor: SYSTEM,
        at: stamp(date, 15 * 60 + Math.floor(random() * 120)),
        location: couriers,
        itemId: pick(2),
        type: "sale",
        qty: -sold,
        documentType: null,
        orderNumber: `ORD-${88_000 + day * 10 + sklad.id}`,
        group: "",
      });
      if (day % 7 === 3) {
        const backId = pick(3);
        const at = stamp(date, 18 * 60);
        const group = `b${at}${sklad.id}`;
        events.push({
          ...base,
          at,
          location: couriers,
          itemId: backId,
          type: "courier_return",
          qty: -1,
          documentType: "courier_return",
          group,
        });
        events.push({
          ...base,
          at,
          location: store,
          itemId: backId,
          type: "courier_return",
          qty: 1,
          documentType: "courier_return",
          group,
        });
      }
      if (day === 11 && sklad.id === 3) {
        const at = stamp(date, 12 * 60);
        events.push({
          ...base,
          at,
          location: store,
          itemId: 13,
          type: "write_off",
          qty: -2,
          documentType: "write_off",
          reason: "damaged",
          group: `w${at}`,
        });
      }
      if (day === 6 && sklad.id === 4) {
        const at = stamp(date, 17 * 60);
        events.push({
          ...base,
          at,
          location: store,
          itemId: 12,
          type: "adjustment",
          qty: -3,
          documentType: "adjustment",
          reason: "count_diff",
          group: `a${at}`,
        });
      }
    }
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
};

const newDocument = (
  input: Omit<SkladDocument, "id" | "number" | "status" | "total_qty" | "lines_count">,
): SkladDocument => {
  const id = state.nextDocumentId++;
  const document: SkladDocument = {
    ...input,
    id,
    number: `${PREFIX[input.type]}-${input.created_at.slice(0, 10).replaceAll("-", "")}-${pad(id % 100)}`,
    status: "confirmed",
    total_qty: input.lines.reduce((sum, line) => sum + line.quantity, 0),
    lines_count: input.lines.length,
  };
  state.documents.set(id, document);
  return document;
};

const seed = (now: Date): void => {
  if (state.seeded) return;
  state.seeded = true;
  const events = seedEvents(tashkentDate(now));

  const balance = new Map<string, number>();
  const after = new Map<SeedEvent, number>();
  for (const event of [...events].reverse()) {
    const cellKey = key(event.location.id, event.itemId);
    const value = balance.get(cellKey) ?? cellOf(event.location.id, event.itemId).on_hand;
    after.set(event, value);
    balance.set(cellKey, value - event.qty);
  }

  const documents = new Map<string, SkladDocument>();
  for (const event of events) {
    let source: LedgerRow["source"];
    if (event.documentType) {
      let document = documents.get(event.group);
      if (!document) {
        const store =
          event.location.kind === "region" ? event.location : regionLocation(event.location.region);
        document = newDocument({
          type: event.documentType,
          location: {
            id: store?.id ?? event.location.id,
            name: store?.name ?? event.location.name,
            region: event.location.region,
          },
          courier: event.documentType.startsWith("courier") ? { id: 300, full_name: "Kuryer" } : null,
          reason: event.reason,
          supplier: event.documentType === "receipt" ? "Ishlab chiqarish" : "",
          ref_number: event.documentType === "receipt" ? `Nakladnoy ${400 + state.nextDocumentId}` : "",
          note: "",
          lines: [],
          created_by: event.actor,
          created_at: event.at,
        });
        documents.set(event.group, document);
      }
      if (event.location.kind === "region") {
        const value = after.get(event) ?? 0;
        document.lines.push({
          item: productRef(event.itemId),
          quantity: Math.abs(event.qty),
          before: event.documentType === "adjustment" ? value - event.qty : null,
          after: event.documentType === "adjustment" ? value : null,
        });
        document.total_qty += Math.abs(event.qty);
        document.lines_count = document.lines.length;
      }
      source = { type: "document", id: document.id, number: document.number };
    } else {
      source = { type: "order", id: 88_000 + state.nextLedgerId, number: event.orderNumber ?? "" };
    }
    state.ledger.push({
      id: state.nextLedgerId++,
      created_at: event.at,
      region: event.location.region,
      location: { id: event.location.id, name: event.location.name, kind: event.location.kind },
      item: productRef(event.itemId),
      movement_type: event.type,
      quantity: event.qty,
      balance_after: after.get(event) ?? 0,
      source,
      actor: event.actor,
      note: event.type === "sale" ? "" : "",
    });
  }
};

/* ---------- o'qish ---------- */

export const skladState = (now: Date) => {
  seed(now);
  return { sklads: state.sklads, ledger: state.ledger, documents: state.documents };
};
