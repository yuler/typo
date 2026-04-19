import type { Locale, Namespace } from '@typo/languages'
import { createTranslator, defaultLocale } from '@typo/languages'

export function getLocale(astro: { currentLocale?: string }): Locale {
  return (astro.currentLocale as Locale) ?? defaultLocale
}

export function tr<N extends Namespace>(astro: { currentLocale?: string }, ns: N) {
  return createTranslator(getLocale(astro), ns)
}
