import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { readText } from '@tauri-apps/plugin-clipboard-manager'
import { useGlobalState } from '@/composables/useGlobalState'

export async function setupGlobalShortcut() {
  try {
    // 监听 Rust 端发送的全局快捷键事件
    await listen<string>('global-shortcut', async (event) => {
      const shortcut = event.payload

      if (shortcut === 'default') {
        const selectedText = await invoke('get_selected_text')

        const appWindow = WebviewWindow.getCurrent()
        // await appWindow?.setAlwaysOnTop(true)
        // await appWindow?.setVisibleOnAllWorkspaces(true)
        await appWindow?.show()

        if (selectedText) {
          await appWindow?.emit('set-input', { text: selectedText, mode: 'selected', noFocus: true })
        }
        else {
          const clipboardText = await readText()
          await appWindow?.emit('set-input', { text: clipboardText, mode: 'clipboard', noFocus: true })
        }
      }
      else if (shortcut === 'settings') {
        const { setCurrentWindow } = useGlobalState()
        setCurrentWindow('Settings')
      }
    })
  }
  catch (error) {
    console.error('Error setting up global shortcut:', error)
  }
}
