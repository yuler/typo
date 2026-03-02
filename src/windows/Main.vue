<script setup lang="ts">
import type { UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { currentMonitor } from '@tauri-apps/api/window'
import { check } from '@tauri-apps/plugin-updater'
import { Loader2Icon, SettingsIcon } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import { deepSeekCorrect, ollamaCorrect } from '@/ai'
import { useGlobalState } from '@/composables/useGlobalState'
import * as store from '@/store'
import { sleep } from '@/utils'

const CAPSULE_WIDTH = 200
const CAPSULE_HEIGHT = 50
const BOTTOM_OFFSET = 200

const appWindow = WebviewWindow.getCurrent()
const { setCurrentWindow } = useGlobalState()
const appVersion = __APP_VERSION__

type CapsuleState = 'idle' | 'processing' | 'result' | 'error'

const state = ref<CapsuleState>('idle')
const resultText = ref('')
const errorText = ref('')
const processing = ref(false)
const isMacOS = ref(false)

let unlistenSetInput: UnlistenFn

onMounted(async () => {
  await appWindow.setSize(new LogicalSize(300, 50))
  await appWindow.setResizable(false)
  await positionBottomCenter()

  const platform = await invoke('get_platform_info')
  isMacOS.value = platform === 'macos'

  if (isMacOS.value) {
    try {
      const trusted = await invoke('request_mac_accessibility_permissions')
      if (!trusted) {
        errorText.value = 'Enable Accessibility in System Preferences'
        state.value = 'error'
      }
    }
    catch (err) {
      console.error(err)
    }
  }

  const aiProvider = await store.get('ai_provider')
  if (aiProvider === 'deepseek' && (await store.get('deepseek_api_key')) === '') {
    setCurrentWindow('Settings')
    return
  }

  checkUpgrade()

  unlistenSetInput = await appWindow.listen('set-input', async (event: { payload: { text: string, mode: string } }) => {
    const { text, mode } = event.payload

    await appWindow.show()
    await appWindow.setFocus()

    if (mode === 'clipboard') {
      resultText.value = text
      state.value = 'result'
      return
    }

    try {
      state.value = 'processing'
      processing.value = true

      const output = await fetchCorrection(text)

      resultText.value = output
      state.value = 'result'

      await sleep(500)
      await invoke('type_text', { text: output })

      await sleep(1500)
      state.value = 'idle'
      resultText.value = ''
    }
    catch (err: any) {
      if (err.name === 'AbortError') {
        state.value = 'idle'
        return
      }
      errorText.value = err.message || 'Something went wrong'
      state.value = 'error'
      setTimeout(() => {
        state.value = 'idle'
        errorText.value = ''
      }, 3000)
    }
    finally {
      processing.value = false
    }
  })
})

onUnmounted(() => {
  unlistenSetInput?.()
})

async function positionBottomCenter() {
  const monitor = await currentMonitor()
  if (!monitor)
    return
  const scale = monitor.scaleFactor
  const screenW = monitor.size.width / scale
  const screenH = monitor.size.height / scale
  const x = (screenW - CAPSULE_WIDTH) / 2
  const y = screenH - CAPSULE_HEIGHT - BOTTOM_OFFSET
  await appWindow.setPosition(new LogicalPosition(x, y))
}

let abortController: AbortController | null = null

async function fetchCorrection(text: string): Promise<string> {
  abortController = new AbortController()
  const aiProvider = await store.get('ai_provider')
  let correct: (text: string, abortSignal?: AbortSignal) => Promise<string>
  switch (aiProvider) {
    case 'deepseek':
      correct = deepSeekCorrect
      break
    case 'ollama':
      correct = ollamaCorrect
      break
    default:
      throw new Error('Invalid AI provider')
  }
  return correct(text, abortController.signal)
}

async function checkUpgrade() {
  try {
    await check()
  }
  catch (err) {
    console.error(err)
  }
}

async function onESC() {
  if (processing.value) {
    abortController?.abort()
    state.value = 'idle'
    processing.value = false
    return
  }
  await appWindow.setAlwaysOnTop(false)
  state.value = 'idle'
  resultText.value = ''
}

function gotoSettings() {
  setCurrentWindow('Settings')
}
</script>

<template>
  <div
    data-tauri-drag-region
    class="h-full w-full flex items-center px-3 gap-3 cursor-move transition-shadow duration-300 select-none"
    :class="{
      'capsule-processing': state === 'processing',
      'capsule-result': state === 'result',
      'capsule-error': state === 'error',
    }"
    tabindex="0"
    @keydown.esc="onESC"
  >
    <!-- Left: Logo + Version -->
    <div class="relative flex flex-col items-center shrink-0 ">
      <img src="@/assets/logo.png" alt="logo" class="w-12">
      <span class="text-[8px] absolute top-1 right-0 text-muted-foreground/60">v{{ appVersion }}</span>
    </div>

    <!-- Center: Status -->
    <div class="flex-1 flex justify-center overflow-hidden min-w-0">
      <div v-if="state === 'processing'" class="flex items-center gap-2">
        <Loader2Icon class="w-4 h-4 animate-spin text-blue-400" />
        <span class="text-sm text-blue-400 animate-pulse">Processing...</span>
      </div>

      <p v-else-if="state === 'result'" class="truncate text-sm text-green-400 px-2">
        {{ resultText }}
      </p>

      <p v-else-if="state === 'error'" class="truncate text-sm text-red-400 px-2">
        {{ errorText }}
      </p>

      <kbd v-else class="px-1.5 py-0.5 rounded border border-border/50 bg-muted/30 font-mono text-[10px] text-muted-foreground/60">
        {{ isMacOS ? '⌘' : 'Ctrl' }}+Shift+X
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
