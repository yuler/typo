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
  maxHeight: 100,
})

const DEEPSEEK_API_KEY = ref('')
const fethcing = ref(false)
const confirm = ref(false)
onMounted(async () => {
  DEEPSEEK_API_KEY.value = await getDeepSeekApiKey()

  window.listen('set-input', async (event: { payload: string }) => {
    input.value = event.payload
    if (!DEEPSEEK_API_KEY.value) {
      console.error('API key not set')
    }

    fethcing.value = true
    try {
      const result = await deepSeekCorrect(input.value)
      input.value = result.text
      confirm.value = true
    }
    finally {
      fethcing.value = false
    }
  })
})

function onEnter() {
  window.emit('set-input', input.value)
}

function onESC() {
  window.hide()
}

async function onSpace() {
  window.hide()
  await invoke('type_text', { text: input.value })
}

async function gotoSettings() {
  setCurrentWindow('Settings')
}
</script>

<template>
  <div class="p-2 h-full">
    <div v-if="DEEPSEEK_API_KEY" class="h-full flex flex-col gap-2">
      <Textarea
        v-model="input" class="flex-1" placeholder="Input" autofocus
        @keydown.enter.prevent="onEnter"
        @keydown.esc="onESC"
      />
      <p class="flex justify-end">
        <span class="text-sm text-muted-foreground">⌘ + Enter</span>
      </p>
      <!-- <Button
        v-if="confirm" @click="onSpace"
        @keydown.space.prevent="onSpace"
      >
        Confirm
      </Button> -->
    </div>

    <div v-else class="full text-center">
      <p class="mt-2 text-sm text-muted-foreground">
        You need to set your DeepSeek API Key in the settings.
      </p>
      <Button class="mt-4" @click="gotoSettings">
        Settings
      </Button>
    </div>
    <!-- cmd + enter to submit -->
  </div>
</template>
