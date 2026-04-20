import { defineMiddleware } from 'astro:middleware'
import { $t } from './lib/i18n'

export const onRequest = defineMiddleware((context, next) => {
  context.locals.t = $t(context.currentLocale)
  return next()
})
