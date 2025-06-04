import { createApp } from 'vue'
import App from './App.vue'
import { Window } from '@tauri-apps/api/window'
import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut'
import { invoke } from '@tauri-apps/api/core'

createApp(App).mount('#app')

const DEFAULT_SHORTCUT = 'Ctrl+Shift+T'

// Unregister first if already registered
async function setupGlobalShortcut() {
  try {
    if (await isRegistered(DEFAULT_SHORTCUT)) {
      console.log('isRegistered')
      await unregister(DEFAULT_SHORTCUT)
    }
    
    await register(DEFAULT_SHORTCUT, async (event) => {
      console.log('event', event)
      if (event.state !== 'Released') {
        return
      }

      try {
        const selectedText = await invoke('get_selected_text')
        console.log('Selected text:', selectedText)

        if (!selectedText) {
          return
        }

        const mainWindow = await Window.getByLabel('main')
        await mainWindow?.emit('set-input', selectedText)
        await mainWindow?.show()
        // const isVisible = await mainWindow?.isVisible()
        // console.log({ isVisible, mainWindow })
        // if (isVisible) {
        //   await mainWindow?.hide()
        // } else {
        //   await mainWindow?.hide()
        // }
        console.log('Shortcut triggered')
      } catch (error) {
        console.error('Error getting selected text:', error)
      }
    })
  } catch (error) {
    console.error('Error setting up global shortcut:', error)
  }
}

setupGlobalShortcut()
