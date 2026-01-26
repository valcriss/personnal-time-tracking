import type { PunchRecord } from "../repositories/DayRepository.js";
import type { TimeSegment } from "../domain/types.js";
import { utcToMinutes } from "../domain/dateUtils.js";

export const punchesToSegments = (punches: PunchRecord[]): TimeSegment[] => {
  const sorted = [...punches].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const segments: TimeSegment[] = [];
  for (let index = 0; index < sorted.length - 1; index += 2) {
    const start = sorted[index];
    const end = sorted[index + 1];
    if (start?.kind !== "IN" || end?.kind !== "OUT") {
      continue;
    }
    segments.push({
      startMinutes: utcToMinutes(start.timestamp),
      endMinutes: utcToMinutes(end.timestamp)
    });
  }
  return segments;
};
