import { createApp } from 'vue'
import App from './App.vue'
import { setupGlobalShortcut } from './shortcut'

createApp(App).mount('#app')

setupGlobalShortcut()
