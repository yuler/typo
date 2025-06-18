import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let permissionGranted = false
export async function showNotification(title: string, body: string) {
  permissionGranted = await isPermissionGranted()

  if (!permissionGranted) {
    const permission = await requestPermission()
    permissionGranted = permission === 'granted'
  }

  if (permissionGranted) {
    sendNotification({ title, body })
  }
}
