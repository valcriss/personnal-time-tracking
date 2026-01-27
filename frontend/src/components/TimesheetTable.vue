<script setup lang="ts">
import type { DayItem } from "../domain/types";
import DayRow from "./DayRow.vue";

type Props = {
  days: DayItem[];
  selectedDates: Set<string>;
};

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "toggle-select", date: string, selected: boolean): void;
}>();
</script>

<template>
  <section class="card-panel overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[900px] text-left text-sm">
        <thead class="bg-sky-50/60 text-xs uppercase tracking-[0.2em] text-muted">
          <tr>
            <th class="w-10 px-2 py-3"></th>
            <th class="px-4 py-3">Date</th>
            <th class="px-4 py-3 text-center">Type</th>
            <th class="px-4 py-3 text-center">Télétravail</th>
            <th class="px-4 py-3 text-center">Matin</th>
            <th class="px-4 py-3 text-center">Après-midi</th>
            <th class="px-4 py-3 text-center">Solde</th>
            <th class="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <DayRow
            v-for="day in days"
            :key="day.date"
            :day="day"
            :selected="props.selectedDates.has(day.date)"
            @toggle-select="(date, selected) => emit('toggle-select', date, selected)"
          />
        </tbody>
      </table>
    </div>
  </section>
</template>
