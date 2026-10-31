import type { RegionCode } from "@/shared/config/regions";
import { shortFilialCode } from "@/shared/lib/filial-code";

/**
 * Tuzilma v2 namuna to'plami (`mehrigiyo_platform_tz/21`): filiallar Q · T1 · T2, har birida
 * bitta B.L va bitta B.O; umumiy dostavka — 5 bosh kuryer = 5 sklad; bitta manzil narxi.
 * Bosh kuryer saytining demo ma'lumoti xuddi shu to'plam (nomlar, viloyatlar, narx) — ikkala
 * panel bir xil dunyoni ko'rsatadi.
 *
 * DIQQAT: backend v2 hujjati hali yo'q. Shakllar taxminiy shartnoma — hujjat kelganda shu fayl
 * va `handlers/{filials,overview,finance,analytics,warehouse}.ts` shartnomaga moslab almashtiriladi.
 */

export const ADDRESS_RATE = 25_000;
/** Har zakazning o'rtacha summasi (namuna hisob uchun). */
export const AVG_CHECK = 420_000;

export const REGION_NAMES: Record<RegionCode, string> = {
  toshkent_shahar: "Toshkent shahri",
  toshkent: "Toshkent viloyati",
  samarqand: "Samarqand",
  fargona: "Farg'ona",
  andijon: "Andijon",
  namangan: "Namangan",
  qashqadaryo: "Qashqadaryo",
  buxoro: "Buxoro",
  surxondaryo: "Surxondaryo",
  xorazm: "Xorazm",
  jizzax: "Jizzax",
  navoiy: "Navoiy",
  sirdaryo: "Sirdaryo",
  qoraqalpogiston: "Qoraqalpog'iston",
};

/* ---------- filiallar (shakl — backend v2 §2 `owner/structure/`) ---------- */

export type LeaderRole = "chief_logist" | "chief_operator";

/** Rahbar (B.L / B.O): o'rin (`seat_id`), akkaunt (`username`) va rol qatori (`role_id`). */
export type Leader = {
  seat_id: number;
  full_name: string;
  username: string;
  role_id: number;
  /** Rolning qo'shimcha dopusklari (`PATCH roles/{id}` to'liq almashtiradi). */
  permissions: string[];
  since: string;
};

/** Filialdagi o'rin (rahbar bo'lmasa ham turadi — `heads/` ning «mavjud o'rin» rejimi uchun). */
export type Seat = { seat_id: number; full_name: string; username: string; department?: string };

export type FilialState = {
  id: number;
  /** Qisqa belgi (Q, T1, T2) — 8 belgigacha, faollar orasida noyob (B-3). */
  code: string | null;
  name: string;
  region: RegionCode | null;
  is_main: boolean;
  is_active: boolean;
  zone_id: number;
  created_at: string;
  leaders: Partial<Record<LeaderRole, Leader>>;
  seats: Seat[];
  counts: { departments: number; operators: number; logists: number };
};

/** Audit qatori (`GET owner/structure/audit/`). Parol auditga tushmaydi. */
export type AuditRow = {
  at: string;
  action: string;
  endpoint: string;
  method: string;
  status: number;
  params: Record<string, unknown>;
  user_id: number;
  ip: string;
};

/**
 * Dopusk katalogi — test serverdagi `GET owner/structure/permissions/` javobi (2026-10-31) aynan:
 * `role` — qaysi rahbarga (`both` — ikkalasiga), `group` — «qila oladi | ko'radi | boshqaradi».
 */
export type CatalogItem = {
  key: string;
  label: string;
  label_ru: string;
  role: LeaderRole | "both";
  group: string;
  main_only: boolean;
};

const item = (
  key: string,
  role: CatalogItem["role"],
  group: string,
  label: string,
  labelRu: string,
  mainOnly = false,
): CatalogItem => ({ key, label, label_ru: labelRu, role, group, main_only: mainOnly });

