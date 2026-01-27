import type { DayRepository } from "../repositories/DayRepository.js";
import type { DayType } from "../domain/types.js";
import { minutesToUtcDate } from "../domain/dateUtils.js";
import { parseSegments } from "./segmentUtils.js";

export type UpdateDayInput = {
  date: string;
  dayType: DayType;
  telework: boolean;
  archived: boolean;
  morningSegments: { start: string; end: string }[];
  afternoonSegments: { start: string; end: string }[];
};

const buildPunches = (date: string, segments: { startMinutes: number; endMinutes: number }[]) =>
  segments.flatMap((segment) => [
    { kind: "IN" as const, timestamp: minutesToUtcDate(date, segment.startMinutes) },
    { kind: "OUT" as const, timestamp: minutesToUtcDate(date, segment.endMinutes) }
  ]);

export const updateDay = async (repo: DayRepository, input: UpdateDayInput) => {
  const morning = parseSegments(input.morningSegments);
  const afternoon = parseSegments(input.afternoonSegments);
  const segments = [...morning, ...afternoon].sort(
    (a, b) => a.startMinutes - b.startMinutes
  );

  const punches = buildPunches(input.date, segments);

  await repo.upsertDay({
    date: input.date,
    dayType: input.dayType,
    telework: input.telework,
    archived: input.archived,
    punches
  });
};
