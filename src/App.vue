<script setup lang="ts">
import type { CurrentWindow } from './composables/useGlobalState'
import Navbar from './components/Navbar.vue'
import Window from './components/Window.vue'
import { useGlobalState } from './composables/useGlobalState'

const { setCurrentWindow } = useGlobalState()

function onChangeWindow(window: CurrentWindow) {
  setCurrentWindow(window)
}
</script>

<template>
  <main class="h-screen w-screen">
    <Navbar @change-window="onChangeWindow" />

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
