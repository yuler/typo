<script setup lang="ts">
import type { UnlistenFn } from '@tauri-apps/api/event'
import type { Update } from '@tauri-apps/plugin-updater'
import type { StreamTextResult, ToolSet } from 'ai'
import { invoke } from '@tauri-apps/api/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'
import { ArrowBigUpIcon, Loader2Icon } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import { deepSeekCorrect, ollamaCorrect } from '@/ai'
import AlertError from '@/components/AlertError.vue'
import AlertUpgrade from '@/components/AlertUpgrade.vue'
import AlertUpgradeProgress from '@/components/AlertUpgradeProgress.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Separator from '@/components/ui/separator/Separator.vue'
import Textarea from '@/components/ui/textarea/Textarea.vue'
import { useGlobalState } from '@/composables/useGlobalState'
import * as store from '@/store'
import { sleep } from '@/utils'

const appWindow = WebviewWindow.getCurrent()
const { setCurrentWindow } = useGlobalState()

appWindow.setSizeConstraints({
  maxHeight: 250,
})

const input = ref('')
const aiProvider = ref<'deepseek' | 'ollama' | null>(null)
const showSettings = ref(false)
const processing = ref(false)
const error = ref<{ type: 'translate' | 'upgrade' | 'other', title: string, description: string } | null>(null)
const textareaRef = ref<InstanceType<typeof Textarea>>()
const isMacOS = ref(false)
const showMacAccessibilityWarning = ref(false)

appWindow.once('tauri://focus', () => {
  textareaRef.value?.$el.focus()
})

let unlistenSetInput: UnlistenFn
onMounted(async () => {
  // Check update
  checkUpgrade()

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
  aiProvider.value = await store.get('ai_provider')
  showSettings.value = aiProvider.value === 'deepseek' && (await store.get('deepseek_api_key')) === ''

  unlistenSetInput = await appWindow.listen('set-input', async (event: { payload: { text: string, mode: 'selected' | 'clipboard' | 'manual' } }) => {
    input.value = event.payload.text

    await appWindow.show()
    await appWindow.setFocus()

    // TODO: add some tips? or auto submit settings
    if (event.payload.mode === 'clipboard') {
      return
    }

    try {
      const output = await fetchTranslate(input.value)
      // Note: Hide the window, then wait 200 milliseconds before entering the text.
      await appWindow.hide()
      await sleep(200)
      await invoke('type_text', { text: output })
      input.value = ''
    }
    catch (err: any) {
      if (err.name === 'AbortError') {
        return
      }
      error.value = {
        type: 'translate',
        title: 'Error',
        description: err.message || 'Something went wrong',
      }
    }
    finally {
      processing.value = false
    }
  })
})

onUnmounted(async () => {
  unlistenSetInput?.()
})

const upgradeAlert = ref(false)
const upgradeAlertData = ref<{ rid: number, currentVersion: string, version: string, notes: string, rawJson: Record<string, unknown> }>({
  rid: 0,
  currentVersion: '',
  version: '',
  notes: '',
  rawJson: {},
})
const upgradeAlertProgress = ref(false)
const upgradeAlertProgressData = ref<{ progress: number }>({
  progress: 0,
})

let update: Update | null = null
async function checkUpgrade() {
  try {
    update = await check()

    if (!update) {
      return
    }

    upgradeAlertData.value = {
      rid: update.rid,
      currentVersion: update.currentVersion,
      version: update.version,
      notes: update.body || '',
      rawJson: update.rawJson,
    }
    upgradeAlert.value = true
  }
  catch (err) {
    console.error(err)
  }
}
async function onUpgrade() {
  if (!update)
    return

  upgradeAlert.value = false
  upgradeAlertProgress.value = true

  // eslint-disable-next-line no-console
  console.log(
    `found update ${update.version} from ${update.date} with notes ${update.body}`,
  )

  let downloaded = 0
  let contentLength = 0

  try {
    await update.downloadAndInstall(async (event) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength!
          upgradeAlertProgressData.value.progress = 0
          break
        case 'Progress':
          downloaded += event.data.chunkLength
          upgradeAlertProgressData.value.progress = Math.round(downloaded / contentLength * 100)
          break
        case 'Finished':
          upgradeAlertProgress.value = false
      }
    })
    await relaunch()
  }
  catch (err) {
    // Open download file, user must manually install it
    error.value = {
      type: 'upgrade',
      title: 'Error',
      description: `Failed to download and install the update: ${err}`,
    }
    console.error({ err })
  }
}

let translateAbortController: AbortController | null = null
async function fetchTranslate(text: string) {
  if (processing.value)
    return

  translateAbortController = new AbortController()
  processing.value = true
  error.value = null
  let output = ''
  const aiProvider = await store.get('ai_provider')
  let streamText: (text: string, abortSignal?: AbortSignal) => Promise<StreamTextResult<ToolSet, never>>
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
  const { textStream } = await streamText(text, translateAbortController.signal)
  for await (const chunk of textStream) {
    output += chunk
    input.value = output
  }
  return output
}

async function onRetry() {
  error.value = null
}

async function onESC() {
  if (processing.value) {
    translateAbortController?.abort()
    return
  }

  await appWindow.setAlwaysOnTop(false)
  await appWindow.hide()
  await appWindow.center()
  input.value = ''
}

async function onSubmit() {
  await appWindow.emit('set-input', { text: input.value, mode: 'manual' })
}

async function gotoSettings() {
  setCurrentWindow('Settings')
}
</script>

<template>
  <div class="px-4 py-2 h-full" @keydown.esc="onESC">
    <!-- MacOS Must Enable Accessibility -->
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

    <!-- Must have AI provider settings -->
    <div v-else-if="showSettings" class="h-full flex flex-col justify-center items-center">
      <p class="mt-2 text-sm text-muted-foreground">
        You need to set your DeepSeek API Key or Ollama model in the settings.
      </p>
      <Button class="mt-4" @click="gotoSettings">
        Settings
      </Button>
    </div>

    <!-- Main content -->
    <div v-else class="h-full flex flex-col gap-2">
      <div v-if="error" class="h-full">
        <div class="relative">
          <AlertError :title="error.title" :description="error.description" />
          <Button v-if="error.type === 'translate'" variant="secondary" class="absolute top-4 right-4" @click="onRetry">
            Retry
          </Button>
          <p v-if="error.type === 'upgrade'" class="mt-4 text-center">
            Your can manual download from <a class="underline" href="https://github.com/yuler/typo/releases" target="_blank">GitHub Releases</a> and install it.
          </p>
        </div>
      </div>

      <Textarea
        v-if="!error"
        ref="textareaRef"
        v-model="input" class="flex-1" placeholder="Enter your content to correct typos" :readonly="processing"
        @keydown.enter.prevent="onSubmit"
      />
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2 h-4">
          <template v-if="aiProvider">
            <Badge variant="secondary" class="bg-green-700">
              {{ aiProvider }}
            </Badge>
            <Separator orientation="vertical" />
          </template>
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
          <span class="animate-pulse">Processing...</span>
        </Button>
        <Button v-else variant="outline" @click="onSubmit">
          Submit
          <ArrowBigUpIcon class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- Alert: Upgrade -->
    <AlertUpgrade
      v-model="upgradeAlert"
      :version="upgradeAlertData.version"
      :notes="upgradeAlertData.notes"
      @cancel="upgradeAlert = false"
      @confirm="onUpgrade"
    />
    <AlertUpgradeProgress
      v-model="upgradeAlertProgress"
      :progress="upgradeAlertProgressData.progress"
    />
  </div>
</template>
