import type { Locale } from '@typo/languages'
import { bcp47Map } from '@/lib/i18n'

export function formatDateLong(date: Date, locale: Locale) {
  return date.toLocaleDateString(bcp47Map[locale] || bcp47Map.en, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
