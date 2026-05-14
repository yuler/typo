import { createGlobalState } from '@vueuse/core'
import { ref } from 'vue'

export const useAuth = createGlobalState(() => {
  const isLoggedIn = ref(false)
  const user = ref({
    name: 'Yule',
    email: 'yule@example.com',
    avatar: 'https://github.com/yuler.png',
  })

  function login() {
    // For now, just toggle for demo
    isLoggedIn.value = true
  }

  function logout() {
    isLoggedIn.value = false
  }

  return {
    isLoggedIn,
    user,
    login,
    logout,
  }
})
