import { createGlobalState } from '@vueuse/core'
import { ref } from 'vue'
import { api } from '@/api'
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
    avatar_url: '',
  })

  const SESSION_SYNC_INTERVAL = 2 * 60 * 1000 // 2 minutes
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let sessionSyncTimer: ReturnType<typeof setTimeout> | null = null
  let sessionSyncGeneration = 0

  async function initialize() {
    const token = await authStore.getAuth('access_token')
    const userEmail = await authStore.getAuth('email')
    if (token && userEmail) {
      isLoggedIn.value = true
      user.value = {
        name: userEmail.split('@')[0],
        email: userEmail,
        avatar_url: await gravatar(userEmail),
      }
      startSessionSync()
    }
  }

  async function startSessionSync() {
    stopSessionSync()
    const generation = ++sessionSyncGeneration

    const performSessionSync = async () => {
      const token = await authStore.getAuth('access_token')
      if (!token || !isLoggedIn.value || generation !== sessionSyncGeneration)
        return

      try {
        const data = await api<{ name: string, email: string, avatar_url: string | null }>('/api/v1/session', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!isLoggedIn.value || generation !== sessionSyncGeneration)
          return

        const avatar_url = data.avatar_url || (data.email === user.value.email ? user.value.avatar_url : await gravatar(data.email))
        if (!isLoggedIn.value || generation !== sessionSyncGeneration)
          return

        if (data.name !== user.value.name || data.email !== user.value.email || avatar_url !== user.value.avatar_url) {
          user.value = { name: data.name, email: data.email, avatar_url }
          await authStore.setAuth('email', data.email)
          await authStore.saveAuth()
        }
      }
      catch (err: any) {
        logger.error('Auth', 'Session sync failed', err)
      }

      if (isLoggedIn.value && generation === sessionSyncGeneration) {
        sessionSyncTimer = setTimeout(performSessionSync, SESSION_SYNC_INTERVAL)
      }
    }

    await performSessionSync()
  }

  function stopSessionSync() {
    sessionSyncGeneration++
    if (sessionSyncTimer) {
      clearTimeout(sessionSyncTimer)
      sessionSyncTimer = null
    }
  }

  async function login() {
    try {
      authStatus.value = 'authorizing'
      const data = await api<DeviceCodeResponse>('/api/v1/device/authorization', {
        method: 'POST',
      })
      deviceCode.value = data
      const expiresAt = Date.now() + data.expires_in * 1000
      startPolling(data.device_code, data.interval, expiresAt)
    }
    catch (err) {
      logger.error('Auth', 'Failed to start login', err)
      authStatus.value = 'error'
    }
  }

  function startPolling(code: string, interval: number, expiresAt: number) {
    if (pollTimer)
      clearTimeout(pollTimer)

    async function poll() {
      if (Date.now() >= expiresAt) {
        authStatus.value = 'error'
        return
      }

      try {
        const data = await api<{ access_token: string, identity: any }>('/api/v1/device/token', {
          method: 'POST',
          body: JSON.stringify({ device_code: code }),
        })

        if (data.access_token) {
          await onSuccess(data.access_token, data.identity)
        }
      }
      catch (err: any) {
        if (err.message === 'expired_token') {
          authStatus.value = 'error'
        }
        else if (err.message === 'authorization_pending') {
          scheduleNextPoll(interval)
        }
        else if (err.message === 'slow_down') {
          startPolling(code, interval + 5, expiresAt)
        }
        else {
          authStatus.value = 'error'
        }
      }
    }

    function scheduleNextPoll(currentInterval: number) {
      const nextPollDelay = currentInterval * 1000
      if (Date.now() + nextPollDelay < expiresAt) {
        pollTimer = setTimeout(poll, nextPollDelay)
      }
      else {
        pollTimer = setTimeout(() => {
          authStatus.value = 'error'
        }, Math.max(0, expiresAt - Date.now()))
      }
    }

    scheduleNextPoll(interval)
  }

  async function onSuccess(token: string, identity: any) {
    isLoggedIn.value = true
    authStatus.value = 'success'
    user.value = {
      name: identity.name || identity.email.split('@')[0],
      email: identity.email,
      avatar_url: identity.avatar_url || await gravatar(identity.email),
    }
    await authStore.setAuth('access_token', token)
    await authStore.setAuth('email', identity.email)
    await authStore.saveAuth()
    startSessionSync()
    if (pollTimer)
      clearTimeout(pollTimer)
  }

  async function logout() {
    const token = await authStore.getAuth('access_token')
    if (token) {
      try {
        await api('/api/v1/session', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }
      catch (err) {
        logger.error('Auth', 'Failed to remove session on server', err)
      }
    }
    await reset()
  }

  async function reset() {
    stopSessionSync()
    cancel()
    isLoggedIn.value = false
    user.value = {
      name: '',
      email: '',
      avatar_url: '',
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
    reset,
  }
})