export const PERMISSION_CATALOG: readonly CatalogItem[] = [
  item(
    "view.sibling_departments",
    "chief_operator",
    "ko'radi",
    "Qo'shni bo'limlarni ko'rish",
    "Видеть соседние отделы",
  ),
  item(
    "view.other_filials",
    "chief_logist",
    "ko'radi",
    "Boshqa filiallarni ko'rish",
    "Видеть другие филиалы",
  ),
  item("view.finance", "both", "ko'radi", "Moliya", "Финансы"),
  item("view.analytics", "both", "ko'radi", "Analitika", "Аналитика"),
  item("view.ai", "both", "ko'radi", "AI tahlili", "AI-анализ"),
  item("view.call_records", "chief_operator", "ko'radi", "Qo'ng'iroq yozuvlari", "Записи звонков"),
  item("seat.create", "chief_operator", "boshqaradi", "Operator o'rni yaratish", "Создание места оператора"),
  item("seat.block", "both", "boshqaradi", "O'rinni bloklash", "Блокировка места"),
  item("seat.password", "both", "boshqaradi", "Parol berish/ko'rish", "Выдача/просмотр пароля"),
  item("lead.distribute", "chief_operator", "qila oladi", "Lid taqsimlash", "Распределение лидов"),
  item("lead.take", "chief_operator", "qila oladi", "Lidni olib qo'yish", "Забрать лид"),
  item(
    "lead.move_department",
    "chief_operator",
    "qila oladi",
    "Bo'limlar o'rtasida ko'chirish",
    "Перенос между отделами",
  ),
  item(
    "tiers.edit",
    "chief_operator",
    "qila oladi",
    "Foiz shablonini tahrirlash",
    "Редактирование шаблона процентов",
  ),
  item("export.leads", "chief_operator", "qila oladi", "Lidlarni eksport", "Экспорт лидов"),
  item("export.stats", "both", "qila oladi", "Statistikani eksport", "Экспорт статистики"),
  item(
    "orders.manage",
    "chief_logist",
    "boshqaradi",
    "Buyurtma statusi va biriktirish",
    "Статус заказа и привязка",
  ),
  item(
    "orders.dispatch",
    "chief_logist",
    "qila oladi",
    "Zakazlarni kuryerlarga taqsimlash",
    "Распределение заказов курьерам",
  ),
  item("couriers.manage", "chief_logist", "boshqaradi", "Kuryer akkauntlari", "Аккаунты курьеров"),
  item("zones.manage", "chief_logist", "boshqaradi", "Zonalar", "Зоны"),
  item("cash.accept", "chief_logist", "qila oladi", "Kassa (kuryerdan qabul)", "Касса (приём от курьера)"),
  item(
    "cash.collect_from_chiefs",
    "chief_logist",
    "qila oladi",
    "Bosh kuryerlardan qabul",
    "Приём от главных курьеров",
  ),
  item("addresses.adjust", "chief_logist", "qila oladi", "Manzil ±1", "Адрес ±1"),
  item(
    "warehouse.view_courier_stores",
    "chief_logist",
    "qila oladi",
    "Kuryer omborini ko'rish",
    "Просмотр склада курьеров",
  ),
  item("logist.create", "chief_logist", "boshqaradi", "Logist yaratish", "Создание логиста"),
  item("logist.grant", "chief_logist", "boshqaradi", "Logistga dopusk berish", "Выдача допуска логисту"),
  item(
    "structure.manage",
    "chief_operator",
    "boshqaradi",
    "Bo'lim/admin boshqaruvi",
    "Управление отделами/админами",
  ),
  item("deputy.assign", "chief_operator", "boshqaradi", "O'rinbosar tayinlash", "Назначение заместителя"),
  item(
    "chat.join_any",
    "both",
    "qila oladi",
    "Istalgan zakaz chatiga qo'shilish",
    "Подключение к любому чату заказа",
  ),
];

/**
 * Rol bilan birga keladigan (sukut) huquqlar — `effective_permissions` ning qo'shimchasiz qismi.
 * Namuna: backend structure/ da bu ro'yxatni hali bermaydi (savol B-26).
 */
export const ROLE_DEFAULTS: Record<LeaderRole, readonly string[]> = {
  chief_logist: ["orders.manage", "orders.dispatch", "couriers.manage"],
  chief_operator: ["lead.distribute", "seat.create", "structure.manage"],
};

const allFor = (role: LeaderRole, isMain: boolean): string[] =>
  PERMISSION_CATALOG.filter(
    (entry) =>
      (entry.role === role || entry.role === "both") &&
      (isMain || !entry.main_only) &&
      !ROLE_DEFAULTS[role].includes(entry.key),
  ).map((entry) => entry.key);

const head = (
  seat: number,
  role: number,
  fullName: string,
  username: string,
  permissions: string[],
  since: string,
): Leader => ({ seat_id: seat, full_name: fullName, username, role_id: role, permissions, since });

