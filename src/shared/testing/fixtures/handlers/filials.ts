import { isRegionCode } from "@/shared/config/regions";

import { envelope, type MockContext } from "../engine";
import {
  PERMISSION_CATALOG,
  ROLE_DEFAULTS,
  PRODUCTS,
  REGION_NAMES,
  auditState,
  filialsState,
  productGrant,
  pushAudit,
  replaceFilials,
  setProductGrant,
  type FilialState,
  type Leader,
  type LeaderRole,
} from "../structure-v2";
import { mockResponse, type MockHandler } from "../types";
import { filialFlow, pct, selectedFilials } from "../v2-metrics";

/**
 * Owner tuzilma boshqaruvi — backend v2 §2 (`/api/owner/structure/*`) shaklida, aynan.
 * Xato kelishuvi: `{code, detail, fields?}`. Backend javoblari B-1…B-6a (2026-10-31): rahbar
 * tahriri, parol tiklash, atomar almashtirish, filial belgisi, dopusk katalogi, o'rinlar, natija.
 */

const KINDS: readonly LeaderRole[] = ["chief_operator", "chief_logist"];
const isKind = (value: unknown): value is LeaderRole => KINDS.some((kind) => kind === value);
const USERNAME = /^[\w.@+-]{3,150}$/;
const CODE_MAX = 8;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const fail = (status: number, code: string, detail: string, fields?: Record<string, unknown>) =>
  mockResponse(status, { code, detail, ...(fields ? { fields } : {}) });

/** Sukut + qo'shimcha (`effective_permissions`). */
const effectiveOf = (kind: LeaderRole, leader: Leader) => [
  ...new Set([...ROLE_DEFAULTS[kind], ...leader.permissions]),
];

/**
 * Rahbar qatori. `effective_permissions` — namuna kengaytmasi: backend structure/ da hali bermaydi
 * (savol B-26); kelmasa panel sukut huquqlarni ko'rsatmaydi.
 */
const headDto = (leader: Leader | undefined, kind: LeaderRole) =>
  leader
    ? {
        seat_id: leader.seat_id,
        full_name: leader.full_name,
        username: leader.username,
        role_id: leader.role_id,
        permissions: [...leader.permissions],
        effective_permissions: effectiveOf(kind, leader),
      }
    : null;

const filialDto = (filial: FilialState) => ({
  id: filial.id,
  code: filial.code,
  name: filial.name,
  region: filial.region,
  is_main: filial.is_main,
  is_active: filial.is_active,
  zone_id: filial.zone_id,
});

/** `structure/` qatori (B-16): `region` — kod, nomi `region_name` da. */
const structure = () => ({
  count: filialsState().length,
  results: filialsState().map((filial) => ({
    ...filialDto(filial),
    region_name: filial.region ? REGION_NAMES[filial.region] : null,
    chief_operator: headDto(filial.leaders.chief_operator, "chief_operator"),
    chief_logist: headDto(filial.leaders.chief_logist, "chief_logist"),
    departments_count: filial.counts.departments,
    operators_count: filial.counts.operators,
    logists_count: filial.counts.logists,
  })),
});

const findFilial = (ctx: MockContext): FilialState | undefined =>
  filialsState().find((filial) => filial.id === Number(ctx.params.id));

const update = (id: number, patch: (filial: FilialState) => FilialState) =>
  replaceFilials(filialsState().map((filial) => (filial.id === id ? patch(filial) : filial)));

const audit = (
  ctx: MockContext,
  action: string,
  endpoint: string,
  method: string,
  status: number,
  params: Record<string, unknown>,
) =>
  pushAudit({
    at: ctx.now.toISOString(),
    action,
    endpoint,
    method,
    status,
    params,
    user_id: 1,
    ip: "127.0.0.1",
  });

const nameTaken = (name: string, selfId: number | null) =>
  filialsState().some((filial) => filial.id !== selfId && filial.name.toLowerCase() === name.toLowerCase());

/** Belgi faollar orasida noyob (B-3). */
const codeTaken = (code: string, selfId: number | null) =>
  filialsState().some(
    (filial) => filial.id !== selfId && filial.is_active && filial.code?.toLowerCase() === code.toLowerCase(),
  );

