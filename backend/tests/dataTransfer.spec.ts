import { describe, expect, it } from "vitest";
import { InMemoryDayRepository, InMemoryLedgerRepository } from "./inMemoryRepos.js";
import { exportData } from "../src/usecases/exportData.js";
import { importData } from "../src/usecases/importData.js";
import { archiveDays } from "../src/usecases/archiveDays.js";
import { punchesToSegments } from "../src/usecases/punchUtils.js";
import { minutesToUtcDate } from "../src/domain/dateUtils.js";

describe("data transfer usecases", () => {
  it("exports data with segments and archived flag", async () => {
    const dayRepo = new InMemoryDayRepository();
    const ledgerRepo = new InMemoryLedgerRepository();
    dayRepo.seed([
      {
        date: "2026-01-02",
        dayType: "NORMAL",
        telework: true,
        archived: true,
        punches: [
          { kind: "IN", timestamp: minutesToUtcDate("2026-01-02", 8 * 60) },
          { kind: "OUT", timestamp: minutesToUtcDate("2026-01-02", 9 * 60) }
        ]
      }
    ]);
    ledgerRepo.seed([
      { date: "2026-01-02", minutesDelta: 5, reason: "ADJUST", dayDate: null }
    ]);

    const result = await exportData(dayRepo, ledgerRepo);
    expect(result.days[0].archived).toBe(true);
    expect(result.days[0].segments).toEqual([{ start: "08:00", end: "09:00" }]);
    expect(result.ledgerOperations[0].reason).toBe("ADJUST");
  });

  it("imports data and defaults archived to false", async () => {
    const dayRepo = new InMemoryDayRepository();
    const ledgerRepo = new InMemoryLedgerRepository();
    await importData(dayRepo, ledgerRepo, {
      days: [
        {
          date: "2026-01-03",
          dayType: "NORMAL",
          telework: false,
          punches: [{ kind: "IN", timestamp: new Date("2026-01-03T08:00:00.000Z").toISOString() }]
        }
      ]
    });

    const days = await dayRepo.getAllDays();
    expect(days[0].archived).toBe(false);
    expect((await ledgerRepo.getAllOperations()).length).toBe(0);
  });

  it("archives selected days", async () => {
    const repo = new InMemoryDayRepository();
    repo.seed([
      { date: "2026-01-04", dayType: "NORMAL", telework: false, archived: false, punches: [] }
    ]);
    await archiveDays(repo, ["2026-01-04"]);
    const [day] = await repo.getAllDays();
    expect(day.archived).toBe(true);
  });

  it("converts punches to segments only when ordered IN/OUT", () => {
    const segments = punchesToSegments([
      { kind: "OUT", timestamp: minutesToUtcDate("2026-01-05", 9 * 60) },
      { kind: "IN", timestamp: minutesToUtcDate("2026-01-05", 10 * 60) },
      { kind: "IN", timestamp: minutesToUtcDate("2026-01-05", 11 * 60) },
      { kind: "OUT", timestamp: minutesToUtcDate("2026-01-05", 12 * 60) }
    ]);

    expect(segments).toEqual([{ startMinutes: 11 * 60, endMinutes: 12 * 60 }]);
  });
});
