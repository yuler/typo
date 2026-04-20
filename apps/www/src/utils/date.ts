import type { Locale } from '@typo/languages'

const bcp47Map: Record<Locale, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  jp: 'ja-JP',
}

export function formatDateLong(date: Date, locale: Locale) {
  return date.toLocaleDateString(bcp47Map[locale] || bcp47Map.en, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
