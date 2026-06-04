<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { Check, Copy, CornerDownLeft, SearchIcon, X } from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { deepSeekProcess, ollamaProcess, typoProcess } from '@/ai'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'

const { t } = useI18n()
const appWindow = getCurrentWebviewWindow()

const state = ref<'search' | 'processing' | 'result' | 'error'>('search')
const capturedText = ref('')
const searchQuery = ref('')
const selectedIndex = ref(0)
const slashPrompts = ref<any[]>([])
const quickPickRoot = ref<HTMLElement | null>(null)
const searchInputRef = ref<{ $el?: HTMLInputElement } | HTMLInputElement | null>(null)
const resultText = ref('')
const errorText = ref('')
const copied = ref(false)
const insertButtonRef = ref<HTMLButtonElement | null>(null)

const activePromptKey = ref('')
const activePromptValue = ref('')

let unlistenWindowOpened: (() => void) | undefined
let unlistenFocusChanged: (() => void) | undefined
let unlistenSelectionCaptured: (() => void) | undefined
let selectionTimeout: ReturnType<typeof setTimeout> | null = null
let insertTimeout: ReturnType<typeof setTimeout> | null = null
let isMounted = true
let abortController: AbortController | null = null
const hasFocusedOnce = ref(false)

const normalizedPrompts = computed(() => {
  return slashPrompts.value
    .filter((prompt: any) => prompt?.key && prompt?.value)
    .map((prompt: any) => {
      const key = String(prompt.key).trim()
      return {
        ...prompt,
        command: key.startsWith('/') ? key : `/${key}`,
      }
    })
})

const filteredPrompts = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query)
    return normalizedPrompts.value

  return normalizedPrompts.value.filter((p) => {
    const keyMatch = p.command.toLowerCase().includes(query)
    const aliasMatch = p.aliases?.some((a: string) => a.toLowerCase().includes(query))
    const promptMatch = p.value.toLowerCase().includes(query)
    return keyMatch || aliasMatch || promptMatch
  })
})

watch(filteredPrompts, () => {
  selectedIndex.value = 0
})

const selectedPromptText = computed(() => {
  const selected = filteredPrompts.value[selectedIndex.value]
  if (selected?.value)
    return selected.value
  return searchQuery.value.trim()
})

const isUsingTypedPrompt = computed(() => {
  return filteredPrompts.value.length === 0 && searchQuery.value.trim().length > 0
})

const displaySelectionText = computed(() => {
  const normalized = capturedText.value.trim()
  return normalized || t('main.quick_pick.selection_empty')
})

const displayCommand = computed(() => {
  const command = activePromptKey.value?.trim()
  if (!command)
    return ''
  return command.startsWith('/') ? command : `/${command}`
})

watch(state, async (newState) => {
  if (newState === 'result') {
    await nextTick()
    insertButtonRef.value?.focus()
  }
  else if (newState === 'search') {
    await nextTick()
    focusInput()
  }
})

async function confirmSelection(prompt: { key: string, value: string }) {
  abortController?.abort()
  const controller = new AbortController()
  abortController = controller

  try {
    logger.info('QuickPick', 'confirmSelection', prompt.key)
    activePromptKey.value = prompt.key
    activePromptValue.value = prompt.value
    state.value = 'processing'
    resultText.value = ''
    errorText.value = ''
    copied.value = false

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

    const output = await process(capturedText.value, controller.signal, {
      text: capturedText.value,
      prompt: prompt.value,
      command: prompt.key,
    })

    if (abortController === controller) {
      resultText.value = output
      state.value = 'result'
      const focused = await appWindow.isFocused()
      if (!focused) {
        await closeWindow()
      }
    }
  }
  catch (err: any) {
    if (abortController === controller) {
      if (err?.name === 'AbortError')
        return
      logger.error('QuickPick', 'Processing failed', err)
      errorText.value = (typeof err === 'string' ? err : err?.message) || t('main.error.generic')
      state.value = 'error'
    }
  }
}

