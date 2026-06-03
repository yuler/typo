<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { SearchIcon } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'

const { t } = useI18n()
const appWindow = getCurrentWebviewWindow()

const capturedText = ref('')
const searchQuery = ref('')
const selectedIndex = ref(0)
const slashPrompts = ref<any[]>([])
const quickPickRoot = ref<HTMLElement | null>(null)
const searchInputRef = ref<{ $el?: HTMLInputElement } | HTMLInputElement | null>(null)
let unlistenWindowOpened: (() => void) | undefined
let unlistenFocusChanged: (() => void) | undefined
let unlistenSelectionCaptured: (() => void) | undefined
let selectionTimeout: ReturnType<typeof setTimeout> | null = null
let openedAt = 0
let registeredEscapeShortcut: string | null = null
let shouldFocusInput = false
let isWindowFocused = false
let focusTimers: ReturnType<typeof setTimeout>[] = []

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
  return normalized || 'Selection is empty'
})

async function confirmSelection(prompt: any) {
  try {
    logger.info('QuickPick', 'confirmSelection', prompt.key)
    await invoke('set_quick_pick_input', {
      payload: {
        text: capturedText.value,
        mode: 'quick-pick',
      },
    })

    // Both windows share the same origin, so pass the chosen prompt via
    // localStorage. The result window reads it synchronously on mount, which
    // avoids the race condition of emitting an event before it has loaded.
    localStorage.setItem('quick-pick-payload', JSON.stringify({
      text: capturedText.value,
      prompt: prompt.value,
      command: prompt.key,
    }))

    await closeWindow() // Hide first for snappiness
    await invoke('open_quick_pick_result_window')
  }
  catch (err) {
    logger.error('QuickPick', 'failed to confirm selection', err)
  }
}

async function closeWindow() {
  try {
    shouldFocusInput = false
    clearFocusTimers()
    if (selectionTimeout) {
      clearTimeout(selectionTimeout)
      selectionTimeout = null
    }
    await unregisterEscapeShortcut()
    await appWindow.hide()
  }
  catch (error) {
    logger.error('QuickPick', 'failed to hide window', error)
  }
}

async function registerEscapeShortcut() {
  if (registeredEscapeShortcut)
    return

  for (const shortcut of ['Esc', 'Escape']) {
    try {
      await register(shortcut, (event) => {
        if (event.state === 'Released')
          void closeWindow()
      })
      registeredEscapeShortcut = shortcut
      return
    }
    catch (error) {
      logger.warn('QuickPick', `failed to register ${shortcut} shortcut fallback`, error)
    }
  }
}

async function unregisterEscapeShortcut() {
  if (!registeredEscapeShortcut)
    return

  const shortcut = registeredEscapeShortcut
  registeredEscapeShortcut = null
  try {
    await unregister(shortcut)
  }
  catch (error) {
    logger.warn('QuickPick', 'failed to unregister Escape shortcut fallback', error)
  }
}

function clearFocusTimers() {
  for (const timer of focusTimers)
    clearTimeout(timer)
  focusTimers = []
}

function scheduleInputFocus() {
  if (!shouldFocusInput)
    return

  clearFocusTimers()
  focusInputWithRetry()
  for (const delay of [50, 120, 240, 420, 700, 1000])
    queueFocusRetry(delay)

  focusTimers.push(setTimeout(() => {
    const input = getSearchInputElement()
    if (shouldFocusInput && document.activeElement !== input)
      logger.warn('QuickPick', 'search input focus did not stick')
  }, 1200))
}

function queueFocusRetry(delay: number) {
  focusTimers.push(setTimeout(focusInputWithRetry, delay))
}

function onKeyDown(e: KeyboardEvent) {
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
    void closeWindow()
  }
}

async function loadQuickPickData() {
  const [text, prompts] = await Promise.all([
    invoke<string | null>('consume_quick_pick_selection'),
    invoke<any[]>('get_local_slash_prompts'),
  ])

  slashPrompts.value = Array.isArray(prompts) ? prompts : []
  logger.info('QuickPick', 'loadQuickPickData', { text, prompts })

  if (text?.trim()) {
    if (selectionTimeout) {
      clearTimeout(selectionTimeout)
      selectionTimeout = null
    }
    capturedText.value = text
  }
  else {
    capturedText.value = ''
  }
}

function focusInput() {
  logger.info('QuickPick', 'focusInput called, shouldFocusInput =', shouldFocusInput)
  if (!shouldFocusInput)
    return

  void appWindow.setFocus().catch((error) => {
    logger.warn('QuickPick', 'failed to focus window before input focus', error)
  })

  window.focus()
  const input = getSearchInputElement()
  logger.info('QuickPick', 'getSearchInputElement returned:', input ? 'input element' : 'null')
  if (!input)
    return

  logger.info('QuickPick', 'document.activeElement before focus:', document.activeElement?.tagName)
  if (document.activeElement === input) {
    if (isWindowFocused) {
      clearFocusTimers()
      return
    }
    logger.info('QuickPick', 'input is already activeElement, blurring first to force focus sync')
    input.blur()
  }
  input.focus({ preventScroll: true })
  input.click()
  logger.info('QuickPick', 'document.activeElement after focus:', document.activeElement?.tagName)

  // Keep existing text selected so users can immediately overwrite or type.
  if (input.value) {
    input.setSelectionRange(input.value.length, input.value.length)
  }
}

