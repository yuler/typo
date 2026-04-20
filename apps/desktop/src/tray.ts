/* eslint-disable react/rules-of-hooks -- Vue helper uses Vue composable outside component setup */
import { invoke } from '@tauri-apps/api/core'
import { watch } from 'vue'
import { useI18n } from '@/composables/useI18n'

export async function syncTrayMenu(): Promise<void> {
  const { t, locale } = useI18n()

  async function push(): Promise<void> {
    try {
      await invoke('update_tray_menu', {
        labels: {
          show: t('tray.show'),
          settings: t('tray.settings'),
          check_updates: t('tray.check_updates'),
          about: t('tray.about', { version: __APP_VERSION__ }),
          quit: t('tray.quit'),
          tooltip: t('tray.tooltip'),
        },
      })
    }
    catch (error) {
      console.error('Failed to update tray menu labels', error)
    }
  }

  await push()
  watch(locale, () => void push())
}
