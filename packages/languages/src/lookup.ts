import type { Locale } from './types'
import { messages as common } from './messages/common'
import { messages as desktop } from './messages/desktop'
import { messages as www } from './messages/www'

export type Namespace = 'common' | 'desktop' | 'www'

const all: Record<Namespace, Record<Locale, Record<string, string>>> = {
  common,
  desktop,
  www,
}

function nodeDevFlag(): boolean {
  const p = Reflect.get(globalThis, 'process') as { env?: Record<string, string | undefined> } | undefined
  return p?.env?.DEV === 'true'
}

function isDev(): boolean {
  if (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    return true
  }
  return nodeDevFlag()
}

export function lookup(locale: Locale, namespace: Namespace, key: string): string {
  const primary = all[namespace][locale]?.[key]
  if (primary !== undefined)
    return primary

  const fallback = all[namespace].en[key]
  if (fallback !== undefined) {
    if (isDev()) {
      console.warn(
        `[@typo/languages] Missing "${key}" in ${namespace}/${locale}, using en fallback`,
      )
    }
    return fallback
  }

  if (isDev()) {
    console.warn(`[@typo/languages] Missing key "${key}" in ${namespace}`)
  }
  return key
}
