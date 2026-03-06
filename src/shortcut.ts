import { invoke } from '@tauri-apps/api/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { useGlobalState } from '@/composables/useGlobalState'
import store from './store'

const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+X'
const SETTING_SHORTCUT = 'CommandOrControl+,'

export async function setupGlobalShortcut() {
  try {
    if (await isRegistered(DEFAULT_SHORTCUT)) {
      await unregister(DEFAULT_SHORTCUT)
    }
    if (await isRegistered(SETTING_SHORTCUT)) {
      await unregister(SETTING_SHORTCUT)
    }

    await register(DEFAULT_SHORTCUT, async (event) => {
      if (event.state !== 'Released') {
        return
      }

      const selectedText = await invoke('get_selected_text')

      const appWindow = WebviewWindow.getCurrent()
      await appWindow?.setVisibleOnAllWorkspaces(true)

      if (selectedText) {
        await appWindow?.emit('set-input', { text: selectedText, mode: 'selected' })
      }
      else if (await store.get('autoselect')) {
        await invoke('select_all')
        const autoSelectedText = await invoke('get_selected_text')
        await appWindow?.emit('set-input', { text: autoSelectedText, mode: 'autoselect' })
      }
    })

    await register(SETTING_SHORTCUT, async (event) => {
      if (event.state !== 'Released') {
        return
      }

      const { setCurrentWindow } = useGlobalState()
      setCurrentWindow('Settings')
    })
  }
  catch (error) {
    console.error('Error setting up global shortcut:', error)
  }
}
