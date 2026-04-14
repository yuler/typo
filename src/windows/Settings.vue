<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { SaveIcon } from 'lucide-vue-next'
import { nextTick, onMounted, ref, watch } from 'vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useGlobalState } from '@/composables/useGlobalState'
import type { ShortcutRegistrationStatus } from '@/shortcut_policy'
import * as store from '@/store'

const { setCurrentWindow } = useGlobalState()

const shortcutStatus = ref<ShortcutRegistrationStatus | null>(null)
const sessionKind = ref<string>('')

const form = ref({
  autoselect: false,
  ai_provider: 'deepseek' as store.AI_PROVIDER,
  deepseek_api_key: '',
  ollama_model: '',
  system_prompt: '',
})

onMounted(async () => {
  shortcutStatus.value = await invoke<ShortcutRegistrationStatus>('get_shortcut_registration_status')
  sessionKind.value = await invoke<string>('get_session_kind')

  form.value.autoselect = await store.get('autoselect')
  form.value.deepseek_api_key = await store.get('deepseek_api_key')
  form.value.ai_provider = await store.get('ai_provider')
  form.value.ollama_model = await store.get('ollama_model')
  form.value.system_prompt = await store.get('ai_system_prompt')

  // autofocus textarea
  nextTick(() => {
    const textarea = document.getElementById('system_prompt') as HTMLTextAreaElement
    if (textarea) {
      textarea.focus()
      textarea.setSelectionRange(0, 0)
    }
  })
})

const ollamaModels = ref<any[]>([])
watch(() => form.value.ai_provider, async (value: store.AI_PROVIDER) => {
  if (value === 'ollama') {
    ollamaModels.value = await store.getOllamaModels()
  }
})

async function onSubmit() {
  await Promise.all([
    store.set('autoselect', form.value.autoselect),
    store.set('ai_provider', form.value.ai_provider),
    store.set('deepseek_api_key', form.value.deepseek_api_key),
    store.set('ollama_model', form.value.ollama_model),
    store.set('ai_system_prompt', form.value.system_prompt),
  ])
  await store.save()
  setCurrentWindow('Main')
}
</script>

<template>
  <div
    class="w-full px-8 py-4 border-t"
    @keydown.esc="setCurrentWindow('Main')"
  >
    <h1 class="text-2xl font-bold">
      Settings
    </h1>
    <Alert
      v-if="shortcutStatus && (shortcutStatus.error_message || (shortcutStatus.backend === 'none' && sessionKind === 'wayland'))"
      :variant="shortcutStatus.error_message ? 'destructive' : 'default'"
      class="mt-4"
    >
      <AlertTitle>Global shortcuts</AlertTitle>
      <AlertDescription>
        <template v-if="shortcutStatus.error_message">
          {{ shortcutStatus.error_message }}
        </template>
        <template v-else>
          Global shortcuts may not work on this Wayland session. See the section
          <span class="font-medium">Wayland: Typo global shortcuts</span>
          in <code class="rounded bg-muted px-1 py-0.5 text-xs">README.md</code>
          in this repository.
        </template>
      </AlertDescription>
    </Alert>
    <form class="mt-4 w-full flex flex-col gap-4" @submit.prevent="onSubmit">
      <div class="grid w-full items-center gap-1.5">
        <!-- Auto Select -->
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

      <div v-if="form.ai_provider === 'ollama'" class="grid w-full items-center gap-1.5">
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

      <div v-if="form.ai_provider === 'deepseek'" class="grid w-full items-center gap-1.5">
        <Label for="deepseek_api_key">DeepSeek API Key</Label>
        <Input id="deepseek_api_key" v-model="form.deepseek_api_key" type="text" placeholder="Enter your DeepSeek API Key" />
      </div>

      <div class="grid w-full items-center gap-1.5">
        <Label for="system_prompt">System Prompt</Label>
        <Textarea id="system_prompt" v-model="form.system_prompt" autofocus :rows="20" placeholder="Enter your system prompt" />
      </div>

      <div class="fixed bottom-4 right-8 flex justify-end">
        <Button variant="secondary" type="submit">
          <SaveIcon class="w-4 h-4" />
          Save
        </Button>
      </div>
    </form>
  </div>
</template>
