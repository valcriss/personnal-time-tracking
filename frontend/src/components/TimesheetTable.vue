<script setup lang="ts">
import type { DayItem } from "../domain/types";
import DayRow from "./DayRow.vue";

type Props = {
  days: DayItem[];
};

defineProps<Props>();
</script>

<template>
  <section class="card-panel overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[900px] text-left text-sm">
        <thead class="bg-amber-50/60 text-xs uppercase tracking-[0.2em] text-muted">
          <tr>
            <th class="px-4 py-3">Date</th>
            <th class="px-4 py-3">Type</th>
            <th class="px-4 py-3">Télétravail</th>
            <th class="px-4 py-3">Matin</th>
            <th class="px-4 py-3">Après-midi</th>
            <th class="px-4 py-3">Solde</th>
            <th class="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          <DayRow v-for="day in days" :key="day.date" :day="day" />
        </tbody>
      </table>
    </div>
  </section>
</template>
