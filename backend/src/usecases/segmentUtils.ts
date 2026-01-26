import type { TimeSegment } from "../domain/types.js";

export const timeStringToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
};

export const minutesToTimeString = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = Math.floor(minutes % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${mins}`;
};

export const parseSegments = (segments: { start: string; end: string }[]): TimeSegment[] =>
  segments.map((segment) => ({
    startMinutes: timeStringToMinutes(segment.start),
    endMinutes: timeStringToMinutes(segment.end)
  }));

export const serializeSegments = (segments: TimeSegment[]) =>
  segments.map((segment) => ({
    start: minutesToTimeString(segment.startMinutes),
    end: minutesToTimeString(segment.endMinutes)
  }));
