import { describe, expect, it } from "vitest";
import { addDays, formatDate } from "../src/utils/date";

describe("date utils", () => {
  it("formats and adds days", () => {
    const date = new Date("2026-01-10T00:00:00Z");
    expect(formatDate(date)).toBe("2026-01-10");
    expect(formatDate(addDays(date, 2))).toBe("2026-01-12");
  });
});
