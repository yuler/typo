import { defineMiddleware } from 'astro:middleware'
import { $t, getLocale } from './lib/i18n'

export const onRequest = defineMiddleware((context, next) => {
  context.locals.locale = getLocale(context.currentLocale)
  context.locals.t = $t(context.currentLocale)
  return next()
})
