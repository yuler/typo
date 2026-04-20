# @typo/languages

Shared internationalization (i18n) utilities and translation bundles for the Typo monorepo.

## Features

- **i18n Tools**: Type-safe lookup, interpolation, and translator factory helpers.
- **Shared Messages**: Centralized translation keys used across the workspace.
- **Language Support**: English (`en`), Simplified Chinese (`zh`), and Japanese (`jp`).

## Usage

### Using Shared Translations

Quickly access shared strings:

```ts
import { createTranslator, t } from '@typo/languages'

// Direct lookup
t('zh', 'action.save') // "保存"

// Create a translator for a locale
const tr = createTranslator('jp')
tr('action.cancel') // "キャンセル"
```

### For App-Specific Translations

Use `createGenericTranslator` to apply the same logic to your application's local JSON bundles:

```ts
import type { Locale } from '@typo/languages'
import { createGenericTranslator } from '@typo/languages'
import en from './locales/en.json'
import zh from './locales/zh.json'

const tr = createGenericTranslator(locale as Locale, { en, zh })
tr('my.local.key', { name: 'World' })
```

## Maintenance

1. **Add Keys**: Update `src/locales/{en,zh,jp}.json`.
2. **Sync Types**: Run `pnpm build` to regenerate `src/generated/keys.d.ts`.
