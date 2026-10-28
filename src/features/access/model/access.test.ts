import { describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { mockGet } from "@/shared/testing/mock-api";

import {
  addDaysIso,
  daysLeft,
  grantIssues,
  isExpiringSoon,
  isGrantableSection,
  sortMembers,
  toggleIn,
} from "./access.rules";
import { activitySchema, candidatesSchema, membersSchema, templatesSchema } from "./access.schema";

describe("access contract", () => {
  it("every read endpoint matches its schema", () => {
    expect(() => {
      parseJson(membersSchema, mockGet("access/members/", { status: "all" }));
      parseJson(candidatesSchema, mockGet("access/candidates/", { search: "" }));
      parseJson(templatesSchema, mockGet("access/templates/"));
      parseJson(activitySchema, mockGet("access/activity/"));
    }).not.toThrow();
  });

  it("templates only use grantable sections", () => {
    const templates = parseJson(templatesSchema, mockGet("access/templates/")).results;
    expect(templates.flatMap((template) => template.sections).every(isGrantableSection)).toBe(true);
    expect(isGrantableSection("access")).toBe(false);
    expect(isGrantableSection("settings")).toBe(false);
  });
});

describe("access rules", () => {
  const now = Date.parse("2026-10-28T10:00:00+05:00");

  it("counts days left and flags soon-expiring access", () => {
    expect(daysLeft(null, now)).toBeNull();
    expect(daysLeft("2026-10-30T10:00:00+05:00", now)).toBe(2);
    expect(isExpiringSoon({ status: "active", expiresAt: "2026-10-30T10:00:00+05:00" }, now)).toBe(true);
    expect(isExpiringSoon({ status: "revoked", expiresAt: "2026-10-30T10:00:00+05:00" }, now)).toBe(false);
    expect(addDaysIso("2026-10-28", 30)).toBe("2026-11-27");
  });

  it("validates the form and toggles values", () => {
    expect(grantIssues({ userId: 0, sections: [], title: " " })).toEqual(["person", "sections", "title"]);
    expect(grantIssues({ userId: 4, sections: ["warehouse"], title: "Logist" })).toEqual([]);
    expect(toggleIn(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleIn(["a", "b"], "a")).toEqual(["b"]);
  });

  it("keeps live members first", () => {
    const members = parseJson(membersSchema, mockGet("access/members/", { status: "all" })).results;
    expect(sortMembers(members).at(-1)?.status).toBe("revoked");
  });
});
