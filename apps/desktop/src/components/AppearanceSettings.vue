<script setup lang="ts">
import type { Locale } from '@typo/languages'
import { localeNames, locales } from '@typo/languages'
import { SaveIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/composables/useI18n'
import * as store from '@/stores/settings'
import { toast } from 'vue-sonner'

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
  <div class="h-full flex flex-col overflow-hidden px-1">
    <div class="flex-1 overflow-y-auto pr-4 -mr-4">
      <div class="flex flex-col gap-6 pb-24">
        <h1 class="text-2xl font-bold">
          {{ t('main.nav.appearance') }}
        </h1>

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
