import type { Locale } from '@typo/languages'
import { createGenericTranslator, defaultLocale, locales } from '@typo/languages'
import { getCollection } from 'astro:content'
import { getRelativeLocaleUrl } from 'astro:i18n'
import en from '../locales/en.json'
import jp from '../locales/jp.json'
import zh from '../locales/zh.json'

export { defaultLocale, locales }

const localMessages: Record<Locale, Record<string, string>> = { en, zh, jp }

const localeMap: Record<string, Locale> = {
  en: 'en',
  zh: 'zh',
  ja: 'jp',
  jp: 'jp',
}

export function getLocale(currentLocale?: string): Locale {
  return localeMap[currentLocale || ''] || defaultLocale
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

/**
 * Helper to generate static paths for all locales.
 */
export function getI18nStaticPaths() {
  return [
    { params: { lang: undefined } },
    ...locales.filter(l => l !== defaultLocale).map(l => ({ params: { lang: l } })),
  ]
}

/**
 * Helper to generate static paths for all locales for a collection.
 */
export async function getI18nCollectionStaticPaths(collection: 'blog' | 'docs') {
  const entries = await getCollection(collection, ({ data }) => import.meta.env.DEV || !data.draft)
  return locales.flatMap(l =>
    entries.map(entry => ({
      params: { lang: l === defaultLocale ? undefined : l, slug: entry.id },
      props: { entry },
    })),
  )
}