/** `code`: yo'q — o'zgarmaydi, bo'sh/null — olib tashlanadi, satr — 8 belgigacha. */
const readCode = (value: unknown): { code: string | null | undefined } | { error: string } => {
  if (value === undefined) return { code: undefined };
  if (value === null || value === "") return { code: null };
  if (typeof value !== "string" || value.trim().length > CODE_MAX) return { error: "8 belgigacha" };
  return { code: value.trim() };
};

const createFilial = (ctx: MockContext) => {
  const body = isRecord(ctx.body) ? ctx.body : {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const region = body.region;
  if (name.length < 2) return fail(400, "validation_error", "Nom majburiy", { name: ["Nom majburiy"] });
  if (region !== undefined && region !== null && (typeof region !== "string" || !isRegionCode(region)))
    return fail(400, "validation_error", "Viloyat noto'g'ri", { region: ["Viloyat noto'g'ri"] });
  if (nameTaken(name, null)) return fail(409, "filial_name_taken", "Bu nomli filial bor");
  const code = readCode(body.code);
  if ("error" in code) return fail(400, "validation_error", "Belgi noto'g'ri", { code: [code.error] });
  if (code.code && codeTaken(code.code, null)) return fail(409, "code_taken", "Bu belgi band");
  const id = Math.max(0, ...filialsState().map((filial) => filial.id)) + 1;
  const filial: FilialState = {
    id,
    code: code.code ?? null,
    name,
    region: typeof region === "string" && isRegionCode(region) ? region : null,
    is_main: false,
    is_active: true,
    zone_id: id,
    created_at: ctx.today,
    leaders: {},
    seats: [],
    counts: { departments: 2, operators: 0, logists: 0 },
  };
  replaceFilials([...filialsState(), filial]);
  audit(ctx, "structure.filial.create", "/api/owner/structure/filials/", "POST", 201, {
    filial_id: id,
    name,
  });
  return mockResponse(201, filialDto(filial));
};

const patchFilial = (ctx: MockContext) => {
  const filial = findFilial(ctx);
  if (!filial) return fail(404, "filial_not_found", "Filial topilmadi");
  const body = isRecord(ctx.body) ? ctx.body : {};
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const isActive = typeof body.is_active === "boolean" ? body.is_active : undefined;
  const code = readCode(body.code);
  if ("error" in code) return fail(400, "validation_error", "Belgi noto'g'ri", { code: [code.error] });
  if (name === undefined && isActive === undefined && code.code === undefined)
    return fail(400, "validation_error", "Kamida bitta maydon");
  if (name !== undefined && name.length < 2)
    return fail(400, "validation_error", "Nom majburiy", { name: ["Nom majburiy"] });
  if (name !== undefined && nameTaken(name, filial.id))
    return fail(409, "filial_name_taken", "Bu nomli filial bor");
  if (code.code && codeTaken(code.code, filial.id)) return fail(409, "code_taken", "Bu belgi band");
  update(filial.id, (item) => ({
    ...item,
    name: name ?? item.name,
    is_active: isActive ?? item.is_active,
    code: code.code === undefined ? item.code : code.code,
  }));
  audit(ctx, "structure.filial.update", `/api/owner/structure/filials/${filial.id}/`, "PATCH", 200, {
    filial_id: filial.id,
  });
  const next = filialsState().find((item) => item.id === filial.id);
  return next ? filialDto(next) : fail(404, "filial_not_found", "Filial topilmadi");
};

/** Asosiy filial doim bitta. Rol qatorlari o'zgarmaydi — huquq `is_main` dan hisoblanadi (§2.4). */
const setMain = (ctx: MockContext) => {
  const filial = findFilial(ctx);
  if (!filial) return fail(404, "filial_not_found", "Filial topilmadi");
  if (!filial.is_active) return fail(409, "filial_inactive", "Nofaol filial asosiy bo'lolmaydi");
  replaceFilials(filialsState().map((item) => ({ ...item, is_main: item.id === filial.id })));
  audit(
    ctx,
    "structure.filial.set_main",
    `/api/owner/structure/filials/${filial.id}/set-main/`,
    "POST",
    200,
    {
      filial_id: filial.id,
    },
  );
  return { ...filialDto(filial), is_main: true };
};

let roleSeq = 900;
let seatSeq = 800;

const roleDto = (filialId: number, kind: LeaderRole, leader: Leader) => ({
  id: leader.role_id,
  role: kind,
  scope_kind: "filial",
  scope_id: String(filialId),
  permissions: [...leader.permissions],
  effective_permissions: effectiveOf(kind, leader),
  since: leader.since,
  until: null,
});

const validPermissions = (value: unknown): string[] | null => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((key) => typeof key !== "string")) return null;
  const keys = value as string[];
  return keys.every((key) => PERMISSION_CATALOG.some((item) => item.key === key)) ? [...new Set(keys)] : null;
};

