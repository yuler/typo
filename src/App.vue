<script setup lang="ts">
import type { CurrentWindow } from '@/composables/useGlobalState'
import { onMounted } from 'vue'
import Navbar from '@/components/Navbar.vue'
import Window from '@/components/Window.vue'
import { useGlobalState } from '@/composables/useGlobalState'
import { setupGlobalShortcut } from '@/shortcut'
import * as store from '@/store'

const { setCurrentWindow } = useGlobalState()

function onChangeWindow(window: CurrentWindow) {
  setCurrentWindow(window)
}

onMounted(() => {
  setupGlobalShortcut()
  store.initialize()
})
</script>

<template>
  <main class="dark glass h-screen w-screen rounded-lg overflow-hidden flex flex-col">
    <Navbar data-tauri-drag-region @settings="() => onChangeWindow('Settings')" />
    <!-- Simple manual change render window UI -->
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
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.8);
  overflow: hidden;
  color: #fff;
}

.glass {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(1px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  box-shadow:
    0 8px 32px rgba(31, 38, 135, 0.1),
    inset 0 4px 20px rgba(255, 255, 255, 0.2);
}

.glass::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(1px);
  box-shadow:
    inset -10px -8px 0px -11px rgba(255, 255, 255, 1),
    inset 0px -9px 0px -8px rgba(255, 255, 255, 1);
  opacity: 0.6;
  z-index: -1;
  filter: blur(1px) drop-shadow(10px 4px 6px black) brightness(105%);
}
</style>
