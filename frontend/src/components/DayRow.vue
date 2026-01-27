<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useTimeStore } from "../store/timeStore";
import type { DayItem, Segment } from "../domain/types";
import { calcDay, splitSegmentsByLunch } from "../domain/timecalc";
import { parseDate } from "../utils/date";
import SegmentsEditor from "./SegmentsEditor.vue";

const props = defineProps<{ day: DayItem; selected: boolean }>();
const emit = defineEmits<{
  (e: "toggle-select", date: string, selected: boolean): void;
}>();

const store = useTimeStore();
const isEditing = ref(false);
const isModalOpen = ref(false);
const dayType = ref(props.day.dayType);
const telework = ref(props.day.telework);
const archived = ref(props.day.archived);

const isToday = computed(() => store.today?.date === props.day.date);
const isWeekend = computed(() => {
  const date = parseDate(props.day.date);
  const day = date.getDay();
  return day === 0 || day === 6;
});
const isHoliday = computed(() => dayType.value === "HOLIDAY");

const dayTypeLabel = computed(() => {
  switch (dayType.value) {
    case "NORMAL":
      return "Normal";
    case "SICK":
      return "Maladie";
    case "TRIP":
      return "Deplacement";
    case "VACATION":
      return "Conges";
    case "HOLIDAY":
      return "Ferie";
    case "RTT":
      return "RTT";
    case "OTHER":
      return "Autre";
    default:
      return dayType.value;
  }
});

const dayTypeBadgeClass = computed(() => {
  switch (dayType.value) {
    case "NORMAL":
      return "bg-slate-100 text-slate-700";
    case "SICK":
      return "bg-rose-100 text-rose-700";
    case "TRIP":
      return "bg-sky-100 text-sky-700";
    case "VACATION":
      return "bg-sky-100 text-sky-700";
    case "HOLIDAY":
      return "bg-emerald-100 text-emerald-700";
    case "RTT":
      return "bg-purple-100 text-purple-700";
    case "OTHER":
      return "bg-stone-100 text-stone-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
});

const isComplete = computed(() => {
  if (dayType.value !== "NORMAL") {
    return true;
  }
  const punches = props.day.punches ?? [];
  if (punches.length === 0 || punches.length % 2 !== 0) {
    return false;
  }
  const sorted = [...punches].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  for (let index = 0; index < sorted.length; index += 1) {
    const expected = index % 2 === 0 ? "IN" : "OUT";
    if (sorted[index].kind !== expected) {
      return false;
    }
  }
  return true;
});

const formattedDate = computed(() => {
  const date = parseDate(props.day.date);
  const day = date.getDay();
  const labels = ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"];
  const [year, month, dayOfMonth] = props.day.date.split("-");
  return `${labels[day]} ${dayOfMonth}/${month}/${year}`;
});

const isAutoEditable = computed(
  () => !isWeekend.value && !isHoliday.value && (isToday.value || !isComplete.value)
);
const canOpenModal = computed(() => !isWeekend.value && !isHoliday.value);

const morningSegments = ref<Segment[]>([]);
const afternoonSegments = ref<Segment[]>([]);
const overrideSegments = ref<Segment[] | null>(null);

const displaySegments = computed(() => overrideSegments.value ?? props.day.segments);

const dayResult = computed(() =>
  calcDay({
    ...props.day,
    segments: displaySegments.value,
    dayType: dayType.value,
    telework: telework.value
  })
);

const displayedMinutes = computed(() =>
  dayType.value === "NORMAL" ? dayResult.value.dayBalanceMinutes : dayResult.value.creditMinutes
);

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const LUNCH_START = 11 * 60 + 30;
const LUNCH_END = 14 * 60 + 30;

const sumMinutes = (segments: Segment[]) =>
  segments.reduce((total, segment) => {
    const start = toMinutes(segment.start);
    const end = toMinutes(segment.end);
    return end > start ? total + (end - start) : total;
  }, 0);

const findDisplayLunchPause = (segments: Segment[]) => {
  const sorted = [...segments].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  let best: { start: number; end: number } | null = null;
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const pauseStart = toMinutes(sorted[index].end);
    const pauseEnd = toMinutes(sorted[index + 1].start);
    if (pauseEnd <= pauseStart) {
      continue;
    }
    const overlapsLunch = pauseStart < LUNCH_END && pauseEnd > LUNCH_START;
    if (!overlapsLunch) {
      continue;
    }
    if (!best || pauseEnd - pauseStart > best.end - best.start) {
      best = { start: pauseStart, end: pauseEnd };
    }
  }
  return best;
};

