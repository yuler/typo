<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  <div class="px-8 py-4 border-t">
    <form @submit.prevent="onSubmit">
      <div class="grid w-full items-center gap-1.5">
        <Label for="deepseek_api_key">DeepSeek API Key</Label>
        <Input id="deepseek_api_key" v-model="form.deepseek_api_key" type="text" placeholder="Enter your DeepSeek API Key" />
      </div>

      <div class="mt-4 flex justify-end">
        <Button type="submit">
          Save
        </Button>
      </div>
    </form>
  </div>
</template>
