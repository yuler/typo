<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { Check, Copy, X } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
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

let unlisten: (() => void) | undefined
let unlistenWindowOpened: (() => void) | undefined
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
  await writeText(resultText.value)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

function close() {
  abortController?.abort()
  appWindow.hide()
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

  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  isMounted = false
  abortController?.abort()
  window.removeEventListener('keydown', onKeyDown)
  if (unlisten)
    unlisten()
  if (unlistenWindowOpened)
    unlistenWindowOpened()
})
</script>

<template>
  <div class="flex flex-col h-screen w-screen bg-white text-slate-900 border border-slate-200 rounded-xl overflow-hidden shadow-2xl">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
      <span class="text-xs font-medium text-slate-500">
        {{ t('main.quick_pick.result_title') || 'Quick Pick Result' }}
      </span>
      <button class="text-slate-400 hover:text-slate-900 transition-colors" @click="close">
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden relative">
      <div v-if="state === 'processing'" class="flex flex-col items-center justify-center h-full space-y-4">
        <div class="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p class="text-sm text-slate-500">
          {{ t('main.status.processing') || 'Processing...' }}
        </p>
      </div>

      <ScrollArea v-else-if="state === 'result'" class="h-full">
        <div class="p-4">
          <pre class="text-sm whitespace-pre-wrap font-sans leading-relaxed text-slate-900 selection:bg-slate-200">{{ resultText }}</pre>
        </div>
      </ScrollArea>

      <div v-else-if="state === 'error'" class="p-8 text-center flex flex-col items-center justify-center h-full space-y-4">
        <p class="text-red-500 text-sm">
          {{ errorText }}
        </p>
        <button
          class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 rounded-lg text-xs transition-colors"
          @click="close"
        >
          {{ t('main.action.close') || 'Close' }}
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div v-if="state === 'result'" class="px-4 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
      <button
        class="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-xs transition-colors border border-slate-200"
        @click="copyToClipboard"
      >
        <component :is="copied ? Check : Copy" class="w-3.5 h-3.5" :class="copied ? 'text-green-600' : ''" />
        {{ copied ? (t('main.status.copied') || 'Copied') : (t('main.action.copy') || 'Copy') }}
      </button>
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
</style>
