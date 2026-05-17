<script setup lang="ts">
import type { Locale } from '@typo/languages'
import { localeNames, locales } from '@typo/languages'
import { SaveIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/composables/useI18n'

const { locale, setLocale, t } = useI18n()

async function onLocaleChange(next: Locale) {
  await setLocale(next)
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

    <div class="fixed bottom-6 right-8 flex justify-end">
      <Button variant="secondary">
        <SaveIcon class="w-4 h-4" />
        {{ t('settings.save') }}
      </Button>
    </div>
  </div>
</template>
