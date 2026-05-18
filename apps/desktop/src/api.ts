import { invoke } from '@tauri-apps/api/core'
import { fetch } from '@tauri-apps/plugin-http'

export const API_BASE_URL = 'https://app.typo.yuler.cc'

// TODO: Add switchable local and production api
// export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://app.typo.yuler.cc')

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
      return `Typo (${platform}; version ${version})`
    }
    catch (error) {
      console.error('failed to get system info for user agent', error)
      return 'Typo (Unknown; version Unknown)'
    }
  })()

  return userAgentPromise
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const userAgent = await getUserAgent()

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}
