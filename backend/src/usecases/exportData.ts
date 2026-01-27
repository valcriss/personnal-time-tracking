import type { DayRepository } from "../repositories/DayRepository.js";
import type { LedgerRepository } from "../repositories/LedgerRepository.js";
import { punchesToSegments } from "./punchUtils.js";
import { serializeSegments } from "./segmentUtils.js";

export const exportData = async (dayRepo: DayRepository, ledgerRepo: LedgerRepository) => {
  const days = await dayRepo.getAllDays();
  const operations = await ledgerRepo.getAllOperations();

  return {
    days: days.map((day) => ({
      date: day.date,
      dayType: day.dayType,
      telework: day.telework,
      archived: day.archived,
      punches: day.punches.map((punch) => ({
        kind: punch.kind,
        timestamp: punch.timestamp.toISOString()
      })),
      segments: serializeSegments(punchesToSegments(day.punches))
    })),
    ledgerOperations: operations.map((operation) => ({
      date: operation.date,
      minutesDelta: operation.minutesDelta,
      reason: operation.reason,
      dayDate: operation.dayDate ?? null
    }))
  };
};
