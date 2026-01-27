<script setup lang="ts">
import type { Summary } from "../store/timeStore";

type Props = {
  summary: Summary;
  vacationRemaining: number;
  rttRemaining: number;
  teleworkPerWeek: number;
  showArchived: boolean;
};

const emit = defineEmits<{
  (e: "export"): void;
  (e: "import"): void;
  (e: "archive"): void;
  (e: "toggle-archived"): void;
}>();

defineProps<Props>();

const formatMinutes = (minutes: number) => {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60)
    .toString()
    .padStart(2, "0");
  const mins = (abs % 60).toString().padStart(2, "0");
  return `${sign}${hours}:${mins}`;
};

</script>

<template>
  <div class="sticky top-4 z-10 space-y-2">
    <div class="card-panel px-2 py-1">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-full border border-sky-200 bg-white px-4 py-2 text-slate-700"
            title="Archiver"
            @click="emit('archive')"
          >
            <svg
              class="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 7h18" />
              <path d="M5 7l1 12h12l1-12" />
              <path d="M9 11h6" />
              <path d="M8 3h8l1 4H7l1-4z" />
            </svg>
          </button>
          <button
            type="button"
            class="rounded-full border border-sky-200 bg-white px-4 py-2 text-slate-700"
            :title="showArchived ? 'Masquer les transactions archivees' : 'Voir les transactions archivees'"
            @click="emit('toggle-archived')"
          >
            <svg
              class="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" />
              <circle cx="12" cy="12" r="3" />
              <path v-if="!showArchived" d="M3 3l18 18" />
            </svg>
          </button>
        </div>
        <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-full border border-sky-200 bg-white px-4 py-2 text-slate-700"
          title="Importer un fichier"
          @click="emit('import')"
        >
          <svg
            class="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 10v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="M12 3v12" />
            <path d="M7 13l5 5 5-5" />
            <path d="M4 10a4 4 0 0 1 4-4h2" />
            <path d="M20 10a4 4 0 0 0-4-4h-2" />
          </svg>
        </button>
        <button
          type="button"
          class="rounded-full border border-sky-200 bg-white px-4 py-2 text-slate-700"
          title="Exporter les enregistrements"
          @click="emit('export')"
        >
          <svg
            class="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
            <path d="M12 3v12" />
            <path d="M7 8l5-5 5 5" />
            <path d="M4 14a4 4 0 0 1 4-4h2" />
            <path d="M20 14a4 4 0 0 0-4-4h-2" />
          </svg>
        </button>
        </div>
      </div>
    </div>

    <header class="card-panel px-6 py-5">
      <div class="stagger grid gap-4 md:grid-cols-6">
        <div class="text-center">
          <p class="text-sm uppercase tracking-[0.2em] text-muted">Solde global</p>
          <p class="font-display text-3xl">{{ formatMinutes(summary.globalBalanceMinutes) }}</p>
        </div>
        <div class="text-center">
          <p class="text-sm uppercase tracking-[0.2em] text-muted">Solde du jour</p>
          <p class="font-display text-3xl">{{ formatMinutes(summary.todayBalanceMinutes) }}</p>
        </div>
        <div class="text-center">
          <p class="text-sm uppercase tracking-[0.2em] text-muted">Teletravail</p>
          <p class="font-display text-3xl">{{ summary.teleworkUsed }} / 100</p>
          <p class="text-sm text-muted">(restant {{ summary.teleworkRemaining }})</p>
        </div>
        <div class="text-center">
          <p class="text-sm uppercase tracking-[0.2em] text-muted">Conges</p>
          <p class="font-display text-3xl">{{ vacationRemaining }}</p>
          <p class="text-sm text-muted">restants</p>
        </div>
        <div class="text-center">
          <p class="text-sm uppercase tracking-[0.2em] text-muted">RTT</p>
          <p class="font-display text-3xl">{{ rttRemaining }}</p>
          <p class="text-sm text-muted">restants</p>
        </div>
        <div class="text-center">
          <p class="text-sm uppercase tracking-[0.2em] text-muted">TTV / Semain</p>
          <p class="font-display text-3xl">{{ teleworkPerWeek }}</p>
          <p class="text-sm text-muted">possible</p>
        </div>
      </div>
    </header>
  </div>
</template>
