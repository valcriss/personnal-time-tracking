import { defineStore } from "pinia";
import { apiGet, apiPut } from "../api";
import type { DayItem } from "../domain/types";
import { calcDay } from "../domain/timecalc";
import { addDays, formatDate, parseDate } from "../utils/date";
import { getFrenchHolidays } from "../utils/holidays";

export type Summary = {
  todayBalanceMinutes: number;
  globalBalanceMinutes: number;
  teleworkUsed: number;
  teleworkRemaining: number;
};

export const useTimeStore = defineStore("time", {
  state: () => ({
    days: [] as DayItem[],
    allDays: [] as DayItem[],
    summary: {
      todayBalanceMinutes: 0,
      globalBalanceMinutes: 0,
      teleworkUsed: 0,
      teleworkRemaining: 100
    } as Summary,
    loading: false
  }),
  getters: {
    today(state) {
      return state.days[state.days.length - 1];
    },
    todayWarnings(state) {
      if (!state.days.length) return [] as string[];
      return calcDay(state.days[state.days.length - 1]).warnings;
    },
    vacationUsed(state) {
      return state.days.filter((day) => day.dayType === "VACATION").length;
    },
    rttUsed(state) {
      return state.days.filter((day) => day.dayType === "RTT").length;
    },
    vacationRemaining(): number {
      return Math.max(0, 25 - this.vacationUsed);
    },
    rttRemaining(): number {
      return Math.max(0, 15 - this.rttUsed);
    },
    holidaysRemaining(): number {
      const today = formatDate(new Date());
      const endOfYear = formatDate(new Date(new Date().getFullYear(), 11, 31));
      const holidaySet = getFrenchHolidays(new Date().getFullYear());
      let cursor = parseDate(today);
      const end = parseDate(endOfYear);
      let count = 0;
      while (cursor <= end) {
        const dayOfWeek = cursor.getDay();
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        const date = formatDate(cursor);
        if (isWeekday && holidaySet.has(date)) {
          count += 1;
        }
        cursor = addDays(cursor, 1);
      }
      return count;
    },
    workdaysRemaining(): number {
      const today = formatDate(new Date());
      const endOfYear = formatDate(new Date(new Date().getFullYear(), 11, 31));
      let cursor = parseDate(today);
      const end = parseDate(endOfYear);
      let count = 0;
      while (cursor <= end) {
        const dayOfWeek = cursor.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          count += 1;
        }
        cursor = addDays(cursor, 1);
      }
      return count;
    },
    teleworkPerWeek(): number {
      const remainingWorkdays =
        this.workdaysRemaining - this.holidaysRemaining - this.vacationRemaining - this.rttRemaining;
      const weeksRemaining = remainingWorkdays / 5;
      if (weeksRemaining <= 0) return 0;
      const value = this.summary.teleworkRemaining / weeksRemaining;
      return Math.round(value * 100) / 100;
    },
    dayBalances(state) {
      return state.days.reduce<Record<string, number>>((acc, day) => {
        acc[day.date] = calcDay(day).dayBalanceMinutes;
        return acc;
      }, {});
    }
  },
  actions: {
    async loadDays(from: string, to: string) {
      this.loading = true;
      try {
        const today = formatDate(new Date());
        const boundedTo = parseDate(to) > parseDate(today) ? today : to;
        const boundedFrom = parseDate(from) > parseDate(boundedTo) ? boundedTo : from;
        const data = await apiGet<{ days: DayItem[] }>(
          `/api/days?from=${boundedFrom}&to=${boundedTo}`
        );
        const daysByDate = new Map(
          data.days.map((day) => [day.date, { ...day, archived: day.archived ?? false }])
        );
        const result: DayItem[] = [];
        let cursor = parseDate(boundedFrom);
        const end = parseDate(boundedTo);
        const currentYear = new Date().getFullYear();
        const holidaySet = getFrenchHolidays(currentYear);
        while (cursor <= end) {
          const date = formatDate(cursor);
        const existing = daysByDate.get(date);
        if (existing) {
          /* c8 ignore next */
          result.push({ ...existing, archived: existing.archived ?? false });
        } else {
            const dateYear = cursor.getFullYear();
            const isHoliday = dateYear === currentYear && holidaySet.has(date);
            result.push({
              date,
              dayType: isHoliday ? "HOLIDAY" : "NORMAL",
              telework: false,
              archived: false,
              segments: [],
              punches: []
            });
          }
          cursor = addDays(cursor, 1);
        }
        this.allDays = result;
        this.days = result.filter((day) => !day.archived);
      } finally {
        this.loading = false;
      }
    },
    async loadSummary(date: string) {
      const today = formatDate(new Date());
      const boundedDate = parseDate(date) > parseDate(today) ? today : date;
      this.summary = await apiGet<Summary>(`/api/summary?date=${boundedDate}`);
    },
    async updateDay(
      date: string,
      dayType: DayItem["dayType"],
      telework: boolean,
      archived: boolean,
      morningSegments: DayItem["segments"],
      afternoonSegments: DayItem["segments"]
    ) {
      await apiPut(`/api/days/${date}`, {
        type: dayType,
        telework,
        archived,
        morningSegments,
        afternoonSegments
      });
    }
  }
});
