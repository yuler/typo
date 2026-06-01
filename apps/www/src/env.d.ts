/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, unknown>
  export default component
}

declare namespace App {
  interface Locals {
    locale: import('@typo/languages').Locale
    tr: ReturnType<typeof import('./lib/i18n').$t>
  }
}
