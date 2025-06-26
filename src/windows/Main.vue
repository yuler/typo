<script setup lang="ts">
import type { UnlistenFn } from '@tauri-apps/api/event'
import type { StreamTextResult, ToolSet } from 'ai'
import { invoke } from '@tauri-apps/api/core'
import { Window } from '@tauri-apps/api/window'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'
import { ArrowBigUpIcon, Loader2Icon } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import { deepSeekCorrect, ollamaCorrect } from '@/ai'
import AlertError from '@/components/AlertError.vue'
import { Button } from '@/components/ui/button'
import Separator from '@/components/ui/separator/Separator.vue'
import Textarea from '@/components/ui/textarea/Textarea.vue'
import { useGlobalState } from '@/composables/useGlobalState'
import * as store from '@/store'
import { sleep } from '@/utils'

const input = ref('')
const window = Window.getCurrent()
const { setCurrentWindow } = useGlobalState()

window.setSizeConstraints({
  maxHeight: 250,
})

const showSettings = ref(false)
const processing = ref(false)
const finished = ref(false)
const error = ref<{ title: string, description: string } | null>(null)
const textareaRef = ref<InstanceType<typeof Textarea>>()
const isMacOS = ref(false)
const showMacAccessibilityWarning = ref(false)

let unlistenSetInput: UnlistenFn
onMounted(async () => {
  // Check update
  checkUpdate()

  // Check platform and accessibility permissions
  const platform = await invoke('get_platform_info')
  isMacOS.value = platform === 'macos'
  if (isMacOS.value) {
    try {
      showMacAccessibilityWarning.value = !(await invoke('request_mac_accessibility_permissions'))
    }
    catch (error) {
      console.error(error)
    }
  }

  // Must have AI provider settings
  showSettings.value = (await store.get('ai_provider')) === 'deepseek' && (await store.get('deepseek_api_key')) === ''

  unlistenSetInput = await window.listen('set-input', async (event: { payload: { text: string, mode: 'selected' | 'clipboard' | 'manual' } }) => {
    input.value = event.payload.text

    // TODO: add dialog to confirm the action
    if (event.payload.mode === 'clipboard') {
      // eslint-disable-next-line no-alert
      const confirmed = confirm('Are you want use clipboard text?')
      await window.setFocus()
      await window.center()
      if (!confirmed) {
        return
      }
    }

    const output = await fetchTranslate(input.value)

    if (error.value) {
      return
    }

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

async function checkUpdate() {
  const update = await check()
  // eslint-disable-next-line no-console
  console.log(update)
}

async function fetchTranslate(text: string) {
  if (processing.value)
    return

  processing.value = true
  error.value = null
  let output = ''
  try {
    const aiProvider = await store.get('ai_provider')
    let streamText: (text: string) => Promise<StreamTextResult<ToolSet, never>>
    switch (aiProvider) {
      case 'deepseek':
        streamText = deepSeekCorrect
        break
      case 'ollama':
        streamText = ollamaCorrect
        break
      default:
        throw new Error('Invalid AI provider')
    }
    const result = await streamText(text)
    for await (const chunk of result.textStream) {
      output += chunk
      input.value = output
    }
    finished.value = true
    return output
  }
  catch (err: any) {
    error.value = {
      title: 'Error',
      description: err.message || 'Something went wrong',
    }
  }
  finally {
    processing.value = false
  }
}

async function onRetry() {
  error.value = null
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
  <div class="px-4 py-2 h-full" @keydown.esc="onESC">
    <div v-if="showMacAccessibilityWarning" class="h-full flex flex-col justify-center items-center">
      <h3 class="text-xl mb-2 font-semibold text-center">
        Your need enable accessibility permissions on macOS.
      </h3>
      <ol class="list-decimal list-inside space-y-1 ml-4">
        <li>Go to System Preferences → Security & Privacy → Privacy</li>
        <li>Select "Accessibility", then click plus button to add this app</li>
      </ol>
      <Button class="mt-4" variant="outline" @click="relaunch">
        Relaunch App
      </Button>
    </div>

    <div v-else-if="showSettings" class="h-full flex flex-col justify-center items-center">
      <p class="mt-2 text-sm text-muted-foreground">
        You need to set your DeepSeek API Key or Ollama model in the settings.
      </p>
      <Button class="mt-4" @click="gotoSettings">
        Settings
      </Button>
    </div>

    <div v-else class="h-full flex flex-col gap-2">
      <div v-if="error" class="h-full">
        <div class="relative">
          <AlertError :title="error.title" :description="error.description" />
          <Button variant="secondary" class="absolute top-4 right-4" @click="onRetry">
            Retry
          </Button>
        </div>
      </div>

      <Textarea
        v-if="!error"
        ref="textareaRef"
        v-model="input" class="flex-1" placeholder="Enter your content to correct typos" :disabled="processing"
        @keydown.enter.prevent="onSubmit"
      />
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2 h-4">
          <p class="text-sm text-muted-foreground space-x-2">
            <kbd
              class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100"
            >
              <span class="text-xs">{{ isMacOS ? 'Command' : 'Ctrl' }} + Shift + X</span>
            </kbd>
            <span>Show</span>
          </p>
          <Separator orientation="vertical" />
          <p class="text-sm text-muted-foreground space-x-2">
            <kbd
              class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100"
            >
              <span class="text-xs">Esc</span>
            </kbd>
            Hide
          </p>
        </div>

        <Button v-if="processing" variant="outline">
          <Loader2Icon class="w-4 h-4 animate-spin" />
          Processing...
        </Button>
        <Button v-else variant="outline" @click="onSubmit">
          Submit
          <ArrowBigUpIcon class="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
