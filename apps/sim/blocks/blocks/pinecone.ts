import { PineconeIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import { AuthMode } from '@/blocks/types'
import type { PineconeResponse } from '@/tools/pinecone/types'

export const PineconeBlock: BlockConfig<PineconeResponse> = {
  type: 'pinecone',
  name: 'Pinecone',
  description: 'Use Pinecone vector database',
  authMode: AuthMode.ApiKey,
  longDescription:
    'Integrate Pinecone into the workflow. Can generate embeddings, upsert text, search with text, fetch vectors, and search with vectors.',
  docsLink: 'https://docs.sim.ai/tools/pinecone',
  category: 'tools',
  bgColor: '#0D1117',
  icon: PineconeIcon,

  subBlocks: [
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { label: 'Generate Embeddings', id: 'generate' },
        { label: 'Upsert Text', id: 'upsert_text' },
        { label: 'Search With Text', id: 'search_text' },
        { label: 'Search With Vector', id: 'search_vector' },
        { label: 'Fetch Vectors', id: 'fetch' },
      ],
      value: () => 'generate',
    },
    // Generate embeddings fields
    {
      id: 'model',
      title: 'Model',
      type: 'dropdown',
      options: [
        { label: 'multilingual-e5-large', id: 'multilingual-e5-large' },
        { label: 'llama-text-embed-v2', id: 'llama-text-embed-v2' },
        {
          label: 'pinecone-sparse-english-v0',
          id: 'pinecone-sparse-english-v0',
        },
      ],
      condition: { field: 'operation', value: 'generate' },
      value: () => 'multilingual-e5-large',
    },
    {
      id: 'inputs',
      title: 'Text Inputs',
      type: 'long-input',
      placeholder: '[{"text": "Your text here"}]',
      condition: { field: 'operation', value: 'generate' },
      required: true,
    },
    // Upsert text fields
    {
      id: 'indexHost',
      title: 'Index Host',
      type: 'short-input',
      placeholder: 'https://index-name-abc123.svc.project-id.pinecone.io',
      condition: { field: 'operation', value: 'upsert_text' },
      required: true,
    },
    {
      id: 'namespace',
      title: 'Namespace',
      type: 'short-input',
      placeholder: 'default',
      condition: { field: 'operation', value: 'upsert_text' },
      required: true,
    },
    {
      id: 'records',
      title: 'Records',
      type: 'long-input',
      placeholder:
        '{"_id": "rec1", "text": "Apple\'s first product, the Apple I, was released in 1976.", "category": "product"}\n{"_id": "rec2", "chunk_text": "Apples are a great source of dietary fiber.", "category": "nutrition"}',
      condition: { field: 'operation', value: 'upsert_text' },
      required: true,
    },
    // Search text fields
    {
      id: 'indexHost',
      title: 'Index Host',
      type: 'short-input',
      placeholder: 'https://index-name-abc123.svc.project-id.pinecone.io',
      condition: { field: 'operation', value: 'search_text' },
      required: true,
    },
    {
      id: 'namespace',
      title: 'Namespace',
      type: 'short-input',
      placeholder: 'default',
      condition: { field: 'operation', value: 'search_text' },
      required: true,
    },
    {
      id: 'searchQuery',
      title: 'Search Query',
      type: 'long-input',
      placeholder: 'Enter text to search for',
      condition: { field: 'operation', value: 'search_text' },
      required: true,
    },
    {
      id: 'topK',
      title: 'Top K Results',
      type: 'short-input',
      placeholder: '10',
      condition: { field: 'operation', value: 'search_text' },
    },
    {
      id: 'fields',
      title: 'Fields to Return',
      type: 'long-input',
      placeholder: '["category", "text"]',
      condition: { field: 'operation', value: 'search_text' },
    },
    {
      id: 'filter',
      title: 'Filter',
      type: 'long-input',
      placeholder: '{"category": "product"}',
      condition: { field: 'operation', value: 'search_text' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Pinecone developer. Generate Pinecone metadata filter JSON based on the user's request.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.category>\`, \`<function1.result.status>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DEFAULT_CATEGORY}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY valid JSON filter. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### PINECONE FILTER SYNTAX
Pinecone uses metadata filters with these operators:
- **$eq**: Equals
- **$ne**: Not equals
- **$gt**: Greater than
- **$gte**: Greater than or equal
- **$lt**: Less than
- **$lte**: Less than or equal
- **$in**: In array
- **$nin**: Not in array

### EXAMPLES

**Simple equality**: "Filter by category product"
→ {"category": "product"}

**With variables**: "Filter by category from previous block"
→ {"category": <agent1.selected_category>, "user_id": "{{USER_ID}}"}

**Comparison**: "Filter records with price greater than 100"
→ {"price": {"$gt": 100}}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the filter conditions...',
        generationType: 'json-object',
      },
    },
    {
      id: 'rerank',
      title: 'Rerank Options',
      type: 'long-input',
      placeholder: '{"model": "bge-reranker-v2-m3", "rank_fields": ["text"], "top_n": 2}',
      condition: { field: 'operation', value: 'search_text' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Pinecone developer. Generate Pinecone rerank configuration JSON based on the user's request.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.top_n>\`, \`<function1.result.fields>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{RERANK_MODEL}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY valid JSON rerank options. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### RERANK OPTIONS STRUCTURE
- **model**: Reranker model (e.g., "bge-reranker-v2-m3")
- **rank_fields**: Array of field names to use for reranking
- **top_n**: Number of top results to return after reranking

### EXAMPLES

**Basic rerank**: "Rerank top 5 results using text field"
→ {"model": "bge-reranker-v2-m3", "rank_fields": ["text"], "top_n": 5}

**With variables**: "Use dynamic top_n from previous block"
→ {"model": "bge-reranker-v2-m3", "rank_fields": ["text"], "top_n": <agent1.result_count>}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the reranking options...',
        generationType: 'json-object',
      },
    },
    // Fetch fields
    {
      id: 'indexHost',
      title: 'Index Host',
      type: 'short-input',
      placeholder: 'https://index-name-abc123.svc.project-id.pinecone.io',
      condition: { field: 'operation', value: 'fetch' },
      required: true,
    },
    {
      id: 'namespace',
      title: 'Namespace',
      type: 'short-input',
      placeholder: 'Namespace',
      condition: { field: 'operation', value: 'fetch' },
      required: true,
    },
    {
      id: 'ids',
      title: 'Vector IDs',
      type: 'long-input',
      placeholder: '["vec1", "vec2"]',
      condition: { field: 'operation', value: 'fetch' },
      required: true,
    },
    // Add vector search fields
    {
      id: 'indexHost',
      title: 'Index Host',
      type: 'short-input',
      placeholder: 'https://index-name-abc123.svc.project-id.pinecone.io',
      condition: { field: 'operation', value: 'search_vector' },
      required: true,
    },
    {
      id: 'namespace',
      title: 'Namespace',
      type: 'short-input',
      placeholder: 'default',
      condition: { field: 'operation', value: 'search_vector' },
      required: true,
    },
    {
      id: 'vector',
      title: 'Query Vector',
      type: 'long-input',
      placeholder: '[0.1, 0.2, 0.3, ...]',
      condition: { field: 'operation', value: 'search_vector' },
      required: true,
    },
    {
      id: 'topK',
      title: 'Top K Results',
      type: 'short-input',
      placeholder: '10',
      condition: { field: 'operation', value: 'search_vector' },
    },
    {
      id: 'options',
      title: 'Options',
      type: 'checkbox-list',
      options: [
        { id: 'includeValues', label: 'Include Values' },
        { id: 'includeMetadata', label: 'Include Metadata' },
      ],
      condition: { field: 'operation', value: 'search_vector' },
    },
    // Common fields
    {
      id: 'apiKey',
      title: 'API Key',
      type: 'short-input',
      placeholder: 'Your Pinecone API key',
      password: true,
      required: true,
    },
  ],

  tools: {
    access: [
      'pinecone_generate_embeddings',
      'pinecone_upsert_text',
      'pinecone_search_text',
      'pinecone_search_vector',
      'pinecone_fetch',
    ],
    config: {
      tool: (params: Record<string, any>) => {
        switch (params.operation) {
          case 'generate':
            return 'pinecone_generate_embeddings'
          case 'upsert_text':
            return 'pinecone_upsert_text'
          case 'search_text':
            return 'pinecone_search_text'
          case 'fetch':
            return 'pinecone_fetch'
          case 'search_vector':
            return 'pinecone_search_vector'
          default:
            throw new Error('Invalid operation selected')
        }
      },
    },
  },

  inputs: {
    operation: { type: 'string', description: 'Operation to perform' },
    apiKey: { type: 'string', description: 'Pinecone API key' },
    indexHost: { type: 'string', description: 'Index host URL' },
    namespace: { type: 'string', description: 'Vector namespace' },
    // Generate embeddings inputs
    model: { type: 'string', description: 'Embedding model' },
    inputs: { type: 'json', description: 'Text inputs' },
    parameters: { type: 'json', description: 'Model parameters' },
    // Upsert text inputs
    records: { type: 'json', description: 'Records to upsert' },
    // Search text inputs
    searchQuery: { type: 'string', description: 'Search query text' },
    topK: { type: 'string', description: 'Top K results' },
    fields: { type: 'json', description: 'Fields to return' },
    filter: { type: 'json', description: 'Search filter' },
    rerank: { type: 'json', description: 'Rerank options' },
    // Fetch inputs
    ids: { type: 'json', description: 'Vector identifiers' },
    vector: { type: 'json', description: 'Query vector' },
    includeValues: { type: 'boolean', description: 'Include vector values' },
    includeMetadata: { type: 'boolean', description: 'Include metadata' },
  },

  outputs: {
    matches: { type: 'json', description: 'Search matches' },
    upsertedCount: { type: 'number', description: 'Upserted count' },
    data: { type: 'json', description: 'Response data' },
    model: { type: 'string', description: 'Model information' },
    vector_type: { type: 'string', description: 'Vector type' },
    usage: { type: 'json', description: 'Usage statistics' },
  },
}
