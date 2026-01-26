import { defineStore } from "pinia";
import { apiGet, apiPut } from "../api";
import type { DayItem } from "../domain/types";
import { calcDay } from "../domain/timecalc";

export type Summary = {
  todayBalanceMinutes: number;
  globalBalanceMinutes: number;
  teleworkUsed: number;
  teleworkRemaining: number;
};

export const useTimeStore = defineStore("time", {
  state: () => ({
    days: [] as DayItem[],
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
        const data = await apiGet<{ days: DayItem[] }>(`/api/days?from=${from}&to=${to}`);
        this.days = data.days;
      } finally {
        this.loading = false;
      }
    },
    async loadSummary(date: string) {
      this.summary = await apiGet<Summary>(`/api/summary?date=${date}`);
    },
    async updateDay(
      date: string,
      dayType: DayItem["dayType"],
      telework: boolean,
      morningSegments: DayItem["segments"],
      afternoonSegments: DayItem["segments"]
    ) {
      await apiPut(`/api/days/${date}`, {
        type: dayType,
        telework,
        morningSegments,
        afternoonSegments
      });
    }
  }
});
