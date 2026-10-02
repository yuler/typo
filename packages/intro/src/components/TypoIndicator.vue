<script setup lang="ts">
import { Loader2Icon, SettingsIcon } from 'lucide-vue-next'
import { computed } from 'vue'
import logoUrl from '../../assets/logo.png'

export type IndicatorState = 'idle' | 'processing' | 'result'

const props = withDefaults(defineProps<{
  state?: IndicatorState
  inputText?: string
  resultText?: string
  shortcut?: string
  version?: string
  charCount?: number
}>(), {
  state: 'idle',
  inputText: '',
  resultText: '',
  shortcut: '⌃ + ⇧ + X',
  version: '1.5',
  charCount: undefined,
})

const displayCount = computed(() => props.charCount ?? props.inputText.length)
</script>

<template>
  <div
    id="scene-indicator"
    class="clip indicator absolute bottom-12 left-1/2 z-30 flex h-16 w-[560px] -translate-x-1/2 translate-y-6 select-none items-center gap-3 overflow-hidden rounded-lg border border-white/10 bg-neutral-800 px-3 opacity-0 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
    data-start="4.2"
    data-duration="7.2"
    data-track-index="4"
  >
    <div class="relative h-12 w-12 shrink-0">
      <img :src="logoUrl" alt="typo" class="pointer-events-none h-full w-full object-contain">
      <span class="pointer-events-none absolute top-1 right-0 text-[8px] text-white/35">v{{ version }}</span>
    </div>

    <div class="indicator-body flex h-full min-w-0 flex-1 items-center overflow-hidden">
      <div id="ind-idle" class="opacity-0">
        <kbd class="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/40">
          {{ shortcut }}
        </kbd>
      </div>

      <div id="ind-processing" class="flex w-full items-center gap-2 overflow-hidden px-2 opacity-0">
        <Loader2Icon class="h-3.5 w-3.5 shrink-0 animate-spin text-blue-400" />
        <span id="ind-input" class="min-w-0 shrink truncate text-sm font-medium text-blue-100/90">{{ inputText }}</span>
        <span id="ind-count" class="shrink-0 font-mono text-[10px] text-blue-400/40">{{ displayCount }}</span>
      </div>

      <div id="ind-result" class="flex w-full items-center gap-2 overflow-hidden px-2 opacity-0">
        <span class="min-w-0 flex-1 truncate text-sm font-medium text-green-400">{{ resultText }}</span>
      </div>
    </div>

    <button
      type="button"
      class="shrink-0 rounded-lg p-1.5"
      tabindex="-1"
      aria-hidden="true"
    >
      <SettingsIcon class="h-4 w-4 text-white/40" />
    </button>
  </div>
</template>
