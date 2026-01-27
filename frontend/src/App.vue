<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useTimeStore } from "./store/timeStore";
import AppHeader from "./components/AppHeader.vue";
import TimesheetTable from "./components/TimesheetTable.vue";
import { addDays, formatDate } from "./utils/date";
import { apiGetBlob, apiPost } from "./api";

const store = useTimeStore();

const selectedDates = ref<Set<string>>(new Set());
const showArchived = ref(false);
const isImportOpen = ref(false);
const importFile = ref<File | null>(null);
const importLoading = ref(false);

const exportData = async () => {
  const blob = await apiGetBlob("/api/export");
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = `personnal-time-tracking-${stamp}.json`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const toggleSelect = (date: string, selected: boolean) => {
  const next = new Set(selectedDates.value);
  if (selected) {
    next.add(date);
  } else {
    next.delete(date);
  }
  selectedDates.value = next;
};

const archiveSelected = async () => {
  if (!selectedDates.value.size) return;
  await apiPost("/api/archive", { dates: Array.from(selectedDates.value) });
  selectedDates.value = new Set();
  await load();
};

const toggleArchived = () => {
  showArchived.value = !showArchived.value;
};

const openImport = () => {
  importFile.value = null;
  isImportOpen.value = true;
};

const closeImport = () => {
  isImportOpen.value = false;
  importFile.value = null;
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  importFile.value = target.files?.[0] ?? null;
};

const importData = async () => {
  if (!importFile.value) return;
  importLoading.value = true;
  try {
    const text = await importFile.value.text();
    const payload = JSON.parse(text);
    await apiPost("/api/import", payload);
    await load();
    closeImport();
  } finally {
    importLoading.value = false;
  }
};

const load = async () => {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const desiredFrom = addDays(today, -29);
  const from = formatDate(desiredFrom < startOfYear ? startOfYear : desiredFrom);
  const to = formatDate(today);
  await store.loadDays(from, to);
  await store.loadSummary(to);
};

onMounted(() => {
  void load();
});
</script>

<template>
  <div class="min-h-screen bg-paper glow px-4 py-6 md:px-10">
    <div class="mx-auto flex max-w-7xl flex-col gap-6">
      <AppHeader
        :summary="store.summary"
        :vacation-remaining="store.vacationRemaining"
        :rtt-remaining="store.rttRemaining"
        :telework-per-week="store.teleworkPerWeek"
        :show-archived="showArchived"
        @export="exportData"
        @import="openImport"
        @archive="archiveSelected"
        @toggle-archived="toggleArchived"
      />
      <TimesheetTable
        :days="showArchived ? store.allDays : store.days"
        :selected-dates="selectedDates"
        @toggle-select="toggleSelect"
      />
    </div>
  </div>

  <teleport to="body">
    <div
      v-if="isImportOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
    >
      <div class="card-panel w-full max-w-lg px-6 py-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-muted">Importer</p>
            <p class="text-lg font-semibold">Selectionner un fichier JSON</p>
          </div>
          <button
            type="button"
            class="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs uppercase tracking-[0.2em]"
            @click="closeImport"
          >
            Annuler
          </button>
        </div>
        <div class="mt-4">
          <input
            type="file"
            accept="application/json"
            class="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm"
            @change="handleFileChange"
          />
        </div>
        <div class="mt-5 flex items-center justify-end">
          <button
            type="button"
            class="rounded-full bg-sky-200 px-4 py-2 text-xs uppercase tracking-[0.2em]"
            :disabled="!importFile || importLoading"
            @click="importData"
          >
            {{ importLoading ? "Import..." : "Importer" }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>
