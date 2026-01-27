import type { DayType, PunchKind } from "../domain/types.js";

export type PunchRecord = {
  kind: PunchKind;
  timestamp: Date;
};

export type DayRecord = {
  date: string;
  dayType: DayType;
  telework: boolean;
  archived: boolean;
  punches: PunchRecord[];
};

export interface DayRepository {
  getDaysInRange(from: string, to: string): Promise<DayRecord[]>;
  getDaysUpTo(date: string): Promise<DayRecord[]>;
  getAllDays(): Promise<DayRecord[]>;
  replaceAllDays(records: DayRecord[]): Promise<void>;
  archiveDays(dates: string[]): Promise<void>;
  upsertDay(record: DayRecord): Promise<void>;
}
