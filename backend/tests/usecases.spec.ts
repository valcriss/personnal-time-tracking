import { describe, expect, it } from "vitest";
import { InMemoryDayRepository } from "./inMemoryRepos.js";
import { getDays } from "../src/usecases/getDays.js";
import { updateDay } from "../src/usecases/updateDay.js";
import { minutesToUtcDate } from "../src/domain/dateUtils.js";

describe("day usecases", () => {
  it("updates day and rebuilds punches", async () => {
    const repo = new InMemoryDayRepository();
    await updateDay(repo, {
      date: "2026-01-10",
      dayType: "NORMAL",
      telework: true,
      archived: false,
      morningSegments: [{ start: "08:00", end: "10:00" }],
      afternoonSegments: [{ start: "13:00", end: "14:00" }]
    });

    const days = await repo.getDaysInRange("2026-01-10", "2026-01-10");
    expect(days[0].punches).toHaveLength(4);
    expect(days[0].telework).toBe(true);
  });

  it("returns punches and segments", async () => {
    const repo = new InMemoryDayRepository();
    repo.seed([
      {
        date: "2026-01-11",
        dayType: "NORMAL",
        telework: false,
        archived: false,
        punches: [
          { kind: "IN", timestamp: minutesToUtcDate("2026-01-11", 8 * 60) },
          { kind: "OUT", timestamp: minutesToUtcDate("2026-01-11", 12 * 60) }
        ]
      }
    ]);

    const result = await getDays(repo, "2026-01-11", "2026-01-11");
    expect(result[0].punches[0].kind).toBe("IN");
    expect(result[0].segments[0].start).toBe("08:00");
  });
});
