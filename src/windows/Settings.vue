<script setup lang="ts">
import { Window } from '@tauri-apps/api/window'
import { onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useGlobalState } from '../composables/useGlobalState'
import { getDeepSeekApiKey, setDeepSeekApiKey } from '../store'

const { setCurrentWindow } = useGlobalState()
const window = Window.getCurrent()

const form = ref({
  deepseek_api_key: '',
})

onMounted(async () => {
  const key = await getDeepSeekApiKey()
  form.value.deepseek_api_key = key

  window.setSizeConstraints({
    minHeight: 400,
  })
})

function onSubmit() {
  setDeepSeekApiKey(form.value.deepseek_api_key)
  setCurrentWindow('Main')
}
</script>

<template>
  <div class="w-full px-8 py-4 border-t">
    <h1 class="text-2xl font-bold">
      Settings
    </h1>
    <form class="mt-4 w-full" @submit.prevent="onSubmit">
      <div class="grid w-full items-center gap-1.5">
        <Label for="deepseek_api_key">DeepSeek API Key</Label>
        <Input id="deepseek_api_key" v-model="form.deepseek_api_key" autofocus type="text" placeholder="Enter your DeepSeek API Key" />
      </div>

      <div class="mt-4 flex justify-end">
        <Button type="submit">
          Save
        </Button>
      </div>
    </form>
  </div>
</template>
