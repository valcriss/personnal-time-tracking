import type { DayRepository } from "../repositories/DayRepository.js";
import type { LedgerRepository, LedgerOperationRecord } from "../repositories/LedgerRepository.js";
import type { DayInput } from "../domain/types.js";
import type { DayRecord } from "../repositories/DayRepository.js";
import { calcDay } from "../domain/timecalc/calcDay.js";
import { parseDate, listPurgeDates } from "../domain/dateUtils.js";
import { punchesToSegments } from "./punchUtils.js";

const buildDayInput = (day: DayRecord): DayInput => ({
  date: day.date,
  dayType: day.dayType,
  telework: day.telework,
  segments: punchesToSegments(day.punches)
});

export const getSummary = async (
  dayRepo: DayRepository,
  ledgerRepo: LedgerRepository,
  date: string
) => {
  const days = await dayRepo.getDaysUpTo(date);
  const operations = await ledgerRepo.getOperationsUpTo(date);

  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const sortedOps = [...operations].sort((a, b) => a.date.localeCompare(b.date));

  let balance = 0;
  const startDateCandidates = [date, ...sortedDays.map((day) => day.date), ...sortedOps.map((op) => op.date)];
  const startDate = startDateCandidates.reduce((min, current) =>
    parseDate(current) < parseDate(min) ? current : min
  );
  const purgeDates = listPurgeDates(startDate, date);

  const purgeSet = new Set(
    sortedOps.filter((op) => op.reason === "PURGE").map((op) => op.date)
  );

  const dayBalances = new Map<string, number>();
  for (const day of sortedDays) {
    dayBalances.set(day.date, calcDay(buildDayInput(day)).dayBalanceMinutes);
  }

  const operationsByDate = new Map<string, number>();
  for (const op of sortedOps) {
    operationsByDate.set(op.date, (operationsByDate.get(op.date) ?? 0) + op.minutesDelta);
  }

  const allDates = new Set<string>([
    ...dayBalances.keys(),
    ...operationsByDate.keys(),
    ...purgeDates
  ]);

  const orderedDates = [...allDates].sort((a, b) => a.localeCompare(b));

  for (const current of orderedDates) {
    balance += dayBalances.get(current) ?? 0;
    balance += operationsByDate.get(current) ?? 0;

    if (purgeDates.includes(current) && !purgeSet.has(current) && balance > 0) {
      const purgeOp: LedgerOperationRecord = {
        date: current,
        minutesDelta: -balance,
        reason: "PURGE",
        dayDate: null
      };
      await ledgerRepo.addOperation(purgeOp);
      balance = 0;
    }
  }

  const todayDay = sortedDays.find((day) => day.date === date);
  const todayBalanceMinutes = todayDay ? calcDay(buildDayInput(todayDay)).dayBalanceMinutes : 0;

  const targetYear = parseDate(date).year;
  const teleworkUsed = sortedDays.filter(
    (day) => parseDate(day.date).year === targetYear && day.telework
  ).length;

  return {
    todayBalanceMinutes,
    globalBalanceMinutes: balance,
    teleworkUsed,
    teleworkRemaining: Math.max(0, 100 - teleworkUsed)
  };
};
