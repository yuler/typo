import { createApp } from 'vue'
import App from './App.vue'
import { Window } from '@tauri-apps/api/window'

createApp(App).mount('#app')

import { register } from '@tauri-apps/plugin-global-shortcut'

// Register the shortcut once
register('CommandOrControl+Shift+I', async (event) => {
  if (event.state === 'Released') {
    return
  }
  const mainWindow = await Window.getByLabel('main')
  const isVisible = await mainWindow?.isVisible()
  console.log({ isVisible, mainWindow })
  if (isVisible) {
    await mainWindow?.hide()
  } else {
    await mainWindow?.show()
  }
  console.log('Shortcut triggered')
})
