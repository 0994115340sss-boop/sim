import { ElasticsearchIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import { AuthMode } from '@/blocks/types'
import type { ElasticsearchResponse } from '@/tools/elasticsearch/types'

export const ElasticsearchBlock: BlockConfig<ElasticsearchResponse> = {
  type: 'elasticsearch',
  name: 'Elasticsearch',
  description: 'Search, index, and manage data in Elasticsearch',
  authMode: AuthMode.ApiKey,
  longDescription:
    'Integrate Elasticsearch into workflows for powerful search, indexing, and data management. Supports document CRUD operations, advanced search queries, bulk operations, index management, and cluster monitoring. Works with both self-hosted and Elastic Cloud deployments.',
  docsLink: 'https://docs.sim.ai/tools/elasticsearch',
  category: 'tools',
  bgColor: '#E0E0E0',
  icon: ElasticsearchIcon,
  subBlocks: [
    // Operation selector
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        // Document Operations
        { label: 'Search', id: 'elasticsearch_search' },
        { label: 'Index Document', id: 'elasticsearch_index_document' },
        { label: 'Get Document', id: 'elasticsearch_get_document' },
        { label: 'Update Document', id: 'elasticsearch_update_document' },
        { label: 'Delete Document', id: 'elasticsearch_delete_document' },
        { label: 'Bulk Operations', id: 'elasticsearch_bulk' },
        { label: 'Count Documents', id: 'elasticsearch_count' },
        // Index Management
        { label: 'Create Index', id: 'elasticsearch_create_index' },
        { label: 'Delete Index', id: 'elasticsearch_delete_index' },
        { label: 'Get Index Info', id: 'elasticsearch_get_index' },
        // Cluster Operations
        { label: 'Cluster Health', id: 'elasticsearch_cluster_health' },
        { label: 'Cluster Stats', id: 'elasticsearch_cluster_stats' },
      ],
      value: () => 'elasticsearch_search',
    },

    // Deployment type
    {
      id: 'deploymentType',
      title: 'Deployment Type',
      type: 'dropdown',
      options: [
        { label: 'Self-Hosted', id: 'self_hosted' },
        { label: 'Elastic Cloud', id: 'cloud' },
      ],
      value: () => 'self_hosted',
    },

    // Self-hosted host
    {
      id: 'host',
      title: 'Elasticsearch Host',
      type: 'short-input',
      placeholder: 'https://localhost:9200',
      required: true,
      condition: { field: 'deploymentType', value: 'self_hosted' },
    },

    // Cloud ID
    {
      id: 'cloudId',
      title: 'Cloud ID',
      type: 'short-input',
      placeholder: 'deployment-name:base64-encoded-data',
      required: true,
      condition: { field: 'deploymentType', value: 'cloud' },
    },

    // Authentication method
    {
      id: 'authMethod',
      title: 'Authentication Method',
      type: 'dropdown',
      options: [
        { label: 'API Key', id: 'api_key' },
        { label: 'Basic Auth', id: 'basic_auth' },
      ],
      value: () => 'api_key',
    },

    // API Key
    {
      id: 'apiKey',
      title: 'API Key',
      type: 'short-input',
      placeholder: 'Enter encoded API key',
      password: true,
      required: true,
      condition: { field: 'authMethod', value: 'api_key' },
    },

    // Username
    {
      id: 'username',
      title: 'Username',
      type: 'short-input',
      placeholder: 'Enter username',
      required: true,
      condition: { field: 'authMethod', value: 'basic_auth' },
    },

    // Password
    {
      id: 'password',
      title: 'Password',
      type: 'short-input',
      placeholder: 'Enter password',
      password: true,
      required: true,
      condition: { field: 'authMethod', value: 'basic_auth' },
    },

    // Index name - for most operations
    {
      id: 'index',
      title: 'Index Name',
      type: 'short-input',
      placeholder: 'my-index',
      required: true,
      condition: {
        field: 'operation',
        value: [
          'elasticsearch_search',
          'elasticsearch_index_document',
          'elasticsearch_get_document',
          'elasticsearch_update_document',
          'elasticsearch_delete_document',
          'elasticsearch_bulk',
          'elasticsearch_count',
          'elasticsearch_create_index',
          'elasticsearch_delete_index',
          'elasticsearch_get_index',
        ],
      },
    },

    // Document ID - for get/update/delete
    {
      id: 'documentId',
      title: 'Document ID',
      type: 'short-input',
      placeholder: 'unique-document-id',
      required: true,
      condition: {
        field: 'operation',
        value: [
          'elasticsearch_get_document',
          'elasticsearch_update_document',
          'elasticsearch_delete_document',
        ],
      },
    },

    // Optional Document ID - for index document
    {
      id: 'documentId',
      title: 'Document ID',
      type: 'short-input',
      placeholder: 'Leave empty for auto-generated ID',
      condition: { field: 'operation', value: 'elasticsearch_index_document' },
    },

    // Document body - for index
    {
      id: 'document',
      title: 'Document',
      type: 'code',
      placeholder: '{ "field": "value", "another_field": 123 }',
      required: true,
      condition: { field: 'operation', value: 'elasticsearch_index_document' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Elasticsearch developer. Generate Elasticsearch document JSON based on the user's request.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.name>\`, \`<function1.result.email>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DEFAULT_STATUS}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY the document as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### DOCUMENT GUIDELINES
1. **Structure**: Use proper JSON object structure with field-value pairs
2. **Data Types**: Use appropriate types (strings, numbers, booleans, arrays, nested objects)
3. **Naming**: Use lowercase field names with underscores (snake_case) following Elasticsearch conventions

### EXAMPLES

**Simple document**: "Create a user document with name, email, and age"
→ {"name": "John Doe", "email": "john@example.com", "age": 30}

**With variables**: "Create a document from previous block"
→ {"name": <agent1.name>, "email": <agent1.email>, "source": "{{DATA_SOURCE}}"}

**With nested data**: "Create a product with name, price, and category details"
→ {"name": "Laptop", "price": 999.99, "category": {"name": "Electronics", "id": "cat-123"}}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the document you want to create...',
        generationType: 'json-object',
      },
    },

    // Document body - for update (partial)
    {
      id: 'document',
      title: 'Partial Document',
      type: 'code',
      placeholder: '{ "field_to_update": "new_value" }',
      required: true,
      condition: { field: 'operation', value: 'elasticsearch_update_document' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Elasticsearch developer. Generate a partial document JSON for updating an existing document.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.new_status>\`, \`<function1.result.price>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DEFAULT_STATUS}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY the partial document as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object with only the fields you want to update.

### UPDATE GUIDELINES
1. **Partial Updates**: Only include fields that need to be updated
2. **Nested Updates**: Use dot notation for nested fields or include the full nested object
3. **Arrays**: Replace entire arrays, or use scripts for array manipulation
4. **Data Types**: Maintain consistent data types with existing document

### EXAMPLES

**Simple update**: "Update the email and status fields"
→ {"email": "newemail@example.com", "status": "active"}

**With variables**: "Update fields from previous block"
→ {"status": <agent1.new_status>, "updated_by": "{{SYSTEM_USER}}"}

### REMEMBER
Return ONLY valid JSON with fields to update - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe what fields you want to update...',
        generationType: 'json-object',
      },
    },

    // Search query
    {
      id: 'query',
      title: 'Search Query',
      type: 'code',
      placeholder: '{ "match": { "field": "search term" } }',
      condition: { field: 'operation', value: 'elasticsearch_search' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Elasticsearch developer. Generate Elasticsearch Query DSL queries based on the user's request.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.search_term>\`, \`<function1.result.status>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DEFAULT_STATUS}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY the query as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON query object.

### QUERY GUIDELINES
1. **Query DSL**: Use Elasticsearch Query DSL syntax
2. **Performance**: Structure queries efficiently
3. **Relevance**: Use appropriate query types for the use case
4. **Combining**: Use bool queries to combine multiple conditions

### COMMON QUERY TYPES

**Match Query** (full-text search):
{"match": {"field": "search text"}}

**Term Query** (exact match):
{"term": {"status": "active"}}

**Range Query**:
{"range": {"age": {"gte": 18, "lte": 65}}}

**Bool Query** (combine queries):
{"bool": {"must": [{"match": {"title": "elasticsearch"}}], "filter": [{"term": {"status": "published"}}]}}

**Multi-Match** (search multiple fields):
{"multi_match": {"query": "search text", "fields": ["title", "content"]}}

**Match Phrase** (exact phrase):
{"match_phrase": {"description": "exact phrase here"}}

### EXAMPLES

**Simple search**: "Find documents with 'elasticsearch' in the title"
→ {"match": {"title": "elasticsearch"}}

**Multiple conditions**: "Find active users over 18"
→ {"bool": {"must": [{"term": {"status": "active"}}, {"range": {"age": {"gt": 18}}}]}}

**Text search with filters**: "Search for 'laptop' in products that are in stock and priced under 1000"
→ {"bool": {"must": [{"match": {"name": "laptop"}}], "filter": [{"term": {"in_stock": true}}, {"range": {"price": {"lt": 1000}}]}]}}

**Complex bool query**: "Find published articles about 'python' or 'javascript' written in 2024"
→ {"bool": {"must": [{"term": {"status": "published"}}, {"range": {"published_date": {"gte": "2024-01-01", "lte": "2024-12-31"}}], "should": [{"match": {"tags": "python"}}, {"match": {"tags": "javascript"}}], "minimum_should_match": 1}}

**Fuzzy search**: "Find documents similar to 'elastiksearch'"
→ {"fuzzy": {"title": {"value": "elastiksearch", "fuzziness": "AUTO"}}}

### REMEMBER
Return ONLY valid JSON query - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe what you want to search for...',
        generationType: 'elasticsearch-query',
      },
    },

    // Count query
    {
      id: 'query',
      title: 'Query',
      type: 'code',
      placeholder: '{ "match": { "field": "value" } }',
      condition: { field: 'operation', value: 'elasticsearch_count' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Elasticsearch developer. Generate Elasticsearch Query DSL queries for counting documents.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks using \`<block_name.field_name>\` syntax.
Environment variables use \`{{ENV_VAR_NAME}}\` syntax.

### CRITICAL INSTRUCTION
Return ONLY the query as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON query object.

### COUNT QUERY GUIDELINES
1. **Query DSL**: Use Elasticsearch Query DSL syntax (same as search queries)
2. **Efficiency**: Use filters instead of queries when possible for better performance
3. **Structure**: Same query structure as search queries

### EXAMPLES

**Count by term**: "Count active documents"
→ {"term": {"status": "active"}}

**Count with range**: "Count users between 18 and 65"
→ {"range": {"age": {"gte": 18, "lte": 65}}}

**Count with multiple conditions**: "Count published articles from 2024"
→ {"bool": {"must": [{"term": {"status": "published"}}, {"range": {"published_date": {"gte": "2024-01-01", "lte": "2024-12-31"}}}]}}

**Count matching text**: "Count documents containing 'error'"
→ {"match": {"message": "error"}}

### REMEMBER
Return ONLY valid JSON query - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe what documents you want to count...',
        generationType: 'elasticsearch-query',
      },
    },

    // Search size
    {
      id: 'size',
      title: 'Number of Results',
      type: 'short-input',
      placeholder: '10',
      condition: { field: 'operation', value: 'elasticsearch_search' },
    },

    // Search from (offset)
    {
      id: 'from',
      title: 'Offset',
      type: 'short-input',
      placeholder: '0',
      condition: { field: 'operation', value: 'elasticsearch_search' },
    },

    // Sort
    {
      id: 'sort',
      title: 'Sort',
      type: 'code',
      placeholder: '[{ "field": { "order": "asc" } }]',
      condition: { field: 'operation', value: 'elasticsearch_search' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Elasticsearch developer. Generate Elasticsearch sort specifications as JSON arrays.

### CONTEXT
{context}

### CRITICAL INSTRUCTION
Return ONLY the sort specification as a valid JSON array. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON array.

### SORT GUIDELINES
1. **Array Format**: Always return a JSON array, even for single field sorts
2. **Order**: Use "asc" for ascending, "desc" for descending
3. **Multiple Fields**: Array order determines sort priority
4. **Nested Fields**: Use dot notation for nested fields

### EXAMPLES

**Single field ascending**: "Sort by name"
→ [{"name": {"order": "asc"}}]

**Single field descending**: "Sort by date newest first"
→ [{"created_at": {"order": "desc"}}]

**Multiple fields**: "Sort by category then price"
→ [{"category": {"order": "asc"}}, {"price": {"order": "asc"}}]

**Complex sort**: "Sort by status, then by date descending, then by score"
→ [{"status": {"order": "asc"}}, {"date": {"order": "desc"}}, {"score": {"order": "desc"}}]

**Nested field**: "Sort by customer name"
→ [{"customer.name": {"order": "asc"}}]

### REMEMBER
Return ONLY valid JSON array - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe how you want to sort the results...',
        generationType: 'elasticsearch-sort',
      },
    },

    // Source includes
    {
      id: 'sourceIncludes',
      title: 'Fields to Include',
      type: 'short-input',
      placeholder: 'field1, field2 (comma-separated)',
      condition: {
        field: 'operation',
        value: ['elasticsearch_search', 'elasticsearch_get_document'],
      },
    },

    // Source excludes
    {
      id: 'sourceExcludes',
      title: 'Fields to Exclude',
      type: 'short-input',
      placeholder: 'field1, field2 (comma-separated)',
      condition: {
        field: 'operation',
        value: ['elasticsearch_search', 'elasticsearch_get_document'],
      },
    },

    // Bulk operations
    {
      id: 'operations',
      title: 'Bulk Operations',
      type: 'code',
      placeholder:
        '{ "index": { "_index": "my-index", "_id": "1" } }\n{ "field": "value" }\n{ "delete": { "_index": "my-index", "_id": "2" } }',
      required: true,
      condition: { field: 'operation', value: 'elasticsearch_bulk' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Elasticsearch developer. Generate Elasticsearch bulk operations in NDJSON (Newline Delimited JSON) format.

### CONTEXT
{context}

### CRITICAL INSTRUCTION
Return ONLY the bulk operations as NDJSON (each JSON object on a new line). Do not include any explanations, markdown formatting, comments, or additional text. Just the raw NDJSON.

### BULK OPERATION FORMAT
Bulk operations use NDJSON format where:
- Each operation action is on one line (index, create, update, delete)
- Each document follows on the next line (for index/create/update)
- Each pair is separated by a newline

### OPERATION TYPES

**Index** (create or replace):
{"index": {"_index": "my-index", "_id": "1"}}
{"field": "value", "another": 123}

**Create** (only if doesn't exist):
{"create": {"_index": "my-index", "_id": "2"}}
{"field": "value"}

**Update** (partial update):
{"update": {"_index": "my-index", "_id": "3"}}
{"doc": {"field": "new_value"}}

**Delete**:
{"delete": {"_index": "my-index", "_id": "4"}}

### EXAMPLES

**Index multiple documents**: "Index two user documents"
→ {"index": {"_index": "users", "_id": "1"}}
{"name": "John", "email": "john@example.com"}
{"index": {"_index": "users", "_id": "2"}}
{"name": "Jane", "email": "jane@example.com"}

**Mixed operations**: "Index one document and delete another"
→ {"index": {"_index": "products", "_id": "new-1"}}
{"name": "Widget", "price": 19.99}
{"delete": {"_index": "products", "_id": "old-1"}}

**Update operations**: "Update two documents"
→ {"update": {"_index": "users", "_id": "1"}}
{"doc": {"status": "active"}}
{"update": {"_index": "users", "_id": "2"}}
{"doc": {"status": "inactive"}}

**Bulk create**: "Create three products"
→ {"create": {"_index": "products"}}
{"name": "Product A", "price": 10}
{"create": {"_index": "products"}}
{"name": "Product B", "price": 20}
{"create": {"_index": "products"}}
{"name": "Product C", "price": 30}

### REMEMBER
Return ONLY NDJSON format (each JSON object on its own line) - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the bulk operations you want to perform...',
        generationType: 'elasticsearch-bulk',
      },
    },

    // Index settings
    {
      id: 'settings',
      title: 'Index Settings',
      type: 'code',
      placeholder: '{ "number_of_shards": 1, "number_of_replicas": 1 }',
      condition: { field: 'operation', value: 'elasticsearch_create_index' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Elasticsearch developer. Generate Elasticsearch index settings as JSON.

### CONTEXT
{context}

### CRITICAL INSTRUCTION
Return ONLY the settings as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### SETTINGS GUIDELINES
1. **Shards**: number_of_shards determines how data is split (typically 1-5 for small indices)
2. **Replicas**: number_of_replicas for redundancy (0 for development, 1+ for production)
3. **Analysis**: Custom analyzers, tokenizers, filters
4. **Refresh**: Control when changes become searchable

### COMMON SETTINGS

**Basic settings**:
{"number_of_shards": 1, "number_of_replicas": 1}

**With refresh interval**:
{"number_of_shards": 1, "number_of_replicas": 1, "refresh_interval": "30s"}

**With analysis**:
{"number_of_shards": 1, "number_of_replicas": 1, "analysis": {"analyzer": {"custom": {"type": "standard"}}}}

### EXAMPLES

**Simple settings**: "Create index with 1 shard and 1 replica"
→ {"number_of_shards": 1, "number_of_replicas": 1}

**Production settings**: "Create index with 3 shards, 2 replicas, and 10s refresh"
→ {"number_of_shards": 3, "number_of_replicas": 2, "refresh_interval": "10s"}

**Development settings**: "Create index with no replicas for testing"
→ {"number_of_shards": 1, "number_of_replicas": 0}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the index settings you need...',
        generationType: 'json-object',
      },
    },

    // Index mappings
    {
      id: 'mappings',
      title: 'Index Mappings',
      type: 'code',
      placeholder: '{ "properties": { "field": { "type": "text" } } }',
      condition: { field: 'operation', value: 'elasticsearch_create_index' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Elasticsearch developer. Generate Elasticsearch index mappings as JSON.

### CONTEXT
{context}

### CRITICAL INSTRUCTION
Return ONLY the mappings as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### MAPPING GUIDELINES
1. **Properties**: Define field types and behaviors
2. **Field Types**: text (full-text), keyword (exact), long/integer (numbers), date, boolean, object, nested
3. **Analysis**: text fields are analyzed, keyword fields are not
4. **Nested**: Use nested type for arrays of objects that need independent querying

### COMMON FIELD TYPES

**Text** (full-text search):
{"properties": {"title": {"type": "text"}}}

**Keyword** (exact match, sorting):
{"properties": {"status": {"type": "keyword"}}}

**Number**:
{"properties": {"age": {"type": "integer"}, "price": {"type": "float"}}}

**Date**:
{"properties": {"created_at": {"type": "date"}}}

**Boolean**:
{"properties": {"active": {"type": "boolean"}}}

**Object** (nested structure):
{"properties": {"user": {"type": "object", "properties": {"name": {"type": "text"}, "email": {"type": "keyword"}}}}}

**Nested** (array of objects):
{"properties": {"tags": {"type": "nested", "properties": {"name": {"type": "keyword"}, "value": {"type": "text"}}}}}

### EXAMPLES

**Simple mapping**: "Create mapping for user with name, email, and age"
→ {"properties": {"name": {"type": "text"}, "email": {"type": "keyword"}, "age": {"type": "integer"}}}

**Product mapping**: "Create mapping for product with name, price, description, and tags"
→ {"properties": {"name": {"type": "text"}, "price": {"type": "float"}, "description": {"type": "text"}, "tags": {"type": "keyword"}}}

**Complex nested**: "Create mapping for order with customer and items"
→ {"properties": {"order_id": {"type": "keyword"}, "customer": {"type": "object", "properties": {"name": {"type": "text"}, "email": {"type": "keyword"}}}, "items": {"type": "nested", "properties": {"product": {"type": "text"}, "quantity": {"type": "integer"}, "price": {"type": "float"}}}, "created_at": {"type": "date"}}}

**With analyzers**: "Create text field with custom analyzer"
→ {"properties": {"content": {"type": "text", "analyzer": "standard"}}}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the index mapping you need...',
        generationType: 'elasticsearch-mapping',
      },
    },

    // Refresh option
    {
      id: 'refresh',
      title: 'Refresh',
      type: 'dropdown',
      options: [
        { label: 'Default', id: '' },
        { label: 'Wait For', id: 'wait_for' },
        { label: 'Immediate', id: 'true' },
        { label: 'None', id: 'false' },
      ],
      value: () => '',
      condition: {
        field: 'operation',
        value: [
          'elasticsearch_index_document',
          'elasticsearch_delete_document',
          'elasticsearch_bulk',
        ],
      },
    },

    // Cluster health wait for status
    {
      id: 'waitForStatus',
      title: 'Wait for Status',
      type: 'dropdown',
      options: [
        { label: 'None', id: '' },
        { label: 'Green', id: 'green' },
        { label: 'Yellow', id: 'yellow' },
        { label: 'Red', id: 'red' },
      ],
      value: () => '',
      condition: { field: 'operation', value: 'elasticsearch_cluster_health' },
    },

    // Cluster health timeout
    {
      id: 'timeout',
      title: 'Timeout (seconds)',
      type: 'short-input',
      placeholder: '30',
      condition: { field: 'operation', value: 'elasticsearch_cluster_health' },
    },

    // Retry on conflict
    {
      id: 'retryOnConflict',
      title: 'Retry on Conflict',
      type: 'short-input',
      placeholder: '3',
      condition: { field: 'operation', value: 'elasticsearch_update_document' },
    },
  ],

  tools: {
    access: [
      'elasticsearch_search',
      'elasticsearch_index_document',
      'elasticsearch_get_document',
      'elasticsearch_update_document',
      'elasticsearch_delete_document',
      'elasticsearch_bulk',
      'elasticsearch_count',
      'elasticsearch_create_index',
      'elasticsearch_delete_index',
      'elasticsearch_get_index',
      'elasticsearch_cluster_health',
      'elasticsearch_cluster_stats',
    ],
    config: {
      tool: (params) => {
        // Convert numeric strings to numbers
        if (params.size) {
          params.size = Number(params.size)
        }
        if (params.from) {
          params.from = Number(params.from)
        }
        if (params.retryOnConflict) {
          params.retryOnConflict = Number(params.retryOnConflict)
        }
        // Append 's' to timeout for Elasticsearch time format
        if (params.timeout && !params.timeout.endsWith('s')) {
          params.timeout = `${params.timeout}s`
        }

        // Return the operation as the tool ID
        return params.operation || 'elasticsearch_search'
      },
    },
  },

  inputs: {
    operation: { type: 'string', description: 'Operation to perform' },
    deploymentType: { type: 'string', description: 'self_hosted or cloud' },
    host: { type: 'string', description: 'Elasticsearch host URL' },
    cloudId: { type: 'string', description: 'Elastic Cloud ID' },
    authMethod: { type: 'string', description: 'api_key or basic_auth' },
    apiKey: { type: 'string', description: 'API key for authentication' },
    username: { type: 'string', description: 'Username for basic auth' },
    password: { type: 'string', description: 'Password for basic auth' },
    index: { type: 'string', description: 'Index name' },
    documentId: { type: 'string', description: 'Document ID' },
    document: { type: 'string', description: 'Document body as JSON' },
    query: { type: 'string', description: 'Search query as JSON' },
    size: { type: 'number', description: 'Number of results' },
    from: { type: 'number', description: 'Starting offset' },
    sort: { type: 'string', description: 'Sort specification as JSON' },
    sourceIncludes: { type: 'string', description: 'Fields to include' },
    sourceExcludes: { type: 'string', description: 'Fields to exclude' },
    operations: { type: 'string', description: 'Bulk operations as NDJSON' },
    settings: { type: 'string', description: 'Index settings as JSON' },
    mappings: { type: 'string', description: 'Index mappings as JSON' },
    refresh: { type: 'string', description: 'Refresh policy' },
    waitForStatus: { type: 'string', description: 'Wait for cluster status' },
    timeout: { type: 'string', description: 'Timeout for wait operations' },
    retryOnConflict: { type: 'number', description: 'Retry attempts on conflict' },
  },

  outputs: {
    // Search outputs
    hits: { type: 'json', description: 'Search results' },
    took: { type: 'number', description: 'Time taken in milliseconds' },
    timed_out: { type: 'boolean', description: 'Whether the operation timed out' },
    aggregations: { type: 'json', description: 'Aggregation results' },
    // Document outputs
    _index: { type: 'string', description: 'Index name' },
    _id: { type: 'string', description: 'Document ID' },
    _version: { type: 'number', description: 'Document version' },
    _source: { type: 'json', description: 'Document content' },
    result: { type: 'string', description: 'Operation result' },
    found: { type: 'boolean', description: 'Whether document was found' },
    // Bulk outputs
    errors: { type: 'boolean', description: 'Whether any errors occurred' },
    items: { type: 'json', description: 'Bulk operation results' },
    // Count outputs
    count: { type: 'number', description: 'Document count' },
    // Index outputs
    acknowledged: { type: 'boolean', description: 'Whether operation was acknowledged' },
    // Cluster outputs
    cluster_name: { type: 'string', description: 'Cluster name' },
    status: { type: 'string', description: 'Cluster health status' },
    number_of_nodes: { type: 'number', description: 'Number of nodes' },
    indices: { type: 'json', description: 'Index statistics' },
    nodes: { type: 'json', description: 'Node statistics' },
  },
}
