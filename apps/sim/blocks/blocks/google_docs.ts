import { GoogleDocsIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import { AuthMode } from '@/blocks/types'
import type { GoogleDocsResponse } from '@/tools/google_docs/types'

export const GoogleDocsBlock: BlockConfig<GoogleDocsResponse> = {
  type: 'google_docs',
  name: 'Google Docs',
  description: 'Read, write, and create documents',
  authMode: AuthMode.OAuth,
  longDescription:
    'Integrate Google Docs into the workflow. Can read, write, and create documents.',
  docsLink: 'https://docs.sim.ai/tools/google_docs',
  category: 'tools',
  bgColor: '#E0E0E0',
  icon: GoogleDocsIcon,
  subBlocks: [
    // Operation selector
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { label: 'Read Document', id: 'read' },
        { label: 'Write to Document', id: 'write' },
        { label: 'Create Document', id: 'create' },
      ],
      value: () => 'read',
    },
    // Google Docs Credentials
    {
      id: 'credential',
      title: 'Google Account',
      type: 'oauth-input',
      required: true,
      serviceId: 'google-docs',
      requiredScopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive',
      ],
      placeholder: 'Select Google account',
    },
    // Document selector (basic mode)
    {
      id: 'documentId',
      title: 'Select Document',
      type: 'file-selector',
      canonicalParamId: 'documentId',
      serviceId: 'google-docs',
      requiredScopes: [],
      mimeType: 'application/vnd.google-apps.document',
      placeholder: 'Select a document',
      dependsOn: ['credential'],
      mode: 'basic',
      condition: { field: 'operation', value: ['read', 'write'] },
    },
    // Manual document ID input (advanced mode)
    {
      id: 'manualDocumentId',
      title: 'Document ID',
      type: 'short-input',
      canonicalParamId: 'documentId',
      placeholder: 'Enter document ID',
      dependsOn: ['credential'],
      mode: 'advanced',
      condition: { field: 'operation', value: ['read', 'write'] },
    },
    // Create-specific Fields
    {
      id: 'title',
      title: 'Document Title',
      type: 'short-input',
      placeholder: 'Enter title for the new document',
      condition: { field: 'operation', value: 'create' },
      required: true,
    },
    // Folder selector (basic mode)
    {
      id: 'folderSelector',
      title: 'Select Parent Folder',
      type: 'file-selector',
      canonicalParamId: 'folderId',
      serviceId: 'google-docs',
      requiredScopes: [],
      mimeType: 'application/vnd.google-apps.folder',
      placeholder: 'Select a parent folder',
      dependsOn: ['credential'],
      mode: 'basic',
      condition: { field: 'operation', value: 'create' },
    },
    // Manual folder ID input (advanced mode)
    {
      id: 'folderId',
      title: 'Parent Folder ID',
      type: 'short-input',
      canonicalParamId: 'folderId',
      placeholder: 'Enter parent folder ID (leave empty for root folder)',
      dependsOn: ['credential'],
      mode: 'advanced',
      condition: { field: 'operation', value: 'create' },
    },
    // Content Field for write operation
    {
      id: 'content',
      title: 'Content',
      type: 'long-input',
      placeholder: 'Enter document content',
      condition: { field: 'operation', value: 'write' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert document writer. Create clear, professional content for Google Docs.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.data>\`, \`<function1.result>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{COMPANY_NAME}}\`)

### GUIDELINES
1. **Structure**: Use clear headings and sections
2. **Professional Tone**: Write clearly and professionally
3. **Formatting**: Use paragraphs, lists, and emphasis
4. **Completeness**: Include all relevant information
5. **Readability**: Keep sentences and paragraphs concise

### EXAMPLES

**Report**: "Write a weekly status report"
→ Weekly Status Report
Week of January 15, 2024

Executive Summary
This week saw significant progress on our key initiatives with completion of Phase 1 development.

Accomplishments
• Completed user authentication module
• Deployed staging environment
• Conducted security review

In Progress
• Database optimization (75% complete)
• API documentation updates
• Performance testing

Blockers
• Awaiting design approval for dashboard redesign

Next Week's Priorities
1. Complete database optimization
2. Begin Phase 2 development
3. Stakeholder review meeting

**With variables**: "Create document from data"
→ <agent1.document_title>

Date: <function1.date>
Author: {{AUTHOR_NAME}}

Overview
<agent1.summary>

Details
<function1.content>

Next Steps
<agent1.action_items>

### REMEMBER
Write clear, professional content. Structure with headings and lists.`,
        placeholder: 'Describe the document content...',
        generationType: 'markdown-content',
      },
    },
    // Content Field for create operation
    {
      id: 'content',
      title: 'Content',
      type: 'long-input',
      placeholder: 'Enter document content',
      condition: { field: 'operation', value: 'create' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert document writer. Create clear, professional content for Google Docs.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax

### GUIDELINES
1. Use clear headings and sections
2. Write professionally and concisely
3. Use bullet points and numbered lists
4. Include all relevant information

### REMEMBER
Write clear, professional content. Structure with headings and lists.`,
        placeholder: 'Describe the document content...',
        generationType: 'markdown-content',
      },
    },
  ],
  tools: {
    access: ['google_docs_read', 'google_docs_write', 'google_docs_create'],
    config: {
      tool: (params) => {
        switch (params.operation) {
          case 'read':
            return 'google_docs_read'
          case 'write':
            return 'google_docs_write'
          case 'create':
            return 'google_docs_create'
          default:
            throw new Error(`Invalid Google Docs operation: ${params.operation}`)
        }
      },
      params: (params) => {
        const { credential, documentId, manualDocumentId, folderSelector, folderId, ...rest } =
          params

        const effectiveDocumentId = (documentId || manualDocumentId || '').trim()
        const effectiveFolderId = (folderSelector || folderId || '').trim()

        return {
          ...rest,
          documentId: effectiveDocumentId || undefined,
          folderId: effectiveFolderId || undefined,
          credential,
        }
      },
    },
  },
  inputs: {
    operation: { type: 'string', description: 'Operation to perform' },
    credential: { type: 'string', description: 'Google Docs access token' },
    documentId: { type: 'string', description: 'Document identifier' },
    manualDocumentId: { type: 'string', description: 'Manual document identifier' },
    title: { type: 'string', description: 'Document title' },
    folderSelector: { type: 'string', description: 'Selected folder' },
    folderId: { type: 'string', description: 'Folder identifier' },
    content: { type: 'string', description: 'Document content' },
  },
  outputs: {
    content: { type: 'string', description: 'Document content' },
    metadata: { type: 'json', description: 'Document metadata' },
    updatedContent: { type: 'boolean', description: 'Content update status' },
  },
}
