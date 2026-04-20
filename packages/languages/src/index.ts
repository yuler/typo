import type { Locale } from './constants'
import type { MessageKey } from './generated/keys'
import { messages } from './constants'
import { interpolate } from './interpolate'
import { lookup } from './lookup'

export { defaultLocale, localeFlags, localeNames, locales, messages } from './constants'
export type { Locale } from './constants'
export type { MessageKey } from './generated/keys'

// --- Translators ---

/**
 * Translator function for shared/common messages.
 */
export function t(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number | undefined | null>,
): string {
  const raw = lookup(messages, locale, key)
  return vars ? interpolate(raw, vars) : raw
}

/**
 * Creates a translator for shared/common messages.
 */
export function createTranslator(locale: Locale) {
  return (key: MessageKey, vars?: Record<string, string | number | undefined | null>): string =>
    t(locale, key, vars)
}

/**
 * Generic factory to create a translator with any message bundle.
 * Useful for apps to merge shared and local translations.
 */
export function createGenericTranslator<K extends string>(
  locale: Locale,
  bundle: Record<Locale, Record<K, string>>,
) {
  return (key: K, vars?: Record<string, string | number | undefined | null>): string => {
    const raw = lookup(bundle, locale, key)
    return vars ? interpolate(raw, vars) : raw
  }
}
