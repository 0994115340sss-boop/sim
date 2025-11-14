'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/emcn/components/button/button'
import { Combobox, type ComboboxOption } from '@/components/emcn/components/combobox/combobox'
import { GoogleCalendarIcon } from '@/components/icons'
import { createLogger } from '@/lib/logs/console/logger'
import { useDisplayNamesStore } from '@/stores/display-names/store'

const logger = createLogger('GoogleCalendarSelector')

export interface GoogleCalendarInfo {
  id: string
  summary: string
  description?: string
  primary?: boolean
  accessRole: string
  backgroundColor?: string
  foregroundColor?: string
}

interface GoogleCalendarSelectorProps {
  value: string
  onChange: (value: string, calendarInfo?: GoogleCalendarInfo) => void
  label?: string
  disabled?: boolean
  showPreview?: boolean
  onCalendarInfoChange?: (info: GoogleCalendarInfo | null) => void
  credentialId: string
  workflowId?: string
}

export function GoogleCalendarSelector({
  value,
  onChange,
  label = 'Select Google Calendar',
  disabled = false,
  showPreview = true,
  onCalendarInfoChange,
  credentialId,
  workflowId,
}: GoogleCalendarSelectorProps) {
  const [calendars, setCalendars] = useState<GoogleCalendarInfo[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState(value)
  const [selectedCalendar, setSelectedCalendar] = useState<GoogleCalendarInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialFetchDone, setInitialFetchDone] = useState(false)

  const fetchCalendarsFromAPI = useCallback(async (): Promise<GoogleCalendarInfo[]> => {
    if (!credentialId) {
      throw new Error('Google Calendar account is required')
    }

    const queryParams = new URLSearchParams({
      credentialId: credentialId,
    })
    if (workflowId) {
      queryParams.set('workflowId', workflowId)
    }

    const response = await fetch(`/api/tools/google_calendar/calendars?${queryParams.toString()}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fetch Google Calendar calendars')
    }

    const data = await response.json()
    return data.calendars || []
  }, [credentialId])

  const fetchCalendars = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const calendars = await fetchCalendarsFromAPI()
      setCalendars(calendars)

      // Cache calendar names
      if (credentialId && calendars.length > 0) {
        const calendarMap = calendars.reduce<Record<string, string>>((acc, cal) => {
          acc[cal.id] = cal.summary
          return acc
        }, {})
        useDisplayNamesStore.getState().setDisplayNames('files', credentialId, calendarMap)
      }

      // Update selected calendar if we have a value
      if (selectedCalendarId && calendars.length > 0) {
        const calendar = calendars.find((c) => c.id === selectedCalendarId)
        setSelectedCalendar(calendar || null)
      }
    } catch (error) {
      logger.error('Error fetching calendars:', error)
      setError((error as Error).message)
      setCalendars([])
    } finally {
      setIsLoading(false)
      setInitialFetchDone(true)
    }
  }, [fetchCalendarsFromAPI, credentialId])

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && credentialId && (!initialFetchDone || calendars.length === 0)) {
      fetchCalendars()
    }
  }

  // Sync selected ID with external value
  useEffect(() => {
    if (value !== selectedCalendarId) {
      setSelectedCalendarId(value)
    }
  }, [value, selectedCalendarId])

  // Handle calendar selection
  const handleSelectCalendar = (calendarId: string) => {
    const calendar = calendars.find((c) => c.id === calendarId)
    if (calendar) {
      setSelectedCalendarId(calendar.id)
      setSelectedCalendar(calendar)
      onChange(calendar.id, calendar)
      onCalendarInfoChange?.(calendar)
    }
  }

  // Clear selection
  const handleClearSelection = () => {
    setSelectedCalendarId('')
    onChange('', undefined)
    onCalendarInfoChange?.(null)
    setError(null)
  }

  // Get calendar display name
  const getCalendarDisplayName = (calendar: GoogleCalendarInfo) => {
    if (calendar.primary) {
      return `${calendar.summary} (Primary)`
    }
    return calendar.summary
  }

  // Convert calendars to ComboboxOption format
  const options: ComboboxOption[] = useMemo(() => {
    return calendars.map((calendar) => ({
      label: getCalendarDisplayName(calendar),
      value: calendar.id,
      disabled: false,
    }))
  }, [calendars])

  // Get display name from cache
  const getDisplayNameFromCache = useCallback(
    (calendarId: string) => {
      if (!credentialId) return null
      const displayNames = useDisplayNamesStore.getState().displayNames
      const calendarNames = displayNames.files?.[credentialId]
      return calendarNames?.[calendarId] || null
    },
    [credentialId]
  )

  // Icon component
  const CalendarIcon = useMemo(() => {
    return () => <GoogleCalendarIcon className='h-4 w-4' />
  }, [])

  // Render custom option with calendar color indicator
  const renderOption = useCallback(
    (option: ComboboxOption) => {
      const calendar = calendars.find((c) => c.id === option.value)
      if (!calendar) return null

      return (
        <div className='flex items-center gap-2 overflow-hidden'>
          <div
            className='h-3 w-3 flex-shrink-0 rounded-full'
            style={{
              backgroundColor: calendar.backgroundColor || '#4285f4',
            }}
          />
          <span className='truncate font-normal'>{option.label}</span>
        </div>
      )
    },
    [calendars]
  )

  // Render empty state
  const renderEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <div className='flex items-center justify-center py-4'>
          <RefreshCw className='h-4 w-4 animate-spin' />
          <span className='ml-2'>Loading calendars...</span>
        </div>
      )
    }
    if (error) {
      return (
        <div className='p-4 text-center'>
          <p className='text-destructive text-sm'>{error}</p>
        </div>
      )
    }
    return (
      <div className='p-4 text-center'>
        <p className='font-medium text-sm'>No calendars found</p>
        <p className='text-muted-foreground text-xs'>
          Please check your Google Calendar account access
        </p>
      </div>
    )
  }, [isLoading, error])

  return (
    <div className='space-y-2'>
      <Combobox
        options={options}
        value={selectedCalendarId}
        onChange={handleSelectCalendar}
        placeholder={label}
        disabled={disabled || !credentialId}
        editable={true}
        isLoading={isLoading}
        onOpenChange={handleOpenChange}
        getDisplayName={getDisplayNameFromCache}
        renderOption={renderOption}
        renderEmpty={renderEmpty}
      />

      {showPreview && selectedCalendar && (
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
              <div
                className='h-3 w-3 rounded-full'
                style={{
                  backgroundColor: selectedCalendar.backgroundColor || '#4285f4',
                }}
              />
            </div>
            <div className='min-w-0 flex-1 overflow-hidden'>
              <h4 className='truncate font-medium text-xs'>
                {getCalendarDisplayName(selectedCalendar)}
              </h4>
              <div className='text-muted-foreground text-xs'>
                Access: {selectedCalendar.accessRole}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