const displaySplit = computed(() => {
  const segments = displaySegments.value;
  const pause = findDisplayLunchPause(segments);
  if (!pause) {
    return { morning: segments, afternoon: [] as Segment[] };
  }
  return splitSegmentsByLunch(segments, pause.start, pause.end);
});

const morningTotalMinutes = computed(() =>
  dayType.value === "NORMAL" ? sumMinutes(displaySplit.value.morning) : 0
);
const afternoonTotalMinutes = computed(() =>
  dayType.value === "NORMAL" ? sumMinutes(displaySplit.value.afternoon) : 0
);

const hasCompleteSegments = computed(() => {
  if (dayType.value !== "NORMAL") {
    return false;
  }
  const punches = props.day.punches ?? [];
  return punches.length > 0 && punches.length % 2 === 0;
});

const syncSegments = () => {
  morningSegments.value = displaySplit.value.morning.map((segment) => ({ ...segment }));
  afternoonSegments.value = displaySplit.value.afternoon.map((segment) => ({ ...segment }));
};

const startEdit = () => {
  isEditing.value = true;
  isModalOpen.value = true;
  syncSegments();
};

const closeModal = () => {
  isModalOpen.value = false;
  isEditing.value = false;
  syncSegments();
};

const buildPunches = (date: string, segments: Segment[]) => {
  const [year, month, day] = date.split("-").map(Number);
  return segments.flatMap((segment) => {
    const [startHour, startMinute] = segment.start.split(":").map(Number);
    const [endHour, endMinute] = segment.end.split(":").map(Number);
    const start = new Date(year, month - 1, day, startHour, startMinute);
    const end = new Date(year, month - 1, day, endHour, endMinute);
    return [
      { kind: "IN" as const, timestamp: start.toISOString() },
      { kind: "OUT" as const, timestamp: end.toISOString() }
    ];
  });
};

const save = async () => {
  const mergedSegments = [...morningSegments.value, ...afternoonSegments.value].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start)
  );
  const segmentsToSend = dayType.value === "NORMAL" ? mergedSegments : [];
  await store.updateDay(
    props.day.date,
    dayType.value,
    telework.value,
    archived.value,
    dayType.value === "NORMAL" ? morningSegments.value : [],
    dayType.value === "NORMAL" ? afternoonSegments.value : []
  );
  overrideSegments.value = null;
  store.days = store.days.map((day) =>
    day.date === props.day.date
      ? {
          ...day,
          dayType: dayType.value,
          telework: telework.value,
          archived: archived.value,
          segments: segmentsToSend,
          punches: segmentsToSend.length ? buildPunches(props.day.date, segmentsToSend) : []
        }
      : day
  );
  await store.loadSummary(store.days[store.days.length - 1].date);
  isModalOpen.value = false;
  if (!isAutoEditable.value) {
    isEditing.value = false;
  }
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

