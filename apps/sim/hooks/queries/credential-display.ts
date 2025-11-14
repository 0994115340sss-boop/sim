import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { credentialsKeys } from './credentials'

/**
 * Hook to get a credential's display name for rendering in workflow blocks
 *
 * This hook is used when you have a credential ID and need to display its name
 * (e.g., showing "waleed@sim.ai" in a workflow block on the canvas).
 *
 * It's different from useCredentials() which fetches ALL credentials for a provider.
 * This fetches all credentials and extracts the specific one we need.
 *
 * @param credentialId - The credential ID to get the display name for
 * @param provider - The OAuth provider (e.g., 'slack', 'google-sheets')
 * @returns The credential's display name or null
 *
 * @example
 * const { displayName, isLoading } = useCredentialForDisplay(
 *   'cred_123',
 *   'slack'
 * )
 * // Returns: { displayName: 'waleed@sim.ai', isLoading: false }
 */
export function useCredentialForDisplay(
  credentialId: string | undefined,
  provider: string | undefined
) {
  const query = useQuery({
    queryKey:
      credentialId && provider ? credentialsKeys.list(provider) : ['credential-display', 'empty'],
    queryFn: async () => {
      if (!provider) return null

      const response = await fetch(
        `/api/auth/oauth/credentials?provider=${encodeURIComponent(provider)}`
      )

      // If 403 or other error, return null (don't throw - prevents retries)
      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.credentials || []
    },
    enabled: !!credentialId && !!provider,
    staleTime: 30 * 1000, // 30 seconds
    retry: false, // Don't retry on 403/404 errors - prevents infinite loops
    placeholderData: keepPreviousData,
  })

  // Extract the specific credential's display name
  const credential = query.data?.find((cred: any) => cred.id === credentialId)

  return {
    displayName: credential?.name || null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
