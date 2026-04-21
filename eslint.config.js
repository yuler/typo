import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  react: true,
  formatters: {
    astro: true,
    markdown: 'dprint',
  },
  ignores: [
    'docs/superpowers/**',
    '**/src-tauri/**',
    'apps/www/.astro/**',
    'apps/www/dist/**',
    'packages/languages/src/generated/**',
  ],
})