const usernameTaken = (username: string, exceptSeat: number | null = null) =>
  filialsState().some(
    (item) =>
      item.seats.some((other) => other.username === username && other.seat_id !== exceptSeat) ||
      Object.values(item.leaders).some(
        (leader) => leader.username === username && leader.seat_id !== exceptSeat,
      ),
  );

/** Demo paroli: tiklash va parolsiz almashtirishda backend o'zi yaratadi. */
const generatedPassword = (seed: number) => `Mg${seed}x${(seed * 7919) % 10_000}`;

type Person =
  | { seat: { seat_id: number; full_name: string; username: string }; password: string | undefined }
  | { response: ReturnType<typeof fail> };

/**
 * Kim tayinlanadi: mavjud o'rin (`seat_id`) yoki yangi akkaunt (`full_name`, `username`, `password`).
 * `requirePassword: false` — almashtirishda parol ixtiyoriy, bo'lmasa backend yaratadi (B-2).
 */
const resolvePerson = (
  filial: FilialState,
  body: Record<string, unknown>,
  requirePassword: boolean,
): Person => {
  if (body.seat_id !== undefined) {
    const seatId = Number(body.seat_id);
    const own = filial.seats.find((item) => item.seat_id === seatId);
    if (own) return { seat: own, password: undefined };
    const elsewhere = filialsState().some((item) => item.seats.some((other) => other.seat_id === seatId));
    return {
      response: elsewhere
        ? fail(400, "seat_wrong_filial", "O'rin boshqa filialda")
        : fail(404, "seat_not_found", "O'rin topilmadi"),
    };
  }
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const pass = typeof body.password === "string" ? body.password : "";
  const fields: Record<string, string[]> = {};
  if (fullName.length < 3) fields.full_name = ["F.I.Sh. majburiy"];
  if (!USERNAME.test(username)) fields.username = ["Login noto'g'ri"];
  if ((requirePassword || pass !== "") && pass.length < 8) fields.password = ["Kamida 8 belgi"];
  if (Object.keys(fields).length > 0)
    return { response: fail(400, "validation_error", "Maydonlar noto'g'ri", fields) };
  if (usernameTaken(username)) return { response: fail(409, "username_taken", "Bu login band") };
  seatSeq += 1;
  return {
    seat: { seat_id: seatSeq, full_name: fullName, username },
    password: pass === "" ? generatedPassword(seatSeq) : pass,
  };
};

/** Ikki rejim: mavjud o'rinni ko'tarish (`seat_id`) yoki yangi o'rin + akkaunt (§2.5). */
const appointHead = (ctx: MockContext) => {
  const filial = findFilial(ctx);
  if (!filial) return fail(404, "filial_not_found", "Filial topilmadi");
  const body = isRecord(ctx.body) ? ctx.body : {};
  if (!isKind(body.kind))
    return fail(400, "validation_error", "kind noto'g'ri", { kind: ["chief_operator | chief_logist"] });
  const kind = body.kind;
  const permissions = validPermissions(body.permissions);
  if (permissions === null)
    return fail(400, "validation_error", "Noma'lum dopusk", { permissions: ["katalogda yo'q"] });
  if (filial.leaders[kind]) return fail(409, "role_exists", "Bu filialda bunday rahbar bor");

  const person = resolvePerson(filial, body, true);
  if ("response" in person) return person.response;
  const { seat, password } = person;

  const leader: Leader = { ...seat, role_id: (roleSeq += 1), permissions, since: ctx.now.toISOString() };
  update(filial.id, (item) => ({
    ...item,
    leaders: { ...item.leaders, [kind]: leader },
    seats: item.seats.filter((other) => other.seat_id !== seat.seat_id),
  }));
  audit(ctx, "structure.head.appoint", `/api/owner/structure/filials/${filial.id}/heads/`, "POST", 201, {
    filial_id: filial.id,
    kind,
    seat_id: leader.seat_id,
    role_id: leader.role_id,
    full_name: leader.full_name,
    created: password !== undefined,
  });
  return mockResponse(201, {
    filial_id: filial.id,
    kind,
    head: headDto(leader, kind),
    role: roleDto(filial.id, kind, leader),
    ...(password !== undefined ? { password } : {}),
  });
};

