import { ResponseIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { ResponseBlockOutput } from '@/tools/response/types'

export const ResponseBlock: BlockConfig<ResponseBlockOutput> = {
  type: 'response',
  name: 'Response',
  description: 'Send structured API response',
  longDescription:
    'Integrate Response into the workflow. Can send build or edit structured responses into a final workflow response.',
  docsLink: 'https://docs.sim.ai/blocks/response',
  bestPractices: `
  - Only use this if the trigger block is the API Trigger.
  - Prefer the builder mode over the editor mode.
  - This is usually used as the last block in the workflow.
  `,
  category: 'blocks',
  bgColor: '#2F55FF',
  icon: ResponseIcon,
  subBlocks: [
    {
      id: 'dataMode',
      title: 'Response Data Mode',
      type: 'dropdown',
      options: [
        { label: 'Builder', id: 'structured' },
        { label: 'Editor', id: 'json' },
      ],
      value: () => 'structured',
      description: 'Choose how to define your response data structure',
    },
    {
      id: 'builderData',
      title: 'Response Structure',
      type: 'response-format',
      condition: { field: 'dataMode', value: 'structured' },
      description:
        'Define the structure of your response data. Use <variable.name> in field names to reference workflow variables.',
    },
    {
      id: 'data',
      title: 'Response Data',
      type: 'code',
      placeholder: '{\n  "message": "Hello world",\n  "userId": "<variable.userId>"\n}',
      language: 'json',
      condition: { field: 'dataMode', value: 'json' },
      description:
        'Data that will be sent as the response body on API calls. Use <variable.name> to reference workflow variables.',
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert JSON programmer. Generate ONLY the raw JSON object for the API response.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.response>\`, \`<function1.result>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{API_VERSION}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY valid JSON. The output MUST be a single, valid JSON object, starting with { and ending with }.
Do not include any explanations, markdown formatting, or other text outside the JSON object.

### EXAMPLES

**Simple response**: "Return success with message"
→ {"success": true, "message": "Operation completed"}

**With variables**: "Return processed data from agent"
→ {"status": "success", "data": <agent1.result>, "processedAt": <function1.timestamp>}

**Error response**: "Return error with details"
→ {"success": false, "error": {"code": "NOT_FOUND", "message": <agent1.error_message>}}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown.`,
        placeholder: 'Describe the API response structure you need...',
        generationType: 'json-object',
      },
    },
    {
      id: 'status',
      title: 'Status Code',
      type: 'short-input',
      placeholder: '200',
      description: 'HTTP status code (default: 200)',
    },
    {
      id: 'headers',
      title: 'Response Headers',
      type: 'table',
      columns: ['Key', 'Value'],
      description: 'Additional HTTP headers to include in the response',
    },
  ],
  tools: { access: [] },
  inputs: {
    dataMode: {
      type: 'string',
      description: 'Response data definition mode',
    },
    builderData: {
      type: 'json',
      description: 'Structured response data',
    },
    data: {
      type: 'json',
      description: 'JSON response body',
    },
    status: {
      type: 'number',
      description: 'HTTP status code',
    },
    headers: {
      type: 'json',
      description: 'Response headers',
    },
  },
  outputs: {
    data: { type: 'json', description: 'Response data' },
    status: { type: 'number', description: 'HTTP status code' },
    headers: { type: 'json', description: 'Response headers' },
  },
}
