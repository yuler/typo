import type { MessageKey } from './generated/keys'
import type { Locale } from './types'
import { interpolate } from './interpolate'
import { lookup } from './lookup'
import { messages as sharedMessages } from './messages/common'

/**
 * Translator function for shared/common messages.
 */
export function t(
  locale: Locale,
  key: MessageKey<'common'>,
  vars?: Record<string, string | number | undefined | null>,
): string {
  const raw = lookup(sharedMessages, locale, key)
  return vars ? interpolate(raw, vars) : raw
}

/**
 * Creates a translator for shared/common messages.
 */
export function createTranslator(locale: Locale) {
  return (key: MessageKey<'common'>, vars?: Record<string, string | number | undefined | null>): string =>
    t(locale, key, vars)
}

/**
 * Generic factory to create a translator with any message bundle.
 * Useful for apps to merge shared and local translations.
 */
export function createGenericTranslator<K extends string>(
  locale: Locale,
  messages: Record<Locale, Record<K, string>>,
) {
  return (key: K, vars?: Record<string, string | number | undefined | null>): string => {
    const raw = lookup(messages, locale as any, key)
    return vars ? interpolate(raw, vars) : raw
  }
}
