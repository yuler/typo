import type { MessageKey } from './generated/keys'

import en from './locales/en.json'
import jp from './locales/jp.json'
import zh from './locales/zh.json'

export type { MessageKey, Namespace } from './generated/keys'

// --- Shared Messages ---

export const messages: Record<Locale, Record<string, string>> = { en, zh, jp }

// --- Types ---

export type Locale = 'en' | 'zh' | 'jp'
export const locales = ['en', 'zh', 'jp'] as const satisfies readonly Locale[]
export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  jp: '日本語',
}

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  zh: '🇨🇳',
  jp: '🇯🇵',
}

// --- Interpolation ---

const TOKEN = /\{(\w+)\}/g

export function interpolate(
  template: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return template.replace(TOKEN, (_, key: string) => {
    const value = vars[key]
    return value === undefined || value === null ? `{${key}}` : String(value)
  })
}

// --- Lookup ---

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
 * Lookup function that handles locale fallback and automatically checks
 * shared/common messages if the key is not found in the provided bundle.
 *
 * Priority:
 * 1. bundle[locale][key]
 * 2. shared messages[locale][key]
 * 3. bundle['en'][key] (fallback)
 * 4. shared messages['en'][key] (fallback)
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
  const sharedVal = messages[locale]?.[key]
  if (sharedVal !== undefined)
    return sharedVal

  // 3. Try en fallback (bundle then shared)
  const fallback = bundle.en?.[key] || messages.en?.[key]
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

// --- Translators ---

/**
 * Translator function for shared/common messages.
 */
export function t(
  locale: Locale,
  key: MessageKey<'common'>,
  vars?: Record<string, string | number | undefined | null>,
): string {
  const raw = lookup(messages, locale, key)
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
