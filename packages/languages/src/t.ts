import type { MessageKey, Namespace } from './generated/keys'
import type { Locale } from './types'
import { interpolate } from './interpolate'
import { lookup } from './lookup'

export function t<N extends Namespace>(
  locale: Locale,
  namespace: N,
  key: MessageKey<N>,
  vars?: Record<string, string | number>,
): string {
  const raw = lookup(locale, namespace, key)
  return vars ? interpolate(raw, vars) : raw
}

export function createTranslator<N extends Namespace>(locale: Locale, namespace: N) {
  return (key: MessageKey<N>, vars?: Record<string, string | number>): string =>
    t(locale, namespace, key, vars)
}
