import { defineMiddleware } from 'astro:middleware'
import { $t, getLocale } from './lib/i18n'

export const onRequest = defineMiddleware((context, next) => {
  const locale = getLocale(context.currentLocale || context.url.pathname.split('/').filter(Boolean)[0])

  context.locals.locale = locale
  context.locals.t = $t(locale)
  return next()
})
