<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { Check, Copy, CornerDownLeft, X } from 'lucide-vue-next'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { deepSeekProcess, ollamaProcess, typoProcess } from '@/ai'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'

const { t } = useI18n()
const appWindow = getCurrentWebviewWindow()

const state = ref<'processing' | 'result' | 'error'>('processing')
const resultText = ref('')
const errorText = ref('')
const copied = ref(false)
const insertButtonRef = ref<HTMLButtonElement | null>(null)

watch(state, async (newState) => {
  if (newState === 'result') {
    await nextTick()
    insertButtonRef.value?.focus()
  }
})

let unlisten: (() => void) | undefined
let unlistenWindowOpened: (() => void) | undefined
let unlistenFocusChanged: (() => void) | undefined
let abortController: AbortController | null = null
let isMounted = true

async function fetchCorrection(payload: { text: string, prompt: string, command?: string }): Promise<string> {
  const aiProvider = await invoke<string>('get_local_ai_provider')
  let process: (text: string, abortSignal?: AbortSignal, preResolved?: { text: string, prompt: string, command?: string }) => Promise<string>

  switch (aiProvider) {
    case 'typo':
      process = typoProcess
      break
    case 'deepseek':
      process = deepSeekProcess
      break
    case 'ollama':
      process = ollamaProcess
      break
    default:
      throw new Error(t('main.error.invalid_ai'))
  }

  abortController = new AbortController()
  return process(payload.text, abortController.signal, payload)
}

async function startProcessing(payload: { text: string, prompt: string, command: string }) {
  abortController?.abort()
  abortController = null
  copied.value = false
  try {
    state.value = 'processing'
    resultText.value = ''
    errorText.value = ''
    const output = await fetchCorrection(payload)
    resultText.value = output
    state.value = 'result'
  }
  catch (err: any) {
    logger.error('QuickPickResult', 'Processing failed', err)
    errorText.value = (typeof err === 'string' ? err : err?.message) || t('main.error.generic')
    state.value = 'error'
  }
}

async function copyToClipboard() {
  if (!resultText.value)
    return
  try {
    await writeText(resultText.value)
    copied.value = true
    setTimeout(async () => {
      await hideWindow()
      copied.value = false
    }, 1000)
  } catch (err) {
    logger.error('QuickPickResult', 'Failed to copy to clipboard', err)
  }
}

async function insertText() {
  if (!resultText.value)
    return
  try {
    await hideWindow()
    setTimeout(async () => {
      try {
        await invoke('keyboard_paste_text', { text: resultText.value })
      } catch (err) {
        logger.error('QuickPickResult', 'Failed to insert text after hide', err)
      }
    }, 150)
  }
  catch (err) {
    logger.error('QuickPickResult', 'Failed to hide window for insert', err)
  }
}

async function hideWindow() {
  try {
    await appWindow.hide()
  }
  catch (err) {
    logger.error('QuickPickResult', 'failed to hide window', err)
  }
}

function close() {
  abortController?.abort()
  void hideWindow()
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape')
    close()
}

function consumeCachedPayload() {
  const cached = localStorage.getItem('quick-pick-payload')
  if (!cached)
    return

  localStorage.removeItem('quick-pick-payload')
  try {
    void startProcessing(JSON.parse(cached))
  }
  catch (err) {
    logger.error('QuickPickResult', 'failed to parse cached payload', err)
  }
}

onMounted(async () => {
  // QuickPick.vue writes the payload to localStorage before opening this
  // window, so we can process it immediately on mount without waiting for an
  // event (which could be emitted before this window finished loading).
  if (await appWindow.isVisible())
    consumeCachedPayload()

  // Keep the event listener as a fallback for any future callers.
  const unsubscribe = await listen<{ text: string, prompt: string, command: string }>('start-process', (event) => {
    logger.info('QuickPickResult', 'start-process received', event.payload.command)
    startProcessing(event.payload)
  })

  if (!isMounted)
    unsubscribe()
  else
    unlisten = unsubscribe

  const unsubscribeWindowOpened = await listen('quick-pick-result-window-opened', () => {
    consumeCachedPayload()
  })
  if (!isMounted)
    unsubscribeWindowOpened()
  else
    unlistenWindowOpened = unsubscribeWindowOpened

  const unsubscribeFocusChanged = await appWindow.onFocusChanged(({ payload: focused }) => {
    if (!focused && state.value !== 'processing')
      void hideWindow()
  })
  if (!isMounted)
    unsubscribeFocusChanged()
  else
    unlistenFocusChanged = unsubscribeFocusChanged

  window.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('keydown', onKeyDown, true)
})

