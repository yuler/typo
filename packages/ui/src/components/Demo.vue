<script setup lang="ts">
import { RotateCcwIcon } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import type { IndicatorState } from './Indicator.vue'
import Indicator from './Indicator.vue'

export type DemoInteractState = Extract<IndicatorState, 'idle' | 'processing' | 'result'>

interface Props {
  command?: string
  inputText: string
  outputText: string
  autoplay?: boolean
  inputLabel?: string
  replayLabel?: string
  globalShortcut?: string
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: true,
  inputLabel: 'Input',
  replayLabel: 'Replay',
  globalShortcut: 'CommandOrControl+Shift+X',
})

const state = ref<DemoInteractState>('idle')
const root = ref<HTMLElement | null>(null)

let observer: IntersectionObserver | null = null
let timers: ReturnType<typeof setTimeout>[] = []

function clearTimers() {
  for (const timer of timers)
    clearTimeout(timer)
  timers = []
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function runSequence() {
  clearTimers()
  state.value = 'idle'

  const processingMs = prefersReducedMotion() ? 0 : 1400
  const idleMs = prefersReducedMotion() ? 0 : 400

  timers.push(setTimeout(() => {
    state.value = 'processing'
    timers.push(setTimeout(() => {
      state.value = 'result'
    }, processingMs))
  }, idleMs))
}

function replay() {
  runSequence()
}

onMounted(() => {
  if (!props.autoplay || !root.value)
    return

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry?.isIntersecting) {
        runSequence()
        observer?.disconnect()
        observer = null
      }
    },
    { threshold: 0.35 },
  )
  observer.observe(root.value)
})

onUnmounted(() => {
  observer?.disconnect()
  clearTimers()
})
</script>

<template>
  <div ref="root" class="demo-interact">
    <div class="demo-interact__input">
      <p class="demo-interact__label">{{ inputLabel }}</p>
      <p class="demo-interact__text">{{ inputText }}</p>
    </div>

    <div class="demo-interact__indicator">
      <Indicator
        embedded
        :state="state"
        :input-text="inputText"
        :command-name="command ?? ''"
        :result-text="outputText"
        :global-shortcut="globalShortcut"
      />
    </div>

    <button
      v-if="state === 'result'"
      type="button"
      class="demo-interact__replay"
      @click="replay"
    >
      <RotateCcwIcon class="demo-interact__replay-icon" />
      {{ replayLabel }}
    </button>
  </div>
</template>

<style scoped>
.demo-interact {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.demo-interact__input {
  border-radius: 0.75rem;
  border: 1px solid rgb(255 255 255 / 10%);
  background: rgb(39 39 42);
  padding: 0.875rem 1rem;
}

.demo-interact__label {
  margin: 0 0 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(161 161 170);
}

.demo-interact__text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: rgb(228 228 231);
}

.demo-interact__indicator {
  height: 3.75rem;
}

.demo-interact__replay {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 0.5rem;
  background: rgb(39 39 42);
  font-size: 0.75rem;
  font-weight: 500;
  color: rgb(161 161 170);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.demo-interact__replay:hover {
  color: rgb(228 228 231);
  border-color: rgb(255 255 255 / 20%);
  background: rgb(63 63 70);
}

.demo-interact__replay-icon {
  width: 0.875rem;
  height: 0.875rem;
}
</style>
