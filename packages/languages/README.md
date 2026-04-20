# @typo/languages

Shared internationalization catalog and runtime helper for the typo monorepo.

## Locales

Supports `en` (default), `zh` (Simplified Chinese), and `jp` (Japanese).

## Usage

### Shared Translations

The package provides a built-in translator for shared strings (the `common` namespace).

```ts
import { createTranslator, t } from '@typo/languages'

// Direct lookup
t('en', 'brand.name') // "typo"
t('zh', 'action.save') // "保存"

// Created scoped translator
const tr = createTranslator('jp')
tr('action.cancel') // "キャンセル"
```

### App-Specific Translations

Use `createGenericTranslator` to apply the same lookup and interpolation logic to your application's local message bundles.

```ts
import type { Locale } from '@typo/languages'
import { createGenericTranslator } from '@typo/languages'
import en from './locales/en.json'
import jp from './locales/jp.json'
import zh from './locales/zh.json'

const messages = { en, jp, zh }
const tr = createGenericTranslator(locale as Locale, messages)

tr('my.local.key', { name: 'World' })
```

## Adding a translation key

1. Add the key to `src/locales/common/en.json` with the English value.
2. Add the same key to `src/locales/common/zh.json` and `src/locales/common/jp.json`.
3. Run `pnpm check` to validate or `pnpm build` to regenerate types (`src/generated/keys.d.ts`).

## Adding a shared namespace

1. Create `src/locales/<name>/{en,zh,jp}.json`.
2. Create `src/messages/<name>.ts` re-exporting the bundle (see `messages/common.ts`).
3. Add an `exports` entry in `package.json`.
4. Run `pnpm build`.

---

See [2026-04-19-i18n-languages-package-design.md](../../docs/superpowers/specs/2026-04-19-i18n-languages-package-design.md) for the full architectural design.
