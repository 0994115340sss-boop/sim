import { createLogger } from '@/lib/logs/console/logger'
import type { BlockConfig } from '@/blocks/types'

const logger = createLogger('ResponseFormatUtils')

// Type definitions for component data structures
export interface Field {
  name: string
  type: string
  description?: string
}

/**
 * Evaluates a subblock condition against current subblock values.
 * Used to determine if a schema subblock is active based on other field values (e.g., operation type).
 * @param condition - The condition configuration from SubBlockConfig
 * @param subBlockValues - Current values of all subblocks
 * @returns True if the condition is met or if there is no condition
 */
function evaluateSubBlockCondition(
  condition:
    | {
        field: string
        value: string | number | boolean | Array<string | number | boolean>
        not?: boolean
        and?: {
          field: string
          value: string | number | boolean | Array<string | number | boolean> | undefined
          not?: boolean
        }
      }
    | undefined,
  subBlockValues: Record<string, any>
): boolean {
  if (!condition) return true

  const fieldValue = subBlockValues[condition.field]?.value

  let match: boolean
  if (Array.isArray(condition.value)) {
    match = condition.value.includes(fieldValue)
  } else {
    match = fieldValue === condition.value
  }

  if (condition.not) {
    match = !match
  }

  if (condition.and) {
    const andFieldValue = subBlockValues[condition.and.field]?.value
    let andMatch: boolean
    const andCondValue = condition.and.value

    if (andCondValue === undefined) {
      andMatch = andFieldValue !== undefined && andFieldValue !== null && andFieldValue !== ''
    } else if (Array.isArray(andCondValue)) {
      andMatch = andCondValue.includes(andFieldValue)
    } else {
      andMatch = andFieldValue === andCondValue
    }

    if (condition.and.not) {
      andMatch = !andMatch
    }

    match = match && andMatch
  }

  return match
}

/**
 * Finds the active output schema subblock for a block.
 * Looks for subblocks with generationType 'json-schema' (in wandConfig) that have their conditions met.
 * This generalizes schema detection to work with any block that has a schema subblock
 * (e.g., Agent's responseFormat, Stagehand's schema/outputSchema).
 * @param blockConfig - The block configuration
 * @param subBlockValues - Current values of all subblocks (format: { subBlockId: { value: any } })
 * @returns The subblock ID and parsed schema value, or null if no active schema is found
 */
export function findActiveOutputSchema(
  blockConfig: BlockConfig | null | undefined,
  subBlockValues: Record<string, any>
): { subBlockId: string; schema: any } | null {
  if (!blockConfig?.subBlocks) return null

  // Known schema subblock IDs that define output structure
  // These are subblocks whose value defines what the block outputs
  const schemaSubBlockIds = ['responseFormat', 'schema', 'outputSchema']

  for (const subBlock of blockConfig.subBlocks) {
    // Check if this is a known schema subblock
    if (!schemaSubBlockIds.includes(subBlock.id)) continue

    // Check if it has json-schema generation type (either in wandConfig or directly)
    const hasJsonSchemaType =
      subBlock.wandConfig?.generationType === 'json-schema' ||
      subBlock.generationType === 'json-schema'

    if (!hasJsonSchemaType) continue

    // Evaluate the condition to see if this subblock is active
    const condition =
      typeof subBlock.condition === 'function' ? subBlock.condition() : subBlock.condition
    if (!evaluateSubBlockCondition(condition, subBlockValues)) {
      continue
    }

    // Get the value for this subblock
    const schemaValue = subBlockValues[subBlock.id]?.value
    if (!schemaValue) continue

    // Parse the schema value
    const parsedSchema = parseResponseFormatSafely(schemaValue, subBlock.id)
    if (parsedSchema) {
      return { subBlockId: subBlock.id, schema: parsedSchema }
    }
  }

  return null
}

/**
 * Helper function to extract fields from JSON Schema
 * Handles both legacy format with fields array and new JSON Schema format
 */
export function extractFieldsFromSchema(schema: any): Field[] {
  if (!schema || typeof schema !== 'object') {
    return []
  }

  // Handle legacy format with fields array
  if (Array.isArray(schema.fields)) {
    return schema.fields
  }

  // Handle new JSON Schema format
  const schemaObj = schema.schema || schema
  if (!schemaObj || !schemaObj.properties || typeof schemaObj.properties !== 'object') {
    return []
  }

  // Extract fields from schema properties
  return Object.entries(schemaObj.properties).map(([name, prop]: [string, any]) => {
    // Handle array format like ['string', 'array']
    if (Array.isArray(prop)) {
      return {
        name,
        type: prop.includes('array') ? 'array' : prop[0] || 'string',
        description: undefined,
      }
    }

    // Handle object format like { type: 'string', description: '...' }
    return {
      name,
      type: prop.type || 'string',
      description: prop.description,
    }
  })
}

