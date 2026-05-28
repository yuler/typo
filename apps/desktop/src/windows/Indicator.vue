<script setup lang="ts">
import type { UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { LogicalSize } from '@tauri-apps/api/dpi'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { ClipboardCheckIcon, Loader2Icon, SettingsIcon, TerminalIcon } from 'lucide-vue-next'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { deepSeekProcess, ollamaProcess, typoProcess } from '@/ai'
import AppLogo from '@/components/AppLogo.vue'

import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import { listenForIndicatorShortcutRequests, setupGlobalShortcut } from '@/shortcut'
import { parseSlashPrompts, resolveSlashPrompt } from '@/slashPrompts'
import { DEFAULT_GLOBAL_SHORTCUT } from '@/stores/settings'
import * as store from '@/stores/settings'
import { PIN_INDICATOR_CHANGED_EVENT } from '@/tray'
import { formatShortcut, sleep } from '@/utils'

const appWindow = getCurrentWindow()

const { t } = useI18n()
const { login } = useAuth()

type CapsuleState = 'idle' | 'processing' | 'result' | 'error'

const state = ref<CapsuleState>('idle')
const isRateLimited = ref(false)
const inputText = ref('')
const commandName = ref('')
const resultText = ref('')
const errorText = ref('')
const processing = ref(false)
const isMacOS = ref(false)
const copyResult = ref(false)
const pinIndicator = ref(false)
const globalShortcut = ref(DEFAULT_GLOBAL_SHORTCUT)
const STATUS_DISPLAY_DURATION_MS = 1000
const INDICATOR_MIN_IDLE_WIDTH = 180
const INDICATOR_MAX_ACTIVE_WIDTH = 520
const INDICATOR_MAX_CONTENT_WIDTH = 390
const INDICATOR_CHROME_WIDTH = 106
const INDICATOR_HEIGHT = 60

let unlistenSetInput: UnlistenFn
let unlistenShortcutRequests: (() => void) | undefined
let unlistenPinIndicator: UnlistenFn | undefined
let currentIndicatorWidth = 0
let targetIndicatorWidth = 0
let resizeAnimationFrame = 0
let measureCanvasContext: CanvasRenderingContext2D | null = null
let isMounted = true

watch([state, pinIndicator, inputText, resultText, errorText, commandName, copyResult, globalShortcut], () => {
  void updateIndicatorSize()
}, { flush: 'post' })

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
    await hideIndicator()
    return
  }

  try {
    state.value = 'processing'
    isRateLimited.value = false
    processing.value = true

    const [default_prompt, slash_prompts, copy] = await Promise.all([
      store.get('default_prompt'),
      store.get('slash_prompts'),
      store.get('copy_result'),
    ])

    copyResult.value = copy as boolean

    if (!isMounted) {
      return
    }

    const resolved = resolveSlashPrompt(
      text,
      default_prompt,
      parseSlashPrompts(slash_prompts),
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

    if (copyResult.value) {
      try {
        await writeText(output)
      }
      catch (err) {
        logger.error('Indicator', 'Failed to copy to clipboard', err)
      }
    }

    await sleep(STATUS_DISPLAY_DURATION_MS)
    if (state.value === 'result') {
      await hideIndicator()
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

    const msg = (typeof err === 'string' ? err : err?.message) || ''
    if (msg.includes('429') || msg.toLowerCase().includes('rate limit exceeded')) {
      errorText.value = t('main.error.rate_limit')
      isRateLimited.value = true
    }
    else {
      errorText.value = msg || t('main.error.generic')
      isRateLimited.value = false
    }

    state.value = 'error'
    if (isRateLimited.value) {
      await sleep(STATUS_DISPLAY_DURATION_MS * 15)
    }
    else {
      await sleep(STATUS_DISPLAY_DURATION_MS * 2)
    }
    await hideIndicator()
  }
  finally {
    processing.value = false
  }
}

onMounted(async () => {
  const systemInfo = await invoke<{ os: string, version: string, is_wayland: boolean }>('get_system_info')
  if (!isMounted) {
    return
  }

  isMacOS.value = systemInfo.os === 'macos'

  const [shortcut, copy, pinned] = await Promise.all([
    store.get('global_shortcut'),
    store.get('copy_result'),
    store.get('pin_indicator'),
  ])
  globalShortcut.value = shortcut || DEFAULT_GLOBAL_SHORTCUT
  copyResult.value = copy as boolean
  pinIndicator.value = pinned as boolean
  await updateIndicatorSize()
  if (pinIndicator.value) {
    await appWindow.show()
  }
  globalShortcut.value = await setupGlobalShortcut(globalShortcut.value)
  if (!isMounted) {
    return
  }

  const unlistenPin = await listen<boolean>(PIN_INDICATOR_CHANGED_EVENT, async (event) => {
    pinIndicator.value = event.payload
    if (pinIndicator.value) {
      await updateIndicatorSize()
      await appWindow.show()
    }
    else if (state.value === 'idle' && !processing.value) {
      await appWindow.hide()
    }
  })
  if (!isMounted) {
    unlistenPin()
    return
  }
  unlistenPinIndicator = unlistenPin

  const cleanupShortcutRequests = await listenForIndicatorShortcutRequests((shortcut) => {
    globalShortcut.value = shortcut || DEFAULT_GLOBAL_SHORTCUT
  })
  if (!isMounted) {
    cleanupShortcutRequests()
    return
  }
  unlistenShortcutRequests = cleanupShortcutRequests

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
  if (resizeAnimationFrame) {
    cancelAnimationFrame(resizeAnimationFrame)
  }
  unlistenSetInput?.()
  unlistenShortcutRequests?.()
  unlistenPinIndicator?.()
})

let abortController: AbortController | null = null

async function fetchCorrection(text: string, preResolved?: { text: string, prompt: string, command?: string }): Promise<string> {
  abortController = new AbortController()
  const signal = abortController.signal

  const mockPrefixMatch = text.match(/^\s*\/mock\b/)
  if (import.meta.env.DEV && mockPrefixMatch) {
    const mockPayload = text.slice(mockPrefixMatch[0].length).trim()
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      let timeout: ReturnType<typeof setTimeout>
      const onAbort = () => {
        clearTimeout(timeout)
        signal.removeEventListener('abort', onAbort)
        reject(new DOMException('Aborted', 'AbortError'))
      }
      timeout = setTimeout(() => {
        signal.removeEventListener('abort', onAbort)
        resolve()
      }, 5000)
      signal.addEventListener('abort', onAbort)
    })
    return mockPayload || 'Mock Result'
  }
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
  return process(text, abortController.signal, preResolved)
}

