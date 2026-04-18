import type { CollectionEntry } from 'astro:content'

/** Default sidebar / index card order for docs collection entries. */
export const DOCS_NAV_ORDER = ['getting-started', 'usage', 'prompt-shortcuts', 'faq'] as const

export function sortDocsEntries(entries: CollectionEntry<'docs'>[]): CollectionEntry<'docs'>[] {
  const navOrder = [...DOCS_NAV_ORDER] as string[]
  const ordered = navOrder
    .map(id => entries.find(e => e.id === id))
    .filter((e): e is CollectionEntry<'docs'> => Boolean(e))
  const rest = entries
    .filter(e => !navOrder.includes(e.id))
    .sort((a, b) => a.data.title.localeCompare(b.data.title))
  return [...ordered, ...rest]
}
