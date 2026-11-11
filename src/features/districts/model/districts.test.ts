import { describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { resolveMock } from "@/shared/testing/fixtures/registry";
import { TEST_NOW, mockGet } from "@/shared/testing/mock-api";

import { actionTone, hasFilters, isCustomDistrict, nameChange, pageRange } from "./districts.rules";
import { districtChangesSchema } from "./districts.schema";

const PROD_SAMPLE = {
  count: 2,
  page: 1,
  page_size: 50,
  results: [
    {
      id: 17,
      at: "2026-11-11T07:15:00Z",
      region: "fargona",
      region_name: "Farg'ona",
      district: { code: "fargona/qoqon_sh", name_uz: "Qo'qon", kind: "city", is_active: true },
      action: "renamed",
      old_name: "Qo'qon shahri",
      new_name: "Qo'qon",
      changes: [
        { field: "name_uz", old: "Qo'qon shahri", new: "Qo'qon" },
        { field: "name_uz_cyrl", old: "Қўқон шаҳри", new: "Қўқон" },
      ],
      actor: { id: 512, name: "Bosh kuryer Farg'ona" },
      source: "chief",
    },
  ],
};

describe("district changes schema", () => {
  it("reads the prod sample into camelCase", () => {
    const data = parseJson(districtChangesSchema, PROD_SAMPLE);
    const [row] = data.results;

    expect(data).toMatchObject({ count: 2, page: 1, pageSize: 50 });
    expect(row).toMatchObject({
      regionName: "Farg'ona",
      district: { code: "fargona/qoqon_sh", nameUz: "Qo'qon", kind: "city", isActive: true },
      oldName: "Qo'qon shahri",
      newName: "Qo'qon",
      actor: { id: 512, name: "Bosh kuryer Farg'ona" },
    });
    expect(row?.changes).toHaveLength(2);
  });

  it("tolerates missing and odd fields instead of failing the whole journal", () => {
    const data = parseJson(districtChangesSchema, {
      count: "3",
      results: [
        {
          id: "9",
          at: "2026-11-10T04:00:00Z",
          action: "merged",
          source: "system",
          actor: null,
          district: { code: "x/y" },
          changes: [
            { field: "is_active", old: false, new: true },
            { field: "zone", old: 3 },
          ],
        },
        "broken",
      ],
    });
    const [row] = data.results;

    expect(data).toMatchObject({ count: 3, page: 1, pageSize: 50 });
    expect(data.results).toHaveLength(1);
    expect(row).toMatchObject({
      id: 9,
      region: "",
      regionName: null,
      oldName: null,
      newName: null,
      actor: null,
      action: "merged",
      district: { code: "x/y", nameUz: "", kind: "", isActive: true },
    });
    expect(row?.changes).toEqual([
      { field: "is_active", old: false, new: true },
      { field: "zone", old: "3", new: null },
    ]);
  });

  it("the sample backend matches the schema and filters like prod", () => {
    const all = parseJson(districtChangesSchema, mockGet("logistics/district-changes/"));
    expect(all.results.map((row) => row.id)).toEqual([17, 16, 15, 14, 13]);

    const day = parseJson(
      districtChangesSchema,
      mockGet("logistics/district-changes/", { region: "fargona", date_from: "2026-11-11" }),
    );
    expect(day.results.map((row) => row.id)).toEqual([17, 16]);

    const invalid = resolveMock({
      method: "GET",
      path: "logistics/district-changes/",
      searchParams: new URLSearchParams({ region: "atlantida" }),
      now: TEST_NOW,
    });
    expect(invalid).toMatchObject({
      status: 400,
      json: { code: "validation_error", fields: { region: expect.any(Array) } },
    });
  });
});

describe("district changes rules", () => {
  it("maps actions to tones, unknown is neutral", () => {
    expect(actionTone("created")).toBe("good");
    expect(actionTone("hidden")).toBe("warn");
    expect(actionTone("renamed")).toBe("info");
    expect(actionTone("whatever")).toBe("neutral");
  });

  it("detects custom districts and name changes", () => {
    expect(isCustomDistrict({ district: { code: "a", nameUz: "A", kind: "custom", isActive: true } })).toBe(
      true,
    );
    expect(nameChange({ oldName: null, newName: null })).toBeNull();
    expect(nameChange({ oldName: null, newName: "Yangi" })).toEqual({ from: null, to: "Yangi" });
  });

  it("knows when filters are set and computes the page range", () => {
    const none = { region: null, district: null, from: null, to: null, page: 3 };
    expect(hasFilters(none)).toBe(false);
    expect(hasFilters({ ...none, from: "2026-11-10" })).toBe(true);
    expect(pageRange(2, 50, 120)).toEqual({ from: 51, to: 100, pages: 3 });
    expect(pageRange(1, 50, 0)).toEqual({ from: 0, to: 0, pages: 1 });
  });
});
