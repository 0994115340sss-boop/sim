'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/components/emcn/components/button/button'
import { Combobox, type ComboboxOption } from '@/components/emcn/components/combobox/combobox'
import {
  type Credential,
  getCanonicalScopesForProvider,
  getProviderIdFromServiceId,
  getServiceIdFromScopes,
  OAUTH_PROVIDERS,
  type OAuthProvider,
  parseProvider,
} from '@/lib/oauth'
import { OAuthRequiredModal } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel-new/components/editor/components/sub-block/components/credential-selector/components/oauth-required-modal'
import { useSubBlockValue } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel-new/components/editor/components/sub-block/hooks/use-sub-block-value'
import type { SubBlockConfig } from '@/blocks/types'
import { useCredentials, useForeignCredentialMeta } from '@/hooks/queries/credentials'
import { getMissingRequiredScopes } from '@/hooks/use-oauth-scope-status'
import { useDisplayNamesStore } from '@/stores/display-names/store'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'

interface CredentialSelectorProps {
  blockId: string
  subBlock: SubBlockConfig
  disabled?: boolean
  isPreview?: boolean
  previewValue?: any | null
}

export function CredentialSelector({
  blockId,
  subBlock,
  disabled = false,
  isPreview = false,
  previewValue,
}: CredentialSelectorProps) {
  const [showOAuthModal, setShowOAuthModal] = useState(false)
  const { activeWorkflowId } = useWorkflowRegistry()

  // Use collaborative state management via useSubBlockValue hook
  const [storeValue, setStoreValue] = useSubBlockValue(blockId, subBlock.id)

  // Extract values from subBlock config
  const provider = subBlock.provider as OAuthProvider
  const requiredScopes = subBlock.requiredScopes || []
  const label = subBlock.placeholder || 'Select credential'
  const serviceId = subBlock.serviceId

  // Get the effective value (preview or store value)
  const effectiveValue = isPreview && previewValue !== undefined ? previewValue : storeValue

  // Initialize selectedId directly from effectiveValue to avoid extra render
  const [selectedId, setSelectedId] = useState(effectiveValue || '')

  // Ref to track the last cleared credential to prevent duplicate clearing
  const lastClearedRef = useRef<string>('')

  // Derive service and provider IDs using useMemo
  const effectiveServiceId = useMemo(() => {
    return serviceId || getServiceIdFromScopes(provider, requiredScopes)
  }, [provider, requiredScopes, serviceId])

  const effectiveProviderId = useMemo(() => {
    return getProviderIdFromServiceId(effectiveServiceId)
  }, [effectiveServiceId])

  // Fetch credentials using React Query
  const {
    data: credentials = [],
    isLoading,
    error: credentialsError,
    refetch: refetchCredentials,
  } = useCredentials(effectiveProviderId)

  // Check if selected credential is foreign (owned by collaborator)
  const isForeignCredential = !!selectedId && !credentials.some((cred) => cred.id === selectedId)

  // Fetch foreign credential metadata if needed
  const { data: foreignMeta } = useForeignCredentialMeta(
    selectedId,
    activeWorkflowId || undefined,
    isForeignCredential && !isPreview
  )

  const hasForeignMeta = !!foreignMeta

  // Sync selectedId when effectiveValue changes externally (e.g., from collaboration)
  // Only update if they differ and we're not currently loading to avoid loops
  useEffect(() => {
    if (effectiveValue !== selectedId && !isLoading) {
      setSelectedId(effectiveValue || '')
    }
  }, [effectiveValue, isLoading, selectedId])

  // Cache credential names in display names store (for backward compatibility)
  useEffect(() => {
    if (effectiveProviderId && credentials.length > 0) {
      const credentialMap = credentials.reduce((acc: Record<string, string>, cred: Credential) => {
        acc[cred.id] = cred.name
        return acc
      }, {})
      useDisplayNamesStore
        .getState()
        .setDisplayNames('credentials', effectiveProviderId, credentialMap)
    }
  }, [effectiveProviderId, credentials])

  // Clear invalid credential selection if it was disconnected
  useEffect(() => {
    // Don't attempt to clear while loading, in preview mode, or if no selection
    if (isLoading || isPreview || !selectedId) return

    // If credential still exists in our list, no action needed
    if (credentials.some((cred) => cred.id === selectedId)) return

    // If checking foreign credential and query is still pending, wait for it
    if (isForeignCredential && foreignMeta === undefined) return

    // At this point: credential doesn't exist AND foreign check is complete
    // Only clear if it's not a valid foreign credential
    if (hasForeignMeta) return

    // Prevent duplicate clearing operations
    const clearKey = `${effectiveProviderId}-${selectedId}`
    if (lastClearedRef.current === clearKey) return
    lastClearedRef.current = clearKey

    // Clear the selection and cache
    setStoreValue('')
    setSelectedId('')
    if (effectiveProviderId) {
      useDisplayNamesStore
        .getState()
        .removeDisplayName('credentials', effectiveProviderId, selectedId)
    }
  }, [
    credentials,
    selectedId,
    hasForeignMeta,
    foreignMeta,
    isForeignCredential,
    isLoading,
    isPreview,
    effectiveProviderId,
    setStoreValue,
  ])

  // Handle popover open to refetch fresh credentials
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      refetchCredentials()
    }
  }

  // Get the selected credential
  const selectedCredential = credentials.find((cred) => cred.id === selectedId)
  const isForeign = !!(selectedId && !selectedCredential && hasForeignMeta)

  // Determine if additional permissions are required for the selected credential
  const hasSelection = !!selectedCredential
  const missingRequiredScopes = hasSelection
    ? getMissingRequiredScopes(selectedCredential, requiredScopes || [])
    : []
  const needsUpdate =
    hasSelection && missingRequiredScopes.length > 0 && !disabled && !isPreview && !isLoading

  // Handle selection
  const handleSelect = (credentialId: string) => {
    setSelectedId(credentialId)
    if (!isPreview) {
      setStoreValue(credentialId)
    }
  }

  // Handle adding a new credential
  const handleAddCredential = useCallback(() => {
    // Show the OAuth modal
    setShowOAuthModal(true)
  }, [])

  // Get provider icon
  const getProviderIcon = (providerName: OAuthProvider) => {
    const { baseProvider } = parseProvider(providerName)
    const baseProviderConfig = OAUTH_PROVIDERS[baseProvider]

    if (!baseProviderConfig) {
      return <ExternalLink className='h-4 w-4' />
    }
    // Always use the base provider icon for a more consistent UI
    return baseProviderConfig.icon({ className: 'h-4 w-4' })
  }

  // Get provider name
  const getProviderName = (providerName: OAuthProvider) => {
    const { baseProvider } = parseProvider(providerName)
    const baseProviderConfig = OAUTH_PROVIDERS[baseProvider]

    if (baseProviderConfig) {
      return baseProviderConfig.name
    }

    // Fallback: capitalize the provider name
    return providerName
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  // Convert credentials to ComboboxOption format
  const options: ComboboxOption[] = useMemo(() => {
    return credentials.map((cred) => {
      const CredIcon = () => getProviderIcon(cred.provider)
      return {
        label: cred.name,
        value: cred.id,
        icon: CredIcon,
        disabled: false,
      }
    })
  }, [credentials])

  // Get display name from cache for foreign credentials
  const getDisplayNameFromCache = useCallback(
    (credentialId: string) => {
      if (!effectiveProviderId) return null
      const cache = useDisplayNamesStore.getState().cache
      const providerNames = cache.credentials?.[effectiveProviderId]
      return providerNames?.[credentialId] || null
    },
    [effectiveProviderId]
  )

  // Get provider icon component
  const ProviderIcon = useMemo(() => {
    return () => getProviderIcon(provider)
  }, [provider])

  // Render footer with "Connect account" button (only if no credentials exist)
  const renderFooter = useMemo(() => {
    // Only show the footer if there are no credentials
    if (credentials.length > 0) {
      return undefined
    }
    return (
      <Button variant='ghost' className='w-full justify-start gap-2' onClick={handleAddCredential}>
        {getProviderIcon(provider)}
        <span>Connect {getProviderName(provider)} account</span>
      </Button>
    )
  }, [provider, credentials.length, handleAddCredential])

  // Render empty state
  const renderEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <div className='flex items-center justify-center py-4'>
          <RefreshCw className='h-4 w-4 animate-spin' />
          <span className='ml-2'>Loading credentials...</span>
        </div>
      )
    }
    return (
      <div className='p-4 text-center'>
        <p className='font-medium text-sm'>No credentials found.</p>
        <p className='text-muted-foreground text-xs'>Connect a new account to continue.</p>
      </div>
    )
  }, [isLoading])

  return (
    <>
      <Combobox
        options={options}
        value={selectedId}
        onChange={handleSelect}
        placeholder={label}
        disabled={disabled}
        isLoading={isLoading}
        onOpenChange={handleOpenChange}
        getDisplayName={isForeign ? () => 'Saved by collaborator' : getDisplayNameFromCache}
        icon={ProviderIcon}
        renderFooter={renderFooter}
        renderEmpty={renderEmpty}
      />

      {needsUpdate && (
        <div className='mt-2 flex items-center justify-between rounded-[6px] border border-amber-300/40 bg-amber-50/60 px-2 py-1 font-medium text-[12px] transition-colors dark:bg-amber-950/10'>
          <span>Additional permissions required</span>
          {!isForeign && <Button onClick={() => setShowOAuthModal(true)}>Update access</Button>}
        </div>
      )}

      {showOAuthModal && (
        <OAuthRequiredModal
          isOpen={showOAuthModal}
          onClose={() => setShowOAuthModal(false)}
          provider={provider}
          toolName={getProviderName(provider)}
          requiredScopes={getCanonicalScopesForProvider(effectiveProviderId)}
          newScopes={missingRequiredScopes}
          serviceId={effectiveServiceId}
        />
      )}
    </>
  )
}
