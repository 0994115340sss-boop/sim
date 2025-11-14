'use client'

import { type ComponentType, useCallback, useEffect, useRef, useState } from 'react'
import { Check, ExternalLink, X } from 'lucide-react'
import { Combobox, type ComboboxOption } from '@/components/emcn'
import { ConfluenceIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logs/console/logger'
import {
  type Credential,
  getProviderIdFromServiceId,
  getServiceIdFromScopes,
  type OAuthProvider,
} from '@/lib/oauth'
import { OAuthRequiredModal } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel-new/components/editor/components/sub-block/components/credential-selector/components/oauth-required-modal'
import { useDisplayNamesStore } from '@/stores/display-names/store'

const logger = createLogger('ConfluenceFileSelector')

export interface ConfluenceFileInfo {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
  modifiedTime?: string
  spaceId?: string
  url?: string
}

interface ConfluenceFileSelectorProps {
  value: string
  onChange: (value: string, fileInfo?: ConfluenceFileInfo) => void
  provider: OAuthProvider
  requiredScopes?: string[]
  label?: string
  disabled?: boolean
  serviceId?: string
  domain: string
  showPreview?: boolean
  onFileInfoChange?: (fileInfo: ConfluenceFileInfo | null) => void
  credentialId?: string
  workflowId?: string
  isForeignCredential?: boolean
}

export function ConfluenceFileSelector({
  value,
  onChange,
  provider,
  requiredScopes = [],
  label = 'Select Confluence page',
  disabled = false,
  serviceId,
  domain,
  showPreview = true,
  onFileInfoChange,
  credentialId,
  workflowId,
  isForeignCredential = false,
}: ConfluenceFileSelectorProps) {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [files, setFiles] = useState<ConfluenceFileInfo[]>([])
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>(credentialId || '')
  const [selectedFileId, setSelectedFileId] = useState(value)
  const [selectedFile, setSelectedFile] = useState<ConfluenceFileInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showOAuthModal, setShowOAuthModal] = useState(false)
  const initialFetchRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  // Get cached display name
  const cachedFileName = useDisplayNamesStore(
    useCallback(
      (state) => {
        const effectiveCredentialId = credentialId || selectedCredentialId
        if (!effectiveCredentialId || !value) return null
        return state.cache.files[effectiveCredentialId]?.[value] || null
      },
      [credentialId, selectedCredentialId, value]
    )
  )
  // Keep internal credential in sync with prop (handles late arrival and BFCache restores)
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

  // Fetch available credentials for this provider
  const fetchCredentials = useCallback(async () => {
    setIsLoading(true)
    try {
      const providerId = getProviderId()
      const response = await fetch(`/api/auth/oauth/credentials?provider=${providerId}`)

      if (response.ok) {
        const data = await response.json()
        setCredentials(data.credentials)
      }
    } catch (error) {
      logger.error('Error fetching credentials:', error)
    } finally {
      setIsLoading(false)
    }
  }, [provider, getProviderId, selectedCredentialId])

  // Fetch page info when we have a selected file ID
  const fetchPageInfo = useCallback(
    async (pageId: string) => {
      if (!selectedCredentialId || !domain) return

      // Validate domain format
      const trimmedDomain = domain.trim().toLowerCase()
      if (!trimmedDomain.includes('.')) {
        setError(
          'Invalid domain format. Please provide the full domain (e.g., your-site.atlassian.net)'
        )
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Get the access token from the selected credential
        const tokenResponse = await fetch('/api/auth/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credentialId: selectedCredentialId,
            workflowId,
          }),
        })

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json()
          throw new Error(errorData.error || 'Failed to get access token')
        }

        const tokenData = await tokenResponse.json()
        const accessToken = tokenData.accessToken

        // Use the access token to fetch the page info
        const response = await fetch('/api/tools/confluence/page', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            domain,
            accessToken,
            pageId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch page info')
        }

        const data = await response.json()
        const fileInfo: ConfluenceFileInfo = {
          id: data.id || pageId,
          name: data.title || `Page ${pageId}`,
          mimeType: 'confluence/page',
          webViewLink: `https://${domain}/wiki/pages/${data.id}`,
          modifiedTime: data.version?.when,
          spaceId: data.spaceId,
          url: `https://${domain}/wiki/pages/${data.id}`,
        }
        setSelectedFile(fileInfo)
        onFileInfoChange?.(fileInfo)

        // Cache the page name in display names store
        if (selectedCredentialId) {
          useDisplayNamesStore
            .getState()
            .setDisplayNames('files', selectedCredentialId, { [fileInfo.id]: fileInfo.name })
        }
      } catch (error) {
        logger.error('Error fetching page info:', error)
        setError((error as Error).message)
      } finally {
        setIsLoading(false)
      }
    },
    [selectedCredentialId, domain, onFileInfoChange, workflowId]
  )

  // Fetch pages from Confluence
  const fetchFiles = useCallback(
    async (searchQuery?: string) => {
      if (!selectedCredentialId || !domain) return
      if (isForeignCredential) return

      // Validate domain format
      const trimmedDomain = domain.trim().toLowerCase()
      if (!trimmedDomain.includes('.')) {
        setError(
          'Invalid domain format. Please provide the full domain (e.g., your-site.atlassian.net)'
        )
        setFiles([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Get the access token from the selected credential
        const tokenResponse = await fetch('/api/auth/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credentialId: selectedCredentialId,
            workflowId,
          }),
        })

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json()
          logger.error('Access token error:', errorData)

          // If there's a token error, we might need to reconnect the account
          setError('Authentication failed. Please reconnect your Confluence account.')
          setIsLoading(false)
          return
        }

        const tokenData = await tokenResponse.json()
        const accessToken = tokenData.accessToken

        if (!accessToken) {
          logger.error('No access token returned')
          setError('Authentication failed. Please reconnect your Confluence account.')
          setIsLoading(false)
          return
        }

        // Simply fetch pages directly using the endpoint
        const response = await fetch('/api/tools/confluence/pages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            domain,
            accessToken,
            title: searchQuery || undefined,
            limit: 50,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          if (response.status === 401 || response.status === 403) {
            logger.info('Confluence pages fetch unauthorized (expected for collaborator)')
            setFiles([])
            setIsLoading(false)
            return
          }
          logger.error('Confluence API error:', errorData)
          throw new Error(errorData.error || 'Failed to fetch pages')
        }

        const data = await response.json()
        logger.info(`Received ${data.files?.length || 0} files from API`)
        setFiles(data.files || [])

        // Cache file names in display names store
        if (selectedCredentialId && data.files) {
          const fileMap = data.files.reduce(
            (acc: Record<string, string>, file: ConfluenceFileInfo) => {
              acc[file.id] = file.name
              return acc
            },
            {}
          )
          useDisplayNamesStore.getState().setDisplayNames('files', selectedCredentialId, fileMap)
        }

        // If we have a selected file ID, update state and notify parent
        if (selectedFileId) {
          const fileInfo = data.files.find((file: ConfluenceFileInfo) => file.id === selectedFileId)
          if (fileInfo) {
            setSelectedFile(fileInfo)
            onFileInfoChange?.(fileInfo)
          } else if (!searchQuery && selectedFileId) {
            // If we can't find the file in the list, try to fetch it directly
            fetchPageInfo(selectedFileId)
          }
        }
      } catch (error) {
        logger.error('Error fetching pages:', error)
        setError((error as Error).message)
        setFiles([])
      } finally {
        setIsLoading(false)
      }
    },
    [
      selectedCredentialId,
      domain,
      selectedFileId,
      onFileInfoChange,
      fetchPageInfo,
      workflowId,
      isForeignCredential,
    ]
  )

  // Fetch credentials on initial mount
  useEffect(() => {
    if (!initialFetchRef.current) {
      fetchCredentials()
      initialFetchRef.current = true
    }
  }, [fetchCredentials])

  // Fetch files when dropdown is opened
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      // Only fetch files when opening the dropdown and if we have valid credentials and domain
      if (
        isOpen &&
        !isForeignCredential &&
        selectedCredentialId &&
        domain &&
        domain.includes('.')
      ) {
        fetchFiles()
      }
    },
    [isForeignCredential, selectedCredentialId, domain, fetchFiles]
  )

  // Keep internal selectedFileId in sync with the value prop
  useEffect(() => {
    if (value !== selectedFileId) {
      setSelectedFileId(value)
    }
  }, [value])

  // Clear callback when value is cleared
  useEffect(() => {
    if (!value) {
      setSelectedFile(null)
      onFileInfoChange?.(null)
    }
  }, [value, onFileInfoChange])

  // Fetch page info on mount if we have a value but no selectedFile state
  useEffect(() => {
    if (value && selectedCredentialId && domain && !selectedFile) {
      fetchPageInfo(value)
    }
  }, [value, selectedCredentialId, domain, selectedFile, fetchPageInfo])

  // Handle file selection
  const handleSelectFile = (selectedValue: string, metadata?: any) => {
    const file = metadata as ConfluenceFileInfo | undefined
    if (file) {
      setSelectedFileId(file.id)
      setSelectedFile(file)
      onChange(file.id, file)
      onFileInfoChange?.(file)
    }
  }

  // Handle adding a new credential
  const handleAddCredential = () => {
    // Show the OAuth modal
    setShowOAuthModal(true)
  }

  // Handle search with server-side debouncing
  const handleSearch = useCallback(
    (query: string) => {
      if (query.length > 2) {
        fetchFiles(query)
      } else if (query.length === 0) {
        fetchFiles()
      }
    },
    [selectedCredentialId, domain, workflowId, isForeignCredential]
  )

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedFileId('')
    setSelectedFile(null)
    onChange('', undefined)
    onFileInfoChange?.(null)
  }, [onChange, onFileInfoChange])

  // Get display name from cache
  const getDisplayName = useCallback(
    (pageId: string) => {
      if (!selectedCredentialId) return null
      return useDisplayNamesStore.getState().cache.files[selectedCredentialId]?.[pageId] || null
    },
    [selectedCredentialId]
  )

  // Render account switcher
  const renderAccountSwitcher = () => {
    if (credentials.length <= 1) return null

    return (
      <div className='border-[var(--surface-11)] border-b pb-1'>
        <div className='mb-1 px-2 font-medium text-[var(--text-muted)] text-xs'>Switch Account</div>
        {credentials.map((cred) => (
          <div
            key={cred.id}
            className='flex cursor-pointer items-center justify-between rounded px-2 py-1 hover:bg-[var(--surface-11)]'
            onClick={() => setSelectedCredentialId(cred.id)}
          >
            <div className='flex items-center gap-2'>
              <ConfluenceIcon className='h-4 w-4' />
              <span className='text-sm'>{cred.name}</span>
            </div>
            {cred.id === selectedCredentialId && (
              <svg
                width='16'
                height='16'
                viewBox='0 0 16 16'
                fill='none'
                className='text-[var(--text-primary)]'
              >
                <path
                  d='M13.5 4.5L6 12L2.5 8.5'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Convert files to ComboboxOption format
  const fileOptions: ComboboxOption[] = files.map((file) => ({
    label: file.name,
    value: file.id,
    icon: ConfluenceIcon as ComponentType<{ className?: string }>,
    metadata: file,
  }))

  // Custom render for options
  const renderOption = useCallback(
    (option: ComboboxOption) => {
      return (
        <>
          <ConfluenceIcon className='mr-[8px] h-4 w-4 flex-shrink-0 opacity-60' />
          <span className='flex-1 truncate text-[var(--text-primary)]'>{option.label}</span>
          {option.value === selectedFileId && <Check className='ml-[8px] h-4 w-4 flex-shrink-0' />}
        </>
      )
    },
    [selectedFileId]
  )

  // Error/empty message
  const emptyMessage = !selectedCredentialId
    ? 'Please select a Confluence account.'
    : !domain || !domain.includes('.')
      ? 'Please provide a valid domain.'
      : credentials.length === 0
        ? 'No accounts connected. Connect a Confluence account to continue.'
        : error
          ? error
          : 'No pages found. Try a different search or account.'

  return (
    <>
      <div className='space-y-2'>
        <Combobox
          options={fileOptions}
          value={selectedFileId}
          onChange={handleSelectFile}
          placeholder={label}
          disabled={disabled || !domain || isForeignCredential}
          editable={true}
          isLoading={isLoading}
          error={error}
          getDisplayName={getDisplayName}
          renderOption={renderOption}
          onOpenChange={handleOpenChange}
          onSearch={handleSearch}
          accountSwitcher={renderAccountSwitcher()}
          emptyMessage={emptyMessage}
          allowClear={!!selectedFileId}
          onClear={handleClearSelection}
          className={isForeignCredential ? 'cursor-help' : undefined}
        />

        {showPreview && selectedFile && selectedFileId && selectedFile.id === selectedFileId && (
          <div className='relative mt-2 rounded-md border border-muted bg-muted/10 p-2'>
            <div className='absolute top-2 right-2'>
              <Button
                variant='ghost'
                size='icon'
                className='h-5 w-5 hover:bg-muted'
                onClick={handleClearSelection}
              >
                <X className='h-3 w-3' />
              </Button>
            </div>
            <div className='flex items-center gap-3 pr-4'>
              <div className='flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-muted/20'>
                <ConfluenceIcon className='h-4 w-4' />
              </div>
              <div className='min-w-0 flex-1 overflow-hidden'>
                <div className='flex items-center gap-2'>
                  <h4 className='truncate font-medium text-xs'>{selectedFile.name}</h4>
                  {selectedFile.modifiedTime && (
                    <span className='whitespace-nowrap text-muted-foreground text-xs'>
                      {new Date(selectedFile.modifiedTime).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {selectedFile.webViewLink ? (
                  <a
                    href={selectedFile.webViewLink}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-1 text-foreground text-xs hover:underline'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Open in Confluence</span>
                    <ExternalLink className='h-3 w-3' />
                  </a>
                ) : (
                  selectedFile.url && (
                    <a
                      href={selectedFile.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center gap-1 text-foreground text-xs hover:underline'
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>Open in Confluence</span>
                      <ExternalLink className='h-3 w-3' />
                    </a>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showOAuthModal && (
        <OAuthRequiredModal
          isOpen={showOAuthModal}
          onClose={() => setShowOAuthModal(false)}
          provider={provider}
          toolName='Confluence'
          requiredScopes={requiredScopes}
          serviceId={getServiceId()}
        />
      )}
    </>
  )
}
