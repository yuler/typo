<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { SettingsIcon } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import Logo from '@/components/Logo.vue'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import { setupGlobalShortcut } from '@/shortcut'
import { DEFAULT_GLOBAL_SHORTCUT } from '@/store'
import * as store from '@/store'
import { initializeWindow } from '@/window'
import { formatShortcut, sleep } from '@/utils'

const appWindow = getCurrentWebviewWindow()
const { t } = useI18n()

const isMacOS = ref(false)
const globalShortcut = ref(DEFAULT_GLOBAL_SHORTCUT)

onMounted(async () => {
  logger.info('Home', 'onMounted')

  await initializeWindow(false)

  const systemInfo = await invoke<{ os: string, is_wayland: boolean }>('get_system_info')
  isMacOS.value = systemInfo.os === 'macos'

  if (isMacOS.value) {
    try {
      const trusted = await invoke('request_mac_accessibility_permissions')
      if (!trusted) {
        logger.warn('Home', 'accessibility not trusted')
      }
    }
    catch (err) {
      logger.error('Home', 'accessibility error', err)
    }
  }

  globalShortcut.value = (await store.get('global_shortcut')) || DEFAULT_GLOBAL_SHORTCUT

  // Initialize the global shortcut
  await setupGlobalShortcut()

  // Show Settings window if AI key is missing
  const aiProvider = await store.get('ai_provider')
  if (aiProvider === 'deepseek' && (await store.get('deepseek_api_key')) === '') {
    await sleep(500)
    invoke('open_settings_window')
  }
})

function openSettings() {
  invoke('open_settings_window')
}
</script>

<template>
  <div
    class="h-full w-full flex items-center px-3 gap-3 cursor-move transition-shadow duration-300 select-none"
    tabindex="0"
  >
    <Logo />

    <div class="flex-1 flex overflow-hidden min-w-0 h-full items-center">
      <kbd class="px-1.5 py-0.5 rounded border border-border/50 bg-muted/30 font-mono text-[10px] text-muted-foreground/60">
        {{ formatShortcut(globalShortcut, isMacOS) }}
      </kbd>
    </div>

    <!-- Right: Settings -->
    <button
      class="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
      @click="openSettings"
    >
      <SettingsIcon class="w-4 h-4 text-muted-foreground" />
    </button>
  </div>
</template>
