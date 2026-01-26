import { describe, expect, it } from "vitest";
import {
  addDays,
  dateToUtc,
  formatDate,
  isSameOrAfter,
  isSameOrBefore,
  listPurgeDates,
  parseDate,
  utcDateToDateString,
  utcToMinutes
} from "../src/domain/dateUtils.js";
import {
  minutesToTimeString,
  parseSegments,
  serializeSegments,
  timeStringToMinutes
} from "../src/usecases/segmentUtils.js";

const sampleDate = "2026-01-15";

describe("dateUtils", () => {
  it("parses and formats dates", () => {
    const parsed = parseDate(sampleDate);
    expect(formatDate(parsed)).toBe(sampleDate);
  });

  it("adds days and compares", () => {
    const next = addDays(sampleDate, 1);
    expect(next).toBe("2026-01-16");
    expect(isSameOrBefore(sampleDate, next)).toBe(true);
    expect(isSameOrAfter(next, sampleDate)).toBe(true);
  });

  it("converts UTC date and minutes", () => {
    const utcDate = dateToUtc(sampleDate);
    const dateString = utcDateToDateString(utcDate);
    expect(dateString).toBe(sampleDate);
    expect(utcToMinutes(new Date(Date.UTC(2026, 0, 15, 7, 30)))).toBe(8 * 60 + 30);
  });

  it("lists purge dates", () => {
    const purgeDates = listPurgeDates("2025-12-31", "2026-07-02");
    expect(purgeDates).toContain("2026-01-01");
    expect(purgeDates).toContain("2026-07-01");
  });
});

describe("segmentUtils", () => {
  it("parses and serializes segments", () => {
    const minutes = timeStringToMinutes("07:45");
    expect(minutes).toBe(7 * 60 + 45);
    expect(minutesToTimeString(minutes)).toBe("07:45");

    const segments = parseSegments([{ start: "08:00", end: "09:15" }]);
    expect(segments[0].startMinutes).toBe(8 * 60);

    const serialized = serializeSegments(segments);
    expect(serialized[0].end).toBe("09:15");
  });
});
