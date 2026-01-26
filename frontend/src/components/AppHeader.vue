<script setup lang="ts">
import type { Summary } from "../store/timeStore";

type Props = {
  summary: Summary;
  todayWarnings: string[];
};

const props = defineProps<Props>();

const formatMinutes = (minutes: number) => {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60)
    .toString()
    .padStart(2, "0");
  const mins = (abs % 60).toString().padStart(2, "0");
  return `${sign}${hours}:${mins}`;
};

const isIncomplete = () => props.todayWarnings.includes("incompleteDay");
</script>

<template>
  <header class="card-panel sticky top-4 z-10 px-6 py-5">
    <div class="stagger grid gap-4 md:grid-cols-4">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-muted">Solde global</p>
        <p class="font-display text-2xl">{{ formatMinutes(summary.globalBalanceMinutes) }}</p>
      </div>
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-muted">Solde du jour</p>
        <p class="font-display text-2xl">{{ formatMinutes(summary.todayBalanceMinutes) }}</p>
      </div>
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-muted">Télétravail</p>
        <p class="font-display text-2xl">
          {{ summary.teleworkUsed }} / 100
          <span class="text-sm text-muted">(restant {{ summary.teleworkRemaining }})</span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]"
          :class="isIncomplete() ? 'border-red-300 text-red-600' : 'border-emerald-300 text-emerald-700'"
        >
          {{ isIncomplete() ? 'Journée incomplète' : 'Journée complète' }}
        </span>
      </div>
    </div>
  </header>
</template>