/** Rahbar ROLI olinadi, o'rin va akkaunt qoladi (§2.6). */
const revokeHead = (ctx: MockContext) => {
  const filial = findFilial(ctx);
  if (!filial) return fail(404, "filial_not_found", "Filial topilmadi");
  const kind = ctx.params.kind;
  if (!isKind(kind)) return fail(400, "validation_error", "kind noto'g'ri");
  const leader = filial.leaders[kind];
  if (!leader) return fail(404, "head_not_found", "Rahbar topilmadi");
  update(filial.id, (item) => {
    const leaders = { ...item.leaders };
    delete leaders[kind];
    return {
      ...item,
      leaders,
      seats: [
        ...item.seats,
        { seat_id: leader.seat_id, full_name: leader.full_name, username: leader.username },
      ],
    };
  });
  audit(
    ctx,
    "structure.head.revoke",
    `/api/owner/structure/filials/${filial.id}/heads/${kind}/`,
    "DELETE",
    200,
    {
      filial_id: filial.id,
      kind,
      seat_id: leader.seat_id,
      role_id: leader.role_id,
      full_name: leader.full_name,
    },
  );
  return { revoked: 1, seat_id: leader.seat_id };
};

const leaderOf = (ctx: MockContext) => {
  const filial = findFilial(ctx);
  if (!filial) return { response: fail(404, "filial_not_found", "Filial topilmadi") };
  const kind = ctx.params.kind;
  if (!isKind(kind)) return { response: fail(400, "validation_error", "kind noto'g'ri") };
  const leader = filial.leaders[kind];
  if (!leader) return { response: fail(404, "head_not_found", "Rahbar topilmadi") };
  return { filial, kind, leader };
};

const headPath = (filialId: number, kind: LeaderRole, tail = "") =>
  `/api/owner/structure/filials/${filialId}/heads/${kind}/${tail}`;

/** Ism va login tahriri; telefon tahrirlanmaydi (B-1). */
const patchHead = (ctx: MockContext) => {
  const found = leaderOf(ctx);
  if ("response" in found) return found.response;
  const { filial, kind, leader } = found;
  const body = isRecord(ctx.body) ? ctx.body : {};
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : undefined;
  const username = typeof body.username === "string" ? body.username.trim() : undefined;
  const fields: Record<string, string[]> = {};
  if (fullName !== undefined && fullName.length < 3) fields.full_name = ["F.I.Sh. majburiy"];
  if (username !== undefined && !USERNAME.test(username)) fields.username = ["Login noto'g'ri"];
  if (Object.keys(fields).length > 0) return fail(400, "validation_error", "Maydonlar noto'g'ri", fields);
  if (username !== undefined && usernameTaken(username, leader.seat_id))
    return fail(409, "username_taken", "Bu login band");
  const next = { ...leader, full_name: fullName ?? leader.full_name, username: username ?? leader.username };
  update(filial.id, (item) => ({ ...item, leaders: { ...item.leaders, [kind]: next } }));
  audit(ctx, "structure.head.update", headPath(filial.id, kind), "PATCH", 200, {
    filial_id: filial.id,
    kind,
    seat_id: leader.seat_id,
    full_name: next.full_name,
  });
  return { filial_id: filial.id, kind, head: headDto(next, kind) };
};

/** Yangi parol BIR MARTA qaytadi, auditga tushmaydi (B-2). */
const resetPassword = (ctx: MockContext) => {
  const found = leaderOf(ctx);
  if ("response" in found) return found.response;
  const { filial, kind, leader } = found;
  audit(ctx, "structure.head.reset_password", headPath(filial.id, kind, "reset-password/"), "POST", 200, {
    filial_id: filial.id,
    kind,
    seat_id: leader.seat_id,
    full_name: leader.full_name,
  });
  return { seat_id: leader.seat_id, username: leader.username, password: generatedPassword(leader.seat_id) };
};

