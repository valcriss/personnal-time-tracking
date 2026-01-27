export type DayType =
  | "NORMAL"
  | "SICK"
  | "TRIP"
  | "VACATION"
  | "HOLIDAY"
  | "RTT"
  | "OTHER";

export type PunchKind = "IN" | "OUT";

export type TimeSegment = {
  startMinutes: number;
  endMinutes: number;
};

export type DayInput = {
  date: string;
  dayType: DayType;
  telework: boolean;
  segments: TimeSegment[];
};

export type DayResult = {
  creditMinutes: number;
  countedWorkMinutes: number;
  morningCountedMinutes: number;
  afternoonCountedMinutes: number;
  lunchMinutesApplied: number;
  ignoredMinutes: number;
  dayBalanceMinutes: number;
  warnings: string[];
};
