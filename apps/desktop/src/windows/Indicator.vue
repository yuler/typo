<script setup lang="ts">
import type { UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { emit } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { ClipboardCheckIcon, Loader2Icon, SettingsIcon, TerminalIcon } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import { deepSeekProcess, ollamaProcess } from '@/ai'
import AppLogo from '@/components/AppLogo.vue'

import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import { parseSlashCommands, resolveSlashCommand } from '@/slashCommands'
import { DEFAULT_GLOBAL_SHORTCUT } from '@/store'
import * as store from '@/store'
import { formatShortcut, sleep } from '@/utils'

const appWindow = getCurrentWindow()

const { t } = useI18n()

type CapsuleState = 'idle' | 'processing' | 'result' | 'error'

const state = ref<CapsuleState>('idle')
const inputText = ref('')
const commandName = ref('')
const resultText = ref('')
const errorText = ref('')
const processing = ref(false)
const isMacOS = ref(false)
const copyResult = ref(false)
const globalShortcut = ref(DEFAULT_GLOBAL_SHORTCUT)
const STATUS_DISPLAY_DURATION_MS = 1000

let unlistenSetInput: UnlistenFn
let isMounted = true

interface SetInputPayload {
  text: string
  mode: string
}

async function processSetInputPayload(payload: SetInputPayload) {
  if (processing.value || !isMounted) {
    return
  }

  const { text, mode } = payload

  logger.info('Indicator', { text, mode })

  if (!text.trim().length) {
    errorText.value = t('main.error.no_text')
    state.value = 'error'

    await sleep(STATUS_DISPLAY_DURATION_MS)
    if (!isMounted) {
      return
    }
    state.value = 'idle'
    errorText.value = ''
    commandName.value = ''
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

    if (!isMounted) {
      return
    }

    const resolved = resolveSlashCommand(
      text,
      systemPrompt,
      parseSlashCommands(shortcuts),
    )

    inputText.value = resolved.text
    commandName.value = resolved.command ?? ''

    const output = await fetchCorrection(text, resolved)

    if (!isMounted) {
      return
    }

    resultText.value = output
    state.value = 'result'

    // Paste the corrected text back into the original input area
    await invoke('keyboard_paste_text', { text: output })

    if (await store.get('copy_result')) {
      await writeText(output)
    }

    await sleep(STATUS_DISPLAY_DURATION_MS)
    if (!isMounted) {
      return
    }
    if (state.value === 'result') {
      state.value = 'idle'
      inputText.value = ''
      resultText.value = ''
      commandName.value = ''
      await appWindow.hide()
    }
  }
  catch (err: any) {
    if (!isMounted) {
      return
    }
    if (err.name === 'AbortError') {
      state.value = 'idle'
      commandName.value = ''
      return
    }
    errorText.value = (typeof err === 'string' ? err : err?.message) || t('main.error.generic')
    state.value = 'error'
    await sleep(STATUS_DISPLAY_DURATION_MS)
    if (!isMounted) {
      return
    }
    state.value = 'idle'
    errorText.value = ''
    commandName.value = ''
    await appWindow.hide()
  }
  finally {
    processing.value = false
  }
}

onMounted(async () => {
  const systemInfo = await invoke<{ os: string, is_wayland: boolean }>('get_system_info')
  if (!isMounted) {
    return
  }
  isMacOS.value = systemInfo.os === 'macos'

  const [shortcut, copy] = await Promise.all([
    store.get('global_shortcut'),
    store.get('copy_result'),
  ])
  globalShortcut.value = shortcut || DEFAULT_GLOBAL_SHORTCUT
  copyResult.value = copy as boolean
  if (!isMounted) {
    return
  }

  const unlisten = await appWindow.listen('set-input', async (event: { payload: SetInputPayload }) => {
    // Force show and focus when event received
    await appWindow.show()
    // TODO: option in settings
    // await appWindow.setFocus()
    // Clear pending input since we are processing it now via event
    await invoke('consume_pending_selection_input')
    await processSetInputPayload(event.payload)
  })

  if (!isMounted) {
    unlisten()
  }
  else {
    unlistenSetInput = unlisten
  }

  const pendingPayload = await invoke<SetInputPayload | null>('consume_pending_selection_input')
  if (!isMounted) {
    return
  }
  if (pendingPayload) {
    await processSetInputPayload(pendingPayload)
  }
})

onUnmounted(() => {
  isMounted = false
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
    commandName.value = ''
    return
  }
  state.value = 'idle'
  resultText.value = ''
  commandName.value = ''
  await appWindow.hide()
}

function gotoSettings() {
  emit('open-settings')
}
</script>

<template>
  <div
    class="h-full w-full flex items-center px-3 gap-3 transition-shadow duration-300 select-none bg-neutral-800 rounded-lg border border-white/10 overflow-hidden"
    tabindex="0"
    @keydown.esc="onESC"
  >
    <AppLogo version />

    <!-- Center: Status -->
    <div class="flex-1 flex overflow-hidden min-w-0 h-full items-center">
      <div v-if="state === 'processing'" class="flex items-center gap-2 px-2 overflow-hidden w-full">
        <div v-if="commandName" class="flex items-center gap-1 shrink-0 bg-blue-500/10 pl-1 pr-1.5 py-0.5 rounded border border-blue-500/20">
          <TerminalIcon class="w-3 h-3 text-blue-400" />
          <span class="text-[10px] font-bold text-blue-400 tracking-tight uppercase">
            {{ commandName.startsWith('/') ? commandName.slice(1) : commandName }}
          </span>
        </div>
        <Loader2Icon class="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
        <span class="truncate text-sm text-blue-100/90 shrink min-w-0 font-medium">{{ inputText }}</span>
        <span class="text-[10px] text-blue-400/40 font-mono shrink-0">{{ inputText?.length }}</span>
      </div>

      <div v-else-if="state === 'result'" class="flex items-center gap-2 px-2 overflow-hidden">
        <span class="truncate text-sm text-green-400 font-medium">{{ resultText }}</span>
        <template v-if="copyResult">
          <ClipboardCheckIcon class="w-4 h-4 text-green-400 shrink-0" />
          <span class="text-[10px] text-green-400/50 font-mono shrink-0">{{ t('main.status.copied') }}</span>
        </template>
      </div>

      <p v-else-if="state === 'error'" class="truncate text-sm text-red-400 px-2 font-medium">
        {{ errorText }}
      </p>

      <kbd v-else class="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 font-mono text-[10px] text-white/40">
        {{ formatShortcut(globalShortcut, isMacOS) }}
      </kbd>
    </div>

    <!-- Right: Settings -->
    <button
      class="shrink-0 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
      @click="gotoSettings"
    >
      <SettingsIcon class="w-4 h-4 text-white/40 hover:text-white/60" />
    </button>
  </div>
</template>
