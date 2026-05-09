import { invoke } from '@tauri-apps/api/core'
import { watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'

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
          open_log_folder: t('tray.open_log_folder'),
          quit: t('tray.quit'),
          tooltip: t('tray.tooltip'),
        },
      })
      logger.debug('tray', 'tray menu updated')
    }
    catch (err) {
      logger.error('tray', 'Failed to update tray menu labels:', err)
    }
  }

  await push()
  watch(locale, () => void push())
}
