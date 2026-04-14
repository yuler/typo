import type { LinuxShortcutBackend } from './store'

export type ShortcutRegistrationBackend = 'portal' | 'plugin' | 'none'

export interface ShortcutRegistrationStatus {
  backend: ShortcutRegistrationBackend
  plugin_fallback_attempted: boolean
  error_message: string | null
}

/** Whether the frontend should register `@tauri-apps/plugin-global-shortcut` handlers. */
export function shouldRegisterPluginGlobalShortcuts(
  status: ShortcutRegistrationStatus,
  preference: LinuxShortcutBackend,
  sessionKind: string,
): boolean {
  if (preference === 'portal') {
    return false
  }
  if (preference === 'plugin') {
    return true
  }
  // auto
  if (sessionKind === 'wayland') {
    return status.backend !== 'portal'
  }
  return status.backend !== 'portal'
}
