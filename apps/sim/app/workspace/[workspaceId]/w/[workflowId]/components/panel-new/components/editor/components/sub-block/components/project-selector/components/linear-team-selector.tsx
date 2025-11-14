import { useCallback, useEffect, useMemo } from 'react'
import { Combobox, type ComboboxOption } from '@/components/emcn'
import { LinearIcon } from '@/components/icons'
import { useResourceList } from '@/hooks/queries/resources'
import { useDisplayNamesStore } from '@/stores/display-names/store'

export interface LinearTeamInfo {
  id: string
  name: string
}

interface LinearTeamSelectorProps {
  value: string
  onChange: (teamId: string, teamInfo?: LinearTeamInfo) => void
  credential: string
  label?: string
  disabled?: boolean
  workflowId?: string
  showPreview?: boolean
  isForeignCredential?: boolean
}

export function LinearTeamSelector({
  value,
  onChange,
  credential,
  label = 'Select Linear team',
  disabled = false,
  workflowId,
  isForeignCredential = false,
}: LinearTeamSelectorProps) {
  // Fetch teams using React Query
  const {
    data: teams = [],
    isLoading,
    error: queryError,
    refetch,
  } = useResourceList<LinearTeamInfo>({
    resourceType: 'teams',
    credential,
    endpoint: '/api/tools/linear/teams',
    params: { workflowId },
  })

  const error = queryError ? (queryError as Error).message : null

  // Cache team names in display names store using dedicated 'teams' type
  useEffect(() => {
    if (credential && teams.length > 0) {
      const teamMap = teams.reduce((acc: Record<string, string>, team: LinearTeamInfo) => {
        acc[team.id] = team.name
        return acc
      }, {})
      useDisplayNamesStore.getState().setDisplayNames('teams', `linear-${credential}`, teamMap)
    }
  }, [credential, teams])

  // Get cached display name from the dedicated 'teams' cache
  const getDisplayName = useCallback(
    (teamId: string) => {
      if (isForeignCredential) return 'Saved by collaborator'
      if (!credential || !teamId) return null
      return useDisplayNamesStore.getState().cache.teams?.[`linear-${credential}`]?.[teamId] || null
    },
    [credential, isForeignCredential]
  )

  // Get cached team name to check if we need eager fetching
  const cachedTeamName = useMemo(() => {
    if (!credential || !value) return null
    return useDisplayNamesStore.getState().cache.teams?.[`linear-${credential}`]?.[value] || null
  }, [credential, value])

  // Eager caching: If we have a value but no cached name, fetch teams immediately
  // This fixes the bug where team names show "-" on page refresh until user clicks the block
  useEffect(() => {
    if (value && credential && !cachedTeamName && !isLoading) {
      refetch()
    }
  }, [value, credential, cachedTeamName, isLoading, refetch])

  // Convert teams to combobox options
  const options = useMemo<ComboboxOption[]>(() => {
    return teams.map((team: LinearTeamInfo) => ({
      label: team.name,
      value: team.id,
      icon: LinearIcon,
      metadata: team,
    }))
  }, [teams])

  const handleChange = (selectedValue: string, metadata?: any) => {
    const teamInfo = metadata as LinearTeamInfo | undefined
    onChange(selectedValue, teamInfo)
  }

  const emptyMessage = !credential
    ? 'Please configure Linear credentials.'
    : error
      ? error
      : 'No teams available for this Linear account.'

  return (
    <Combobox
      options={options}
      value={value}
      onChange={handleChange}
      placeholder={label}
      disabled={disabled || !credential}
      editable={true}
      isLoading={isLoading}
      error={error}
      getDisplayName={getDisplayName}
      icon={LinearIcon}
      emptyMessage={emptyMessage}
    />
  )
}
