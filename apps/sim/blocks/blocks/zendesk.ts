import { ZendeskIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import { AuthMode } from '@/blocks/types'

export const ZendeskBlock: BlockConfig = {
  type: 'zendesk',
  name: 'Zendesk',
  description: 'Manage support tickets, users, and organizations in Zendesk',
  longDescription:
    'Integrate Zendesk into the workflow. Can get tickets, get ticket, create ticket, create tickets bulk, update ticket, update tickets bulk, delete ticket, merge tickets, get users, get user, get current user, search users, create user, create users bulk, update user, update users bulk, delete user, get organizations, get organization, autocomplete organizations, create organization, create organizations bulk, update organization, delete organization, search, search count.',
  docsLink: 'https://docs.sim.ai/tools/zendesk',
  authMode: AuthMode.ApiKey,
  category: 'tools',
  bgColor: '#E0E0E0',
  icon: ZendeskIcon,
  subBlocks: [
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { label: 'Get Tickets', id: 'get_tickets' },
        { label: 'Get Ticket', id: 'get_ticket' },
        { label: 'Create Ticket', id: 'create_ticket' },
        { label: 'Create Tickets Bulk', id: 'create_tickets_bulk' },
        { label: 'Update Ticket', id: 'update_ticket' },
        { label: 'Update Tickets Bulk', id: 'update_tickets_bulk' },
        { label: 'Delete Ticket', id: 'delete_ticket' },
        { label: 'Merge Tickets', id: 'merge_tickets' },
        { label: 'Get Users', id: 'get_users' },
        { label: 'Get User', id: 'get_user' },
        { label: 'Get Current User', id: 'get_current_user' },
        { label: 'Search Users', id: 'search_users' },
        { label: 'Create User', id: 'create_user' },
        { label: 'Create Users Bulk', id: 'create_users_bulk' },
        { label: 'Update User', id: 'update_user' },
        { label: 'Update Users Bulk', id: 'update_users_bulk' },
        { label: 'Delete User', id: 'delete_user' },
        { label: 'Get Organizations', id: 'get_organizations' },
        { label: 'Get Organization', id: 'get_organization' },
        { label: 'Autocomplete Organizations', id: 'autocomplete_organizations' },
        { label: 'Create Organization', id: 'create_organization' },
        { label: 'Create Organizations Bulk', id: 'create_organizations_bulk' },
        { label: 'Update Organization', id: 'update_organization' },
        { label: 'Delete Organization', id: 'delete_organization' },
        { label: 'Search', id: 'search' },
        { label: 'Search Count', id: 'search_count' },
      ],
      value: () => 'get_tickets',
    },
    {
      id: 'email',
      title: 'Email',
      type: 'short-input',
      placeholder: 'Your Zendesk email address',
      required: true,
      description: 'The email address associated with your Zendesk account',
    },
    {
      id: 'apiToken',
      title: 'API Token',
      type: 'short-input',
      password: true,
      placeholder: 'Enter your Zendesk API token',
      required: true,
    },
    {
      id: 'subdomain',
      title: 'Subdomain',
      type: 'short-input',
      placeholder: 'Your Zendesk subdomain (e.g., "mycompany")',
      required: true,
      description: 'The subdomain from your Zendesk URL (mycompany.zendesk.com)',
    },
    // Ticket fields
    {
      id: 'ticketId',
      title: 'Ticket ID',
      type: 'short-input',
      placeholder: 'Ticket ID',
      required: true,
      condition: {
        field: 'operation',
        value: ['get_ticket', 'update_ticket', 'delete_ticket'],
      },
    },
    {
      id: 'subject',
      title: 'Subject',
      type: 'short-input',
      placeholder: 'Ticket subject',
      condition: {
        field: 'operation',
        value: ['create_ticket', 'update_ticket'],
      },
    },
    {
      id: 'description',
      title: 'Description',
      type: 'long-input',
      placeholder: 'Ticket description',
      required: {
        field: 'operation',
        value: ['create_ticket'],
      },
      condition: {
        field: 'operation',
        value: ['create_ticket', 'update_ticket'],
      },
    },
    {
      id: 'status',
      title: 'Status',
      type: 'short-input',
      placeholder: 'Status (new, open, pending, hold, solved, closed)',
      condition: {
        field: 'operation',
        value: ['get_tickets', 'create_ticket', 'update_ticket'],
      },
    },
    {
      id: 'priority',
      title: 'Priority',
      type: 'short-input',
      placeholder: 'Priority (low, normal, high, urgent)',
      condition: {
        field: 'operation',
        value: ['get_tickets', 'create_ticket', 'update_ticket'],
      },
    },
    {
      id: 'type',
      title: 'Type',
      type: 'short-input',
      placeholder: 'Type (problem, incident, question, task)',
      condition: {
        field: 'operation',
        value: ['get_tickets', 'create_ticket', 'update_ticket'],
      },
    },
    {
      id: 'tags',
      title: 'Tags',
      type: 'short-input',
      placeholder: 'Comma-separated tags',
      condition: {
        field: 'operation',
        value: ['create_ticket', 'update_ticket'],
      },
    },
    {
      id: 'assigneeId',
      title: 'Assignee ID',
      type: 'short-input',
      placeholder: 'User ID to assign ticket to',
      condition: {
        field: 'operation',
        value: ['get_tickets', 'create_ticket', 'update_ticket'],
      },
    },
    {
      id: 'groupId',
      title: 'Group ID',
      type: 'short-input',
      placeholder: 'Group ID',
      condition: {
        field: 'operation',
        value: ['create_ticket', 'update_ticket'],
      },
    },
    {
      id: 'customFields',
      title: 'Custom Fields',
      type: 'long-input',
      placeholder: 'JSON object with custom fields',
      condition: {
        field: 'operation',
        value: ['create_ticket', 'update_ticket'],
      },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Zendesk API developer. Generate Zendesk custom fields JSON object.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.field_value>\`, \`<function1.result.category>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DEFAULT_CATEGORY}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY valid JSON custom fields object. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### CUSTOM FIELDS STRUCTURE
Custom fields use field IDs as keys with their values:
- Text fields: String values
- Numeric fields: Number values
- Dropdown fields: Option value or ID
- Checkbox fields: true/false
- Date fields: ISO date string

### EXAMPLES

**Single custom field**: "Set priority category"
→ {"12345678": "high_priority"}

**Multiple custom fields**: "Set category and region"
→ {"12345678": "support", "87654321": "north_america"}

**With variables**: "Use values from previous block"
→ {"12345678": <agent1.category>, "87654321": <agent1.region>}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the custom fields you want to set...',
        generationType: 'json-object',
      },
    },
    {
      id: 'tickets',
      title: 'Tickets',
      type: 'long-input',
      placeholder: 'JSON array of ticket objects',
      required: true,
      condition: {
        field: 'operation',
        value: ['create_tickets_bulk', 'update_tickets_bulk'],
      },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Zendesk API developer. Generate Zendesk tickets JSON array for bulk operations.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.tickets>\`, \`<function1.result.subject>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DEFAULT_GROUP_ID}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY a valid JSON array of ticket objects. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON array.

### TICKET STRUCTURE
For creating tickets:
- **subject**: Ticket subject (required)
- **description**: Ticket description
- **priority**: low, normal, high, urgent
- **status**: new, open, pending, hold, solved
- **type**: problem, incident, question, task
- **assignee_id**: User ID to assign to
- **group_id**: Group ID

For updating tickets:
- Include ticket **id** for each ticket to update

### EXAMPLES

**Create tickets**: "Create two support tickets"
→ [
  {"subject": "Login issue", "description": "Cannot login", "priority": "high"},
  {"subject": "Feature request", "description": "Add dark mode", "priority": "normal"}
]

**With variables**: "Create tickets from previous block data"
→ [
  {"subject": <agent1.subject>, "description": <agent1.description>, "priority": <agent1.priority>}
]

**Update tickets**: "Update status for multiple tickets"
→ [
  {"id": 12345, "status": "solved"},
  {"id": 12346, "status": "pending"}
]

### REMEMBER
Return ONLY a valid JSON array - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the tickets you want to create or update...',
        generationType: 'json-array',
      },
    },
    {
      id: 'targetTicketId',
      title: 'Target Ticket ID',
      type: 'short-input',
      placeholder: 'Ticket ID to merge into',
      required: true,
      condition: {
        field: 'operation',
        value: ['merge_tickets'],
      },
    },
    {
      id: 'sourceTicketIds',
      title: 'Source Ticket IDs',
      type: 'short-input',
      placeholder: 'Comma-separated ticket IDs to merge',
      required: true,
      condition: {
        field: 'operation',
        value: ['merge_tickets'],
      },
    },
    // User fields
    {
      id: 'userId',
      title: 'User ID',
      type: 'short-input',
      placeholder: 'User ID',
      required: true,
      condition: {
        field: 'operation',
        value: ['get_user', 'update_user', 'delete_user'],
      },
    },
    {
      id: 'name',
      title: 'Name',
      type: 'short-input',
      placeholder: 'User name',
      required: {
        field: 'operation',
        value: ['create_user'],
      },
      condition: {
        field: 'operation',
        value: ['create_user', 'update_user'],
      },
    },
    {
      id: 'userEmail',
      title: 'Email',
      type: 'short-input',
      placeholder: 'User email',
      condition: {
        field: 'operation',
        value: ['create_user', 'update_user'],
      },
    },
    {
      id: 'users',
      title: 'Users',
      type: 'long-input',
      placeholder: 'JSON array of user objects',
      required: true,
      condition: {
        field: 'operation',
        value: ['create_users_bulk', 'update_users_bulk'],
      },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Zendesk API developer. Generate Zendesk users JSON array for bulk operations.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.users>\`, \`<function1.result.name>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DEFAULT_ORG_ID}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY a valid JSON array of user objects. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON array.

### USER STRUCTURE
For creating users:
- **name**: User's name (required)
- **email**: User's email
- **role**: end-user, agent, admin
- **organization_id**: Organization ID

For updating users:
- Include user **id** for each user to update

### EXAMPLES

**Create users**: "Create two new users"
→ [
  {"name": "John Doe", "email": "john@example.com", "role": "end-user"},
  {"name": "Jane Smith", "email": "jane@example.com", "role": "end-user"}
]

**With variables**: "Create users from previous block"
→ [
  {"name": <agent1.name>, "email": <agent1.email>, "organization_id": "{{DEFAULT_ORG_ID}}"}
]

**Update users**: "Update roles for multiple users"
→ [
  {"id": 12345, "role": "agent"},
  {"id": 12346, "role": "admin"}
]

### REMEMBER
Return ONLY a valid JSON array - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the users you want to create or update...',
        generationType: 'json-array',
      },
    },
    // Organization fields
    {
      id: 'organizationId',
      title: 'Organization ID',
      type: 'short-input',
      placeholder: 'Organization ID',
      required: {
        field: 'operation',
        value: ['get_organization', 'delete_organization'],
      },
      condition: {
        field: 'operation',
        value: [
          'get_tickets',
          'create_ticket',
          'get_organization',
          'delete_organization',
          'update_organization',
          'create_user',
          'update_user',
        ],
      },
    },
    {
      id: 'organizationName',
      title: 'Organization Name',
      type: 'short-input',
      placeholder: 'Organization name',
      required: {
        field: 'operation',
        value: ['autocomplete_organizations'],
      },
      condition: {
        field: 'operation',
        value: ['autocomplete_organizations', 'create_organization', 'update_organization'],
      },
    },
    {
      id: 'organizations',
      title: 'Organizations',
      type: 'long-input',
      placeholder: 'JSON array of organization objects',
      required: true,
      condition: {
        field: 'operation',
        value: ['create_organizations_bulk'],
      },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Zendesk API developer. Generate Zendesk organizations JSON array for bulk creation.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.org_name>\`, \`<function1.result.domain>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DEFAULT_TAGS}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY a valid JSON array of organization objects. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON array.

### ORGANIZATION STRUCTURE
- **name**: Organization name (required)
- **domain_names**: Array of domain names
- **details**: Description/details
- **notes**: Internal notes
- **group_id**: Associated group ID
- **tags**: Array of tags

### EXAMPLES

**Create organizations**: "Create two companies"
→ [
  {"name": "Acme Corp", "domain_names": ["acme.com"], "details": "Enterprise customer"},
  {"name": "Widget Inc", "domain_names": ["widget.io"], "details": "Small business"}
]

**With variables**: "Create organizations from previous block"
→ [
  {"name": <agent1.company_name>, "domain_names": [<agent1.domain>], "tags": ["{{DEFAULT_TAGS}}"]}
]

### REMEMBER
Return ONLY a valid JSON array - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the organizations you want to create...',
        generationType: 'json-array',
      },
    },
    // Search fields
    {
      id: 'query',
      title: 'Query',
      type: 'short-input',
      placeholder: 'Search query',
      required: {
        field: 'operation',
        value: ['search', 'search_count'],
      },
      condition: {
        field: 'operation',
        value: ['search_users', 'search', 'search_count'],
      },
    },
    {
      id: 'sortBy',
      title: 'Sort By',
      type: 'dropdown',
      options: [
        { label: 'Relevance', id: 'relevance' },
        { label: 'Created At', id: 'created_at' },
        { label: 'Updated At', id: 'updated_at' },
        { label: 'Priority', id: 'priority' },
        { label: 'Status', id: 'status' },
        { label: 'Ticket Type', id: 'ticket_type' },
      ],
      condition: {
        field: 'operation',
        value: ['search'],
      },
    },
    {
      id: 'sortOrder',
      title: 'Sort Order',
      type: 'dropdown',
      options: [
        { label: 'Ascending', id: 'asc' },
        { label: 'Descending', id: 'desc' },
      ],
      condition: {
        field: 'operation',
        value: ['search'],
      },
    },
    // Pagination fields
    {
      id: 'perPage',
      title: 'Per Page',
      type: 'short-input',
      placeholder: 'Results per page (default: 100, max: 100)',
      condition: {
        field: 'operation',
        value: [
          'get_tickets',
          'get_users',
          'get_organizations',
          'search_users',
          'autocomplete_organizations',
          'search',
        ],
      },
    },
    {
      id: 'page',
      title: 'Page',
      type: 'short-input',
      placeholder: 'Page number',
      condition: {
        field: 'operation',
        value: [
          'get_tickets',
          'get_users',
          'get_organizations',
          'search_users',
          'autocomplete_organizations',
          'search',
        ],
      },
    },
  ],
  tools: {
    access: [
      'zendesk_get_tickets',
      'zendesk_get_ticket',
      'zendesk_create_ticket',
      'zendesk_create_tickets_bulk',
      'zendesk_update_ticket',
      'zendesk_update_tickets_bulk',
      'zendesk_delete_ticket',
      'zendesk_merge_tickets',
      'zendesk_get_users',
      'zendesk_get_user',
      'zendesk_get_current_user',
      'zendesk_search_users',
      'zendesk_create_user',
      'zendesk_create_users_bulk',
      'zendesk_update_user',
      'zendesk_update_users_bulk',
      'zendesk_delete_user',
      'zendesk_get_organizations',
      'zendesk_get_organization',
      'zendesk_autocomplete_organizations',
      'zendesk_create_organization',
      'zendesk_create_organizations_bulk',
      'zendesk_update_organization',
      'zendesk_delete_organization',
      'zendesk_search',
      'zendesk_search_count',
    ],
    config: {
      tool: (params) => {
        switch (params.operation) {
          case 'get_tickets':
            return 'zendesk_get_tickets'
          case 'get_ticket':
            return 'zendesk_get_ticket'
          case 'create_ticket':
            return 'zendesk_create_ticket'
          case 'create_tickets_bulk':
            return 'zendesk_create_tickets_bulk'
          case 'update_ticket':
            return 'zendesk_update_ticket'
          case 'update_tickets_bulk':
            return 'zendesk_update_tickets_bulk'
          case 'delete_ticket':
            return 'zendesk_delete_ticket'
          case 'merge_tickets':
            return 'zendesk_merge_tickets'
          case 'get_users':
            return 'zendesk_get_users'
          case 'get_user':
            return 'zendesk_get_user'
          case 'get_current_user':
            return 'zendesk_get_current_user'
          case 'search_users':
            return 'zendesk_search_users'
          case 'create_user':
            return 'zendesk_create_user'
          case 'create_users_bulk':
            return 'zendesk_create_users_bulk'
          case 'update_user':
            return 'zendesk_update_user'
          case 'update_users_bulk':
            return 'zendesk_update_users_bulk'
          case 'delete_user':
            return 'zendesk_delete_user'
          case 'get_organizations':
            return 'zendesk_get_organizations'
          case 'get_organization':
            return 'zendesk_get_organization'
          case 'autocomplete_organizations':
            return 'zendesk_autocomplete_organizations'
          case 'create_organization':
            return 'zendesk_create_organization'
          case 'create_organizations_bulk':
            return 'zendesk_create_organizations_bulk'
          case 'update_organization':
            return 'zendesk_update_organization'
          case 'delete_organization':
            return 'zendesk_delete_organization'
          case 'search':
            return 'zendesk_search'
          case 'search_count':
            return 'zendesk_search_count'
          default:
            throw new Error(`Unknown operation: ${params.operation}`)
        }
      },
      params: (params) => {
        const { apiToken, operation, ...rest } = params
        const cleanParams: Record<string, any> = { apiToken }

        // Special mapping for autocomplete_organizations
        if (operation === 'autocomplete_organizations' && params.organizationName) {
          cleanParams.name = params.organizationName
        }

        Object.entries(rest).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            // Skip organizationName for autocomplete_organizations as it's mapped to 'name'
            if (operation === 'autocomplete_organizations' && key === 'organizationName') {
              return
            }
            cleanParams[key] = value
          }
        })
        return cleanParams
      },
    },
  },
  inputs: {
    operation: { type: 'string', description: 'Operation to perform' },
    email: { type: 'string', description: 'Zendesk email address' },
    apiToken: { type: 'string', description: 'Zendesk API token' },
    subdomain: { type: 'string', description: 'Zendesk subdomain' },
  },
  outputs: {
    // Ticket operations - list
    tickets: { type: 'json', description: 'Array of ticket objects (get_tickets)' },
    // Ticket operations - single
    ticket: {
      type: 'json',
      description: 'Single ticket object (get_ticket, create_ticket, update_ticket)',
    },
    // User operations - list
    users: { type: 'json', description: 'Array of user objects (get_users, search_users)' },
    // User operations - single
    user: {
      type: 'json',
      description: 'Single user object (get_user, get_current_user, create_user, update_user)',
    },
    // Organization operations - list
    organizations: {
      type: 'json',
      description: 'Array of organization objects (get_organizations, autocomplete_organizations)',
    },
    // Organization operations - single
    organization: {
      type: 'json',
      description:
        'Single organization object (get_organization, create_organization, update_organization)',
    },
    // Search operations
    results: { type: 'json', description: 'Array of search result objects (search)' },
    count: { type: 'number', description: 'Number of matching results (search_count)' },
    // Bulk/async operations
    jobStatus: {
      type: 'json',
      description:
        'Job status for async operations (create_tickets_bulk, update_tickets_bulk, merge_tickets, create_users_bulk, update_users_bulk, create_organizations_bulk)',
    },
    // Delete operations
    deleted: {
      type: 'boolean',
      description: 'Deletion confirmation (delete_ticket, delete_user, delete_organization)',
    },
    // Pagination (shared across list operations)
    paging: { type: 'json', description: 'Pagination information for list operations' },
    // Metadata (shared across all operations)
    metadata: { type: 'json', description: 'Operation metadata including operation type' },
  },
}
