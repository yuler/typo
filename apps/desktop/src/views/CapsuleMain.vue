<script setup lang="ts">
import type { UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { ClipboardCheckIcon, Loader2Icon, SettingsIcon, TerminalIcon } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import { deepSeekProcess, ollamaProcess } from '@/ai'
import Logo from '@/components/Logo.vue'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import { parseSlashCommands, resolveSlashCommand } from '@/slashCommands'
import { DEFAULT_GLOBAL_SHORTCUT } from '@/store'
import * as store from '@/store'
import { formatShortcut, sleep } from '@/utils'

const appWindow = getCurrentWebviewWindow()
const { t } = useI18n()

type CapsuleState = 'idle' | 'processing' | 'result' | 'error'

const state = ref<CapsuleState>('idle')
const inputText = ref('')
const commandName = ref('')
const resultText = ref('')
const errorText = ref('')
const processing = ref(false)
const isMacOS = ref(false)
const globalShortcut = ref(DEFAULT_GLOBAL_SHORTCUT)
const STATUS_DISPLAY_DURATION_MS = 2500

let unlistenSetInput: UnlistenFn

interface SetInputPayload {
  text: string
  mode: string
}

async function processSetInputPayload(payload: SetInputPayload) {
  if (processing.value)
    return

  const { text, mode } = payload
  logger.info('CapsuleMain', { text, mode })

  if (!text.trim().length) {
    errorText.value = t('main.error.no_text')
    state.value = 'error'
    await sleep(STATUS_DISPLAY_DURATION_MS)
    state.value = 'idle'
    errorText.value = ''
    await appWindow.hide()
    return
  }

  try {
    state.value = 'processing'
    processing.value = true

    const [systemPrompt, shortcuts] = await Promise.all([
      store.get('ai_system_prompt'),
      store.get('slash_commands'),
    ])

    const resolved = resolveSlashCommand(
      text,
      systemPrompt,
      parseSlashCommands(shortcuts),
    )

    inputText.value = resolved.text
    commandName.value = resolved.command ?? ''

    const output = await fetchCorrection(text, resolved)

    resultText.value = output
    state.value = 'result'

    await invoke('keyboard_paste_text', { text: output })
    await writeText(output)

    await sleep(STATUS_DISPLAY_DURATION_MS)
    if (state.value === 'result') {
      state.value = 'idle'
      inputText.value = ''
      resultText.value = ''
      commandName.value = ''
      await appWindow.hide()
    }
  }
  catch (err: any) {
    if (err.name === 'AbortError') {
      state.value = 'idle'
      return
    }
    errorText.value = err.message || t('main.error.generic')
    state.value = 'error'
    await sleep(STATUS_DISPLAY_DURATION_MS)
    state.value = 'idle'
    await appWindow.hide()
  }
  finally {
    processing.value = false
  }
}

onMounted(async () => {
  const systemInfo = await invoke<{ os: string, is_wayland: boolean }>('get_system_info')
  isMacOS.value = systemInfo.os === 'macos'

  globalShortcut.value = (await store.get('global_shortcut')) || DEFAULT_GLOBAL_SHORTCUT

  unlistenSetInput = await appWindow.listen('set-input', async (event: { payload: SetInputPayload }) => {
    await appWindow.show()
    await processSetInputPayload(event.payload)
  })

  const pendingPayload = await invoke<SetInputPayload | null>('consume_pending_selection_input')
  if (pendingPayload) {
    await processSetInputPayload(pendingPayload)
  }
})

onUnmounted(() => {
  unlistenSetInput?.()
})

let abortController: AbortController | null = null

async function fetchCorrection(text: string, preResolved?: { text: string, systemPrompt: string, command?: string }): Promise<string> {
  abortController = new AbortController()
  const aiProvider = await store.get('ai_provider')
  let process: (text: string, abortSignal?: AbortSignal, preResolved?: { text: string, systemPrompt: string, command?: string }) => Promise<string>
  switch (aiProvider) {
    case 'deepseek':
      process = deepSeekProcess
      break
    case 'ollama':
      process = ollamaProcess
      break
    default:
      throw new Error(t('main.error.invalid_ai'))
  }
  return process(text, abortController.signal, preResolved)
}

async function onESC() {
  if (processing.value) {
    abortController?.abort()
    state.value = 'idle'
    processing.value = false
    return
  }
  await appWindow.hide()
}

function openSettings() {
  invoke('open_settings_window')
}
</script>

<template>
  <div
    class="capsule-container glass h-full w-full flex items-center px-4 gap-3 select-none overflow-hidden"
    :class="{
      'border-blue-500/50': state === 'processing',
      'border-green-500/50': state === 'result',
      'border-red-500/50': state === 'error',
    }"
    tabindex="0"
    @keydown.esc="onESC"
  >
    <Logo class="shrink-0" />

    <div class="flex-1 flex items-center overflow-hidden h-full">
      <!-- Processing State -->
      <div v-if="state === 'processing'" class="flex items-center gap-2 w-full">
        <div v-if="commandName" class="flex items-center gap-1 shrink-0 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">
          <TerminalIcon class="w-3 h-3 text-blue-400" />
          <span class="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">
            {{ commandName.replace('/', '') }}
          </span>
        </div>
        <Loader2Icon class="w-4 h-4 animate-spin text-blue-400 shrink-0" />
        <span class="truncate text-sm text-blue-100/90">{{ inputText }}</span>
        <span class="text-[10px] text-blue-400/50 font-mono ml-auto">{{ inputText?.length }}</span>
      </div>

      <!-- Result State -->
      <div v-else-if="state === 'result'" class="flex items-center gap-2 w-full">
        <span class="truncate text-sm text-green-100/90">{{ resultText }}</span>
        <ClipboardCheckIcon class="w-4 h-4 text-green-400 shrink-0 ml-auto" />
      </div>

      <!-- Error State -->
      <div v-else-if="state === 'error'" class="flex items-center gap-2 w-full">
        <span class="truncate text-sm text-red-400">{{ errorText }}</span>
      </div>

      <!-- Idle State -->
      <div v-else class="flex items-center justify-between w-full">
        <span class="text-sm text-gray-400">{{ t('main.status.ready') || 'Ready' }}</span>
        <kbd class="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 font-mono text-[10px] text-gray-500">
          {{ formatShortcut(globalShortcut, isMacOS) }}
        </kbd>
      </div>
    </div>

    <button
      class="shrink-0 p-1.5 rounded-full hover:bg-white/10 transition-colors"
      @click="openSettings"
    >
      <SettingsIcon class="w-4 h-4 text-gray-500 hover:text-gray-300" />
    </button>
  </div>
</template>

<style scoped>
.capsule-container {
  border-radius: 28px;
  background: rgba(20, 20, 20, 0.85);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass {
  backdrop-filter: blur(12px) saturate(180%);
}
</style>
