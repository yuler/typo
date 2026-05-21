import type { CompletionRecord } from '@/api'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { deleteCompletion, fetchCompletions } from '@/api'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import * as authStore from '@/stores/auth'

export function useCompletions() {
  const { t } = useI18n()
  const completions = ref<CompletionRecord[]>([])
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const isDeleting = ref<string | null>(null)
  const hasMore = ref(false)
  const nextPage = ref<number | null>(null)
  const error = ref<string | null>(null)

  async function loadInitial() {
    const token = await authStore.getAuth('access_token')
    if (!token) {
      error.value = 'Unauthorized'
      return
    }

    isLoading.value = true
    error.value = null
    completions.value = []
    try {
      const response = await fetchCompletions(undefined, token)
      completions.value = response.completions
      nextPage.value = response.meta.next_page
      hasMore.value = response.meta.has_more
    }
    catch (err: any) {
      logger.error('useCompletions', 'Failed to fetch completions', err)
      error.value = err.message || 'Failed to load completions'
      completions.value = []
      toast.error(t('history.load_error'))
    }
    finally {
      isLoading.value = false
    }
  }

  async function loadMore() {
    if (isLoadingMore.value || !hasMore.value || !nextPage.value)
      return

    const token = await authStore.getAuth('access_token')
    if (!token)
      return

    isLoadingMore.value = true
    try {
      const response = await fetchCompletions(nextPage.value, token)
      completions.value = [...completions.value, ...response.completions]
      nextPage.value = response.meta.next_page
      hasMore.value = response.meta.has_more
    }
    catch (err: any) {
      logger.error('useCompletions', 'Failed to fetch more completions', err)
      toast.error(t('history.load_error'))
    }
    finally {
      isLoadingMore.value = false
    }
  }

  async function remove(id: string) {
    const token = await authStore.getAuth('access_token')
    if (!token)
      return

    isDeleting.value = id
    try {
      await deleteCompletion(id, token)
      completions.value = completions.value.filter(c => c.id !== id)
      toast.success(t('history.delete_success'))
    }
    catch (err: any) {
      logger.error('useCompletions', 'Failed to delete completion', err)
      toast.error(err.message === 'Unauthorized' ? t('auth.session_expired') : t('history.delete_error'))
    }
    finally {
      isDeleting.value = null
    }
  }

  return {
    completions,
    isLoading,
    isLoadingMore,
    isDeleting,
    hasMore,
    error,
    loadInitial,
    loadMore,
    remove,
  }
}
