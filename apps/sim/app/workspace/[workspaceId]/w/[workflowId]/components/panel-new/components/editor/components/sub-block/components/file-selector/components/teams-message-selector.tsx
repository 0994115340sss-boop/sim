'use client'

import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { Combobox, type ComboboxOption } from '@/components/emcn/components/combobox/combobox'
import { MicrosoftTeamsIcon } from '@/components/icons'
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

const logger = createLogger('TeamsMessageSelector')

export interface TeamsMessageInfo {
  id: string
  displayName: string
  type: 'team' | 'channel' | 'chat'
  teamId?: string
  channelId?: string
  chatId?: string
  webViewLink?: string
}

interface TeamsMessageSelectorProps {
  value: string
  onChange: (value: string, messageInfo?: TeamsMessageInfo) => void
  provider: OAuthProvider
  requiredScopes?: string[]
  label?: string
  disabled?: boolean
  serviceId?: string
  showPreview?: boolean
  onMessageInfoChange?: (messageInfo: TeamsMessageInfo | null) => void
  credential: string
  selectionType?: 'team' | 'channel' | 'chat'
  initialTeamId?: string
  workflowId: string
  isForeignCredential?: boolean
}

export function TeamsMessageSelector({
  value,
  onChange,
  provider,
  requiredScopes = [],
  label = 'Select Teams message location',
  disabled = false,
  serviceId,
  showPreview = true,
  onMessageInfoChange,
  credential,
  selectionType = 'team',
  initialTeamId,
  workflowId,
  isForeignCredential = false,
}: TeamsMessageSelectorProps) {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [teams, setTeams] = useState<TeamsMessageInfo[]>([])
  const [channels, setChannels] = useState<TeamsMessageInfo[]>([])
  const [chats, setChats] = useState<TeamsMessageInfo[]>([])
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>(credential || '')
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [selectedChannelId, setSelectedChannelId] = useState<string>('')
  const [selectedChatId, setSelectedChatId] = useState<string>('')
  const [selectedMessageId, setSelectedMessageId] = useState(value)
  const [selectedMessage, setSelectedMessage] = useState<TeamsMessageInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showOAuthModal, setShowOAuthModal] = useState(false)
  const initialFetchRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [selectionStage, setSelectionStage] = useState<'team' | 'channel' | 'chat'>(selectionType)
  const lastRestoredValueRef = useRef<string | null>(null)

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

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    if (!selectedCredentialId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/tools/microsoft-teams/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: selectedCredentialId,
          workflowId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()

        // If server indicates auth is required, show the auth modal
        if (response.status === 401 && errorData.authRequired) {
          logger.warn('Authentication required for Microsoft Teams')
          setShowOAuthModal(true)
          throw new Error('Microsoft Teams authentication required')
        }

        throw new Error(errorData.error || 'Failed to fetch teams')
      }

      const data = await response.json()
      const teamsData = data.teams.map((team: { id: string; displayName: string }) => ({
        id: team.id,
        displayName: team.displayName,
        type: 'team' as const,
        teamId: team.id,
        webViewLink: `https://teams.microsoft.com/l/team/${team.id}`,
      }))

      setTeams(teamsData)

      // Cache team names in display names store
      if (selectedCredentialId && teamsData.length > 0) {
        const teamMap = teamsData.reduce((acc: Record<string, string>, team: TeamsMessageInfo) => {
          acc[team.id] = team.displayName
          return acc
        }, {})
        useDisplayNamesStore.getState().setDisplayNames('files', selectedCredentialId, teamMap)
      }

      // If we have a selected team ID, find it in the list
      if (selectedTeamId) {
        const team = teamsData.find((t: TeamsMessageInfo) => t.teamId === selectedTeamId)
        if (team) {
          setSelectedMessage(team)
          onMessageInfoChange?.(team)
        }
      }
    } catch (error) {
      logger.error('Error fetching teams:', error)
      setError((error as Error).message)
      setTeams([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedCredentialId, selectedTeamId, onMessageInfoChange, workflowId])

  // Fetch channels for a selected team
  const fetchChannels = useCallback(
    async (teamId: string) => {
      if (!selectedCredentialId || !teamId) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/tools/microsoft-teams/channels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credential: selectedCredentialId,
            teamId,
            workflowId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()

          // If server indicates auth is required, show the auth modal
          if (response.status === 401 && errorData.authRequired) {
            logger.warn('Authentication required for Microsoft Teams')
            setShowOAuthModal(true)
            throw new Error('Microsoft Teams authentication required')
          }

          throw new Error(errorData.error || 'Failed to fetch channels')
        }

        const data = await response.json()
        const channelsData = data.channels.map((channel: { id: string; displayName: string }) => ({
          id: `${teamId}-${channel.id}`,
          displayName: channel.displayName,
          type: 'channel' as const,
          teamId,
          channelId: channel.id,
          webViewLink: `https://teams.microsoft.com/l/channel/${teamId}/${encodeURIComponent(channel.displayName)}/${channel.id}`,
        }))

        setChannels(channelsData)

        // Cache channel names in display names store
        if (selectedCredentialId && channelsData.length > 0) {
          const channelMap = channelsData.reduce(
            (acc: Record<string, string>, channel: TeamsMessageInfo) => {
              acc[channel.channelId!] = channel.displayName
              return acc
            },
            {}
          )
          useDisplayNamesStore.getState().setDisplayNames('files', selectedCredentialId, channelMap)
        }

        // If we have a selected channel ID, find it in the list
        if (selectedChannelId) {
          const channel = channelsData.find(
            (c: TeamsMessageInfo) => c.channelId === selectedChannelId
          )
          if (channel) {
            setSelectedMessage(channel)
            onMessageInfoChange?.(channel)
          }
        }
      } catch (error) {
        logger.error('Error fetching channels:', error)
        setError((error as Error).message)
        setChannels([])
      } finally {
        setIsLoading(false)
      }
    },
    [selectedCredentialId, selectedChannelId, onMessageInfoChange, workflowId]
  )

  // Fetch chats
  const fetchChats = useCallback(async () => {
    if (!selectedCredentialId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/tools/microsoft-teams/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: selectedCredentialId,
          workflowId: workflowId, // Pass the workflowId for server-side authentication
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()

        // If server indicates auth is required, show the auth modal
        if (response.status === 401 && errorData.authRequired) {
          logger.warn('Authentication required for Microsoft Teams')
          setShowOAuthModal(true)
          throw new Error('Microsoft Teams authentication required')
        }

        throw new Error(errorData.error || 'Failed to fetch chats')
      }

      const data = await response.json()
      const chatsData = data.chats.map((chat: { id: string; displayName: string }) => ({
        id: chat.id,
        displayName: chat.displayName,
        type: 'chat' as const,
        chatId: chat.id,
        webViewLink: `https://teams.microsoft.com/l/chat/${chat.id}`,
      }))

      setChats(chatsData)

      if (selectedCredentialId && chatsData.length > 0) {
        const chatMap = chatsData.reduce((acc: Record<string, string>, chat: TeamsMessageInfo) => {
          acc[chat.id] = chat.displayName
          return acc
        }, {})
        useDisplayNamesStore.getState().setDisplayNames('files', selectedCredentialId, chatMap)
      }

      // If we have a selected chat ID, find it in the list
      if (selectedChatId) {
        const chat = chatsData.find((c: TeamsMessageInfo) => c.chatId === selectedChatId)
        if (chat) {
          setSelectedMessage(chat)
          onMessageInfoChange?.(chat)
        }
      }
    } catch (error) {
      logger.error('Error fetching chats:', error)
      setError((error as Error).message)
      setChats([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedCredentialId, selectedChatId, onMessageInfoChange, workflowId])

  // Update selection stage based on selected values and selectionType
  useEffect(() => {
    // If we have explicit values selected, use those to determine the stage
    if (selectedChatId) {
      setSelectionStage('chat')
    } else if (selectedChannelId) {
      setSelectionStage('channel')
    } else if (selectionType === 'channel' && selectedTeamId) {
      // If we're in channel mode and have a team selected, go to channel selection
      setSelectionStage('channel')
    } else if (selectionType !== 'team' && !selectedTeamId) {
      // If no selections but we have a specific selection type, use that
      // But for channel selection, start with team selection if no team is selected
      if (selectionType === 'channel') {
        setSelectionStage('team')
      } else {
        setSelectionStage(selectionType)
      }
    } else {
      // Default to team selection
      setSelectionStage('team')
    }
  }, [selectedTeamId, selectedChannelId, selectedChatId, selectionType])

  // Handle open change
  const handleOpenChange = (isOpen: boolean) => {
    if (disabled || isForeignCredential) {
      return
    }
    // Only fetch data when opening the dropdown
    if (isOpen && selectedCredentialId) {
      if (selectionStage === 'team') {
        fetchTeams()
      } else if (selectionStage === 'channel' && selectedTeamId) {
        fetchChannels(selectedTeamId)
      } else if (selectionStage === 'chat') {
        fetchChats()
      }
    }
  }

  // Keep internal selectedMessageId in sync with the value prop
  useEffect(() => {
    if (value !== selectedMessageId) {
      setSelectedMessageId(value)
    }
  }, [value])

  // Handle team selection
  const handleSelectTeam = (team: TeamsMessageInfo) => {
    setSelectedTeamId(team.teamId || '')
    setSelectedChannelId('')
    setSelectedChatId('')
    setSelectedMessage(team)
    setSelectedMessageId(team.id)
    onChange(team.id, team)
    onMessageInfoChange?.(team)
    setSelectionStage('channel')
    fetchChannels(team.teamId || '')
  }

  // Handle channel selection
  const handleSelectChannel = (channel: TeamsMessageInfo) => {
    setSelectedChannelId(channel.channelId || '')
    setSelectedChatId('')
    setSelectedMessage(channel)
    setSelectedMessageId(channel.channelId || '')
    onChange(channel.channelId || '', channel)
    onMessageInfoChange?.(channel)
  }

  // Handle chat selection
  const handleSelectChat = (chat: TeamsMessageInfo) => {
    setSelectedChatId(chat.chatId || '')
    setSelectedMessage(chat)
    setSelectedMessageId(chat.id)
    onChange(chat.id, chat)
    onMessageInfoChange?.(chat)
  }

  // Handle adding a new credential
  const handleAddCredential = () => {
    // Show the OAuth modal
    setShowOAuthModal(true)
  }

  // Clear selection
  const handleClearSelection = () => {
    setSelectedMessageId('')
    setSelectedTeamId('')
    setSelectedChannelId('')
    setSelectedChatId('')
    setSelectedMessage(null)
    setError(null)
    onChange('', undefined)
    onMessageInfoChange?.(null)
    setSelectionStage(selectionType) // Reset to the initial selection type
  }

  // Convert teams/channels/chats to ComboboxOption format based on selection stage
  const options = useMemo<ComboboxOption[]>(() => {
    if (selectionStage === 'team' && teams.length > 0) {
      return teams.map((team) => ({
        label: team.displayName,
        value: team.id,
        icon: MicrosoftTeamsIcon as ComponentType<{ className?: string }>,
        metadata: team,
      }))
    }

    if (selectionStage === 'channel' && channels.length > 0) {
      return channels.map((channel) => ({
        label: channel.displayName,
        value: channel.id,
        icon: MicrosoftTeamsIcon as ComponentType<{ className?: string }>,
        metadata: channel,
      }))
    }

    if (selectionStage === 'chat' && chats.length > 0) {
      return chats.map((chat) => ({
        label: chat.displayName,
        value: chat.id,
        icon: MicrosoftTeamsIcon as ComponentType<{ className?: string }>,
        metadata: chat,
      }))
    }

    return []
  }, [selectionStage, teams, channels, chats])

  // Handle selection based on stage
  const handleSelection = (selectedValue: string, metadata?: any) => {
    const info = metadata as TeamsMessageInfo | undefined

    if (!info) return

    if (selectionStage === 'team') {
      handleSelectTeam(info)
    } else if (selectionStage === 'channel') {
      handleSelectChannel(info)
    } else if (selectionStage === 'chat') {
      handleSelectChat(info)
    }
  }

  // Get display name from cache
  const getDisplayName = useCallback(
    (messageId: string) => {
      if (!credential || !messageId) return null
      return useDisplayNamesStore.getState().cache.files[credential]?.[messageId] || null
    },
    [credential]
  )

  // Custom render for each option
  const renderOption = useCallback((option: ComboboxOption) => {
    return (
      <>
        <MicrosoftTeamsIcon className='mr-[8px] h-4 w-4 flex-shrink-0 opacity-60' />
        <span className='flex-1 truncate text-[var(--text-primary)]'>{option.label}</span>
      </>
    )
  }, [])

  // Account switcher component
  const accountSwitcher = useMemo(() => {
    if (!selectedCredentialId || credentials.length <= 1) return null

    return (
      <div className='border-[var(--surface-11)] border-b pb-1'>
        <div className='mb-1 px-2 font-medium text-[var(--text-muted)] text-xs'>Switch Account</div>
        {credentials.map((cred) => (
          <div
            key={cred.id}
            className='flex cursor-pointer items-center justify-between rounded px-2 py-1 hover:bg-[var(--surface-11)]'
            onClick={() => {
              setSelectedCredentialId(cred.id)
            }}
          >
            <div className='flex items-center gap-2'>
              <MicrosoftTeamsIcon className='h-4 w-4' />
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
  }, [selectedCredentialId, credentials])

  // Restore team selection on page refresh
  const restoreTeamSelection = useCallback(
    async (teamId: string) => {
      if (!selectedCredentialId || !teamId || selectionType !== 'team') return

      setIsLoading(true)
      try {
        const response = await fetch('/api/tools/microsoft-teams/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: selectedCredentialId, workflowId }),
        })

        if (response.ok) {
          const data = await response.json()
          const team = data.teams.find((t: { id: string; displayName: string }) => t.id === teamId)
          if (team) {
            const teamInfo: TeamsMessageInfo = {
              id: team.id,
              displayName: team.displayName,
              type: 'team',
              teamId: team.id,
              webViewLink: `https://teams.microsoft.com/l/team/${team.id}`,
            }
            setSelectedTeamId(team.id)
            setSelectedMessage(teamInfo)
            onMessageInfoChange?.(teamInfo)
          }
        }
      } catch (error) {
        logger.error('Error restoring team selection:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [selectedCredentialId, selectionType, onMessageInfoChange, workflowId]
  )

  // Restore chat selection on page refresh
  const restoreChatSelection = useCallback(
    async (chatId: string) => {
      if (!selectedCredentialId || !chatId || selectionType !== 'chat') return

      setIsLoading(true)
      try {
        const response = await fetch('/api/tools/microsoft-teams/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: selectedCredentialId, workflowId }),
        })

        if (response.ok) {
          const data = await response.json()

          // Cache all chat names
          if (data.chats && selectedCredentialId) {
            const chatMap = data.chats.reduce(
              (acc: Record<string, string>, c: { id: string; displayName: string }) => {
                acc[c.id] = c.displayName
                return acc
              },
              {}
            )
            useDisplayNamesStore.getState().setDisplayNames('files', selectedCredentialId, chatMap)
          }

          const chat = data.chats.find((c: { id: string; displayName: string }) => c.id === chatId)
          if (chat) {
            const chatInfo: TeamsMessageInfo = {
              id: chat.id,
              displayName: chat.displayName,
              type: 'chat',
              chatId: chat.id,
              webViewLink: `https://teams.microsoft.com/l/chat/${chat.id}`,
            }
            setSelectedChatId(chat.id)
            setSelectedMessage(chatInfo)
            onMessageInfoChange?.(chatInfo)
          }
        }
      } catch (error) {
        logger.error('Error restoring chat selection:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [selectedCredentialId, selectionType, onMessageInfoChange, workflowId]
  )

  // Restore channel selection on page refresh
  const restoreChannelSelection = useCallback(
    async (channelId: string) => {
      if (!selectedCredentialId || !channelId || selectionType !== 'channel') return

      setIsLoading(true)
      try {
        // First fetch teams to search through them
        const teamsResponse = await fetch('/api/tools/microsoft-teams/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: selectedCredentialId, workflowId }),
        })

        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json()

          // Create parallel promises for all teams to search for the channel
          const channelSearchPromises = teamsData.teams.map(
            async (team: { id: string; displayName: string }) => {
              try {
                const channelsResponse = await fetch('/api/tools/microsoft-teams/channels', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    credential: selectedCredentialId,
                    teamId: team.id,
                    workflowId,
                  }),
                })

                if (channelsResponse.ok) {
                  const channelsData = await channelsResponse.json()
                  const channel = channelsData.channels.find(
                    (c: { id: string; displayName: string }) => c.id === channelId
                  )
                  if (channel) {
                    return {
                      team,
                      channel,
                      channelInfo: {
                        id: `${team.id}-${channel.id}`,
                        displayName: channel.displayName,
                        type: 'channel' as const,
                        teamId: team.id,
                        channelId: channel.id,
                        webViewLink: `https://teams.microsoft.com/l/channel/${team.id}/${encodeURIComponent(channel.displayName)}/${channel.id}`,
                      },
                    }
                  }
                }
              } catch (error) {
                logger.warn(
                  `Error searching for channel in team ${team.id}:`,
                  error instanceof Error ? error.message : String(error)
                )
              }
              return null
            }
          )

          // Wait for all parallel requests to complete (or fail)
          const results = await Promise.allSettled(channelSearchPromises)

          // Find the first successful result that contains our channel
          for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
              const { channelInfo } = result.value
              setSelectedTeamId(channelInfo.teamId!)
              setSelectedChannelId(channelInfo.channelId!)
              setSelectedMessage(channelInfo)
              onMessageInfoChange?.(channelInfo)
              return // Found the channel, exit successfully
            }
          }

          // If we get here, the channel wasn't found in any team
          logger.warn(`Channel ${channelId} not found in any accessible team`)
        }
      } catch (error) {
        logger.error('Error restoring channel selection:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [selectedCredentialId, selectionType, onMessageInfoChange, workflowId]
  )

  // Set initial team ID if provided
  useEffect(() => {
    if (initialTeamId && !selectedTeamId && selectionType === 'channel') {
      setSelectedTeamId(initialTeamId)
    }
  }, [initialTeamId, selectedTeamId, selectionType])

  // Clear selection when selectionType changes to allow proper restoration
  useEffect(() => {
    setSelectedMessage(null)
    setSelectedTeamId('')
    setSelectedChannelId('')
    setSelectedChatId('')
  }, [selectionType])

  // Fetch appropriate data on initial mount based on selectionType
  useEffect(() => {
    if (!initialFetchRef.current) {
      fetchCredentials()
      initialFetchRef.current = true
    }
  }, [fetchCredentials])

  // Keep local credential state in sync with persisted credential
  useEffect(() => {
    if (credential && credential !== selectedCredentialId) {
      setSelectedCredentialId(credential)
    }
  }, [credential, selectedCredentialId])

  // Restore selection whenever the canonical value changes
  useEffect(() => {
    if (value && selectedCredentialId) {
      // Only restore if we haven't already restored this value
      if (lastRestoredValueRef.current !== value) {
        lastRestoredValueRef.current = value

        if (selectionType === 'team') {
          restoreTeamSelection(value)
        } else if (selectionType === 'chat') {
          restoreChatSelection(value)
        } else if (selectionType === 'channel') {
          restoreChannelSelection(value)
        }
      }
    } else {
      lastRestoredValueRef.current = null
      setSelectedMessage(null)
    }
  }, [
    value,
    selectedCredentialId,
    selectionType,
    restoreTeamSelection,
    restoreChatSelection,
    restoreChannelSelection,
  ])

  // Determine empty message based on current state
  const emptyMessage = useMemo(() => {
    if (credentials.length === 0) {
      return `No accounts connected. Connect a Microsoft Teams account to ${
        selectionStage === 'chat'
          ? 'access your chats'
          : selectionStage === 'channel'
            ? 'see your channels'
            : 'continue'
      }.`
    }

    if (selectionStage === 'team') {
      return 'No teams found. Try a different account.'
    }

    if (selectionStage === 'channel') {
      if (!selectedTeamId) {
        return 'Please select a team first to see its channels.'
      }
      return 'This team has no channels or you may not have access.'
    }

    if (selectionStage === 'chat') {
      return 'No chats found. Try a different account or check if you have any active chats.'
    }

    return 'No items found.'
  }, [credentials.length, selectionStage, selectedTeamId])

  // Determine placeholder based on selection stage and type
  const placeholder = useMemo(() => {
    if (selectionType === 'channel' && selectionStage === 'team') {
      return 'Select a team first'
    }
    return label
  }, [selectionType, selectionStage, label])

  return (
    <>
      <div className='space-y-2'>
        <Combobox
          options={options}
          value={selectedMessageId}
          onChange={handleSelection}
          placeholder={placeholder}
          disabled={disabled || isForeignCredential}
          editable={true}
          isLoading={isLoading}
          error={error}
          getDisplayName={getDisplayName}
          renderOption={renderOption}
          onOpenChange={handleOpenChange}
          emptyMessage={emptyMessage}
          accountSwitcher={accountSwitcher}
          allowClear={false}
          className={isForeignCredential ? 'cursor-help' : undefined}
        />

        {/* Selection preview */}
        {showPreview && selectedMessage && (
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
                <MicrosoftTeamsIcon className='h-4 w-4' />
              </div>
              <div className='min-w-0 flex-1 overflow-hidden'>
                <div className='flex items-center gap-2'>
                  <h4 className='truncate font-medium text-xs'>{selectedMessage.displayName}</h4>
                  <span className='whitespace-nowrap text-muted-foreground text-xs'>
                    {selectedMessage.type}
                  </span>
                </div>
                {selectedMessage.webViewLink ? (
                  <a
                    href={selectedMessage.webViewLink}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-1 text-foreground text-xs hover:underline'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Open in Microsoft Teams</span>
                    <ExternalLink className='h-3 w-3' />
                  </a>
                ) : (
                  <></>
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
          toolName='Microsoft Teams'
          requiredScopes={requiredScopes}
          serviceId={getServiceId()}
        />
      )}
    </>
  )
}