/** Atomar almashtirish: dopusklar yangi odamga ko'chadi, eski akkaunt oddiy o'rin bo'lib qoladi (B-2). */
const replaceHead = (ctx: MockContext) => {
  const found = leaderOf(ctx);
  if ("response" in found) return found.response;
  const { filial, kind, leader } = found;
  const body = isRecord(ctx.body) ? ctx.body : {};
  const person = resolvePerson(filial, body, false);
  if ("response" in person) return person.response;
  const next: Leader = {
    ...person.seat,
    role_id: (roleSeq += 1),
    permissions: [...leader.permissions],
    since: ctx.now.toISOString(),
  };
  update(filial.id, (item) => ({
    ...item,
    leaders: { ...item.leaders, [kind]: next },
    seats: [
      ...item.seats.filter((other) => other.seat_id !== next.seat_id),
      { seat_id: leader.seat_id, full_name: leader.full_name, username: leader.username },
    ],
  }));
  audit(ctx, "structure.head.replace", headPath(filial.id, kind, "replace/"), "POST", 200, {
    filial_id: filial.id,
    kind,
    seat_id: next.seat_id,
    previous_seat_id: leader.seat_id,
    full_name: next.full_name,
  });
  return {
    filial_id: filial.id,
    kind,
    head: headDto(next, kind),
    role: roleDto(filial.id, kind, next),
    ...(person.password !== undefined ? { password: person.password } : {}),
  };
};

/** Filialdagi o'rinlar — rahbar tayinlash uchun qidiruv (B-5). */
const seats = (ctx: MockContext) => {
  const filial = findFilial(ctx);
  if (!filial) return fail(404, "filial_not_found", "Filial topilmadi");
  const q = (ctx.searchParams.get("q") ?? "").trim().toLowerCase();
  const rows = filial.seats
    .filter((seat) => q === "" || `${seat.full_name} ${seat.username}`.toLowerCase().includes(q))
    .map((seat) => ({
      seat_id: seat.seat_id,
      full_name: seat.full_name,
      username: seat.username,
      department: seat.department ?? null,
      is_admin: false,
      is_logist: seat.username.endsWith("_l"),
      roles: [],
    }));
  return { count: rows.length, results: rows };
};

/** Rolning qo'shimcha dopusklarini TO'LIQ almashtiradi; owner uchun ship yo'q (§2.7). */
const patchRole = (ctx: MockContext) => {
  const roleId = Number(ctx.params.id);
  const owner = filialsState()
    .flatMap((filial) =>
      KINDS.flatMap((kind) => {
        const leader = filial.leaders[kind];
        return leader && leader.role_id === roleId ? [{ filial, kind, leader }] : [];
      }),
    )
    .at(0);
  if (!owner) return fail(404, "role_not_found", "Rol topilmadi");
  const body = isRecord(ctx.body) ? ctx.body : {};
  const permissions = validPermissions(body.permissions);
  if (permissions === null || body.permissions === undefined)
    return fail(400, "validation_error", "Noma'lum dopusk", { permissions: ["katalogda yo'q"] });
  const leader = { ...owner.leader, permissions };
  update(owner.filial.id, (item) => ({ ...item, leaders: { ...item.leaders, [owner.kind]: leader } }));
  audit(ctx, "structure.role.permissions", `/api/owner/structure/roles/${roleId}/`, "PATCH", 200, {
    role_id: roleId,
    filial_id: owner.filial.id,
    kind: owner.kind,
  });
  return roleDto(owner.filial.id, owner.kind, leader);
};

const auditList = (ctx: MockContext) => {
  const limit = Math.min(200, Math.max(1, Number(ctx.searchParams.get("limit")) || 50));
  const rows = [...auditState()].sort((a, b) => b.at.localeCompare(a.at));
  return { count: rows.length, results: rows.slice(0, limit).map((row) => structuredClone(row)) };
};

/* ---------- sklad dopuski (§2.9) ---------- */

const grantsOf = (filialId: number) =>
  PRODUCTS.filter((product) => productGrant(product.id) === filialId).map((product) => ({
    id: 1000 + product.id,
    product_id: product.id,
    product_name: product.name,
    granted_at: "2026-10-30T05:00:00Z",
    note: "owner panel",
  }));

const getGrants = (ctx: MockContext) => {
  const filial = findFilial(ctx);
  if (!filial) return fail(404, "filial_not_found", "Filial topilmadi");
  return { filial_id: filial.id, items: grantsOf(filial.id) };
};

