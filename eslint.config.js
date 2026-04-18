import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  vue: true,
  astro: true,
  react: true,
  ignores: [
    '**/src-tauri/**',
    'apps/www/.astro/**',
    'apps/www/dist/**',
  ],
})
