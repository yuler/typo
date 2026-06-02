import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { register, unregister, unregisterAll } from '@tauri-apps/plugin-global-shortcut'
import { logger } from '@/logger'
import { DEFAULT_GLOBAL_SHORTCUT, DEFAULT_QUICK_PICK_SHORTCUT, get } from './stores/settings'

const SHORTCUT_SETUP_REQUEST_EVENT = 'shortcut:setup-request'
const SHORTCUT_SETUP_RESPONSE_EVENT = 'shortcut:setup-response'
const SHORTCUT_UNREGISTER_REQUEST_EVENT = 'shortcut:unregister-request'
const SHORTCUT_UNREGISTER_RESPONSE_EVENT = 'shortcut:unregister-response'

export interface ShortcutConfig {
  global?: string
  quickPick?: string
}

interface ShortcutRequestPayload {
  requestId: string
  shortcuts?: ShortcutConfig
}

interface ShortcutSetupResponsePayload {
  requestId: string
  shortcuts: ShortcutConfig
}

interface ShortcutUnregisterResponsePayload {
  requestId: string
}

async function onShortcut() {
  logger.info('shortcut', 'onShortcut')
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

  // Always show the indicator window
  await invoke('open_indicator_window')

  const indicatorWindow = await WebviewWindow.getByLabel('indicator')
  if (indicatorWindow) {
    if (payload) {
      await invoke('set_pending_selection_input', { payload })
      logger.info('shortcut', 'emit set-input to indicator', payload)
      await indicatorWindow.emit('set-input', payload)
    }
    else {
      // Just show it if no payload
      await indicatorWindow.show()
    }
  }
}

async function onQuickPickShortcut() {
  logger.info('shortcut', 'onQuickPickShortcut')
  const opened = await invoke<boolean>('open_quick_pick_with_selection')
  if (!opened) {
    logger.warn('shortcut', 'onQuickPickShortcut: no text selected')
  }
}

export async function unregisterCurrentGlobalShortcut(): Promise<void> {
  try {
    await unregisterAll()
  }
  catch (e) {
    logger.error('shortcut', 'Failed to unregisterAll', e)
    const storedGlobalShortcut = await get('global_shortcut')
    const storedQuickPickShortcut = await get('quick_pick_shortcut')
    for (const shortcut of [DEFAULT_GLOBAL_SHORTCUT, DEFAULT_QUICK_PICK_SHORTCUT, storedGlobalShortcut, storedQuickPickShortcut]) {
      if (shortcut) {
        try {
          await unregister(shortcut)
        }
        catch {}
      }
    }
  }
}

async function registerWithFallback(
  shortcut: string,
  defaultShortcut: string,
  label: string,
  onRelease: () => void,
): Promise<string | undefined> {
  const handler = (event: any) => {
    logger.debug('shortcut', `${label} event`, event)
    if (event.state === 'Released')
      onRelease()
  }

  try {
    await register(shortcut, handler)
    logger.info('shortcut', `registered ${label}`, shortcut)
    return shortcut
  }
  catch (e) {
    logger.error('shortcut', `Failed to register ${label} shortcut ${shortcut}:`, e)
    if (shortcut !== defaultShortcut) {
      try {
        await register(defaultShortcut, handler)
        logger.info('shortcut', `registered fallback ${label}`, defaultShortcut)
        return defaultShortcut
      }
      catch (fallbackError) {
        logger.error('shortcut', `Failed to register fallback ${label} shortcut:`, fallbackError)
      }
    }
  }
  return undefined
}

