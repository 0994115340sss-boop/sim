'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, FileText } from 'lucide-react'
import { Combobox, type ComboboxOption } from '@/components/emcn/components/combobox/combobox'
import { useDependsOnGate } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel-new/components/editor/components/sub-block/hooks/use-depends-on-gate'
import { useSubBlockValue } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel-new/components/editor/components/sub-block/hooks/use-sub-block-value'
import type { SubBlockConfig } from '@/blocks/types'
import { useDisplayNamesStore } from '@/stores/display-names/store'
import { type DocumentData, useKnowledgeStore } from '@/stores/knowledge/store'

interface DocumentSelectorProps {
  blockId: string
  subBlock: SubBlockConfig
  disabled?: boolean
  onDocumentSelect?: (documentId: string) => void
  isPreview?: boolean
  previewValue?: string | null
}

export function DocumentSelector({
  blockId,
  subBlock,
  disabled = false,
  onDocumentSelect,
  isPreview = false,
  previewValue,
}: DocumentSelectorProps) {
  const [error, setError] = useState<string | null>(null)

  const [storeValue, setStoreValue] = useSubBlockValue(blockId, subBlock.id)
  const [knowledgeBaseId] = useSubBlockValue(blockId, 'knowledgeBaseId')
  const normalizedKnowledgeBaseId =
    typeof knowledgeBaseId === 'string' && knowledgeBaseId.trim().length > 0
      ? knowledgeBaseId
      : null

  const documentsCache = useKnowledgeStore(
    useCallback(
      (state) =>
        normalizedKnowledgeBaseId ? state.documents[normalizedKnowledgeBaseId] : undefined,
      [normalizedKnowledgeBaseId]
    )
  )

  const isDocumentsLoading = useKnowledgeStore(
    useCallback(
      (state) =>
        normalizedKnowledgeBaseId ? state.isDocumentsLoading(normalizedKnowledgeBaseId) : false,
      [normalizedKnowledgeBaseId]
    )
  )

  const getDocuments = useKnowledgeStore((state) => state.getDocuments)

  const value = isPreview ? previewValue : storeValue

  const { finalDisabled } = useDependsOnGate(blockId, subBlock, { disabled, isPreview })
  const isDisabled = finalDisabled

  const documents = useMemo<DocumentData[]>(() => {
    if (!documentsCache) return []
    return documentsCache.documents ?? []
  }, [documentsCache])

  const loadDocuments = useCallback(async () => {
    if (!normalizedKnowledgeBaseId) {
      setError('No knowledge base selected')
      return
    }

    setError(null)

    try {
      const fetchedDocuments = await getDocuments(normalizedKnowledgeBaseId)

      if (fetchedDocuments.length > 0) {
        const documentMap = fetchedDocuments.reduce<Record<string, string>>((acc, doc) => {
          acc[doc.id] = doc.filename
          return acc
        }, {})

        useDisplayNamesStore
          .getState()
          .setDisplayNames('documents', normalizedKnowledgeBaseId, documentMap)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to fetch documents')
    }
  }, [normalizedKnowledgeBaseId, getDocuments])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isPreview || isDisabled) return

      if (isOpen && (!documentsCache || !documentsCache.documents.length)) {
        void loadDocuments()
      }
    },
    [isPreview, isDisabled, documentsCache, loadDocuments]
  )

  const handleChange = useCallback(
    (selectedValue: string) => {
      if (isPreview) return

      setStoreValue(selectedValue)
      onDocumentSelect?.(selectedValue)
    },
    [isPreview, setStoreValue, onDocumentSelect]
  )

  useEffect(() => {
    setError(null)
  }, [normalizedKnowledgeBaseId])

  useEffect(() => {
    if (!normalizedKnowledgeBaseId || documents.length === 0) return

    const documentMap = documents.reduce<Record<string, string>>((acc, doc) => {
      acc[doc.id] = doc.filename
      return acc
    }, {})

    useDisplayNamesStore
      .getState()
      .setDisplayNames('documents', normalizedKnowledgeBaseId as string, documentMap)
  }, [documents, normalizedKnowledgeBaseId])

  const getDocumentDescription = (document: DocumentData) => {
    const statusMap: Record<string, string> = {
      pending: 'Processing pending',
      processing: 'Processing...',
      completed: 'Ready',
      failed: 'Processing failed',
    }

    const status = statusMap[document.processingStatus] || document.processingStatus
    const chunkText = `${document.chunkCount} chunk${document.chunkCount !== 1 ? 's' : ''}`

    return `${status} • ${chunkText}`
  }

  /**
   * Convert documents to combobox options format
   */
  const options = useMemo<ComboboxOption[]>(() => {
    return documents.map((doc) => ({
      label: doc.filename,
      value: doc.id,
      icon: FileText,
      metadata: doc,
    }))
  }, [documents])

  /**
   * Custom render function for multi-line document display
   */
  const renderOption = useCallback(
    (option: ComboboxOption) => {
      const document = option.metadata as DocumentData
      const isSelected = document.id === value

      return (
        <>
          <div className='flex items-center gap-2 overflow-hidden'>
            <FileText className='h-4 w-4 text-muted-foreground' />
            <div className='min-w-0 flex-1 overflow-hidden'>
              <div className='truncate font-normal'>{option.label}</div>
              <div className='truncate text-muted-foreground text-xs'>
                {getDocumentDescription(document)}
              </div>
            </div>
          </div>
          {isSelected && <Check className='ml-auto h-4 w-4' />}
        </>
      )
    },
    [value, getDocumentDescription]
  )

  /**
   * Get display name from cache for selected document
   */
  const getDisplayName = useCallback(
    (documentId: string) => {
      if (!normalizedKnowledgeBaseId) return null
      return (
        useDisplayNamesStore.getState().cache.documents[normalizedKnowledgeBaseId]?.[documentId] ||
        null
      )
    },
    [normalizedKnowledgeBaseId]
  )

  /**
   * Custom empty state rendering based on conditions
   */
  const renderEmpty = useMemo(() => {
    if (isDocumentsLoading) {
      return (
        <div className='flex items-center justify-center p-4'>
          <span className='ml-2'>Loading documents...</span>
        </div>
      )
    }

    if (!normalizedKnowledgeBaseId) {
      return (
        <div className='p-4 text-center'>
          <p className='font-medium text-sm'>No knowledge base selected</p>
          <p className='text-muted-foreground text-xs'>Please select a knowledge base first.</p>
        </div>
      )
    }

    return (
      <div className='p-4 text-center'>
        <p className='font-medium text-sm'>No documents found</p>
        <p className='text-muted-foreground text-xs'>
          Upload documents to this knowledge base to get started.
        </p>
      </div>
    )
  }, [isDocumentsLoading, normalizedKnowledgeBaseId])

  const label = subBlock.placeholder || 'Select document'

  return (
    <Combobox
      options={options}
      value={(value as string) ?? ''}
      onChange={handleChange}
      placeholder={label}
      disabled={isDisabled}
      editable={true}
      isLoading={isDocumentsLoading && !error}
      error={error}
      getDisplayName={getDisplayName}
      renderOption={renderOption}
      renderEmpty={renderEmpty}
      onOpenChange={handleOpenChange}
    />
  )
}
