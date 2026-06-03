<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
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
let openedAt = 0
let registeredEscapeShortcut: string | null = null
let shouldFocusInput = false
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

  if (!text?.trim()) {
    logger.warn('QuickPick', 'loadQuickPickData: no selection, hide window')
    await closeWindow()
    return
  }

  capturedText.value = text
  slashPrompts.value = Array.isArray(prompts) ? prompts : []

  logger.info('QuickPick', 'slashPrompts', { text, prompts })
}

function focusInput() {
  if (!shouldFocusInput)
    return

  void appWindow.setFocus().catch((error) => {
    logger.warn('QuickPick', 'failed to focus window before input focus', error)
  })

  window.focus()
  const input = getSearchInputElement()
  if (!input)
    return
  input.focus({ preventScroll: true })
  input.click()
  // Keep existing text selected so users can immediately overwrite or type.
  if (input.value) {
    input.setSelectionRange(input.value.length, input.value.length)
  }
}

function focusInputWithRetry() {
  if (!shouldFocusInput)
    return

  void focusInput()
  requestAnimationFrame(() => void focusInput())

  for (const delay of [0, 16, 60]) {
    focusTimers.push(setTimeout(() => {
      if (shouldFocusInput)
        void focusInput()
    }, delay))
  }
}

function getSearchInputElement() {
  const refValue = searchInputRef.value
  if (refValue instanceof HTMLInputElement)
    return refValue

  if (refValue?.$el instanceof HTMLInputElement)
    return refValue.$el

  if ((refValue as ComponentPublicInstance | null)?.$el instanceof HTMLElement) {
    const el = (refValue as ComponentPublicInstance).$el as HTMLElement
    const nestedInput = el.querySelector<HTMLInputElement>('input')
    if (nestedInput)
      return nestedInput
  }

  if (refValue instanceof HTMLElement) {
    const nestedInput = refValue.querySelector<HTMLInputElement>('input')
    if (nestedInput)
      return nestedInput
  }

  return quickPickRoot.value?.querySelector<HTMLInputElement>('input') ?? null
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKeyDown, true)
  document.addEventListener('keydown', onWindowKeyDown, true)

  void appWindow.isVisible().then((visible) => {
    if (!visible)
      return

    beginQuickPickSession()
  })

  void listen('quick-pick-window-opened', () => {
    beginQuickPickSession()
  }).then((unlisten) => {
    unlistenWindowOpened = unlisten
  })

  void appWindow.onFocusChanged(({ payload: focused }) => {
    if (focused) {
      scheduleInputFocus()
    }
    else {
      if (Date.now() - openedAt < 1200) {
        scheduleInputFocus()
        return
      }
      void closeWindow()
    }
  }).then((unlisten) => {
    unlistenFocusChanged = unlisten
  })
})

onUnmounted(() => {
  shouldFocusInput = false
  clearFocusTimers()
  window.removeEventListener('keydown', onWindowKeyDown, true)
  document.removeEventListener('keydown', onWindowKeyDown, true)
  if (unlistenWindowOpened)
    unlistenWindowOpened()
  if (unlistenFocusChanged)
    unlistenFocusChanged()
  void unregisterEscapeShortcut()
})

function beginQuickPickSession() {
  openedAt = Date.now()
  shouldFocusInput = true
  clearFocusTimers()
  selectedIndex.value = 0
  searchQuery.value = ''
  void registerEscapeShortcut()

  scheduleInputFocus()
  void loadQuickPickData().finally(() => {
    scheduleInputFocus()
  })
}
</script>

<template>
  <div ref="quickPickRoot" class="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-2xl">
    <!-- Search Area -->
    <div class="relative p-1.5">
      <SearchIcon class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <Input
        ref="searchInputRef"
        v-model="searchQuery"
        class="h-8 border-slate-200 bg-white pl-8 text-xs"
        :placeholder="t('main.quick_pick.search_placeholder') || 'Search commands...'"
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
          :class="index === selectedIndex ? 'border border-primary/50 bg-primary/10 text-slate-900 ring-1 ring-primary/20' : 'border border-transparent text-slate-900 hover:bg-slate-50'"
          @click="confirmSelection(prompt)"
          @mouseenter="selectedIndex = index"
        >
          <div class="flex min-w-0 items-center gap-1.5">
            <span class="font-bold text-slate-900">{{ prompt.command }}</span>
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

    <div class="shrink-0 space-y-2 border-t border-slate-200 bg-slate-50 px-2.5 py-2">
      <div class="space-y-1">
        <Badge variant="secondary" class="h-5 px-1.5 py-0 text-[10px] uppercase tracking-wide">
          Prompt
        </Badge>
        <p class="line-clamp-3 whitespace-pre-wrap wrap-break-word text-[11px] leading-snug text-slate-700">
          {{ selectedPromptText || (t('main.quick_pick.no_commands') || 'No commands found') }}
        </p>
      </div>
      <div class="space-y-1">
        <Badge variant="secondary" class="h-5 px-1.5 py-0 text-[10px] uppercase tracking-wide">
          Selection
        </Badge>
        <p class="line-clamp-3 whitespace-pre-wrap wrap-break-word font-mono text-[11px] leading-snug text-slate-600">
          {{ displaySelectionText }}
        </p>
      </div>
      <p v-if="isUsingTypedPrompt" class="text-[10px] leading-snug text-primary/85">
        No matching slash prompt. Press Enter to use your input as Prompt.
      </p>
    </div>
  </div>
</template>

<style scoped>
:global(body) {
  background-color: transparent !important;
}
</style>
