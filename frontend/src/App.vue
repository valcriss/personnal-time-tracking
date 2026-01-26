<script setup lang="ts">
import { onMounted } from "vue";
import { useTimeStore } from "./store/timeStore";
import AppHeader from "./components/AppHeader.vue";
import TimesheetTable from "./components/TimesheetTable.vue";
import { addDays, formatDate } from "./utils/date";

const store = useTimeStore();

const load = async () => {
  const today = new Date();
  const from = formatDate(addDays(today, -29));
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
    <div class="mx-auto flex max-w-6xl flex-col gap-6">
      <AppHeader
        :summary="store.summary"
        :today-warnings="store.todayWarnings"
      />
      <TimesheetTable :days="store.days" />
    </div>
  </div>
</template>
