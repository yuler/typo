export type Locale = 'en' | 'zh' | 'ja'

export const locales = ['en', 'zh', 'ja'] as const satisfies readonly Locale[]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
}
