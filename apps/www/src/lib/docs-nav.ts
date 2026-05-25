import type { Locale } from '@typo/languages'
import type { CollectionEntry } from 'astro:content'
import { defaultLocale, locales } from '@typo/languages'

/** Slug for locale overview pages (`overview.md`, `zh/overview.md`, …). Excluded from guide nav/cards. */
export const DOCS_OVERVIEW_SLUG = 'overview'

/** Default sidebar / index card order for docs collection entries. */
export const DOCS_NAV_ORDER = [
  'install-and-setup',
  'quickstart',
  'account',
  'slash-prompts',
  'faq',
] as const

export interface DocsNavEntry {
  entry: CollectionEntry<'docs'>
  locale: Locale
  slug: string
}

type DocsEntry = CollectionEntry<'docs'>

/**
 * Parse locale + slug from `src/content/docs/{slug}.mdx` or `src/content/docs/{locale}/{slug}.mdx`.
 */
export function parseDocsEntry(entry: Pick<DocsEntry, 'id'>): { locale: Locale, slug: string } {
  const id = entry.id.replace(/\\/g, '/')
  const parts = id.split('/')

  if (parts.length >= 2 && locales.includes(parts[0] as Locale)) {
    return {
      locale: parts[0] as Locale,
      slug: parts.slice(1).join('/'),
    }
  }

  return { locale: defaultLocale, slug: id }
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
    .filter(e => !navOrder.includes(e.slug) && e.slug !== DOCS_OVERVIEW_SLUG)
    .sort((a, b) => a.entry.data.title.localeCompare(b.entry.data.title))
  return [...ordered, ...rest]
}

export function isDocsGuideSlug(slug: string) {
  return slug !== DOCS_OVERVIEW_SLUG
}
