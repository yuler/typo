<script setup lang="ts">
import type { CurrentWindow } from '@/composables/useGlobalState'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { currentMonitor, LogicalPosition } from '@tauri-apps/api/window'
import { onMounted, watch } from 'vue'
import Navbar from '@/components/Navbar.vue'
import Window from '@/components/Window.vue'
import { useGlobalState } from '@/composables/useGlobalState'
import { setupGlobalShortcut } from '@/shortcut'
import * as store from '@/store'
import { setupMainWindow, setupSettingsWindow } from '@/window'

const { currentWindow, setCurrentWindow } = useGlobalState()

function onChangeWindow(window: CurrentWindow) {
  setCurrentWindow(window)
}

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

watch(() => currentWindow.value, async () => {
  const appWindow = WebviewWindow.getCurrent()
  await positionBottomCenter(appWindow)
  await appWindow?.setAlwaysOnTop(true)
  await appWindow?.setVisibleOnAllWorkspaces(true)

  if (currentWindow.value === 'Main') {
    await setupMainWindow()
  }
  else if (currentWindow.value === 'Settings') {
    await setupSettingsWindow()
  }
})

onMounted(() => {
  setupGlobalShortcut()
  store.initialize()
})
</script>

<template>
  <main class="dark glass h-screen w-screen overflow-hidden flex flex-col">
    <Navbar v-if="currentWindow !== 'Main'" data-tauri-drag-region @settings="() => onChangeWindow('Settings')" />
    <Window class="flex-1" />
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