const INITIAL_FILIALS: readonly FilialState[] = [
  {
    id: 1,
    code: "Q",
    name: "Qo'qon",
    region: "fargona",
    is_main: true,
    is_active: true,
    zone_id: 1,
    created_at: "2024-03-01",
    leaders: {
      chief_logist: head(
        201,
        91,
        "Sardor Aliyev",
        "sardor_bl",
        allFor("chief_logist", true),
        "2024-03-01T05:00:00Z",
      ),
      chief_operator: head(
        202,
        92,
        "Malika Yusupova",
        "malika_bo",
        allFor("chief_operator", true),
        "2024-03-01T05:00:00Z",
      ),
    },
    seats: [
      { seat_id: 207, full_name: "Nodir Ahmedov", username: "nodir_l", department: "Baza-1" },
      { seat_id: 209, full_name: "Shahzod Tursunov", username: "shahzod_op", department: "Pervichka-1" },
    ],
    counts: { departments: 2, operators: 5, logists: 2 },
  },
  {
    id: 2,
    code: "T1",
    name: "Toshkent 1",
    region: "toshkent_shahar",
    is_main: false,
    is_active: true,
    zone_id: 2,
    created_at: "2025-02-10",
    leaders: {
      chief_logist: head(
        203,
        93,
        "Jahongir Nazarov",
        "jahongir_bl",
        allFor("chief_logist", false),
        "2025-02-10T05:00:00Z",
      ),
      chief_operator: head(
        204,
        94,
        "Dilfuza Rahimova",
        "dilfuza_bo",
        allFor("chief_operator", false).filter((key) => key !== "view.call_records"),
        "2025-02-10T05:00:00Z",
      ),
    },
    seats: [
      { seat_id: 208, full_name: "Laylo Karimova", username: "laylo_l", department: "Baza-1" },
      { seat_id: 210, full_name: "Bekzod Ergashev", username: "bekzod_op", department: "Pervichka-1" },
    ],
    counts: { departments: 2, operators: 4, logists: 2 },
  },
  {
    id: 3,
    code: "T2",
    name: "Toshkent 2",
    region: "toshkent_shahar",
    is_main: false,
    is_active: true,
    zone_id: 3,
    created_at: "2026-04-15",
    leaders: {
      chief_logist: head(
        205,
        95,
        "Otabek Qodirov",
        "otabek_bl",
        ["orders.dispatch", "cash.accept", "export.stats"],
        "2026-04-15T05:00:00Z",
      ),
      chief_operator: head(
        206,
        96,
        "Nigora Saidova",
        "nigora_bo",
        allFor("chief_operator", false),
        "2026-04-15T05:00:00Z",
      ),
    },
    seats: [{ seat_id: 211, full_name: "Ziyoda Olimova", username: "ziyoda_op", department: "Baza-1" }],
    counts: { departments: 2, operators: 3, logists: 1 },
  },
];

const clone = <T>(value: T): T => structuredClone(value);

/** Boshlang'ich audit: har rahbar tayinlanishi. */
const initialAudit = (): AuditRow[] =>
  INITIAL_FILIALS.flatMap((filial) =>
    (Object.entries(filial.leaders) as [LeaderRole, Leader][]).map(([kind, leader]) => ({
      at: leader.since,
      action: "structure.head.appoint",
      endpoint: `/api/owner/structure/filials/${filial.id}/heads/`,
      method: "POST",
      status: 201,
      params: { filial_id: filial.id, kind, seat_id: leader.seat_id, role_id: leader.role_id, created: true },
      user_id: 1,
      ip: "127.0.0.1",
    })),
  );

/** Server xotirasidagi holat: Owner o'zgartirsa, hamma bo'lim (moliya, sklad, meta) shuni ko'radi. */
const state = {
  filials: clone(INITIAL_FILIALS) as FilialState[],
  audit: initialAudit(),
  grants: new Map<number, number | null>(),
};

export const filialsState = (): readonly FilialState[] => state.filials;

export const replaceFilials = (next: FilialState[]): void => {
  state.filials = next;
};

export const auditState = (): readonly AuditRow[] => state.audit;

export const pushAudit = (row: AuditRow): void => {
  state.audit = [...state.audit, row];
};

/** Testlar uchun — har test toza holatdan boshlansin. */
export const resetStructure = (): void => {
  state.filials = clone(INITIAL_FILIALS) as FilialState[];
  state.audit = initialAudit();
  state.grants.clear();
};

/* ---------- filial natijalari (30 kunlik asos) ---------- */

/**
 * Filial natijalari operatorlardan yig'iladi (`OPERATORS`); bu yerda faqat hozir yo'ldagi zakazlar.
 * T2 — yangi filial: konversiyasi past, atkazi yuqori.
 */
export const FILIAL_BASE: Record<number, { inTransit: number }> = {
  1: { inTransit: 210 },
  2: { inTransit: 180 },
  3: { inTransit: 140 },
};

