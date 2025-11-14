'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { Combobox, type ComboboxOption } from '@/components/emcn/components/combobox/combobox'
import { GmailIcon, OutlookIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logs/console/logger'
import { type Credential, getProviderIdFromServiceId, getServiceIdFromScopes } from '@/lib/oauth'
import { cn } from '@/lib/utils'
import { OAuthRequiredModal } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel-new/components/editor/components/sub-block/components/credential-selector/components/oauth-required-modal'
import { useResourceList } from '@/hooks/queries/resources'
import { useDisplayNamesStore } from '@/stores/display-names/store'

const logger = createLogger('FolderSelector')

export interface FolderInfo {
  id: string
  name: string
  type: string
  messagesTotal?: number
  messagesUnread?: number
}

interface FolderSelectorProps {
  value: string
  onChange: (value: string, folderInfo?: FolderInfo) => void
  provider: string
  requiredScopes?: string[]
  label?: string
  disabled?: boolean
  serviceId?: string
  onFolderInfoChange?: (folderInfo: FolderInfo | null) => void
  isPreview?: boolean
  previewValue?: any | null
  credentialId?: string
  workflowId?: string
  isForeignCredential?: boolean
}

export function FolderSelector({
  value,
  onChange,
  provider,
  requiredScopes = [],
  label = 'Select folder',
  disabled = false,
  serviceId,
  onFolderInfoChange,
  isPreview = false,
  previewValue,
  credentialId,
  workflowId,
  isForeignCredential = false,
}: FolderSelectorProps) {
  const [open, setOpen] = useState(false)
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [selectedCredentialId, setSelectedCredentialId] = useState<Credential['id'] | ''>(
    credentialId || ''
  )
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [isLoadingSelectedFolder, setIsLoadingSelectedFolder] = useState(false)
  const [showOAuthModal, setShowOAuthModal] = useState(false)
  const initialFetchRef = useRef(false)

  // Initialize selectedFolderId with the effective value
  useEffect(() => {
    if (isPreview && previewValue !== undefined) {
      setSelectedFolderId(previewValue || '')
    } else {
      setSelectedFolderId(value)
    }
  }, [value, isPreview, previewValue])

  // Keep internal credential in sync with prop
  useEffect(() => {
    if (credentialId && credentialId !== selectedCredentialId) {
      setSelectedCredentialId(credentialId)
    }
  }, [credentialId, selectedCredentialId])

  // Determine the appropriate service ID based on provider and scopes
  const getServiceId = (): string => {
    if (serviceId) return serviceId
    return getServiceIdFromScopes(provider, requiredScopes)
  }

  // Determine the appropriate provider ID based on service and scopes
  const getProviderId = (): string => {
    const effectiveServiceId = getServiceId()
    return getProviderIdFromServiceId(effectiveServiceId)
  }

  // Determine endpoint based on provider
  const endpoint = provider === 'outlook' ? '/api/tools/outlook/folders' : '/api/tools/gmail/labels'

  // Fetch folders using the generic hook
  const {
    data: folders = [],
    isLoading,
    refetch,
  } = useResourceList<FolderInfo>({
    resourceType: provider === 'outlook' ? 'folders' : 'labels',
    credential: selectedCredentialId || undefined,
    endpoint,
    enabled:
      !disabled &&
      !!selectedCredentialId &&
      (provider === 'gmail' || provider === 'outlook') &&
      !isForeignCredential,
  })

  // Fetch available credentials for this provider
  const fetchCredentials = useCallback(async () => {
    try {
      const providerId = getProviderId()
      const response = await fetch(`/api/auth/oauth/credentials?provider=${providerId}`)

      if (response.ok) {
        const data = await response.json()
        setCredentials(data.credentials)

        // Auto-select logic for credentials
        if (data.credentials.length > 0) {
          // If we already have a selected credential ID, check if it's valid
          if (
            selectedCredentialId &&
            data.credentials.some((cred: Credential) => cred.id === selectedCredentialId)
          ) {
            // Keep the current selection
          } else {
            // Otherwise, select the default or first credential
            const defaultCred = data.credentials.find((cred: Credential) => cred.isDefault)
            if (defaultCred) {
              setSelectedCredentialId(defaultCred.id)
            } else if (data.credentials.length === 1) {
              setSelectedCredentialId(data.credentials[0].id)
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error fetching credentials:', { error })
    }
  }, [provider, getProviderId, selectedCredentialId])

  // Fetch a single folder by ID when we have a selectedFolderId but no metadata
  const fetchFolderById = useCallback(
    async (folderId: string) => {
      if (!selectedCredentialId || !folderId) return null

      setIsLoadingSelectedFolder(true)
      try {
        if (provider === 'outlook') {
          // Resolve Outlook folder name with owner-scoped token
          const tokenRes = await fetch('/api/auth/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credentialId: selectedCredentialId, workflowId }),
          })
          if (!tokenRes.ok) return null
          const { accessToken } = await tokenRes.json()
          if (!accessToken) return null
          const resp = await fetch(
            `https://graph.microsoft.com/v1.0/me/mailFolders/${encodeURIComponent(folderId)}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          )
          if (!resp.ok) return null
          const folder = await resp.json()
          const folderInfo: FolderInfo = {
            id: folder.id,
            name: folder.displayName,
            type: 'folder',
            messagesTotal: folder.totalItemCount,
            messagesUnread: folder.unreadItemCount,
          }
          onFolderInfoChange?.(folderInfo)
          return folderInfo
        }
        // Gmail label resolution
        const queryParams = new URLSearchParams({
          credentialId: selectedCredentialId,
          labelId: folderId,
        })
        const response = await fetch(`/api/tools/gmail/label?${queryParams.toString()}`)
        if (response.ok) {
          const data = await response.json()
          if (data.label) {
            onFolderInfoChange?.(data.label)
            return data.label
          }
        } else {
          logger.error('Error fetching folder by ID:', {
            error: await response.text(),
          })
        }
        return null
      } catch (error) {
        logger.error('Error fetching folder by ID:', { error })
        return null
      } finally {
        setIsLoadingSelectedFolder(false)
      }
    },
    [selectedCredentialId, onFolderInfoChange, provider, workflowId]
  )

  // Fetch credentials on initial mount
  useEffect(() => {
    if (disabled) return
    if (!initialFetchRef.current) {
      fetchCredentials()
      initialFetchRef.current = true
    }
  }, [fetchCredentials, disabled])

  // Cache folder names in display names store when data changes
  useEffect(() => {
    if (selectedCredentialId && folders.length > 0) {
      const folderMap = folders.reduce((acc: Record<string, string>, folder: FolderInfo) => {
        acc[folder.id] = folder.name
        return acc
      }, {})
      useDisplayNamesStore.getState().setDisplayNames('folders', selectedCredentialId, folderMap)
    }
  }, [selectedCredentialId, folders])

  // Get cached display name to check if we need eager fetching
  const cachedFolderName = useMemo(() => {
    const effectiveCredentialId = credentialId || selectedCredentialId
    if (!effectiveCredentialId || !selectedFolderId) return null
    return (
      useDisplayNamesStore.getState().cache.folders[effectiveCredentialId]?.[selectedFolderId] ||
      null
    )
  }, [credentialId, selectedCredentialId, selectedFolderId])

  // Eager caching: If we have a value but no cached name, fetch folders immediately
  // This fixes the bug where folder names show "-" on page refresh until user clicks the block
  useEffect(() => {
    if (
      selectedFolderId &&
      selectedCredentialId &&
      !cachedFolderName &&
      !isLoading &&
      !isForeignCredential
    ) {
      refetch()
    }
  }, [
    selectedFolderId,
    selectedCredentialId,
    cachedFolderName,
    isLoading,
    isForeignCredential,
    refetch,
  ])

  // Notify parent of selected folder info when folders list changes
  useEffect(() => {
    if (selectedFolderId && onFolderInfoChange && folders.length > 0) {
      const folderInfo = folders.find((folder: FolderInfo) => folder.id === selectedFolderId)
      if (folderInfo) {
        onFolderInfoChange(folderInfo)
      } else if (provider !== 'outlook') {
        // Only try to fetch by ID for Gmail
        fetchFolderById(selectedFolderId)
      }
    }
  }, [selectedFolderId, folders, onFolderInfoChange, provider, fetchFolderById])

  // Keep internal selectedFolderId in sync with the value prop
  useEffect(() => {
    if (disabled) return
    const currentValue = isPreview ? previewValue : value
    if (currentValue !== selectedFolderId) {
      setSelectedFolderId(currentValue || '')
    }
  }, [value, isPreview, previewValue, disabled, selectedFolderId])

  // Handle folder selection
  const handleSelectFolder = (folder: FolderInfo) => {
    setSelectedFolderId(folder.id)
    if (!isPreview) {
      onChange(folder.id, folder)
    }
    onFolderInfoChange?.(folder)
    setOpen(false)
  }

  // Handle adding a new credential
  const handleAddCredential = () => {
    // Show the OAuth modal
    setShowOAuthModal(true)
    setOpen(false)
  }

  const getProviderName = () => {
    if (provider === 'outlook') return 'Outlook'
    return 'Gmail'
  }

  const getFolderLabel = () => {
    if (provider === 'outlook') return 'folders'
    return 'labels'
  }

  // Convert folders to ComboboxOption format
  const folderOptions = useMemo(
    () =>
      folders.map(
        (folder: FolderInfo): ComboboxOption => ({
          label: folder.name,
          value: folder.id,
          icon: provider === 'gmail' ? GmailIcon : provider === 'outlook' ? OutlookIcon : undefined,
          metadata: folder,
        })
      ),
    [folders, provider]
  )

  // Get display name from cache
  const getDisplayName = useCallback(
    (folderId: string) => {
      const effectiveCredentialId = credentialId || selectedCredentialId
      if (!effectiveCredentialId || !folderId) return null
      return (
        useDisplayNamesStore.getState().cache.folders[effectiveCredentialId]?.[folderId] || null
      )
    },
    [credentialId, selectedCredentialId]
  )

  // Account switcher component
  const accountSwitcher = useMemo(() => {
    if (credentials.length === 0 || !selectedCredentialId) return null

    const selectedCred = credentials.find((cred) => cred.id === selectedCredentialId)

    return (
      <div className='flex items-center justify-between border-[var(--surface-11)] border-b px-3 py-2'>
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground text-xs'>{selectedCred?.name || 'Unknown'}</span>
        </div>
        {credentials.length > 1 && (
          <Button
            variant='ghost'
            size='sm'
            className='h-6 px-2 text-xs'
            onClick={(e) => {
              e.stopPropagation()
              // Show account selection
            }}
          >
            Switch
          </Button>
        )}
      </div>
    )
  }, [credentials, selectedCredentialId])

  // Empty state renderer
  const renderEmpty = useMemo(() => {
    if (credentials.length === 0) {
      return (
        <div className='p-4 text-center'>
          <p className='font-medium text-sm'>No accounts connected.</p>
          <p className='text-muted-foreground text-xs'>
            Connect a {getProviderName()} account to continue.
          </p>
          <Button
            variant='outline'
            size='sm'
            className='mt-2'
            onClick={(e) => {
              e.stopPropagation()
              handleAddCredential()
            }}
          >
            Connect {getProviderName()} account
          </Button>
        </div>
      )
    }

    return (
      <div className='p-4 text-center'>
        <p className='font-medium text-sm'>No {getFolderLabel()} found.</p>
        <p className='text-muted-foreground text-xs'>Try a different search or account.</p>
      </div>
    )
  }, [credentials.length, getFolderLabel, getProviderName, handleAddCredential])

  // Account selection section for multi-account scenario
  const renderAbove = useMemo(() => {
    if (credentials.length <= 1) return null

    return (
      <div className='border-[var(--surface-11)] border-b pb-2'>
        <div className='px-2 py-1.5 font-medium text-muted-foreground text-xs'>Switch Account</div>
        {credentials.map((cred) => (
          <div
            key={cred.id}
            className={cn(
              'flex cursor-pointer items-center justify-between rounded-[4px] px-[8px] py-[6px] font-medium font-sans text-sm hover:bg-[var(--surface-11)]',
              cred.id === selectedCredentialId && 'bg-[var(--surface-9)]'
            )}
            onClick={() => setSelectedCredentialId(cred.id)}
          >
            <span className='font-normal'>{cred.name}</span>
            {cred.id === selectedCredentialId && <Check className='ml-auto h-4 w-4' />}
          </div>
        ))}
      </div>
    )
  }, [credentials, selectedCredentialId])

  // Handler for combobox change
  const handleComboboxChange = useCallback(
    (folderId: string, metadata?: any) => {
      const folderInfo = metadata as FolderInfo | undefined
      handleSelectFolder(folderInfo || { id: folderId, name: folderId, type: 'folder' })
    },
    [handleSelectFolder]
  )

  return (
    <>
      <div className='space-y-2'>
        <Combobox
          options={folderOptions}
          value={selectedFolderId}
          onChange={handleComboboxChange}
          placeholder={label}
          disabled={disabled || isForeignCredential}
          searchable={false}
          isLoading={isLoading || isLoadingSelectedFolder}
          getDisplayName={getDisplayName}
          icon={provider === 'gmail' ? GmailIcon : provider === 'outlook' ? OutlookIcon : undefined}
          accountSwitcher={accountSwitcher}
          renderAbove={renderAbove}
          renderEmpty={renderEmpty}
          onOpenChange={setOpen}
        />
      </div>

      {showOAuthModal && (
        <OAuthRequiredModal
          isOpen={showOAuthModal}
          onClose={() => setShowOAuthModal(false)}
          provider={provider}
          toolName={getProviderName()}
          requiredScopes={requiredScopes}
          serviceId={getServiceId()}
        />
      )}
    </>
  )
}
