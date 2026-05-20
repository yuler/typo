<script setup lang="ts">
import type { Locale } from '@typo/languages'
import { localeNames, locales } from '@typo/languages'
import { SaveIcon } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import SettingsPageLayout from '@/components/SettingsPageLayout.vue'
import { useI18n } from '@/composables/useI18n'
import * as store from '@/stores/settings'

const { locale, setLocale, t } = useI18n()

async function onLocaleChange(next: Locale) {
  await setLocale(next)
}

async function onSubmit() {
  await store.save()
  toast.success(t('settings.save_success'))
}
</script>

<template>
  <SettingsPageLayout :title="t('main.nav.appearance')">
    <div class="rounded-xl border bg-card p-6 shadow-sm">
      <div class="space-y-4">
        <div class="space-y-1">
          <Label class="text-base font-semibold">{{ t('settings.language.title') }}</Label>
          <p class="text-sm text-muted-foreground">
            {{ t('settings.appearance.language.description') }}
          </p>
        </div>
        <Select :model-value="locale" @update:model-value="(val: any) => onLocaleChange(val as Locale)">
          <SelectTrigger class="w-full h-11 bg-muted/20">
            <SelectValue :placeholder="t('settings.language.title')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="l in locales" :key="l" :value="l">
              {{ localeNames[l] }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <template #footer>
      <Button variant="secondary" size="lg" @click="onSubmit">
        <SaveIcon class="w-4 h-4 mr-2" />
        {{ t('settings.save') }}
      </Button>
    </template>
  </SettingsPageLayout>
</template>
