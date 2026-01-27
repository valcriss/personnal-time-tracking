import { describe, expect, it } from "vitest";
import { getSummary } from "../src/usecases/getSummary.js";
import { InMemoryDayRepository, InMemoryLedgerRepository } from "./inMemoryRepos.js";
import { minutesToUtcDate } from "../src/domain/dateUtils.js";

const punch = (date: string, time: string, kind: "IN" | "OUT") => {
  const [hours, minutes] = time.split(":").map(Number);
  return { kind, timestamp: minutesToUtcDate(date, hours * 60 + minutes) };
};

describe("getSummary", () => {
  it("counts telework days within the year", async () => {
    const dayRepo = new InMemoryDayRepository();
    const ledgerRepo = new InMemoryLedgerRepository();
    dayRepo.seed([
      {
        date: "2026-01-05",
        dayType: "NORMAL",
        telework: true,
        archived: false,
        punches: []
      },
      {
        date: "2026-02-05",
        dayType: "NORMAL",
        telework: true,
        archived: false,
        punches: []
      }
    ]);

    const summary = await getSummary(dayRepo, ledgerRepo, "2026-02-05");
    expect(summary.teleworkUsed).toBe(2);
    expect(summary.teleworkRemaining).toBe(98);
  });

  it("creates purge on Jan 1 when balance positive", async () => {
    const dayRepo = new InMemoryDayRepository();
    const ledgerRepo = new InMemoryLedgerRepository();
    dayRepo.seed([
      {
        date: "2025-12-31",
        dayType: "NORMAL",
        telework: false,
        archived: false,
        punches: [
          punch("2025-12-31", "07:00", "IN"),
          punch("2025-12-31", "12:00", "OUT"),
          punch("2025-12-31", "12:30", "IN"),
          punch("2025-12-31", "18:30", "OUT")
        ]
      },
      {
        date: "2026-01-01",
        dayType: "SICK",
        telework: false,
        archived: false,
        punches: []
      }
    ]);

    const summary = await getSummary(dayRepo, ledgerRepo, "2026-01-01");
    const operations = ledgerRepo.snapshot();
    expect(summary.globalBalanceMinutes).toBe(0);
    expect(operations.some((op) => op.reason === "PURGE" && op.date === "2026-01-01")).toBe(
      true
    );
  });

  it("creates purge on Jul 1 when balance positive", async () => {
    const dayRepo = new InMemoryDayRepository();
    const ledgerRepo = new InMemoryLedgerRepository();
    dayRepo.seed([
      {
        date: "2026-06-30",
        dayType: "NORMAL",
        telework: false,
        archived: false,
        punches: [
          punch("2026-06-30", "07:00", "IN"),
          punch("2026-06-30", "12:00", "OUT"),
          punch("2026-06-30", "12:30", "IN"),
          punch("2026-06-30", "18:30", "OUT")
        ]
      },
      {
        date: "2026-07-01",
        dayType: "SICK",
        telework: false,
        archived: false,
        punches: []
      }
    ]);

    const summary = await getSummary(dayRepo, ledgerRepo, "2026-07-01");
    const operations = ledgerRepo.snapshot();
    expect(summary.globalBalanceMinutes).toBe(0);
    expect(operations.some((op) => op.reason === "PURGE" && op.date === "2026-07-01")).toBe(
      true
    );
  });

  it("keeps negative balance on purge dates", async () => {
    const dayRepo = new InMemoryDayRepository();
    const ledgerRepo = new InMemoryLedgerRepository();
    dayRepo.seed([
      {
        date: "2025-12-31",
        dayType: "NORMAL",
        telework: false,
        archived: false,
        punches: []
      },
      {
        date: "2026-01-01",
        dayType: "SICK",
        telework: false,
        archived: false,
        punches: []
      }
    ]);

    const summary = await getSummary(dayRepo, ledgerRepo, "2026-01-01");
    const operations = ledgerRepo.snapshot();
    expect(summary.globalBalanceMinutes).toBeLessThan(0);
    expect(operations.some((op) => op.reason === "PURGE")).toBe(false);
  });

  it("uses ledger operations when no days exist", async () => {
    const dayRepo = new InMemoryDayRepository();
    const ledgerRepo = new InMemoryLedgerRepository();
    ledgerRepo.seed([{ date: "2026-01-10", minutesDelta: 15, reason: "ADJUST" }]);

    const summary = await getSummary(dayRepo, ledgerRepo, "2026-01-10");
    expect(summary.globalBalanceMinutes).toBe(15);
  });

  it("purges even when no day exists on purge date", async () => {
    const dayRepo = new InMemoryDayRepository();
    const ledgerRepo = new InMemoryLedgerRepository();
    dayRepo.seed([
      {
        date: "2025-12-31",
        dayType: "NORMAL",
        telework: false,
        archived: false,
        punches: [
          punch("2025-12-31", "07:00", "IN"),
          punch("2025-12-31", "12:00", "OUT"),
          punch("2025-12-31", "12:30", "IN"),
          punch("2025-12-31", "18:30", "OUT")
        ]
      }
    ]);

    const summary = await getSummary(dayRepo, ledgerRepo, "2026-01-02");
    expect(summary.globalBalanceMinutes).toBe(0);
  });
});