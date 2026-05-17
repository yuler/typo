<script setup lang="ts">
import type { Locale } from '@typo/languages'
import { localeNames, locales } from '@typo/languages'
import { EyeIcon, EyeOffIcon, SaveIcon } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/composables/useI18n'
import * as store from '@/stores/settings'

const { locale, setLocale, t } = useI18n()
const showApiKey = ref(false)
const ollamaModels = ref<any[]>([])

const form = ref({
  ai_provider: 'deepseek' as store.AI_PROVIDER,
  deepseek_api_key: '',
  ollama_model: '',
})

async function onLocaleChange(next: Locale) {
  await setLocale(next)
}

async function loadOllamaModels() {
  ollamaModels.value = await store.getOllamaModels()
}

onMounted(async () => {
  const [deepseekApiKey, aiProvider, ollamaModel] = await Promise.all([
    store.get('deepseek_api_key'),
    store.get('ai_provider'),
    store.get('ollama_model'),
  ])
  form.value.deepseek_api_key = deepseekApiKey
  form.value.ai_provider = aiProvider
  form.value.ollama_model = ollamaModel

  if (form.value.ai_provider === 'ollama') {
    await loadOllamaModels()
  }
})

watch(() => form.value.ai_provider, async (value: store.AI_PROVIDER) => {
  if (value === 'ollama') {
    await loadOllamaModels()
  }
})

async function onSubmit() {
  await Promise.all([
    store.set('ai_provider', form.value.ai_provider),
    store.set('deepseek_api_key', form.value.deepseek_api_key),
    store.set('ollama_model', form.value.ollama_model),
  ])
  await store.save()
}
</script>

<template>
  <div class="w-full flex flex-col gap-5 pb-24 h-full overflow-y-auto">
    <h1 class="text-2xl font-bold">
      {{ t('main.nav.appearance') }}
    </h1>

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

    <div class="space-y-2">
      <Label for="ai_provider">{{ t('settings.basic.ai_provider.label') }}</Label>
      <Select id="ai_provider" v-model="form.ai_provider">
        <SelectTrigger class="w-full">
          <SelectValue :placeholder="t('settings.basic.ai_provider.placeholder')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="typo">
            {{ t('settings.basic.typo.label') }}
          </SelectItem>
          <SelectItem value="deepseek">
            DeepSeek
          </SelectItem>
          <SelectItem value="ollama">
            Ollama
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div v-if="form.ai_provider === 'typo'" class="text-xs text-muted-foreground p-3 border border-dashed rounded-md bg-muted/20">
      {{ t('settings.basic.typo.description') }}
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

    <div class="fixed bottom-6 right-8 flex justify-end">
      <Button variant="secondary" @click="onSubmit">
        <SaveIcon class="w-4 h-4" />
        {{ t('settings.save') }}
      </Button>
    </div>
  </div>
</template>
