import { describe, expect, it } from 'vitest'
import { cn, formatShortcut } from '../src/lib/utils'

describe('cn', () => {
  it('merges tailwind classes', () => {
    expect(cn('px-2 py-2', 'px-4')).toBe('py-2 px-4')
  })
})

describe('formatShortcut', () => {
  it('formats shortcut for mac', () => {
    expect(formatShortcut('CommandOrControl+K', true)).toBe('Command+K')
  })

  it('formats shortcut for non-mac', () => {
    expect(formatShortcut('CommandOrControl+K', false)).toBe('Ctrl+K')
  })
})
