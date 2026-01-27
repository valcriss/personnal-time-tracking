import type { DayRepository } from "../repositories/DayRepository.js";
import { punchesToSegments } from "./punchUtils.js";
import { serializeSegments } from "./segmentUtils.js";

export const getDays = async (repo: DayRepository, from: string, to: string) => {
  const days = await repo.getDaysInRange(from, to);
  return days.map((day) => ({
    date: day.date,
    dayType: day.dayType,
    telework: day.telework,
    archived: day.archived,
    punches: day.punches.map((punch) => ({
      kind: punch.kind,
      timestamp: punch.timestamp.toISOString()
    })),
    segments: serializeSegments(punchesToSegments(day.punches))
  }));
};
