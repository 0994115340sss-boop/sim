import { GoogleSheetsIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import { AuthMode } from '@/blocks/types'
import type { GoogleSheetsResponse } from '@/tools/google_sheets/types'

export const GoogleSheetsBlock: BlockConfig<GoogleSheetsResponse> = {
  type: 'google_sheets',
  name: 'Google Sheets',
  description: 'Read, write, and update data',
  authMode: AuthMode.OAuth,
  longDescription:
    'Integrate Google Sheets into the workflow. Can read, write, append, and update data.',
  docsLink: 'https://docs.sim.ai/tools/google_sheets',
  category: 'tools',
  bgColor: '#E0E0E0',
  icon: GoogleSheetsIcon,
  subBlocks: [
    // Operation selector
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { label: 'Read Data', id: 'read' },
        { label: 'Write Data', id: 'write' },
        { label: 'Update Data', id: 'update' },
        { label: 'Append Data', id: 'append' },
      ],
      value: () => 'read',
    },
    // Google Sheets Credentials
    {
      id: 'credential',
      title: 'Google Account',
      type: 'oauth-input',
      required: true,
      serviceId: 'google-sheets',
      requiredScopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive',
      ],
      placeholder: 'Select Google account',
    },
    // Spreadsheet Selector
    {
      id: 'spreadsheetId',
      title: 'Select Sheet',
      type: 'file-selector',
      canonicalParamId: 'spreadsheetId',
      serviceId: 'google-sheets',
      requiredScopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive',
      ],
      mimeType: 'application/vnd.google-apps.spreadsheet',
      placeholder: 'Select a spreadsheet',
      dependsOn: ['credential'],
      mode: 'basic',
    },
    // Manual Spreadsheet ID (advanced mode)
    {
      id: 'manualSpreadsheetId',
      title: 'Spreadsheet ID',
      type: 'short-input',
      canonicalParamId: 'spreadsheetId',
      placeholder: 'ID of the spreadsheet (from URL)',
      dependsOn: ['credential'],
      mode: 'advanced',
    },
    // Range
    {
      id: 'range',
      title: 'Range',
      type: 'short-input',
      placeholder: 'Sheet name and cell range (e.g., Sheet1!A1:D10)',
    },
    // Write-specific Fields
    {
      id: 'values',
      title: 'Values',
      type: 'long-input',
      placeholder:
        'Enter values as JSON array of arrays (e.g., [["A1", "B1"], ["A2", "B2"]]) or an array of objects (e.g., [{"name":"John", "age":30}, {"name":"Jane", "age":25}])',
      condition: { field: 'operation', value: 'write' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert at Google Sheets data formatting. Generate JSON data for writing to Google Sheets.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.data>\`, \`<function1.result.rows>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY a valid JSON array. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON array.

### DATA FORMATS

**Array of Arrays** (Row-based):
[["Header1", "Header2"], ["Value1", "Value2"]]

**Array of Objects** (Column-mapped):
[{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]

### EXAMPLES

**Simple write**: "Write headers and two rows of data"
→ [["Name", "Email", "Age"], ["John Doe", "john@example.com", 30], ["Jane Smith", "jane@example.com", 25]]

**With variables**: "Write data from previous block"
→ [["Name", "Status"], [<agent1.name>, <agent1.status>]]

**Object format**: "Write user records"
→ [{"name": "John", "email": "john@example.com"}, {"name": "Jane", "email": "jane@example.com"}]

### REMEMBER
Return ONLY valid JSON array - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the data you want to write...',
        generationType: 'json-array',
      },
    },
    {
      id: 'valueInputOption',
      title: 'Value Input Option',
      type: 'dropdown',
      options: [
        { label: 'User Entered (Parse formulas)', id: 'USER_ENTERED' },
        { label: "Raw (Don't parse formulas)", id: 'RAW' },
      ],
      condition: { field: 'operation', value: 'write' },
    },
    // Update-specific Fields
    {
      id: 'values',
      title: 'Values',
      type: 'long-input',
      placeholder:
        'Enter values as JSON array of arrays (e.g., [["A1", "B1"], ["A2", "B2"]]) or an array of objects (e.g., [{"name":"John", "age":30}, {"name":"Jane", "age":25}])',
      condition: { field: 'operation', value: 'update' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert at Google Sheets data formatting. Generate JSON data for updating Google Sheets.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks using \`<block_name.field_name>\` syntax.
Environment variables use \`{{ENV_VAR_NAME}}\` syntax.

### CRITICAL INSTRUCTION
Return ONLY a valid JSON array. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON array.

### DATA FORMATS
**Array of Arrays** (Row-based): [["Value1", "Value2"], ["Value3", "Value4"]]
**Array of Objects** (Column-mapped): [{"col1": "val1"}, {"col1": "val2"}]

### EXAMPLES
**Update cells**: "Update with new values"
→ [["Updated Name", "Updated Email"], ["John Doe", "john.new@example.com"]]

**With variables**: "Update with data from previous block"
→ [[<agent1.name>, <agent1.email>]]

### REMEMBER
Return ONLY valid JSON array - no explanations.`,
        placeholder: 'Describe the data you want to update...',
        generationType: 'json-array',
      },
    },
    {
      id: 'valueInputOption',
      title: 'Value Input Option',
      type: 'dropdown',
      options: [
        { label: 'User Entered (Parse formulas)', id: 'USER_ENTERED' },
        { label: "Raw (Don't parse formulas)", id: 'RAW' },
      ],
      condition: { field: 'operation', value: 'update' },
    },
    // Append-specific Fields
    {
      id: 'values',
      title: 'Values',
      type: 'long-input',
      placeholder:
        'Enter values as JSON array of arrays (e.g., [["A1", "B1"], ["A2", "B2"]]) or an array of objects (e.g., [{"name":"John", "age":30}, {"name":"Jane", "age":25}])',
      condition: { field: 'operation', value: 'append' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert at Google Sheets data formatting. Generate JSON data for appending to Google Sheets.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks using \`<block_name.field_name>\` syntax.
Environment variables use \`{{ENV_VAR_NAME}}\` syntax.

### CRITICAL INSTRUCTION
Return ONLY a valid JSON array. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON array.

### DATA FORMATS
**Array of Arrays** (Row-based): [["Value1", "Value2"], ["Value3", "Value4"]]
**Array of Objects** (Column-mapped): [{"col1": "val1"}, {"col1": "val2"}]

### EXAMPLES
**Append rows**: "Add new rows to the sheet"
→ [["New Entry", "new@email.com", "Active"]]

**With variables**: "Append data from previous block"
→ [[<agent1.name>, <agent1.email>, <agent1.status>]]

### REMEMBER
Return ONLY valid JSON array - no explanations.`,
        placeholder: 'Describe the data you want to append...',
        generationType: 'json-array',
      },
    },
    {
      id: 'valueInputOption',
      title: 'Value Input Option',
      type: 'dropdown',
      options: [
        { label: 'User Entered (Parse formulas)', id: 'USER_ENTERED' },
        { label: "Raw (Don't parse formulas)", id: 'RAW' },
      ],
      condition: { field: 'operation', value: 'append' },
    },
    {
      id: 'insertDataOption',
      title: 'Insert Data Option',
      type: 'dropdown',
      options: [
        { label: 'Insert Rows (Add new rows)', id: 'INSERT_ROWS' },
        { label: 'Overwrite (Add to existing data)', id: 'OVERWRITE' },
      ],
      condition: { field: 'operation', value: 'append' },
    },
  ],
  tools: {
    access: [
      'google_sheets_read',
      'google_sheets_write',
      'google_sheets_update',
      'google_sheets_append',
    ],
    config: {
      tool: (params) => {
        switch (params.operation) {
          case 'read':
            return 'google_sheets_read'
          case 'write':
            return 'google_sheets_write'
          case 'update':
            return 'google_sheets_update'
          case 'append':
            return 'google_sheets_append'
          default:
            throw new Error(`Invalid Google Sheets operation: ${params.operation}`)
        }
      },
      params: (params) => {
        const { credential, values, spreadsheetId, manualSpreadsheetId, ...rest } = params

        const parsedValues = values ? JSON.parse(values as string) : undefined

        const effectiveSpreadsheetId = (spreadsheetId || manualSpreadsheetId || '').trim()

        if (!effectiveSpreadsheetId) {
          throw new Error('Spreadsheet ID is required.')
        }

        return {
          ...rest,
          spreadsheetId: effectiveSpreadsheetId,
          values: parsedValues,
          credential,
        }
      },
    },
  },
  inputs: {
    operation: { type: 'string', description: 'Operation to perform' },
    credential: { type: 'string', description: 'Google Sheets access token' },
    spreadsheetId: { type: 'string', description: 'Spreadsheet identifier' },
    manualSpreadsheetId: { type: 'string', description: 'Manual spreadsheet identifier' },
    range: { type: 'string', description: 'Cell range' },
    values: { type: 'string', description: 'Cell values data' },
    valueInputOption: { type: 'string', description: 'Value input option' },
    insertDataOption: { type: 'string', description: 'Data insertion option' },
  },
  outputs: {
    data: { type: 'json', description: 'Sheet data' },
    metadata: { type: 'json', description: 'Operation metadata' },
    updatedRange: { type: 'string', description: 'Updated range' },
    updatedRows: { type: 'number', description: 'Updated rows count' },
    updatedColumns: { type: 'number', description: 'Updated columns count' },
    updatedCells: { type: 'number', description: 'Updated cells count' },
    tableRange: { type: 'string', description: 'Table range' },
  },
}
