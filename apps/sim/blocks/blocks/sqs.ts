import { SQSIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { SqsResponse } from '@/tools/sqs/types'

export const SQSBlock: BlockConfig<SqsResponse> = {
  type: 'sqs',
  name: 'Amazon SQS',
  description: 'Connect to Amazon SQS',
  longDescription: 'Integrate Amazon SQS into the workflow. Can send messages to SQS queues.',
  docsLink: 'https://docs.sim.ai/tools/sqs',
  category: 'tools',
  bgColor: 'linear-gradient(45deg, #2E27AD 0%, #527FFF 100%)',
  icon: SQSIcon,
  subBlocks: [
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [{ label: 'Send Message', id: 'send' }],
      value: () => 'send',
    },
    {
      id: 'region',
      title: 'AWS Region',
      type: 'short-input',
      placeholder: 'us-east-1',
      required: true,
    },
    {
      id: 'accessKeyId',
      title: 'AWS Access Key ID',
      type: 'short-input',
      placeholder: 'AKIA...',
      password: true,
      required: true,
    },
    {
      id: 'secretAccessKey',
      title: 'AWS Secret Access Key',
      type: 'short-input',
      placeholder: 'Your secret access key',
      password: true,
      required: true,
    },
    {
      id: 'queueUrl',
      title: 'Queue URL',
      type: 'short-input',
      placeholder: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
      required: true,
    },
    // Data field for send message operation
    {
      id: 'messageGroupId',
      title: 'Message Group ID (optional)',
      type: 'short-input',
      placeholder: '5FAB0F0B-30C6-4427-9407-5634F4A3984A',
      condition: { field: 'operation', value: 'send' },
      required: false,
    },
    {
      id: 'messageDeduplicationId',
      title: 'Message Deduplication ID (optional)',
      type: 'short-input',
      placeholder: '5FAB0F0B-30C6-4427-9407-5634F4A3984A',
      condition: { field: 'operation', value: 'send' },
      required: false,
    },
    {
      id: 'data',
      title: 'Data (JSON)',
      type: 'code',
      placeholder: '{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "active": true\n}',
      condition: { field: 'operation', value: 'send' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert AWS SQS developer. Generate JSON message data for SQS queue messages.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.user_id>\`, \`<function1.result.order>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{SERVICE_NAME}}\`, \`{{ENVIRONMENT}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY valid JSON data. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### MESSAGE GUIDELINES
1. **Structure**: Use a clear, consistent structure for your messages
2. **Event Type**: Consider including a message type or event type field
3. **Timestamp**: Include timestamps when relevant
4. **IDs**: Include correlation IDs for tracking

### EXAMPLES

**User event**: "Send user registration event"
→ {
  "eventType": "user.registered",
  "userId": "user-123",
  "email": "john@example.com",
  "timestamp": "2024-01-15T10:30:00Z"
}

**With variables**: "Send event with data from previous block"
→ {
  "eventType": "order.processed",
  "orderId": <agent1.order_id>,
  "customerId": <function1.customer_id>,
  "environment": "{{ENVIRONMENT}}"
}

**Task message**: "Send background job to process"
→ {
  "jobType": "process_report",
  "reportId": "report-123",
  "parameters": {"format": "pdf", "dateRange": "last_30_days"},
  "priority": "high"
}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the message data you want to send...',
        generationType: 'json-object',
      },
    },
  ],
  tools: {
    access: ['sqs_send'],
    config: {
      tool: (params) => {
        switch (params.operation) {
          case 'send':
            return 'sqs_send'
          default:
            throw new Error(`Invalid SQS operation: ${params.operation}`)
        }
      },
      params: (params) => {
        const { operation, data, messageGroupId, messageDeduplicationId, ...rest } = params

        // Parse JSON fields
        const parseJson = (value: unknown, fieldName: string) => {
          if (!value) return undefined
          if (typeof value === 'object') return value
          if (typeof value === 'string' && value.trim()) {
            try {
              return JSON.parse(value)
            } catch (parseError) {
              const errorMsg =
                parseError instanceof Error ? parseError.message : 'Unknown JSON error'
              throw new Error(`Invalid JSON in ${fieldName}: ${errorMsg}`)
            }
          }
          return undefined
        }

        const parsedData = parseJson(data, 'data')

        // Build connection config
        const connectionConfig = {
          region: rest.region,
          accessKeyId: rest.accessKeyId,
          secretAccessKey: rest.secretAccessKey,
        }

        // Build params object
        const result: Record<string, unknown> = { ...connectionConfig }

        if (rest.queueUrl) result.queueUrl = rest.queueUrl
        if (messageGroupId) result.messageGroupId = messageGroupId
        if (messageDeduplicationId) result.messageDeduplicationId = messageDeduplicationId
        if (parsedData !== undefined) result.data = parsedData

        return result
      },
    },
  },
  inputs: {
    operation: { type: 'string', description: 'SQS operation to perform' },
    region: { type: 'string', description: 'AWS region' },
    accessKeyId: { type: 'string', description: 'AWS access key ID' },
    secretAccessKey: { type: 'string', description: 'AWS secret access key' },
    queueUrl: { type: 'string', description: 'SQS queue URL' },
    messageGroupId: {
      type: 'string',
      description: 'Message group ID (optional)',
    },
    messageDeduplicationId: {
      type: 'string',
      description: 'Message deduplication ID (optional)',
    },
    data: { type: 'json', description: 'Data for send message operation' },
  },
  outputs: {
    message: {
      type: 'string',
      description: 'Success or error message describing the operation outcome',
    },
    id: {
      type: 'string',
      description: 'Message ID',
    },
  },
}
