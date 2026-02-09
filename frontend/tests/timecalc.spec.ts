import { describe, expect, it } from "vitest";
import { calcDay, minutesToTime, splitSegmentsByLunch } from "../src/domain/timecalc";
import type { DayItem } from "../src/domain/types";

const buildDay = (segments: { start: string; end: string }[]): DayItem => ({
  date: "2026-01-02",
  dayType: "NORMAL",
  telework: false,
  segments
});

describe("timecalc", () => {
  it("calculates balance and warnings", () => {
    const result = calcDay(
      buildDay([
        { start: "06:30", end: "12:00" },
        { start: "13:00", end: "16:48" }
      ])
    );
    expect(result.creditMinutes).toBe(533);
    expect(result.warnings).toContain("startAdjusted");
  });

  it("returns fixed credit for non-normal days", () => {
    const result = calcDay({
      date: "2026-01-02",
      dayType: "SICK",
      telework: false,
      segments: []
    });
    expect(result.creditMinutes).toBe(0);
  });

  it("credits TRIP without bonus", () => {
    const result = calcDay({
      date: "2026-01-02",
      dayType: "TRIP",
      telework: false,
      segments: []
    });
    expect(result.creditMinutes).toBe(468);
  });

  it("applies fictive lunch and caps", () => {
    const result = calcDay(
      buildDay([{ start: "07:00", end: "20:00" }])
    );
    expect(result.warnings).toContain("lunchFictive");
    expect(result.warnings).toContain("totalCapped");
    expect(result.creditMinutes).toBe(600);
  });

  it("caps morning and afternoon separately", () => {
    const result = calcDay(
      buildDay([
        { start: "07:00", end: "14:00" },
        { start: "14:30", end: "21:30" }
      ])
    );
    expect(result.warnings).toContain("morningCapped");
    expect(result.warnings).toContain("afternoonCapped");
  });

  it("filters invalid segments", () => {
    const result = calcDay(buildDay([{ start: "09:00", end: "09:00" }]));
    expect(result.warnings).toContain("incompleteDay");
  });

  it("marks incomplete day when no segments", () => {
    const result = calcDay(buildDay([]));
    expect(result.warnings).toContain("incompleteDay");
  });

  it("applies lunch penalty when pause is too short", () => {
    const result = calcDay(
      buildDay([
        { start: "08:00", end: "12:00" },
        { start: "12:20", end: "16:00" }
      ])
    );
    expect(result.warnings).toContain("lunchFictive");
  });

  it("accepts lunch pause when long enough", () => {
    const result = calcDay(
      buildDay([
        { start: "08:00", end: "12:00" },
        { start: "12:45", end: "16:00" }
      ])
    );
    expect(result.warnings).not.toContain("lunchFictive");
  });

  it("uses fictive lunch when segments overlap without pause", () => {
    const result = calcDay(
      buildDay([
        { start: "07:00", end: "12:00" },
        { start: "12:00", end: "15:00" },
        { start: "13:00", end: "18:00" }
      ])
    );
    expect(result.warnings).toContain("lunchFictive");
  });

  it("picks the longest lunch pause", () => {
    const result = calcDay(
      buildDay([
        { start: "07:30", end: "10:00" },
        { start: "10:15", end: "12:00" },
        { start: "12:45", end: "14:00" },
        { start: "14:30", end: "17:00" }
      ])
    );
    expect(result.warnings).not.toContain("lunchFictive");
  });

  it("does not apply lunch penalty when no work before noon", () => {
    const result = calcDay(buildDay([{ start: "13:00", end: "16:00" }]));
    expect(result.countedWorkMinutes).toBe(180);
    expect(result.warnings).not.toContain("lunchFictive");
  });

  it("splits segments across lunch", () => {
    const split = splitSegmentsByLunch(
      [{ start: "11:00", end: "13:30" }],
      12 * 60,
      12 * 60 + 30
    );
    expect(split.morning[0].end).toBe(minutesToTime(12 * 60));
    expect(split.afternoon[0].start).toBe(minutesToTime(12 * 60 + 30));
  });

  it("keeps segments strictly in morning or afternoon", () => {
    const split = splitSegmentsByLunch(
      [
        { start: "08:00", end: "10:00" },
        { start: "15:00", end: "16:00" }
      ],
      12 * 60,
      12 * 60 + 30
    );
    expect(split.morning).toHaveLength(1);
    expect(split.afternoon).toHaveLength(1);
  });
});
