import { useCallback } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Credential } from '@/lib/oauth'

/**
 * Query key factories for OAuth credentials
 * Follows TanStack Query best practices for hierarchical keys
 */
export const credentialsKeys = {
  all: ['credentials'] as const,
  lists: () => [...credentialsKeys.all, 'list'] as const,
  list: (provider: string) => [...credentialsKeys.lists(), provider] as const,
  detail: (credentialId: string, workflowId?: string) => {
    if (workflowId) {
      return [...credentialsKeys.all, 'detail', credentialId, workflowId] as const
    }
    return [...credentialsKeys.all, 'detail', credentialId] as const
  },
}

/**
 * Fetch credentials for a specific OAuth provider
 *
 * @param provider - The OAuth provider ID (e.g., 'google-sheets', 'slack')
 * @returns Query result with credentials array
 *
 * @example
 * const { data: credentials, isLoading, refetch } = useCredentials('google-sheets')
 */
export function useCredentials(provider: string | undefined) {
  return useQuery({
    queryKey: provider ? credentialsKeys.list(provider) : ['credentials', 'empty'],
    queryFn: async () => {
      if (!provider) return []

      const response = await fetch(`/api/auth/oauth/credentials?provider=${provider}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch credentials: ${response.statusText}`)
      }

      const data = await response.json()
      return (data.credentials as Credential[]) || []
    },
    enabled: !!provider,
    staleTime: 30 * 1000, // 30 seconds - credentials don't change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    retry: 1, // OAuth endpoints can legitimately fail
    placeholderData: keepPreviousData, // Smooth transitions without loading flicker
  })
}

/**
 * Fetch metadata for a foreign credential (owned by a collaborator)
 *
 * Used when a user sees a credential selected by another user that they don't own.
 * Returns limited metadata (no email leakage) to display "Saved by collaborator".
 *
 * @param credentialId - The credential ID to fetch metadata for
 * @param workflowId - The workflow ID for permission checking
 * @param enabled - Whether the query should run
 * @returns Query result with credential metadata or null
 *
 * @example
 * const isForeign = selectedId && !ownCredentialIds.includes(selectedId)
 * const { data: foreignMeta } = useForeignCredentialMeta(selectedId, workflowId, isForeign)
 */
export function useForeignCredentialMeta(
  credentialId: string | undefined,
  workflowId: string | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey:
      credentialId && workflowId
        ? credentialsKeys.detail(credentialId, workflowId)
        : ['credentials', 'detail', 'empty'],
    queryFn: async () => {
      if (!credentialId || !workflowId) return null

      const params = new URLSearchParams({
        credentialId,
        workflowId,
      })

      const response = await fetch(`/api/auth/oauth/credentials?${params}`)

      // 404 or 403 means credential doesn't exist or no permission - return null
      if (!response.ok) return null

      const data = await response.json()
      return data.credentials?.[0] || null
    },
    enabled: enabled && !!credentialId && !!workflowId,
    staleTime: 60 * 1000, // Longer stale time for foreign credentials (1 minute)
    retry: false, // Don't retry if credential is inaccessible
    placeholderData: keepPreviousData,
  })
}

/**
 * Hook to invalidate credentials cache
 *
 * Call this when:
 * - User connects a new OAuth account
 * - User disconnects an OAuth account
 * - Need to force refresh credentials
 *
 * @returns Callback function to invalidate credentials
 *
 * @example
 * const invalidateCredentials = useInvalidateCredentials()
 *
 * // Invalidate specific provider
 * invalidateCredentials('google-sheets')
 *
 * // Invalidate all credentials
 * invalidateCredentials()
 */
export function useInvalidateCredentials() {
  const queryClient = useQueryClient()

  return useCallback(
    (provider?: string) => {
      if (provider) {
        // Invalidate specific provider's credentials
        queryClient.invalidateQueries({ queryKey: credentialsKeys.list(provider) })
      } else {
        // Invalidate all credentials
        queryClient.invalidateQueries({ queryKey: credentialsKeys.all })
      }
    },
    [queryClient]
  )
}

/**
 * Hook to prefetch credentials for a provider
 *
 * Useful for preloading credentials on hover or before opening a selector.
 * Improves perceived performance.
 *
 * @returns Callback function to prefetch credentials
 *
 * @example
 * const prefetchCredentials = usePrefetchCredentials()
 *
 * <div onMouseEnter={() => prefetchCredentials('google-sheets')}>
 *   Open Selector
 * </div>
 */
export function usePrefetchCredentials() {
  const queryClient = useQueryClient()

  return useCallback(
    async (provider: string) => {
      await queryClient.prefetchQuery({
        queryKey: credentialsKeys.list(provider),
        queryFn: async () => {
          const response = await fetch(`/api/auth/oauth/credentials?provider=${provider}`)
          if (!response.ok) return []
          const data = await response.json()
          return (data.credentials as Credential[]) || []
        },
        staleTime: 30 * 1000,
      })
    },
    [queryClient]
  )
}
