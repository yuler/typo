import type { Locale, MessageKey } from '@typo/languages'
import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import { createGenericTranslator, defaultLocale, locales } from '@typo/languages'
import { computed, ref } from 'vue'
import { get, save, set } from '@/stores/settings'
import en from '../locales/en.json'
import jp from '../locales/jp.json'
import zh from '../locales/zh.json'

type LocalKey = keyof typeof en
type TranslationKey = LocalKey | MessageKey

const localMessages = { en, zh, jp } satisfies Record<Locale, Record<string, string>>

const LOCALE_EVENT = 'typo://locale-changed'

const locale = ref<Locale>(defaultLocale)

function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

export async function initializeI18n(): Promise<void> {
  locale.value = await get('locale')
  await listen<Locale>(LOCALE_EVENT, (event) => {
    locale.value = event.payload
  })
}

export async function initializeQuickPickI18n(): Promise<void> {
  const stored = await invoke<string>('get_local_locale').catch(() => defaultLocale)
  locale.value = isValidLocale(stored) ? stored : defaultLocale
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

  const t = (key: TranslationKey, vars?: Record<string, string | number | undefined | null>) => translator.value(key as any, vars)

  return { locale, setLocale, t }
}
