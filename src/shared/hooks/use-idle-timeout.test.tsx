// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIdleTimeout } from "./use-idle-timeout";

const THIRTY_MINUTES = 30 * 60_000;

describe("useIdleTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("fires once the owner has been inactive for the whole timeout", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(onIdle, THIRTY_MINUTES));

    vi.advanceTimersByTime(THIRTY_MINUTES - 20_000);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20_000);
    expect(onIdle).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(THIRTY_MINUTES);
    expect(onIdle).toHaveBeenCalledOnce();
  });

  it("starts over on any activity", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(onIdle, THIRTY_MINUTES));

    vi.advanceTimersByTime(THIRTY_MINUTES - 60_000);
    window.dispatchEvent(new Event("keydown"));
    vi.advanceTimersByTime(THIRTY_MINUTES - 60_000);

    expect(onIdle).not.toHaveBeenCalled();
  });

  it("counts the time the page was frozen in the background, and returning is not activity", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(onIdle, THIRTY_MINUTES));

    // telefon bloklandi: taymerlar ishlamadi, lekin soat yurdi
    vi.setSystemTime(Date.now() + 2 * THIRTY_MINUTES);
    document.dispatchEvent(new Event("visibilitychange"));

    expect(onIdle).toHaveBeenCalledOnce();
  });

  it("does not sign out an idle tab while the owner works in another one", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(onIdle, THIRTY_MINUTES));

    vi.advanceTimersByTime(THIRTY_MINUTES - 60_000);
    // boshqa tab faollikni umumiy xotiraga yozdi
    window.localStorage.setItem("da_owner_last_activity", String(Date.now()));
    vi.advanceTimersByTime(THIRTY_MINUTES - 60_000);

    expect(onIdle).not.toHaveBeenCalled();
  });

  it("stops watching when the panel is left", () => {
    const onIdle = vi.fn();
    const { unmount } = renderHook(() => useIdleTimeout(onIdle, THIRTY_MINUTES));

    unmount();
    vi.advanceTimersByTime(THIRTY_MINUTES * 2);

    expect(onIdle).not.toHaveBeenCalled();
  });
});
