import type { Locale } from './types'

export function nodeDevFlag(): boolean {
  const p = Reflect.get(globalThis, 'process') as { env?: Record<string, string | undefined> } | undefined
  return p?.env?.DEV === 'true'
}

export function isDev(): boolean {
  if (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    return true
  }
  return nodeDevFlag()
}

/**
 * Generic lookup function that handles locale fallback to 'en'.
 */
export function lookup(
  messages: Record<Locale, Record<string, string>>,
  locale: Locale,
  key: string,
): string {
  const primary = messages[locale]?.[key]
  if (primary !== undefined)
    return primary

  const fallback = messages.en[key]
  if (fallback !== undefined) {
    if (isDev()) {
      console.warn(
        `[@typo/languages] Missing "${key}" in ${locale}, using en fallback`,
      )
    }
    return fallback
  }

  if (isDev()) {
    console.warn(`[@typo/languages] Missing key "${key}"`)
  }
  return key
}
