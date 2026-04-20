import type { Locale } from './constants'
import { messages } from './constants'
import { isDev } from './env'

/**
 * Lookup function that handles locale fallback and automatically checks
 * shared/common messages if the key is not found in the provided bundle.
 */
export function lookup(
  bundle: Record<Locale, Record<string, string>>,
  locale: Locale,
  key: string,
): string {
  // 1. Try local bundle for requested locale
  const val = bundle[locale]?.[key]
  if (val !== undefined)
    return val

  // 2. Try shared common messages for requested locale
  const sharedVal = (messages[locale] as Record<string, string>)?.[key]
  if (sharedVal !== undefined)
    return sharedVal

  // 3. Try en fallback (bundle then shared)
  const fallback = bundle.en?.[key] || (messages.en as Record<string, string>)?.[key]
  if (fallback !== undefined) {
    if (isDev() && locale !== 'en') {
      console.warn(
        `[@typo/languages] Missing "${key}" in ${locale}, using en fallback`,
      )
    }
    return fallback
  }

  if (isDev()) {
    console.warn(`[@typo/languages] Missing key "${key}" in locale "${locale}"`)
  }
  return key
}
