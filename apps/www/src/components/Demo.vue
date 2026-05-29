<script setup lang="ts">
import type { IndicatorState } from '@typo/ui'
import { Indicator } from '@typo/ui'
import { RotateCcwIcon } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Computer from './Computer.vue'

interface Props {
  initialText: string
  resolvedText: string
  command?: string
  active?: boolean
  slideIndex?: number
  inputLabel?: string
  replayLabel?: string
  globalShortcut?: string
  appName?: string
  pageUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  inputLabel: 'Input',
  replayLabel: 'Replay',
  globalShortcut: 'CommandOrControl+Shift+X',
  appName: 'Typo',
  pageUrl: 'typo.yuler.cc',
})

type Status = 'idle' | 'typing' | 'selected' | 'hotkey' | 'processing' | 'result'

const currentText = ref('')
const status = ref<Status>('idle')
const textarea = ref<HTMLTextAreaElement | null>(null)

const showIndicator = computed(() => status.value === 'processing' || status.value === 'result')
const selecting = computed(() => status.value === 'selected' || status.value === 'hotkey')
const indicatorState = computed<IndicatorState>(() => (status.value === 'result' ? 'result' : 'processing'))
const finished = computed(() => status.value === 'idle' && currentText.value === props.resolvedText)
const dimmed = computed(() => status.value !== 'idle')

const isMacOS = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

const keys = computed(() => {
  return props.globalShortcut
    .replace('CommandOrControl', isMacOS ? 'Command' : 'Ctrl')
    .split('+')
    .map((key) => {
      switch (key) {
        case 'Command': return '⌘'
        case 'Shift': return '⇧'
        case 'Alt': return isMacOS ? '⌥' : 'Alt'
        case 'Ctrl': return 'Ctrl'
        default: return key.toUpperCase()
      }
    })
})

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let runId = 0

async function runSimulation() {
  if (status.value !== 'idle')
    return

  const id = ++runId
  const alive = () => id === runId
  const start = props.command
    ? `${props.command} ${props.initialText.replace(new RegExp(`^${props.command}\\s*`), '')}`
    : props.initialText

  status.value = 'typing'
  currentText.value = ''

  for (let i = 0; i < start.length; i++) {
    if (!alive())
      return
    currentText.value += start[i]
    await wait(38 + Math.random() * 45)
  }

  if (!alive())
    return
  status.value = 'selected'
  textarea.value?.focus()
  textarea.value?.select()
  await wait(700)

  if (!alive())
    return
  status.value = 'hotkey'
  await wait(850)

  if (!alive())
    return
  status.value = 'processing'
  textarea.value?.setSelectionRange(currentText.value.length, currentText.value.length)
  await wait(1600)

  if (!alive())
    return
  status.value = 'result'
  currentText.value = props.resolvedText
  await wait(2200)

  if (!alive())
    return
  status.value = 'idle'

  if (props.slideIndex !== undefined)
    window.dispatchEvent(new CustomEvent('typo-showcase-finished', { detail: props.slideIndex }))
}

function startSimulation() {
  status.value = 'idle'
  runSimulation()
}

watch(() => props.active, (isActive) => {
  if (isActive)
    startSimulation()
})

function onShowcaseSlide(event: Event) {
  if (props.slideIndex === (event as CustomEvent<number>).detail)
    startSimulation()
}

onMounted(() => {
  if (props.slideIndex !== undefined) {
    window.addEventListener('typo-showcase-slide', onShowcaseSlide)
    if (props.slideIndex === 0)
      startSimulation()
    return
  }

  if (props.active !== false)
    startSimulation()
})

onUnmounted(() => {
  if (props.slideIndex !== undefined)
    window.removeEventListener('typo-showcase-slide', onShowcaseSlide)
})

function replay() {
  startSimulation()
}
</script>

<template>
  <Computer
    :dimmed="dimmed"
    :typo-active="showIndicator"
    :app-name="appName"
    :page-url="pageUrl"
  >
    <template #page>
      <p class="mb-2 text-[0.625rem] font-semibold tracking-[0.12em] text-zinc-500 uppercase">
        {{ inputLabel }}
      </p>
      <textarea
        ref="textarea"
        v-model="currentText"
        readonly
        class="block w-full resize-none border-none bg-transparent p-0 font-[inherit] text-sm leading-relaxed text-zinc-200 outline-none"
        :class="selecting && 'selection:bg-indigo-400/45 selection:text-white'"
        rows="3"
        spellcheck="false"
      />
      <span
        class="absolute bottom-4 left-4 w-px bg-indigo-400"
        :class="status === 'typing' ? 'h-[0.95rem] animate-pulse' : 'h-0'"
      />
    </template>

    <template #stage>
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 -translate-x-1/2 translate-y-1.5 scale-95"
        enter-to-class="opacity-100 -translate-x-1/2 translate-y-0 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 -translate-x-1/2 translate-y-0 scale-100"
        leave-to-class="opacity-0 -translate-x-1/2 translate-y-1.5 scale-95"
      >
        <div
          v-if="status === 'hotkey'"
          class="absolute bottom-14 left-1/2 flex -translate-x-1/2 items-center gap-1.5"
        >
          <template v-for="(key, index) in keys" :key="key">
            <span v-if="index > 0" class="text-[0.7rem] text-zinc-500">+</span>
            <kbd
              class="inline-flex h-[1.6rem] min-w-[1.6rem] items-center justify-center rounded-md border border-white/20 border-b-2 bg-linear-to-b from-zinc-600 to-zinc-800 px-1.5 text-xs font-semibold text-zinc-100 shadow-md"
            >
              {{ key }}
            </kbd>
          </template>
        </div>
      </Transition>
    </template>

    <template #hud>
      <Transition
        enter-active-class="transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        enter-from-class="opacity-0 -translate-x-1/2 translate-y-4"
        enter-to-class="opacity-100 -translate-x-1/2 translate-y-0"
        leave-active-class="transition duration-250 ease-in"
        leave-from-class="opacity-100 -translate-x-1/2 translate-y-0"
        leave-to-class="opacity-0 -translate-x-1/2 translate-y-4"
      >
        <div
          v-if="showIndicator"
          class="demo-indicator-host absolute bottom-14 left-1/2 z-30 w-[min(92%,32rem)] max-w-[32rem] -translate-x-1/2"
        >
          <Indicator
            embedded
            :state="indicatorState"
            :input-text="currentText"
            :command-name="command ?? ''"
            :result-text="resolvedText"
            :global-shortcut="globalShortcut"
            :is-mac-o-s="isMacOS"
          />
        </div>
      </Transition>

      <button
        v-if="finished"
        type="button"
        class="absolute right-3 bottom-14 z-40 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 px-2.5 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-black/40 hover:text-white"
        @click="replay"
      >
        <RotateCcwIcon class="size-3.5" />
        {{ replayLabel }}
      </button>
    </template>
  </Computer>
</template>

<style scoped>
.demo-indicator-host {
  height: 60px;
}
</style>
