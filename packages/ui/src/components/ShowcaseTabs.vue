<script setup lang="ts">
defineProps<{
  modelValue: number
  tabs: string[]
}>()

const emit = defineEmits(['update:modelValue'])

function selectTab(index: number) {
  emit('update:modelValue', index)
  window.dispatchEvent(new CustomEvent('showcase-tab-change', { detail: index }))
}

// Listen for external sync
if (typeof window !== 'undefined') {
  window.addEventListener('showcase-slide-change', (e: any) => {
    emit('update:modelValue', e.detail)
  })
}
</script>

<template>
  <div class="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
    <button
      v-for="(tab, index) in tabs"
      :key="tab"
      class="px-4 py-2 rounded-md text-sm font-medium transition-all" :class="[
        modelValue === index
          ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100'
          : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400',
      ]"
      @click="selectTab(index)"
    >
      {{ tab }}
    </button>
  </div>
</template>
