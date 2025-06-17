import { LazyStore } from '@tauri-apps/plugin-store'

const store = new LazyStore('store.json', { autoSave: false })

// deepseek_api_key
export async function getDeepSeekApiKey(): Promise<string | undefined> {
  return await store.get('deepseek_api_key')
}
export async function setDeepSeekApiKey(key: string): Promise<void> {
  await store.set('deepseek_api_key', key)
}

export default store
