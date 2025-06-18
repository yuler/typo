import { invoke } from '@tauri-apps/api/core'
import { Window } from '@tauri-apps/api/window'
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { useGlobalState } from '@/composables/useGlobalState'

const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+A'
const SETTING_SHORTCUT = 'CommandOrControl+,'

// let lastClipboardText = ''

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
      console.log('selectedText', selectedText)

      const mainWindow = await Window.getByLabel('main')

      await mainWindow?.show()
      await mainWindow?.setVisibleOnAllWorkspaces(true)
      await mainWindow?.setAlwaysOnTop(true)

      if (selectedText) {
        await mainWindow?.emit('set-input', selectedText)
      }

      // const clipboardText = await readText()
      // if (!clipboardText || clipboardText === lastClipboardText) {
      //   return
      // }

      // lastClipboardText = clipboardText
    })

    await register(SETTING_SHORTCUT, async (event) => {
      if (event.state !== 'Released') {
        return
      }

      const { setCurrentWindow } = useGlobalState()
      setCurrentWindow('Settings')
    })
  } catch (error) {
    console.error('Error setting up global shortcut:', error)
  }
}
