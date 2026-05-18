import { invoke } from '@tauri-apps/api/core'
import { fetch } from '@tauri-apps/plugin-http'
import { toast } from 'vue-sonner'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://app.typo.yuler.cc'

let userAgentPromise: Promise<string> | null = null

function getUserAgent(): Promise<string> {
  if (userAgentPromise)
    return userAgentPromise

  userAgentPromise = (async () => {
    try {
      const { os, version } = await invoke<{ os: string, version: string }>('get_system_info')
      const platform = {
        macos: 'macOS',
        windows: 'Windows',
        linux: 'Linux',
      }[os] || os
      return `Typo Desktop/${version} (${platform})`
    }
    catch (error) {
      console.error('failed to get system info for user agent', error)
      return 'Typo Desktop/Unknown (Unknown)'
    }
  })()

  return userAgentPromise
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const userAgent = await getUserAgent()

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        ...options?.headers,
      },
    })
  }
  catch (error: any) {
    const msg = error.message || 'Network error'
    toast.error(msg)
    throw error
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    const msg = error.error || `HTTP error! status: ${response.status}`
    if (msg !== 'authorization_pending' && msg !== 'slow_down') {
      toast.error(msg)
    }
    throw new Error(msg)
  }

  if (response.status === 204) {
    return null as T
  }

  return response.json()
}
