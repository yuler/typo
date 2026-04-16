import { invoke } from '@tauri-apps/api/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut'
import store from './store'

const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+X'

export async function setupGlobalShortcut() {
  try {
    if (await isRegistered(DEFAULT_SHORTCUT)) {
      await unregister(DEFAULT_SHORTCUT)
    }

    await register(DEFAULT_SHORTCUT, async (event) => {
      if (event.state !== 'Released') {
        return
      }

      const selectedText = await invoke('get_selected_text')
      const appWindow = WebviewWindow.getCurrent()

      if (selectedText) {
        await appWindow?.emit('set-input', { text: selectedText, mode: 'selected' })
      }
      else if (await store.get('autoselect')) {
        await invoke('keyboard_select_all')
        const autoSelectedText = await invoke('get_selected_text')
        await appWindow?.emit('set-input', { text: autoSelectedText, mode: 'autoselect' })
      }
    })
  }
  catch (error) {
    console.error('Error setting up global shortcut:', error)
  }
}
