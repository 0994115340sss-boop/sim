import { useCallback, useEffect, useMemo } from 'react'
import { Combobox, type ComboboxOption } from '@/components/emcn'
import { LinearIcon } from '@/components/icons'
import { useResourceList } from '@/hooks/queries/resources'
import { useDisplayNamesStore } from '@/stores/display-names/store'

export interface LinearProjectInfo {
  id: string
  name: string
}

interface LinearProjectSelectorProps {
  value: string
  onChange: (projectId: string, projectInfo?: LinearProjectInfo) => void
  credential: string
  teamId: string
  label?: string
  disabled?: boolean
  workflowId?: string
  isForeignCredential?: boolean
}

export function LinearProjectSelector({
  value,
  onChange,
  credential,
  teamId,
  label = 'Select Linear project',
  disabled = false,
  workflowId,
  isForeignCredential = false,
}: LinearProjectSelectorProps) {
  // Fetch projects using the generic hook
  const {
    data: projects = [],
    isLoading,
    error: queryError,
    refetch,
  } = useResourceList<LinearProjectInfo>({
    resourceType: 'projects',
    credential,
    endpoint: '/api/tools/linear/projects',
    params: { teamId, workflowId },
    enabled: !!credential && !!teamId,
  })

  // Get cached display name
  const getDisplayName = useCallback(
    (projectId: string) => {
      if (isForeignCredential) return 'Saved by collaborator'
      if (!credential || !projectId) return null
      return (
        useDisplayNamesStore.getState().cache.projects[`linear-${credential}`]?.[projectId] || null
      )
    },
    [credential, isForeignCredential]
  )

  // Cache project names in display names store when data changes
  useEffect(() => {
    if (credential && projects.length > 0) {
      const projectMap = projects.reduce((acc: Record<string, string>, proj: LinearProjectInfo) => {
        acc[proj.id] = proj.name
        return acc
      }, {})
      useDisplayNamesStore
        .getState()
        .setDisplayNames('projects', `linear-${credential}`, projectMap)
    }
  }, [credential, projects])

  // Get cached project name to check if we need eager fetching
  const cachedProjectName = useMemo(() => {
    if (!credential || !value) return null
    return useDisplayNamesStore.getState().cache.projects[`linear-${credential}`]?.[value] || null
  }, [credential, value])

  // Eager caching: If we have a value but no cached name, fetch projects immediately
  // This fixes the bug where project names show "-" on page refresh until user clicks the block
  useEffect(() => {
    if (value && credential && teamId && !cachedProjectName && !isLoading) {
      refetch()
    }
  }, [value, credential, teamId, cachedProjectName, isLoading, refetch])

  // Convert projects to combobox options
  const options = useMemo<ComboboxOption[]>(() => {
    return projects.map((project: LinearProjectInfo) => ({
      label: project.name,
      value: project.id,
      icon: LinearIcon,
      metadata: project,
    }))
  }, [projects])

  const handleChange = (selectedValue: string, metadata?: any) => {
    const projectInfo = metadata as LinearProjectInfo | undefined
    onChange(selectedValue, projectInfo)
  }

  const error = queryError ? String(queryError) : null

  const emptyMessage =
    !credential || !teamId
      ? 'Please configure Linear credentials and select a team.'
      : error
        ? error
        : 'No projects available for the selected team.'

  return (
    <Combobox
      options={options}
      value={value}
      onChange={handleChange}
      placeholder={label}
      disabled={disabled || !credential || !teamId}
      editable={true}
      isLoading={isLoading}
      error={error}
      getDisplayName={getDisplayName}
      icon={LinearIcon}
      emptyMessage={emptyMessage}
    />
  )
}