function focusInputWithRetry() {
  if (!shouldFocusInput)
    return

  focusInput()
  requestAnimationFrame(() => focusInput())

  for (const delay of [0, 16, 60]) {
    focusTimers.push(setTimeout(() => {
      if (shouldFocusInput)
        focusInput()
    }, delay))
  }
}

function getSearchInputElement() {
  return document.querySelector<HTMLInputElement>('input')
    || quickPickRoot.value?.querySelector<HTMLInputElement>('input')
    || null
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKeyDown, true)
  document.addEventListener('keydown', onWindowKeyDown, true)

  void appWindow.isFocused().then((focused) => {
    isWindowFocused = focused
  })

  void appWindow.isVisible().then((visible) => {
    logger.info('QuickPick', 'onMounted: isVisible =', visible)
    if (!visible)
      return

    beginQuickPickSession()
  })

  void listen('quick-pick-window-opened', () => {
    logger.info('QuickPick', 'event quick-pick-window-opened received')
    beginQuickPickSession()
  }).then((unlisten) => {
    unlistenWindowOpened = unlisten
  })

  void listen<string | null>('quick-pick-selection-captured', (event) => {
    logger.info('QuickPick', 'event quick-pick-selection-captured received', event.payload)
    void handleSelectionCaptured(event.payload)
  }).then((unlisten) => {
    unlistenSelectionCaptured = unlisten
  })

  void appWindow.onFocusChanged(({ payload: focused }) => {
    logger.info('QuickPick', 'onFocusChanged received focused =', focused)
    isWindowFocused = focused
    if (focused) {
      scheduleInputFocus()
    }
    else {
      if (Date.now() - openedAt < 1200) {
        logger.info('QuickPick', 'lost focus within 1200ms, rescheduling focus')
        scheduleInputFocus()
        return
      }
      logger.info('QuickPick', 'lost focus after 1200ms, closing window')
      void closeWindow()
    }
  }).then((unlisten) => {
    unlistenFocusChanged = unlisten
  })
})

onUnmounted(() => {
  shouldFocusInput = false
  clearFocusTimers()
  if (selectionTimeout) {
    clearTimeout(selectionTimeout)
    selectionTimeout = null
  }
  window.removeEventListener('keydown', onWindowKeyDown, true)
  document.removeEventListener('keydown', onWindowKeyDown, true)
  if (unlistenWindowOpened)
    unlistenWindowOpened()
  if (unlistenFocusChanged)
    unlistenFocusChanged()
  if (unlistenSelectionCaptured)
    unlistenSelectionCaptured()
  void unregisterEscapeShortcut()
})

async function handleSelectionCaptured(text: string | null) {
  if (selectionTimeout) {
    clearTimeout(selectionTimeout)
    selectionTimeout = null
  }

  capturedText.value = text?.trim() || ''
  scheduleInputFocus()
}

function beginQuickPickSession() {
  openedAt = Date.now()
  shouldFocusInput = true
  void appWindow.isFocused().then((focused) => {
    isWindowFocused = focused
  })
  clearFocusTimers()
  if (selectionTimeout) {
    clearTimeout(selectionTimeout)
    selectionTimeout = null
  }
  selectedIndex.value = 0
  searchQuery.value = ''
  void registerEscapeShortcut()

  scheduleInputFocus()

  // Set a fallback timeout for selection capture
  selectionTimeout = setTimeout(() => {
    if (!capturedText.value) {
      logger.warn('QuickPick', 'selection capture timed out')
      capturedText.value = ''
      scheduleInputFocus()
    }
  }, 1500)

  void loadQuickPickData().finally(() => {
    scheduleInputFocus()
  })
}
</script>

<template>
  <div ref="quickPickRoot" class="flex h-full flex-row overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-2xl">
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
            :placeholder="t('main.quick_pick.search_placeholder') || 'search or directly input prompt'"
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
          will use input once prompt directly
        </p>
        <p v-else class="text-[10px] leading-snug text-zinc-400">
          Select a command or press Enter to run
        </p>
      </div>
    </div>

    <!-- Right Pane: Prompt and Selection Preview (50/50 Fixed Height) -->
    <div class="flex-1 flex flex-col bg-zinc-50 p-2.5 min-w-0 h-full">
      <!-- Top Half: Prompt -->
      <div class="flex-1 min-h-0 flex flex-col pb-1.5">
        <div class="flex items-center justify-between mb-1 shrink-0">
          <Badge variant="secondary" class="h-5 px-1.5 py-0 text-[10px] uppercase tracking-wide">
            Prompt
          </Badge>
        </div>
        <div class="flex-1 min-h-0 rounded-md border border-zinc-200 bg-white p-2.5 shadow-sm overflow-y-auto">
          <p class="whitespace-pre-wrap break-all text-[11px] leading-snug text-zinc-700">
            {{ selectedPromptText || (t('main.quick_pick.no_commands') || 'No commands found') }}
          </p>
        </div>
      </div>

      <!-- Bottom Half: Selection -->
      <div class="flex-1 min-h-0 flex flex-col pt-1.5">
        <div class="flex items-center justify-between mb-1 shrink-0">
          <Badge variant="secondary" class="h-5 px-1.5 py-0 text-[10px] uppercase tracking-wide">
            Selection
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
</template>

<style scoped>
:global(body) {
  background-color: transparent !important;
}
</style>
