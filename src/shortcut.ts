import { Window } from '@tauri-apps/api/window'
import { readText } from '@tauri-apps/plugin-clipboard-manager'
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut'

const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+A'

let lastClipboardText = ''

export async function setupGlobalShortcut() {
  try {
    if (await isRegistered(DEFAULT_SHORTCUT)) {
      await unregister(DEFAULT_SHORTCUT)
    }

    await register(DEFAULT_SHORTCUT, async (event) => {
      if (event.state !== 'Released') {
        return
      }

      const mainWindow = await Window.getByLabel('main')
      const mainVisible = await mainWindow?.isVisible()

      // toggle the main window
      if (mainVisible) {
        await mainWindow?.hide()
        await mainWindow?.setAlwaysOnTop(false)
      }
      else {
        await mainWindow?.show()
        await mainWindow?.setAlwaysOnTop(true)
      }

      const clipboardText = await readText()
      if (!clipboardText || clipboardText === lastClipboardText) {
        return
      }

      lastClipboardText = clipboardText
      await mainWindow?.emit('set-input', clipboardText)
    })
  }
  catch (error) {
    console.error('Error setting up global shortcut:', error)
  }
}
