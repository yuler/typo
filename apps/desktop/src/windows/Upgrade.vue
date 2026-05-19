<script setup lang="ts">
import { getVersion } from '@tauri-apps/api/app'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'
import { computed, onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import UpgradeProgress from '@/components/UpgradeProgress.vue'
import { useGlobalState } from '@/composables/useGlobalState'
import { useI18n } from '@/composables/useI18n'

const { updateInfo, setUpdateInfo } = useGlobalState()
const appWindow = getCurrentWebviewWindow()
const { t, locale } = useI18n()

const isUpgrading = ref(false)
const downloadProgress = ref(0)
const isChecking = ref(false)
const isUpToDate = ref(false)
const appVersion = ref('')

const notes = computed(() => {
  const info = updateInfo.value
  if (!info)
    return ''

  const i18nNotes = (info.rawJson as any)?.notes_i18n
  const rawNotes = i18nNotes?.[locale.value] || info.body || t('upgrade.no_notes')
  return Array.isArray(rawNotes) ? rawNotes.join('\n') : rawNotes
})

onMounted(async () => {
  appVersion.value = await getVersion()

  if (!updateInfo.value) {
    isChecking.value = true
    try {
      const update = await check()
      if (update?.available) {
        setUpdateInfo(update)
      }
      else {
        isUpToDate.value = true
      }
    }
    catch (e) {
      console.error('Update check failed', e)
      isUpToDate.value = true
    }
    finally {
      isChecking.value = false
    }
  }
})

async function onUpgradeConfirm() {
  if (updateInfo.value) {
    isUpgrading.value = true
    let downloaded = 0
    let contentLength = 0
    await updateInfo.value.downloadAndInstall((event) => {
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

function onCancel() {
  appWindow.close()
}
</script>

<template>
  <div class="h-full w-full flex flex-col p-6 text-white cursor-default select-none bg-black/40">
    <div v-if="isChecking" class="flex-1 flex items-center justify-center">
      <div class="text-sm text-gray-300">
        {{ t('upgrade.checking') }}
      </div>
    </div>
    <div v-else-if="isUpToDate" class="flex-1 flex flex-col items-center justify-center gap-4">
      <div class="text-sm text-gray-300">
        {{ t('upgrade.up_to_date', { version: appVersion }) }}
      </div>
      <Button variant="secondary" @click="onCancel">
        {{ t('upgrade.later') }}
      </Button>
    </div>
    <template v-else>
      <div class="flex-1 overflow-auto rounded-md bg-black/20 p-4 border border-white/10">
        <h1 class="text-xl font-semibold mb-2">
          {{ t('upgrade.title', { version: updateInfo?.version }) }}
        </h1>
        <p class="text-sm text-gray-300 whitespace-pre-wrap">
          {{ notes }}
        </p>
      </div>
      <div class="flex justify-end gap-3 mt-6">
        <Button variant="secondary" @click="onCancel">
          {{ t('upgrade.later') }}
        </Button>
        <Button @click="onUpgradeConfirm">
          {{ t('upgrade.confirm') }}
        </Button>
      </div>
    </template>

    <UpgradeProgress v-model="isUpgrading" :progress="downloadProgress" />
  </div>
</template>
