<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useTimeStore } from "../store/timeStore";
import type { DayItem, Segment } from "../domain/types";
import { calcDay, splitSegmentsByLunch } from "../domain/timecalc";
import SegmentsEditor from "./SegmentsEditor.vue";

const props = defineProps<{ day: DayItem }>();

const store = useTimeStore();
const isEditing = ref(false);
const dayType = ref(props.day.dayType);
const telework = ref(props.day.telework);

const isToday = computed(() => store.today?.date === props.day.date);
const canEditInline = computed(() => isToday.value || isEditing.value);

const dayResult = computed(() =>
  calcDay({ ...props.day, dayType: dayType.value, telework: telework.value })
);

const split = computed(() =>
  splitSegmentsByLunch(
    props.day.segments,
    dayResult.value.lunchStartMinutes,
    dayResult.value.lunchEndMinutes
  )
);

const morningSegments = ref<Segment[]>([]);
const afternoonSegments = ref<Segment[]>([]);

const startEdit = () => {
  isEditing.value = true;
  morningSegments.value = split.value.morning.map((segment) => ({ ...segment }));
  afternoonSegments.value = split.value.afternoon.map((segment) => ({ ...segment }));
};

const save = async () => {
  await store.updateDay(
    props.day.date,
    dayType.value,
    telework.value,
    morningSegments.value,
    afternoonSegments.value
  );
  await store.loadDays(store.days[0].date, store.days[store.days.length - 1].date);
  await store.loadSummary(store.days[store.days.length - 1].date);
  isEditing.value = false;
};

const formatMinutes = (minutes: number) => {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60)
    .toString()
    .padStart(2, "0");
  const mins = (abs % 60).toString().padStart(2, "0");
  return `${sign}${hours}:${mins}`;
};

watch(
  () => props.day,
  (day) => {
    dayType.value = day.dayType;
    telework.value = day.telework;
    if (isToday.value && !isEditing.value) {
      const currentSplit = split.value;
      morningSegments.value = currentSplit.morning.map((segment) => ({ ...segment }));
      afternoonSegments.value = currentSplit.afternoon.map((segment) => ({ ...segment }));
    }
  },
  { deep: true }
);
</script>

<template>
  <tr class="border-b border-amber-100/60">
    <td class="px-4 py-3 font-medium">{{ day.date }}</td>
    <td class="px-4 py-3">
      <select
        v-model="dayType"
        class="rounded-lg border border-amber-200 bg-white/70 px-2 py-1 text-sm"
        :disabled="!canEditInline"
      >
        <option value="NORMAL">NORMAL</option>
        <option value="SICK">SICK</option>
        <option value="TRIP">TRIP</option>
        <option value="VACATION">VACATION</option>
      </select>
    </td>
    <td class="px-4 py-3">
      <input type="checkbox" v-model="telework" :disabled="!canEditInline" />
    </td>
    <td class="px-4 py-3">
      <SegmentsEditor
        v-if="canEditInline && dayType === 'NORMAL'"
        v-model="morningSegments"
      />
      <div v-else class="flex flex-col gap-1 text-xs text-muted">
        <span v-for="segment in split.morning" :key="segment.start + segment.end">
          {{ segment.start }} → {{ segment.end }}
        </span>
        <span v-if="dayType !== 'NORMAL'">—</span>
      </div>
    </td>
    <td class="px-4 py-3">
      <SegmentsEditor
        v-if="canEditInline && dayType === 'NORMAL'"
        v-model="afternoonSegments"
      />
      <div v-else class="flex flex-col gap-1 text-xs text-muted">
        <span v-for="segment in split.afternoon" :key="segment.start + segment.end">
          {{ segment.start }} → {{ segment.end }}
        </span>
        <span v-if="dayType !== 'NORMAL'">—</span>
      </div>
    </td>
    <td class="px-4 py-3 font-semibold">
      {{ formatMinutes(dayResult.dayBalanceMinutes) }}
    </td>
    <td class="px-4 py-3">
      <button
        v-if="!isToday"
        class="rounded-full border border-amber-200 px-3 py-1 text-xs uppercase tracking-[0.2em]"
        @click="isEditing ? save() : startEdit()"
      >
        {{ isEditing ? 'OK' : '✏️' }}
      </button>
      <span v-else class="text-xs text-muted">Aujourd'hui</span>
    </td>
  </tr>
</template>
