<script setup lang="ts">
import type { IndicatorState } from '@typo/ui'
import { Indicator } from '@typo/ui'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import Computer from './Computer.vue'

interface Props {
  initialText: string
  resolvedText: string
  command?: string
  active?: boolean
  slideIndex?: number
  globalShortcut?: string
  appName?: string
  pageUrl?: string
  copyResult?: boolean
  copiedLabel?: string
  version?: string
}

const props = withDefaults(defineProps<Props>(), {
  globalShortcut: 'CommandOrControl+Shift+X',
  appName: 'Typo',
  pageUrl: 'typo.yuler.cc',
  copyResult: true,
  copiedLabel: 'Copied',
})

const INDICATOR_HEIGHT = 60
const INDICATOR_EMBEDDED_CHROME_WIDTH = 72
const INDICATOR_MAX_CONTENT_WIDTH = 390
const INDICATOR_MAX_TOTAL_WIDTH = 520
const INDICATOR_MIN_TOTAL_WIDTH = 180

const AVG_TYPING_MS = 61
const SELECTED_HOLD_MS = 1000
const HOTKEY_HOLD_MS = 1000
const PROCESSING_MS = 1600
const RESULT_HOLD_MS = 2200

const indicatorHeightPx = `${INDICATOR_HEIGHT}px`

type Status = 'idle' | 'typing' | 'selected' | 'hotkey' | 'processing' | 'result'

const currentText = ref('')
const processingInputText = ref('')
const status = ref<Status>('idle')
const textarea = ref<HTMLTextAreaElement | null>(null)
const computerRef = ref<InstanceType<typeof Computer> | null>(null)
const hostAvailableWidth = ref(INDICATOR_MAX_TOTAL_WIDTH)

const showIndicator = computed(() => status.value === 'processing' || status.value === 'result')
const showTextSelection = computed(() =>
  status.value === 'selected'
  || status.value === 'hotkey'
  || status.value === 'processing'
  || status.value === 'result',
)

const selectionRange = ref<{ start: number, end: number } | null>(null)
const indicatorState = computed<IndicatorState>(() => (status.value === 'result' ? 'result' : 'processing'))
const dimmed = computed(() => status.value !== 'idle')

const isMacOS = ref(false)

const keys = computed(() =>
  props.globalShortcut
    .replace('CommandOrControl', isMacOS.value ? 'Command' : 'Ctrl')
    .split('+'),
)

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function applyTextSelection() {
  const el = textarea.value
  const range = selectionRange.value
  if (!el || !range)
    return
  const end = Math.min(range.end, currentText.value.length)
  const start = Math.min(range.start, end)
  el.focus({ preventScroll: true })
  el.setSelectionRange(start, end)
}

async function keepTextSelection() {
  await nextTick()
  applyTextSelection()
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

  if (props.slideIndex !== undefined) {
    // Estimated time until `typo-showcase-finished` fires, so the timeline can
    // fill its progress line across the whole interaction rather than only after it.
    const estimatedTypingMs = start.length * AVG_TYPING_MS
    const duration = estimatedTypingMs + SELECTED_HOLD_MS + HOTKEY_HOLD_MS + PROCESSING_MS + RESULT_HOLD_MS
    window.dispatchEvent(
      new CustomEvent('typo-showcase-started', { detail: { index: props.slideIndex, duration } }),
    )
  }

  for (let i = 0; i < start.length; i++) {
    if (!alive())
      return
    currentText.value += start[i]
    await wait(38 + Math.random() * 45)
  }

  if (!alive())
    return
  status.value = 'selected'
  selectionRange.value = { start: 0, end: currentText.value.length }
  await keepTextSelection()
  await wait(SELECTED_HOLD_MS)

  if (!alive())
    return
  status.value = 'hotkey'
  await keepTextSelection()
  await wait(HOTKEY_HOLD_MS)

  if (!alive())
    return
  status.value = 'processing'
  processingInputText.value = currentText.value
  await keepTextSelection()
  await wait(PROCESSING_MS)

  if (!alive())
    return
  status.value = 'result'
  currentText.value = props.resolvedText
  selectionRange.value = { start: 0, end: currentText.value.length }
  await keepTextSelection()
  await wait(RESULT_HOLD_MS)

  if (!alive())
    return
  status.value = 'idle'

  if (props.slideIndex !== undefined)
    window.dispatchEvent(new CustomEvent('typo-showcase-finished', { detail: props.slideIndex }))
}

function startSimulation() {
  status.value = 'idle'
  processingInputText.value = ''
  selectionRange.value = null
  runSimulation()
}

watch(status, () => {
  if (showTextSelection.value)
    void keepTextSelection()
})

watch(() => props.active, (isActive) => {
  if (isActive)
    startSimulation()
})

function onShowcaseSlide(event: Event) {
  if (props.slideIndex === (event as CustomEvent<number>).detail)
    startSimulation()
}

function onShowcaseReplay(event: Event) {
  if (props.slideIndex === (event as CustomEvent<number>).detail)
    startSimulation()
}

const isShowcase = computed(() => props.slideIndex !== undefined)

