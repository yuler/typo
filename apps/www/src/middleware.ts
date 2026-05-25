import { defineMiddleware } from 'astro:middleware'
import { $t, getLocale } from './lib/i18n'

function isDocsPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments[0] === 'docs')
    return true
  return segments.length >= 2 && (segments[0] === 'zh' || segments[0] === 'jp') && segments[1] === 'docs'
}

export const onRequest = defineMiddleware((context, next) => {
  const locale = getLocale(context.currentLocale || context.url.pathname.split('/').filter(Boolean)[0])

  context.locals.locale = locale
  context.locals.tr = $t(locale)
  return next()
})