async function hideIndicator() {
  if (!isMounted)
    return

  state.value = 'idle'
  isRateLimited.value = false
  inputText.value = ''
  resultText.value = ''
  errorText.value = ''
  commandName.value = ''
  if (pinIndicator.value) {
    await updateIndicatorSize()
    await appWindow.show()
    return
  }
  await appWindow.hide()
}

async function updateIndicatorSize() {
  if (!isMounted)
    return

  await nextTick()

  const contentWidth = Math.min(estimateIndicatorContentWidth(), INDICATOR_MAX_CONTENT_WIDTH)

  let width = Math.max(contentWidth + INDICATOR_CHROME_WIDTH, INDICATOR_MIN_IDLE_WIDTH)
  if (state.value !== 'idle') {
    width = Math.min(
      Math.max(contentWidth + INDICATOR_CHROME_WIDTH, INDICATOR_MIN_IDLE_WIDTH),
      INDICATOR_MAX_ACTIVE_WIDTH,
    )
  }

  if (width === targetIndicatorWidth)
    return

  animateIndicatorWidth(width)
}

function animateIndicatorWidth(width: number) {
  if (!isMounted)
    return

  targetIndicatorWidth = width

  if (!currentIndicatorWidth) {
    currentIndicatorWidth = width
    void appWindow.setSize(new LogicalSize(width, INDICATOR_HEIGHT))
    return
  }

  if (resizeAnimationFrame) {
    cancelAnimationFrame(resizeAnimationFrame)
  }

  const startWidth = currentIndicatorWidth
  const delta = width - startWidth
  const startTime = performance.now()
  const duration = 160

  function tick(now: number) {
    if (!isMounted)
      return

    const progress = Math.min((now - startTime) / duration, 1)
    const eased = 1 - (1 - progress) ** 3
    const nextWidth = Math.round(startWidth + delta * eased)

    if (nextWidth !== currentIndicatorWidth) {
      currentIndicatorWidth = nextWidth
      void appWindow.setSize(new LogicalSize(nextWidth, INDICATOR_HEIGHT))
    }

    if (progress < 1) {
      resizeAnimationFrame = requestAnimationFrame(tick)
    }
    else {
      resizeAnimationFrame = 0
      currentIndicatorWidth = width
      void appWindow.setSize(new LogicalSize(width, INDICATOR_HEIGHT))
    }
  }

  resizeAnimationFrame = requestAnimationFrame(tick)
}

