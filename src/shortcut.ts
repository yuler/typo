import { invoke } from '@tauri-apps/api/core'
import { LogicalPosition } from '@tauri-apps/api/dpi'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { currentMonitor } from '@tauri-apps/api/window'
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { useGlobalState } from '@/composables/useGlobalState'
import store from './store'

const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+X'
const SETTING_SHORTCUT = 'CommandOrControl+,'

const CAPSULE_WIDTH = 300
const CAPSULE_HEIGHT = 60
const BOTTOM_OFFSET = 48

async function positionBottomCenter(win: WebviewWindow) {
  const monitor = await currentMonitor()
  if (!monitor)
    return
  const scale = monitor.scaleFactor
  const screenW = monitor.size.width / scale
  const screenH = monitor.size.height / scale
  const x = (screenW - CAPSULE_WIDTH) / 2
  const y = screenH - CAPSULE_HEIGHT - BOTTOM_OFFSET
  await win.setPosition(new LogicalPosition(x, y))
}

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
      await positionBottomCenter(appWindow)
      await appWindow?.setAlwaysOnTop(true)
      await appWindow?.setVisibleOnAllWorkspaces(true)

      if (selectedText) {
        await appWindow?.emit('set-input', { text: selectedText, mode: 'selected' })
      }
      else if (await store.get('autoselect')) {
        await invoke('select_all')
        const autoSelectedText = await invoke('get_selected_text')
        await appWindow?.emit('set-input', { text: autoSelectedText, mode: 'selected' })
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
