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
const textareaRef = ref<InstanceType<typeof Textarea>>()

onMounted(async () => {
  DEEPSEEK_API_KEY.value = await getDeepSeekApiKey()

  // TODO: 区分两种交互模式, 能读取 selected text 的, 和无法读取到的
  window.listen('set-input', async (event: { payload: { text: string, mode: 'selected' | 'clipboard' | 'manual' } }) => {
    input.value = event.payload.text

    // if (event.payload.mode === 'clipboard') {
    //   textareaRef.value?.$el.focus()
    //   return
    // }

    if (!DEEPSEEK_API_KEY.value) {
      console.error('API key not set')
    }

    if (processing.value)
      return

    processing.value = true
    let output = ''
    try {
      const result = await deepSeekCorrect(input.value)
      output = result.text
      finished.value = true
    }
    finally {
      processing.value = false
    }

    await window.hide()
    await onConfirm(output)
  })
})

async function onConfirm(text: string) {
  await invoke('type_text', { text })
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
  await window.emit('set-input', { text: input.value, mode: 'manual' })
}

async function gotoSettings() {
  setCurrentWindow('Settings')
}
</script>

<template>
  <div class="p-2 h-full">
    <div v-if="DEEPSEEK_API_KEY" class="h-full flex flex-col gap-2">
      <Textarea
        ref="textareaRef"
        v-model="input" class="flex-1" placeholder="Input" :disabled="processing"
        @keydown.esc="onESC"
        @keydown.ctrl.enter.prevent="onSubmit"
      />
      <p data-tauri-drag-region class="flex justify-end">
        <span v-if="processing">Processing...</span>
        <span v-else class="text-sm text-muted-foreground">⌘ + ↵ to confirm</span>
        <!--
        <Button v-else-if="finished" @click="onConfirm">
          Confirm
        </Button>
        -->
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
