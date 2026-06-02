<script setup lang="ts">
import { listen } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { Check, Copy, X } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import { deepSeekProcess, ollamaProcess, typoProcess } from '@/ai'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import * as store from '@/stores/settings'

const { t } = useI18n()
const appWindow = getCurrentWebviewWindow()

const state = ref<'processing' | 'result' | 'error'>('processing')
const resultText = ref('')
const errorText = ref('')
const copied = ref(false)

let unlisten: (() => void) | undefined

async function fetchCorrection(payload: { text: string, prompt: string, command?: string }): Promise<string> {
  const aiProvider = await store.get('ai_provider')
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

  return process(payload.text, undefined, payload)
}

async function startProcessing(payload: { text: string, prompt: string, command: string }) {
  try {
    state.value = 'processing'
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
  appWindow.close()
}

onMounted(async () => {
  unlisten = await listen<{ text: string, prompt: string, command: string }>('start-process', (event) => {
    logger.info('QuickPickResult', 'start-process received', event.payload.command)
    startProcessing(event.payload)
  })

  // Also try to consume pending input if start-process was missed
  // but usually QuickPick.vue emits it after window is open.

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape')
      close()
  })
})

onUnmounted(() => {
  if (unlisten)
    unlisten()
})
</script>

<template>
  <div class="flex flex-col h-screen w-screen bg-neutral-900 text-white border border-white/10 rounded-xl overflow-hidden shadow-2xl">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/5">
      <span class="text-xs font-medium text-neutral-400">
        {{ t('main.quick_pick.result_title') || 'Quick Pick Result' }}
      </span>
      <button class="text-neutral-500 hover:text-white transition-colors" @click="close">
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden relative">
      <div v-if="state === 'processing'" class="flex flex-col items-center justify-center h-full space-y-4">
        <div class="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p class="text-sm text-neutral-400">
          {{ t('main.status.processing') || 'Processing...' }}
        </p>
      </div>

      <ScrollArea v-else-if="state === 'result'" class="h-full">
        <div class="p-4">
          <pre class="text-sm whitespace-pre-wrap font-sans leading-relaxed selection:bg-white/20">{{ resultText }}</pre>
        </div>
      </ScrollArea>

      <div v-else-if="state === 'error'" class="p-8 text-center flex flex-col items-center justify-center h-full space-y-4">
        <p class="text-red-400 text-sm">
          {{ errorText }}
        </p>
        <button
          class="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs transition-colors"
          @click="close"
        >
          {{ t('main.action.close') || 'Close' }}
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div v-if="state === 'result'" class="px-4 py-3 border-t border-white/5 bg-white/5 flex justify-end gap-2">
      <button
        class="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs transition-colors border border-white/5"
        @click="copyToClipboard"
      >
        <component :is="copied ? Check : Copy" class="w-3.5 h-3.5" :class="copied ? 'text-green-400' : ''" />
        {{ copied ? (t('main.status.copied') || 'Copied') : (t('main.action.copy') || 'Copy') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
:global(body) {
  background-color: transparent !important;
}
</style>
