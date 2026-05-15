import { createGlobalState } from '@vueuse/core'
import { ref } from 'vue'
import { apiFetch } from '@/lib/api'
import { logger } from '@/logger'
import * as store from '@/store'

export type AuthStatus = 'idle' | 'authorizing' | 'success' | 'error'

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  interval: number
  expires_in: number
}

export const useAuth = createGlobalState(() => {
  const isLoggedIn = ref(false)
  const authStatus = ref<AuthStatus>('idle')
  const deviceCode = ref<DeviceCodeResponse | null>(null)
  const user = ref({
    name: '',
    email: '',
    avatar: '',
  })

  let pollTimer: ReturnType<typeof setTimeout> | null = null

  async function initialize() {
    const token = await store.get('access_token')
    const userInfo = await store.get('user_info')
    if (token && userInfo) {
      isLoggedIn.value = true
      user.value = userInfo
    }
  }

  async function login() {
    try {
      authStatus.value = 'authorizing'
      const data = await apiFetch<DeviceCodeResponse>('/api/v1/device/authorization', {
        method: 'POST',
      })
      deviceCode.value = data
      startPolling(data.device_code, data.interval)
    }
    catch (err) {
      logger.error('Auth', 'Failed to start login', err)
      authStatus.value = 'error'
    }
  }

  function startPolling(code: string, interval: number) {
    if (pollTimer)
      clearTimeout(pollTimer)

    const poll = async () => {
      try {
        const data = await apiFetch<{ access_token: string, identity: any }>('/api/v1/device/token', {
          method: 'POST',
          body: JSON.stringify({ device_code: code }),
        })

        if (data.access_token) {
          await handleSuccess(data.access_token, data.identity)
        }
      }
      catch (err: any) {
        if (err.message === 'authorization_pending') {
          pollTimer = setTimeout(poll, interval * 1000)
        }
        else if (err.message === 'slow_down') {
          startPolling(code, interval + 5)
        }
        else {
          authStatus.value = 'error'
        }
      }
    }

    pollTimer = setTimeout(poll, interval * 1000)
  }

  async function handleSuccess(token: string, identity: any) {
    isLoggedIn.value = true
    authStatus.value = 'success'
    user.value = {
      name: identity.name || identity.email.split('@')[0],
      email: identity.email,
      avatar: identity.avatar_url || `https://github.com/${identity.email.split('@')[0]}.png`,
    }
    await store.set('access_token', token)
    await store.set('user_info', user.value)
    await store.save()
    if (pollTimer)
      clearTimeout(pollTimer)
  }

  async function logout() {
    isLoggedIn.value = false
    authStatus.value = 'idle'
    await store.set('access_token', '')
    await store.set('user_info', null)
    await store.save()
  }

  function cancel() {
    if (pollTimer)
      clearTimeout(pollTimer)
    authStatus.value = 'idle'
    deviceCode.value = null
  }

  initialize()

  return {
    isLoggedIn,
    authStatus,
    deviceCode,
    user,
    login,
    logout,
    cancel,
  }
})
