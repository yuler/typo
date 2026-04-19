import { describe, expect, it } from 'vitest'
import { createTranslator, t } from '../src/t'

describe('t', () => {
  it('returns the message for the requested locale', () => {
    expect(t('en', 'common', 'action.save')).toBe('Save')
    expect(t('zh', 'common', 'action.save')).toBe('保存')
    expect(t('ja', 'common', 'action.save')).toBe('保存')
  })

  it('interpolates variables', () => {
    expect(t('en', 'www', 'footer.copyright', { year: 2026, github: 'GitHub' }))
      .toBe('© 2026 typo. Open source on GitHub.')
  })

  it('looks up across namespaces', () => {
    expect(t('en', 'desktop', 'settings.language.title')).toBe('Display language')
    expect(t('zh', 'www', 'header.nav.docs')).toBe('文档')
  })
})

describe('createTranslator', () => {
  it('closes over locale and namespace', () => {
    const tr = createTranslator('zh', 'common')
    expect(tr('action.save')).toBe('保存')
    expect(tr('language.label')).toBe('语言')
  })

  it('forwards interpolation vars', () => {
    const tr = createTranslator('zh', 'www')
    expect(tr('footer.copyright', { year: 2026, github: 'GitHub' }))
      .toBe('© 2026 typo。开源于 GitHub。')
  })
})
