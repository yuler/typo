/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    locale: import('@typo/languages').Locale
    t: ReturnType<typeof import('./lib/i18n').$t>
  }
}
