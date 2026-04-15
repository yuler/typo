<script setup lang="ts">
import type { CurrentWindow } from '@/composables/useGlobalState'
import type { SessionInfo } from '@/types'
import { invoke } from '@tauri-apps/api/core'
import { check } from '@tauri-apps/plugin-updater'
import { nextTick, onMounted, watch } from 'vue'
import Navbar from '@/components/Navbar.vue'
import Ribbon from '@/components/Ribbon.vue'
import Window from '@/components/Window.vue'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useGlobalState } from '@/composables/useGlobalState'
import { setupGlobalShortcut } from '@/shortcut'
import { initializeStore } from '@/store'
import { initializeWindow, setupMainWindow, setupSettingsWindow, setupUpgradeWindow } from '@/window'

const { currentWindow, setCurrentWindow, setUpdateInfo } = useGlobalState()
const isDev = import.meta.env.DEV

async function checkUpgrade() {
  try {
    const update = await check()
    if (update) {
      setUpdateInfo(update)
      setCurrentWindow('Upgrade')
    }
  }
  catch (err) {
    console.error(err)
  }
}

function onChangeWindow(window: CurrentWindow) {
  setCurrentWindow(window)
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

onMounted(async () => {
  const appWindow = WebviewWindow.getCurrent()
  await appWindow?.setVisibleOnAllWorkspaces(true)

  checkUpgrade()
  try {
    const sessionInfo = await invoke<SessionInfo>('get_session_info')
    await setupGlobalShortcut(sessionInfo)
  }
  catch (err) {
    console.error('Failed to get session info, falling back to default shortcut setup:', err)
    await setupGlobalShortcut()
  }
  initializeStore()
  initializeWindow()
})
</script>

<template>
  <main class="dark glass h-screen w-screen overflow-hidden flex flex-col">
    <Navbar v-if="currentWindow !== 'Main'" data-tauri-drag-region @settings="() => onChangeWindow('Settings')" />
    <Window class="flex-1" />
    <Ribbon v-if="isDev" />
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
