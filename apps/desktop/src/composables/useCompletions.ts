import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { api, apiFetch } from '@/api'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import * as authStore from '@/stores/auth'

export interface CompletionRecord {
  id: string
  input: string
  output: string
  prompt: string | null
  prompt_key: string
  duration_ms: number | null
  status: string
  created_at: string
}

export interface CompletionsPage {
  completions: CompletionRecord[]
  totalCount: number | null
  nextPage: number | null
}

function parseNextPageFromLink(link: string | null): number | null {
  if (!link)
    return null

  const match = link.match(/<([^>]+)>;\s*rel="next"/)
  if (!match)
    return null

  try {
    const page = new URL(match[1]).searchParams.get('page')
    return page ? Number.parseInt(page, 10) : null
  }
  catch {
    return null
  }
}

export async function fetchCompletions(page?: number, token?: string): Promise<CompletionsPage> {
  const query = page ? `?page=${page}` : ''
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await apiFetch(`/api/v1/completions${query}`, { headers })
  const completions = await response.json() as CompletionRecord[]
  const totalCountHeader = response.headers.get('X-Total-Count')
  const totalCount = totalCountHeader ? Number.parseInt(totalCountHeader, 10) : null

  return {
    completions,
    totalCount,
    nextPage: parseNextPageFromLink(response.headers.get('Link')),
  }
}

export async function deleteCompletion(id: string, token: string): Promise<void> {
  await api<void>(`/api/v1/completions/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

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
      const page = await fetchCompletions(undefined, token)
      completions.value = page.completions
      nextPage.value = page.nextPage
      hasMore.value = page.nextPage !== null
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
      const page = await fetchCompletions(nextPage.value, token)
      completions.value = [...completions.value, ...page.completions]
      nextPage.value = page.nextPage
      hasMore.value = page.nextPage !== null
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
