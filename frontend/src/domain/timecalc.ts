import type { DayItem, DayResult, Segment } from "./types";

const EXPECTED_MINUTES = 468;
const START_MINUTES = 7 * 60;
const LUNCH_START = 11 * 60 + 30;
const LUNCH_END = 14 * 60 + 30;
const LUNCH_MINUTES = 30;
const DEFAULT_LUNCH_START = 12 * 60 + 30;
const DEFAULT_LUNCH_END = DEFAULT_LUNCH_START + LUNCH_MINUTES;
const MORNING_CAP = 360;
const AFTERNOON_CAP = 360;
const TOTAL_CAP = 600;

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const normalizeSegments = (segments: Segment[]) =>
  segments
    .filter((segment) => toMinutes(segment.end) > toMinutes(segment.start))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

const overlaps = (start: number, end: number, windowStart: number, windowEnd: number) =>
  start < windowEnd && end > windowStart;

const sumOverlap = (segments: Segment[], start: number, end: number) =>
  segments.reduce((total, segment) => {
    const segStart = toMinutes(segment.start);
    const segEnd = toMinutes(segment.end);
    const overlapStart = Math.max(segStart, start);
    const overlapEnd = Math.min(segEnd, end);
    return overlapEnd > overlapStart ? total + (overlapEnd - overlapStart) : total;
  }, 0);

const hasWorkBefore = (segments: Segment[], minute: number) =>
  segments.some((segment) => toMinutes(segment.end) <= minute);

const hasWorkAfter = (segments: Segment[], minute: number) =>
  segments.some((segment) => toMinutes(segment.start) >= minute);

const findLunchPause = (segments: Segment[]) => {
  let best: { start: number; end: number } | null = null;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const pauseStart = toMinutes(segments[index].end);
    const pauseEnd = toMinutes(segments[index + 1].start);
    if (pauseEnd <= pauseStart) {
      continue;
    }
    if (!overlaps(pauseStart, pauseEnd, LUNCH_START, LUNCH_END)) {
      continue;
    }
    if (!best || pauseEnd - pauseStart > best.end - best.start) {
      best = { start: pauseStart, end: pauseEnd };
    }
  }
  return best;
};

const findFictiveLunch = (segments: Segment[]) => {
  if (hasWorkBefore(segments, DEFAULT_LUNCH_START) && hasWorkAfter(segments, DEFAULT_LUNCH_END)) {
    return { start: DEFAULT_LUNCH_START, end: DEFAULT_LUNCH_END };
  }
  for (let minute = LUNCH_START; minute <= LUNCH_END - LUNCH_MINUTES; minute += 1) {
    const end = minute + LUNCH_MINUTES;
    /* c8 ignore next 3 */
    if (hasWorkBefore(segments, minute) && hasWorkAfter(segments, end)) {
      return { start: minute, end };
    }
  }
  return { start: DEFAULT_LUNCH_START, end: DEFAULT_LUNCH_END };
};

export const calcDay = (day: DayItem): DayResult => {
  if (day.dayType !== "NORMAL") {
    return {
      creditMinutes: EXPECTED_MINUTES,
      countedWorkMinutes: 0,
      dayBalanceMinutes: 0,
      warnings: [],
      lunchStartMinutes: 0,
      lunchEndMinutes: 0
    };
  }

  const warnings: string[] = [];
  const segments = normalizeSegments(day.segments);

  if (segments.length === 0) {
    warnings.push("incompleteDay");
  }

  if (segments.length > 0 && toMinutes(segments[0].start) < START_MINUTES) {
    segments[0] = { ...segments[0], start: "07:00" };
    warnings.push("startAdjusted");
  }

  const lunchPause = findLunchPause(segments);
  let lunchStart = 0;
  let lunchEnd = 0;

  if (!lunchPause || lunchPause.end - lunchPause.start < LUNCH_MINUTES) {
    const fictive = findFictiveLunch(segments);
    lunchStart = fictive.start;
    lunchEnd = fictive.end;
    warnings.push("lunchFictive");
  } else {
    lunchStart = lunchPause.start;
    lunchEnd = lunchPause.end;
  }

  const morningWorked = sumOverlap(segments, START_MINUTES, lunchStart);
  const afternoonWorked = sumOverlap(segments, lunchEnd, 24 * 60);
  const morningCapped = Math.min(morningWorked, MORNING_CAP);
  const afternoonCapped = Math.min(afternoonWorked, AFTERNOON_CAP);
  let totalCapped = Math.min(morningCapped + afternoonCapped, TOTAL_CAP);
  if (morningCapped < morningWorked) warnings.push("morningCapped");
  if (afternoonCapped < afternoonWorked) warnings.push("afternoonCapped");
  if (totalCapped < morningCapped + afternoonCapped) warnings.push("totalCapped");

  const countedWorkMinutes = totalCapped;
  const creditMinutes = countedWorkMinutes + 5;

  return {
    creditMinutes,
    countedWorkMinutes,
    dayBalanceMinutes: creditMinutes - EXPECTED_MINUTES,
    warnings,
    lunchStartMinutes: lunchStart,
    lunchEndMinutes: lunchEnd
  };
};

export const splitSegmentsByLunch = (segments: Segment[], lunchStart: number, lunchEnd: number) => {
  const morning: Segment[] = [];
  const afternoon: Segment[] = [];

  segments.forEach((segment) => {
    const start = toMinutes(segment.start);
    const end = toMinutes(segment.end);
    if (end <= lunchStart) {
      morning.push(segment);
      return;
    }
    if (start >= lunchEnd) {
      afternoon.push(segment);
      return;
    }
    if (start < lunchStart && end > lunchStart) {
      morning.push({ start: segment.start, end: minutesToTime(lunchStart) });
    }
    if (start < lunchEnd && end > lunchEnd) {
      afternoon.push({ start: minutesToTime(lunchEnd), end: segment.end });
    }
  });

  return { morning, afternoon };
};

export const minutesToTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = Math.floor(minutes % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${mins}`;
};
