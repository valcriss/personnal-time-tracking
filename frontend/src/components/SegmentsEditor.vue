<script setup lang="ts">
import type { Segment } from "../domain/types";

const props = defineProps<{ modelValue: Segment[] }>();
const emit = defineEmits<{ (e: "update:modelValue", value: Segment[]): void }>();

const updateSegment = (index: number, key: "start" | "end", value: string) => {
  const updated = props.modelValue.map((segment, idx) =>
    idx === index ? { ...segment, [key]: value } : segment
  );
  emit("update:modelValue", updated);
};

const addSegment = () => {
  const last = props.modelValue[props.modelValue.length - 1];
  const start = last ? last.end : "08:00";
  const next = [...props.modelValue, { start, end: start }];
  emit("update:modelValue", next);
};
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="(segment, index) in modelValue"
      :key="segment.start + index"
      class="flex items-center gap-2"
    >
      <input
        type="time"
        class="rounded-lg border border-amber-200 bg-white/70 px-2 py-1 text-xs"
        :value="segment.start"
        @input="updateSegment(index, 'start', ($event.target as HTMLInputElement).value)"
      />
      <span class="text-xs text-muted">→</span>
      <input
        type="time"
        class="rounded-lg border border-amber-200 bg-white/70 px-2 py-1 text-xs"
        :value="segment.end"
        @input="updateSegment(index, 'end', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <button
      type="button"
      class="w-fit rounded-full border border-amber-200 px-3 py-1 text-[10px] uppercase tracking-[0.3em]"
      @click="addSegment"
    >
      +
    </button>
  </div>
</template>