const formatDuration = (minutes: number) => {
  const abs = Math.max(0, minutes);
  const hours = Math.floor(abs / 60)
    .toString()
    .padStart(2, "0");
  const mins = (abs % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
};

watch(
  () => props.day,
  (day) => {
    dayType.value = day.dayType;
    telework.value = day.telework;
    archived.value = day.archived;
    overrideSegments.value = null;
    if (isModalOpen.value) {
      syncSegments();
    }
  },
  { deep: true }
);

if (isModalOpen.value) {
  syncSegments();
}
</script>

<template>
  <tr
    v-if="isWeekend || isHoliday"
    class="border-b border-sky-100/60 bg-slate-100 text-muted"
  >
    <td class="px-2 py-3"></td>
    <td class="px-4 py-3 font-medium">{{ formattedDate }}</td>
    <td class="px-4 py-3 text-center">
      <span
        v-if="isHoliday"
        class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700"
      >
        F&eacute;ri&eacute;
      </span>
    </td>
    <td class="px-4 py-3 text-center"></td>
    <td class="px-4 py-3 text-center"></td>
    <td class="px-4 py-3 text-center"></td>
    <td class="px-4 py-3 text-center"></td>
    <td class="px-4 py-3 text-center"></td>
  </tr>
  <tr
    v-else
    :class="[
      'border-b border-sky-100/60',
      dayType === 'SICK'
        ? 'bg-rose-50'
        : dayType === 'VACATION' || dayType === 'RTT'
          ? 'bg-sky-100'
          : isComplete
            ? 'bg-white'
            : 'bg-orange-50'
    ]"
  >
    <td class="px-2 py-3">
      <input
        type="checkbox"
        :checked="selected"
        @change="emit('toggle-select', props.day.date, ($event.target as HTMLInputElement).checked)"
      />
    </td>
    <td class="px-4 py-3 font-medium">{{ formattedDate }}</td>
    <td class="px-4 py-3 text-center">
      <span
        v-if="dayType !== 'NORMAL'"
        class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
        :class="dayTypeBadgeClass"
      >
        {{ dayTypeLabel }}
      </span>
    </td>
    <td class="px-4 py-3 text-center">
      <span v-if="telework" class="inline-flex items-center text-emerald-900" aria-label="Teletravail">
        <svg
          class="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 11l9-7 9 7" />
          <path d="M5 10v9h14v-9" />
          <path d="M9 19v-6h6v6" />
        </svg>
      </span>
    </td>
    <td class="px-4 py-3 text-center">
      <span class="text-sm text-muted">{{
        hasCompleteSegments ? formatDuration(morningTotalMinutes) : ""
      }}</span>
    </td>
    <td class="px-4 py-3 text-center">
      <span class="text-sm text-muted">{{
        hasCompleteSegments ? formatDuration(afternoonTotalMinutes) : ""
      }}</span>
    </td>
    <td
      class="px-4 py-3 text-center font-semibold"
      :class="
        hasCompleteSegments
          ? displayedMinutes >= 0
            ? 'text-emerald-600'
            : 'text-red-600'
          : dayType === 'TRIP'
            ? 'text-emerald-600'
            : ''
      "
    >
      {{
        dayType === "TRIP"
          ? formatMinutes(0)
          : hasCompleteSegments
            ? formatMinutes(displayedMinutes)
            : ""
      }}
    </td>
    <td class="px-4 py-3 text-center">
      <button
        class="rounded-full border border-sky-200 px-3 py-1 text-xs uppercase tracking-[0.2em]"
        :disabled="!canOpenModal"
        @click="startEdit()"
      >
        Editer
      </button>
    </td>
  </tr>

  <teleport to="body">
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
    >
      <div class="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-muted">Saisie des periodes</p>
            <p class="text-lg font-semibold">{{ formattedDate }}</p>
          </div>
        </div>
      <div class="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-muted">Matin</p>
          <SegmentsEditor v-if="dayType === 'NORMAL'" v-model="morningSegments" />
        </div>
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-muted">Apres-midi</p>
          <SegmentsEditor v-if="dayType === 'NORMAL'" v-model="afternoonSegments" />
        </div>
      </div>
      <div class="mt-6 grid gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-muted">
          Type de jour
          <select
            v-model="dayType"
            class="rounded-lg border border-sky-200 bg-white/70 px-2 py-1 text-sm text-ink"
          >
            <option value="NORMAL">NORMAL</option>
            <option value="SICK">SICK</option>
            <option value="TRIP">TRIP</option>
            <option value="VACATION">VACATION</option>
            <option value="HOLIDAY">HOLIDAY</option>
            <option value="RTT">RTT</option>
            <option value="OTHER">OTHER</option>
          </select>
        </label>
        <label class="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
          <input type="checkbox" v-model="telework" />
          Teletravail
        </label>
      </div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            class="rounded-full border border-sky-200 px-4 py-2 text-xs uppercase tracking-[0.2em]"
            @click="closeModal"
          >
            Annuler
          </button>
          <button
            type="button"
            class="rounded-full bg-sky-200 px-4 py-2 text-xs uppercase tracking-[0.2em]"
            @click="save"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>