async function copyToClipboard() {
  if (!resultText.value)
    return
  try {
    await writeText(resultText.value)
    copied.value = true
    setTimeout(async () => {
      await closeWindow()
      copied.value = false
    }, 1000)
  }
  catch (err) {
    logger.error('QuickPick', 'Failed to copy to clipboard', err)
  }
}

async function insertText() {
  if (!resultText.value)
    return
  const textToPaste = resultText.value
  try {
    await closeWindow()
    if (insertTimeout) {
      clearTimeout(insertTimeout)
    }
    insertTimeout = setTimeout(async () => {
      insertTimeout = null
      try {
        await invoke('keyboard_paste_text', { text: textToPaste })
      }
      catch (err) {
        logger.error('QuickPick', 'Failed to insert text after hide', err)
      }
    }, 150)
  }
  catch (err) {
    logger.error('QuickPick', 'Failed to hide window for insert', err)
  }
}

async function closeWindow() {
  try {
    abortController?.abort()
    state.value = 'search'
    searchQuery.value = ''
    hasFocusedOnce.value = false
    if (selectionTimeout) {
      clearTimeout(selectionTimeout)
      selectionTimeout = null
    }
    if (insertTimeout) {
      clearTimeout(insertTimeout)
      insertTimeout = null
    }
    await appWindow.hide()
  }
  catch (error) {
    logger.error('QuickPick', 'failed to hide window', error)
  }
}

function cancelProcessing() {
  abortController?.abort()
  state.value = 'search'
}

function onKeyDown(e: KeyboardEvent) {
  if (state.value !== 'search') {
    if (e.key === 'Escape') {
      if (state.value === 'processing') {
        cancelProcessing()
      }
      else {
        void closeWindow()
      }
    }
    return
  }

  if (!filteredPrompts.value.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    return
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % filteredPrompts.value.length
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value - 1 + filteredPrompts.value.length) % filteredPrompts.value.length
  }
  else if (e.key === 'Enter') {
    const selected = filteredPrompts.value[selectedIndex.value]
    if (selected) {
      confirmSelection(selected)
    }
    else {
      const typedPrompt = searchQuery.value.trim()
      if (typedPrompt) {
        confirmSelection({
          key: typedPrompt,
          value: typedPrompt,
        })
      }
    }
  }
  else if (e.key === 'Escape') {
    void closeWindow()
  }
}

function onWindowKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    if (state.value === 'processing') {
      cancelProcessing()
    }
    else {
      void closeWindow()
    }
  }
}

async function loadQuickPickData() {
  try {
    const [text, prompts] = await Promise.all([
      invoke<string | null>('consume_quick_pick_selection'),
      invoke<any[]>('get_local_slash_prompts'),
    ])

    slashPrompts.value = Array.isArray(prompts) ? prompts : []
    logger.info('QuickPick', 'loadQuickPickData', { text, prompts })

    if (selectionTimeout) {
      clearTimeout(selectionTimeout)
      selectionTimeout = null
    }

    if (text?.trim()) {
      capturedText.value = text
    }
    else {
      capturedText.value = ''
    }
  }
  catch (err) {
    logger.error('QuickPick', 'loadQuickPickData failed', err)
  }
}

function focusInput() {
  if (state.value !== 'search')
    return

  const input = getSearchInputElement()
  if (!input)
    return

  input.focus({ preventScroll: true })
  if (input.value && !hasFocusedOnce.value) {
    input.select()
  }
  hasFocusedOnce.value = true
}

function getSearchInputElement(): HTMLInputElement | null {
  const refValue = searchInputRef.value
  if (!refValue)
    return null
  const el = '$el' in refValue ? refValue.$el : refValue
  if (el instanceof HTMLInputElement)
    return el
  if (el && 'querySelector' in el) {
    return (el as any).querySelector('input')
  }
  return null
}

