import { describe, expect, it, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useTimeStore } from "../src/store/timeStore";

describe("time store", () => {
  it("loads days", async () => {
    setActivePinia(createPinia());
    const store = useTimeStore();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ days: [{ date: "2026-01-10", dayType: "NORMAL", telework: false, archived: false, segments: [] }] })
    }) as any;

    await store.loadDays("2026-01-01", "2026-01-31");
    expect(store.days).toHaveLength(27);
    expect(store.loading).toBe(false);
    expect(store.todayWarnings).toEqual(["incompleteDay", "lunchFictive"]);
    expect(store.dayBalances["2026-01-10"]).toBeLessThan(0);
  });

  it("returns empty warnings when no days", () => {
    setActivePinia(createPinia());
    const store = useTimeStore();
    expect(store.todayWarnings).toEqual([]);
  });

  it("bounds loadDays to today and marks holidays", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    setActivePinia(createPinia());
    const store = useTimeStore();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ days: [] })
    }) as any;

    await store.loadDays("2026-12-31", "2026-12-31");
    expect(store.days).toHaveLength(1);
    expect(store.days[0].dayType).toBe("HOLIDAY");
    vi.useRealTimers();
  });

  it("uses existing days from API response", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-11T10:00:00.000Z"));
    setActivePinia(createPinia());
    const store = useTimeStore();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        days: [
          { date: "2026-01-10", dayType: "NORMAL", telework: true, segments: [] }
        ]
      })
    }) as any;

    await store.loadDays("2026-01-10", "2026-01-10");
    expect(store.days[0].telework).toBe(true);
    expect(store.days[0].archived).toBe(false);
    vi.useRealTimers();
  });

  it("keeps archived days in allDays", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T10:00:00.000Z"));
    setActivePinia(createPinia());
    const store = useTimeStore();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        days: [
          { date: "2026-01-10", dayType: "NORMAL", telework: false, archived: true, segments: [] }
        ]
      })
    }) as any;

    await store.loadDays("2026-01-10", "2026-01-10");
    expect(store.allDays[0].archived).toBe(true);
    expect(store.days).toHaveLength(0);
    vi.useRealTimers();
  });

  it("merges existing and generated days", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T10:00:00.000Z"));
    setActivePinia(createPinia());
    const store = useTimeStore();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        days: [
          { date: "2026-01-10", dayType: "NORMAL", telework: true, archived: false, segments: [] }
        ]
      })
    }) as any;

    await store.loadDays("2026-01-10", "2026-01-11");
    expect(store.allDays.length).toBeGreaterThan(0);
    expect(store.allDays[0].telework).toBe(true);
    vi.useRealTimers();
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

  it("bounds summary date to today", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-05T10:00:00.000Z"));
    setActivePinia(createPinia());
    const store = useTimeStore();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        todayBalanceMinutes: 0,
        globalBalanceMinutes: 0,
        teleworkUsed: 0,
        teleworkRemaining: 100
      })
    });
    globalThis.fetch = fetchMock as any;

    await store.loadSummary("2026-12-31");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/summary?date=2026-01-05",
      expect.anything()
    );
    vi.useRealTimers();
  });

  it("returns zero telework per week when no weeks remain", () => {
    setActivePinia(createPinia());
    const store = useTimeStore();
    vi.spyOn(store, "workdaysRemaining", "get").mockReturnValue(0);
    vi.spyOn(store, "holidaysRemaining", "get").mockReturnValue(0);
    vi.spyOn(store, "vacationRemaining", "get").mockReturnValue(0);
    vi.spyOn(store, "rttRemaining", "get").mockReturnValue(0);
    store.summary.teleworkRemaining = 10;
    expect(store.teleworkPerWeek).toBe(0);
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
      false,
      [{ start: "08:00", end: "09:00" }],
      []
    );

    expect(fetchMock).toHaveBeenCalled();
  });
});
