import { attachConsole } from '@tauri-apps/plugin-log'
import { createApp } from 'vue'
import App from './App.vue'

attachConsole().catch(() => {})

createApp(App).mount('#app')
