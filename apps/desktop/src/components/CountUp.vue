<script setup lang="ts">
import { Activity } from 'lucide-vue-next'
import { onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  duration?: number
  loading?: boolean
}>(), {
  duration: 800,
  loading: false,
})

const displayedValue = ref(0)
let animationHandle = 0

function animateTo(targetValue: number) {
  if (displayedValue.value === targetValue)
    return

  cancelAnimationFrame(animationHandle)

  const startTime = performance.now()
  const startValue = displayedValue.value

  function update(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / props.duration, 1)
    const ease = progress * (2 - progress)

    displayedValue.value = Math.floor(startValue + (targetValue - startValue) * ease)

    if (progress < 1) {
      animationHandle = requestAnimationFrame(update)
    }
    else {
      displayedValue.value = targetValue
    }
  }

  animationHandle = requestAnimationFrame(update)
}

watch([() => props.value, () => props.loading], ([value, loading]) => {
  if (!loading)
    animateTo(value)
}, { immediate: true })

onUnmounted(() => {
  cancelAnimationFrame(animationHandle)
})
</script>

<template>
  <Activity v-if="loading" class="size-6 text-muted-foreground animate-pulse" aria-hidden="true" />
  <span v-else>{{ displayedValue.toLocaleString() }}</span>
</template>
