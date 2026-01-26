export type DayType = "NORMAL" | "SICK" | "TRIP" | "VACATION";

export type Segment = {
  start: string;
  end: string;
};

export type DayItem = {
  date: string;
  dayType: DayType;
  telework: boolean;
  segments: Segment[];
};

export type DayResult = {
  creditMinutes: number;
  countedWorkMinutes: number;
  dayBalanceMinutes: number;
  warnings: string[];
  lunchStartMinutes: number;
  lunchEndMinutes: number;
};
