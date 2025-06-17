<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useGlobalState } from '../composables/useGlobalState'
import { getDeepSeekApiKey, setDeepSeekApiKey } from '../store'

const { setCurrentWindow } = useGlobalState()

const form = ref({
  deepseek_api_key: '',
})

onMounted(async () => {
  const key = await getDeepSeekApiKey()
  form.value.deepseek_api_key = key
})

function onSubmit() {
  setDeepSeekApiKey(form.value.deepseek_api_key)
  setCurrentWindow('Main')
}
</script>

<template>
  <div>
    <h1>Settings</h1>
  </div>
  <form @submit.prevent="onSubmit">
    <input v-model="form.deepseek_api_key" type="text">
    <button type="submit">
      Save
    </button>
  </form>
</template>
