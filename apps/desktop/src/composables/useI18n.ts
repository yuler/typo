/* eslint-disable react/no-unnecessary-use-prefix -- Vue composable naming (not React hooks) */
import type { Locale } from '@typo/languages'
import { emit, listen } from '@tauri-apps/api/event'
import { createGenericTranslator, defaultLocale } from '@typo/languages'
import { computed, ref } from 'vue'
import { get, save, set } from '@/store'
import en from '../locales/en.json'
import jp from '../locales/jp.json'
import zh from '../locales/zh.json'

const localMessages: Record<Locale, Record<string, string>> = { en, zh, jp }

const LOCALE_EVENT = 'typo://locale-changed'

const locale = ref<Locale>(defaultLocale)

export async function initializeI18n(): Promise<void> {
  locale.value = await get('locale')
  await listen<Locale>(LOCALE_EVENT, (event) => {
    locale.value = event.payload
  })
}

export async function setLocale(next: Locale): Promise<void> {
  locale.value = next
  await set('locale', next)
  await save()
  await emit(LOCALE_EVENT, next)
}

export function useI18n() {
  const translator = computed(() => createGenericTranslator(locale.value, localMessages))

  const t = (key: string, vars?: Record<string, string | number | undefined | null>) => translator.value(key, vars)

  return { locale, setLocale, t }
}
