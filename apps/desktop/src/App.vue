<script setup lang="ts">
import type { UnlistenFn } from '@tauri-apps/api/event'
import type { CurrentWindow } from '@/composables/useGlobalState'
import type { SystemInfo } from '@/types'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import { check } from '@tauri-apps/plugin-updater'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import DeepLinkImportModal from '@/components/DeepLinkImportModal.vue'
import Navbar from '@/components/Navbar.vue'
import Ribbon from '@/components/Ribbon.vue'
import Window from '@/components/Window.vue'
import { useGlobalState } from '@/composables/useGlobalState'
import { initializeI18n, useI18n } from '@/composables/useI18n'
import { setupGlobalShortcut } from '@/shortcut'
import { get, initializeStore, save, set } from '@/store'
import { syncTrayMenu } from '@/tray'
import { initializeWindow, setupMainWindow, setupSettingsWindow, setupUpgradeWindow } from '@/window'

const { currentWindow, setCurrentWindow, setUpdateInfo } = useGlobalState()
const { t } = useI18n()
const isDev = import.meta.env.DEV
const trayUnlisteners: UnlistenFn[] = []
const importId = ref<string | null>(null)

async function notifyUpToDate() {
  try {
    const currentPermission = window.Notification?.permission
    if (currentPermission === 'denied') {
      console.warn('Notification permission denied by user policy.')
      return
    }

    let permissionGranted = await isPermissionGranted()
    if (!permissionGranted) {
      const permission = await requestPermission()
      permissionGranted = permission === 'granted'
    }

    if (!permissionGranted)
      return

    sendNotification({
      title: 'typo',
      body: t('updates.up_to_date', { version: __APP_VERSION__ }),
    })
  }
  catch (err) {
    console.error('Failed to send up-to-date notification:', err)
  }
}

async function checkUpgrade(options?: { verbose?: boolean }) {
  try {
    const update = await check()
    if (update) {
      setUpdateInfo(update)
      setCurrentWindow('Upgrade')
      return
    }

    if (options?.verbose) {
      await notifyUpToDate()
    }
  }
  catch (err) {
    console.error(err)
  }
}

function onChangeWindow(window: CurrentWindow) {
  setCurrentWindow(window)
}

async function handleImportSuccess(data: any) {
  const { metadata, content } = data
  if (!metadata || !content)
    return

  const commands = [...await get('slash_commands')]
  const newCommand = {
    id: metadata.id,
    key: `/${metadata.id}`,
    value: content,
  }

  const index = commands.findIndex(c => c.id === metadata.id || c.key === newCommand.key)
  if (index > -1) {
    commands[index] = newCommand
  }
  else {
    commands.push(newCommand)
  }

  await set('slash_commands', commands)
  await save()

  sendNotification({
    title: 'typo',
    body: t('import.success'),
  })
}

watch(() => currentWindow.value, async () => {
  if (currentWindow.value === 'Main') {
    await nextTick()
    await setupMainWindow()
  }
  else if (currentWindow.value === 'Settings') {
    await nextTick()
    await setupSettingsWindow()
  }
  else if (currentWindow.value === 'Upgrade') {
    await nextTick()
    await setupUpgradeWindow()
  }
})

onUnmounted(() => {
  for (const unlisten of trayUnlisteners)
    unlisten()
  trayUnlisteners.length = 0
})

onMounted(async () => {
  const appWindow = WebviewWindow.getCurrent()
  await appWindow?.setVisibleOnAllWorkspaces(true)

  await initializeStore()
  await initializeI18n()
  initializeWindow()
  await syncTrayMenu()

  trayUnlisteners.push(await listen('tray:open-settings', () => setCurrentWindow('Settings')))
  trayUnlisteners.push(await listen('tray:check-updates', () => void checkUpgrade({ verbose: true })))
  trayUnlisteners.push(await listen('set-input', () => {
    if (currentWindow.value !== 'Main') {
      setCurrentWindow('Main')
    }
  }))

  trayUnlisteners.push(await listen<string[]>('deep-link://link', (event) => {
    const payload = event.payload
    if (payload.length > 0) {
      try {
        const url = new URL(payload[0])
        if (url.protocol === 'typo:' && url.host === 'import-prompt') {
          const id = url.searchParams.get('id')
          if (id) {
            console.log('Detected import-prompt ID:', id)
            importId.value = id
          }
        }
      }
      catch (e) {
        console.error('Failed to parse deep-link URL:', e)
      }
    }
  }))

  void checkUpgrade()

  const systemInfo = await invoke<SystemInfo>('get_system_info')

  const isLinuxWayland = systemInfo.os === 'linux' && systemInfo.is_wayland
  if (!isLinuxWayland) {
    await setupGlobalShortcut()
  }
})
</script>

<template>
  <main class="dark glass h-screen w-screen overflow-hidden flex flex-col">
    <Navbar v-if="currentWindow !== 'Main'" data-tauri-drag-region @settings="() => onChangeWindow('Settings')" />
    <Window class="flex-1" />
    <Ribbon v-if="isDev" />
    <DeepLinkImportModal
      v-if="importId"
      :id="importId"
      @close="importId = null"
      @success="handleImportSuccess"
    />
  </main>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: transparent;
  overflow: hidden;
}

#app {
  height: 100vh;
  border-radius: var(--app-radius, 8px);
  background-color: rgba(24, 24, 24, 0.8);
  overflow: hidden;
  color: #fff;
}

.glass {
  position: relative;
  background: rgba(255, 255, 255, 0.01);
  backdrop-filter: blur(1px) saturate(180%);
  border: 1px solid rgba(211, 211, 211, 0.5);
  border-radius: var(--app-radius, 8px);
  box-shadow:
    0 8px 32px rgba(31, 38, 135, 0.1),
    inset 0 4px 16px rgba(255, 255, 255, 0.2);
}

.glass::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--app-radius, 8px);
  backdrop-filter: blur(1px);
  box-shadow:
    inset -10px -8px 0px -11px rgba(255, 255, 255, 1),
    inset 0px -9px 0px -8px rgba(255, 255, 255, 1);
  opacity: 0.6;
  z-index: -1;
  filter: blur(1px) drop-shadow(10px 4px 6px black) brightness(105%);
}
</style>