onMounted(() => {
  void invoke('notify_quick_pick_window_ready').catch((error) => {
    logger.warn('QuickPick', 'notify_quick_pick_window_ready failed', error)
  })

  window.addEventListener('keydown', onWindowKeyDown, true)
  document.addEventListener('keydown', onWindowKeyDown, true)

  void appWindow.isVisible().then((visible) => {
    logger.info('QuickPick', 'onMounted: isVisible =', visible)
    if (!visible || !isMounted)
      return

    beginQuickPickSession()
  })

  void listen('quick-pick-window-opened', () => {
    logger.info('QuickPick', 'event quick-pick-window-opened received')
    beginQuickPickSession()
  }).then((unlisten) => {
    if (!isMounted)
      unlisten()
    else
      unlistenWindowOpened = unlisten
  })

  void listen<string | null>('quick-pick-selection-captured', (event) => {
    logger.info('QuickPick', 'event quick-pick-selection-captured received', event.payload)
    void handleSelectionCaptured(event.payload)
  }).then((unlisten) => {
    if (!isMounted)
      unlisten()
    else
      unlistenSelectionCaptured = unlisten
  })

  void appWindow.onFocusChanged(({ payload: focused }) => {
    logger.info('QuickPick', 'onFocusChanged received focused =', focused)
    if (focused) {
      focusInput()
    }
    else {
      void closeWindow()
    }
  }).then((unlisten) => {
    if (!isMounted)
      unlisten()
    else
      unlistenFocusChanged = unlisten
  })
})

onUnmounted(() => {
  isMounted = false
  abortController?.abort()
  if (selectionTimeout) {
    clearTimeout(selectionTimeout)
    selectionTimeout = null
  }
  if (insertTimeout) {
    clearTimeout(insertTimeout)
    insertTimeout = null
  }
  window.removeEventListener('keydown', onWindowKeyDown, true)
  document.removeEventListener('keydown', onWindowKeyDown, true)
  if (unlistenWindowOpened)
    unlistenWindowOpened()
  if (unlistenFocusChanged)
    unlistenFocusChanged()
  if (unlistenSelectionCaptured)
    unlistenSelectionCaptured()
})

async function handleSelectionCaptured(text: string | null) {
  if (selectionTimeout) {
    clearTimeout(selectionTimeout)
    selectionTimeout = null
  }

  capturedText.value = text?.trim() || ''
  focusInput()
}

function beginQuickPickSession() {
  if (selectionTimeout) {
    clearTimeout(selectionTimeout)
    selectionTimeout = null
  }
  hasFocusedOnce.value = false
  selectedIndex.value = 0
  searchQuery.value = ''
  state.value = 'search'
  resultText.value = ''
  errorText.value = ''
  copied.value = false

  focusInput()

  // Set a fallback timeout for selection capture
  selectionTimeout = setTimeout(() => {
    if (!capturedText.value) {
      logger.warn('QuickPick', 'selection capture timed out')
      capturedText.value = ''
      focusInput()
    }
  }, 1500)

  void loadQuickPickData().finally(() => {
    focusInput()
  })
}
</script>

