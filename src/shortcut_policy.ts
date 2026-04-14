export type ShortcutRegistrationBackend = 'portal' | 'plugin' | 'none'

export interface ShortcutRegistrationStatus {
  backend: ShortcutRegistrationBackend
  plugin_fallback_attempted: boolean
  error_message: string | null
}

export function shouldRegisterPluginGlobalShortcuts(
  s: ShortcutRegistrationStatus,
): boolean {
  return s.backend === 'plugin'
}