onUnmounted(() => {
  isMounted = false
  abortController?.abort()
  window.removeEventListener('keydown', onKeyDown, true)
  document.removeEventListener('keydown', onKeyDown, true)
  if (unlisten)
    unlisten()
  if (unlistenWindowOpened)
    unlistenWindowOpened()
  if (unlistenFocusChanged)
    unlistenFocusChanged()
})
</script>

<template>
  <div
    class="quick-pick-result-shell h-screen w-screen p-0.5"
    :class="{ 'quick-pick-result-shell--processing': state === 'processing' }"
  >
    <div
      class="flex flex-col h-full w-full rounded-xl overflow-hidden shadow-2xl relative z-10"
      :class="state === 'processing' ? 'bg-zinc-950 text-zinc-100 border border-zinc-800' : 'bg-white text-zinc-900 border border-zinc-200'"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-4 py-2 border-b"
        :class="state === 'processing' ? 'border-zinc-800 bg-zinc-900/50 text-zinc-400' : 'border-zinc-200 bg-zinc-50 text-zinc-500'"
      >
        <span class="text-xs font-medium">
          {{ t('main.quick_pick.result_title') || 'Quick Pick Result' }}
        </span>
        <button
          v-if="state !== 'processing'"
          class="text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
          tabindex="3"
          @click="close"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-hidden relative">
        <div v-if="state === 'processing'" class="flex flex-col items-center justify-center h-full space-y-4">
          <div class="w-8 h-8 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin" />
          <p class="text-sm text-zinc-400 font-medium">
            {{ t('main.status.processing') || 'Processing...' }}
          </p>
        </div>

        <ScrollArea v-else-if="state === 'result'" class="h-full">
          <div class="p-4">
            <pre class="text-sm whitespace-pre-wrap font-sans leading-relaxed text-zinc-900 selection:bg-zinc-200">{{ resultText }}</pre>
          </div>
        </ScrollArea>

        <div v-else-if="state === 'error'" class="p-8 text-center flex flex-col items-center justify-center h-full space-y-4">
          <p class="text-red-500 text-sm">
            {{ errorText }}
          </p>
          <button
            class="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 rounded-lg text-xs transition-colors cursor-pointer"
            tabindex="1"
            @click="close"
          >
            {{ t('main.action.close') || 'Close' }}
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div
        v-if="state === 'processing'"
        class="px-4 py-2 border-t"
        :class="state === 'processing' ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'"
      >
        <p class="text-[11px] text-zinc-500">
          Press Esc to cancel
        </p>
      </div>
      <div v-else-if="state === 'result'" class="px-4 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-2">
        <button
          class="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg text-xs transition-colors border border-zinc-200 cursor-pointer"
          tabindex="2"
          @click="copyToClipboard"
        >
          <component :is="copied ? Check : Copy" class="w-3.5 h-3.5" :class="copied ? 'text-green-600' : ''" />
          {{ copied ? (t('main.status.copied') || 'Copied') : (t('main.action.copy') || 'Copy') }}
        </button>
        <button
          ref="insertButtonRef"
          class="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs transition-colors border border-transparent shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          tabindex="1"
          @click="insertText"
        >
          <CornerDownLeft class="w-3.5 h-3.5" />
          {{ t('main.action.insert') || 'Insert' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
:global(html) {
  color-scheme: light !important;
}

:global(body) {
  color-scheme: light !important;
  background-color: transparent !important;
}

.quick-pick-result-shell {
  position: relative;
  border-radius: 0.75rem; /* rounded-xl matches 0.75rem */
  background-color: transparent;
  overflow: hidden;
}

.quick-pick-result-shell--processing::after {
  position: absolute;
  inset: 0;
  content: "";
  pointer-events: none;
  border-radius: inherit;
  z-index: 0;
  background-color: rgb(9 9 11);
}

.quick-pick-result-shell--processing::before {
  position: absolute;
  inset: 0;
  padding: 2px;
  content: "";
  pointer-events: none;
  border-radius: inherit;
  z-index: 1;
  background:
    conic-gradient(
      from var(--indicator-runner-angle, 0deg),
      rgba(59, 130, 246, 0) 0deg,
      rgba(59, 130, 246, 0) 310deg,
      rgba(59, 130, 246, 0.95) 318deg,
      rgba(59, 130, 246, 0.95) 336deg,
      rgba(59, 130, 246, 0) 344deg,
      rgba(59, 130, 246, 0) 360deg
    );
  filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.35));
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  animation: indicator-border-runner 3.6s linear infinite;
}

@property --indicator-runner-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@keyframes indicator-border-runner {
  to {
    --indicator-runner-angle: 360deg;
  }
}
</style>
