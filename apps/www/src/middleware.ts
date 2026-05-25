import { defineMiddleware } from 'astro:middleware'
import { $t, getLocale } from './lib/i18n'

const DOC_SLUGS = new Set([
  'docs',
  'getting-started',
  'features',
  'usage',
  'authentication',
  'prompt-shortcuts',
  'faq',
])

function isStarlightDocsPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0)
    return false
  if (segments[0] === 'zh' || segments[0] === 'jp')
    return DOC_SLUGS.has(segments[1] ?? '')
  return DOC_SLUGS.has(segments[0] ?? '')
}

export const onRequest = defineMiddleware((context, next) => {
  if (isStarlightDocsPath(context.url.pathname))
    return next()

  const locale = getLocale(context.currentLocale || context.url.pathname.split('/').filter(Boolean)[0])

  context.locals.locale = locale
  context.locals.tr = $t(locale)
  return next()
})
