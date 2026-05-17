import { createGlobalState } from '@vueuse/core'
import { ref } from 'vue'
import { apiFetch } from '@/api'
import { logger } from '@/logger'
import * as authStore from '@/stores/auth'
import { gravatar } from '@/utils'

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
    const token = await authStore.getAuth('access_token')
    const userEmail = await authStore.getAuth('email')
    if (token && userEmail) {
      isLoggedIn.value = true
      user.value = {
        name: userEmail.split('@')[0],
        email: userEmail,
        avatar: await gravatar(userEmail),
      }
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
          await onSuccess(data.access_token, data.identity)
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

  async function onSuccess(token: string, identity: any) {
    isLoggedIn.value = true
    authStatus.value = 'success'
    user.value = {
      name: identity.name || identity.email.split('@')[0],
      email: identity.email,
      avatar: identity.avatar_url || await gravatar(identity.email),
    }
    await authStore.setAuth('access_token', token)
    await authStore.setAuth('email', identity.email)
    await authStore.saveAuth()
    if (pollTimer)
      clearTimeout(pollTimer)
  }

  async function logout() {
    isLoggedIn.value = false
    authStatus.value = 'idle'
    user.value = {
      name: '',
      email: '',
      avatar: '',
    }
    await authStore.setAuth('access_token', '')
    await authStore.setAuth('email', '')
    await authStore.saveAuth()
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
