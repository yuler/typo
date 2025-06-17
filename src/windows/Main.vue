<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deepSeekCorrect } from '../ai'
import { useGlobalState } from '../composables/useGlobalState'
import { getDeepSeekApiKey } from '../store'

const { setCurrentWindow } = useGlobalState()

const DEEPSEEK_API_KEY = ref('')
onMounted(async () => {
  DEEPSEEK_API_KEY.value = await getDeepSeekApiKey()
})

const input = ref('')
const output = ref('')

async function correct() {
  const result = await deepSeekCorrect(input.value)
  output.value = result.text
}
</script>

<template>
  <div>
    <h1>Main</h1>

    <div v-if="DEEPSEEK_API_KEY">
      <textarea v-model="input" />
      <pre>{{ output }}</pre>
      <button @click="correct">
        Correct
      </button>
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
