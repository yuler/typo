import type { Locale } from '@typo/languages'
import type { CollectionEntry } from 'astro:content'
import { defaultLocale, locales } from '@typo/languages'

/** Default sidebar / index card order for docs collection entries. */
export const DOCS_NAV_ORDER = ['getting-started', 'usage', 'prompt-shortcuts', 'faq'] as const

export interface DocsNavEntry {
  entry: CollectionEntry<'docs'>
  locale: Locale
  slug: string
}

type DocsEntry = CollectionEntry<'docs'>

export function parseDocsEntry(entry: Pick<DocsEntry, 'id' | 'filePath'>): { locale: Locale, slug: string } {
  const filePath = entry.filePath?.replace(/\\/g, '/')
  const docsPath = filePath?.split('src/content/docs/').at(-1)
  const filenameMatch = docsPath?.match(/^(.*)\.([^./]+)\.mdx?$/)

  if (filenameMatch) {
    const possibleLocale = filenameMatch[2]
    if (locales.includes(possibleLocale as Locale)) {
      return {
        locale: possibleLocale as Locale,
        slug: filenameMatch[1],
      }
    }
  }

  const lastDotIndex = entry.id.lastIndexOf('.')

  if (lastDotIndex > 0) {
    const possibleLocale = entry.id.slice(lastDotIndex + 1)
    if (locales.includes(possibleLocale as Locale)) {
      return {
        locale: possibleLocale as Locale,
        slug: entry.id.slice(0, lastDotIndex),
      }
    }
  }

  return { locale: defaultLocale, slug: entry.id }
}

export function getLocalizedDocsEntries(entries: CollectionEntry<'docs'>[], locale: Locale): DocsNavEntry[] {
  const entriesBySlug = new Map<string, Partial<Record<Locale, CollectionEntry<'docs'>>>>()

  for (const entry of entries) {
    const parsed = parseDocsEntry(entry)
    if (!entriesBySlug.has(parsed.slug)) {
      entriesBySlug.set(parsed.slug, {})
    }
    entriesBySlug.get(parsed.slug)![parsed.locale] = entry
  }

  return [...entriesBySlug.entries()]
    .map(([slug, localizedEntries]) => {
      const entry = localizedEntries[locale] || localizedEntries[defaultLocale]
      return entry ? { entry, locale: parseDocsEntry(entry).locale, slug } : undefined
    })
    .filter((doc): doc is DocsNavEntry => Boolean(doc))
}

export function sortDocsEntries(entries: DocsNavEntry[]): DocsNavEntry[] {
  const navOrder = [...DOCS_NAV_ORDER] as string[]
  const ordered = navOrder
    .map(id => entries.find(e => e.slug === id))
    .filter((e): e is DocsNavEntry => Boolean(e))
  const rest = entries
    .filter(e => !navOrder.includes(e.slug))
    .sort((a, b) => a.entry.data.title.localeCompare(b.entry.data.title))
  return [...ordered, ...rest]
}
