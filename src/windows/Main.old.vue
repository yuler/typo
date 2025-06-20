<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { Window } from '@tauri-apps/api/window'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { ClipboardCopyIcon, CopyIcon, Loader2Icon, SendIcon } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { sleep } from '@/utils'
import { deepSeekCorrect } from '../ai'
import { useGlobalState } from '../composables/useGlobalState'
import * as store from '../store'

const { setCurrentWindow } = useGlobalState()

const DEEPSEEK_API_KEY = ref('')
const window = new Window('main')

const input = ref('')
const output = ref('')
const submitting = ref(false)

onMounted(async () => {
  DEEPSEEK_API_KEY.value = await store.get('deepseek_api_key')

  window.listen('set-input', async (event: { payload: string }) => {
    input.value = event.payload
    if (!DEEPSEEK_API_KEY.value) {
      console.error('API key not set')
    }

    await correct()
    // await window.hide()
  })
})

async function correct() {
  submitting.value = true
  try {
    const result = await deepSeekCorrect(input.value)
    output.value = result.text
    await invoke('type_text', { text: result.text })
  }
  finally {
    submitting.value = false
  }
}

const copied = ref(false)
async function copy(text: string) {
  await writeText(text)
  copied.value = true
  await sleep(500)
  copied.value = false
}
</script>

<template>
  <div class="px-8 py-4 border-t">
    <form v-if="DEEPSEEK_API_KEY" @submit.prevent="correct">
      <div class="grid grid-cols-2 w-full gap-2">
        <div>
          <h2 class="text-lg font-bold mb-2">
            Input
          </h2>
          <Textarea
            v-model="input"
            placeholder="Quick pick up your selected text with CommandOrControl+Shift+A"
            rows="10"
            :disabled="submitting"
            @keydown.ctrl.enter.prevent="correct"
          />
        </div>
        <div v-if="output">
          <h2 class="text-lg font-bold mb-2">
            Output
          </h2>
          <pre class="border rounded-md p-4 text-muted-foreground whitespace-pre-wrap">{{ output }}</pre>
          <Button class="mt-4" @click.prevent="copy(output)">
            <ClipboardCopyIcon v-if="!copied" class="w-4 h-4" />
            <CopyIcon v-else class="w-4 h-4" />
            {{ copied ? 'Copied' : 'Copy' }}
          </Button>
        </div>
      </div>

      <div class="mt-4 flex">
        <Button type="submit" :disabled="submitting">
          <SendIcon v-if="!submitting" class="w-4 h-4" />
          <Loader2Icon v-else class="w-4 h-4 animate-spin" />
          {{ submitting ? 'Correcting...' : 'Correct' }}
        </Button>
      </div>
    </form>
    <div v-else>
      <h2 class="text-lg font-bold">
        No DeepSeek API Key
      </h2>
      <p class="text-sm text-muted-foreground">
        Please set your DeepSeek API Key in the settings page
      </p>
      <Button class="mt-4" @click="setCurrentWindow('Settings')">
        Settings
      </Button>
    </div>
  </div>
</template>
