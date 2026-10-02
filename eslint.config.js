import antfu from '@antfu/eslint-config'

export default antfu({
  vue: {
    files: ['apps/desktop/**/*.vue', 'apps/www/**/*.vue', 'packages/ui/**/*.vue'],
  },
  react: {
    files: ['apps/www/**/*.{tsx,jsx}', 'apps/intro-video/**/*.tsx'],
  },
  formatters: {
    astro: true,
    markdown: 'dprint',
  },
  ignores: [
    'docs/superpowers/**',
    '**/src-tauri/**',
    'core/**',
    'apps/www/.astro/**',
    'apps/www/dist/**',
    'packages/languages/src/generated/**',
    'packages/releases/data/**',
  ],
},
// Remotion co-locates frame constants with components (e.g. `export const X_FRAMES`
// alongside `export function X()`), which trips react-refresh/only-export-components.
// Disable it for the intro video; index keys are also fine for animated tokens.
{
  files: ['apps/intro-video/**/*.tsx'],
  rules: {
    'react-refresh/only-export-components': 'off',
    'react/no-array-index-key': 'off',
  },
})
