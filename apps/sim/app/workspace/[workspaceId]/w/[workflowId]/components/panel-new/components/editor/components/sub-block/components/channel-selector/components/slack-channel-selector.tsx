import { type ComponentType, useCallback, useEffect, useMemo } from 'react'
import { Check, Hash, Lock } from 'lucide-react'
import { Combobox, type ComboboxOption } from '@/components/emcn/components/combobox/combobox'
import { SlackIcon } from '@/components/icons'
import { useResourceList } from '@/hooks/queries/resources'
import { useDisplayNamesStore } from '@/stores/display-names/store'

export interface SlackChannelInfo {
  id: string
  name: string
  isPrivate: boolean
}

interface SlackChannelSelectorProps {
  value: string
  onChange: (channelId: string, channelInfo?: SlackChannelInfo) => void
  credential: string
  label?: string
  disabled?: boolean
  workflowId?: string
  isForeignCredential?: boolean
}

export function SlackChannelSelector({
  value,
  onChange,
  credential,
  label = 'Select Slack channel',
  disabled = false,
  workflowId,
  isForeignCredential = false,
}: SlackChannelSelectorProps) {
  // Fetch all channels using React Query
  const {
    data: channels = [],
    isLoading: loading,
    error: channelsError,
    refetch: refetchChannels,
  } = useResourceList<SlackChannelInfo>({
    resourceType: 'channels',
    credential,
    endpoint: '/api/tools/slack/channels',
    params: { workflowId },
  })

  // Fetch metadata for the selected channel (if value exists but not in channels list yet)
  // This ensures the selected channel name displays on mount before the full list loads
  // Note: We fetch the full channels list again to populate the cache and find the selected channel
  const shouldFetchMetadata = !!value && !!credential && channels.length === 0
  const { data: metadataChannels = [] } = useResourceList<SlackChannelInfo>({
    resourceType: 'channels',
    credential,
    endpoint: '/api/tools/slack/channels',
    params: { workflowId },
    enabled: shouldFetchMetadata,
  })

  // Extract the selected channel from the metadata fetch
  const selectedChannelMeta = useMemo(() => {
    if (!value || metadataChannels.length === 0) return undefined
    return metadataChannels.find((ch: SlackChannelInfo) => ch.id === value)
  }, [value, metadataChannels])

  // Merge selected channel metadata with channels list
  // This ensures we always have the selected channel info for display
  const allChannels = useMemo(() => {
    if (!selectedChannelMeta) return channels

    // Check if selected channel is already in the list
    const channelExists = channels.some((ch: SlackChannelInfo) => ch.id === selectedChannelMeta.id)
    if (channelExists) return channels

    // Add the selected channel to the beginning of the list
    return [selectedChannelMeta, ...channels]
  }, [channels, selectedChannelMeta])

  // Cache channel names in display names store (for backward compatibility)
  useEffect(() => {
    if (credential && allChannels.length > 0) {
      const channelMap = allChannels.reduce((acc: Record<string, string>, ch: SlackChannelInfo) => {
        acc[ch.id] = `#${ch.name}`
        return acc
      }, {})
      useDisplayNamesStore.getState().setDisplayNames('channels', credential, channelMap)
    }
  }, [credential, allChannels])

  // Get cached display name (fallback for edge cases)
  const cachedChannelName = useDisplayNamesStore(
    useCallback(
      (state) => {
        if (!credential || !value) return null
        return state.cache.channels[credential]?.[value] || null
      },
      [credential, value]
    )
  )

  // Eager caching: If we have a value but no cached name, fetch channels immediately
  // This fixes the bug where channel names show "-" on page refresh until user clicks the block
  useEffect(() => {
    if (value && credential && !cachedChannelName && !loading && !isForeignCredential) {
      refetchChannels()
    }
  }, [value, credential, cachedChannelName, loading, isForeignCredential, refetchChannels])

  // Handle dropdown open/close - refetch channels when opening
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && credential) {
      refetchChannels()
    }
  }

  const error = channelsError ? (channelsError as Error).message : null

  // Convert channels to ComboboxOption format
  const channelOptions: ComboboxOption[] = allChannels.map((channel: SlackChannelInfo) => ({
    label: channel.name,
    value: channel.id,
    icon: SlackIcon as ComponentType<{ className?: string }>,
    metadata: channel,
    badge: channel.isPrivate ? 'Private' : undefined,
  }))

  // Get display name from cache
  const getDisplayName = useCallback(
    (channelId: string) => {
      if (!credential || !channelId) return null
      return cachedChannelName
    },
    [credential, cachedChannelName]
  )

  // Custom render for each channel option
  const renderChannelOption = useCallback(
    (option: ComboboxOption) => {
      const channel = option.metadata as SlackChannelInfo
      const ChannelIcon = channel.isPrivate ? Lock : Hash

      return (
        <>
          <ChannelIcon className='mr-[8px] h-3 w-3 flex-shrink-0 opacity-60' />
          <span className='flex-1 truncate text-[var(--text-primary)]'>{option.label}</span>
          {option.badge && (
            <span className='ml-[8px] rounded-[4px] bg-[var(--surface-11)] px-[6px] py-[2px] text-[var(--text-muted)] text-xs'>
              {option.badge}
            </span>
          )}
          {option.value === value && <Check className='ml-[8px] h-4 w-4 flex-shrink-0' />}
        </>
      )
    },
    [value]
  )

  // Error message for empty state
  const emptyMessage = !credential
    ? 'Please configure Slack credentials.'
    : 'No channels available for this Slack workspace.'

  // Get selected channel for overlay
  const selectedChannel = useMemo(() => {
    if (!value) return null
    return allChannels.find((ch: SlackChannelInfo) => ch.id === value)
  }, [value, allChannels])

  // Overlay content to show display name instead of ID
  const overlayContent = useMemo(() => {
    if (!selectedChannel) return null
    const ChannelIcon = selectedChannel.isPrivate ? Lock : Hash
    return (
      <div className='flex items-center truncate'>
        <SlackIcon className='mr-[8px] h-3 w-3 flex-shrink-0 text-[#611f69]' />
        <ChannelIcon className='mr-[8px] h-3 w-3 flex-shrink-0 opacity-60' />
        <span className='truncate'>#{selectedChannel.name}</span>
      </div>
    )
  }, [selectedChannel])

  return (
    <Combobox
      options={channelOptions}
      value={value}
      onChange={(channelId, metadata) => {
        const channelInfo = metadata as SlackChannelInfo | undefined
        onChange(channelId, channelInfo)
      }}
      placeholder={label}
      disabled={disabled || !credential}
      editable={true}
      overlayContent={overlayContent}
      isLoading={loading}
      error={error}
      getDisplayName={getDisplayName}
      renderOption={renderChannelOption}
      onOpenChange={handleOpenChange}
      emptyMessage={emptyMessage}
      className={isForeignCredential ? 'cursor-help' : undefined}
    />
  )
}
