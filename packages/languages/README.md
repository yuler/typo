# @typo/languages

Shared internationalization catalog and runtime helper for the typo monorepo.

## Locales

`en` (default), `zh` (Simplified Chinese), `ja` (Japanese).

## Public API

```ts
import { t, createTranslator, locales, defaultLocale, localeNames, type Locale } from '@typo/languages'

t('en', 'common', 'action.save')                   // "Save"
t('zh', 'desktop', 'settings.language')            // "语言"
t('en', 'www', 'hero.cta', { app: 'typo' })

const tr = createTranslator('zh', 'common')
tr('action.save')                                  // "保存"
```

See `docs/superpowers/specs/2026-04-19-i18n-languages-package-design.md` for the full design.

## Adding a translation key

1. Add the key to `src/locales/<namespace>/en.json` with the English value.
2. Add the same key to `src/locales/<namespace>/zh.json` and `<namespace>/ja.json`.
3. Run `pnpm check` (validates) or `pnpm build` (also regenerates `src/generated/keys.d.ts`).

## Adding a namespace

1. Create `src/locales/<new>/{en,zh,ja}.json`.
2. Create `src/messages/<new>.ts` re-exporting the bundle (copy from `common.ts`).
3. Register it in `src/lookup.ts` `all` map.
4. Add an `exports` entry in `package.json`.
5. Run `pnpm build`.
