import { NotionIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import { AuthMode } from '@/blocks/types'
import type { NotionResponse } from '@/tools/notion/types'

export const NotionBlock: BlockConfig<NotionResponse> = {
  type: 'notion',
  name: 'Notion',
  description: 'Manage Notion pages',
  authMode: AuthMode.OAuth,
  longDescription:
    'Integrate with Notion into the workflow. Can read page, read database, create page, create database, append content, query database, and search workspace.',
  docsLink: 'https://docs.sim.ai/tools/notion',
  category: 'tools',
  bgColor: '#181C1E',
  icon: NotionIcon,
  subBlocks: [
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { label: 'Read Page', id: 'notion_read' },
        { label: 'Read Database', id: 'notion_read_database' },
        { label: 'Create Page', id: 'notion_create_page' },
        { label: 'Create Database', id: 'notion_create_database' },
        { label: 'Append Content', id: 'notion_write' },
        { label: 'Query Database', id: 'notion_query_database' },
        { label: 'Search Workspace', id: 'notion_search' },
      ],
      value: () => 'notion_read',
    },
    {
      id: 'credential',
      title: 'Notion Account',
      type: 'oauth-input',
      serviceId: 'notion',
      requiredScopes: ['workspace.content', 'workspace.name', 'page.read', 'page.write'],
      placeholder: 'Select Notion account',
      required: true,
    },
    // Read/Write operation - Page ID
    {
      id: 'pageId',
      title: 'Page ID',
      type: 'short-input',
      placeholder: 'Enter Notion page ID',
      condition: {
        field: 'operation',
        value: 'notion_read',
      },
      required: true,
    },
    {
      id: 'databaseId',
      title: 'Database ID',
      type: 'short-input',
      placeholder: 'Enter Notion database ID',
      condition: {
        field: 'operation',
        value: 'notion_read_database',
      },
      required: true,
    },
    {
      id: 'pageId',
      title: 'Page ID',
      type: 'short-input',
      placeholder: 'Enter Notion page ID',
      condition: {
        field: 'operation',
        value: 'notion_write',
      },
      required: true,
    },
    // Create operation fields
    {
      id: 'parentId',
      title: 'Parent Page ID',
      type: 'short-input',
      placeholder: 'ID of parent page',
      condition: { field: 'operation', value: 'notion_create_page' },
      required: true,
    },
    {
      id: 'title',
      title: 'Page Title',
      type: 'short-input',
      placeholder: 'Title for the new page',
      condition: {
        field: 'operation',
        value: 'notion_create_page',
      },
    },
    // Content input for write/create operations
    {
      id: 'content',
      title: 'Content',
      type: 'long-input',
      placeholder: 'Enter content to add to the page',
      condition: {
        field: 'operation',
        value: 'notion_write',
      },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert at writing Notion content. Create well-structured, readable content using markdown.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.data>\`, \`<function1.result>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{TEAM_NAME}}\`)

### NOTION FORMATTING
Notion supports markdown:
- **bold** and *italic*
- # ## ### headers
- - bullet lists
- 1. numbered lists
- - [ ] todo items
- > callouts/quotes
- \`code\` and \`\`\`code blocks\`\`\`
- [links](url)
- --- dividers

### GUIDELINES
1. **Structure**: Use headers to organize content
2. **Scannable**: Use bullet points and short paragraphs
3. **Visual**: Use callouts and dividers for emphasis
4. **Actionable**: Include todo items where relevant
5. **Links**: Reference related pages or resources

### EXAMPLES

**Meeting notes**: "Write meeting notes template"
→ # Meeting Notes

## Date
<function1.date>

## Attendees
- <agent1.attendees>

## Agenda
1. Review previous action items
2. Project updates
3. New business

## Discussion Points
- Point 1
- Point 2

## Action Items
- [ ] Action 1 - @owner
- [ ] Action 2 - @owner

## Next Steps
Schedule follow-up for next week.

---
*Notes taken by {{USER_NAME}}*

### REMEMBER
Use markdown formatting. Create scannable, well-organized content.`,
        placeholder: 'Describe the content you want to write...',
        generationType: 'markdown-content',
      },
    },
    {
      id: 'content',
      title: 'Content',
      type: 'long-input',
      placeholder: 'Enter content to add to the page',
      condition: {
        field: 'operation',
        value: 'notion_create_page',
      },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert at writing Notion page content. Create well-structured, readable content using markdown.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax

### NOTION FORMATTING
- **bold** and *italic*
- # ## ### headers
- - bullet lists and 1. numbered lists
- - [ ] todo items
- > callouts/quotes
- \`code\` and \`\`\`code blocks\`\`\`

### GUIDELINES
1. Use headers to organize content
2. Keep paragraphs short and scannable
3. Use bullet points for lists
4. Include action items where relevant

### REMEMBER
Use markdown. Create well-organized, readable content.`,
        placeholder: 'Describe the page content...',
        generationType: 'markdown-content',
      },
    },
    // Query Database Fields
    {
      id: 'databaseId',
      title: 'Database ID',
      type: 'short-input',
      placeholder: 'Enter Notion database ID',
      condition: { field: 'operation', value: 'notion_query_database' },
      required: true,
    },
    {
      id: 'filter',
      title: 'Filter (JSON)',
      type: 'long-input',
      placeholder: 'Enter filter conditions as JSON (optional)',
      condition: { field: 'operation', value: 'notion_query_database' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Notion API developer. Generate Notion database filter JSON based on the user's request.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.status>\`, \`<function1.result.date>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DEFAULT_STATUS}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY valid JSON filter. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### NOTION FILTER SYNTAX
Filters use property-based conditions with operators:
- **equals, does_not_equal**: Exact match
- **contains, does_not_contain**: Text contains
- **starts_with, ends_with**: Text patterns
- **is_empty, is_not_empty**: Existence check
- **greater_than, less_than, etc.**: Comparisons for numbers/dates

Compound filters use:
- **and**: Array of conditions (all must match)
- **or**: Array of conditions (any must match)

### EXAMPLES

**Simple filter**: "Filter where Status is Done"
→ {"property": "Status", "status": {"equals": "Done"}}

**With variables**: "Filter by status from previous block"
→ {"property": "Status", "status": {"equals": <agent1.selected_status>}}

**AND conditions**: "Status is Active and Priority is High"
→ {"and": [
  {"property": "Status", "status": {"equals": "Active"}},
  {"property": "Priority", "select": {"equals": "High"}}
]}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the filter conditions...',
        generationType: 'json-object',
      },
    },
    {
      id: 'sorts',
      title: 'Sort Criteria (JSON)',
      type: 'long-input',
      placeholder: 'Enter sort criteria as JSON array (optional)',
      condition: { field: 'operation', value: 'notion_query_database' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Notion API developer. Generate Notion database sort criteria JSON array.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.sort_field>\`, \`<function1.result.direction>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DEFAULT_SORT_FIELD}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY a valid JSON array of sort objects. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON array.

### SORT STRUCTURE
Each sort object has:
- **property**: Property name to sort by
- **direction**: "ascending" or "descending"

Or for timestamp sorts:
- **timestamp**: "created_time" or "last_edited_time"
- **direction**: "ascending" or "descending"

### EXAMPLES

**Sort by property**: "Sort by Name ascending"
→ [{"property": "Name", "direction": "ascending"}]

**With variables**: "Sort by field from previous block"
→ [{"property": <agent1.sort_field>, "direction": <agent1.sort_direction>}]

**Sort by date**: "Sort by created time, newest first"
→ [{"timestamp": "created_time", "direction": "descending"}]

### REMEMBER
Return ONLY a valid JSON array - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe how you want to sort...',
        generationType: 'json-array',
      },
    },
    {
      id: 'pageSize',
      title: 'Page Size',
      type: 'short-input',
      placeholder: 'Number of results (default: 100, max: 100)',
      condition: { field: 'operation', value: 'notion_query_database' },
    },
    // Search Fields
    {
      id: 'query',
      title: 'Search Query',
      type: 'short-input',
      placeholder: 'Enter search terms (leave empty for all pages)',
      condition: { field: 'operation', value: 'notion_search' },
    },
    {
      id: 'filterType',
      title: 'Filter Type',
      type: 'dropdown',
      options: [
        { label: 'All', id: 'all' },
        { label: 'Pages Only', id: 'page' },
        { label: 'Databases Only', id: 'database' },
      ],
      condition: { field: 'operation', value: 'notion_search' },
    },
    // Create Database Fields
    {
      id: 'parentId',
      title: 'Parent Page ID',
      type: 'short-input',
      placeholder: 'ID of parent page where database will be created',
      condition: { field: 'operation', value: 'notion_create_database' },
      required: true,
    },
    {
      id: 'title',
      title: 'Database Title',
      type: 'short-input',
      placeholder: 'Title for the new database',
      condition: { field: 'operation', value: 'notion_create_database' },
      required: true,
    },
    {
      id: 'properties',
      title: 'Database Properties (JSON)',
      type: 'long-input',
      placeholder: 'Enter database properties as JSON object',
      condition: { field: 'operation', value: 'notion_create_database' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Notion API developer. Generate Notion database properties schema JSON.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.property_name>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DEFAULT_STATUS_OPTIONS}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY valid JSON properties object. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### PROPERTY TYPES
Common Notion property types:
- **title**: Primary name field
- **rich_text**: Multi-line text
- **number**: Numeric value
- **select**: Single select dropdown
- **multi_select**: Multiple select tags
- **date**: Date/datetime
- **checkbox**: Boolean checkbox
- **url**: URL link
- **email**: Email address
- **phone_number**: Phone number
- **status**: Status field with groups

### EXAMPLES

**Basic task database**: "Create properties for a task tracker"
→ {
  "Name": {"title": {}},
  "Status": {"status": {}},
  "Due Date": {"date": {}},
  "Priority": {"select": {"options": [{"name": "High"}, {"name": "Medium"}, {"name": "Low"}]}},
  "Completed": {"checkbox": {}}
}

**Contact database**: "Create properties for contacts"
→ {
  "Name": {"title": {}},
  "Email": {"email": {}},
  "Phone": {"phone_number": {}},
  "Company": {"rich_text": {}},
  "Website": {"url": {}}
}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the database properties...',
        generationType: 'json-object',
      },
    },
  ],
  tools: {
    access: [
      'notion_read',
      'notion_read_database',
      'notion_write',
      'notion_create_page',
      'notion_query_database',
      'notion_search',
      'notion_create_database',
    ],
    config: {
      tool: (params) => {
        switch (params.operation) {
          case 'notion_read':
            return 'notion_read'
          case 'notion_read_database':
            return 'notion_read_database'
          case 'notion_write':
            return 'notion_write'
          case 'notion_create_page':
            return 'notion_create_page'
          case 'notion_query_database':
            return 'notion_query_database'
          case 'notion_search':
            return 'notion_search'
          case 'notion_create_database':
            return 'notion_create_database'
          default:
            return 'notion_read'
        }
      },
      params: (params) => {
        const { credential, operation, properties, filter, sorts, ...rest } = params

        // Parse properties from JSON string for create operations
        let parsedProperties
        if (
          (operation === 'notion_create_page' || operation === 'notion_create_database') &&
          properties
        ) {
          try {
            parsedProperties = JSON.parse(properties)
          } catch (error) {
            throw new Error(
              `Invalid JSON for properties: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        }

        // Parse filter for query database operations
        let parsedFilter
        if (operation === 'notion_query_database' && filter) {
          try {
            parsedFilter = JSON.parse(filter)
          } catch (error) {
            throw new Error(
              `Invalid JSON for filter: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        }

        // Parse sorts for query database operations
        let parsedSorts
        if (operation === 'notion_query_database' && sorts) {
          try {
            parsedSorts = JSON.parse(sorts)
          } catch (error) {
            throw new Error(
              `Invalid JSON for sorts: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        }

        return {
          ...rest,
          credential,
          ...(parsedProperties ? { properties: parsedProperties } : {}),
          ...(parsedFilter ? { filter: JSON.stringify(parsedFilter) } : {}),
          ...(parsedSorts ? { sorts: JSON.stringify(parsedSorts) } : {}),
        }
      },
    },
  },
  inputs: {
    operation: { type: 'string', description: 'Operation to perform' },
    credential: { type: 'string', description: 'Notion access token' },
    pageId: { type: 'string', description: 'Page identifier' },
    content: { type: 'string', description: 'Page content' },
    // Create page inputs
    parentId: { type: 'string', description: 'Parent page identifier' },
    title: { type: 'string', description: 'Page title' },
    // Query database inputs
    databaseId: { type: 'string', description: 'Database identifier' },
    filter: { type: 'string', description: 'Filter criteria' },
    sorts: { type: 'string', description: 'Sort criteria' },
    pageSize: { type: 'number', description: 'Page size limit' },
    // Search inputs
    query: { type: 'string', description: 'Search query' },
    filterType: { type: 'string', description: 'Filter type' },
  },
  outputs: {
    // Common outputs across all Notion operations
    content: {
      type: 'string',
      description: 'Page content, search results, or confirmation messages',
    },

    // Metadata object containing operation-specific information
    metadata: {
      type: 'json',
      description:
        'Metadata containing operation-specific details including page/database info, results, and pagination data',
    },
  },
}
