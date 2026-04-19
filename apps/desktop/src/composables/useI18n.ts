import type { Locale, Namespace } from '@typo/languages'
import { emit, listen } from '@tauri-apps/api/event'
import { computed, ref } from 'vue'
import { createTranslator, defaultLocale } from '@typo/languages'
import { get, save, set } from '@/store'

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

export function useI18n<N extends Namespace>(namespace: N) {
  const t = computed(() => createTranslator(locale.value, namespace))
  return { locale, setLocale, t }
}
