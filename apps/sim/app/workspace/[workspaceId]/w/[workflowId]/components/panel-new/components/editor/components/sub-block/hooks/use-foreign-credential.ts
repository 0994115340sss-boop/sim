import { useForeignCredentialMeta } from '@/hooks/queries/credentials'

export function useForeignCredential(
  credentialId?: string,
  workflowId?: string,
  provider?: string
) {
  const { data: foreignMeta, isLoading } = useForeignCredentialMeta(
    credentialId,
    workflowId,
    !!credentialId && !!workflowId && !!provider
  )

  return {
    isForeign: !!foreignMeta,
    displayName: foreignMeta?.name || null,
    isLoading,
  }
}
