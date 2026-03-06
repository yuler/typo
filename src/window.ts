import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import { currentMonitor, getCurrentWindow } from '@tauri-apps/api/window'
import { sleep } from './utils'

const APP_WINDOW_WIDTH = 300
const APP_WINDOW_HEIGHT = 56

const WINDOW_RIGHT_OFFSET = 20
const WINDOW_BOTTOM_OFFSET = 20

const STORAGE_MAIN_WINDOW_X = 'typo_main_window_x'
const STORAGE_MAIN_WINDOW_Y = 'typo_main_window_y'

// TODO: abstract this
function saveMainWindowPos(pos: LogicalPosition) {
  localStorage.setItem(STORAGE_MAIN_WINDOW_X, pos.x.toString())
  localStorage.setItem(STORAGE_MAIN_WINDOW_Y, pos.y.toString())
}

function getMainWindowPos(): LogicalPosition | null {
  const x = localStorage.getItem(STORAGE_MAIN_WINDOW_X)
  const y = localStorage.getItem(STORAGE_MAIN_WINDOW_Y)
  if (x !== null && y !== null) {
    return new LogicalPosition(Number.parseFloat(x), Number.parseFloat(y))
  }
  return null
}

export async function initializeWindow() {
  const appWindow = getCurrentWindow()
  await appWindow?.setAlwaysOnTop(true)
  await appWindow?.setVisibleOnAllWorkspaces(true)

  await setupMainWindow()

  const monitor = await currentMonitor()
  const savedPos = getMainWindowPos()
  let targetPos: LogicalPosition | null = null

  if (savedPos) {
    targetPos = savedPos
  }
  else if (monitor) {
    const scale = monitor.scaleFactor

    const logicalSize = new LogicalSize(APP_WINDOW_WIDTH, APP_WINDOW_HEIGHT)

    const screenW = monitor.size.width / scale
    const screenH = monitor.size.height / scale

    const x = screenW - logicalSize.width - WINDOW_BOTTOM_OFFSET
    const y = screenH - logicalSize.height - WINDOW_RIGHT_OFFSET

    targetPos = new LogicalPosition(x, y)
  }

  if (targetPos) {
    await appWindow.setPosition(targetPos)
  }

  appWindow.onMoved(async () => {
    const factor = await appWindow.scaleFactor()
    const sizePhysical = await appWindow.outerSize()
    const size = sizePhysical.toLogical(factor)
    // Only save position if the window is currently strictly in Main Window size
    if (size.width <= APP_WINDOW_WIDTH + 10) {
      const posPhysical = await appWindow.outerPosition()
      const pos = posPhysical.toLogical(factor)
      saveMainWindowPos(pos)
    }
  })

  await appWindow.show()
}

export const MAIN_WINDOW_WIDTH = 300
export const MAIN_WINDOW_HEIGHT = 56
export async function setupMainWindow() {
  const appWindow = getCurrentWindow()
  const size = new LogicalSize(MAIN_WINDOW_WIDTH, MAIN_WINDOW_HEIGHT)
  await appWindow.setSize(size)
  await appWindow.setMinSize(size)
  await appWindow.setMaxSize(size)

  const savedPos = getMainWindowPos()
  if (savedPos) {
    await sleep(50)
    await appWindow.setPosition(savedPos)
  }
}

export const SETTINGS_WINDOW_WIDTH = 600
export const SETTINGS_WINDOW_HEIGHT = 800
export async function setupSettingsWindow() {
  const appWindow = getCurrentWindow()
  await appWindow.setSize(new LogicalSize(SETTINGS_WINDOW_WIDTH, SETTINGS_WINDOW_HEIGHT))
  await appWindow.setMinSize(new LogicalSize(SETTINGS_WINDOW_WIDTH, SETTINGS_WINDOW_HEIGHT))
  await appWindow.setMaxSize(null)
  await sleep(50)
  await appWindow.center()
}

export const UPGRADE_WINDOW_WIDTH = 400
export const UPGRADE_WINDOW_HEIGHT = 450
export async function setupUpgradeWindow() {
  const appWindow = getCurrentWindow()
  const size = new LogicalSize(UPGRADE_WINDOW_WIDTH, UPGRADE_WINDOW_HEIGHT)
  await appWindow.setSize(size)
  await appWindow.setMinSize(size)
  await appWindow.setMaxSize(size)
  await sleep(50)
  await appWindow.center()
}
