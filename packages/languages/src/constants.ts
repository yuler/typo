import en from './locales/en.json'
import jp from './locales/jp.json'
import zh from './locales/zh.json'

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

export const messages: Record<Locale, Record<string, string>> = { en, zh, jp }