/** Filial zakazlari viloyatlar bo'yicha (vazn). Qo'qon — vodiy, Toshkent filiallari — poytaxt atrofi. */
export const REGION_WEIGHTS: Record<number, Partial<Record<RegionCode, number>>> = {
  1: {
    fargona: 30,
    namangan: 18,
    andijon: 16,
    toshkent_shahar: 6,
    toshkent: 4,
    samarqand: 6,
    qashqadaryo: 5,
    surxondaryo: 4,
    jizzax: 3,
    sirdaryo: 2,
    buxoro: 3,
    navoiy: 1,
    xorazm: 1,
    qoraqalpogiston: 1,
  },
  2: {
    toshkent_shahar: 34,
    toshkent: 20,
    samarqand: 10,
    sirdaryo: 5,
    jizzax: 5,
    fargona: 4,
    andijon: 3,
    namangan: 3,
    qashqadaryo: 5,
    surxondaryo: 3,
    buxoro: 4,
    navoiy: 2,
    xorazm: 1,
    qoraqalpogiston: 1,
  },
  3: {
    toshkent_shahar: 30,
    toshkent: 22,
    samarqand: 8,
    sirdaryo: 4,
    jizzax: 4,
    qashqadaryo: 7,
    surxondaryo: 6,
    buxoro: 6,
    navoiy: 4,
    xorazm: 4,
    qoraqalpogiston: 3,
    fargona: 1,
    andijon: 1,
  },
};

/* ---------- sklad = bosh kuryer ---------- */

export const SKLADS: readonly {
  id: number;
  name: string;
  regions: readonly RegionCode[];
  chief: { id: number; full_name: string; phone: string };
}[] = [
  {
    id: 1,
    name: "Vodiy",
    regions: ["fargona", "namangan", "andijon"],
    chief: { id: 301, full_name: "Akmal Tursunov", phone: "+998901110011" },
  },
  {
    id: 2,
    name: "Toshkent",
    regions: ["toshkent_shahar", "toshkent"],
    chief: { id: 302, full_name: "Bobur Xolmatov", phone: "+998901110022" },
  },
  {
    id: 3,
    name: "Markaz",
    regions: ["samarqand", "jizzax", "sirdaryo"],
    chief: { id: 303, full_name: "Rustam Ergashev", phone: "+998901110033" },
  },
  {
    id: 4,
    name: "Janub",
    regions: ["qashqadaryo", "surxondaryo"],
    chief: { id: 304, full_name: "Farhod Normatov", phone: "+998901110044" },
  },
  {
    id: 5,
    name: "G'arb",
    regions: ["buxoro", "navoiy", "xorazm", "qoraqalpogiston"],
    chief: { id: 305, full_name: "Sherzod Yo'ldoshev", phone: "+998901110055" },
  },
];

export const skladOfRegion = (code: RegionCode) => SKLADS.find((sklad) => sklad.regions.includes(code));

/* ---------- mahsulotlar va filial dopuski ---------- */

export const PRODUCTS: readonly { id: number; name: string; price: number; grant: number | null }[] = [
  { id: 11, name: "Gepatofit", price: 420_000, grant: 1 },
  { id: 12, name: "Kardiomed", price: 460_000, grant: 1 },
  { id: 13, name: "Artroflex", price: 390_000, grant: 1 },
  { id: 14, name: "Gastrofit", price: 380_000, grant: 1 },
  { id: 15, name: "Immunoxit", price: 450_000, grant: 2 },
  { id: 16, name: "Diabefit", price: 520_000, grant: 3 },
  { id: 17, name: "Neyrovit", price: 410_000, grant: 3 },
  { id: 18, name: "Prostavit", price: 480_000, grant: null },
];

/** Mahsulotning sotuvdagi ulushi (vazn) — zakazlar mahsulotlarga shunday bo'linadi. */
export const PRODUCT_WEIGHTS: Record<number, number> = {
  11: 22,
  12: 17,
  13: 14,
  14: 11,
  15: 13,
  16: 10,
  17: 8,
  18: 5,
};

export const productGrant = (productId: number): number | null => {
  const product = PRODUCTS.find((item) => item.id === productId);
  if (!product) return null;
  return state.grants.has(productId) ? (state.grants.get(productId) ?? null) : product.grant;
};

export const setProductGrant = (productId: number, filialId: number | null): void => {
  state.grants.set(productId, filialId);
};

