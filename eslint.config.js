import antfu from '@antfu/eslint-config'

export default antfu({
  vue: {
    files: ['apps/desktop/**', 'packages/ui/**'],
  },
  react: {
    files: ['apps/www/**/*.{tsx,jsx}'],
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
})