const indicatorBounds = computed(() => {
  const maxWidth = Math.min(hostAvailableWidth.value, INDICATOR_MAX_TOTAL_WIDTH)
  const showcaseContentCap = Math.max(160, hostAvailableWidth.value - INDICATOR_EMBEDDED_CHROME_WIDTH)
  const contentCap = isShowcase.value
    ? Math.min(INDICATOR_MAX_CONTENT_WIDTH, showcaseContentCap)
    : INDICATOR_MAX_CONTENT_WIDTH

  return {
    minWidth: INDICATOR_MIN_TOTAL_WIDTH,
    maxWidth,
    contentMaxWidth: Math.max(
      Math.min(maxWidth - INDICATOR_EMBEDDED_CHROME_WIDTH, contentCap),
      120,
    ),
  }
})

let hostResizeObserver: ResizeObserver | undefined

function observeIndicatorHostWidth() {
  hostResizeObserver?.disconnect()
  const container = computerRef.value?.$el as HTMLElement | undefined
  if (!container)
    return

  hostResizeObserver = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width
    if (!width)
      return
    const next = Math.floor(width)
    if (Math.abs(next - hostAvailableWidth.value) > 1)
      hostAvailableWidth.value = next
  })
  hostResizeObserver.observe(container)
}

onMounted(() => {
  isMacOS.value = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
  observeIndicatorHostWidth()
  if (props.slideIndex !== undefined) {
    window.addEventListener('typo-showcase-slide', onShowcaseSlide)
    window.addEventListener('typo-showcase-replay', onShowcaseReplay)
    if (props.slideIndex === 0)
      startSimulation()
    return
  }

  if (props.active !== false)
    startSimulation()
})

onUnmounted(() => {
  runId++
  hostResizeObserver?.disconnect()
  if (props.slideIndex !== undefined) {
    window.removeEventListener('typo-showcase-slide', onShowcaseSlide)
    window.removeEventListener('typo-showcase-replay', onShowcaseReplay)
  }
})
</script>

<template>
  <Computer
    ref="computerRef"
    class="h-full w-full max-w-150 max-lg:mx-auto"
    :dimmed="dimmed"
    :typo-active="showIndicator"
    :app-name="appName"
    :page-url="pageUrl"
  >
    <template #page>
      <div class="demo-page relative isolate flex h-full min-h-44 flex-col overflow-hidden rounded-md">
        <!-- Nested mini typo.yuler.cc landing page -->
        <div
          class="pointer-events-none absolute inset-0 overflow-hidden rounded-md"
          aria-hidden="true"
        >
          <span class="absolute -left-8 -top-6 size-32 rounded-full bg-blue-300/35 blur-3xl" />
          <span class="absolute -right-6 bottom-2 size-28 rounded-full bg-pink-300/35 blur-3xl" />

          <div class="flex h-full flex-col items-center gap-2 px-3 pt-5 text-center select-none">
            <span
              class="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50/80 px-2 py-0.5 text-[7px] font-medium tracking-tight text-yellow-700"
            >
              <span class="size-1 rounded-full bg-yellow-400" />
              Alpha — internal testing
            </span>
            <p class="max-w-48 text-balance text-[15px] font-bold leading-tight tracking-tight text-zinc-900">
              Instant AI text refinement
            </p>
            <p class="max-w-52 text-pretty text-[8px] leading-snug text-zinc-500">
              Select text anywhere, press a shortcut—typo replaces it with polished copy.
            </p>
          </div>
        </div>

        <textarea
          ref="textarea"
          v-model="currentText"
          readonly
          class="relative z-1 mt-auto block w-full max-w-full min-h-20 resize-none rounded-lg border border-slate-200/90 bg-white/90 px-3 pt-2.5 pb-3 text-sm leading-6 text-slate-800 shadow-sm backdrop-blur-sm outline-none overflow-y-auto"
          :class="showTextSelection && 'selection:bg-indigo-400/35 selection:text-slate-900'"
          rows="2"
          spellcheck="false"
        />
      </div>
    </template>

    <template #stage>
      <Transition
        enter-active-class="transition duration-220 ease-out"
        enter-from-class="opacity-0 translate-y-1.5"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-220 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-1.5"
      >
        <kbd
          v-if="status === 'hotkey'"
          class="pointer-events-auto inline-flex h-[1.6rem] items-center gap-1 rounded-md border border-white/20 border-b-2 bg-linear-to-b from-zinc-600 to-zinc-800 px-2 text-xs font-semibold text-zinc-100 shadow-md"
        >
          <template v-for="(key, index) in keys" :key="key">
            <span v-if="index > 0" class="text-[0.65rem] font-normal text-zinc-400">+</span>
            <span>{{ key }}</span>
          </template>
        </kbd>
      </Transition>
    </template>

    <template #hud>
      <Transition
        enter-active-class="transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-250 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div
          v-if="showIndicator"
          class="demo-indicator-host pointer-events-auto w-auto max-w-full"
          :style="{
            minWidth: `${indicatorBounds.minWidth}px`,
            maxWidth: `${indicatorBounds.maxWidth}px`,
          }"
        >
          <Indicator
            embedded
            :state="indicatorState"
            :version="version"
            :input-text="processingInputText || currentText"
            :command-name="command ?? ''"
            :result-text="resolvedText"
            :global-shortcut="globalShortcut"
            :is-mac-o-s="isMacOS"
            :copy-result="copyResult"
            :content-max-width="indicatorBounds.contentMaxWidth"
            :labels="{ copied: copiedLabel }"
          />
        </div>
      </Transition>
    </template>
  </Computer>
</template>

<style scoped>
.demo-indicator-host {
  height: v-bind(indicatorHeightPx);
}
</style>
