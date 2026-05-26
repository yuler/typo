import type { Locale } from '@typo/languages'
import { createGenericTranslator, defaultLocale, locales, messages as sharedMessages } from '@typo/languages'
import { getCollection } from 'astro:content'
import { isDocsGuideSlug, parseDocsEntry } from '@/lib/docs-nav'
import en from '../locales/en.json'
import jp from '../locales/jp.json'
import zh from '../locales/zh.json'

export { defaultLocale, locales }

export const bcp47Map: Record<Locale, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  jp: 'ja-JP',
}

/**
 * Merge local messages with shared messages from @typo/languages.
 */
const mergedMessages = {
  en: { ...sharedMessages.en, ...en },
  zh: { ...sharedMessages.zh, ...zh },
  jp: { ...sharedMessages.jp, ...jp },
}

const localeMap: Record<string, Locale> = {
  en: 'en',
  zh: 'zh',
  jp: 'jp',
  ja: 'jp',
}

export function getLocale(currentLocale?: string): Locale {
  return localeMap[currentLocale || ''] || defaultLocale
}

/**
 * Factory that returns a translator for the given locale.
 */
export function $t(currentLocale?: string) {
  return createGenericTranslator(getLocale(currentLocale), mergedMessages)
}

/**
 * Legacy/Alternative translator factory that takes Astro-like object
 */
export function tr(astro: { currentLocale?: string }) {
  return $t(astro.currentLocale)
}

/**
 * Returns a path prefixed for the given locale (`/zh/blog/...`; default locale has no prefix).
 */
export function getLocalizedPath(path: string, locale: Locale): string {
  // Strip existing locale prefix if any to avoid double prefixing
  const segments = path.split('/').filter(Boolean)
  const isLocale = ([...locales, 'ja'] as string[]).includes(segments[0] || '')
  const cleanSegments = isLocale ? segments.slice(1) : segments
  const cleanPath = cleanSegments.length ? `/${cleanSegments.join('/')}` : '/'

  if (locale === defaultLocale) {
    return cleanPath
  }

  return cleanPath === '/' ? `/${locale}/` : `/${locale}${cleanPath}`
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

  const entriesMap = new Map<string, Partial<Record<Locale, typeof entries[number]>>>()

  for (const entry of entries) {
    let entryLocale = defaultLocale
    let slug = entry.id

    if (collection === 'docs') {
      const parsed = parseDocsEntry(entry)
      entryLocale = parsed.locale
      slug = parsed.slug
      if (!isDocsGuideSlug(slug))
        continue
    }
    else {
      const parts = entry.id.split('/')
      if (locales.includes(parts[0] as Locale)) {
        entryLocale = parts[0] as Locale
        slug = parts.slice(1).join('/')
      }
    }

    if (!entriesMap.has(slug)) {
      entriesMap.set(slug, {})
    }
    entriesMap.get(slug)![entryLocale] = entry
  }

  return locales.flatMap((l) => {
    const paths = []
    for (const [slug, localeEntries] of entriesMap.entries()) {
      const entry = localeEntries[l] || localeEntries[defaultLocale]

      if (entry) {
        paths.push({
          params: { lang: l === defaultLocale ? undefined : l, slug },
          props: { entry },
        })
      }
    }
    return paths
  })
}
