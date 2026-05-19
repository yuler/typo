import { invoke } from '@tauri-apps/api/core'
import { fetch } from '@tauri-apps/plugin-http'
import { logger } from '@/logger'

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
  const url = `${API_BASE_URL}${path}`
  const method = options?.method || 'GET'
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': userAgent,
    ...options?.headers,
  }

  if (import.meta.env.DEV) {
    let body = options?.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      }
      catch {}
    }
    logger.info('api', `[Request] ${method} ${url}`, { headers, body })
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    if (import.meta.env.DEV) {
      logger.error('api', `[Error] ${method} ${url} (${response.status})`, errorData)
    }
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
  }

  if (response.status === 204) {
    if (import.meta.env.DEV) {
      logger.info('api', `[Response] ${method} ${url} (204)`)
    }
    return null as T
  }

  const data = await response.json()
  if (import.meta.env.DEV) {
    logger.info('api', `[Response] ${method} ${url} (${response.status})`, data)
  }
  return data
}