export async function setupGlobalShortcuts(config?: ShortcutConfig): Promise<ShortcutConfig> {
  logger.info('shortcut', 'setupGlobalShortcuts', config)
  // 1. Unregister all existing shortcuts first
  await unregisterCurrentGlobalShortcut()

  // 2. Determine shortcuts to register
  const globalToRegister = config?.global || (await get('global_shortcut')) || DEFAULT_GLOBAL_SHORTCUT
  const quickPickToRegister = config?.quickPick || (await get('quick_pick_shortcut')) || DEFAULT_QUICK_PICK_SHORTCUT

  const registered: ShortcutConfig = {}

  // Register Global Shortcut
  registered.global = await registerWithFallback(
    globalToRegister,
    DEFAULT_GLOBAL_SHORTCUT,
    'global',
    onShortcut,
  )

  // Register Quick Pick Shortcut
  registered.quickPick = await registerWithFallback(
    quickPickToRegister,
    DEFAULT_QUICK_PICK_SHORTCUT,
    'quick pick',
    onQuickPickShortcut,
  )

  return registered
}

function createRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

async function emitIndicatorRequest<TResponse extends { requestId: string }>(
  requestEvent: string,
  responseEvent: string,
  payload: ShortcutRequestPayload,
): Promise<TResponse> {
  const indicatorWindow = await WebviewWindow.getByLabel('indicator')
  if (!indicatorWindow) {
    throw new Error('indicator window is not available')
  }

  let unlisten: (() => void) | undefined
  let timeout: number | undefined
  let isSettled = false

  try {
    return await new Promise<TResponse>((resolve, reject) => {
      timeout = window.setTimeout(() => {
        isSettled = true
        reject(new Error(`timed out waiting for ${responseEvent}`))
      }, 5000)

      listen<TResponse>(responseEvent, (event) => {
        if (event.payload.requestId !== payload.requestId) {
          return
        }

        isSettled = true
        resolve(event.payload)
      }).then((fn) => {
        if (isSettled) {
          fn()
          return
        }

        unlisten = fn
        return indicatorWindow.emit(requestEvent, payload).catch((error) => {
          isSettled = true
          reject(error)
        })
      }).catch((error) => {
        isSettled = true
        reject(error)
      })
    })
  }
  finally {
    if (timeout !== undefined) {
      window.clearTimeout(timeout)
    }
    unlisten?.()
  }
}

export async function requestIndicatorGlobalShortcutSetup(shortcuts?: ShortcutConfig): Promise<ShortcutConfig> {
  const payload = {
    requestId: createRequestId(),
    shortcuts,
  }

  const response = await emitIndicatorRequest<ShortcutSetupResponsePayload>(
    SHORTCUT_SETUP_REQUEST_EVENT,
    SHORTCUT_SETUP_RESPONSE_EVENT,
    payload,
  )

  return response.shortcuts
}

export async function requestIndicatorGlobalShortcutUnregister(): Promise<void> {
  const payload = {
    requestId: createRequestId(),
  }

  await emitIndicatorRequest<ShortcutUnregisterResponsePayload>(
    SHORTCUT_UNREGISTER_REQUEST_EVENT,
    SHORTCUT_UNREGISTER_RESPONSE_EVENT,
    payload,
  )
}

export async function listenForIndicatorShortcutRequests(onSetup?: (shortcuts: ShortcutConfig) => void): Promise<() => void> {
  const [unlistenSetup, unlistenUnregister] = await Promise.all([
    listen<ShortcutRequestPayload>(SHORTCUT_SETUP_REQUEST_EVENT, async (event) => {
      const shortcuts = await setupGlobalShortcuts(event.payload.shortcuts)
      onSetup?.(shortcuts)
      await emit(SHORTCUT_SETUP_RESPONSE_EVENT, {
        requestId: event.payload.requestId,
        shortcuts,
      } satisfies ShortcutSetupResponsePayload)
    }),
    listen<ShortcutRequestPayload>(SHORTCUT_UNREGISTER_REQUEST_EVENT, async (event) => {
      await unregisterCurrentGlobalShortcut()
      await emit(SHORTCUT_UNREGISTER_RESPONSE_EVENT, {
        requestId: event.payload.requestId,
      } satisfies ShortcutUnregisterResponsePayload)
    }),
  ])

  return () => {
    unlistenSetup()
    unlistenUnregister()
  }
}
