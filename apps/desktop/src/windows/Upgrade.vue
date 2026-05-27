<script setup lang="ts">
import type { Update } from '@tauri-apps/plugin-updater'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { fetch } from '@tauri-apps/plugin-http'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'
import { useEventListener } from '@vueuse/core'
import { ArrowUpCircleIcon, CheckCircle2Icon, SparklesIcon, XIcon } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, shallowRef, toRaw, watch } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import UpgradeProgress from '@/components/UpgradeProgress.vue'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'

const AUTO_CLOSE_SECONDS = 5

const appWindow = getCurrentWebviewWindow()
const { t, locale } = useI18n()
const appVersion = __APP_VERSION__

const updateInfo = shallowRef<Update | null>(null)
const isUpgrading = ref(false)
const downloadProgress = ref(0)
const isLoading = ref(true)
const remoteNotes = ref('')

async function fetchRemoteNotes(version: string) {
  try {
    const currentLocale = locale.value || 'en'
    const url = `https://typo.yuler.cc/releases/v${version}/notes.json`
    const response = await fetch(url)
    if (response.ok) {
      const data = await response.json()
      const rawNotes = data.notes_i18n?.[currentLocale] || data.notes || ''
      remoteNotes.value = Array.isArray(rawNotes) ? rawNotes.map(n => `• ${n}`).join('\n') : rawNotes
    }
  }
  catch (e) {
    logger.error('Update', 'Failed to fetch i18n notes from typo.yuler.cc', e)
  }
}

useEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' && !isUpgrading.value)
    onCancel()
})

onMounted(async () => {
  try {
    const update = await check()
    if (update) {
      updateInfo.value = update
      await fetchRemoteNotes(update.version)
    }
  }
  catch (e) {
    logger.error('Update', 'Failed to get update info', e)
  }
  finally {
    isLoading.value = false
  }
})

const notes = computed(() => {
  if (remoteNotes.value)
    return remoteNotes.value

  const info = updateInfo.value
  if (!info)
    return ''

  const i18nNotes = (info.rawJson as any)?.notes_i18n
  const rawNotes = i18nNotes?.[locale.value] || info.body || t('upgrade.no_notes')
  return Array.isArray(rawNotes) ? rawNotes.map(n => `• ${n}`).join('\n') : rawNotes
})

async function onUpgradeConfirm() {
  const rawUpdate = toRaw(updateInfo.value)
  if (rawUpdate) {
    isUpgrading.value = true
    let downloaded = 0
    let contentLength = 0
    await rawUpdate.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength || 0
          break
        case 'Progress':
          downloaded += event.data.chunkLength
          if (contentLength > 0) {
            downloadProgress.value = (downloaded / contentLength) * 100
          }
          break
        case 'Finished':
          downloadProgress.value = 100
          break
      }
    })
    await relaunch()
  }
}

const closeCountdown = ref(AUTO_CLOSE_SECONDS)
let countdownTimer: ReturnType<typeof setInterval> | undefined

const isUpToDate = computed(() => !isLoading.value && !updateInfo.value)

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = undefined
  }
}

function startAutoCloseCountdown() {
  stopCountdown()
  closeCountdown.value = AUTO_CLOSE_SECONDS
  countdownTimer = setInterval(() => {
    if (closeCountdown.value <= 1) {
      stopCountdown()
      appWindow.close()
    }
    else {
      closeCountdown.value -= 1
    }
  }, 1000)
}

watch(isUpToDate, (upToDate) => {
  if (upToDate)
    startAutoCloseCountdown()
  else
    stopCountdown()
})

onUnmounted(stopCountdown)

async function onCancel() {
  stopCountdown()
  appWindow.close()
}

</script>

<template>
  <div class="relative h-full w-full flex flex-col p-6 text-zinc-900 cursor-default select-none bg-white border border-zinc-200 shadow-2xl overflow-hidden">
    <!-- Draggable Header / Titlebar -->
    <div class="h-8 w-full flex items-center justify-between select-none shrink-0 z-10" data-tauri-drag-region>
      <div class="flex items-center gap-2 pointer-events-none">
        <SparklesIcon class="w-4 h-4 text-zinc-400" />
        <span class="text-xs font-bold text-zinc-400 tracking-wider uppercase">{{ t('upgrade.updater') }}</span>
      </div>
      <button
        class="flex items-center justify-center w-6 h-6 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all duration-150 cursor-pointer"
        @click="onCancel"
      >
        <XIcon class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-h-0 mt-3 z-10">
      <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center gap-4">
        <!-- Premium Loader Spinner -->
        <div class="relative w-12 h-12 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full border-2 border-zinc-100" />
          <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-zinc-900 border-r-zinc-900 animate-spin" />
          <SparklesIcon class="w-4 h-4 text-zinc-400 animate-pulse" />
        </div>
        <div class="flex flex-col items-center gap-1 text-center">
          <span class="text-sm font-medium text-zinc-600 animate-pulse">{{ t('upgrade.checking') }}</span>
          <span class="text-xs text-zinc-400">{{ t('upgrade.checking_details') }}</span>
        </div>
      </div>
      <div v-else-if="!updateInfo" class="flex-1 flex flex-col items-center justify-center gap-6 text-center px-4">
        <CheckCircle2Icon class="w-10 h-10 text-emerald-500" />
        <div class="flex flex-col gap-2">
          <p class="text-base font-medium text-zinc-800">
            {{ t('upgrade.up_to_date', { version: appVersion }) }}
          </p>
          <p class="text-sm text-zinc-500">
            {{ t('upgrade.auto_close_countdown', { seconds: closeCountdown }) }}
          </p>
        </div>
        <Button variant="outline" class="cursor-pointer font-medium" @click="onCancel">
          {{ t('upgrade.close') }}
        </Button>
      </div>
      <div v-else class="flex-1 flex flex-col min-h-0">
        <!-- Header -->
        <div class="flex flex-col gap-1.5 shrink-0">
          <h1 class="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            {{ t('upgrade.new_version') }}
            <Badge variant="secondary" class="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-900">
              v{{ updateInfo?.version }}
            </Badge>
          </h1>
          <p class="text-sm text-zinc-500">
            {{ t('upgrade.ready_to_install') }}
          </p>
        </div>

        <!-- Release Notes Box (Borderless, clean list) -->
        <div class="flex-1 min-h-0 flex flex-col mt-4 mb-4">
          <ScrollArea class="flex-1 min-h-0 pr-2">
            <div class="text-sm text-zinc-600 whitespace-pre-wrap leading-relaxed select-text pr-1">
              {{ notes }}
            </div>
          </ScrollArea>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 shrink-0 pt-4 border-t border-zinc-100">
          <Button
            variant="outline"
            class="cursor-pointer font-medium"
            @click="onCancel"
          >
            {{ t('upgrade.later') }}
          </Button>
          <Button
            class="font-semibold flex items-center gap-2 cursor-pointer"
            @click="onUpgradeConfirm"
          >
            <ArrowUpCircleIcon class="w-4 h-4" />
            {{ t('upgrade.confirm') }}
          </Button>
        </div>
      </div>
    </div>

    <UpgradeProgress v-model="isUpgrading" :progress="downloadProgress" />
  </div>
</template>
