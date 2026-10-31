import { parseJson, type Envelope } from "@/shared/lib/envelope";
import { apiGet, apiSend, type QueryParams } from "@/shared/lib/http";
import { parseFlexible } from "@/shared/lib/lenient";

import {
  appointResultSchema,
  auditSchema,
  catalogSchema,
  filialObjectSchema,
  headUpdateResultSchema,
  performanceSchema,
  replaceResultSchema,
  resetPasswordResultSchema,
  revokeResultSchema,
  roleResultSchema,
  seatsSchema,
  structureSchema,
  type AccountFormValues,
  type AppointResult,
  type AuditEntry,
  type FilialCreateValues,
  type FilialEditValues,
  type HeadEditValues,
  type LeaderRole,
  type Performance,
  type Permission,
  type ReplaceResult,
  type SeatOption,
  type Structure,
} from "../model/filials.schema";

/** Backend v2 §2 — `/api/owner/structure/*`. */

export const loadStructure = async (): Promise<Structure> =>
  parseJson(structureSchema, await apiGet("structure/"));

export const AUDIT_LIMIT = 50;

export const loadAudit = async (): Promise<AuditEntry[]> =>
  parseJson(auditSchema, await apiGet("structure/audit/", { limit: AUDIT_LIMIT })).results;

/** Dopusk katalogi (B-4). */
export const loadCatalog = async (): Promise<Permission[]> =>
  parseJson(catalogSchema, await apiGet("structure/permissions/"));

/** Filialdagi o'rinlar — rahbar tayinlash uchun qidiruv (B-5). */
export const loadSeats = async (filialId: number, q: string): Promise<SeatOption[]> =>
  parseJson(seatsSchema, await apiGet(`structure/filials/${filialId}/seats/`, { q: q.trim() || undefined }));

/** Filial natijasi (B-6) — konvert yoki yalang' javob. */
export const loadPerformance = async (params: QueryParams): Promise<Envelope<Performance>> =>
  parseFlexible(performanceSchema, await apiGet("filials/performance/", params));

export const createFilial = async (values: FilialCreateValues) =>
  parseJson(
    filialObjectSchema,
    await apiSend("post", "structure/filials/", {
      name: values.name.trim(),
      ...(values.code ? { code: values.code } : {}),
      ...(values.region ? { region: values.region } : {}),
    }),
  );

export const updateFilial = async ({ id, values }: { id: number; values: FilialEditValues }) =>
  parseJson(
    filialObjectSchema,
    await apiSend("patch", `structure/filials/${id}/`, {
      name: values.name.trim(),
      code: values.code === "" ? null : values.code,
      is_active: values.isActive,
    }),
  );

export const setMainFilial = async (id: number) =>
  parseJson(filialObjectSchema, await apiSend("post", `structure/filials/${id}/set-main/`));

type Person = { mode: "account"; account: AccountFormValues } | { mode: "seat"; seatId: number };
type Appoint = { filialId: number; kind: LeaderRole; permissions: string[] } & Person;
type HeadRef = { filialId: number; kind: LeaderRole };

const personBody = (person: Person) =>
  person.mode === "seat"
    ? { seat_id: person.seatId }
    : {
        full_name: person.account.fullName.trim(),
        username: person.account.username.trim(),
        // almashtirishda parol ixtiyoriy — bo'sh bo'lsa yuborilmaydi, backend yaratadi
        ...(person.account.password ? { password: person.account.password } : {}),
      };

const headPath = ({ filialId, kind }: HeadRef, tail = "") =>
  `structure/filials/${filialId}/heads/${kind}/${tail}`;

/** Rahbar tayinlash: mavjud o'rin yoki yangi akkaunt (§2.5). Yangi akkauntda parol bir marta keladi. */
export const appointHead = async (input: Appoint): Promise<AppointResult> =>
  parseJson(
    appointResultSchema,
    await apiSend("post", `structure/filials/${input.filialId}/heads/`, {
      kind: input.kind,
      permissions: input.permissions,
      ...personBody(input),
    }),
  );

/** Rahbar ismi va logini (B-1); `409 username_taken`. */
export const updateHead = async ({ values, ...ref }: HeadRef & { values: HeadEditValues }) =>
  parseJson(
    headUpdateResultSchema,
    await apiSend("patch", headPath(ref), {
      full_name: values.fullName.trim(),
      username: values.username.trim(),
    }),
  );

/** Yangi parol BIR MARTA qaytadi (B-2). */
export const resetHeadPassword = async (ref: HeadRef) =>
  parseJson(resetPasswordResultSchema, await apiSend("post", headPath(ref, "reset-password/")));

/** Atomar almashtirish (B-2): dopusklar ko'chadi, eski akkaunt qoladi. */
export const replaceHead = async ({ person, ...ref }: HeadRef & { person: Person }): Promise<ReplaceResult> =>
  parseJson(replaceResultSchema, await apiSend("post", headPath(ref, "replace/"), personBody(person)));

/** Rahbar ROLI olinadi — o'rin va akkaunt qoladi (§2.6). */
export const revokeHead = async (ref: HeadRef) =>
  parseJson(revokeResultSchema, await apiSend("delete", headPath(ref)));

/** Rolning qo'shimcha dopusklari to'liq almashadi (§2.7). */
export const setRolePermissions = async ({
  roleId,
  permissions,
}: {
  roleId: number;
  permissions: string[];
}) => parseJson(roleResultSchema, await apiSend("patch", `structure/roles/${roleId}/`, { permissions }));
