<script setup lang="ts">
import type { UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { Window } from '@tauri-apps/api/window'
import { ArrowBigUpIcon, PlusIcon, SettingsIcon } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import { deepSeekCorrect } from '@/ai'
import { Button } from '@/components/ui/button'
import Textarea from '@/components/ui/textarea/Textarea.vue'
import { useGlobalState } from '@/composables/useGlobalState'
import { getDeepSeekApiKey } from '@/store'
import { sleep } from '@/utils'

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

let unlistenSetInput: UnlistenFn
onMounted(async () => {
  DEEPSEEK_API_KEY.value = await getDeepSeekApiKey()

  unlistenSetInput = await window.listen('set-input', async (event: { payload: { text: string, mode: 'selected' | 'clipboard' | 'manual' } }) => {
    input.value = event.payload.text

    if (event.payload.mode === 'clipboard') {
      setTimeout(() => {
        textareaRef.value?.$el.select()
        textareaRef.value?.$el.focus()
      }, 250)
      return
    }

    const output = await fetchTranslate(input.value)

    // Note: Hide the window, then wait 200 milliseconds before entering the text.
    await window.hide()
    await sleep(200)
    await invoke('type_text', { text: output })
    input.value = ''
    finished.value = false
  })
})

onUnmounted(async () => {
  unlistenSetInput?.()
})

async function fetchTranslate(text: string) {
  if (!DEEPSEEK_API_KEY.value) {
    console.error('API key not set')
  }

  if (processing.value)
    return

  processing.value = true
  let output = ''
  try {
    const result = await deepSeekCorrect(text)
    output = result.text
    finished.value = true
    return output
  }
  finally {
    processing.value = false
  }
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
      <p data-tauri-drag-region class="flex justify-between">
        <Button variant="outline" size="icon" @click="gotoSettings">
          <SettingsIcon class="w-4 h-4" />
        </Button>
        <span v-if="processing">Processing...</span>
        <Button v-else @click="onSubmit">
          Submit
          <kbd class="px-2 py-1 rounded bg-muted text-muted-foreground flex items-center gap-1">
            Ctrl
            <PlusIcon class="w-4 h-4" />
            <ArrowBigUpIcon class="w-4 h-4" />
          </kbd>
        </Button>
      </p>
    </div>

    <div v-else class="full text-center">
      <p class="mt-2 text-sm text-muted-foreground">
        You need to set your DeepSeek API Key in the settings. <br>
        <a href="https://www.deepseek.com/apikey" target="_blank">Get your API key</a>
      </p>
      <Button class="mt-4" @click="gotoSettings">
        Settings
      </Button>
    </div>
  </div>
</template>
