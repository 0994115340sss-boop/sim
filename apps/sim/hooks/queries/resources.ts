import { keepPreviousData, useQuery } from '@tanstack/react-query'

/**
 * Query key factories for resource fetching
 *
 * Follows TanStack Query hierarchical key structure for optimal cache management
 */
export const resourceKeys = {
  all: (resourceType: string) => [resourceType] as const,
  lists: (resourceType: string) => [...resourceKeys.all(resourceType), 'list'] as const,
  list: (resourceType: string, credential: string, params?: Record<string, any>) => {
    const key = [...resourceKeys.lists(resourceType), credential] as const
    return params ? ([...key, params] as const) : key
  },
  detail: (resourceType: string, resourceId: string, credential: string) =>
    [...resourceKeys.all(resourceType), 'detail', resourceId, credential] as const,
}

/**
 * Configuration for resource list queries
 */
export interface ResourceListConfig {
  /** Type of resource (e.g., 'channels', 'projects', 'issues', 'folders', 'files', 'teams') */
  resourceType: string
  /** OAuth provider credential ID */
  credential: string | undefined
  /** API endpoint to fetch from */
  endpoint: string
  /** Optional params to pass in request body */
  params?: Record<string, any>
  /** Whether the query should run (default: true if credential exists) */
  enabled?: boolean
  /** Custom stale time in milliseconds (default: 60000) */
  staleTime?: number
}

/**
 * Configuration for resource detail queries
 */
export interface ResourceDetailConfig extends Omit<ResourceListConfig, 'params'> {
  /** ID of the specific resource to fetch */
  resourceId: string | undefined
  /** Optional params to pass in request body */
  params?: Record<string, any>
}

/**
 * Generic hook to fetch a list of resources (channels, projects, issues, etc.)
 *
 * Provides consistent caching, error handling, and retry logic across all selector types.
 *
 * @example
 * const { data: channels, isLoading } = useResourceList({
 *   resourceType: 'channels',
 *   credential: 'cred_123',
 *   endpoint: '/api/tools/slack/channels',
 * })
 */
export function useResourceList<T = any>(config: ResourceListConfig) {
  const {
    resourceType,
    credential,
    endpoint,
    params,
    enabled = true,
    staleTime = 60 * 1000,
  } = config

  return useQuery({
    queryKey: credential
      ? resourceKeys.list(resourceType, credential, params)
      : [resourceType, 'empty'],
    queryFn: async () => {
      if (!credential) return []

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, ...params }),
      })

      if (!response.ok) {
        // On 403, return empty array (credential invalid/disconnected)
        if (response.status === 403) return []
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Try common response patterns
      return (
        data[resourceType] ||
        data.items ||
        data.results ||
        data.data ||
        (Array.isArray(data) ? data : [])
      )
    },
    enabled: enabled && !!credential,
    staleTime,
    retry: false, // Don't retry on auth errors - prevents infinite loops
    placeholderData: keepPreviousData,
  })
}

/**
 * Generic hook to fetch details of a single resource
 *
 * Useful for fetching metadata about a specific resource (e.g., channel details, project info).
 *
 * @example
 * const { data: channel } = useResourceDetail({
 *   resourceType: 'channels',
 *   resourceId: 'C123456',
 *   credential: 'cred_123',
 *   endpoint: '/api/tools/slack/channel',
 * })
 */
export function useResourceDetail<T = any>(config: ResourceDetailConfig) {
  const {
    resourceType,
    resourceId,
    credential,
    endpoint,
    params,
    enabled = true,
    staleTime = 60 * 1000,
  } = config

  return useQuery({
    queryKey:
      credential && resourceId
        ? resourceKeys.detail(resourceType, resourceId, credential)
        : [resourceType, 'detail', 'empty'],
    queryFn: async () => {
      if (!credential || !resourceId) return null

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, resourceId, ...params }),
      })

      if (!response.ok) {
        // On 403/404, return null (credential invalid or resource not found)
        if (response.status === 403 || response.status === 404) return null
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Try common response patterns
      return data.data || data.item || data.result || data
    },
    enabled: enabled && !!credential && !!resourceId,
    staleTime,
    retry: false,
    placeholderData: keepPreviousData,
  })
}
