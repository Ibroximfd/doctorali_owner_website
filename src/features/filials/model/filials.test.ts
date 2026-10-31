import { afterEach, describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { parseFlexible } from "@/shared/lib/lenient";
import { resetStructure } from "@/shared/testing/fixtures/structure-v2";
import { SCOPE_CASES, mockGet, mockSend } from "@/shared/testing/mock-api";

import {
  auditFor,
  leaderOf,
  grantableKeys,
  groupKey,
  permissionDiff,
  permissionGroups,
  permissionLabel,
  roleDefaults,
  sortFilials,
  togglePermission,
} from "./filials.rules";
import {
  accountFormSchema,
  appointResultSchema,
  auditSchema,
  catalogSchema,
  filialCreateSchema,
  performanceSchema,
  replaceAccountSchema,
  replaceResultSchema,
  resetPasswordResultSchema,
  seatsSchema,
  structureSchema,
} from "./filials.schema";

const structure = () => parseJson(structureSchema, mockGet("structure/"));
const filialOf = (name: string) => {
  const filial = structure().results.find((item) => item.name === name);
  if (!filial) throw new Error(name);
  return filial;
};

describe("owner structure contract (backend v2 §2)", () => {
  afterEach(() => resetStructure());

  it("lists filials with B.O and B.L heads — Qo'qon is main", () => {
    const { results } = structure();
    expect(results.map((filial) => filial.name)).toEqual(["Qo'qon", "Toshkent 1", "Toshkent 2"]);
    expect(results.filter((filial) => filial.isMain).map((filial) => filial.name)).toEqual(["Qo'qon"]);
    expect(leaderOf(filialOf("Qo'qon"), "chief_logist")).toMatchObject({ username: "sardor_bl" });
  });

  it.each(SCOPE_CASES)("performance matches its schema for %o", (query) => {
    expect(() => parseFlexible(performanceSchema, mockGet("filials/performance/", query))).not.toThrow();
  });

  it("reads performance with other field names and a bare list", () => {
    const parsed = parseFlexible(performanceSchema, [
      {
        id: 1,
        leads: "40",
        sold: 12,
        in_transit: 3,
        delivered: 8,
        otkaz: 1,
        revenue: "100.00",
        trend: [{ date: "d", sold: 2 }],
      },
    ]).data;
    expect(parsed.filials[0]).toMatchObject({
      filialId: 1,
      leads: 40,
      inTransit: 3,
      cancelled: 1,
      revenue: 100,
      trend: [2],
    });
    expect(parsed.filials[0]?.conversionPct).toBeNull();
  });

  it("sets and checks the filial code (B-3)", () => {
    expect(mockSend("POST", "structure/filials/", { name: "Toshkent 3", code: "T1" })).toMatchObject({
      status: 409,
      json: { code: "code_taken" },
    });
    expect(mockSend("PATCH", "structure/filials/3/", { code: "T3" }).status).toBe(200);
    expect(filialOf("Toshkent 2").code).toBe("T3");
  });

  it("edits a head, resets the password once and replaces atomically (B-1, B-2)", () => {
    expect(
      mockSend("PATCH", "structure/filials/2/heads/chief_logist/", { username: "sardor_bl" }),
    ).toMatchObject({ status: 409, json: { code: "username_taken" } });
    expect(
      mockSend("PATCH", "structure/filials/2/heads/chief_logist/", { full_name: "Jahongir Nazarov Jr" })
        .status,
    ).toBe(200);
    expect(leaderOf(filialOf("Toshkent 1"), "chief_logist")?.fullName).toBe("Jahongir Nazarov Jr");

    const reset = parseJson(
      resetPasswordResultSchema,
      mockSend("POST", "structure/filials/2/heads/chief_logist/reset-password/").json,
    );
    expect(reset.password.length).toBeGreaterThanOrEqual(8);
    expect(JSON.stringify(mockGet("structure/audit/"))).not.toContain(reset.password);

    const before = leaderOf(filialOf("Toshkent 1"), "chief_logist")?.permissions;
    const replaced = parseJson(
      replaceResultSchema,
      mockSend("POST", "structure/filials/2/heads/chief_logist/replace/", { seat_id: 208 }).json,
    );
    expect(replaced.head?.seatId).toBe(208);
    expect(replaced.password).toBeUndefined();
    expect(leaderOf(filialOf("Toshkent 1"), "chief_logist")?.permissions).toEqual(before);
  });

  it("searches the filial's seats (B-5)", () => {
    const all = parseJson(seatsSchema, mockGet("structure/filials/1/seats/"));
    expect(all.map((seat) => seat.seatId)).toEqual([207, 209]);
    const found = parseJson(seatsSchema, mockGet("structure/filials/1/seats/", { q: "nodir" }));
    expect(found).toMatchObject([{ seatId: 207, department: "Baza-1" }]);
  });

  it("creates a filial, refuses a taken name and an inactive main", () => {
    expect(mockSend("POST", "structure/filials/", { name: "Toshkent 3", region: "toshkent" }).status).toBe(
      201,
    );
    expect(mockSend("POST", "structure/filials/", { name: "Qo'qon" })).toMatchObject({
      status: 409,
      json: { code: "filial_name_taken" },
    });
    expect(mockSend("PATCH", "structure/filials/3/", { is_active: false }).status).toBe(200);
    expect(mockSend("POST", "structure/filials/3/set-main/")).toMatchObject({
      status: 409,
      json: { code: "filial_inactive" },
    });
    expect(mockSend("POST", "structure/filials/2/set-main/").status).toBe(200);
    expect(
      structure()
        .results.filter((filial) => filial.isMain)
        .map((filial) => filial.id),
    ).toEqual([2]);
  });

  it("appoints a new account once — the password comes back only in that answer", () => {
    expect(mockSend("DELETE", "structure/filials/3/heads/chief_logist/")).toMatchObject({
      status: 200,
      json: { revoked: 1, seat_id: 205 },
    });
    const response = mockSend("POST", "structure/filials/3/heads/", {
      kind: "chief_logist",
      full_name: "Olim Karimov",
      username: "olim_bl",
      password: "Olim2026x",
      permissions: ["cash.accept"],
    });
    expect(response.status).toBe(201);
    const result = parseJson(appointResultSchema, response.json);
    expect(result.password).toBe("Olim2026x");
    expect(JSON.stringify(mockGet("structure/"))).not.toContain("Olim2026x");
    expect(JSON.stringify(mockGet("structure/audit/"))).not.toContain("Olim2026x");
  });

  it("keeps one head of each kind and checks the seat belongs to the filial", () => {
    expect(
      mockSend("POST", "structure/filials/1/heads/", { kind: "chief_logist", seat_id: 207 }),
    ).toMatchObject({
      status: 409,
      json: { code: "role_exists" },
    });
    mockSend("DELETE", "structure/filials/1/heads/chief_logist/");
    expect(
      mockSend("POST", "structure/filials/1/heads/", { kind: "chief_logist", seat_id: 208 }),
    ).toMatchObject({
      status: 400,
      json: { code: "seat_wrong_filial" },
    });
    expect(
      mockSend("POST", "structure/filials/1/heads/", { kind: "chief_logist", seat_id: 207 }).status,
    ).toBe(201);
  });

  it("replaces a role's permissions in full and writes everything to the audit", () => {
    const roleId = leaderOf(filialOf("Toshkent 1"), "chief_operator")?.roleId ?? 0;
    expect(mockSend("PATCH", `structure/roles/${roleId}/`, { permissions: [] }).status).toBe(200);
    expect(leaderOf(filialOf("Toshkent 1"), "chief_operator")?.permissions).toEqual([]);
    expect(mockSend("PATCH", `structure/roles/${roleId}/`, { permissions: ["nope"] }).status).toBe(400);
    const audit = parseJson(auditSchema, mockGet("structure/audit/", { limit: "10" })).results;
    expect(audit[0]?.action).toBe("structure.role.permissions");
    expect(auditFor(audit, 2, "chief_operator").length).toBeGreaterThan(0);
  });

  it("gives a product to one filial only — grant_conflict names the other filial", () => {
    const conflict = mockSend("PUT", "structure/sklad-grants/2/", { item_ids: [11] });
    expect(conflict).toMatchObject({ status: 409, json: { code: "grant_conflict", fields: { filial: 1 } } });
    expect(mockSend("PUT", "structure/sklad-grants/2/", { item_ids: [15, 18] })).toMatchObject({
      status: 200,
      json: { granted: [18], revoked: [] },
    });
  });
});

describe("filials rules", () => {
  const catalog = parseJson(catalogSchema, mockGet("structure/permissions/"));

  it("groups rights do · see · manage from the backend words, in that order", () => {
    const groups = permissionGroups(catalog, "chief_logist", false);
    expect(groups.map((group) => group.group)).toEqual(["do", "see", "manage"]);
    expect(groupKey("Ko’radi")).toBe("see");
    expect(groupKey(null)).toBe("other");
    expect(togglePermission(["a"], "a")).toEqual([]);
  });

  it("disables main-only rights on an ordinary filial and keeps role defaults out of the extras", () => {
    const mainOnly = [
      {
        key: "rate.set",
        label: "Narx",
        labelRu: "Цена",
        role: "chief_logist",
        group: "boshqaradi",
        mainOnly: true,
      },
      {
        key: "cash.accept",
        label: "Kassa",
        labelRu: "Касса",
        role: "both",
        group: "qila oladi",
        mainOnly: false,
      },
    ];
    const items = permissionGroups(mainOnly, "chief_logist", false).flatMap((group) => group.items);
    expect(items.find((item) => item.permission.key === "rate.set")?.disabled).toBe(true);
    expect(grantableKeys(mainOnly, "chief_logist", false, [])).toEqual(["cash.accept"]);
    expect(grantableKeys(mainOnly, "chief_logist", true, ["cash.accept"])).toEqual(["rate.set"]);
    expect(roleDefaults({ permissions: ["a"], effectivePermissions: ["a", "b"] })).toEqual(["b"]);
    expect(roleDefaults({ permissions: ["a"], effectivePermissions: null })).toEqual([]);
    expect(permissionDiff(["a", "b"], ["b", "c"])).toEqual({ added: ["c"], removed: ["a"] });
  });

  it("shows `both` rights to either head, labels in the current language", () => {
    const keys = (role: "chief_logist" | "chief_operator") =>
      permissionGroups(catalog, role, true).flatMap((group) =>
        group.items.map((item) => item.permission.key),
      );
    expect(keys("chief_logist")).toContain("export.stats");
    expect(keys("chief_operator")).toContain("export.stats");
    expect(keys("chief_operator")).not.toContain("cash.accept");
    expect(permissionLabel(catalog, "cash.accept", "ru")).toBe("Касса (приём от курьера)");
    expect(permissionLabel(catalog, "unknown.key", "uz")).toBe("unknown.key");
  });

  it("reads the catalog as a bare array too, label_ru falling back to label", () => {
    const bare = parseJson(catalogSchema, [{ key: "a.b", label: "A", role: "both", group: null }]);
    expect(bare[0]).toMatchObject({ key: "a.b", labelRu: "A", mainOnly: false, group: null });
  });

  it("puts the main filial first and inactive ones last", () => {
    const rows = [
      { id: 1, isMain: false, isActive: false },
      { id: 2, isMain: false, isActive: true },
      { id: 3, isMain: true, isActive: true },
    ];
    expect(sortFilials(rows).map((row) => row.id)).toEqual([3, 2, 1]);
  });

  it("validates the forms", () => {
    expect(filialCreateSchema.safeParse({ name: "T", code: "", region: "" }).success).toBe(false);
    expect(filialCreateSchema.safeParse({ name: "Toshkent 3", code: "T3", region: "" }).success).toBe(true);
    expect(filialCreateSchema.safeParse({ name: "Toshkent 3", code: "TOOLONGXX", region: "" }).success).toBe(
      false,
    );
    expect(
      replaceAccountSchema.safeParse({ fullName: "Ali Valiyev", username: "ali_bl", password: "" }).success,
    ).toBe(true);
    expect(
      accountFormSchema.safeParse({ fullName: "Ali Valiyev", username: "ali_bl", password: "Parol2026" })
        .success,
    ).toBe(true);
    expect(
      accountFormSchema.safeParse({ fullName: "Ali Valiyev", username: "a b", password: "parolsiz" }).success,
    ).toBe(false);
  });
});
