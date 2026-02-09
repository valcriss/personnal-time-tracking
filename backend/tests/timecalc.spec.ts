import { describe, expect, it } from "vitest";
import { calcDay } from "../src/domain/timecalc/calcDay.js";
import type { DayInput } from "../src/domain/types.js";

const segment = (startMinutes: number, endMinutes: number) => ({
  startMinutes,
  endMinutes
});

const buildInput = (segments: { startMinutes: number; endMinutes: number }[]): DayInput => ({
  date: "2026-01-02",
  dayType: "NORMAL",
  telework: false,
  segments
});

const minutes = (value: string) => {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
};

describe("calcDay", () => {
  it("adjusts start before 07:00 and calculates balance", () => {
    const input = buildInput([
      segment(minutes("06:30"), minutes("12:00")),
      segment(minutes("13:00"), minutes("16:48"))
    ]);
    const result = calcDay(input);
    expect(result.warnings).toContain("startAdjusted");
    expect(result.creditMinutes).toBe(533);
    expect(result.dayBalanceMinutes).toBe(65);
  });

  it("applies fictive lunch when no pause overlaps window", () => {
    const input = buildInput([segment(minutes("07:30"), minutes("16:00"))]);
    const result = calcDay(input);
    expect(result.warnings).toContain("lunchFictive");
    expect(result.lunchMinutesApplied).toBe(30);
  });

  it("applies fictive lunch when pause too short", () => {
    const input = buildInput([
      segment(minutes("08:00"), minutes("12:00")),
      segment(minutes("12:20"), minutes("17:00"))
    ]);
    const result = calcDay(input);
    expect(result.warnings).toContain("lunchFictive");
    expect(result.lunchMinutesApplied).toBe(30);
  });

  it("caps morning at 6h", () => {
    const input = buildInput([
      segment(minutes("07:00"), minutes("14:00")),
      segment(minutes("14:30"), minutes("16:00"))
    ]);
    const result = calcDay(input);
    expect(result.warnings).toContain("morningCapped");
    expect(result.morningCountedMinutes).toBe(360);
  });

  it("caps afternoon at 6h", () => {
    const input = buildInput([
      segment(minutes("07:00"), minutes("12:00")),
      segment(minutes("12:30"), minutes("19:30"))
    ]);
    const result = calcDay(input);
    expect(result.warnings).toContain("afternoonCapped");
    expect(result.afternoonCountedMinutes).toBe(360);
  });

  it("caps total at 10h", () => {
    const input = buildInput([
      segment(minutes("07:00"), minutes("12:30")),
      segment(minutes("13:00"), minutes("20:30"))
    ]);
    const result = calcDay(input);
    expect(result.warnings).toContain("totalCapped");
    expect(result.countedWorkMinutes).toBe(600);
    expect(result.creditMinutes).toBe(600);
  });

  it("picks longest lunch pause overlapping window", () => {
    const input = buildInput([
      segment(minutes("07:30"), minutes("10:00")),
      segment(minutes("10:15"), minutes("12:00")),
      segment(minutes("12:30"), minutes("13:30")),
      segment(minutes("13:45"), minutes("17:00"))
    ]);
    const result = calcDay(input);
    expect(result.lunchMinutesApplied).toBe(30);
    expect(result.warnings).not.toContain("lunchFictive");
  });

  it("credits SICK without segments", () => {
    const result = calcDay({
      date: "2026-01-02",
      dayType: "SICK",
      telework: false,
      segments: []
    });
    expect(result.creditMinutes).toBe(0);
    expect(result.dayBalanceMinutes).toBe(0);
  });

  it("credits TRIP without segments", () => {
    const result = calcDay({
      date: "2026-01-02",
      dayType: "TRIP",
      telework: false,
      segments: []
    });
    expect(result.creditMinutes).toBe(468);
  });

  it("credits VACATION without segments", () => {
    const result = calcDay({
      date: "2026-01-02",
      dayType: "VACATION",
      telework: false,
      segments: []
    });
    expect(result.creditMinutes).toBe(0);
  });

  it("flags invalid segments and incomplete day", () => {
    const result = calcDay(
      buildInput([segment(minutes("09:00"), minutes("09:00"))])
    );
    expect(result.warnings).toContain("invalidSegment");
    expect(result.warnings).toContain("incompleteDay");
  });

  it("uses default lunch when overlapping segments have no pause", () => {
    const result = calcDay(
      buildInput([
        segment(minutes("07:00"), minutes("12:00")),
        segment(minutes("12:00"), minutes("15:00")),
        segment(minutes("13:00"), minutes("18:00"))
      ])
    );
    expect(result.warnings).toContain("lunchFictive");
  });

  it("skips lunch penalty when no work before noon", () => {
    const result = calcDay(buildInput([segment(minutes("13:00"), minutes("16:00"))]));
    expect(result.countedWorkMinutes).toBe(180);
    expect(result.lunchMinutesApplied).toBe(0);
    expect(result.warnings).not.toContain("lunchFictive");
  });
});
