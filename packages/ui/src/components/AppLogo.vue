<script setup lang="ts">
import logoDarkUrl from '@typo/logo/logo-dark.svg'
import logoUrl from '@typo/logo/logo.svg'
import { cn } from '../lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<Props>(), {
  drag: false,
  dark: false,
})

/** Vite/Astro may resolve SVG imports as `{ src, width, height }` rather than a plain URL. */
function assetSrc(asset: string | { src: string }) {
  return typeof asset === 'string' ? asset : asset.src
}

interface Props {
  drag?: boolean
  version?: string
  class?: string
  dark?: boolean
}
</script>

<template>
  <div
    v-bind="$attrs"
    :class="cn('relative flex flex-col items-center shrink-0 h-8 w-8', props.class)"
    :data-tauri-drag-region="drag ? true : undefined"
  >
    <img v-if="!dark" :src="assetSrc(logoUrl)" alt="logo" class="w-full h-full object-contain pointer-events-none">
    <img v-else :src="assetSrc(logoDarkUrl)" alt="logo" class="w-full h-full object-contain pointer-events-none">
    <span v-if="version" class="text-[8px] absolute -top-1 -right-1 text-muted-foreground pointer-events-none">v{{ version }}</span>
  </div>
</template>