<template>
  <div ref="quickPickRoot" class="flex h-full w-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-2xl relative">
    <!-- State: search (Command List UI) -->
    <div v-if="state === 'search'" class="flex flex-1 flex-row overflow-hidden min-h-0">
      <!-- Left Pane: Commands -->
      <div class="flex flex-col w-[250px] border-r border-zinc-200 shrink-0 h-full justify-between">
        <div class="flex flex-col flex-1 min-h-0">
          <!-- Search Area -->
          <div class="relative p-1.5 shrink-0">
            <SearchIcon class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <Input
              ref="searchInputRef"
              v-model="searchQuery"
              class="h-8 border-zinc-200 bg-white pl-8 text-xs focus-visible:ring-1 focus-visible:ring-primary"
              :placeholder="t('main.quick_pick.search_placeholder')"
              @keydown="onKeyDown"
            />
          </div>

          <!-- Results -->
          <ScrollArea class="min-h-0 flex-1">
            <div v-if="filteredPrompts.length > 0" class="space-y-0.5 px-1.5 pb-1.5">
              <Button
                v-for="(prompt, index) in filteredPrompts"
                :key="prompt.key"
                variant="ghost"
                class="h-auto w-full justify-between rounded-md px-2 py-1.5 text-left text-xs"
                :class="index === selectedIndex ? 'border border-primary/50 bg-primary/10 text-zinc-900 ring-1 ring-primary/20' : 'border border-transparent text-zinc-900 hover:bg-zinc-50'"
                @click="confirmSelection(prompt)"
                @mouseenter="selectedIndex = index"
              >
                <div class="flex min-w-0 items-center gap-1.5">
                  <span class="font-bold text-zinc-900">{{ prompt.command }}</span>
                  <span class="truncate text-[11px] opacity-60">{{ prompt.value }}</span>
                </div>
                <div v-if="prompt.aliases?.length" class="flex shrink-0 gap-1">
                  <Badge v-for="alias in prompt.aliases" :key="alias" variant="secondary" class="px-1 py-0 text-[9px]">
                    {{ alias }}
                  </Badge>
                </div>
              </Button>
            </div>
          </ScrollArea>
        </div>

        <!-- Left Bottom Tip -->
        <div class="border-t border-zinc-100 bg-zinc-50/50 p-2 shrink-0 text-center">
          <p v-if="isUsingTypedPrompt" class="text-[10px] leading-snug text-primary/85 font-medium">
            {{ t('main.quick_pick.hint_typed_prompt') }}
          </p>
          <p v-else class="text-[10px] leading-snug text-zinc-400">
            {{ t('main.quick_pick.hint_select_command') }}
          </p>
        </div>
      </div>

      <!-- Right Pane: Prompt and Selection Preview -->
      <div class="flex-1 flex flex-col bg-zinc-50 p-2.5 min-w-0 h-full">
        <!-- Top Half: Prompt -->
        <div class="flex-1 min-h-0 flex flex-col pb-1.5">
          <div class="flex items-center justify-between mb-1 shrink-0">
            <Badge variant="secondary" class="h-5 px-1.5 py-0 text-[10px] uppercase tracking-wide">
              {{ t('main.quick_pick.prompt_label') }}
            </Badge>
          </div>
          <div class="flex-1 min-h-0 rounded-md border border-zinc-200 bg-white p-2.5 shadow-sm overflow-y-auto">
            <p class="whitespace-pre-wrap break-all text-[11px] leading-snug text-zinc-700">
              {{ selectedPromptText || t('main.quick_pick.no_commands') }}
            </p>
          </div>
        </div>

        <!-- Bottom Half: Selection -->
        <div class="flex-1 min-h-0 flex flex-col pt-1.5">
          <div class="flex items-center justify-between mb-1 shrink-0">
            <Badge variant="secondary" class="h-5 px-1.5 py-0 text-[10px] uppercase tracking-wide">
              {{ t('main.quick_pick.selection_label') }}
            </Badge>
          </div>
          <div class="flex-1 min-h-0 rounded-md border border-zinc-200 bg-white p-2.5 shadow-sm font-mono overflow-y-auto">
            <p class="whitespace-pre-wrap break-all text-[11px] leading-snug text-zinc-600">
              {{ displaySelectionText }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- State: processing | result | error (Unified Processing UI) -->
    <div v-else class="flex flex-1 flex-col overflow-hidden min-h-0 z-10 bg-white">
      <!-- Border runner animation wrapper for processing state -->
      <div v-if="state === 'processing'" class="absolute inset-0 z-0 pointer-events-none rounded-lg overflow-hidden border-2 border-transparent">
        <div class="absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(24,24,27,0.7)_340deg,transparent_360deg)] spin-slow" />
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-zinc-50 text-zinc-500 shrink-0 relative z-10">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs font-medium shrink-0">
            {{ t('main.quick_pick.result_title') }}
          </span>
          <Badge
            v-if="state === 'processing' && displayCommand"
            variant="secondary"
            class="h-5 px-1.5 py-0 text-[10px] uppercase tracking-wide truncate max-w-[200px]"
          >
            {{ displayCommand }}
          </Badge>
        </div>
        <button
          class="text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
          @click="state === 'processing' ? cancelProcessing() : closeWindow()"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-hidden relative min-h-0 bg-white z-10">
        <!-- processing view -->
        <div v-if="state === 'processing'" class="flex flex-col h-full bg-zinc-50 p-2.5 min-h-0">
          <div class="flex-1 min-h-0 flex flex-col pb-1.5">
            <div class="flex items-center justify-between mb-1 shrink-0">
              <Badge variant="secondary" class="h-5 px-1.5 py-0 text-[10px] uppercase tracking-wide">
                {{ t('main.quick_pick.prompt_label') }}
              </Badge>
            </div>
            <div class="flex-1 min-h-0 rounded-md border border-zinc-200 bg-white p-2.5 shadow-sm overflow-y-auto">
              <p class="whitespace-pre-wrap break-all text-[11px] leading-snug text-zinc-700">
                {{ activePromptValue }}
              </p>
            </div>
          </div>

          <div class="flex-1 min-h-0 flex flex-col pt-1.5">
            <div class="flex items-center justify-between mb-1 shrink-0">
              <Badge variant="secondary" class="h-5 px-1.5 py-0 text-[10px] uppercase tracking-wide">
                {{ t('main.quick_pick.selection_label') }}
              </Badge>
            </div>
            <div class="flex-1 min-h-0 rounded-md border border-zinc-200 bg-white p-2.5 shadow-sm font-mono overflow-y-auto">
              <p class="whitespace-pre-wrap break-all text-[11px] leading-snug text-zinc-600">
                {{ displaySelectionText }}
              </p>
            </div>
          </div>
        </div>

        <!-- result view -->
        <ScrollArea v-else-if="state === 'result'" class="h-full bg-white">
          <div class="p-4">
            <pre class="text-sm whitespace-pre-wrap font-sans leading-relaxed text-zinc-900 selection:bg-zinc-200">{{ resultText }}</pre>
          </div>
        </ScrollArea>

        <!-- error view -->
        <div v-else-if="state === 'error'" class="p-8 text-center flex flex-col items-center justify-center h-full space-y-4 bg-white">
          <p class="text-red-500 text-sm">
            {{ errorText }}
          </p>
          <button
            class="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 rounded-lg text-xs transition-colors cursor-pointer"
            @click="cancelProcessing"
          >
            {{ t('main.action.close') }}
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div
        v-if="state === 'processing'"
        class="px-4 py-2 border-t border-zinc-200 bg-zinc-50 shrink-0 relative z-10 flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <div class="w-3.5 h-3.5 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
          <span class="text-[11px] text-zinc-500 font-medium">
            {{ t('main.status.processing') }}
          </span>
        </div>
        <p class="text-[11px] text-zinc-400">
          {{ t('main.quick_pick.cancel_hint') }}
        </p>
      </div>
      <div v-else-if="state === 'result'" class="px-4 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-2 shrink-0 relative z-10">
        <button
          class="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg text-xs transition-colors border border-zinc-200 cursor-pointer"
          @click="copyToClipboard"
        >
          <component :is="copied ? Check : Copy" class="w-3.5 h-3.5" :class="copied ? 'text-green-600' : ''" />
          {{ copied ? t('main.status.copied') : t('main.action.copy') }}
        </button>
        <button
          ref="insertButtonRef"
          class="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs transition-colors border border-transparent shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          @click="insertText"
        >
          <CornerDownLeft class="w-3.5 h-3.5" />
          {{ t('main.action.insert') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
:global(body) {
  background-color: transparent !important;
}

.spin-slow {
  animation: spin 3.6s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}
</style>
