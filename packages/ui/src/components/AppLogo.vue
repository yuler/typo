<script setup lang="ts">
import logoDarkUrl from '../../assets/logo-dark.svg'
import logoUrl from '../../assets/logo.svg'
import { cn } from '../lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<Props>(), {
  drag: false,
  dark: false,
})

interface Props {
  drag?: boolean
  version?: string
  class?: string
  dark?: boolean
}
</script>

<template>
  <div
    :class="cn('relative flex flex-col items-center shrink-0 h-8 w-8', props.class)"
    :data-tauri-drag-region="drag ? true : undefined"
  >
    <img v-if="!dark" :src="logoUrl" alt="logo" class="w-full h-full object-contain pointer-events-none">
    <img v-else :src="logoDarkUrl" alt="logo" class="w-full h-full object-contain pointer-events-none">
    <span v-if="version" class="text-[8px] absolute -top-1 -right-1 text-muted-foreground pointer-events-none">v{{ version }}</span>
  </div>
</template>