/** Filial dopusk TO'PLAMINI almashtiradi; boshqa filialdagi mahsulot — `409 grant_conflict`. */
const putGrants = (ctx: MockContext) => {
  const filial = findFilial(ctx);
  if (!filial) return fail(404, "filial_not_found", "Filial topilmadi");
  const body = isRecord(ctx.body) ? ctx.body : {};
  if (!Array.isArray(body.item_ids) || body.item_ids.some((id) => typeof id !== "number"))
    return fail(400, "validation_error", "item_ids massiv bo'lsin");
  const wanted = [...new Set(body.item_ids as number[])];
  for (const id of wanted) {
    const product = PRODUCTS.find((item) => item.id === id);
    if (!product) return fail(400, "validation_error", "Mahsulot topilmadi", { item_ids: [id] });
    const holder = productGrant(id);
    if (holder !== null && holder !== filial.id) {
      const other = filialsState().find((item) => item.id === holder);
      return fail(
        409,
        "grant_conflict",
        `«${product.name}» allaqachon «${other?.name ?? holder}» filialida — bitta mahsulot bitta filialga`,
        { filial: holder },
      );
    }
  }
  const current = grantsOf(filial.id).map((grant) => grant.product_id);
  const granted = wanted.filter((id) => !current.includes(id));
  const revoked = current.filter((id) => !wanted.includes(id));
  for (const id of granted) setProductGrant(id, filial.id);
  for (const id of revoked) setProductGrant(id, null);
  audit(ctx, "structure.sklad_grants.set", `/api/owner/structure/sklad-grants/${filial.id}/`, "PUT", 200, {
    filial_id: filial.id,
    granted,
    revoked,
  });
  return { filial_id: filial.id, granted, revoked, item_ids: wanted };
};

/** Dopusk katalogi (B-4). */
const catalog = () => ({
  count: PERMISSION_CATALOG.length,
  results: PERMISSION_CATALOG.map((item) => ({ ...item })),
});

/** Filiallar natijasi (B-6) — davr bo'yicha (global filial filtri amal qiladi). Aniq shakl hujjatda yo'q. */
const performance = (ctx: MockContext) =>
  envelope(ctx, {
    labels: ctx.period.labels,
    filials: selectedFilials(ctx).map((filial) => {
      const flow = filialFlow(ctx, filial.id);
      return {
        filial_id: filial.id,
        leads: flow.leads,
        sold: flow.sold,
        in_transit: flow.inTransit,
        delivered: flow.delivered,
        cancelled: flow.cancelled,
        revenue: flow.revenue,
        conversion_pct: pct(flow.leadSold, flow.leads),
        cancel_rate_pct: pct(flow.cancelled, flow.sold),
        trend: ctx.series(flow.sold, 70 + filial.id),
      };
    }),
  });

export const filialsHandlers: MockHandler[] = [
  { method: "GET", path: "structure/", resolve: structure },
  { method: "POST", path: "structure/filials/", resolve: createFilial },
  { method: "PATCH", path: "structure/filials/:id/", resolve: patchFilial },
  { method: "POST", path: "structure/filials/:id/set-main/", resolve: setMain },
  { method: "POST", path: "structure/filials/:id/heads/", resolve: appointHead },
  { method: "DELETE", path: "structure/filials/:id/heads/:kind/", resolve: revokeHead },
  { method: "PATCH", path: "structure/filials/:id/heads/:kind/", resolve: patchHead },
  { method: "POST", path: "structure/filials/:id/heads/:kind/reset-password/", resolve: resetPassword },
  { method: "POST", path: "structure/filials/:id/heads/:kind/replace/", resolve: replaceHead },
  { method: "GET", path: "structure/filials/:id/seats/", resolve: seats },
  { method: "PATCH", path: "structure/roles/:id/", resolve: patchRole },
  { method: "GET", path: "structure/audit/", resolve: auditList },
  { method: "GET", path: "structure/sklad-grants/:id/", resolve: getGrants },
  { method: "PUT", path: "structure/sklad-grants/:id/", resolve: putGrants },
  { method: "GET", path: "structure/permissions/", resolve: catalog },
  { method: "GET", path: "filials/performance/", resolve: performance },
];
