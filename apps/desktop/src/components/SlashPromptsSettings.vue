<script setup lang="ts">
import { PlusIcon, SaveIcon, Trash2Icon } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import SettingsPageLayout from '@/components/SettingsPageLayout.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import * as store from '@/stores/settings'

const { t } = useI18n()
const { isLoggedIn } = useAuth()

const MAX_SLASH_PROMPTS = 10

const form = ref({
  slash_prompts: [] as store.SlashPrompt[],
})
const isLoading = ref(false)
const isSaving = ref(false)

function mapSlashPromptsForForm(slashPrompts: store.SlashPrompt[]) {
  return slashPrompts.map(s => ({ ...s, id: s.id || crypto.randomUUID() }))
}

async function loadSlashPrompts() {
  isLoading.value = true
  try {
    if (isLoggedIn.value) {
      await store.fetchSlashPromptsFromServer()
    }
    const slashPrompts = await store.get('slash_prompts')
    form.value.slash_prompts = mapSlashPromptsForForm(slashPrompts)
  }
  catch (error) {
    logger.error('SlashPromptsSettings', 'Failed to load slash prompts', error)
    toast.error(t('settings.load_error'))
  }
  finally {
    isLoading.value = false
  }
}

onMounted(loadSlashPrompts)

watch(isLoggedIn, async (loggedIn) => {
  if (loggedIn)
    await loadSlashPrompts()
})

function addSlashPrompt() {
  if (form.value.slash_prompts.length >= MAX_SLASH_PROMPTS) {
    return
  }
  form.value.slash_prompts.push({ id: crypto.randomUUID(), key: '', value: '' })
}

function removeSlashPrompt(index: number) {
  form.value.slash_prompts.splice(index, 1)
}

async function onSubmit() {
  const slashPrompts = form.value.slash_prompts
    .map(item => ({ ...item, key: item.key.trim(), value: item.value.trim() }))
    .filter(item => item.key && item.value)
    .slice(0, MAX_SLASH_PROMPTS)

  isSaving.value = true
  try {
    await store.persistSlashPrompts(slashPrompts)
    const saved = await store.get('slash_prompts')
    form.value.slash_prompts = mapSlashPromptsForForm(saved)
    toast.success(t('settings.save_success'))
  }
  catch (error) {
    logger.error('SlashPromptsSettings', 'Failed to save slash prompts', error)
    toast.error(t('settings.save_error'))
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <SettingsPageLayout :title="t('main.nav.slash_prompts')">
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <Label class="text-base font-semibold">{{ t('settings.slash_prompts.label') }}</Label>
          <p class="text-xs text-muted-foreground">
            <template v-for="(part, i) in t('settings.slash_prompts.hint').split(/(<code>.*?<\/code>)/g)" :key="i">
              <code v-if="part.startsWith('<code>')" class="bg-muted px-1 rounded">{{ part.replace(/<\/?code>/g, '') }}</code>
              <template v-else>
                {{ part }}
              </template>
            </template>
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          :disabled="isLoading || form.slash_prompts.length >= MAX_SLASH_PROMPTS"
          @click="addSlashPrompt"
        >
          <PlusIcon class="w-4 h-4 mr-2" />
          {{ t('settings.slash_prompts.add') }}
        </Button>
      </div>

      <div v-if="isLoading" class="grid gap-4">
        <div
          v-for="i in 2"
          :key="i"
          class="rounded-xl border bg-card p-6 shadow-sm"
        >
          <div class="grid gap-6">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Skeleton class="h-4 w-16" />
                <Skeleton class="h-10 w-full" />
              </div>
              <div class="space-y-2">
                <Skeleton class="h-4 w-20" />
                <Skeleton class="h-10 w-full" />
              </div>
            </div>
            <div class="space-y-2">
              <Skeleton class="h-4 w-24" />
              <Skeleton class="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>

      <div v-else class="grid gap-4">
        <div
          v-for="(item, index) in form.slash_prompts"
          :key="item.id"
          class="group relative rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md"
        >
          <div class="grid gap-6">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label :for="`slash-prompt-key-${index}`" class="text-sm font-medium">{{ t('settings.slash_prompts.key_label') }}</Label>
                <Input :id="`slash-prompt-key-${index}`" v-model="item.key" placeholder="/tr:zh" class="bg-muted/20" />
              </div>
              <div class="space-y-2">
                <Label :for="`slash-prompt-aliases-${index}`" class="text-sm font-medium">{{ t('settings.slash_prompts.aliases_label') }}</Label>
                <Input
                  :id="`slash-prompt-aliases-${index}`"
                  :model-value="item.aliases?.join(', ')"
                  placeholder="/tr, /zh"
                  class="bg-muted/20"
                  @update:model-value="(val) => item.aliases = String(val).split(',').map(s => s.trim()).filter(Boolean)"
                />
              </div>
            </div>
            <div class="space-y-2">
              <Label :for="`slash-prompt-value-${index}`" class="text-sm font-medium">{{ t('settings.slash_prompts.instruction_label') }}</Label>
              <Textarea
                :id="`slash-prompt-value-${index}`"
                v-model="item.value"
                :rows="4"
                class="resize-y bg-muted/20"
                :placeholder="t('settings.slash_prompts.instruction_placeholder')"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
            @click="removeSlashPrompt(index)"
          >
            <Trash2Icon class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>

    <template #footer>
      <Button variant="secondary" size="lg" :disabled="isLoading || isSaving" @click="onSubmit">
        <SaveIcon class="w-4 h-4 mr-2" />
        {{ t('settings.save') }}
      </Button>
    </template>
  </SettingsPageLayout>
</template>
