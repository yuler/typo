import { describe, expect, it } from 'vitest'
import { shouldRegisterPluginGlobalShortcuts } from './shortcut_policy'

describe('shouldRegisterPluginGlobalShortcuts', () => {
  it('returns false when portal owns shortcuts', () => {
    expect(
      shouldRegisterPluginGlobalShortcuts({
        backend: 'portal',
        plugin_fallback_attempted: false,
        error_message: null,
      }),
    ).toBe(false)
  })

  it('returns true when plugin path is active', () => {
    expect(
      shouldRegisterPluginGlobalShortcuts({
        backend: 'plugin',
        plugin_fallback_attempted: true,
        error_message: null,
      }),
    ).toBe(true)
  })
})
