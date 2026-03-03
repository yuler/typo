import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { currentMonitor } from '@tauri-apps/api/window'

const MAIN_WIDTH = 300
const MAIN_HEIGHT = 56
const MAIN_BOTTOM_OFFSET = 200
export async function setupMainWindow() {
  const appWindow = WebviewWindow.getCurrent()
  const size = new LogicalSize(MAIN_WIDTH, MAIN_HEIGHT)
  await appWindow.setSize(size)
  await appWindow.setMinSize(size)
  await appWindow.setMaxSize(size)
  await appWindow.setResizable(false)
  await appWindow.setAlwaysOnTop(true)

  const monitor = await currentMonitor()
  if (!monitor)
    return
  const scale = monitor.scaleFactor
  const screenW = monitor.size.width / scale
  const screenH = monitor.size.height / scale
  const x = (screenW - MAIN_WIDTH) / 2
  const y = screenH - MAIN_HEIGHT - MAIN_BOTTOM_OFFSET
  await appWindow.setPosition(new LogicalPosition(x, y))
}

const SETTINGS_WIDTH = 400
const SETTINGS_HEIGHT = 300
export async function setupSettingsWindow() {
  const appWindow = WebviewWindow.getCurrent()
  await appWindow.setSize(new LogicalSize(SETTINGS_WIDTH, SETTINGS_HEIGHT))
  await appWindow.setMinSize(new LogicalSize(SETTINGS_WIDTH, SETTINGS_HEIGHT))
  await appWindow.setMaxSize(null)
  await appWindow.setResizable(true)
  await appWindow.setAlwaysOnTop(true)
  await appWindow.center()
}
