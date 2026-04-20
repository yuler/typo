import { invoke } from '@tauri-apps/api/core'
import { watch } from 'vue'
import { useI18n } from '@/composables/useI18n'

export async function syncTrayMenu(): Promise<void> {
  // eslint-disable-next-line react/rules-of-hooks -- Vue composable used in non-React utility function
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
    catch (err) {
      console.error('Failed to update tray menu labels:', err)
    }
  }

  await push()
  watch(locale, () => void push())
}
