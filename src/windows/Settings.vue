<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { EyeIcon, EyeOffIcon, PlusIcon, SaveIcon, Trash2Icon } from 'lucide-vue-next'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useGlobalState } from '@/composables/useGlobalState'
import { DEFAULT_SHORTCUT, formatShortcut, setupGlobalShortcut } from '@/shortcut'
import * as store from '@/store'

const { setCurrentWindow } = useGlobalState()

type SettingsTab = 'basic' | 'prompts'

const activeTab = ref<SettingsTab>('basic')
const showApiKey = ref(false)

const form = ref({
  autoselect: false,
  ai_provider: 'deepseek' as store.AI_PROVIDER,
  deepseek_api_key: '',
  ollama_model: '',
  system_prompt: '',
  slash_commands: [] as store.SlashCommand[],
  global_shortcut: '',
})

const ollamaModels = ref<any[]>([])

const isCapturingShortcut = ref(false)
const shortcutConflictError = ref('')
const isMacOS = ref(false)

function startCapture() {
  isCapturingShortcut.value = true
  shortcutConflictError.value = ''
  window.addEventListener('keydown', handleShortcutKeyDown)
}

function stopCapture() {
  isCapturingShortcut.value = false
  window.removeEventListener('keydown', handleShortcutKeyDown)
}

function handleShortcutKeyDown(e: KeyboardEvent) {
  e.preventDefault()
  e.stopPropagation()

  // Handle Escape to cancel
  if (e.key === 'Escape') {
    stopCapture()
    return
  }

  // Define modifiers
  const modifiers: string[] = []
  if (e.ctrlKey || e.metaKey)
    modifiers.push('CommandOrControl')
  if (e.altKey)
    modifiers.push('Alt')
  if (e.shiftKey)
    modifiers.push('Shift')

  // Ignore if only modifiers are pressed
  if (['Control', 'Alt', 'Shift', 'Meta', 'CapsLock'].includes(e.key))
    return

  // Format the key (Tauri expects capitalized keys like 'A' or named keys like 'Space')
  let key = e.key
  if (key === ' ')
    key = 'Space'
  if (key.length === 1)
    key = key.toUpperCase()

  // Require at least one modifier key (Cmd/Ctrl, Alt, or Shift) is present
  // This prevents single-key global shortcuts that would intercept that key system-wide
  if (modifiers.length === 0) {
    shortcutConflictError.value = 'At least one modifier key (⌘/Ctrl, Alt, or Shift) is required'
    return
  }

  const captured = [...modifiers, key].join('+')
  shortcutConflictError.value = ''
  form.value.global_shortcut = captured
  stopCapture()
}

async function loadOllamaModels() {
  ollamaModels.value = await store.getOllamaModels()
}

onMounted(async () => {
  form.value.autoselect = await store.get('autoselect')
  form.value.deepseek_api_key = await store.get('deepseek_api_key')
  form.value.ai_provider = await store.get('ai_provider')
  form.value.ollama_model = await store.get('ollama_model')
  form.value.system_prompt = await store.get('ai_system_prompt')
  form.value.global_shortcut = await store.get('global_shortcut') || DEFAULT_SHORTCUT

  const systemInfo = await invoke<{ os: string, is_wayland: boolean }>('get_system_info')
  isMacOS.value = systemInfo.os === 'macos'

  const shortcuts = await store.get('slash_commands')
  form.value.slash_commands = shortcuts.map(s => ({ ...s, id: s.id || crypto.randomUUID() }))

  if (form.value.ai_provider === 'ollama') {
    await loadOllamaModels()
  }

  nextTick(() => {
    const textarea = document.getElementById('system_prompt') as HTMLTextAreaElement
    if (textarea) {
      textarea.focus()
      textarea.setSelectionRange(0, 0)
    }
  })
})

onUnmounted(() => {
  // Clean up keydown listener if component is unmounted while capturing shortcut
  if (isCapturingShortcut.value) {
    stopCapture()
  }
})

