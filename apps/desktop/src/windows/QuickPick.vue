<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LazyStore } from '@tauri-apps/plugin-store'
import { SearchIcon, SettingsIcon } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'

const { t } = useI18n()
const appWindow = getCurrentWebviewWindow()
const localSettingsStore = new LazyStore('settings.json')

const capturedText = ref('')
const searchQuery = ref('')
const selectedIndex = ref(0)
const slashPrompts = ref<any[]>([])

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

const truncatedPreview = computed(() => {
  if (capturedText.value.length <= 80)
    return capturedText.value
  return `${capturedText.value.slice(0, 77)}...`
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
    // Store extra prompt info in settings or pass via custom event
    // For simplicity, we'll store the chosen prompt in a temporary place or emit it
    // The spec says: Call existing AI providers with { text: selection, prompt: slash.value, command: slash.key }
    // We need to pass this to the result window.
    // We'll use a dedicated event or the same pending input pattern.

    // Actually, Task 3 implemented set_quick_pick_input.
    // Let's refine the payload to include prompt info if needed,
    // but the spec says "AI providers with { text, prompt, command }".
    // We can just emit an event to the result window once it's open.

    await invoke('open_quick_pick_result_window')

    // Emit the specific prompt choice
    // We'll need to listen for this in QuickPickResult.vue
    setTimeout(async () => {
      const resultWindow = await (window as any).__TAURI_INTERNALS__.plugins.webviewWindow.WebviewWindow.getByLabel('quick-pick-result')
      if (resultWindow) {
        await resultWindow.emit('start-process', {
          text: capturedText.value,
          prompt: prompt.value,
          command: prompt.key,
        })
      }
    }, 500)

    await appWindow.hide() // Hide first for snappiness
    await appWindow.close()
  }
  catch (err) {
    logger.error('QuickPick', 'failed to confirm selection', err)
  }
}

async function closeWindow() {
  try {
    await appWindow.hide()
  }
  catch (error) {
    logger.error('QuickPick', 'failed to hide window', error)
  }

  try {
    await appWindow.close()
  }
  catch (error) {
    logger.error('QuickPick', 'failed to close window', error)
  }
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

async function openSettings() {
  await invoke('open_main_window')
  await closeWindow()
}

async function loadQuickPickData() {
  const [text, prompts] = await Promise.all([
    invoke<string>('get_selected_text'),
    localSettingsStore.get<any[]>('slash_prompts'),
  ])
  capturedText.value = text
  slashPrompts.value = Array.isArray(prompts) ? prompts : []
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKeyDown, true)
  document.addEventListener('keydown', onWindowKeyDown, true)

  void loadQuickPickData().finally(() => {
    const input = document.querySelector('input')
    input?.focus()
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onWindowKeyDown, true)
  document.removeEventListener('keydown', onWindowKeyDown, true)
})
</script>

<template>
  <div class="flex flex-col h-full bg-neutral-900 text-white border border-white/10 rounded-xl overflow-hidden shadow-2xl">
    <!-- Header: Selection Preview -->
    <div class="px-4 py-3 border-b border-white/5 bg-white/5">
      <p class="text-xs text-neutral-400 truncate font-mono">
        {{ truncatedPreview }}
      </p>
    </div>

    <!-- Search Area -->
    <div class="relative p-2">
      <SearchIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
      <Input
        v-model="searchQuery"
        class="pl-10 bg-neutral-800 border-none focus-visible:ring-1 focus-visible:ring-white/20 h-10"
        :placeholder="t('main.quick_pick.search_placeholder') || 'Search commands...'"
        @keydown="onKeyDown"
      />
    </div>

    <!-- Results -->
    <ScrollArea class="flex-1">
      <div v-if="filteredPrompts.length > 0" class="p-2 space-y-1">
        <button
          v-for="(prompt, index) in filteredPrompts"
          :key="prompt.key"
          class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left"
          :class="index === selectedIndex ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5'"
          @click="confirmSelection(prompt)"
          @mouseenter="selectedIndex = index"
        >
          <div class="flex items-center gap-2">
            <span class="font-bold text-white">{{ prompt.command }}</span>
            <span class="text-xs opacity-60 truncate max-w-[200px]">{{ prompt.value }}</span>
          </div>
          <div v-if="prompt.aliases?.length" class="flex gap-1">
            <Badge v-for="alias in prompt.aliases" :key="alias" variant="outline" class="text-[10px] py-0 px-1 opacity-50">
              {{ alias }}
            </Badge>
          </div>
        </button>
      </div>
      <div v-else class="p-8 text-center space-y-4">
        <p class="text-sm text-neutral-500">
          {{ t('main.quick_pick.no_commands') || 'No commands found' }}
        </p>
        <button
          class="text-xs text-primary hover:underline flex items-center gap-1 mx-auto"
          @click="openSettings"
        >
          <SettingsIcon class="w-3 h-3" />
          {{ t('main.quick_pick.configure') || 'Configure slash prompts' }}
        </button>
      </div>
    </ScrollArea>
  </div>
</template>

<style scoped>
:global(body) {
  background-color: transparent !important;
}
</style>