/** Skladdagi qoldiq (dona): sklad × mahsulot. Janubda Kardiomed kam — AI topilmasi shunga tayanadi. */
export const STOCK: Record<number, Record<number, { qty: number; courier: number; min: number }>> = {
  1: {
    11: { qty: 640, courier: 120, min: 200 },
    12: { qty: 410, courier: 90, min: 160 },
    13: { qty: 380, courier: 70, min: 120 },
    14: { qty: 300, courier: 55, min: 100 },
    15: { qty: 120, courier: 30, min: 60 },
    16: { qty: 90, courier: 18, min: 50 },
    17: { qty: 75, courier: 12, min: 40 },
    18: { qty: 40, courier: 6, min: 30 },
  },
  2: {
    11: { qty: 520, courier: 110, min: 200 },
    12: { qty: 450, courier: 95, min: 160 },
    13: { qty: 260, courier: 60, min: 120 },
    14: { qty: 210, courier: 44, min: 100 },
    15: { qty: 380, courier: 80, min: 140 },
    16: { qty: 310, courier: 66, min: 120 },
    17: { qty: 240, courier: 40, min: 90 },
    18: { qty: 120, courier: 20, min: 50 },
  },
  3: {
    11: { qty: 260, courier: 48, min: 100 },
    12: { qty: 180, courier: 36, min: 80 },
    13: { qty: 140, courier: 25, min: 60 },
    14: { qty: 120, courier: 20, min: 50 },
    15: { qty: 95, courier: 18, min: 50 },
    16: { qty: 70, courier: 12, min: 40 },
    17: { qty: 55, courier: 10, min: 30 },
    18: { qty: 30, courier: 5, min: 20 },
  },
  4: {
    11: { qty: 150, courier: 30, min: 70 },
    12: { qty: 24, courier: 8, min: 60 },
    13: { qty: 90, courier: 16, min: 40 },
    14: { qty: 70, courier: 12, min: 35 },
    15: { qty: 60, courier: 10, min: 30 },
    16: { qty: 45, courier: 9, min: 25 },
    17: { qty: 18, courier: 4, min: 20 },
    18: { qty: 20, courier: 3, min: 15 },
  },
  5: {
    11: { qty: 190, courier: 34, min: 80 },
    12: { qty: 120, courier: 22, min: 60 },
    13: { qty: 100, courier: 18, min: 45 },
    14: { qty: 85, courier: 14, min: 40 },
    15: { qty: 70, courier: 12, min: 35 },
    16: { qty: 66, courier: 10, min: 30 },
    17: { qty: 40, courier: 7, min: 25 },
    18: { qty: 25, courier: 4, min: 15 },
  },
};

/* ---------- operatorlar (filial ichida) ---------- */

export const OPERATORS: readonly {
  id: number;
  full_name: string;
  filial: number;
  leads: number;
  sold: number;
  cancelled: number;
}[] = [
  { id: 401, full_name: "Dilnoza Karimova", filial: 1, leads: 1180, sold: 470, cancelled: 31 },
  { id: 402, full_name: "Javohir Ergashev", filial: 1, leads: 1120, sold: 390, cancelled: 36 },
  { id: 403, full_name: "Madina Ismoilova", filial: 1, leads: 1010, sold: 330, cancelled: 30 },
  { id: 404, full_name: "Shahzod Rahimov", filial: 1, leads: 980, sold: 300, cancelled: 37 },
  { id: 405, full_name: "Gulnora Tojiboyeva", filial: 1, leads: 910, sold: 270, cancelled: 26 },
  { id: 411, full_name: "Aziza Mirzayeva", filial: 2, leads: 1150, sold: 420, cancelled: 30 },
  { id: 412, full_name: "Bekzod Umarov", filial: 2, leads: 1080, sold: 360, cancelled: 33 },
  { id: 413, full_name: "Kamola Xasanova", filial: 2, leads: 1040, sold: 330, cancelled: 34 },
  { id: 414, full_name: "Doniyor Safarov", filial: 2, leads: 1030, sold: 300, cancelled: 33 },
  { id: 421, full_name: "Sevara Abdullayeva", filial: 3, leads: 1260, sold: 380, cancelled: 42 },
  { id: 422, full_name: "Ulug'bek Tursunov", filial: 3, leads: 1210, sold: 340, cancelled: 46 },
  { id: 423, full_name: "Feruza Olimova", filial: 3, leads: 1130, sold: 260, cancelled: 52 },
];

/** Filial belgisi: namunadagi `code`, bo'lmasa nomidan (backendda belgi yo'q — savol B-3). */
export const codeOf = (filial: { code: string | null; name: string }): string => shortFilialCode(filial);
