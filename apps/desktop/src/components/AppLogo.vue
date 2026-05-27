<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  drag?: boolean
  version?: boolean
  class?: HTMLAttributes['class']
  dark?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  drag: false,
  version: false,
  dark: false,
})

const appVersion = __APP_VERSION__
</script>

<template>
  <div
    :class="cn('relative flex flex-col items-center shrink-0 h-8 w-8', props.class)"
    :data-tauri-drag-region="drag ? true : undefined"
  >
    <img v-if="!dark" src="@/assets/logo.svg" alt="logo" class="w-full h-full object-contain pointer-events-none">
    <img v-else src="@/assets/logo-dark.svg" alt="logo" class="w-full h-full object-contain pointer-events-none">
    <span v-if="version" class="text-[8px] absolute -top-1 -right-1 text-muted-foreground pointer-events-none">v{{ appVersion }}</span>
  </div>
</template>
