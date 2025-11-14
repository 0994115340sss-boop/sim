import { useCallback, useEffect, useState } from 'react'
import type { SubBlockConfig } from '@/blocks/types'
import { useDisplayNamesStore } from '@/stores/display-names/store'
import { useKnowledgeStore } from '@/stores/knowledge/store'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'

/**
 * Generic hook to get display name for any selector value
 *
 * Now relies on selector components to cache their own display names.
 * This hook simply reads from the cache and handles special cases like
 * knowledge bases, documents, and workflows.
 */
export function useDisplayName(
  subBlock: SubBlockConfig | undefined,
  value: unknown,
  context?: {
    workspaceId?: string
    credentialId?: string
    provider?: string
    knowledgeBaseId?: string
    domain?: string
    teamId?: string
    projectId?: string
    planId?: string
  }
): { displayName: string | null; isLoading: boolean } {
  const getCachedKnowledgeBase = useKnowledgeStore((state) => state.getCachedKnowledgeBase)
  const getKnowledgeBase = useKnowledgeStore((state) => state.getKnowledgeBase)
  const getDocuments = useKnowledgeStore((state) => state.getDocuments)
  const [isFetching, setIsFetching] = useState(false)

  const cachedDisplayName = useDisplayNamesStore(
    useCallback(
      (state) => {
        if (!subBlock || !value || typeof value !== 'string') return null

        // Channels
        if (subBlock.type === 'channel-selector' && context?.credentialId) {
          return state.cache.channels[context.credentialId]?.[value] || null
        }

        // Workflows
        if (subBlock.id === 'workflowId') {
          return state.cache.workflows.global?.[value] || null
        }

        // Files
        if (subBlock.type === 'file-selector' && context?.credentialId) {
          return state.cache.files[context.credentialId]?.[value] || null
        }

        // Folders
        if (subBlock.type === 'folder-selector' && context?.credentialId) {
          return state.cache.folders[context.credentialId]?.[value] || null
        }

        // Projects
        if (subBlock.type === 'project-selector' && context?.provider && context?.credentialId) {
          const projectContext = `${context.provider}-${context.credentialId}`
          return state.cache.projects[projectContext]?.[value] || null
        }

        // Documents
        if (subBlock.type === 'document-selector' && context?.knowledgeBaseId) {
          return state.cache.documents[context.knowledgeBaseId]?.[value] || null
        }

        return null
      },
      [subBlock, value, context?.credentialId, context?.provider, context?.knowledgeBaseId]
    )
  )

  // Auto-fetch knowledge bases if needed
  useEffect(() => {
    if (
      subBlock?.type === 'knowledge-base-selector' &&
      typeof value === 'string' &&
      value &&
      !isFetching
    ) {
      const kb = getCachedKnowledgeBase(value)
      if (!kb) {
        setIsFetching(true)
        getKnowledgeBase(value)
          .catch(() => {
            // Silently fail
          })
          .finally(() => {
            setIsFetching(false)
          })
      }
    }
  }, [subBlock?.type, value, isFetching, getCachedKnowledgeBase, getKnowledgeBase])

  // Auto-fetch documents if needed
  useEffect(() => {
    if (
      subBlock?.type === 'document-selector' &&
      context?.knowledgeBaseId &&
      typeof value === 'string' &&
      value &&
      !cachedDisplayName &&
      !isFetching
    ) {
      setIsFetching(true)
      getDocuments(context.knowledgeBaseId)
        .then((docs) => {
          if (docs.length > 0) {
            const documentMap = docs.reduce<Record<string, string>>((acc, doc) => {
              acc[doc.id] = doc.filename
              return acc
            }, {})
            useDisplayNamesStore
              .getState()
              .setDisplayNames('documents', context.knowledgeBaseId!, documentMap)
          }
        })
        .catch(() => {
          // Silently fail
        })
        .finally(() => {
          setIsFetching(false)
        })
    }
  }, [subBlock?.type, value, context?.knowledgeBaseId, cachedDisplayName, isFetching, getDocuments])

  // Auto-fetch channels if needed
  useEffect(() => {
    if (
      subBlock?.type === 'channel-selector' &&
      context?.credentialId &&
      typeof value === 'string' &&
      value &&
      !cachedDisplayName &&
      !isFetching
    ) {
      setIsFetching(true)

      // Determine the endpoint based on provider
      const endpoint =
        context.provider === 'slack'
          ? '/api/tools/slack/channels'
          : context.provider === 'discord'
            ? '/api/tools/discord/channels'
            : null

      if (!endpoint) {
        setIsFetching(false)
        return
      }

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: context.credentialId,
          ...(context.workspaceId && { workflowId: context.workspaceId }),
        }),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error('Failed to fetch channels')
          const data = await response.json()
          const channels = data.channels || data.items || data.results || []

          if (channels.length > 0) {
            const channelMap = channels.reduce(
              (acc: Record<string, string>, ch: any) => {
                acc[ch.id] = context.provider === 'slack' ? `#${ch.name}` : ch.name
                return acc
              },
              {} as Record<string, string>
            )
            useDisplayNamesStore
              .getState()
              .setDisplayNames('channels', context.credentialId!, channelMap)
          }
        })
        .catch(() => {
          // Silently fail
        })
        .finally(() => {
          setIsFetching(false)
        })
    }
  }, [
    subBlock?.type,
    value,
    context?.credentialId,
    context?.provider,
    context?.workspaceId,
    cachedDisplayName,
    isFetching,
  ])

  // Auto-fetch workflows if needed
  useEffect(() => {
    if (subBlock?.id !== 'workflowId' || typeof value !== 'string' || !value) return
    if (cachedDisplayName || isFetching) return

    const workflows = useWorkflowRegistry.getState().workflows
    if (!workflows[value]) return

    const workflowMap = Object.entries(workflows).reduce<Record<string, string>>(
      (acc, [id, workflow]) => {
        acc[id] = workflow.name || `Workflow ${id.slice(0, 8)}`
        return acc
      },
      {}
    )

    useDisplayNamesStore.getState().setDisplayNames('workflows', 'global', workflowMap)
  }, [subBlock?.id, value, cachedDisplayName, isFetching])

  if (!subBlock || !value || typeof value !== 'string') {
    return { displayName: null, isLoading: false }
  }

  // Credentials - handled separately by useCredentialDisplay
  if (subBlock.type === 'oauth-input') {
    return { displayName: null, isLoading: false }
  }

  // Knowledge Bases - use existing knowledge store
  if (subBlock.type === 'knowledge-base-selector') {
    const kb = getCachedKnowledgeBase(value)
    return { displayName: kb?.name || null, isLoading: isFetching }
  }

  // Documents - use cached display name
  if (subBlock.type === 'document-selector') {
    return { displayName: cachedDisplayName, isLoading: isFetching }
  }

  // Workflows - use cached display name
  if (subBlock.id === 'workflowId') {
    return { displayName: cachedDisplayName, isLoading: false }
  }

  // All other selectors (channels, folders, projects, files, teams, issues)
  // now cache their own display names directly, so we just read from the cache
  return { displayName: cachedDisplayName, isLoading: false }
}
