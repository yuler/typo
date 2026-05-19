<script setup lang="ts">
import type { Component } from 'vue'
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { check } from '@tauri-apps/plugin-updater'
import { onMounted, onUnmounted } from 'vue'
import { Toaster } from '@/components/ui/sonner'
import { useGlobalState } from '@/composables/useGlobalState'
import { initializeI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import { initializeAuthStore } from '@/stores/auth'
import { initializeStore } from '@/stores/settings'
import Indicator from '@/windows/Indicator.vue'
import Main from '@/windows/Main.vue'
import Upgrade from '@/windows/Upgrade.vue'

const appWindow = getCurrentWebviewWindow()
const currentLabel = appWindow.label
const { setUpdateInfo } = useGlobalState()

const windows: Record<string, Component> = {
  main: Main,
  indicator: Indicator,
  upgrade: Upgrade,
}

let isMounted = true
onMounted(async () => {
  logger.info('App', `onMounted for window: ${currentLabel}`)

  // Basic initialization is required for every window
  await initializeStore()
  await initializeAuthStore()
  if (!isMounted) {
    return
  }
  await initializeI18n()
  if (!isMounted) {
    return
  }

  // For main and indicator windows, ensure they are visible on all workspaces
  if (currentLabel === 'main' || currentLabel === 'indicator') {
    await appWindow.setVisibleOnAllWorkspaces(true)
  }

  // Check for updates on startup
  if (currentLabel === 'main') {
    try {
      const update = await check()
      if (update?.available) {
        setUpdateInfo(update)
        const upgradeWindow = new WebviewWindow('upgrade', {
          url: '/upgrade',
          title: 'Typo Upgrade',
          width: 400,
          height: 300,
          resizable: false,
          fullscreen: false,
          alwaysOnTop: true,
          center: true,
          skipTaskbar: true,
          decorations: false,
          transparent: true,
          visible: false,
        })
        await upgradeWindow.once('tauri://created', async () => {
          await upgradeWindow.show()
          await upgradeWindow.setFocus()
        })
      }
    }
    catch (e) {
      logger.error('Update', `Update check failed: ${e}`)
    }
  }
})

onUnmounted(() => {
  isMounted = false
})
</script>

<template>
  <main
    class="h-screen w-screen overflow-hidden bg-transparent"
  >
    <component :is="windows[currentLabel]" v-if="windows[currentLabel]" />
    <div v-else class="flex items-center justify-center h-full text-white">
      Unknown window label: {{ currentLabel }}
    </div>
    <Toaster position="top-right" />
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
  background-color: transparent;
  overflow: hidden;
}
</style>
