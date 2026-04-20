<script setup lang="ts">
import { relaunch } from '@tauri-apps/plugin-process'
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import UpgradeProgress from '@/components/UpgradeProgress.vue'
import { useGlobalState } from '@/composables/useGlobalState'
import { useI18n } from '@/composables/useI18n'

const { updateInfo, setCurrentWindow } = useGlobalState()
const { t } = useI18n()

const isUpgrading = ref(false)
const downloadProgress = ref(0)

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
  setCurrentWindow('Main')
}
</script>

<template>
  <div class="h-full w-full flex flex-col p-6 text-white cursor-default select-none bg-black/40">
    <div class="flex-1 overflow-auto rounded-md bg-black/20 p-4 border border-white/10">
      <h1 class="text-xl font-semibold mb-2">
        {{ t('upgrade.title', { version: updateInfo?.version }) }}
      </h1>
      <p class="text-sm text-gray-300 whitespace-pre-wrap">
        {{ updateInfo?.body || t('upgrade.no_notes') }}
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

    <UpgradeProgress v-model="isUpgrading" :progress="downloadProgress" />
  </div>
</template>