function estimateIndicatorContentWidth() {
  if (state.value === 'processing') {
    const commandWidth = commandName.value
      ? measureTextWidth(commandName.value.replace(/^\//, '').toUpperCase(), '700 10px sans-serif') + 24
      : 0
    const textWidth = measureTextWidth(inputText.value, '500 14px sans-serif')
    const countWidth = measureTextWidth(String(inputText.value.length), '400 10px monospace')
    const gapsWidth = commandName.value ? 24 : 16

    return commandWidth + 14 + textWidth + countWidth + gapsWidth + 16
  }

  if (state.value === 'result') {
    const textWidth = measureTextWidth(resultText.value, '500 14px sans-serif')
    const copiedWidth = copyResult.value
      ? 16 + measureTextWidth(t('main.status.copied'), '400 10px monospace') + 16
      : 0

    return textWidth + copiedWidth + 16
  }

  if (state.value === 'error') {
    return measureTextWidth(errorText.value, '500 14px sans-serif') + 16
  }

  return measureTextWidth(formatShortcut(globalShortcut.value, isMacOS.value), '400 10px monospace') + 18
}

function measureTextWidth(text: string, font: string) {
  if (!measureCanvasContext) {
    measureCanvasContext = document.createElement('canvas').getContext('2d')
  }

  if (!measureCanvasContext) {
    return text.length * 8
  }

  measureCanvasContext.font = font
  return Math.ceil(measureCanvasContext.measureText(text).width)
}

async function onESC() {
  if (processing.value) {
    abortController?.abort()
    state.value = 'idle'
    processing.value = false
    commandName.value = ''
    return
  }
  await hideIndicator()
}

async function openMainWindow() {
  await invoke('open_main_window')
}
</script>

<template>
  <div
    class="indicator-shell h-full w-full p-0.5"
    :class="{ 'indicator-shell--processing': state === 'processing' }"
    tabindex="0"
    data-tauri-drag-region
    @keydown.esc="onESC"
  >
    <div
      class="indicator-capsule h-full w-full flex items-center pl-4 gap-3 transition-shadow duration-300 select-none bg-neutral-800 rounded-lg border border-white/10 overflow-hidden cursor-grab active:cursor-grabbing"
      data-tauri-drag-region
    >
      <AppLogo version dark drag class="size-7" />

      <!-- Center: Status -->
      <div class="indicator-content flex overflow-hidden min-w-0 h-full items-center" data-tauri-drag-region>
        <div v-if="state === 'processing'" class="flex max-w-full items-center gap-2 px-2 overflow-hidden" data-tauri-drag-region>
          <div v-if="commandName" class="flex items-center gap-1 shrink-0 bg-blue-500/10 pl-1 pr-1.5 py-0.5 rounded border border-blue-500/20" data-tauri-drag-region>
            <TerminalIcon class="w-3 h-3 text-blue-400" data-tauri-drag-region />
            <span class="text-[10px] font-bold text-blue-400 tracking-tight uppercase" data-tauri-drag-region>
              {{ commandName.startsWith('/') ? commandName.slice(1) : commandName }}
            </span>
          </div>
          <Loader2Icon class="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" data-tauri-drag-region />
          <span class="truncate text-sm text-blue-100/90 shrink min-w-0 font-medium" data-tauri-drag-region>{{ inputText }}</span>
          <span class="text-[10px] text-blue-400/40 font-mono shrink-0" data-tauri-drag-region>{{ inputText?.length }}</span>
        </div>

        <div v-else-if="state === 'result'" class="flex items-center gap-2 px-2 overflow-hidden" data-tauri-drag-region>
          <span class="truncate text-sm text-green-400 font-medium" data-tauri-drag-region>{{ resultText }}</span>
          <template v-if="copyResult">
            <ClipboardCheckIcon class="w-4 h-4 text-green-400 shrink-0" data-tauri-drag-region />
            <span class="text-[10px] text-green-400/50 font-mono shrink-0" data-tauri-drag-region>{{ t('main.status.copied') }}</span>
          </template>
        </div>

        <p
          v-else-if="state === 'error'"
          class="truncate text-sm text-red-400 px-2 font-medium cursor-pointer hover:underline"
          :data-tauri-drag-region="isRateLimited ? false : true"
          @click="isRateLimited ? (login(), hideIndicator()) : null"
        >
          {{ errorText }}
        </p>

        <kbd v-else class="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 font-mono text-[10px] text-white/40" data-tauri-drag-region>
          {{ formatShortcut(globalShortcut, isMacOS) }}
        </kbd>
      </div>

      <!-- Right: Settings -->
      <button
        class="size-7 shrink-0 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        data-tauri-drag-region="false"
        @click="openMainWindow"
      >
        <SettingsIcon class="w-4 h-4 text-white/40 hover:text-white/60" />
      </button>
    </div>
  </div>
</template>

<style scoped>
:global(body) {
  background-color: transparent;
  overflow: hidden;
}

.indicator-shell {
  position: relative;
  border-radius: 0.625rem;
  background-color: transparent;
  overflow: hidden;
}

.indicator-capsule {
  position: relative;
  box-shadow: 0 8px 24px rgb(0 0 0 / 14%);
}

.indicator-content {
  max-width: 390px;
}

.indicator-shell--processing::after {
  position: absolute;
  inset: 0;
  content: "";
  pointer-events: none;
  border-radius: inherit;
  z-index: 0;
  background-color: rgb(52 52 52);
}

.indicator-shell--processing::before {
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
      rgb(229 229 229 / 0%) 0deg,
      rgb(229 229 229 / 0%) 310deg,
      rgb(229 229 229 / 95%) 318deg,
      rgb(229 229 229 / 95%) 336deg,
      rgb(229 229 229 / 0%) 344deg,
      rgb(229 229 229 / 0%) 360deg
    );
  filter: drop-shadow(0 0 3px rgb(245 245 245 / 35%));
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

.indicator-shell--processing .indicator-capsule {
  z-index: 1;
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
