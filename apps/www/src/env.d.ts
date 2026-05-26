/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    locale: import('@typo/languages').Locale
    tr: ReturnType<typeof import('./lib/i18n').$t>
  }
}
