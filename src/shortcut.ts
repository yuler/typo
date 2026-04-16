import { invoke } from '@tauri-apps/api/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut'
import { get } from './store'

export const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+X'

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
  // 1. Unregister all first
  try {
    await unregisterAll()
  }
  catch (e) {
    console.error('Failed to unregister', e)
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
