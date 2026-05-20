<script setup lang="ts">
import { SaveIcon } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import SettingsPageLayout from '@/components/SettingsPageLayout.vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import * as store from '@/stores/settings'

const { t } = useI18n()
const { isLoggedIn } = useAuth()

const form = ref({
  default_prompt: '',
})
const isLoading = ref(false)
const isSaving = ref(false)

async function loadDefaultPrompt() {
  isLoading.value = true
  try {
    if (isLoggedIn.value) {
      await store.fetchDefaultPromptFromServer()
    }
    form.value.default_prompt = await store.get('default_prompt')
  }
  catch (error) {
    logger.error('DefaultPromptSettings', 'Failed to load default prompt', error)
    toast.error(t('settings.load_error'))
  }
  finally {
    isLoading.value = false
  }
}

onMounted(loadDefaultPrompt)

watch(isLoggedIn, async (loggedIn) => {
  if (loggedIn)
    await loadDefaultPrompt()
})

async function onSubmit() {
  isSaving.value = true
  try {
    await store.persistDefaultPrompt(form.value.default_prompt)
    form.value.default_prompt = await store.get('default_prompt')
    toast.success(t('settings.save_success'))
  }
  catch (error) {
    logger.error('DefaultPromptSettings', 'Failed to save default prompt', error)
    toast.error(t('settings.save_error'))
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <SettingsPageLayout :title="t('main.nav.default_prompt')">
    <div class="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div class="p-6 space-y-4">
        <div class="space-y-2">
          <Label for="default_prompt" class="text-base font-semibold">{{ t('settings.default_prompt.label') }}</Label>
          <p class="text-sm text-muted-foreground">
            {{ t('settings.default_prompt.placeholder') }}
          </p>
        </div>
        <Skeleton v-if="isLoading" class="min-h-[300px] w-full" />
        <Textarea
          v-else
          id="default_prompt"
          v-model="form.default_prompt"
          :rows="12"
          class="min-h-[300px] resize-y bg-muted/20"
          placeholder="You are a helpful assistant..."
        />
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
