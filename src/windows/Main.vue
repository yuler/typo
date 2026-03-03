<script setup lang="ts">
import type { UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { check } from '@tauri-apps/plugin-updater'
import { Loader2Icon, SettingsIcon } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import { deepSeekCorrect, ollamaCorrect } from '@/ai'
import Logo from '@/components/Logo.vue'
import { useGlobalState } from '@/composables/useGlobalState'
import * as store from '@/store'
import { sleep } from '@/utils'

const appWindow = WebviewWindow.getCurrent()
const { setCurrentWindow } = useGlobalState()

type CapsuleState = 'idle' | 'processing' | 'result' | 'error'

const state = ref<CapsuleState>('idle')
const inputText = ref('')
const resultText = ref('')
const errorText = ref('')
const processing = ref(false)
const isMacOS = ref(false)

let unlistenSetInput: UnlistenFn

onMounted(async () => {
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
      inputText.value = text

      const output = await fetchCorrection(text)

      resultText.value = output
      state.value = 'result'

      await sleep(500)
      await invoke('type_text', { text: output })

      await sleep(1500)
      state.value = 'idle'
      inputText.value = ''
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
  state.value = 'idle'
  resultText.value = ''
}

function gotoSettings() {
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
    <div class="flex-1 flex overflow-hidden min-w-0">
      <div v-if="state === 'processing'" class="flex items-center gap-2 px-2 overflow-hidden">
        <Loader2Icon class="w-4 h-4 animate-spin text-blue-400 shrink-0" />
        <span class="truncate text-sm text-blue-400/70">{{ inputText }}</span>
        <span class="text-[10px] text-blue-400/40 font-mono shrink-0">{{ inputText?.length }}</span>
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
