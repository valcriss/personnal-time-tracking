import type { DayRepository } from "../repositories/DayRepository.js";
import type { LedgerRepository, LedgerOperationRecord } from "../repositories/LedgerRepository.js";
import type { DayType, PunchKind } from "../domain/types.js";

type ImportDay = {
  date: string;
  dayType: DayType;
  telework: boolean;
  archived?: boolean;
  punches: { kind: PunchKind; timestamp: string }[];
};

type ImportPayload = {
  days: ImportDay[];
  ledgerOperations?: LedgerOperationRecord[];
};

export const importData = async (
  dayRepo: DayRepository,
  ledgerRepo: LedgerRepository,
  payload: ImportPayload
) => {
  const days = payload.days.map((day) => ({
    date: day.date,
    dayType: day.dayType,
    telework: day.telework,
    archived: day.archived ?? false,
    punches: day.punches.map((punch) => ({
      kind: punch.kind,
      timestamp: new Date(punch.timestamp)
    }))
  }));

  const operations = (payload.ledgerOperations ?? []).map((operation) => ({
    date: operation.date,
    minutesDelta: operation.minutesDelta,
    reason: operation.reason,
    dayDate: operation.dayDate ?? null
  }));

  await dayRepo.replaceAllDays(days);
  await ledgerRepo.replaceAllOperations(operations);
};
