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

