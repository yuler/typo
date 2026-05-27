import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import { watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import * as store from '@/stores/settings'

let pushFn: (() => Promise<void>) | null = null
let isListeningForTrayPinToggle = false

export const PIN_INDICATOR_CHANGED_EVENT = 'settings:pin-indicator-changed'

export async function updateTrayMenu(): Promise<void> {
  if (pushFn) {
    await pushFn()
  }
}

export async function syncTrayMenu(): Promise<void> {
  const { t, locale } = useI18n()

  async function push(): Promise<void> {
    try {
      const autostartChecked = await invoke<boolean>('is_autostart_enabled')
      const pinIndicatorChecked = await store.get('pin_indicator')
      await invoke('update_tray_menu', {
        labels: {
          show: t('tray.show'),
          settings: t('tray.settings'),
          pin_indicator: t('tray.pin_indicator'),
          pin_indicator_checked: pinIndicatorChecked,
          check_updates: t('tray.check_updates'),
          about: t('tray.about', { version: __APP_VERSION__ }),
          open_log_folder: t('tray.open_log_folder'),
          autostart: t('tray.autostart'),
          autostart_checked: autostartChecked,
          quit: t('tray.quit'),
          tooltip: t('tray.tooltip'),
        },
      })
      logger.info('tray', 'tray menu updated')
    }
    catch (err) {
      logger.error('tray', 'Failed to update tray menu labels:', err)
    }
  }

  pushFn = push
  if (!isListeningForTrayPinToggle) {
    isListeningForTrayPinToggle = true
    await listen<boolean>('tray:pin-indicator-toggle-clicked', async (event) => {
      await setPinIndicator(event.payload)
    })
  }
  await push()
  watch(locale, () => void push())
}

export async function setPinIndicator(pinned: boolean): Promise<void> {
  await store.set('pin_indicator', pinned)
  await store.save()
  await emit(PIN_INDICATOR_CHANGED_EVENT, pinned)
  if (pinned) {
    await invoke('open_indicator_window')
  }
  await updateTrayMenu()
}
