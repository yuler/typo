import { createApp } from 'vue'
import App from './App.vue'
import { Window } from '@tauri-apps/api/window'
import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut'
import { invoke } from '@tauri-apps/api/core'
import { Menu } from '@tauri-apps/api/menu';

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

async function setupMenus() {
  const menus = await Menu.new({
      items: [
          {
              id: 'settings',
              text: 'Settings',
              action: async () => {
                const settingsWindow = await Window.getByLabel('settings')
                settingsWindow?.show() 
              },
          },
          {
              id: 'about',
              text: 'About',
              action: async () => {
                open('https://github.com/yuler/typo')
              }
          },
      ],
  });


  menus.setAsAppMenu().then((res) => {
    console.log('menu set success', res);
  }).catch((err) => {
    console.error('Error setting up menus:', err);
  })
}

// setupGlobalShortcut()
setupMenus()