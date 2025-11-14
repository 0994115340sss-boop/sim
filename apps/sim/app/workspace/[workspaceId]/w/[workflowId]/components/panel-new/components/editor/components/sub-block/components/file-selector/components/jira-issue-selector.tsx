'use client'

import { type ComponentType, useCallback, useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ExternalLink, X } from 'lucide-react'
import { Combobox, type ComboboxOption } from '@/components/emcn'
import { JiraIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logs/console/logger'
import {
  type Credential,
  getProviderIdFromServiceId,
  getServiceIdFromScopes,
  type OAuthProvider,
} from '@/lib/oauth'
import { OAuthRequiredModal } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel-new/components/editor/components/sub-block/components/credential-selector/components/oauth-required-modal'
// Note: Jira uses custom query implementation due to special requirements:
// - Requires fetching access token via /api/auth/oauth/token first
// - Uses GET with query params (not standard POST with body)
// - Returns special "sections" structure
// - Needs cloudId management across requests
import { useDisplayNamesStore } from '@/stores/display-names/store'

const logger = createLogger('JiraIssueSelector')

// Jira issue information structure
export interface JiraIssueInfo {
  id: string
  name: string
  mimeType?: string
  url?: string
  webViewLink?: string
  modifiedTime?: string
}

interface JiraIssueSelectorProps {
  value: string
  onChange: (value: string, issueInfo?: JiraIssueInfo) => void
  provider: OAuthProvider
  requiredScopes?: string[]
  label?: string
  disabled?: boolean
  serviceId?: string
  domain: string
  showPreview?: boolean
  onIssueInfoChange?: (issueInfo: JiraIssueInfo | null) => void
  projectId?: string
  credentialId?: string
  isForeignCredential?: boolean
  workflowId?: string
}

export function JiraIssueSelector({
  value,
  onChange,
  provider,
  requiredScopes = [],
  label = 'Select Jira issue',
  disabled = false,
  serviceId,
  domain,
  showPreview = true,
  onIssueInfoChange,
  projectId,
  credentialId,
  isForeignCredential = false,
  workflowId,
}: JiraIssueSelectorProps) {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>(credentialId || '')
  const [selectedIssueId, setSelectedIssueId] = useState(value)
  const [showOAuthModal, setShowOAuthModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [cloudId, setCloudId] = useState<string | null>(null)
  const [credentialsLoading, setCredentialsLoading] = useState(false)

  // Validate domain format
  const trimmedDomain = domain?.trim().toLowerCase()
  const isValidDomain = trimmedDomain?.includes('.')

  // Only fetch if we have a valid domain and either a project or search query
  const shouldFetch = isValidDomain && (!!projectId || !!searchQuery)

  // Fetch access token for Jira API calls
  const { data: accessToken, isLoading: tokenLoading } = useQuery({
    queryKey: selectedCredentialId
      ? ['jira-access-token', selectedCredentialId, workflowId]
      : ['jira-access-token', 'empty'],
    queryFn: async () => {
      if (!selectedCredentialId) return null

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
        throw new Error('Authentication failed. Please reconnect your Jira account.')
      }

      const tokenData = await tokenResponse.json()
      const token = tokenData.accessToken

      if (!token) {
        logger.error('No access token returned')
        throw new Error('Authentication failed. Please reconnect your Jira account.')
      }

      return token
    },
    enabled: !!selectedCredentialId,
    staleTime: 5 * 60 * 1000, // 5 minutes - tokens are valid for longer
    retry: false,
    placeholderData: keepPreviousData,
  })

  // Fetch issues using custom query (Jira requires special handling)
  const {
    data: issuesResponse,
    isLoading: issuesLoading,
    error: issuesError,
    refetch: refetchIssues,
  } = useQuery({
    queryKey:
      accessToken && domain
        ? ['jira-issues', accessToken, domain, { projectId, searchQuery, cloudId }]
        : ['jira-issues', 'empty'],
    queryFn: async () => {
      if (!accessToken || !domain || !isValidDomain) return { issues: [], cloudId: null }

      // If no search query and no project, return empty
      if (!searchQuery && !projectId) {
        return { issues: [], cloudId: null }
      }

      // Build query parameters for the issues endpoint
      const queryParams = new URLSearchParams({
        domain,
        accessToken,
        ...(projectId && { projectId }),
        ...(searchQuery && { query: searchQuery }),
        ...(cloudId && { cloudId }),
      })

      const response = await fetch(`/api/tools/jira/issues?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        logger.error('Jira API error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch issues')
      }

      const data = await response.json()

      // Update cloudId state for subsequent queries
      if (data.cloudId) {
        setCloudId(data.cloudId)
      }

      // Process the issue picker results
      let foundIssues: JiraIssueInfo[] = []

      // Handle the sections returned by the issue picker API
      if (data.sections) {
        // Combine issues from all sections
        data.sections.forEach((section: any) => {
          if (section.issues && section.issues.length > 0) {
            const sectionIssues = section.issues.map((issue: any) => ({
              id: issue.key,
              name: issue.summary || issue.summaryText || issue.key,
              mimeType: 'jira/issue',
              url: `https://${domain}/browse/${issue.key}`,
              webViewLink: `https://${domain}/browse/${issue.key}`,
            }))
            foundIssues = [...foundIssues, ...sectionIssues]
          }
        })
      }

      logger.info(`Received ${foundIssues.length} issues from API`)

      return {
        issues: foundIssues,
        cloudId: data.cloudId || null,
      }
    },
    enabled: shouldFetch && !!accessToken,
    staleTime: 30 * 1000, // 30 seconds - issues change more frequently
    retry: false, // Don't retry on auth errors
    placeholderData: keepPreviousData,
  })

  const issues = (issuesResponse?.issues ?? []) as JiraIssueInfo[]
  const isLoading = issuesLoading || credentialsLoading || tokenLoading
  const error = issuesError ? (issuesError as Error).message : null

  // Fetch metadata for the selected issue (if value exists and not in issues list)
  const shouldFetchMetadata = !!value && !!accessToken && issues.length === 0
  const { data: issueMetadata } = useQuery({
    queryKey:
      value && accessToken && domain
        ? ['jira-issue-detail', value, accessToken, domain]
        : ['jira-issues', 'empty-detail'],
    queryFn: async () => {
      if (!value || !accessToken || !domain || !isValidDomain) return null

      // Use the access token to fetch the issue info
      const response = await fetch('/api/tools/jira/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain,
          accessToken,
          issueId: value,
          cloudId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        logger.error('Failed to fetch issue info:', errorData)
        return null
      }

      const data = await response.json()

      if (data.issue) {
        logger.info('Successfully fetched issue:', data.issue.name)
        // Update cloudId state
        if (data.cloudId) {
          setCloudId(data.cloudId)
        }
        return {
          issue: data.issue as JiraIssueInfo,
          cloudId: data.cloudId || null,
        }
      }

      logger.warn('No issue data received in response')
      return null
    },
    enabled: shouldFetchMetadata,
    staleTime: 60 * 1000, // 1 minute
    retry: false,
    placeholderData: keepPreviousData,
  })

  const selectedIssue = useMemo(() => {
    if (!value) return null
    // Try to find in issues list first
    const found = issues.find((issue: JiraIssueInfo) => issue.id === value)
    if (found) return found
    // Fall back to metadata
    return issueMetadata?.issue ?? null
  }, [value, issues, issueMetadata])

  // Get display name callback for Combobox
  const getDisplayName = useCallback(
    (issueId: string) => {
      if (isForeignCredential) return 'Saved by collaborator'
      const effectiveCredentialId = credentialId || selectedCredentialId
      if (!effectiveCredentialId || !issueId) return null
      return (
        useDisplayNamesStore.getState().cache.files[`jira-${effectiveCredentialId}`]?.[issueId] ||
        null
      )
    },
    [credentialId, selectedCredentialId, isForeignCredential]
  )

  // Determine the appropriate service ID based on provider and scopes
  const getServiceId = (): string => {
    if (serviceId) return serviceId
    return getServiceIdFromScopes(provider, requiredScopes)
  }

  // Determine the appropriate provider ID based on service and scopes (stabilized)
  const providerId = useMemo(() => {
    const effectiveServiceId = getServiceId()
    return getProviderIdFromServiceId(effectiveServiceId)
  }, [serviceId, provider, requiredScopes])

  // Cache issue names in display names store
  useEffect(() => {
    if (selectedCredentialId && issues.length > 0) {
      const issueMap = issues.reduce((acc: Record<string, string>, issue: JiraIssueInfo) => {
        acc[issue.id] = issue.name
        return acc
      }, {})
      useDisplayNamesStore
        .getState()
        .setDisplayNames('files', `jira-${selectedCredentialId}`, issueMap)
    }
  }, [selectedCredentialId, issues])

  // Get cached issue name to check if we need eager fetching
  const cachedIssueName = useMemo(() => {
    const effectiveCredentialId = credentialId || selectedCredentialId
    if (!effectiveCredentialId || !value) return null
    return (
      useDisplayNamesStore.getState().cache.files[`jira-${effectiveCredentialId}`]?.[value] || null
    )
  }, [credentialId, selectedCredentialId, value])

  // Eager caching: If we have a value but no cached name, fetch issues immediately
  // This fixes the bug where issue names show "-" on page refresh until user clicks the block
  useEffect(() => {
    if (
      value &&
      selectedCredentialId &&
      domain &&
      isValidDomain &&
      !cachedIssueName &&
      !isLoading &&
      !isForeignCredential &&
      accessToken
    ) {
      refetchIssues()
    }
  }, [
    value,
    selectedCredentialId,
    domain,
    isValidDomain,
    cachedIssueName,
    isLoading,
    isForeignCredential,
    accessToken,
    refetchIssues,
  ])

  // Notify parent when selected issue changes
  useEffect(() => {
    if (selectedIssue) {
      onIssueInfoChange?.(selectedIssue)
    }
  }, [selectedIssue, onIssueInfoChange])

  // Fetch available credentials for this provider
  const fetchCredentials = useCallback(async () => {
    if (!providerId) return
    setCredentialsLoading(true)
    try {
      const response = await fetch(`/api/auth/oauth/credentials?provider=${providerId}`)

      if (response.ok) {
        const data = await response.json()
        setCredentials(data.credentials)
      }
    } catch (error) {
      logger.error('Error fetching credentials:', error)
    } finally {
      setCredentialsLoading(false)
    }
  }, [providerId])

  // Fetch credentials list on mount (for account switching UI)
  useEffect(() => {
    fetchCredentials()
  }, [fetchCredentials])

  // Keep local credential state in sync with persisted credential
  useEffect(() => {
    if (credentialId && credentialId !== selectedCredentialId) {
      setSelectedCredentialId(credentialId)
    }
  }, [credentialId, selectedCredentialId])

  // Handle open change
  const handleOpenChange = (isOpen: boolean) => {
    // Refetch issues when opening the dropdown if we have a project
    if (isOpen && selectedCredentialId && domain && domain.includes('.') && projectId) {
      refetchIssues()
    }
  }

  // Keep internal selectedIssueId in sync with the value prop
  useEffect(() => {
    if (value !== selectedIssueId) {
      setSelectedIssueId(value)
    }
  }, [value, selectedIssueId])

  // Clear callback when value is cleared
  useEffect(() => {
    if (!value) {
      onIssueInfoChange?.(null)
    }
  }, [value, onIssueInfoChange])

  // Handle issue selection
  const handleSelectIssue = (selectedValue: string, metadata?: any) => {
    const issue = metadata as JiraIssueInfo | undefined
    setSelectedIssueId(selectedValue)
    onChange(selectedValue, issue)
    onIssueInfoChange?.(issue || null)
  }

  // Clear selection
  const handleClearSelection = () => {
    setSelectedIssueId('')
    onChange('', undefined)
    onIssueInfoChange?.(null)
  }

  // Handle search - update search query state to trigger refetch
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Convert issues to combobox options
  const options = useMemo<ComboboxOption[]>(() => {
    return issues.map((issue: JiraIssueInfo) => ({
      label: issue.name,
      value: issue.id,
      icon: JiraIcon as ComponentType<{ className?: string }>,
      metadata: issue,
    }))
  }, [issues])

  // Account switcher component
  const accountSwitcher = useMemo(() => {
    if (!selectedCredentialId || credentials.length <= 1) return null

    return (
      <div className='flex items-center justify-between border-[var(--surface-11)] border-b px-3 py-2'>
        <div className='flex items-center gap-2'>
          <JiraIcon className='h-4 w-4' />
          <span className='text-muted-foreground text-xs'>
            {credentials.find((cred) => cred.id === selectedCredentialId)?.name || 'Unknown'}
          </span>
        </div>
        {credentials.length > 1 && (
          <select
            value={selectedCredentialId}
            onChange={(e) => setSelectedCredentialId(e.target.value)}
            className='h-6 rounded bg-transparent px-2 text-xs hover:bg-[var(--surface-11)]'
          >
            {credentials.map((cred) => (
              <option key={cred.id} value={cred.id}>
                {cred.name}
              </option>
            ))}
          </select>
        )}
      </div>
    )
  }, [selectedCredentialId, credentials])

  // Preview card component
  const previewCard = useMemo(() => {
    if (!showPreview || !selectedIssue) return null

    return (
      <div className='relative rounded-md border border-muted bg-muted/10 p-2'>
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
            <JiraIcon className='h-4 w-4' />
          </div>
          <div className='min-w-0 flex-1 overflow-hidden'>
            <div className='flex items-center gap-2'>
              <h4 className='truncate font-medium text-xs'>{selectedIssue.name}</h4>
              {selectedIssue.modifiedTime && (
                <span className='whitespace-nowrap text-muted-foreground text-xs'>
                  {new Date(selectedIssue.modifiedTime).toLocaleDateString()}
                </span>
              )}
            </div>
            {selectedIssue.webViewLink && (
              <a
                href={selectedIssue.webViewLink}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-1 text-foreground text-xs hover:underline'
                onClick={(e) => e.stopPropagation()}
              >
                <span>Open in Jira</span>
                <ExternalLink className='h-3 w-3' />
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }, [showPreview, selectedIssue, handleClearSelection])

  // Custom render for options showing issue keys
  const renderOption = useCallback((option: ComboboxOption) => {
    return (
      <>
        <JiraIcon className='mr-[8px] h-4 w-4 flex-shrink-0 opacity-60' />
        <span className='flex-1 truncate text-[var(--text-primary)]'>{option.label}</span>
      </>
    )
  }, [])

  const emptyMessage =
    credentials.length === 0
      ? 'No accounts connected. Connect a Jira account to continue.'
      : 'No issues found. Try a different search or account.'

  return (
    <>
      <div className='space-y-2'>
        <Combobox
          options={options}
          value={selectedIssueId}
          onChange={handleSelectIssue}
          placeholder={label}
          disabled={disabled || !domain || !selectedCredentialId || isForeignCredential}
          editable={true}
          isLoading={isLoading}
          error={error}
          getDisplayName={getDisplayName}
          renderOption={renderOption}
          onOpenChange={handleOpenChange}
          onSearch={handleSearch}
          emptyMessage={emptyMessage}
          accountSwitcher={accountSwitcher}
          className={isForeignCredential ? 'cursor-help' : undefined}
        />

        {showPreview && selectedIssue && previewCard}
      </div>

      {showOAuthModal && (
        <OAuthRequiredModal
          isOpen={showOAuthModal}
          onClose={() => setShowOAuthModal(false)}
          provider={provider}
          toolName='Jira'
          requiredScopes={requiredScopes}
          serviceId={getServiceId()}
        />
      )}
    </>
  )
}
