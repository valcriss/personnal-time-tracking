export type DayType =
  | "NORMAL"
  | "SICK"
  | "TRIP"
  | "VACATION"
  | "HOLIDAY"
  | "RTT"
  | "OTHER";

export type Segment = {
  start: string;
  end: string;
};

export type PunchKind = "IN" | "OUT";

export type PunchRecord = {
  kind: PunchKind;
  timestamp: string;
};

export type DayItem = {
  date: string;
  dayType: DayType;
  telework: boolean;
  archived: boolean;
  segments: Segment[];
  punches?: PunchRecord[];
};

export type DayResult = {
  creditMinutes: number;
  countedWorkMinutes: number;
  dayBalanceMinutes: number;
  warnings: string[];
  lunchStartMinutes: number;
  lunchEndMinutes: number;
};
