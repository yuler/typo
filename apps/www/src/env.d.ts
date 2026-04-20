/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    t: ReturnType<typeof import('./lib/i18n').$t>
  }
}
