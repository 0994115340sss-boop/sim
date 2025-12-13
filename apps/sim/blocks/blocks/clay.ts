import { ClayIcon } from '@/components/icons'
import { AuthMode, type BlockConfig } from '@/blocks/types'
import type { ClayPopulateResponse } from '@/tools/clay/types'

export const ClayBlock: BlockConfig<ClayPopulateResponse> = {
  type: 'clay',
  name: 'Clay',
  description: 'Populate Clay workbook',
  authMode: AuthMode.ApiKey,
  longDescription: 'Integrate Clay into the workflow. Can populate a table with data.',
  docsLink: 'https://docs.sim.ai/tools/clay',
  category: 'tools',
  bgColor: '#E0E0E0',
  icon: ClayIcon,
  subBlocks: [
    {
      id: 'webhookURL',
      title: 'Webhook URL',
      type: 'short-input',
      placeholder: 'Enter Clay webhook URL',
      required: true,
    },
    {
      id: 'data',
      title: 'Data (JSON or Plain Text)',
      type: 'long-input',
      placeholder: 'Enter your JSON data to populate your Clay table',
      required: true,
      description: `JSON vs. Plain Text:
JSON: Best for populating multiple columns.
Plain Text: Best for populating a table in free-form style.
      `,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Clay developer. Generate data to populate a Clay workbook table.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.name>\`, \`<function1.result.email>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DEFAULT_SOURCE}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY valid JSON or plain text data. Do not include any explanations, markdown formatting, or comments.

### DATA GUIDELINES
1. **JSON Format**: Best for structured data with multiple columns
   - Use objects for single rows: {"column1": "value1", "column2": "value2"}
   - Use arrays for multiple rows: [{"col1": "val1"}, {"col1": "val2"}]
2. **Plain Text**: Best for free-form single column data
3. **Column Names**: Should match your Clay table column names

### EXAMPLES

**Single record**: "Add a lead with name and email"
→ {"name": "John Doe", "email": "john@example.com", "company": "Acme Inc"}

**Multiple records**: "Add multiple leads"
→ [{"name": "John", "email": "john@example.com"}, {"name": "Jane", "email": "jane@example.com"}]

**With variables**: "Populate with data from previous block"
→ {"name": <agent1.name>, "email": <agent1.email>, "source": "{{DEFAULT_SOURCE}}"}

### REMEMBER
Return ONLY the data - no explanations.`,
        placeholder: 'Describe the data you want to populate...',
        generationType: 'json-object',
      },
    },
    {
      id: 'authToken',
      title: 'Auth Token',
      type: 'short-input',
      placeholder: 'Enter your Clay webhook auth token',
      password: true,
      connectionDroppable: false,
      required: false,
      description:
        'Optional: If your Clay table has webhook authentication enabled, enter the auth token here. This will be sent in the x-clay-webhook-auth header.',
    },
  ],
  tools: {
    access: ['clay_populate'],
  },
  inputs: {
    authToken: { type: 'string', description: 'Clay authentication token' },
    webhookURL: { type: 'string', description: 'Clay webhook URL' },
    data: { type: 'json', description: 'Data to populate' },
  },
  outputs: {
    data: { type: 'json', description: 'Response data from Clay webhook' },
    metadata: {
      type: 'json',
      description: 'Webhook metadata including status, headers, timestamp, and content type',
    },
  },
}
