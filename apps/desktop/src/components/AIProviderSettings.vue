<script setup lang="ts">
import { EyeIcon, EyeOffIcon, SaveIcon } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/composables/useI18n'
import * as store from '@/stores/settings'

const { t } = useI18n()
const showApiKey = ref(false)
const ollamaModels = ref<any[]>([])

const form = ref({
  ai_provider: 'deepseek' as store.AI_PROVIDER,
  deepseek_api_key: '',
  ollama_model: '',
})

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

  await loadOllamaModels()
})

watch(() => form.value.ai_provider, async (value: store.AI_PROVIDER) => {
  if (value === 'ollama' && ollamaModels.value.length === 0) {
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
  toast.success(t('settings.save_success'))
}
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden px-1">
    <div class="flex-1 overflow-y-auto pr-4 -mr-4">
      <div class="flex flex-col gap-6 pb-24">
        <h1 class="text-2xl font-bold">
          {{ t('main.nav.ai_provider') }}
        </h1>

        <div class="space-y-4">
          <Label class="text-base font-semibold">{{ t('settings.basic.ai_provider.label') }}</Label>
          <RadioGroup v-model="form.ai_provider" class="flex flex-col gap-4">
            <!-- Typo Cloud -->
            <div class="flex flex-col gap-2 rounded-xl border bg-card p-6 shadow-sm transition-all" :class="{ 'border-primary ring-2 ring-primary/20 bg-primary/5': form.ai_provider === 'typo' }">
              <div class="flex items-center gap-3">
                <RadioGroupItem id="provider-typo" value="typo" />
                <Label for="provider-typo" class="text-lg font-bold cursor-pointer">
                  {{ t('settings.basic.typo.label') }}
                </Label>
              </div>
              <p class="text-sm text-muted-foreground pl-7">
                {{ t('settings.basic.typo.description') }}
              </p>
            </div>

            <!-- DeepSeek -->
            <div class="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm transition-all" :class="{ 'border-primary ring-2 ring-primary/20 bg-primary/5': form.ai_provider === 'deepseek' }">
              <div class="flex items-center gap-3">
                <RadioGroupItem id="provider-deepseek" value="deepseek" />
                <Label for="provider-deepseek" class="text-lg font-bold cursor-pointer">
                  DeepSeek
                </Label>
              </div>
              <div class="grid w-full items-center gap-4 pl-7">
                <div class="space-y-2">
                  <Label for="deepseek_api_key" class="text-sm font-medium">{{ t('settings.basic.deepseek.api_key_label') }}</Label>
                  <div class="relative w-full">
                    <Input
                      id="deepseek_api_key"
                      v-model="form.deepseek_api_key"
                      :type="showApiKey ? 'text' : 'password'"
                      autocomplete="off"
                      :placeholder="t('settings.basic.deepseek.api_key_placeholder')"
                      class="pr-10 bg-background h-11"
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
              </div>
            </div>

            <!-- Ollama -->
            <div class="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm transition-all" :class="{ 'border-primary ring-2 ring-primary/20 bg-primary/5': form.ai_provider === 'ollama' }">
              <div class="flex items-center gap-3">
                <RadioGroupItem id="provider-ollama" value="ollama" />
                <Label for="provider-ollama" class="text-lg font-bold cursor-pointer">
                  Ollama
                </Label>
              </div>
              <div class="grid w-full items-center gap-4 pl-7">
                <div class="space-y-2">
                  <Label for="ollama_model" class="text-sm font-medium">{{ t('settings.basic.ollama.model_label') }}</Label>
                  <Select id="ollama_model" v-model="form.ollama_model">
                    <SelectTrigger class="w-full bg-background h-11">
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
              </div>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>

    <!-- Sticky Footer for Save Button -->
    <div class="shrink-0 flex justify-end py-4 border-t bg-background/80 backdrop-blur-sm -mx-1 px-4">
      <Button variant="secondary" size="lg" @click="onSubmit">
        <SaveIcon class="w-4 h-4 mr-2" />
        {{ t('settings.save') }}
      </Button>
    </div>
  </div>
</template>
