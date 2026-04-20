import type { Locale } from '@typo/languages'
import { createGenericTranslator, defaultLocale, locales } from '@typo/languages'
import { getRelativeLocaleUrl } from 'astro:i18n'
import en from '../locales/en.json'
import jp from '../locales/jp.json'
import zh from '../locales/zh.json'

const localMessages: Record<Locale, Record<string, string>> = { en, zh, jp }

export function getLocale(currentLocale?: string): Locale {
  if (currentLocale === 'ja' || currentLocale === 'jp')
    return 'jp'
  if (currentLocale === 'zh')
    return 'zh'
  return defaultLocale
}

/**
 * Factory that returns a translator for the given locale.
 */
export function $t(currentLocale?: string) {
  return createGenericTranslator(getLocale(currentLocale), localMessages)
}

/**
 * Legacy/Alternative translator factory that takes Astro-like object
 */
export function tr(astro: { currentLocale?: string }) {
  return $t(astro.currentLocale)
}

/**
 * Returns a localized path for the given locale using astro:i18n.
 */
export function getLocalizedPath(path: string, locale: Locale): string {
  // Strip existing locale prefix if any to avoid double prefixing
  const segments = path.split('/').filter(Boolean)
  const isLocale = ([...locales, 'ja'] as string[]).includes(segments[0] || '')
  const cleanPath = isLocale ? `/${segments.slice(1).join('/')}` : path

  return getRelativeLocaleUrl(locale, cleanPath)
}