watch(() => form.value.ai_provider, async (value: store.AI_PROVIDER) => {
  if (value === 'ollama') {
    await loadOllamaModels()
  }
})

function addPromptShortcut() {
  if (form.value.slash_commands.length >= 5) {
    return
  }

  form.value.slash_commands.push({ id: crypto.randomUUID(), key: '', value: '' })
}

function removePromptShortcut(index: number) {
  form.value.slash_commands.splice(index, 1)
}

async function onSubmit() {
  const slashCommands = form.value.slash_commands
    .map(item => ({ ...item, key: item.key.trim(), value: item.value.trim() }))
    .filter(item => item.key && item.value)
    .slice(0, 5)

  // Register shortcut first to see if it succeeds or falls back
  const requestedShortcut = form.value.global_shortcut
  const actualShortcut = await setupGlobalShortcut(requestedShortcut)

  if (requestedShortcut && actualShortcut !== requestedShortcut) {
    shortcutConflictError.value = `Conflict detected! Fallback to default: ${actualShortcut}`
    form.value.global_shortcut = actualShortcut
  }

  await Promise.all([
    store.set('autoselect', form.value.autoselect),
    store.set('ai_provider', form.value.ai_provider),
    store.set('deepseek_api_key', form.value.deepseek_api_key),
    store.set('ollama_model', form.value.ollama_model),
    store.set('ai_system_prompt', form.value.system_prompt),
    store.set('slash_commands', slashCommands),
    store.set('global_shortcut', actualShortcut),
  ])
  await store.save()

  if (!shortcutConflictError.value) {
    setCurrentWindow('Main')
  }
}
</script>

