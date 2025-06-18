<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { Window } from '@tauri-apps/api/window'
import { onMounted, ref } from 'vue'
import { deepSeekCorrect } from '@/ai'
import { Button } from '@/components/ui/button'
import Textarea from '@/components/ui/textarea/Textarea.vue'
import { useGlobalState } from '@/composables/useGlobalState'
import { getDeepSeekApiKey } from '@/store'

const input = ref('')
const window = Window.getCurrent()
const { setCurrentWindow } = useGlobalState()

window.setSizeConstraints({
  maxHeight: 250,
})

const DEEPSEEK_API_KEY = ref('')
const processing = ref(false)
const finished = ref(false)
onMounted(async () => {
  DEEPSEEK_API_KEY.value = await getDeepSeekApiKey()

  // TODO: 区分两种交互模式, 能读取 selected text 的, 和无法读取到的
  window.listen('set-input', async (event: { payload: string }) => {
    input.value = event.payload
    if (!DEEPSEEK_API_KEY.value) {
      console.error('API key not set')
    }

    processing.value = true
    try {
      const result = await deepSeekCorrect(input.value)
      input.value = result.text
      finished.value = true
    }
    finally {
      processing.value = false
    }

    await onConfirm()
  })
})

async function onConfirm() {
  // Auto write to current cursor position
  // await window.hide()
  
  await invoke('type_text', { text: input.value })
  await window.hide()
  input.value = ''
  finished.value = false
}

async function onESC() {
  await window.hide()
  input.value = ''
  finished.value = false
}

async function onSubmit() {
  await window.emit('set-input', input.value)
}

async function gotoSettings() {
  setCurrentWindow('Settings')
}
</script>

<template>
  <div class="p-2 h-full">
    <div v-if="DEEPSEEK_API_KEY" class="h-full flex flex-col gap-2">
      <Textarea
        v-model="input" class="flex-1" placeholder="Input" :disabled="processing"
        @keydown.esc="onESC"
        @keydown.meta.enter.prevent="onSubmit"
      />
      <p data-tauri-drag-region class="flex justify-end">
        <span v-if="processing">Processing...</span>
        <Button v-else-if="finished" @click="onConfirm">Confirm</Button>
        <span v-else class="text-sm text-muted-foreground">⌘ + ↵ to confirm</span>
      </p>
    </div>

    <div v-else class="full text-center">
      <p class="mt-2 text-sm text-muted-foreground">
        You need to set your DeepSeek API Key in the settings.
      </p>
      <Button class="mt-4" @click="gotoSettings">
        Settings
      </Button>
    </div>
  </div>
</template>
