import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lookup } from '../src/lookup'
import { messages as commonMessages } from '../src/messages/common'

describe('lookup', () => {
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warn.mockRestore()
  })

  it('returns the value from the requested locale', () => {
    expect(lookup(commonMessages, 'en', 'action.save')).toBe('Save')
    expect(lookup(commonMessages, 'zh', 'action.save')).toBe('保存')
    expect(lookup(commonMessages, 'jp', 'action.save')).toBe('保存')
  })

  it('falls back to en when the key exists in en but not in the requested locale', () => {
    expect(lookup(commonMessages, 'en', 'action.save')).toBe('Save')
  })

  it('returns the literal key when the key does not exist in any locale', () => {
    expect(lookup(commonMessages, 'en', 'no.such.key')).toBe('no.such.key')
  })

  it('warns when a key is missing entirely (in dev mode)', () => {
    vi.stubEnv('DEV', 'true' as any)
    lookup(commonMessages, 'en', 'no.such.key')
    expect(warn).toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
