import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  react: true,
  formatters: {
    astro: true,
    markdown: 'dprint',
  },
  ignores: [
    '**/src-tauri/**',
    'apps/www/.astro/**',
    'apps/www/dist/**',
    // Implementation plans embed large pseudo-code blocks; ESLint parses fenced
    // snippets as JS/TS/Vue and false-positives (hooks, no-cond-assign, etc.).
    'docs/superpowers/plans/**',
    // i18n design spec embeds TypeScript/Vue/Astro samples that trip embedded-MD parsers.
    'docs/superpowers/specs/2026-04-19-i18n-languages-package-design.md',
  ],
})
