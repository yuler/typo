import { describe, expect, it } from 'vitest'
import { shouldRegisterPluginGlobalShortcuts } from './shortcut_policy'

const portalStatus = {
  backend: 'portal' as const,
  plugin_fallback_attempted: false,
  error_message: null,
}

const noneStatus = {
  backend: 'none' as const,
  plugin_fallback_attempted: false,
  error_message: null,
}

const pluginStatus = {
  backend: 'plugin' as const,
  plugin_fallback_attempted: true,
  error_message: null,
}

describe('shouldRegisterPluginGlobalShortcuts', () => {
  it('auto + wayland: false when portal owns shortcuts', () => {
    expect(shouldRegisterPluginGlobalShortcuts(portalStatus, 'auto', 'wayland')).toBe(false)
  })

  it('auto + wayland: true when backend none', () => {
    expect(shouldRegisterPluginGlobalShortcuts(noneStatus, 'auto', 'wayland')).toBe(true)
  })

  it('auto + x11: true when backend none', () => {
    expect(shouldRegisterPluginGlobalShortcuts(noneStatus, 'auto', 'x11')).toBe(true)
  })

  it('plugin preference: always true', () => {
    expect(shouldRegisterPluginGlobalShortcuts(portalStatus, 'plugin', 'wayland')).toBe(true)
    expect(shouldRegisterPluginGlobalShortcuts(noneStatus, 'plugin', 'wayland')).toBe(true)
  })

  it('portal preference: always false', () => {
    expect(shouldRegisterPluginGlobalShortcuts(noneStatus, 'portal', 'wayland')).toBe(false)
    expect(shouldRegisterPluginGlobalShortcuts(pluginStatus, 'portal', 'wayland')).toBe(false)
  })
})
