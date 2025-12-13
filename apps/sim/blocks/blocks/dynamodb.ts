import { DynamoDBIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { DynamoDBResponse } from '@/tools/dynamodb/types'

export const DynamoDBBlock: BlockConfig<DynamoDBResponse> = {
  type: 'dynamodb',
  name: 'Amazon DynamoDB',
  description: 'Connect to Amazon DynamoDB',
  longDescription:
    'Integrate Amazon DynamoDB into workflows. Supports Get, Put, Query, Scan, Update, and Delete operations on DynamoDB tables.',
  docsLink: 'https://docs.sim.ai/tools/dynamodb',
  category: 'tools',
  bgColor: 'linear-gradient(45deg, #2E27AD 0%, #527FFF 100%)',
  icon: DynamoDBIcon,
  subBlocks: [
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { label: 'Get Item', id: 'get' },
        { label: 'Put Item', id: 'put' },
        { label: 'Query', id: 'query' },
        { label: 'Scan', id: 'scan' },
        { label: 'Update Item', id: 'update' },
        { label: 'Delete Item', id: 'delete' },
      ],
      value: () => 'get',
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
      id: 'tableName',
      title: 'Table Name',
      type: 'short-input',
      placeholder: 'my-table',
      required: true,
    },
    // Key field for get, update, delete operations
    {
      id: 'key',
      title: 'Key (JSON)',
      type: 'code',
      placeholder: '{\n  "pk": "user#123"\n}',
      condition: { field: 'operation', value: 'get' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert DynamoDB developer. Generate DynamoDB primary key JSON based on the user's request.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.user_id>\`, \`<function1.result.order_id>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{TABLE_PREFIX}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY the key as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### KEY GUIDELINES
1. **Primary Key**: Must include partition key (pk) and optionally sort key (sk)
2. **Data Types**: Use strings, numbers, or binary for key values
3. **Format**: Simple key-value pairs matching your table schema
4. **Required**: Partition key is always required, sort key only if table has composite key

### EXAMPLES

**Simple partition key**: "Get item with partition key user#123"
→ {"pk": "user#123"}

**Composite key**: "Get item with pk user#123 and sk order#456"
→ {"pk": "user#123", "sk": "order#456"}

**Numeric key**: "Get item with id 12345"
→ {"id": 12345}

**String key**: "Get user by email"
→ {"email": "user@example.com"}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the key you want to use...',
        generationType: 'json-object',
      },
    },
    {
      id: 'key',
      title: 'Key (JSON)',
      type: 'code',
      placeholder: '{\n  "pk": "user#123"\n}',
      condition: { field: 'operation', value: 'update' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert DynamoDB developer. Generate DynamoDB primary key JSON for UPDATE operations.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.user_id>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY the key as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### KEY GUIDELINES
1. **Primary Key**: Must include partition key (pk) and optionally sort key (sk)
2. **Data Types**: Use strings, numbers, or binary for key values
3. **Format**: Simple key-value pairs matching your table schema
4. **Required**: Partition key is always required, sort key only if table has composite key

### EXAMPLES

**Simple partition key**: "Update item with partition key user#123"
→ {"pk": "user#123"}

**Composite key**: "Update item with pk user#123 and sk order#456"
→ {"pk": "user#123", "sk": "order#456"}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the key you want to use...',
        generationType: 'json-object',
      },
    },
    {
      id: 'key',
      title: 'Key (JSON)',
      type: 'code',
      placeholder: '{\n  "pk": "user#123"\n}',
      condition: { field: 'operation', value: 'delete' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert DynamoDB developer. Generate DynamoDB primary key JSON for DELETE operations.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.item_id>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY the key as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### ⚠️ DELETION WARNING ⚠️
DELETIONS ARE PERMANENT! Be extremely careful and specific with your key criteria.

### KEY GUIDELINES
1. **Primary Key**: Must include partition key (pk) and optionally sort key (sk)
2. **Data Types**: Use strings, numbers, or binary for key values
3. **Format**: Simple key-value pairs matching your table schema
4. **Required**: Partition key is always required, sort key only if table has composite key

### EXAMPLES

**Simple partition key**: "Delete item with partition key user#123"
→ {"pk": "user#123"}

**Composite key**: "Delete item with pk user#123 and sk order#456"
→ {"pk": "user#123", "sk": "order#456"}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the key you want to use...',
        generationType: 'json-object',
      },
    },
    // Consistent read for get
    {
      id: 'consistentRead',
      title: 'Consistent Read',
      type: 'dropdown',
      options: [
        { label: 'Eventually Consistent', id: 'false' },
        { label: 'Strongly Consistent', id: 'true' },
      ],
      value: () => 'false',
      condition: { field: 'operation', value: 'get' },
    },
    // Item for put operation
    {
      id: 'item',
      title: 'Item (JSON)',
      type: 'code',
      placeholder:
        '{\n  "pk": "user#123",\n  "name": "John Doe",\n  "email": "john@example.com"\n}',
      condition: { field: 'operation', value: 'put' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert DynamoDB developer. Generate DynamoDB item JSON for PUT operations.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.name>\`, \`<function1.result.email>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DEFAULT_STATUS}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY the item as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### ITEM GUIDELINES
1. **Primary Key**: Must include partition key (pk) and optionally sort key (sk)
2. **Attributes**: Include all attributes you want to store
3. **Data Types**: Use strings, numbers, booleans, lists, maps, sets, null
4. **Nested Data**: Use maps (objects) for nested structures

### EXAMPLES

**Simple item**: "Create user with pk, name, and email"
→ {"pk": "user#123", "name": "John Doe", "email": "john@example.com"}

**With composite key**: "Create order with pk, sk, total, and status"
→ {"pk": "user#123", "sk": "order#456", "total": 99.99, "status": "pending"}

**Complex nested**: "Create user with profile and preferences"
→ {"pk": "user#123", "name": "John", "profile": {"age": 30, "city": "NYC"}, "preferences": {"theme": "dark", "notifications": true}}

**With lists**: "Create product with tags and categories"
→ {"pk": "product#123", "name": "Widget", "tags": ["electronics", "gadget"], "categories": ["tech", "home"]}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the item you want to create...',
        generationType: 'json-object',
      },
    },
    // Key condition expression for query
    {
      id: 'keyConditionExpression',
      title: 'Key Condition Expression',
      type: 'short-input',
      placeholder: 'pk = :pk',
      condition: { field: 'operation', value: 'query' },
      required: true,
    },
    // Update expression for update operation
    {
      id: 'updateExpression',
      title: 'Update Expression',
      type: 'short-input',
      placeholder: 'SET #name = :name',
      condition: { field: 'operation', value: 'update' },
      required: true,
    },
    // Filter expression for query and scan
    {
      id: 'filterExpression',
      title: 'Filter Expression',
      type: 'short-input',
      placeholder: 'attribute_exists(email)',
      condition: { field: 'operation', value: 'query' },
    },
    {
      id: 'filterExpression',
      title: 'Filter Expression',
      type: 'short-input',
      placeholder: 'attribute_exists(email)',
      condition: { field: 'operation', value: 'scan' },
    },
    // Projection expression for scan
    {
      id: 'projectionExpression',
      title: 'Projection Expression',
      type: 'short-input',
      placeholder: 'pk, #name, email',
      condition: { field: 'operation', value: 'scan' },
    },
    // Expression attribute names for query, scan, update
    {
      id: 'expressionAttributeNames',
      title: 'Expression Attribute Names (JSON)',
      type: 'code',
      placeholder: '{\n  "#name": "name"\n}',
      condition: { field: 'operation', value: 'query' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert DynamoDB developer. Generate DynamoDB Expression Attribute Names JSON.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks using \`<block_name.field_name>\` syntax for dynamic field names.

### CRITICAL INSTRUCTION
Return ONLY the expression attribute names as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### EXPRESSION ATTRIBUTE NAMES GUIDELINES
1. **Purpose**: Maps placeholder names (starting with #) to actual attribute names
2. **Reserved Words**: Use when attribute names are DynamoDB reserved words (name, status, data, etc.)
3. **Format**: Keys start with #, values are actual attribute names
4. **Query/Scan/Update**: Used in KeyConditionExpression, FilterExpression, UpdateExpression

### EXAMPLES

**Single attribute**: "Map #name to name attribute"
→ {"#name": "name"}

**Multiple attributes**: "Map #status and #date to status and created_date"
→ {"#status": "status", "#date": "created_date"}

**Reserved words**: "Map #data to data attribute (reserved word)"
→ {"#data": "data"}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the attribute name mappings...',
        generationType: 'json-object',
      },
    },
    {
      id: 'expressionAttributeNames',
      title: 'Expression Attribute Names (JSON)',
      type: 'code',
      placeholder: '{\n  "#name": "name"\n}',
      condition: { field: 'operation', value: 'scan' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert DynamoDB developer. Generate DynamoDB Expression Attribute Names JSON for SCAN operations.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks using \`<block_name.field_name>\` syntax for dynamic field names.

### CRITICAL INSTRUCTION
Return ONLY the expression attribute names as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### EXPRESSION ATTRIBUTE NAMES GUIDELINES
1. **Purpose**: Maps placeholder names (starting with #) to actual attribute names
2. **Reserved Words**: Use when attribute names are DynamoDB reserved words
3. **Format**: Keys start with #, values are actual attribute names
4. **Scan**: Used in FilterExpression and ProjectionExpression

### EXAMPLES

**Single attribute**: "Map #name to name attribute"
→ {"#name": "name"}

**Multiple attributes**: "Map #status and #date"
→ {"#status": "status", "#date": "created_date"}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the attribute name mappings...',
        generationType: 'json-object',
      },
    },
    {
      id: 'expressionAttributeNames',
      title: 'Expression Attribute Names (JSON)',
      type: 'code',
      placeholder: '{\n  "#name": "name"\n}',
      condition: { field: 'operation', value: 'update' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert DynamoDB developer. Generate DynamoDB Expression Attribute Names JSON for UPDATE operations.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks using \`<block_name.field_name>\` syntax for dynamic field names.

### CRITICAL INSTRUCTION
Return ONLY the expression attribute names as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### EXPRESSION ATTRIBUTE NAMES GUIDELINES
1. **Purpose**: Maps placeholder names (starting with #) to actual attribute names
2. **Reserved Words**: Use when attribute names are DynamoDB reserved words
3. **Format**: Keys start with #, values are actual attribute names
4. **Update**: Used in UpdateExpression and ConditionExpression

### EXAMPLES

**Single attribute**: "Map #name to name attribute"
→ {"#name": "name"}

**Multiple attributes**: "Map #status and #date"
→ {"#status": "status", "#date": "created_date"}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the attribute name mappings...',
        generationType: 'json-object',
      },
    },
    // Expression attribute values for query, scan, update
    {
      id: 'expressionAttributeValues',
      title: 'Expression Attribute Values (JSON)',
      type: 'code',
      placeholder: '{\n  ":pk": "user#123",\n  ":name": "Jane"\n}',
      condition: { field: 'operation', value: 'query' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert DynamoDB developer. Generate DynamoDB Expression Attribute Values JSON for QUERY operations.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.user_id>\`, \`<function1.result.status>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY the expression attribute values as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### EXPRESSION ATTRIBUTE VALUES GUIDELINES
1. **Purpose**: Provides values for placeholders (starting with :) in expressions
2. **Format**: Keys start with :, values are the actual values
3. **Data Types**: Use strings, numbers, booleans, lists, maps, sets, null
4. **Query**: Used in KeyConditionExpression and FilterExpression

### EXAMPLES

**Simple values**: "Values for pk and status"
→ {":pk": "user#123", ":status": "active"}

**Numeric values**: "Values for min and max"
→ {":min": 18, ":max": 65}

**Mixed types**: "Values for pk, count, and active"
→ {":pk": "user#123", ":count": 10, ":active": true}

**List values**: "Values for tags"
→ {":tags": ["tag1", "tag2"]}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the attribute values...',
        generationType: 'json-object',
      },
    },
    {
      id: 'expressionAttributeValues',
      title: 'Expression Attribute Values (JSON)',
      type: 'code',
      placeholder: '{\n  ":status": "active"\n}',
      condition: { field: 'operation', value: 'scan' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert DynamoDB developer. Generate DynamoDB Expression Attribute Values JSON for SCAN operations.

### CONTEXT
{context}

### CRITICAL INSTRUCTION
Return ONLY the expression attribute values as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### EXPRESSION ATTRIBUTE VALUES GUIDELINES
1. **Purpose**: Provides values for placeholders (starting with :) in expressions
2. **Format**: Keys start with :, values are the actual values
3. **Data Types**: Use strings, numbers, booleans, lists, maps, sets, null
4. **Scan**: Used in FilterExpression

### EXAMPLES

**Simple values**: "Values for status"
→ {":status": "active"}

**Numeric values**: "Values for min and max"
→ {":min": 18, ":max": 65}

**Mixed types**: "Values for status and count"
→ {":status": "active", ":count": 10}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the attribute values...',
        generationType: 'json-object',
      },
    },
    {
      id: 'expressionAttributeValues',
      title: 'Expression Attribute Values (JSON)',
      type: 'code',
      placeholder: '{\n  ":name": "Jane Doe"\n}',
      condition: { field: 'operation', value: 'update' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert DynamoDB developer. Generate DynamoDB Expression Attribute Values JSON for UPDATE operations.

### CONTEXT
{context}

### CRITICAL INSTRUCTION
Return ONLY the expression attribute values as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### EXPRESSION ATTRIBUTE VALUES GUIDELINES
1. **Purpose**: Provides values for placeholders (starting with :) in expressions
2. **Format**: Keys start with :, values are the actual values
3. **Data Types**: Use strings, numbers, booleans, lists, maps, sets, null
4. **Update**: Used in UpdateExpression and ConditionExpression

### EXAMPLES

**Simple values**: "Values for name and status"
→ {":name": "Jane Doe", ":status": "active"}

**Numeric values**: "Values for increment"
→ {":inc": 1}

**Mixed types**: "Values for name, count, and active"
→ {":name": "Jane", ":count": 5, ":active": true}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the attribute values...',
        generationType: 'json-object',
      },
    },
    // Index name for query
    {
      id: 'indexName',
      title: 'Index Name',
      type: 'short-input',
      placeholder: 'GSI1',
      condition: { field: 'operation', value: 'query' },
    },
    // Limit for query and scan
    {
      id: 'limit',
      title: 'Limit',
      type: 'short-input',
      placeholder: '100',
      condition: { field: 'operation', value: 'query' },
    },
    {
      id: 'limit',
      title: 'Limit',
      type: 'short-input',
      placeholder: '100',
      condition: { field: 'operation', value: 'scan' },
    },
    // Condition expression for update and delete
    {
      id: 'conditionExpression',
      title: 'Condition Expression',
      type: 'short-input',
      placeholder: 'attribute_exists(pk)',
      condition: { field: 'operation', value: 'update' },
    },
    {
      id: 'conditionExpression',
      title: 'Condition Expression',
      type: 'short-input',
      placeholder: 'attribute_exists(pk)',
      condition: { field: 'operation', value: 'delete' },
    },
  ],
  tools: {
    access: [
      'dynamodb_get',
      'dynamodb_put',
      'dynamodb_query',
      'dynamodb_scan',
      'dynamodb_update',
      'dynamodb_delete',
    ],
    config: {
      tool: (params) => {
        switch (params.operation) {
          case 'get':
            return 'dynamodb_get'
          case 'put':
            return 'dynamodb_put'
          case 'query':
            return 'dynamodb_query'
          case 'scan':
            return 'dynamodb_scan'
          case 'update':
            return 'dynamodb_update'
          case 'delete':
            return 'dynamodb_delete'
          default:
            throw new Error(`Invalid DynamoDB operation: ${params.operation}`)
        }
      },
      params: (params) => {
        const {
          operation,
          key,
          item,
          expressionAttributeNames,
          expressionAttributeValues,
          consistentRead,
          limit,
          ...rest
        } = params

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

        const parsedKey = parseJson(key, 'key')
        const parsedItem = parseJson(item, 'item')
        const parsedExpressionAttributeNames = parseJson(
          expressionAttributeNames,
          'expressionAttributeNames'
        )
        const parsedExpressionAttributeValues = parseJson(
          expressionAttributeValues,
          'expressionAttributeValues'
        )

        // Build connection config
        const connectionConfig = {
          region: rest.region,
          accessKeyId: rest.accessKeyId,
          secretAccessKey: rest.secretAccessKey,
        }

        // Build params object
        const result: Record<string, unknown> = {
          ...connectionConfig,
          tableName: rest.tableName,
        }

        if (parsedKey !== undefined) result.key = parsedKey
        if (parsedItem !== undefined) result.item = parsedItem
        if (rest.keyConditionExpression) result.keyConditionExpression = rest.keyConditionExpression
        if (rest.updateExpression) result.updateExpression = rest.updateExpression
        if (rest.filterExpression) result.filterExpression = rest.filterExpression
        if (rest.projectionExpression) result.projectionExpression = rest.projectionExpression
        if (parsedExpressionAttributeNames !== undefined) {
          result.expressionAttributeNames = parsedExpressionAttributeNames
        }
        if (parsedExpressionAttributeValues !== undefined) {
          result.expressionAttributeValues = parsedExpressionAttributeValues
        }
        if (rest.indexName) result.indexName = rest.indexName
        if (limit) result.limit = Number.parseInt(String(limit), 10)
        if (rest.conditionExpression) result.conditionExpression = rest.conditionExpression
        // Handle consistentRead - dropdown sends 'true'/'false' strings or boolean
        if (consistentRead === 'true' || consistentRead === true) {
          result.consistentRead = true
        }

        return result
      },
    },
  },
  inputs: {
    operation: { type: 'string', description: 'DynamoDB operation to perform' },
    region: { type: 'string', description: 'AWS region' },
    accessKeyId: { type: 'string', description: 'AWS access key ID' },
    secretAccessKey: { type: 'string', description: 'AWS secret access key' },
    tableName: { type: 'string', description: 'DynamoDB table name' },
    key: { type: 'json', description: 'Primary key for get/update/delete operations' },
    item: { type: 'json', description: 'Item to put into the table' },
    keyConditionExpression: { type: 'string', description: 'Key condition for query operations' },
    updateExpression: { type: 'string', description: 'Update expression for update operations' },
    filterExpression: { type: 'string', description: 'Filter expression for query/scan' },
    projectionExpression: { type: 'string', description: 'Attributes to retrieve in scan' },
    expressionAttributeNames: { type: 'json', description: 'Attribute name mappings' },
    expressionAttributeValues: { type: 'json', description: 'Expression attribute values' },
    indexName: { type: 'string', description: 'Secondary index name for query' },
    limit: { type: 'number', description: 'Maximum items to return' },
    conditionExpression: { type: 'string', description: 'Condition for update/delete' },
    consistentRead: { type: 'string', description: 'Use strongly consistent read' },
  },
  outputs: {
    message: {
      type: 'string',
      description: 'Success or error message describing the operation outcome',
    },
    item: {
      type: 'json',
      description: 'Single item returned from get or update operation',
    },
    items: {
      type: 'array',
      description: 'Array of items returned from query or scan',
    },
    count: {
      type: 'number',
      description: 'Number of items returned',
    },
  },
}
