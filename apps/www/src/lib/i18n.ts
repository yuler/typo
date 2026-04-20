import type { Locale } from '@typo/languages'
import { createGenericTranslator, defaultLocale } from '@typo/languages'
import { messages as sharedMessages } from '@typo/languages/messages/common'
import en from '../locales/en.json'
import jp from '../locales/jp.json'
import zh from '../locales/zh.json'

const localMessages: Record<Locale, Record<string, string>> = { en, zh, jp }

const allMessagesForLocale = {
  en: { ...sharedMessages.en, ...localMessages.en },
  zh: { ...sharedMessages.zh, ...localMessages.zh },
  jp: { ...sharedMessages.jp, ...localMessages.jp },
}

export function getLocale(astro: { currentLocale?: string, params?: Record<string, any> }): Locale {
  const l = astro.currentLocale || astro.params?.lang
  if (l === 'ja' || l === 'jp')
    return 'jp'
  if (l === 'zh')
    return 'zh'
  return defaultLocale
}

export function tr(astro: { currentLocale?: string, params?: Record<string, any> }, _ns?: string) {
  // We ignore namespace for now as we merge all local keys into one bundle per app
  return createGenericTranslator(getLocale(astro), allMessagesForLocale)
}

export function getLocalizedPath(path: string, locale: Locale): string {
  const stripped = path.replace(/^\/(zh|jp)(\/|$)/, '/').replace(/^\/+$/, '/')
  if (locale === 'en')
    return stripped
  return `/${locale}${stripped === '/' ? '' : stripped}`
}
