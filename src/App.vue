<script setup lang="ts">
import type { CurrentWindow } from './composables/useGlobalState'
import { onMounted } from 'vue'
import { setupGlobalShortcut } from '@/shortcut'
import Navbar from './components/Navbar.vue'
import Window from './components/Window.vue'
import { useGlobalState } from './composables/useGlobalState'

const { currentWindow, setCurrentWindow } = useGlobalState()

function onChangeWindow(window: CurrentWindow) {
  setCurrentWindow(window)
}

onMounted(() => {
  setupGlobalShortcut()
})
</script>

<template>
  <main class="h-screen w-screen">
    <Navbar v-if="currentWindow === 'None'" @change-window="onChangeWindow" />

    <Window />
  </main>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.75);
}
</style>
