import { invoke } from '@tauri-apps/api/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { register, unregister, unregisterAll } from '@tauri-apps/plugin-global-shortcut'
import { DEFAULT_GLOBAL_SHORTCUT, get } from './store'

async function handleShortcut() {
  const selectedText = (await invoke('get_selected_text')) as string
  let payload: { text: string, mode: string } | null = null

  if (selectedText) {
    payload = { text: selectedText, mode: 'selected' }
  }
  else if (await get('autoselect')) {
    await invoke('keyboard_select_all')
    const autoSelectedText = (await invoke('get_selected_text')) as string
    if (autoSelectedText) {
      payload = { text: autoSelectedText, mode: 'autoselect' }
    }
  }

  if (payload) {
    const appWindow = WebviewWindow.getCurrent()
    await appWindow?.show()
    await appWindow?.setFocus()

    await invoke('set_pending_selection_input', { payload })
    await appWindow?.emit('set-input', payload)
  }
}

export async function unregisterCurrentGlobalShortcut(): Promise<void> {
  try {
    await unregisterAll()
  }
  catch (e) {
    console.error('Failed to unregisterAll', e)
    const storedShortcut = await get('global_shortcut')
    for (const shortcut of [DEFAULT_GLOBAL_SHORTCUT, storedShortcut]) {
      if (shortcut) {
        try {
          await unregister(shortcut)
        }
        catch {}
      }
    }
  }
}

export async function setupGlobalShortcut(shortcut?: string): Promise<string> {
  // 1. Unregister all existing shortcuts first
  await unregisterCurrentGlobalShortcut()

  // 2. Determine shortcut to register
  const shortcutToRegister = shortcut || (await get('global_shortcut')) || DEFAULT_GLOBAL_SHORTCUT

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
    if (shortcutToRegister !== DEFAULT_GLOBAL_SHORTCUT) {
      try {
        await register(DEFAULT_GLOBAL_SHORTCUT, (event) => {
          if (event.state === 'Released')
            handleShortcut()
        })
        return DEFAULT_GLOBAL_SHORTCUT
      }
      catch (fallbackError) {
        console.error('Failed to register fallback shortcut:', fallbackError)
      }
    }
  }
  return ''
}
