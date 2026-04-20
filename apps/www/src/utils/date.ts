export function formatDateLong(date: Date, locale: string) {
  return date.toLocaleDateString(locale === 'en' ? 'en-US' : locale === 'zh' ? 'zh-CN' : 'ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