<template>
  <div class="h-full w-full border-t" @keydown.esc="setCurrentWindow('Main')">
    <div class="flex h-full">
      <aside class="w-44 border-r bg-muted/20 px-3 py-4 space-y-2">
        <h2 class="text-sm font-semibold px-2 text-muted-foreground uppercase tracking-wide">
          Settings
        </h2>
        <button
          class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors"
          :class="activeTab === 'basic' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
          @click="activeTab = 'basic'"
        >
          Basic
        </button>
        <button
          class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors"
          :class="activeTab === 'prompts' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
          @click="activeTab = 'prompts'"
        >
          Prompts
        </button>
      </aside>

      <main class="flex-1 overflow-y-auto px-8 py-6">
        <form class="w-full flex flex-col gap-5 pb-24" @submit.prevent="onSubmit">
          <template v-if="activeTab === 'basic'">
            <h1 class="text-2xl font-bold">
              Basic Settings
            </h1>

            <div class="grid w-full items-center gap-2">
              <div class="flex items-center space-x-2">
                <Switch id="autoselect" v-model="form.autoselect" />
                <Label for="autoselect">Auto Select</Label>
              </div>

              <div class="grid w-full items-center gap-2 mt-2">
                <Label for="global_shortcut">Global Shortcut</Label>
                <div class="flex flex-col gap-2">
                  <div class="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      class="w-full justify-start font-mono"
                      :class="{ 'border-primary ring-2 ring-primary': isCapturingShortcut }"
                      @click="isCapturingShortcut ? stopCapture() : startCapture()"
                    >
                      {{ form.global_shortcut ? formatShortcut(form.global_shortcut, isMacOS) : 'Click to set shortcut' }}
                    </Button>
                    <Button
                      v-if="!isCapturingShortcut && form.global_shortcut"
                      type="button"
                      variant="ghost"
                      size="icon"
                      @click="form.global_shortcut = DEFAULT_SHORTCUT"
                    >
                      <Trash2Icon class="h-4 w-4" />
                    </Button>
                  </div>
                  <p v-if="shortcutConflictError" class="text-xs font-medium text-destructive animate-pulse">
                    {{ shortcutConflictError }}
                  </p>
                  <p class="text-xs text-muted-foreground" :class="{ 'text-primary font-medium animate-pulse': isCapturingShortcut }">
                    {{ isCapturingShortcut ? 'Listening... (Press modifier + key, or Esc to cancel)' : 'Click the button then press modifier + key combination (⌘/Ctrl, Alt, or Shift required).' }}
                  </p>
                </div>
              </div>

              <Label for="ai_provider">AI Provider</Label>
              <Select id="ai_provider" v-model="form.ai_provider">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Select an AI Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deepseek">
                    DeepSeek
                  </SelectItem>
                  <SelectItem value="ollama">
                    Ollama
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div v-if="form.ai_provider === 'ollama'" class="grid w-full items-center gap-2">
              <Label for="ollama_model">Ollama Model</Label>
              <Select id="ollama_model" v-model="form.ollama_model">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Select a Ollama Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="model in ollamaModels" :key="model.name" :value="model.name">
                      {{ model.name }} ({{ model.details?.parameter_size ?? 'Unknown' }})
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div v-if="form.ai_provider === 'deepseek'" class="grid w-full items-center gap-2">
              <Label for="deepseek_api_key">DeepSeek API Key</Label>
              <div class="relative w-full">
                <Input
                  id="deepseek_api_key"
                  v-model="form.deepseek_api_key"
                  :type="showApiKey ? 'text' : 'password'"
                  autocomplete="off"
                  placeholder="Enter your DeepSeek API Key"
                  class="pr-10"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  @click="showApiKey = !showApiKey"
                >
                  <EyeIcon v-if="!showApiKey" class="h-4 w-4" />
                  <EyeOffIcon v-else class="h-4 w-4" />
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <h1 class="text-2xl font-bold">
              Prompt Settings
            </h1>

            <div class="grid w-full items-center gap-2">
              <Label for="system_prompt">System Prompt</Label>
              <Textarea id="system_prompt" v-model="form.system_prompt" autofocus :rows="12" placeholder="Enter your system prompt" />
            </div>

            <div class="grid w-full gap-3">
              <div class="flex items-center justify-between">
                <Label>Prompt Shortcuts (Max 5)</Label>
                <Button type="button" variant="outline" :disabled="form.slash_commands.length >= 5" @click="addPromptShortcut">
                  <PlusIcon class="w-4 h-4" />
                  Add Prompt
                </Button>
              </div>

              <div
                v-for="(item, index) in form.slash_commands"
                :key="item.id"
                class="rounded-lg border p-3 grid gap-2"
              >
                <div class="grid gap-1">
                  <Label :for="`prompt-key-${index}`">Key</Label>
                  <Input :id="`prompt-key-${index}`" v-model="item.key" placeholder="/tr:zh" />
                </div>
                <div class="grid gap-1">
                  <Label :for="`prompt-aliases-${index}`">Aliases (Comma separated)</Label>
                  <Input
                    :id="`prompt-aliases-${index}`"
                    :model-value="item.aliases?.join(', ')"
                    placeholder="/tr, /zh"
                    @update:model-value="(val) => item.aliases = String(val).split(',').map(s => s.trim()).filter(Boolean)"
                  />
                </div>
                <div class="grid gap-1">
                  <Label :for="`prompt-value-${index}`">Instruction</Label>
                  <Textarea :id="`prompt-value-${index}`" v-model="item.value" :rows="3" placeholder="Use {{args}} and {{text}} placeholders if needed" />
                </div>
                <div class="flex justify-end">
                  <Button type="button" variant="ghost" @click="removePromptShortcut(index)">
                    <Trash2Icon class="w-4 h-4" />
                    Remove
                  </Button>
                </div>
              </div>

              <p class="text-xs text-muted-foreground">
                Example: input ends with <code>/tr:zh</code> or a full line like <code>/prompt Translate to Japanese in polite style</code>.
              </p>
            </div>
          </template>

          <div class="fixed bottom-4 right-8 flex justify-end">
            <Button variant="secondary" type="submit">
              <SaveIcon class="w-4 h-4" />
              Save
            </Button>
          </div>
        </form>
      </main>
    </div>
  </div>
</template>
