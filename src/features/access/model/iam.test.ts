import { describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { mockGet } from "@/shared/testing/mock-api";

import {
  accountIssues,
  effectivePermissions,
  grantDiff,
  groupByModule,
  isValidPhone,
  moduleLevels,
  roleCounts,
  unusedLeader,
} from "./iam.rules";
import {
  accountDetailSchema,
  accountsSchema,
  departmentsSchema,
  permissionsSchema,
  rolesSchema,
} from "./iam.schema";

describe("iam contract", () => {
  it("every read endpoint matches its schema", () => {
    expect(() => {
      parseJson(departmentsSchema, mockGet("iam/departments/"));
      parseJson(permissionsSchema, mockGet("iam/permissions/"));
      parseJson(rolesSchema, mockGet("iam/roles/"));
      parseJson(accountsSchema, mockGet("iam/accounts/", { search: "" }));
      parseJson(accountDetailSchema, mockGet("iam/accounts/51/"));
    }).not.toThrow();
  });
});

describe("iam rules", () => {
  it("diffs a selection against the template both ways", () => {
    const template = ["a", "b", "c"];
    const diff = grantDiff(template, ["a", "c", "d"]);
    expect(diff).toEqual({ extra: ["d"], denied: ["b"] });
    expect(effectivePermissions(template, diff.extra, diff.denied).sort()).toEqual(["a", "c", "d"]);
  });

  it("groups the catalog by module with levels in order", () => {
    const groups = groupByModule([
      { key: "w.m", title: "", module: "w", level: "manage", isSensitive: false, description: null },
      { key: "w.v", title: "", module: "w", level: "view", isSensitive: false, description: null },
    ]);
    expect(groups[0]?.items.map((item) => item.level)).toEqual(["view", "manage"]);
  });

  it("validates the account form", () => {
    expect(isValidPhone("+998 90 123 45 67")).toBe(true);
    expect(isValidPhone("+99890")).toBe(false);
    expect(accountIssues({ fullName: "Al", phone: "+998", department: "", permissions: [] })).toEqual([
      "name",
      "phone",
      "department",
      "permissions",
    ]);
  });
});

describe("access matrix rules", () => {
  const def = (key: string, module: string, level: string) => ({
    key,
    title: key,
    module,
    level,
    isSensitive: level === "sensitive",
    description: null,
  });
  const catalog = [
    def("w.view", "warehouse", "view"),
    def("w.act", "warehouse", "act"),
    def("w.cost", "warehouse", "sensitive"),
    def("c.view", "couriers", "view"),
    def("cc.view", "callcenter", "view"),
  ];

  it("keeps the highest level per module and null where nothing is granted", () => {
    expect(moduleLevels(["w.view", "w.act", "c.view"], catalog)).toEqual({
      warehouse: "act",
      couriers: "view",
      callcenter: null,
    });
  });

  it("counts accounts per template without offboarded ones, biggest first", () => {
    const role = (key: string) => ({ key, title: key, department: "x", permissions: [], isSystem: true });
    const counts = roleCounts(
      [role("a"), role("b"), role("c")],
      [
        { role: "b", status: "active" },
        { role: "b", status: "invited" },
        { role: "a", status: "active" },
        { role: "a", status: "offboarded" },
      ],
    );
    expect(counts.map((item) => [item.role.key, item.count])).toEqual([
      ["b", 2],
      ["a", 1],
    ]);
  });

  it("picks the active account with the most unused permissions for the AI card", () => {
    const leader = unusedLeader([
      { id: 1, status: "active", unusedPermissions: ["a"] },
      { id: 2, status: "blocked", unusedPermissions: ["a", "b", "c"] },
      { id: 3, status: "active", unusedPermissions: ["a", "b"] },
    ]);
    expect(leader?.id).toBe(3);
    expect(unusedLeader([{ id: 1, status: "active", unusedPermissions: [] }])).toBeNull();
  });
});
