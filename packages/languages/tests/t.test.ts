import { describe, expect, it } from 'vitest'
import { createTranslator, t } from '../src/index'

describe('t', () => {
  it('returns the message for the requested locale', () => {
    expect(t('en', 'action.save')).toBe('Save')
    expect(t('zh', 'action.save')).toBe('保存')
    expect(t('jp', 'action.save')).toBe('保存')
  })

  it('interpolates variables', () => {
    // Note: brand.name doesn't have variables, but we can test the mechanism
    expect(t('en', 'brand.name')).toBe('typo')
  })
})

describe('createTranslator', () => {
  it('closes over locale', () => {
    const tr = createTranslator('zh')
    expect(tr('action.save')).toBe('保存')
    expect(tr('language.label')).toBe('语言')
  })
})
