<script setup lang="ts">
import { useGlobalState } from '../composables/useGlobalState'
import Main from '../windows/Main.vue'
import Settings from '../windows/Settings.vue'

const { currentWindow } = useGlobalState()

const windows = {
  Main,
  Settings,
}
</script>

<template>
  <component :is="windows[currentWindow]" />
</template>
