import { describe, expect, it, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useTimeStore } from "../src/store/timeStore";

describe("time store", () => {
  it("loads days", async () => {
    setActivePinia(createPinia());
    const store = useTimeStore();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ days: [{ date: "2026-01-10", dayType: "NORMAL", telework: false, segments: [] }] })
    }) as any;

    await store.loadDays("2026-01-01", "2026-01-31");
    expect(store.days).toHaveLength(1);
    expect(store.loading).toBe(false);
    expect(store.todayWarnings).toEqual(["incompleteDay"]);
    expect(store.dayBalances["2026-01-10"]).toBeLessThan(0);
  });

  it("loads summary", async () => {
    setActivePinia(createPinia());
    const store = useTimeStore();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        todayBalanceMinutes: 10,
        globalBalanceMinutes: 20,
        teleworkUsed: 1,
        teleworkRemaining: 99
      })
    }) as any;

    await store.loadSummary("2026-01-10");
    expect(store.summary.globalBalanceMinutes).toBe(20);
  });

  it("updates day", async () => {
    setActivePinia(createPinia());
    const store = useTimeStore();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock as any;

    await store.updateDay(
      "2026-01-10",
      "NORMAL",
      true,
      [{ start: "08:00", end: "09:00" }],
      []
    );

    expect(fetchMock).toHaveBeenCalled();
  });
});
