import type { DayInput, DayResult, TimeSegment } from "../types.js";

const MINUTES_PER_DAY = 24 * 60;
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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const sortSegments = (segments: TimeSegment[]) =>
  [...segments].sort((a, b) => a.startMinutes - b.startMinutes);

const hasWorkBefore = (segments: TimeSegment[], minute: number) =>
  segments.some((segment) => segment.endMinutes <= minute && segment.endMinutes > 0);

const hasWorkAfter = (segments: TimeSegment[], minute: number) =>
  segments.some((segment) => segment.startMinutes >= minute && segment.startMinutes < MINUTES_PER_DAY);

const overlaps = (start: number, end: number, windowStart: number, windowEnd: number) =>
  start < windowEnd && end > windowStart;

const sumOverlap = (segments: TimeSegment[], start: number, end: number) =>
  segments.reduce((total, segment) => {
    const overlapStart = Math.max(segment.startMinutes, start);
    const overlapEnd = Math.min(segment.endMinutes, end);
    return overlapEnd > overlapStart ? total + (overlapEnd - overlapStart) : total;
  }, 0);

const normalizeSegments = (segments: TimeSegment[]) => {
  const warnings: string[] = [];
  const valid = segments.filter((segment) => {
    const isValid = segment.endMinutes > segment.startMinutes;
    if (!isValid) {
      warnings.push("invalidSegment");
    }
    return isValid;
  });
  return { segments: sortSegments(valid), warnings };
};

const adjustStart = (segments: TimeSegment[]) => {
  if (segments.length === 0) {
    return { segments, adjusted: false };
  }
  const [first, ...rest] = segments;
  if (first.startMinutes >= START_MINUTES) {
    return { segments, adjusted: false };
  }
  const adjustedSegment: TimeSegment = {
    startMinutes: START_MINUTES,
    endMinutes: Math.max(first.endMinutes, START_MINUTES)
  };
  return { segments: [adjustedSegment, ...rest], adjusted: true };
};

const findLunchPause = (segments: TimeSegment[]) => {
  let bestPause: { start: number; end: number } | null = null;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index];
    const next = segments[index + 1];
    const pauseStart = current.endMinutes;
    const pauseEnd = next.startMinutes;
    if (pauseEnd <= pauseStart) {
      continue;
    }
    if (!overlaps(pauseStart, pauseEnd, LUNCH_START, LUNCH_END)) {
      continue;
    }
    if (!bestPause || pauseEnd - pauseStart > bestPause.end - bestPause.start) {
      bestPause = { start: pauseStart, end: pauseEnd };
    }
  }
  return bestPause;
};

const findFictiveLunch = (segments: TimeSegment[]) => {
  if (
    hasWorkBefore(segments, DEFAULT_LUNCH_START) &&
    hasWorkAfter(segments, DEFAULT_LUNCH_END)
  ) {
    return { start: DEFAULT_LUNCH_START, end: DEFAULT_LUNCH_END };
  }
  const searchStart = LUNCH_START;
  const searchEnd = LUNCH_END - LUNCH_MINUTES;
  for (let minute = searchStart; minute <= searchEnd; minute += 1) {
    const end = minute + LUNCH_MINUTES;
    /* c8 ignore next 3 */
    if (hasWorkBefore(segments, minute) && hasWorkAfter(segments, end)) {
      return { start: minute, end };
    }
  }
  return { start: DEFAULT_LUNCH_START, end: DEFAULT_LUNCH_END };
};

const applyCaps = (morning: number, afternoon: number) => {
  const morningCapped = Math.min(morning, MORNING_CAP);
  const afternoonCapped = Math.min(afternoon, AFTERNOON_CAP);
  const totalCapped = Math.min(morningCapped + afternoonCapped, TOTAL_CAP);
  const afternoonAfterTotal = Math.min(afternoonCapped, Math.max(0, TOTAL_CAP - morningCapped));
  return {
    morningCapped,
    afternoonCapped: afternoonAfterTotal,
    totalCapped,
    totalRaw: morning + afternoon
  };
};

export const calcDay = (input: DayInput): DayResult => {
  if (input.dayType !== "NORMAL") {
    return {
      creditMinutes: EXPECTED_MINUTES,
      countedWorkMinutes: 0,
      morningCountedMinutes: 0,
      afternoonCountedMinutes: 0,
      lunchMinutesApplied: 0,
      ignoredMinutes: 0,
      dayBalanceMinutes: 0,
      warnings: []
    };
  }

  const warnings: string[] = [];
  const normalized = normalizeSegments(input.segments);
  warnings.push(...normalized.warnings);

  if (normalized.segments.length === 0) {
    warnings.push("incompleteDay");
  }

  const adjusted = adjustStart(normalized.segments);
  if (adjusted.adjusted) {
    warnings.push("startAdjusted");
  }

  const segments = adjusted.segments;
  const lunchPause = findLunchPause(segments);
  let lunchStart = 0;
  let lunchEnd = 0;
  let lunchMinutes = 0;

  if (!lunchPause || lunchPause.end - lunchPause.start < LUNCH_MINUTES) {
    const fictive = findFictiveLunch(segments);
    lunchStart = clamp(fictive.start, LUNCH_START, LUNCH_END);
    lunchEnd = clamp(fictive.end, LUNCH_START, LUNCH_END);
    lunchMinutes = LUNCH_MINUTES;
    warnings.push("lunchFictive");
  } else {
    lunchStart = lunchPause.start;
    lunchEnd = lunchPause.end;
    lunchMinutes = lunchPause.end - lunchPause.start;
  }

  const morningWorked = sumOverlap(segments, START_MINUTES, lunchStart);
  const afternoonWorked = sumOverlap(segments, lunchEnd, MINUTES_PER_DAY);

  const caps = applyCaps(morningWorked, afternoonWorked);
  if (caps.morningCapped < morningWorked) {
    warnings.push("morningCapped");
  }
  if (caps.afternoonCapped < afternoonWorked) {
    warnings.push("afternoonCapped");
  }
  if (caps.totalCapped < caps.morningCapped + caps.afternoonCapped) {
    warnings.push("totalCapped");
  }

  const countedWorkMinutes = caps.totalCapped;
  const creditMinutes = countedWorkMinutes + 5;
  const ignoredMinutes = Math.max(0, caps.totalRaw - countedWorkMinutes);

  return {
    creditMinutes,
    countedWorkMinutes,
    morningCountedMinutes: caps.morningCapped,
    afternoonCountedMinutes: caps.afternoonCapped,
    lunchMinutesApplied: lunchMinutes,
    ignoredMinutes,
    dayBalanceMinutes: creditMinutes - EXPECTED_MINUTES,
    warnings
  };
};
