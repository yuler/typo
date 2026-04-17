<script setup lang="ts">
import { useGlobalState } from '../composables/useGlobalState'
import Main from '../windows/Main.vue'
import None from '../windows/None.vue'
import Settings from '../windows/Settings.vue'
import Upgrade from '../windows/Upgrade.vue'

const { currentWindow } = useGlobalState()

const windows = {
  Main,
  Settings,
  Upgrade,
  None,
}
</script>

<template>
  <component :is="windows[currentWindow]" />
</template>