/**
 * Helper function to safely parse response format
 * Handles both string and object formats
 */
export function parseResponseFormatSafely(responseFormatValue: any, blockId: string): any {
  if (!responseFormatValue) {
    return null
  }

  try {
    if (typeof responseFormatValue === 'string') {
      return JSON.parse(responseFormatValue)
    }
    return responseFormatValue
  } catch (error) {
    logger.warn(`Failed to parse response format for block ${blockId}:`, error)
    return null
  }
}

/**
 * Extract field values from a parsed JSON object based on selected output paths
 * Used for both workspace and chat client field extraction
 */
export function extractFieldValues(
  parsedContent: any,
  selectedOutputs: string[],
  blockId: string
): Record<string, any> {
  const extractedValues: Record<string, any> = {}

  for (const outputId of selectedOutputs) {
    const blockIdForOutput = extractBlockIdFromOutputId(outputId)

    if (blockIdForOutput !== blockId) {
      continue
    }

    const path = extractPathFromOutputId(outputId, blockIdForOutput)

    if (path) {
      const current = traverseObjectPathInternal(parsedContent, path)
      if (current !== undefined) {
        extractedValues[path] = current
      }
    }
  }

  return extractedValues
}

/**
 * Format extracted field values for display
 * Returns formatted string representation of field values
 */
export function formatFieldValues(extractedValues: Record<string, any>): string {
  const formattedValues: string[] = []

  for (const [fieldName, value] of Object.entries(extractedValues)) {
    const formattedValue = typeof value === 'string' ? value : JSON.stringify(value)
    formattedValues.push(formattedValue)
  }

  return formattedValues.join('\n')
}

/**
 * Extract block ID from output ID
 * Handles both formats: "blockId" and "blockId_path" or "blockId.path"
 */
export function extractBlockIdFromOutputId(outputId: string): string {
  return outputId.includes('_') ? outputId.split('_')[0] : outputId.split('.')[0]
}

/**
 * Extract path from output ID after the block ID
 */
export function extractPathFromOutputId(outputId: string, blockId: string): string {
  return outputId.substring(blockId.length + 1)
}

/**
 * Parse JSON content from output safely
 * Handles both string and object formats with proper error handling
 */
export function parseOutputContentSafely(output: any): any {
  if (!output?.content) {
    return output
  }

  if (typeof output.content === 'string') {
    try {
      return JSON.parse(output.content)
    } catch (e) {
      // Fallback to original structure if parsing fails
      return output
    }
  }

  return output
}

/**
 * Check if a set of output IDs contains response format selections for a specific block
 */
export function hasResponseFormatSelection(selectedOutputs: string[], blockId: string): boolean {
  return selectedOutputs.some((outputId) => {
    const blockIdForOutput = extractBlockIdFromOutputId(outputId)
    return blockIdForOutput === blockId && outputId.includes('_')
  })
}

/**
 * Get selected field names for a specific block from output IDs
 */
export function getSelectedFieldNames(selectedOutputs: string[], blockId: string): string[] {
  return selectedOutputs
    .filter((outputId) => {
      const blockIdForOutput = extractBlockIdFromOutputId(outputId)
      return blockIdForOutput === blockId && outputId.includes('_')
    })
    .map((outputId) => extractPathFromOutputId(outputId, blockId))
}

/**
 * Internal helper to traverse an object path without parsing
 * @param obj The object to traverse
 * @param path The dot-separated path (e.g., "result.data.value")
 * @returns The value at the path, or undefined if path doesn't exist
 */
function traverseObjectPathInternal(obj: any, path: string): any {
  if (!path) return obj

  let current = obj
  const parts = path.split('.')

  for (const part of parts) {
    if (current?.[part] !== undefined) {
      current = current[part]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Traverses an object path safely, returning undefined if any part doesn't exist
 * Automatically handles parsing of output content if needed
 * @param obj The object to traverse (may contain unparsed content)
 * @param path The dot-separated path (e.g., "result.data.value")
 * @returns The value at the path, or undefined if path doesn't exist
 */
export function traverseObjectPath(obj: any, path: string): any {
  const parsed = parseOutputContentSafely(obj)
  return traverseObjectPathInternal(parsed, path)
}
