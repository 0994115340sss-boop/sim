'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/emcn/components/button/button'
import { Combobox, type ComboboxOption } from '@/components/emcn/components/combobox/combobox'
import { WealthboxIcon } from '@/components/icons'
import { createLogger } from '@/lib/logs/console/logger'
import {
  type Credential,
  getProviderIdFromServiceId,
  getServiceIdFromScopes,
  type OAuthProvider,
} from '@/lib/oauth'
import { OAuthRequiredModal } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel-new/components/editor/components/sub-block/components/credential-selector/components/oauth-required-modal'
import { useDisplayNamesStore } from '@/stores/display-names/store'

const logger = createLogger('WealthboxFileSelector')

export interface WealthboxItemInfo {
  id: string
  name: string
  type: 'contact'
  content?: string
  createdAt?: string
  updatedAt?: string
}

interface WealthboxFileSelectorProps {
  value: string
  onChange: (value: string, itemInfo?: WealthboxItemInfo) => void
  provider: OAuthProvider
  requiredScopes?: string[]
  label?: string
  disabled?: boolean
  serviceId?: string
  showPreview?: boolean
  onFileInfoChange?: (itemInfo: WealthboxItemInfo | null) => void
  itemType?: 'contact'
  credentialId?: string
}

export function WealthboxFileSelector({
  value,
  onChange,
  provider,
  requiredScopes = [],
  label = 'Select item',
  disabled = false,
  serviceId,
  showPreview = true,
  onFileInfoChange,
  itemType = 'contact',
  credentialId,
}: WealthboxFileSelectorProps) {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>(credentialId || '')
  const [selectedItemId, setSelectedItemId] = useState(value)
  const [selectedItem, setSelectedItem] = useState<WealthboxItemInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSelectedItem, setIsLoadingSelectedItem] = useState(false)
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [availableItems, setAvailableItems] = useState<WealthboxItemInfo[]>([])
  const [showOAuthModal, setShowOAuthModal] = useState(false)
  const [credentialsLoaded, setCredentialsLoaded] = useState(false)
  const initialFetchRef = useRef(false)

  // Get cached display name
  const cachedItemName = useDisplayNamesStore(
    useCallback(
      (state) => {
        const effectiveCredentialId = credentialId || selectedCredentialId
        if (!effectiveCredentialId || !value) return null
        return state.cache.files[effectiveCredentialId]?.[value] || null
      },
      [credentialId, selectedCredentialId, value]
    )
  )

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
    setCredentialsLoaded(false)
    try {
      const providerId = getProviderId()
      const response = await fetch(`/api/auth/oauth/credentials?provider=${providerId}`)

      if (response.ok) {
        const data = await response.json()
        setCredentials(data.credentials)
      }
    } catch (error) {
      logger.error('Error fetching credentials:', { error })
    } finally {
      setIsLoading(false)
      setCredentialsLoaded(true)
    }
  }, [provider, getProviderId, selectedCredentialId])

  // Keep local credential state in sync with persisted credential
  useEffect(() => {
    if (credentialId && credentialId !== selectedCredentialId) {
      setSelectedCredentialId(credentialId)
    }
  }, [credentialId, selectedCredentialId])

  // Fetch available items for the selected credential
  const fetchAvailableItems = useCallback(
    async (searchQuery?: string) => {
      if (!selectedCredentialId) return

      setIsLoadingItems(true)
      try {
        const queryParams = new URLSearchParams({
          credentialId: selectedCredentialId,
          type: itemType,
        })

        if (searchQuery?.trim()) {
          queryParams.append('query', searchQuery.trim())
        }

        const response = await fetch(`/api/auth/oauth/wealthbox/items?${queryParams.toString()}`)

        if (response.ok) {
          const data = await response.json()
          setAvailableItems(data.items || [])

          // Cache item names in display names store
          if (selectedCredentialId && data.items) {
            const itemMap = data.items.reduce(
              (acc: Record<string, string>, item: WealthboxItemInfo) => {
                acc[item.id] = item.name
                return acc
              },
              {}
            )
            useDisplayNamesStore.getState().setDisplayNames('files', selectedCredentialId, itemMap)
          }
        } else {
          logger.error('Error fetching available items:', {
            error: await response.text(),
          })
          setAvailableItems([])
        }
      } catch (error) {
        logger.error('Error fetching available items:', { error })
        setAvailableItems([])
      } finally {
        setIsLoadingItems(false)
      }
    },
    [selectedCredentialId, itemType]
  )

  // Fetch a single item by ID
  const fetchItemById = useCallback(
    async (itemId: string) => {
      if (!selectedCredentialId || !itemId) return null

      setIsLoadingSelectedItem(true)
      try {
        const queryParams = new URLSearchParams({
          credentialId: selectedCredentialId,
          itemId: itemId,
          type: itemType,
        })

        const response = await fetch(`/api/auth/oauth/wealthbox/item?${queryParams.toString()}`)

        if (response.ok) {
          const data = await response.json()
          if (data.item) {
            setSelectedItem(data.item)
            onFileInfoChange?.(data.item)

            // Cache the item name in display names store
            if (selectedCredentialId) {
              useDisplayNamesStore
                .getState()
                .setDisplayNames('files', selectedCredentialId, { [data.item.id]: data.item.name })
            }

            return data.item
          }
        } else {
          const errorText = await response.text()
          logger.error('Error fetching item by ID:', { error: errorText })

          if (response.status === 404 || response.status === 403) {
            logger.info('Item not accessible, clearing selection')
            setSelectedItemId('')
            onChange('')
            onFileInfoChange?.(null)
          }
        }
        return null
      } catch (error) {
        logger.error('Error fetching item by ID:', { error })
        return null
      } finally {
        setIsLoadingSelectedItem(false)
      }
    },
    [selectedCredentialId, itemType, onFileInfoChange, onChange]
  )

  // Fetch credentials on initial mount
  useEffect(() => {
    if (!initialFetchRef.current) {
      fetchCredentials()
      initialFetchRef.current = true
    }
  }, [fetchCredentials])

  // Handle open change to fetch items when dropdown is opened
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen && selectedCredentialId) {
        fetchAvailableItems()
      }
    },
    [selectedCredentialId, fetchAvailableItems]
  )

  // Fetch item info on mount if we have a value but no selectedItem state
  useEffect(() => {
    if (value && selectedCredentialId && !selectedItem) {
      fetchItemById(value)
    }
  }, [value, selectedCredentialId, selectedItem, fetchItemById])

  // Clear selectedItem when value is cleared
  useEffect(() => {
    if (!value) {
      setSelectedItem(null)
      onFileInfoChange?.(null)
    }
  }, [value, onFileInfoChange])

  // Handle search input changes with debouncing built into Combobox
  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (searchQuery.length > 0) {
        fetchAvailableItems(searchQuery)
      } else {
        fetchAvailableItems()
      }
    },
    [fetchAvailableItems]
  )

  // Handle selecting an item from the combobox
  const handleSelect = useCallback(
    (itemId: string) => {
      const item = availableItems.find((i) => i.id === itemId)
      if (item) {
        setSelectedItemId(item.id)
        setSelectedItem(item)
        onChange(item.id, item)
        onFileInfoChange?.(item)
      }
    },
    [availableItems, onChange, onFileInfoChange]
  )

  // Handle adding a new credential
  const handleAddCredential = useCallback(() => {
    setShowOAuthModal(true)
  }, [])

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedItemId('')
    onChange('', undefined)
    onFileInfoChange?.(null)
  }, [onChange, onFileInfoChange])

  // Get display name from cache
  const getDisplayName = useCallback(
    (itemId: string) => {
      if (!selectedCredentialId) return null
      return useDisplayNamesStore.getState().cache.files[selectedCredentialId]?.[itemId] || null
    },
    [selectedCredentialId]
  )

  // Convert items to ComboboxOption format
  const itemOptions: ComboboxOption[] = useMemo(() => {
    return availableItems.map((item) => ({
      label: item.name,
      value: item.id,
      icon: WealthboxIcon,
      metadata: item,
    }))
  }, [availableItems])

  // Render account switcher for multiple credentials
  const renderAccountSwitcher = useMemo(() => {
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
              <WealthboxIcon className='h-4 w-4' />
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
  }, [credentials, selectedCredentialId])

  // Render footer with "Connect account" button
  const renderFooter = useMemo(() => {
    if (credentials.length > 0) return null

    return (
      <Button variant='ghost' className='w-full justify-start gap-2' onClick={handleAddCredential}>
        <WealthboxIcon className='h-4 w-4' />
        <span>Connect Wealthbox account</span>
      </Button>
    )
  }, [credentials.length, handleAddCredential])

  // Render empty state
  const renderEmpty = useMemo(() => {
    if (isLoadingItems) {
      return (
        <div className='flex items-center justify-center py-4'>
          <span className='ml-2'>Loading {itemType}s...</span>
        </div>
      )
    }
    if (credentials.length === 0) {
      return (
        <div className='p-4 text-center'>
          <p className='font-medium text-sm'>No accounts connected.</p>
          <p className='text-muted-foreground text-xs'>Connect a Wealthbox account to continue.</p>
        </div>
      )
    }
    return (
      <div className='p-4 text-center'>
        <p className='font-medium text-sm'>No {itemType}s found.</p>
        <p className='text-muted-foreground text-xs'>Try a different search or account.</p>
      </div>
    )
  }, [isLoadingItems, credentials.length, itemType])

  // Render option with custom styling
  const renderOption = useCallback((option: ComboboxOption) => {
    const item = option.metadata as WealthboxItemInfo
    return (
      <div className='flex items-center gap-2 overflow-hidden'>
        <WealthboxIcon className='h-4 w-4' />
        <div className='min-w-0 flex-1'>
          <span className='truncate font-normal'>{item.name}</span>
          {item.updatedAt && (
            <div className='text-muted-foreground text-xs'>
              Updated {new Date(item.updatedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    )
  }, [])

  return (
    <>
      <div className='space-y-2'>
        <Combobox
          options={itemOptions}
          value={selectedItemId}
          onChange={handleSelect}
          placeholder={label}
          disabled={disabled}
          editable={true}
          isLoading={isLoadingItems}
          onOpenChange={handleOpenChange}
          onSearch={handleSearch}
          getDisplayName={getDisplayName}
          accountSwitcher={renderAccountSwitcher}
          renderFooter={renderFooter}
          renderEmpty={renderEmpty}
          renderOption={renderOption}
        />

        {showPreview && selectedItem && (
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
                <WealthboxIcon className='h-4 w-4' />
              </div>
              <div className='min-w-0 flex-1 overflow-hidden'>
                <div className='flex items-center gap-2'>
                  <h4 className='truncate font-medium text-xs'>{selectedItem.name}</h4>
                  {selectedItem.updatedAt && (
                    <span className='whitespace-nowrap text-muted-foreground text-xs'>
                      {new Date(selectedItem.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className='text-muted-foreground text-xs capitalize'>{selectedItem.type}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showOAuthModal && (
        <OAuthRequiredModal
          isOpen={showOAuthModal}
          onClose={() => setShowOAuthModal(false)}
          toolName='Wealthbox'
          provider={provider}
          requiredScopes={requiredScopes}
          serviceId={getServiceId()}
        />
      )}
    </>
  )
}
