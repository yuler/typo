<script setup lang="ts">
import { Window } from '@tauri-apps/api/window'
import { SaveIcon } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useGlobalState } from '../composables/useGlobalState'
import * as store from '../store'

const { setCurrentWindow } = useGlobalState()
const window = Window.getCurrent()

const form = ref({
  ai_provider: 'deepseek' as store.AI_PROVIDER,
  deepseek_api_key: '',
  ollama_model: '',
  system_prompt: '',
})

onMounted(async () => {
  form.value.deepseek_api_key = await store.get('deepseek_api_key')
  form.value.ai_provider = await store.get('ai_provider')
  form.value.ollama_model = await store.get('ollama_model')
  form.value.system_prompt = await store.get('ai_system_prompt')

  window.setSizeConstraints({
    minHeight: 450,
  })
})

const ollamaModels = ref<any[]>([])
watch(() => form.value.ai_provider, async (value: store.AI_PROVIDER) => {
  if (value === 'ollama') {
    ollamaModels.value = await store.getOllamaModels()
  }
})

function onSubmit() {
  store.set('ai_provider', form.value.ai_provider)
  store.set('deepseek_api_key', form.value.deepseek_api_key)
  store.set('ollama_model', form.value.ollama_model)
  store.set('ai_system_prompt', form.value.system_prompt)
  setCurrentWindow('Main')
}
</script>

<template>
  <div class="w-full px-8 py-4 border-t">
    <h1 class="text-2xl font-bold">
      Settings
    </h1>
    <form class="mt-4 w-full flex flex-col gap-4" @submit.prevent="onSubmit">
      <div class="grid w-full items-center gap-1.5">
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
        <Textarea id="system_prompt" v-model="form.system_prompt" :rows="5" placeholder="Enter your system prompt" />
      </div>

      <div class="fixed bottom-4 right-8 flex justify-end">
        <Button type="submit">
          <SaveIcon class="w-4 h-4" />
          Save
        </Button>
      </div>
    </form>
  </div>
</template>
