<script setup lang="ts">
import type { UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { ClipboardCheckIcon, Loader2Icon, SettingsIcon, TerminalIcon } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import { deepSeekProcess, ollamaProcess } from '@/ai'
import Logo from '@/components/Logo.vue'
import { useGlobalState } from '@/composables/useGlobalState'
import { useI18n } from '@/composables/useI18n'
import { parseSlashCommands, resolveSlashCommand } from '@/slashCommands'
import { DEFAULT_GLOBAL_SHORTCUT } from '@/store'
import * as store from '@/store'
import { formatShortcut, sleep } from '@/utils'

const appWindow = getCurrentWindow()
const { setCurrentWindow, setSettingsTab } = useGlobalState()
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
let unlistenTrayToggle: UnlistenFn

interface SetInputPayload {
  text: string
  mode: string
}

async function processSetInputPayload(payload: SetInputPayload) {
  if (processing.value)
    return

  const { text, mode } = payload

  // eslint-disable-next-line no-console
  console.debug({ text, mode })

  if (!text.trim().length) {
    errorText.value = t('main.error.no_text')
    state.value = 'error'

    await sleep(STATUS_DISPLAY_DURATION_MS)
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

    // Paste the corrected text back into the original input area
    await invoke('keyboard_paste_text', { text: output })

    // TODO: add option for this， Copy result to clipboard
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
      commandName.value = ''
      return
    }
    errorText.value = err.message || t('main.error.generic')
    state.value = 'error'
    await sleep(STATUS_DISPLAY_DURATION_MS)
    state.value = 'idle'
    errorText.value = ''
    commandName.value = ''
    await appWindow.hide()
  }
  finally {
    processing.value = false
  }
}

let unlistenFocus: UnlistenFn
let suppressBlurHideUntil = 0
const TRAY_TOGGLE_BLUR_GUARD_MS = 250

onMounted(async () => {
  const systemInfo = await invoke<{ os: string, is_wayland: boolean }>('get_system_info')
  isMacOS.value = systemInfo.os === 'macos'

  if (isMacOS.value) {
    try {
      const trusted = await invoke('request_mac_accessibility_permissions')
      if (!trusted) {
        errorText.value = t('main.error.accessibility')
        state.value = 'error'
      }
    }
    catch (err) {
      console.error(err)
    }
  }

  globalShortcut.value = (await store.get('global_shortcut')) || DEFAULT_GLOBAL_SHORTCUT

  const aiProvider = await store.get('ai_provider')
  if (aiProvider === 'deepseek' && (await store.get('deepseek_api_key')) === '') {
    setCurrentWindow('Settings')
    return
  }

  unlistenSetInput = await appWindow.listen('set-input', async (event: { payload: SetInputPayload }) => {
    // Force show and focus when event received
    await appWindow.show()
    // TODO: option in settings
    // await appWindow.setFocus()
    // Clear pending input since we are processing it now via event
    await invoke('consume_pending_selection_input')
    await processSetInputPayload(event.payload)
  })

  unlistenTrayToggle = await appWindow.listen('tray:toggle-clicked', () => {
    suppressBlurHideUntil = Date.now() + TRAY_TOGGLE_BLUR_GUARD_MS
  })

  unlistenFocus = await appWindow.onFocusChanged(({ payload: focused }) => {
    if (Date.now() < suppressBlurHideUntil) {
      return
    }
    if (!focused && state.value !== 'processing') {
      appWindow.hide()
    }
  })

  const pendingPayload = await invoke<SetInputPayload | null>('consume_pending_selection_input')
  if (pendingPayload) {
    await processSetInputPayload(pendingPayload)
  }
})

onUnmounted(() => {
  unlistenSetInput?.()
  unlistenTrayToggle?.()
  unlistenFocus?.()
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
  setSettingsTab('basic')
  setCurrentWindow('Settings')
}
</script>

<template>
  <div
    class="h-full w-full flex items-center px-3 gap-3 cursor-move transition-shadow duration-300 select-none"
    :class="{
      'capsule-processing': state === 'processing',
      'capsule-result': state === 'result',
      'capsule-error': state === 'error',
    }"
    tabindex="0"
    @keydown.esc="onESC"
  >
    <Logo />

    <!-- Center: Status -->
    <div class="flex-1 flex overflow-hidden min-w-0 h-full items-center">
      <div v-if="state === 'processing'" class="flex items-center gap-2 px-2 overflow-hidden w-full">
        <div v-if="commandName" class="flex items-center gap-1 shrink-0 bg-blue-400/10 pl-1 pr-1.5 py-0.5 rounded border border-blue-400/20">
          <TerminalIcon class="w-3 h-3 text-blue-400/60" />
          <span class="text-[10px] font-bold text-blue-400/80 tracking-tight uppercase">
            {{ commandName.startsWith('/') ? commandName.slice(1) : commandName }}
          </span>
        </div>
        <Loader2Icon class="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
        <span class="truncate text-sm text-blue-400/70 shrink min-w-0">{{ inputText }}</span>
        <span class="text-[10px] text-blue-400/40 font-mono shrink-0">{{ inputText?.length }}</span>
      </div>

      <div v-else-if="state === 'result'" class="flex items-center gap-2 px-2 overflow-hidden">
        <span class="truncate text-sm text-green-400">{{ resultText }}</span>
        <!-- TODO: Add option for this -->
        <ClipboardCheckIcon class="w-4 h-4 text-green-400 shrink-0" />
        <span class="text-[10px] text-green-400/50 font-mono shrink-0">{{ t('main.status.copied') }}</span>
      </div>

      <p v-else-if="state === 'error'" class="truncate text-sm text-red-400 px-2">
        {{ errorText }}
      </p>

      <kbd v-else class="px-1.5 py-0.5 rounded border border-border/50 bg-muted/30 font-mono text-[10px] text-muted-foreground/60">
        {{ formatShortcut(globalShortcut, isMacOS) }}
      </kbd>
    </div>

    <!-- Right: Settings -->
    <button
      class="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
      @click="gotoSettings"
    >
      <SettingsIcon class="w-4 h-4 text-muted-foreground" />
    </button>
  </div>
</template>

<style scoped>
.capsule-processing {
  box-shadow:
    0 0 20px rgba(59, 130, 246, 0.3),
    inset 0 0 20px rgba(59, 130, 246, 0.05);
}

.capsule-result {
  box-shadow:
    0 0 20px rgba(34, 197, 94, 0.3),
    inset 0 0 20px rgba(34, 197, 94, 0.05);
}

.capsule-error {
  box-shadow:
    0 0 20px rgba(239, 68, 68, 0.3),
    inset 0 0 20px rgba(239, 68, 68, 0.05);
}
</style>
