import { invoke } from '@tauri-apps/api/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { register, unregister, unregisterAll } from '@tauri-apps/plugin-global-shortcut'
import { get } from './store'

export const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+X'

export function formatShortcut(shortcut: string, mac: boolean): string {
  return shortcut
    .replace('CommandOrControl', mac ? '⌘' : 'Ctrl')
    .replace('Shift', mac ? '⇧' : 'Shift')
    .replace('Alt', mac ? '⌥' : 'Alt')
}

async function handleShortcut() {
  const selectedText = await invoke('get_selected_text')
  const appWindow = WebviewWindow.getCurrent()

  if (selectedText) {
    await appWindow?.emit('set-input', { text: selectedText, mode: 'selected' })
  }
  else if (await get('autoselect')) {
    await invoke('keyboard_select_all')
    const autoSelectedText = await invoke('get_selected_text')
    await appWindow?.emit('set-input', { text: autoSelectedText, mode: 'autoselect' })
  }
}

export async function setupGlobalShortcut(shortcut?: string): Promise<string> {
  // 1. Unregister all existing shortcuts first
  try {
    await unregisterAll()
  }
  catch (e) {
    console.error('Failed to unregisterAll', e)
    // Fallback: explicitly unregister known shortcuts
    const storedShortcut = await get('global_shortcut')
    for (const s of [DEFAULT_SHORTCUT, storedShortcut]) {
      if (s) {
        try { await unregister(s) } catch (_) {}
      }
    }
  }

  // 2. Determine shortcut to register
  const shortcutToRegister = shortcut || (await get('global_shortcut')) || DEFAULT_SHORTCUT

  try {
    await register(shortcutToRegister, (event) => {
      if (event.state === 'Released')
        handleShortcut()
    })
    return shortcutToRegister
  }
  catch (e) {
    console.error(`Failed to register shortcut ${shortcutToRegister}:`, e)
    // 3. Fallback to default if custom fails
    if (shortcutToRegister !== DEFAULT_SHORTCUT) {
      try {
        await register(DEFAULT_SHORTCUT, (event) => {
          if (event.state === 'Released')
            handleShortcut()
        })
        return DEFAULT_SHORTCUT
      }
      catch (fallbackError) {
        console.error('Failed to register fallback shortcut:', fallbackError)
      }
    }
  }
  return ''
}
