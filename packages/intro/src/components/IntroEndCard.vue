<script setup lang="ts">
import logoUrl from '../../assets/logo.png'
</script>

<template>
  <div
    id="scene-end"
    class="clip end-card absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/55 opacity-0"
    data-start="14.5"
    data-duration="1.5"
    data-track-index="5"
  >
    <img :src="logoUrl" alt="typo" class="h-24 w-24 object-contain">
    <h1 class="text-[56px] font-bold tracking-tight text-white">
      typo
    </h1>
    <p class="text-[22px] text-white/65">
      Select text anywhere · Press ⌃⇧X · AI refines it in place
    </p>
  </div>
</template>
