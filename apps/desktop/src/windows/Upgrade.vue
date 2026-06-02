<script setup lang="ts">
import type { Update } from '@tauri-apps/plugin-updater'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { fetch } from '@tauri-apps/plugin-http'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'
import { useEventListener } from '@vueuse/core'
import { AlertCircleIcon, ArrowUpCircleIcon, CheckCircle2Icon, SparklesIcon, XIcon } from 'lucide-vue-next'
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

const isForced = ref(false)
const updateInfo = shallowRef<Update | null>(null)
const isUpgrading = ref(false)
const downloadProgress = ref(0)
const isLoading = ref(true)
const hasError = ref(false)
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
    onDismiss()
})

async function runCheck() {
  isLoading.value = true
  hasError.value = false
  try {
    const update = await check()
    if (update) {
      updateInfo.value = update
      await fetchRemoteNotes(update.version)
    }
  }
  catch (e) {
    logger.error('Update', 'Failed to get update info', e)
    hasError.value = true
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  try {
    isForced.value = await invoke<boolean>('is_forced_upgrade')
  }
  catch (e) {
    logger.error('Update', 'Failed to read forced upgrade state', e)
  }

  await runCheck()
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

const isUpToDate = computed(() => !isLoading.value && !updateInfo.value && !hasError.value)

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
  if (upToDate && !isForced.value)
    startAutoCloseCountdown()
  else
    stopCountdown()
})

onUnmounted(stopCountdown)

async function onIgnore() {
  stopCountdown()
  if (updateInfo.value?.version) {
    try {
      await invoke('ignore_version', { version: updateInfo.value.version })
    }
    catch (e) {
      logger.error('Update', 'Failed to ignore version', e)
    }
  }
  appWindow.close()
}

function onDismiss() {
  stopCountdown()
  appWindow.close()
}
</script>

<template>
  <div class="relative flex h-full w-full cursor-default select-none flex-col overflow-hidden rounded-2xl border border-border bg-background p-6 text-foreground shadow-md">
    <!-- Draggable Header / Titlebar -->
    <div class="z-10 flex h-8 w-full shrink-0 items-center justify-between select-none" data-tauri-drag-region>
      <div class="pointer-events-none flex items-center gap-2">
        <SparklesIcon class="size-4 text-muted-foreground" />
        <span class="text-xs font-bold tracking-wider text-muted-foreground uppercase">{{ t('upgrade.updater') }}</span>
      </div>
      <button
        class="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground"
        @click="onDismiss"
      >
        <XIcon class="size-3.5" />
      </button>
    </div>

    <!-- Main Content Area -->
    <div class="z-10 mt-3 flex min-h-0 flex-1 flex-col">
      <div v-if="isLoading" class="flex flex-1 flex-col items-center justify-center gap-4">
        <div class="relative flex size-12 items-center justify-center">
          <div class="absolute inset-0 rounded-full border-2 border-muted" />
          <div class="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-foreground border-r-foreground" />
          <SparklesIcon class="size-4 animate-pulse text-muted-foreground" />
        </div>
        <div class="flex flex-col items-center gap-1 text-center">
          <span class="animate-pulse text-sm font-medium text-foreground">{{ t('upgrade.checking') }}</span>
          <span class="text-xs text-muted-foreground">{{ t('upgrade.checking_details') }}</span>
        </div>
      </div>

      <div v-else-if="hasError" class="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <AlertCircleIcon class="size-10 text-red-500" />
        <div class="flex flex-col gap-2">
          <p class="text-base font-medium text-foreground">
            {{ t('upgrade.check_failed') }}
          </p>
          <p class="text-sm text-muted-foreground">
            {{ t('upgrade.check_failed_details') }}
          </p>
        </div>
        <div class="flex gap-3">
          <Button variant="outline" class="cursor-pointer font-medium" @click="onDismiss">
            {{ t('upgrade.close') }}
          </Button>
          <Button class="cursor-pointer font-medium" @click="runCheck">
            {{ t('upgrade.retry') }}
          </Button>
        </div>
      </div>

      <div v-else-if="!updateInfo" class="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <CheckCircle2Icon class="size-10 text-green-500" />
        <div class="flex flex-col gap-2">
          <p class="text-base font-medium text-foreground">
            {{ t('upgrade.up_to_date', { version: appVersion }) }}
          </p>
          <p v-if="!isForced" class="text-sm text-muted-foreground">
            {{ t('upgrade.auto_close_countdown', { seconds: closeCountdown }) }}
          </p>
        </div>
        <Button variant="outline" class="cursor-pointer font-medium" @click="onDismiss">
          {{ t('upgrade.close') }}
        </Button>
      </div>

      <div v-else class="flex min-h-0 flex-1 flex-col">
        <!-- Header -->
        <div class="flex shrink-0 flex-col gap-1.5">
          <p v-if="isForced" class="text-sm font-medium text-muted-foreground">
            {{ t('upgrade.required_message') }}
          </p>
          <h1 class="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            {{ t('upgrade.new_version') }}
            <Badge variant="secondary" class="rounded-full px-2 py-0.5 text-xs font-semibold">
              v{{ updateInfo?.version }}
            </Badge>
          </h1>
          <p class="text-sm text-muted-foreground">
            {{ t('upgrade.ready_to_install') }}
          </p>
        </div>

        <!-- Release Notes -->
        <div class="mt-4 mb-4 flex min-h-0 flex-1 flex-col">
          <ScrollArea class="min-h-0 flex-1 pr-2">
            <div class="select-text pr-1 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {{ notes }}
            </div>
          </ScrollArea>
        </div>

        <!-- Action Buttons -->
        <div class="flex shrink-0 justify-end gap-3 border-t border-border pt-4">
          <Button
            v-if="!isForced"
            variant="ghost"
            class="cursor-pointer font-medium text-muted-foreground"
            @click="onIgnore"
          >
            {{ t('upgrade.skip_version') }}
          </Button>
          <Button
            v-if="!isForced"
            variant="outline"
            class="cursor-pointer font-medium"
            @click="onDismiss"
          >
            {{ t('upgrade.later') }}
          </Button>

          <Button
            class="flex cursor-pointer items-center gap-2 font-semibold"
            @click="onUpgradeConfirm"
          >
            <ArrowUpCircleIcon class="size-4" />
            {{ t('upgrade.confirm') }}
          </Button>
        </div>
      </div>
    </div>

    <UpgradeProgress v-model="isUpgrading" :progress="downloadProgress" />
  </div>
</template>
