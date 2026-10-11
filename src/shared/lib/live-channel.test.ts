import { describe, expect, it } from "vitest";

import { liveEventType, retryDelay } from "./live-channel";

describe("liveEventType", () => {
  it("recognises the events from the contract", () => {
    expect(liveEventType(JSON.stringify({ type: "kpi_tick", orders_today: 131 }))).toBe("kpi_tick");
    expect(liveEventType(JSON.stringify({ type: "alert_opened", alert: {} }))).toBe("alert_opened");
  });

  it("ignores anything else instead of throwing", () => {
    expect(liveEventType(JSON.stringify({ type: "pong" }))).toBeNull();
    expect(liveEventType("not json")).toBeNull();
    expect(liveEventType(new ArrayBuffer(4))).toBeNull();
    expect(liveEventType(JSON.stringify({ no: "type" }))).toBeNull();
  });
});

describe("retryDelay", () => {
  it("backs off exponentially and caps at 30 seconds", () => {
    expect(retryDelay(1)).toBe(2000);
    expect(retryDelay(2)).toBe(4000);
    expect(retryDelay(3)).toBe(8000);
    expect(retryDelay(10)).toBe(30_000);
  });
});
