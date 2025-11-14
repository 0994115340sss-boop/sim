'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { useResourceDetail, useResourceList } from '@/hooks/queries/resources'
import { useDisplayNamesStore } from '@/stores/display-names/store'

export interface JiraProjectInfo {
  id: string
  key: string
  name: string
  url?: string
  avatarUrl?: string
  description?: string
  projectTypeKey?: string
  simplified?: boolean
  style?: string
  isPrivate?: boolean
}

const logger = createLogger('JiraProjectSelector')

interface JiraProjectSelectorProps {
  value: string
  onChange: (value: string, projectInfo?: JiraProjectInfo) => void
  provider: OAuthProvider
  requiredScopes?: string[]
  label?: string
  disabled?: boolean
  serviceId?: string
  domain: string
  showPreview?: boolean
  onProjectInfoChange?: (projectInfo: JiraProjectInfo | null) => void
  credentialId?: string
  isForeignCredential?: boolean
  workflowId?: string
}

export function JiraProjectSelector({
  value,
  onChange,
  provider,
  requiredScopes = [],
  label = 'Select Jira project',
  disabled = false,
  serviceId,
  domain,
  showPreview = true,
  onProjectInfoChange,
  credentialId,
  isForeignCredential = false,
  workflowId,
}: JiraProjectSelectorProps) {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>(credentialId || '')
  const [showOAuthModal, setShowOAuthModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [cloudId, setCloudId] = useState<string | null>(null)

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

  // Validate domain format
  const trimmedDomain = domain?.trim().toLowerCase()
  const isValidDomain = trimmedDomain?.includes('.')

  // Fetch access token for Jira API calls
  const { data: accessToken } = useQuery({
    queryKey: ['jira-access-token', selectedCredentialId, workflowId],
    queryFn: async () => {
      if (!selectedCredentialId) return null

      const tokenResponse = await fetch('/api/auth/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId: selectedCredentialId, workflowId }),
      })

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json()
        throw new Error(
          errorData.error || 'Authentication failed. Please reconnect your Jira account.'
        )
      }

      const tokenData = await tokenResponse.json()
      return tokenData.accessToken || null
    },
    enabled: !!selectedCredentialId,
    staleTime: 5 * 60 * 1000, // 5 minutes - tokens are valid for longer
    retry: false,
  })

  // Fetch projects using generic useResourceList hook
  const {
    data: projectsData = [],
    isLoading,
    error: queryError,
    refetch: refetchProjects,
  } = useResourceList<JiraProjectInfo>({
    resourceType: 'projects',
    credential: accessToken || undefined,
    endpoint: '/api/tools/jira/projects',
    params: { domain, searchQuery, cloudId, workflowId },
    enabled: !!accessToken && !!domain && isValidDomain,
    staleTime: 60 * 1000, // 1 minute - projects don't change frequently
  })

  // Handle cloudId updates from the response
  useEffect(() => {
    if (projectsData && Array.isArray(projectsData) && projectsData.length > 0) {
      // The API returns { projects, cloudId } but useResourceList extracts the array
      // We need to handle cloudId separately if returned
      // For now, cloudId state will be managed through subsequent calls
    }
  }, [projectsData])

  const projects = projectsData || []

  // Fetch metadata for the selected project using useResourceDetail
  const shouldFetchMetadata = !!value && !!accessToken && !!domain && projects.length === 0
  const { data: selectedProjectDetail } = useResourceDetail<JiraProjectInfo>({
    resourceType: 'projects',
    resourceId: shouldFetchMetadata ? value : undefined,
    credential: accessToken || undefined,
    endpoint: '/api/tools/jira/projects',
    params: { domain, cloudId },
    enabled: shouldFetchMetadata,
    staleTime: 60 * 1000, // 1 minute
  })

  const selectedProjectMeta = selectedProjectDetail

  // Merge selected project metadata with projects list
  const allProjects = useMemo(() => {
    if (!selectedProjectMeta) return projects

    // Check if selected project is already in the list
    const projectExists = projects.some((p: JiraProjectInfo) => p.id === selectedProjectMeta.id)
    if (projectExists) return projects

    // Add the selected project to the beginning of the list
    return [selectedProjectMeta, ...projects]
  }, [projects, selectedProjectMeta])

  // Cache project names in display names store
  useEffect(() => {
    if (selectedCredentialId && allProjects.length > 0) {
      const projectMap = allProjects.reduce(
        (acc: Record<string, string>, proj: JiraProjectInfo) => {
          acc[proj.id] = proj.name
          return acc
        },
        {}
      )
      useDisplayNamesStore
        .getState()
        .setDisplayNames('projects', `jira-${selectedCredentialId}`, projectMap)
    }
  }, [selectedCredentialId, allProjects])

  // Get cached display name
  const getDisplayName = useCallback(
    (projectId: string) => {
      if (isForeignCredential) return 'Saved by collaborator'
      const effectiveCredentialId = credentialId || selectedCredentialId
      if (!effectiveCredentialId || !projectId) return null
      return (
        useDisplayNamesStore.getState().cache.projects[`jira-${effectiveCredentialId}`]?.[
          projectId
        ] || null
      )
    },
    [credentialId, selectedCredentialId, isForeignCredential]
  )

  // Get cached project name to check if we need eager fetching
  const cachedProjectName = useMemo(() => {
    const effectiveCredentialId = credentialId || selectedCredentialId
    if (!effectiveCredentialId || !value) return null
    return (
      useDisplayNamesStore.getState().cache.projects[`jira-${effectiveCredentialId}`]?.[value] ||
      null
    )
  }, [credentialId, selectedCredentialId, value])

  // Eager caching: If we have a value but no cached name, fetch projects immediately
  // This fixes the bug where project names show "-" on page refresh until user clicks the block
  useEffect(() => {
    if (
      value &&
      selectedCredentialId &&
      domain &&
      isValidDomain &&
      !cachedProjectName &&
      !isLoading &&
      !isForeignCredential &&
      accessToken
    ) {
      refetchProjects()
    }
  }, [
    value,
    selectedCredentialId,
    domain,
    isValidDomain,
    cachedProjectName,
    isLoading,
    isForeignCredential,
    accessToken,
    refetchProjects,
  ])

  // Fetch available credentials for this provider
  const fetchCredentials = useCallback(async () => {
    if (!providerId) return
    try {
      const response = await fetch(`/api/auth/oauth/credentials?provider=${providerId}`)
      if (response.ok) {
        const data = await response.json()
        setCredentials(data.credentials)
      }
    } catch (error) {
      logger.error('Error fetching credentials:', error)
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

  // Clear callback when value is cleared
  useEffect(() => {
    if (!value) {
      onProjectInfoChange?.(null)
    }
  }, [value, onProjectInfoChange])

  // Update project info when selection changes
  useEffect(() => {
    if (value && allProjects.length > 0) {
      const projectInfo = allProjects.find((p: JiraProjectInfo) => p.id === value)
      if (projectInfo) {
        onProjectInfoChange?.(projectInfo)
      }
    }
  }, [value, allProjects, onProjectInfoChange])

  // Handle dropdown open/close - refetch projects when opening
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && selectedCredentialId && domain && domain.includes('.')) {
      refetchProjects()
    }
  }

  // Handle project selection
  const handleSelectProject = (selectedValue: string, metadata?: any) => {
    const project = metadata as JiraProjectInfo | undefined
    onChange(selectedValue, project)
    onProjectInfoChange?.(project || null)
  }

  // Clear selection
  const handleClearSelection = () => {
    onChange('', undefined)
    onProjectInfoChange?.(null)
  }

  // Handle search with debouncing
  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  // Convert projects to combobox options
  const options = useMemo<ComboboxOption[]>(() => {
    return allProjects.map((project: JiraProjectInfo) => ({
      label: project.name,
      value: project.id,
      icon: JiraIcon,
      metadata: project,
      avatarUrl: project.avatarUrl,
    }))
  }, [allProjects])

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
    const selectedProject = allProjects.find((p: JiraProjectInfo) => p.id === value)
    if (!showPreview || !selectedProject) return null

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
            {selectedProject.avatarUrl ? (
              <img
                src={selectedProject.avatarUrl}
                alt={selectedProject.name}
                className='h-6 w-6 rounded'
              />
            ) : (
              <JiraIcon className='h-4 w-4' />
            )}
          </div>
          <div className='min-w-0 flex-1 overflow-hidden'>
            <div className='flex items-center gap-2'>
              <h4 className='truncate font-medium text-xs'>{selectedProject.name}</h4>
              <span className='whitespace-nowrap text-muted-foreground text-xs'>
                {selectedProject.key}
              </span>
            </div>
            {selectedProject.url ? (
              <a
                href={selectedProject.url}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-1 text-foreground text-xs hover:underline'
                onClick={(e) => e.stopPropagation()}
              >
                <span>Open in Jira</span>
                <ExternalLink className='h-3 w-3' />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    )
  }, [showPreview, value, allProjects, handleClearSelection])

  // Custom render for options with avatars
  const renderOption = useCallback((option: ComboboxOption) => {
    return (
      <>
        {option.avatarUrl && (
          <img
            src={option.avatarUrl}
            alt={option.label}
            className='mr-[8px] h-4 w-4 flex-shrink-0 rounded'
          />
        )}
        <span className='flex-1 truncate text-[var(--text-primary)]'>{option.label}</span>
      </>
    )
  }, [])

  const error = queryError ? (queryError as Error).message : null
  const emptyMessage =
    credentials.length === 0
      ? 'No accounts connected. Connect a Jira account to continue.'
      : 'No projects found. Try a different search or account.'

  // Get selected project for overlay
  const selectedProject = useMemo(() => {
    if (!value) return null
    return allProjects.find((p: JiraProjectInfo) => p.id === value)
  }, [value, allProjects])

  // Overlay content to show display name instead of ID
  const overlayContent = useMemo(() => {
    if (!selectedProject) return null
    return (
      <div className='flex items-center truncate'>
        <JiraIcon className='mr-[8px] h-4 w-4 flex-shrink-0 opacity-60' />
        {selectedProject.avatarUrl && (
          <img
            src={selectedProject.avatarUrl}
            alt={selectedProject.name}
            className='mr-[8px] h-4 w-4 flex-shrink-0 rounded'
          />
        )}
        <span className='truncate'>{selectedProject.name}</span>
      </div>
    )
  }, [selectedProject])

  return (
    <>
      <div className='space-y-2'>
        <Combobox
          options={options}
          value={value}
          onChange={handleSelectProject}
          placeholder={label}
          disabled={disabled || !domain || !selectedCredentialId || isForeignCredential}
          editable={true}
          overlayContent={overlayContent}
          isLoading={isLoading}
          error={error}
          getDisplayName={getDisplayName}
          onSearch={handleSearch}
          debounceMs={500}
          emptyMessage={emptyMessage}
          renderOption={renderOption}
          accountSwitcher={!isForeignCredential ? accountSwitcher : undefined}
          onOpenChange={handleOpenChange}
        />
        {previewCard}
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
