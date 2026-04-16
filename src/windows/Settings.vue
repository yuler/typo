<script setup lang="ts">
import { EyeIcon, EyeOffIcon, PlusIcon, SaveIcon, Trash2Icon } from 'lucide-vue-next'
import { nextTick, onMounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useGlobalState } from '@/composables/useGlobalState'
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
})

const ollamaModels = ref<any[]>([])

async function loadOllamaModels() {
  ollamaModels.value = await store.getOllamaModels()
}

onMounted(async () => {
  form.value.autoselect = await store.get('autoselect')
  form.value.deepseek_api_key = await store.get('deepseek_api_key')
  form.value.ai_provider = await store.get('ai_provider')
  form.value.ollama_model = await store.get('ollama_model')
  form.value.system_prompt = await store.get('ai_system_prompt')
  
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

  await Promise.all([
    store.set('autoselect', form.value.autoselect),
    store.set('ai_provider', form.value.ai_provider),
    store.set('deepseek_api_key', form.value.deepseek_api_key),
    store.set('ollama_model', form.value.ollama_model),
    store.set('ai_system_prompt', form.value.system_prompt),
    store.set('slash_commands', slashCommands),
  ])
  await store.save()
  setCurrentWindow('Main')
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
                  <Input :id="`prompt-key-${index}`" v-model="item.key" placeholder="/tr:zh or /prompt" />
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
