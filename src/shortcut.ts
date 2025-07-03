import { invoke } from '@tauri-apps/api/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { readText } from '@tauri-apps/plugin-clipboard-manager'
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { useGlobalState } from '@/composables/useGlobalState'

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
      await appWindow?.center()
      await appWindow?.setAlwaysOnTop(true)
      await appWindow?.setVisibleOnAllWorkspaces(true)

      if (selectedText) {
        await appWindow?.emit('set-input', { text: selectedText, mode: 'selected' })
      }
      else {
        const clipboardText = await readText()
        await appWindow?.emit('set-input', { text: clipboardText, mode: 'clipboard' })
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
