<script setup lang="ts">
import type { Locale } from '@typo/languages'
import { invoke } from '@tauri-apps/api/core'
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'
import { localeNames, locales } from '@typo/languages'
import { EyeIcon, EyeOffIcon, PlusIcon, RotateCcwIcon, SaveIcon, Trash2Icon } from 'lucide-vue-next'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useGlobalState } from '@/composables/useGlobalState'
import { useI18n } from '@/composables/useI18n'
import { setupGlobalShortcut, unregisterCurrentGlobalShortcut } from '@/shortcut'
import { DEFAULT_GLOBAL_SHORTCUT } from '@/store'
import * as store from '@/store'
import { formatShortcut } from '@/utils'

const { setCurrentWindow } = useGlobalState()

type SettingsTab = 'basic' | 'prompts'

const activeTab = ref<SettingsTab>('basic')
const showApiKey = ref(false)

const { locale, setLocale, t } = useI18n()

async function onLocaleChange(next: Locale) {
  await setLocale(next)
}

const form = ref({
  autostart: false,
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
const captureButtonEl = ref<HTMLElement | null>(null)
const pressedCaptureKeys = new Set<string>()
const recordedCaptureKeys = new Set<string>()

function normalizeCaptureKey(e: KeyboardEvent): string {
  const code = e.code
  if (/^Key[A-Z]$/.test(code))
    return code.slice(3).toUpperCase()
  if (/^Digit\d$/.test(code))
    return code.slice(5)
  if (/^F\d+$/.test(code))
    return code

  const keyByCode: Record<string, string> = {
    Space: 'Space',
    Escape: 'Escape',
    Enter: 'Enter',
    Tab: 'Tab',
    Backspace: 'Backspace',
    Delete: 'Delete',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
  }
  if (keyByCode[code])
    return keyByCode[code]

  if (e.key === ' ')
    return 'Space'
  if (e.key.length === 1)
    return e.key.toUpperCase()
  return e.key
}

function buildCapturedShortcut(keys: Set<string>): string {
  const keyList = [...keys]
  const hasCtrlOrMeta = keyList.includes('Control') || keyList.includes('Meta')
  const hasAlt = keyList.includes('Alt')
  const hasShift = keyList.includes('Shift')

  const mainKey = keyList.find(k => !['Control', 'Meta', 'Alt', 'Shift', 'CapsLock'].includes(k))
  if (!mainKey)
    return ''

  const modifiers: string[] = []
  if (hasCtrlOrMeta)
    modifiers.push('CommandOrControl')
  if (hasAlt)
    modifiers.push('Alt')
  if (hasShift)
    modifiers.push('Shift')

  if (modifiers.length === 0)
    return ''

  return [...modifiers, mainKey].join('+')
}

async function startCapture() {
  await unregisterCurrentGlobalShortcut()
  isCapturingShortcut.value = true
  shortcutConflictError.value = ''
  pressedCaptureKeys.clear()
  recordedCaptureKeys.clear()
  window.addEventListener('keydown', handleShortcutKeyDown)
  window.addEventListener('keyup', handleShortcutKeyUp)
  window.addEventListener('blur', handleCaptureWindowBlur)
  window.addEventListener('pointerdown', handleCapturePointerDown, true)
}

function stopCapture() {
  if (!isCapturingShortcut.value)
    return

  isCapturingShortcut.value = false
  window.removeEventListener('keydown', handleShortcutKeyDown)
  window.removeEventListener('keyup', handleShortcutKeyUp)
  window.removeEventListener('blur', handleCaptureWindowBlur)
  window.removeEventListener('pointerdown', handleCapturePointerDown, true)
  pressedCaptureKeys.clear()
  recordedCaptureKeys.clear()
}

function handleCaptureWindowBlur() {
  stopCapture()
}

function handleCapturePointerDown(e: PointerEvent) {
  const target = e.target
  if (!(target instanceof Node))
    return

  if (captureButtonEl.value?.contains(target))
    return

  stopCapture()
}

function handleShortcutKeyDown(e: KeyboardEvent) {
  e.preventDefault()
  e.stopPropagation()
  if (e.repeat)
    return

  // Handle Escape to cancel
  if (e.key === 'Escape') {
    stopCapture()
    return
  }
  const normalizedKey = normalizeCaptureKey(e)
  pressedCaptureKeys.add(normalizedKey)
  recordedCaptureKeys.add(normalizedKey)
}

function handleShortcutKeyUp(e: KeyboardEvent) {
  e.preventDefault()
  e.stopPropagation()
  const normalizedKey = normalizeCaptureKey(e)
  pressedCaptureKeys.delete(normalizedKey)

  // Commit only after all keys are released (Handy-style behavior).
  if (pressedCaptureKeys.size !== 0 || recordedCaptureKeys.size === 0)
    return

  const captured = buildCapturedShortcut(recordedCaptureKeys)
  // Require at least one modifier key (Cmd/Ctrl, Alt, or Shift) is present
  // This prevents single-key global shortcuts that would intercept that key system-wide
  if (!captured) {
    shortcutConflictError.value = t('settings.basic.shortcut.error_modifier')
    recordedCaptureKeys.clear()
    return
  }

  shortcutConflictError.value = ''
  form.value.global_shortcut = captured
  stopCapture()
}

async function loadOllamaModels() {
  ollamaModels.value = await store.getOllamaModels()
}

onMounted(async () => {
  form.value.autostart = await isEnabled()
  form.value.autoselect = await store.get('autoselect')
  form.value.deepseek_api_key = await store.get('deepseek_api_key')
  form.value.ai_provider = await store.get('ai_provider')
  form.value.ollama_model = await store.get('ollama_model')
  form.value.system_prompt = await store.get('ai_system_prompt')
  form.value.global_shortcut = await store.get('global_shortcut') || DEFAULT_GLOBAL_SHORTCUT

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

watch(() => form.value.autostart, async (value) => {
  console.log('autostart change:', value)
  try {
    if (value) {
      await enable()
      console.log('autostart enabled')
    }
    else {
      await disable()
      console.log('autostart disabled')
    }
  }
  catch (error) {
    console.error('autostart error:', error)
  }
  await store.set('autostart', value)
  await store.save()
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
    shortcutConflictError.value = t('settings.basic.shortcut.conflict', { shortcut: actualShortcut })
    form.value.global_shortcut = actualShortcut
  }

  await Promise.all([
    store.set('autostart', form.value.autostart),
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
          {{ t('settings.title') }}
        </h2>
        <button
          class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors"
          :class="activeTab === 'basic' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
          @click="activeTab = 'basic'"
        >
          {{ t('settings.tabs.basic') }}
        </button>
        <button
          class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors"
          :class="activeTab === 'prompts' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
          @click="activeTab = 'prompts'"
        >
          {{ t('settings.tabs.prompts') }}
        </button>
      </aside>

      <main class="flex-1 overflow-y-auto px-8 py-6">
        <form class="w-full flex flex-col gap-5 pb-24" @submit.prevent="onSubmit">
          <template v-if="activeTab === 'basic'">
            <div class="space-y-2">
              <Label>{{ t('settings.language.title') }}</Label>
              <Select :model-value="locale" @update:model-value="(val: any) => onLocaleChange(val as Locale)">
                <SelectTrigger class="w-full">
                  <SelectValue :placeholder="t('settings.language.title')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="l in locales" :key="l" :value="l">
                    {{ localeNames[l] }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <h1 class="text-2xl font-bold">
              {{ t('settings.basic.title') }}
            </h1>

            <div class="grid w-full items-center gap-4">
              <div class="flex items-center space-x-2">
                <Switch id="autostart" v-model="form.autostart" />
                <Label for="autostart">{{ t('settings.basic.autostart.label') }}</Label>
              </div>
              <p class="text-xs text-muted-foreground">
                {{ t('settings.basic.autostart.description') }}
              </p>

              <div class="flex items-center space-x-2">
                <Switch id="autoselect" v-model="form.autoselect" />
                <Label for="autoselect">{{ t('settings.basic.autoselect.label') }}</Label>
              </div>
              <p class="text-xs text-muted-foreground">
                {{ t('settings.basic.autoselect.description', { shortcut: isMacOS ? '⌘ + A' : 'Ctrl + A' }) }}
              </p>
              <div class="grid w-full items-center gap-2 mt-2">
                <Label for="global_shortcut">{{ t('settings.basic.shortcut.label') }}</Label>
                <div class="flex flex-col gap-2">
                  <div class="flex items-center gap-2">
                    <Button
                      ref="captureButtonEl"
                      type="button"
                      variant="outline"
                      class="flex-1 justify-start font-mono"
                      :class="{ 'border-primary ring-2 ring-primary': isCapturingShortcut }"
                      @click="isCapturingShortcut ? stopCapture() : startCapture()"
                    >
                      {{
                        isCapturingShortcut
                          ? t('settings.basic.shortcut.listening')
                          : formatShortcut(form.global_shortcut, isMacOS)
                      }}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      class="gap-1"
                      @click="form.global_shortcut = DEFAULT_GLOBAL_SHORTCUT"
                    >
                      <RotateCcwIcon class="h-4 w-4" />
                      {{ t('settings.basic.shortcut.reset') }}
                    </Button>
                  </div>
                  <p v-if="shortcutConflictError" class="text-xs font-medium text-destructive animate-pulse">
                    {{ shortcutConflictError }}
                  </p>
                  <p class="text-xs text-muted-foreground" :class="{ 'text-primary font-medium animate-pulse': isCapturingShortcut }">
                    {{ isCapturingShortcut ? t('settings.basic.shortcut.capturing_hint') : t('settings.basic.shortcut.hint') }}
                  </p>
                </div>
              </div>

              <Label for="ai_provider">{{ t('settings.basic.ai_provider.label') }}</Label>
              <Select id="ai_provider" v-model="form.ai_provider">
                <SelectTrigger class="w-full">
                  <SelectValue :placeholder="t('settings.basic.ai_provider.placeholder')" />
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
              <Label for="ollama_model">{{ t('settings.basic.ollama.model_label') }}</Label>
              <Select id="ollama_model" v-model="form.ollama_model">
                <SelectTrigger class="w-full">
                  <SelectValue :placeholder="t('settings.basic.ollama.model_placeholder')" />
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
              <Label for="deepseek_api_key">{{ t('settings.basic.deepseek.api_key_label') }}</Label>
              <div class="relative w-full">
                <Input
                  id="deepseek_api_key"
                  v-model="form.deepseek_api_key"
                  :type="showApiKey ? 'text' : 'password'"
                  autocomplete="off"
                  :placeholder="t('settings.basic.deepseek.api_key_placeholder')"
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
              {{ t('settings.prompts.title') }}
            </h1>

            <div class="grid w-full items-center gap-2">
              <Label for="system_prompt">{{ t('settings.prompts.system.label') }}</Label>
              <Textarea id="system_prompt" v-model="form.system_prompt" autofocus :rows="12" :placeholder="t('settings.prompts.system.placeholder')" />
            </div>

            <div class="grid w-full gap-3">
              <div class="flex items-center justify-between">
                <Label>{{ t('settings.prompts.shortcuts.label') }}</Label>
                <Button type="button" variant="outline" :disabled="form.slash_commands.length >= 5" @click="addPromptShortcut">
                  <PlusIcon class="w-4 h-4" />
                  {{ t('settings.prompts.shortcuts.add') }}
                </Button>
              </div>

              <div
                v-for="(item, index) in form.slash_commands"
                :key="item.id"
                class="rounded-lg border p-3 grid gap-2"
              >
                <div class="grid gap-1">
                  <Label :for="`prompt-key-${index}`">{{ t('settings.prompts.shortcuts.key_label') }}</Label>
                  <Input :id="`prompt-key-${index}`" v-model="item.key" placeholder="/tr:zh" />
                </div>
                <div class="grid gap-1">
                  <Label :for="`prompt-aliases-${index}`">{{ t('settings.prompts.shortcuts.aliases_label') }}</Label>
                  <Input
                    :id="`prompt-aliases-${index}`"
                    :model-value="item.aliases?.join(', ')"
                    placeholder="/tr, /zh"
                    @update:model-value="(val) => item.aliases = String(val).split(',').map(s => s.trim()).filter(Boolean)"
                  />
                </div>
                <div class="grid gap-1">
                  <Label :for="`prompt-value-${index}`">{{ t('settings.prompts.shortcuts.instruction_label') }}</Label>
                  <Textarea :id="`prompt-value-${index}`" v-model="item.value" :rows="3" :placeholder="t('settings.prompts.shortcuts.instruction_placeholder')" />
                </div>
                <div class="flex justify-end">
                  <Button type="button" variant="ghost" @click="removePromptShortcut(index)">
                    <Trash2Icon class="w-4 h-4" />
                    {{ t('settings.prompts.shortcuts.remove') }}
                  </Button>
                </div>
              </div>

              <p class="text-xs text-muted-foreground">
                <template v-for="(part, i) in t('settings.prompts.shortcuts.hint').split(/(<code>.*?<\/code>)/g)" :key="i">
                  <code v-if="part.startsWith('<code>')" class="bg-muted px-1 rounded">{{ part.replace(/<\/?code>/g, '') }}</code>
                  <template v-else>
                    {{ part }}
                  </template>
                </template>
              </p>
            </div>
          </template>

          <div class="fixed bottom-4 right-8 flex justify-end">
            <Button variant="secondary" type="submit">
              <SaveIcon class="w-4 h-4" />
              {{ t('settings.save') }}
            </Button>
          </div>
        </form>
      </main>
    </div>
  </div>
</template>
