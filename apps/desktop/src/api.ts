import { invoke } from '@tauri-apps/api/core'
import { fetch } from '@tauri-apps/plugin-http'
import { toast } from 'vue-sonner'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://app.typo.yuler.cc'

let userAgentPromise: Promise<string> | null = null
let isResetting = false

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

function is401ResetExempt(path: string, method: string): boolean {
  const normalizedPath = path.split('?')[0]
  const exemptions = [
    { method: 'POST', path: '/api/v1/device/authorization' },
    { method: 'POST', path: '/api/v1/device/token' },
    { method: 'DELETE', path: '/api/v1/session' },
  ]
  return exemptions.some(
    e => e.path === normalizedPath && e.method.toUpperCase() === method.toUpperCase(),
  )
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

  if (response.status === 401 && !is401ResetExempt(path, method)) {
    if (!isResetting) {
      isResetting = true
      try {
        const { useAuth } = await import('@/composables/useAuth')
        const auth = useAuth()
        if (auth.isLoggedIn.value) {
          const { t } = useI18n()
          toast.error(t('auth.session_expired'))
          await auth.reset()
        }
      }
      catch (err) {
        logger.error('api', 'Failed to reset auth state', err)
      }
      finally {
        isResetting = false
      }
    }
  }

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
