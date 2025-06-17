<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useGlobalState } from '../composables/useGlobalState'
import { getDeepSeekApiKey } from '../store'

const { setCurrentWindow } = useGlobalState()

const DEEPSEEK_API_KEY = ref('')
onMounted(async () => {
  DEEPSEEK_API_KEY.value = await getDeepSeekApiKey()
})
</script>

<template>
  <div>
    <h1>Main</h1>

    <div v-if="DEEPSEEK_API_KEY">
      <h2>DeepSeek API Key</h2>
      <p>{{ DEEPSEEK_API_KEY }}</p>
    </div>
    <div v-else>
      <h2>No DeepSeek API Key</h2>
      <p>Please set your DeepSeek API Key in the settings page</p>
      <button @click="setCurrentWindow('Settings')">
        Settings
      </button>
    </div>
  </div>
</template>
