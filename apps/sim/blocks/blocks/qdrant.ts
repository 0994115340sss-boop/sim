import { QdrantIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import { AuthMode } from '@/blocks/types'
import type { QdrantResponse } from '@/tools/qdrant/types'

export const QdrantBlock: BlockConfig<QdrantResponse> = {
  type: 'qdrant',
  name: 'Qdrant',
  description: 'Use Qdrant vector database',
  authMode: AuthMode.ApiKey,
  longDescription: 'Integrate Qdrant into the workflow. Can upsert, search, and fetch points.',
  docsLink: 'https://qdrant.tech/documentation/',
  category: 'tools',
  bgColor: '#1A223F',
  icon: QdrantIcon,

  subBlocks: [
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { label: 'Upsert', id: 'upsert' },
        { label: 'Search', id: 'search' },
        { label: 'Fetch', id: 'fetch' },
      ],
      value: () => 'upsert',
    },
    // Upsert fields
    {
      id: 'url',
      title: 'Qdrant URL',
      type: 'short-input',
      placeholder: 'http://localhost:6333',
      condition: { field: 'operation', value: 'upsert' },
      required: true,
    },
    {
      id: 'collection',
      title: 'Collection',
      type: 'short-input',
      placeholder: 'my-collection',
      condition: { field: 'operation', value: 'upsert' },
      required: true,
    },
    {
      id: 'points',
      title: 'Points',
      type: 'long-input',
      placeholder: '[{"id": 1, "vector": [0.1, 0.2], "payload": {"category": "a"}}]',
      condition: { field: 'operation', value: 'upsert' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Qdrant vector database developer. Generate Qdrant points JSON array for upsert operations.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<embedding1.vector>\`, \`<agent1.document_id>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{COLLECTION_PREFIX}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY a valid JSON array of point objects. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON array.

### POINT STRUCTURE
Each point must have:
- **id**: Unique identifier (string UUID or integer)
- **vector**: Array of floats representing the embedding
- **payload**: Optional object with metadata

### EXAMPLES

**Single point**: "Add a document about AI"
→ [{"id": 1, "vector": [0.1, 0.2, 0.3], "payload": {"category": "technology", "topic": "AI"}}]

**With variables**: "Add point with embedding from previous block"
→ [{"id": <agent1.doc_id>, "vector": <embedding1.vector>, "payload": {"content": <agent1.content>}}]

**Multiple points**: "Add two product vectors"
→ [
  {"id": "prod-1", "vector": [0.1, 0.2, 0.3], "payload": {"name": "Widget", "price": 29.99}},
  {"id": "prod-2", "vector": [0.4, 0.5, 0.6], "payload": {"name": "Gadget", "price": 49.99}}
]

### REMEMBER
Return ONLY a valid JSON array - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the points you want to upsert...',
        generationType: 'json-array',
      },
    },
    // Search fields
    {
      id: 'url',
      title: 'Qdrant URL',
      type: 'short-input',
      placeholder: 'http://localhost:6333',
      condition: { field: 'operation', value: 'search' },
      required: true,
    },
    {
      id: 'collection',
      title: 'Collection',
      type: 'short-input',
      placeholder: 'my-collection',
      condition: { field: 'operation', value: 'search' },
      required: true,
    },
    {
      id: 'vector',
      title: 'Query Vector',
      type: 'long-input',
      placeholder: '[0.1, 0.2]',
      condition: { field: 'operation', value: 'search' },
      required: true,
    },
    {
      id: 'limit',
      title: 'Limit',
      type: 'short-input',
      placeholder: '10',
      condition: { field: 'operation', value: 'search' },
    },
    {
      id: 'filter',
      title: 'Filter',
      type: 'long-input',
      placeholder: '{"must":[{"key":"city","match":{"value":"London"}}]}',
      condition: { field: 'operation', value: 'search' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Qdrant vector database developer. Generate Qdrant filter JSON for search operations.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.category>\`, \`<function1.result.city>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DEFAULT_REGION}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY valid JSON filter. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### QDRANT FILTER SYNTAX
Qdrant filters use clauses:
- **must**: All conditions must match (AND)
- **should**: At least one condition must match (OR)
- **must_not**: None of the conditions should match (NOT)

Each condition has:
- **key**: Field name in payload
- **match**: Match condition (value, text, any, except)
- **range**: Range condition (gt, gte, lt, lte)

### EXAMPLES

**Simple match**: "Filter by city London"
→ {"must": [{"key": "city", "match": {"value": "London"}}]}

**With variables**: "Filter by user's selected category"
→ {"must": [{"key": "category", "match": {"value": <agent1.selected_category>}}]}

**Range filter**: "Filter products with price between 10 and 100"
→ {"must": [{"key": "price", "range": {"gte": 10, "lte": 100}}]}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the filter conditions...',
        generationType: 'json-object',
      },
    },
    {
      id: 'search_return_data',
      title: 'Return Data',
      type: 'dropdown',
      options: [
        { label: 'Payload Only', id: 'payload_only' },
        { label: 'Vector Only', id: 'vector_only' },
        { label: 'Both Payload and Vector', id: 'both' },
        { label: 'None (IDs and scores only)', id: 'none' },
      ],
      value: () => 'payload_only',
      condition: { field: 'operation', value: 'search' },
    },
    // Fetch fields
    {
      id: 'url',
      title: 'Qdrant URL',
      type: 'short-input',
      placeholder: 'http://localhost:6333',
      condition: { field: 'operation', value: 'fetch' },
      required: true,
    },
    {
      id: 'collection',
      title: 'Collection',
      type: 'short-input',
      placeholder: 'my-collection',
      condition: { field: 'operation', value: 'fetch' },
      required: true,
    },
    {
      id: 'ids',
      title: 'IDs',
      type: 'long-input',
      placeholder: '["370446a3-310f-58db-8ce7-31db947c6c1e"]',
      condition: { field: 'operation', value: 'fetch' },
      required: true,
    },
    {
      id: 'fetch_return_data',
      title: 'Return Data',
      type: 'dropdown',
      options: [
        { label: 'Payload Only', id: 'payload_only' },
        { label: 'Vector Only', id: 'vector_only' },
        { label: 'Both Payload and Vector', id: 'both' },
        { label: 'None (IDs only)', id: 'none' },
      ],
      value: () => 'payload_only',
      condition: { field: 'operation', value: 'fetch' },
    },
    {
      id: 'apiKey',
      title: 'API Key',
      type: 'short-input',
      placeholder: 'Your Qdrant API key (optional)',
      password: true,
      required: true,
    },
  ],

  tools: {
    access: ['qdrant_upsert_points', 'qdrant_search_vector', 'qdrant_fetch_points'],
    config: {
      tool: (params: Record<string, any>) => {
        switch (params.operation) {
          case 'upsert':
            return 'qdrant_upsert_points'
          case 'search':
            return 'qdrant_search_vector'
          case 'fetch':
            return 'qdrant_fetch_points'
          default:
            throw new Error('Invalid operation selected')
        }
      },
    },
  },

  inputs: {
    operation: { type: 'string', description: 'Operation to perform' },
    url: { type: 'string', description: 'Qdrant server URL' },
    apiKey: { type: 'string', description: 'Qdrant API key' },
    collection: { type: 'string', description: 'Collection name' },
    points: { type: 'json', description: 'Points to upsert' },
    vector: { type: 'json', description: 'Query vector' },
    limit: { type: 'number', description: 'Result limit' },
    filter: { type: 'json', description: 'Search filter' },
    ids: { type: 'json', description: 'Point identifiers' },
    search_return_data: { type: 'string', description: 'Data to return from search' },
    fetch_return_data: { type: 'string', description: 'Data to return from fetch' },
    with_payload: { type: 'boolean', description: 'Include payload' },
    with_vector: { type: 'boolean', description: 'Include vectors' },
  },

  outputs: {
    matches: { type: 'json', description: 'Search matches' },
    upsertedCount: { type: 'number', description: 'Upserted count' },
    data: { type: 'json', description: 'Response data' },
    status: { type: 'string', description: 'Operation status' },
  },
}
