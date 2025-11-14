import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ExternalLink, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/emcn/components/button/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  type Credential,
  getCanonicalScopesForProvider,
  getProviderIdFromServiceId,
  OAUTH_PROVIDERS,
  type OAuthProvider,
  type OAuthService,
  parseProvider,
} from '@/lib/oauth'
import { OAuthRequiredModal } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel-new/components/editor/components/sub-block/components/credential-selector/components/oauth-required-modal'
import { useCredentials, useForeignCredentialMeta } from '@/hooks/queries/credentials'
import { getMissingRequiredScopes } from '@/hooks/use-oauth-scope-status'
import { useDisplayNamesStore } from '@/stores/display-names/store'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'

const getProviderIcon = (providerName: OAuthProvider) => {
  const { baseProvider } = parseProvider(providerName)
  const baseProviderConfig = OAUTH_PROVIDERS[baseProvider]

  if (!baseProviderConfig) {
    return <ExternalLink className='h-4 w-4' />
  }
  return baseProviderConfig.icon({ className: 'h-4 w-4' })
}

const getProviderName = (providerName: OAuthProvider) => {
  const { baseProvider } = parseProvider(providerName)
  const baseProviderConfig = OAUTH_PROVIDERS[baseProvider]

  if (baseProviderConfig) {
    return baseProviderConfig.name
  }

  return providerName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

interface ToolCredentialSelectorProps {
  value: string
  onChange: (value: string) => void
  provider: OAuthProvider
  requiredScopes?: string[]
  label?: string
  serviceId?: OAuthService
  disabled?: boolean
}

export function ToolCredentialSelector({
  value,
  onChange,
  provider,
  requiredScopes = [],
  label = 'Select account',
  serviceId,
  disabled = false,
}: ToolCredentialSelectorProps) {
  const [open, setOpen] = useState(false)
  const [showOAuthModal, setShowOAuthModal] = useState(false)
  const [selectedId, setSelectedId] = useState(value)
  const { activeWorkflowId } = useWorkflowRegistry()

  // Ref to track the last cleared credential to prevent duplicate clearing
  const lastClearedRef = useRef<string>('')

  // Sync selectedId with value prop changes
  useEffect(() => {
    setSelectedId(value)
  }, [value])

  // Fetch credentials using React Query
  const {
    data: credentials = [],
    isLoading,
    refetch: refetchCredentials,
  } = useCredentials(provider)

  // Check if selected credential is foreign (owned by collaborator)
  const isForeignCredential = !!selectedId && !credentials.some((cred) => cred.id === selectedId)

  // Fetch foreign credential metadata if needed
  const { data: foreignMeta } = useForeignCredentialMeta(
    selectedId,
    activeWorkflowId || undefined,
    isForeignCredential
  )

  // Merge foreign credential with the credentials list
  const allCredentials = useMemo(() => {
    if (!foreignMeta) return credentials
    const credentialExists = credentials.some((cred) => cred.id === foreignMeta.id)
    if (credentialExists) return credentials
    return [foreignMeta, ...credentials]
  }, [credentials, foreignMeta])

  // Cache credential names in display names store
  useMemo(() => {
    if (provider && allCredentials.length > 0) {
      const credentialMap = allCredentials.reduce(
        (acc: Record<string, string>, cred: Credential) => {
          acc[cred.id] = cred.name
          return acc
        },
        {}
      )
      useDisplayNamesStore.getState().setDisplayNames('credentials', provider, credentialMap)
    }
  }, [provider, allCredentials])

  // Listen for credential disconnection events and refetch immediately
  useEffect(() => {
    const handleCredentialDisconnected = (event: Event) => {
      const customEvent = event as CustomEvent
      const { providerId } = customEvent.detail || {}

      // Check if this disconnection affects our provider
      if (providerId && (providerId === provider || providerId.startsWith(provider))) {
        // Force refetch immediately to get updated credentials list
        refetchCredentials()
      }
    }

    window.addEventListener('credential-disconnected', handleCredentialDisconnected)
    return () => window.removeEventListener('credential-disconnected', handleCredentialDisconnected)
  }, [provider, refetchCredentials])

  // Clear invalid credential selection if it was disconnected
  useEffect(() => {
    // Don't attempt to clear while loading or if no selection
    if (isLoading || !selectedId) return

    // If credential still exists in our list, no action needed
    if (allCredentials.some((cred) => cred.id === selectedId)) return

    // If checking foreign credential and query is still pending, wait for it
    if (isForeignCredential && foreignMeta === undefined) return

    // At this point: credential doesn't exist AND foreign check is complete
    // Only clear if it's not a valid foreign credential
    if (foreignMeta) return

    // Prevent duplicate clearing operations
    const clearKey = `${provider}-${selectedId}`
    if (lastClearedRef.current === clearKey) return
    lastClearedRef.current = clearKey

    // Clear the selection and cache
    setSelectedId('')
    onChange('')
    if (provider) {
      useDisplayNamesStore.getState().removeDisplayName('credentials', provider, selectedId)
    }
  }, [allCredentials, selectedId, foreignMeta, isForeignCredential, isLoading, provider, onChange])

  const handleSelect = (credentialId: string) => {
    setSelectedId(credentialId)
    onChange(credentialId)
    setOpen(false)
  }

  const handleOAuthClose = useCallback(() => {
    setShowOAuthModal(false)
    refetchCredentials()
  }, [refetchCredentials])

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      refetchCredentials()
    }
  }

  const selectedCredential = allCredentials.find((cred) => cred.id === selectedId)
  const isForeign = !!(selectedId && !selectedCredential)

  // Determine if additional permissions are required for the selected credential
  const hasSelection = !!selectedCredential
  const missingRequiredScopes = hasSelection
    ? getMissingRequiredScopes(selectedCredential, requiredScopes || [])
    : []
  const needsUpdate = hasSelection && missingRequiredScopes.length > 0 && !disabled && !isLoading

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className='h-10 w-full min-w-0 justify-between'
            disabled={disabled}
          >
            <div className='flex min-w-0 items-center gap-2 overflow-hidden'>
              {getProviderIcon(provider)}
              <span
                className={
                  selectedCredential ? 'truncate font-normal' : 'truncate text-muted-foreground'
                }
              >
                {selectedCredential
                  ? selectedCredential.name
                  : isForeign
                    ? 'Saved by collaborator'
                    : label}
              </span>
            </div>
            <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[300px] p-0' align='start'>
          <Command>
            <CommandList>
              <CommandEmpty>
                {isLoading ? (
                  <div className='flex items-center justify-center p-4'>
                    <RefreshCw className='h-4 w-4 animate-spin' />
                    <span className='ml-2'>Loading...</span>
                  </div>
                ) : allCredentials.length === 0 ? (
                  <div className='p-4 text-center'>
                    <p className='font-medium text-sm'>No accounts connected.</p>
                    <p className='text-muted-foreground text-xs'>
                      Connect a {getProviderName(provider)} account to continue.
                    </p>
                  </div>
                ) : (
                  <div className='p-4 text-center'>
                    <p className='font-medium text-sm'>No accounts found.</p>
                  </div>
                )}
              </CommandEmpty>

              {allCredentials.length > 0 && (
                <CommandGroup>
                  {allCredentials.map((credential) => (
                    <CommandItem
                      key={credential.id}
                      value={credential.id}
                      onSelect={() => handleSelect(credential.id)}
                    >
                      <div className='flex items-center gap-2'>
                        {getProviderIcon(credential.provider)}
                        <span className='font-normal'>{credential.name}</span>
                      </div>
                      {credential.id === selectedId && <Check className='ml-auto h-4 w-4' />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandGroup>
                <CommandItem onSelect={() => setShowOAuthModal(true)}>
                  <div className='flex items-center gap-2'>
                    <Plus className='h-4 w-4' />
                    <span className='font-normal'>Connect {getProviderName(provider)} account</span>
                  </div>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {needsUpdate && (
        <div className='mt-2 flex items-center justify-between rounded-[6px] border border-amber-300/40 bg-amber-50/60 px-2 py-1 font-medium text-[12px] transition-colors dark:bg-amber-950/10'>
          <span>Additional permissions required</span>
          {/* We don't have reliable foreign detection context here; always show CTA */}
          <Button onClick={() => setShowOAuthModal(true)}>Update access</Button>
        </div>
      )}

      <OAuthRequiredModal
        isOpen={showOAuthModal}
        onClose={handleOAuthClose}
        provider={provider}
        toolName={label}
        requiredScopes={getCanonicalScopesForProvider(
          serviceId ? getProviderIdFromServiceId(serviceId) : (provider as string)
        )}
        newScopes={missingRequiredScopes}
        serviceId={serviceId}
      />
    </>
  )
}
