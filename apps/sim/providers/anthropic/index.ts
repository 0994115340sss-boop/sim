import Anthropic from '@anthropic-ai/sdk'
import { createLogger } from '@/lib/logs/console/logger'
import type { StreamingExecution } from '@/executor/types'
import { executeTool } from '@/tools'
import { getProviderDefaultModel, getProviderModels } from '../models'
import type { ProviderConfig, ProviderRequest, ProviderResponse, TimeSegment } from '../types'
import { prepareToolExecution, prepareToolsWithUsageControl, trackForcedToolUsage } from '../utils'

const logger = createLogger('AnthropicProvider')

/**
 * Helper to wrap Anthropic streaming into a browser-friendly ReadableStream
 */
function createReadableStreamFromAnthropicStream(
  anthropicStream: AsyncIterable<any>
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta?.text) {
            controller.enqueue(new TextEncoder().encode(event.delta.text))
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

export const anthropicProvider: ProviderConfig = {
  id: 'anthropic',
  name: 'Anthropic',
  description: "Anthropic's Claude models",
  version: '1.0.0',
  models: getProviderModels('anthropic'),
  defaultModel: getProviderDefaultModel('anthropic'),

  executeRequest: async (
    request: ProviderRequest
  ): Promise<ProviderResponse | StreamingExecution> => {
    if (!request.apiKey) {
      throw new Error('API key is required for Anthropic')
    }

    const anthropic = new Anthropic({ apiKey: request.apiKey })

    // Helper function to generate a simple unique ID for tool uses
    const generateToolUseId = (toolName: string) => {
      return `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    }

    // Transform messages to Anthropic format
    const messages: any[] = []

    // Add system prompt if present
    let systemPrompt = request.systemPrompt || ''

    // Add context if present
    if (request.context) {
      messages.push({
        role: 'user',
        content: request.context,
      })
    }

    // Add remaining messages
    if (request.messages) {
      request.messages.forEach((msg) => {
        if (msg.role === 'function') {
          messages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: msg.name,
                content: msg.content,
              },
            ],
          })
        } else if (msg.function_call) {
          const toolUseId = `${msg.function_call.name}-${Date.now()}`
          messages.push({
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id: toolUseId,
                name: msg.function_call.name,
                input: JSON.parse(msg.function_call.arguments),
              },
            ],
          })
        } else {
          messages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content ? [{ type: 'text', text: msg.content }] : [],
          })
        }
      })
    }

    // Ensure there's at least one message
    if (messages.length === 0) {
      messages.push({
        role: 'user',
        content: [{ type: 'text', text: systemPrompt || 'Hello' }],
      })
      // Clear system prompt since we've used it as a user message
      systemPrompt = ''
    }

    // Transform tools to Anthropic format if provided
    let anthropicTools = request.tools?.length
      ? request.tools.map((tool) => ({
          name: tool.id,
          description: tool.description,
          input_schema: {
            type: 'object',
            properties: tool.parameters.properties,
            required: tool.parameters.required,
          },
        }))
      : undefined

    // Set tool_choice based on usage control settings
    let toolChoice: 'none' | 'auto' | { type: 'tool'; name: string } = 'auto'

    // Handle tools and tool usage control
    let preparedTools: ReturnType<typeof prepareToolsWithUsageControl> | null = null

    if (anthropicTools?.length) {
      try {
        preparedTools = prepareToolsWithUsageControl(
          anthropicTools,
          request.tools,
          logger,
          'anthropic'
        )
        const { tools: filteredTools, toolChoice: tc } = preparedTools

        if (filteredTools?.length) {
          anthropicTools = filteredTools

          // No longer need conversion since provider-specific formatting is in prepareToolsWithUsageControl
          if (typeof tc === 'object' && tc !== null) {
            if (tc.type === 'tool') {
              toolChoice = tc
              logger.info(`Using Anthropic tool_choice format: force tool "${tc.name}"`)
            } else {
              // Default to auto if we got a non-Anthropic object format
              toolChoice = 'auto'
              logger.warn('Received non-Anthropic tool_choice format, defaulting to auto')
            }
          } else if (tc === 'auto' || tc === 'none') {
            toolChoice = tc
            logger.info(`Using tool_choice mode: ${tc}`)
          } else {
            // Default to auto if we got something unexpected
            toolChoice = 'auto'
            logger.warn('Unexpected tool_choice format, defaulting to auto')
          }
        }
      } catch (error) {
        logger.error('Error in prepareToolsWithUsageControl:', { error })
        // Continue with default settings
        toolChoice = 'auto'
      }
    }

    // Anthropic's structured outputs require the beta API and specific models
    const useNativeStructuredOutputs = !!(
      request.responseFormat &&
      (request.responseFormat.schema || request.responseFormat)
    )

    // Get the schema for structured outputs
    const outputSchema = request.responseFormat?.schema || request.responseFormat

    if (useNativeStructuredOutputs) {
      logger.info('Using Anthropic native structured outputs', {
        hasSchema: !!outputSchema,
        schemaProperties: outputSchema?.properties ? Object.keys(outputSchema.properties) : [],
      })
    }

    // Build the request payload
    const payload: any = {
      model: request.model || 'claude-3-7-sonnet-20250219',
      messages,
      system: systemPrompt,
      max_tokens: Number.parseInt(String(request.maxTokens)) || 1024,
      temperature: Number.parseFloat(String(request.temperature ?? 0.7)),
    }

    // Use the tools in the payload
    if (anthropicTools?.length) {
      payload.tools = anthropicTools
      // Only set tool_choice if it's not 'auto'
      if (toolChoice !== 'auto') {
        payload.tool_choice = toolChoice
      }
    }

    // Check if we should stream tool calls (default: false for chat, true for copilot)
    const shouldStreamToolCalls = request.streamToolCalls ?? false

    /**
     * Helper function to make Anthropic API calls with optional structured outputs support.
     * Uses the beta API when structured outputs are requested.
     */
    const makeAnthropicRequest = async (requestPayload: any, streaming = false) => {
      if (useNativeStructuredOutputs && outputSchema) {
        // Ensure the schema has additionalProperties: false (required by Anthropic)
        const preparedSchema = {
          ...outputSchema,
          additionalProperties: false,
        }

        // Use beta API with structured outputs
        const betaPayload = {
          ...requestPayload,
          betas: ['structured-outputs-2025-11-13'],
          output_format: {
            type: 'json_schema',
            schema: preparedSchema,
          },
          stream: streaming,
        }

        logger.info('Making Anthropic beta API call with structured outputs', {
          model: betaPayload.model,
          hasOutputFormat: true,
          streaming,
          schemaType: preparedSchema.type,
          schemaProperties: preparedSchema.properties ? Object.keys(preparedSchema.properties) : [],
        })

        return anthropic.beta.messages.create(betaPayload)
      }

      // Use regular API
      return anthropic.messages.create({
        ...requestPayload,
        stream: streaming,
      })
    }

    // EARLY STREAMING: if caller requested streaming and there are no tools to execute,
    // we can directly stream the completion.
    if (request.stream && (!anthropicTools || anthropicTools.length === 0)) {
      logger.info('Using streaming response for Anthropic request (no tools)')

      // Start execution timer for the entire provider execution
      const providerStartTime = Date.now()
      const providerStartTimeISO = new Date(providerStartTime).toISOString()

      // Create a streaming request
      const streamResponse: any = await makeAnthropicRequest(payload, true)

      // Start collecting token usage
      const tokenUsage = {
        prompt: 0,
        completion: 0,
        total: 0,
      }

      // Create a StreamingExecution response with a readable stream
      const streamingResult = {
        stream: createReadableStreamFromAnthropicStream(streamResponse),
        execution: {
          success: true,
          output: {
            content: '', // Will be filled by streaming content in chat component
            model: request.model,
            tokens: tokenUsage,
            toolCalls: undefined,
            providerTiming: {
              startTime: providerStartTimeISO,
              endTime: new Date().toISOString(),
              duration: Date.now() - providerStartTime,
              timeSegments: [
                {
                  type: 'model',
                  name: 'Streaming response',
                  startTime: providerStartTime,
                  endTime: Date.now(),
                  duration: Date.now() - providerStartTime,
                },
              ],
            },
            // Estimate token cost based on typical Claude pricing
            cost: {
              total: 0.0,
              input: 0.0,
              output: 0.0,
            },
          },
          logs: [], // No block logs for direct streaming
          metadata: {
            startTime: providerStartTimeISO,
            endTime: new Date().toISOString(),
            duration: Date.now() - providerStartTime,
          },
          isStreaming: true,
        },
      }

      // Return the streaming execution object
      return streamingResult as StreamingExecution
    }

    // NON-STREAMING WITH FINAL RESPONSE: Execute all tools silently and return only final response
    if (request.stream && !shouldStreamToolCalls) {
      logger.info('Using non-streaming mode for Anthropic request (tool calls executed silently)')

      // Start execution timer for the entire provider execution
      const providerStartTime = Date.now()
      const providerStartTimeISO = new Date(providerStartTime).toISOString()

      try {
        // Make the initial API request
        const initialCallTime = Date.now()

        // Track the original tool_choice for forced tool tracking
        const originalToolChoice = payload.tool_choice

        // Track forced tools and their usage
        const forcedTools = preparedTools?.forcedTools || []
        let usedForcedTools: string[] = []

        let currentResponse = (await makeAnthropicRequest(payload, false)) as Anthropic.Message
        const firstResponseTime = Date.now() - initialCallTime

        logger.info('Anthropic initial response received', {
          stopReason: currentResponse.stop_reason,
          contentTypes: currentResponse.content.map((c) => c.type),
          hasStructuredOutput: useNativeStructuredOutputs,
        })

        let content = ''

        // Extract text content from the message
        if (Array.isArray(currentResponse.content)) {
          content = currentResponse.content
            .filter((item) => item.type === 'text')
            .map((item) => item.text)
            .join('\n')
        }

        const tokens = {
          prompt: currentResponse.usage?.input_tokens || 0,
          completion: currentResponse.usage?.output_tokens || 0,
          total:
            (currentResponse.usage?.input_tokens || 0) +
            (currentResponse.usage?.output_tokens || 0),
        }

        const toolCalls = []
        const toolResults = []
        const currentMessages = [...messages]
        let iterationCount = 0
        const MAX_ITERATIONS = 10 // Prevent infinite loops

        // Track if a forced tool has been used
        let hasUsedForcedTool = false

        // Track time spent in model vs tools
        let modelTime = firstResponseTime
        let toolsTime = 0

        // Track each model and tool call segment with timestamps
        const timeSegments: TimeSegment[] = [
          {
            type: 'model',
            name: 'Initial response',
            startTime: initialCallTime,
            endTime: initialCallTime + firstResponseTime,
            duration: firstResponseTime,
          },
        ]

        // Helper function to check for forced tool usage in Anthropic responses
        const checkForForcedToolUsage = (response: any, toolChoice: any) => {
          if (
            typeof toolChoice === 'object' &&
            toolChoice !== null &&
            Array.isArray(response.content)
          ) {
            const toolUses = response.content.filter((item: any) => item.type === 'tool_use')

            if (toolUses.length > 0) {
              // Convert Anthropic tool_use format to a format trackForcedToolUsage can understand
              const adaptedToolCalls = toolUses.map((tool: any) => ({
                name: tool.name,
              }))

              // Convert Anthropic tool_choice format to match OpenAI format for tracking
              const adaptedToolChoice =
                toolChoice.type === 'tool' ? { function: { name: toolChoice.name } } : toolChoice

              const result = trackForcedToolUsage(
                adaptedToolCalls,
                adaptedToolChoice,
                logger,
                'anthropic',
                forcedTools,
                usedForcedTools
              )
              // Make the behavior consistent with the initial check
              hasUsedForcedTool = result.hasUsedForcedTool
              usedForcedTools = result.usedForcedTools
              return result
            }
          }
          return null
        }

        // Check if a forced tool was used in the first response
        checkForForcedToolUsage(currentResponse, originalToolChoice)

        try {
          while (iterationCount < MAX_ITERATIONS) {
            // Check for tool calls
            const toolUses = currentResponse.content.filter((item) => item.type === 'tool_use')
            if (!toolUses || toolUses.length === 0) {
              break
            }

            // Track time for tool calls in this batch
            const toolsStartTime = Date.now()

            // Process each tool call
            for (const toolUse of toolUses) {
              try {
                const toolName = toolUse.name
                const toolArgs = toolUse.input as Record<string, any>

                // Get the tool from the tools registry
                const tool = request.tools?.find((t: any) => t.id === toolName)
                if (!tool) continue

                // Execute the tool
                const toolCallStartTime = Date.now()

                const { toolParams, executionParams } = prepareToolExecution(
                  tool,
                  toolArgs,
                  request
                )

                // Use general tool system for requests
                const result = await executeTool(toolName, executionParams, true)
                const toolCallEndTime = Date.now()
                const toolCallDuration = toolCallEndTime - toolCallStartTime

                // Add to time segments for both success and failure
                timeSegments.push({
                  type: 'tool',
                  name: toolName,
                  startTime: toolCallStartTime,
                  endTime: toolCallEndTime,
                  duration: toolCallDuration,
                })

                // Prepare result content for the LLM
                let resultContent: any
                if (result.success) {
                  toolResults.push(result.output)
                  resultContent = result.output
                } else {
                  // Include error information so LLM can respond appropriately
                  resultContent = {
                    error: true,
                    message: result.error || 'Tool execution failed',
                    tool: toolName,
                  }
                }

                toolCalls.push({
                  name: toolName,
                  arguments: toolParams,
                  startTime: new Date(toolCallStartTime).toISOString(),
                  endTime: new Date(toolCallEndTime).toISOString(),
                  duration: toolCallDuration,
                  result: resultContent,
                  success: result.success,
                })

                // Add the tool call and result to messages (both success and failure)
                const toolUseId = generateToolUseId(toolName)

                currentMessages.push({
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool_use',
                      id: toolUseId,
                      name: toolName,
                      input: toolArgs,
                    } as any,
                  ],
                })

                currentMessages.push({
                  role: 'user',
                  content: [
                    {
                      type: 'tool_result',
                      tool_use_id: toolUseId,
                      content: JSON.stringify(resultContent),
                    } as any,
                  ],
                })
              } catch (error) {
                logger.error('Error processing tool call:', { error })
              }
            }

            // Calculate tool call time for this iteration
            const thisToolsTime = Date.now() - toolsStartTime
            toolsTime += thisToolsTime

            // Make the next request with updated messages
            const nextPayload = {
              ...payload,
              messages: currentMessages,
            }

            // Update tool_choice based on which forced tools have been used
            if (
              typeof originalToolChoice === 'object' &&
              hasUsedForcedTool &&
              forcedTools.length > 0
            ) {
              // If we have remaining forced tools, get the next one to force
              const remainingTools = forcedTools.filter((tool) => !usedForcedTools.includes(tool))

              if (remainingTools.length > 0) {
                // Force the next tool - use Anthropic format
                nextPayload.tool_choice = {
                  type: 'tool',
                  name: remainingTools[0],
                }
                logger.info(`Forcing next tool: ${remainingTools[0]}`)
              } else {
                // All forced tools have been used, switch to auto by removing tool_choice
                nextPayload.tool_choice = undefined
                logger.info('All forced tools have been used, removing tool_choice parameter')
              }
            } else if (hasUsedForcedTool && typeof originalToolChoice === 'object') {
              // Handle the case of a single forced tool that was used
              nextPayload.tool_choice = undefined
              logger.info(
                'Removing tool_choice parameter for subsequent requests after forced tool was used'
              )
            }

            // Time the next model call
            const nextModelStartTime = Date.now()

            // Make the next request
            currentResponse = (await makeAnthropicRequest(nextPayload, false)) as Anthropic.Message

            // Check if any forced tools were used in this response
            checkForForcedToolUsage(currentResponse, nextPayload.tool_choice)

            const nextModelEndTime = Date.now()
            const thisModelTime = nextModelEndTime - nextModelStartTime

            // Add to time segments
            timeSegments.push({
              type: 'model',
              name: `Model response (iteration ${iterationCount + 1})`,
              startTime: nextModelStartTime,
              endTime: nextModelEndTime,
              duration: thisModelTime,
            })

            // Add to model time
            modelTime += thisModelTime

            // Update content if we have a text response
            const textContent = currentResponse.content
              .filter((item) => item.type === 'text')
              .map((item) => item.text)
              .join('\n')

            if (textContent) {
              content = textContent
            }

            // Update token counts
            if (currentResponse.usage) {
              tokens.prompt += currentResponse.usage.input_tokens || 0
              tokens.completion += currentResponse.usage.output_tokens || 0
              tokens.total +=
                (currentResponse.usage.input_tokens || 0) +
                (currentResponse.usage.output_tokens || 0)
            }

            iterationCount++
          }
        } catch (error) {
          logger.error('Error in Anthropic request:', { error })
          throw error
        }

        if (useNativeStructuredOutputs) {
          logger.info('Anthropic structured output content', {
            contentLength: content.length,
            contentPreview: content.substring(0, 200),
          })
        } else if (content.includes('{') && content.includes('}')) {
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/m)
            if (jsonMatch) {
              content = jsonMatch[0]
            }
          } catch (e) {
            logger.error('Error extracting JSON from response:', { error: e })
          }
        }

        // Calculate overall timing
        const providerEndTime = Date.now()
        const providerEndTimeISO = new Date(providerEndTime).toISOString()
        const totalDuration = providerEndTime - providerStartTime

        // If no tool calls were made, return a direct response
        return {
          content,
          model: request.model || 'claude-3-7-sonnet-20250219',
          tokens,
          toolCalls:
            toolCalls.length > 0
              ? toolCalls.map((tc) => ({
                  name: tc.name,
                  arguments: tc.arguments as Record<string, any>,
                  startTime: tc.startTime,
                  endTime: tc.endTime,
                  duration: tc.duration,
                  result: tc.result,
                }))
              : undefined,
          toolResults: toolResults.length > 0 ? toolResults : undefined,
          timing: {
            startTime: providerStartTimeISO,
            endTime: providerEndTimeISO,
            duration: totalDuration,
            modelTime: modelTime,
            toolsTime: toolsTime,
            firstResponseTime: firstResponseTime,
            iterations: iterationCount + 1,
            timeSegments: timeSegments,
          },
        }
      } catch (error) {
        // Include timing information even for errors
        const providerEndTime = Date.now()
        const providerEndTimeISO = new Date(providerEndTime).toISOString()
        const totalDuration = providerEndTime - providerStartTime

        logger.error('Error in Anthropic request:', {
          error,
          duration: totalDuration,
        })

        // Create a new error with timing information
        const enhancedError = new Error(error instanceof Error ? error.message : String(error))
        // @ts-ignore - Adding timing property to the error
        enhancedError.timing = {
          startTime: providerStartTimeISO,
          endTime: providerEndTimeISO,
          duration: totalDuration,
        }

        throw enhancedError
      }
    }

    // Start execution timer for the entire provider execution
    const providerStartTime = Date.now()
    const providerStartTimeISO = new Date(providerStartTime).toISOString()

    try {
      // Make the initial API request
      const initialCallTime = Date.now()

      // Track the original tool_choice for forced tool tracking
      const originalToolChoice = payload.tool_choice

      // Track forced tools and their usage
      const forcedTools = preparedTools?.forcedTools || []
      let usedForcedTools: string[] = []

      let currentResponse = (await makeAnthropicRequest(payload, false)) as Anthropic.Message
      const firstResponseTime = Date.now() - initialCallTime

      logger.info('Anthropic initial response received (non-streaming path)', {
        stopReason: currentResponse.stop_reason,
        contentTypes: currentResponse.content.map((c) => c.type),
        hasStructuredOutput: useNativeStructuredOutputs,
      })

      let content = ''

      // Extract text content from the message
      if (Array.isArray(currentResponse.content)) {
        content = currentResponse.content
          .filter((item) => item.type === 'text')
          .map((item) => item.text)
          .join('\n')
      }

      const tokens = {
        prompt: currentResponse.usage?.input_tokens || 0,
        completion: currentResponse.usage?.output_tokens || 0,
        total:
          (currentResponse.usage?.input_tokens || 0) + (currentResponse.usage?.output_tokens || 0),
      }

      const toolCalls = []
      const toolResults = []
      const currentMessages = [...messages]
      let iterationCount = 0
      const MAX_ITERATIONS = 10 // Prevent infinite loops

      // Track if a forced tool has been used
      let hasUsedForcedTool = false

      // Track time spent in model vs tools
      let modelTime = firstResponseTime
      let toolsTime = 0

      // Track each model and tool call segment with timestamps
      const timeSegments: TimeSegment[] = [
        {
          type: 'model',
          name: 'Initial response',
          startTime: initialCallTime,
          endTime: initialCallTime + firstResponseTime,
          duration: firstResponseTime,
        },
      ]

      // Helper function to check for forced tool usage in Anthropic responses
      const checkForForcedToolUsage = (response: any, toolChoice: any) => {
        if (
          typeof toolChoice === 'object' &&
          toolChoice !== null &&
          Array.isArray(response.content)
        ) {
          const toolUses = response.content.filter((item: any) => item.type === 'tool_use')

          if (toolUses.length > 0) {
            // Convert Anthropic tool_use format to a format trackForcedToolUsage can understand
            const adaptedToolCalls = toolUses.map((tool: any) => ({
              name: tool.name,
            }))

            // Convert Anthropic tool_choice format to match OpenAI format for tracking
            const adaptedToolChoice =
              toolChoice.type === 'tool' ? { function: { name: toolChoice.name } } : toolChoice

            const result = trackForcedToolUsage(
              adaptedToolCalls,
              adaptedToolChoice,
              logger,
              'anthropic',
              forcedTools,
              usedForcedTools
            )
            // Make the behavior consistent with the initial check
            hasUsedForcedTool = result.hasUsedForcedTool
            usedForcedTools = result.usedForcedTools
            return result
          }
        }
        return null
      }

      // Check if a forced tool was used in the first response
      checkForForcedToolUsage(currentResponse, originalToolChoice)

      try {
        while (iterationCount < MAX_ITERATIONS) {
          // Check for tool calls
          const toolUses = currentResponse.content.filter((item) => item.type === 'tool_use')
          if (!toolUses || toolUses.length === 0) {
            break
          }

          // Track time for tool calls in this batch
          const toolsStartTime = Date.now()

          // Process each tool call
          for (const toolUse of toolUses) {
            try {
              const toolName = toolUse.name
              const toolArgs = toolUse.input as Record<string, any>

              // Get the tool from the tools registry
              const tool = request.tools?.find((t) => t.id === toolName)
              if (!tool) continue

              // Execute the tool
              const toolCallStartTime = Date.now()

              const { toolParams, executionParams } = prepareToolExecution(tool, toolArgs, request)

              // Use general tool system for requests
              const result = await executeTool(toolName, executionParams, true)
              const toolCallEndTime = Date.now()
              const toolCallDuration = toolCallEndTime - toolCallStartTime

              // Add to time segments for both success and failure
              timeSegments.push({
                type: 'tool',
                name: toolName,
                startTime: toolCallStartTime,
                endTime: toolCallEndTime,
                duration: toolCallDuration,
              })

              // Prepare result content for the LLM
              let resultContent: any
              if (result.success) {
                toolResults.push(result.output)
                resultContent = result.output
              } else {
                // Include error information so LLM can respond appropriately
                resultContent = {
                  error: true,
                  message: result.error || 'Tool execution failed',
                  tool: toolName,
                }
              }

              toolCalls.push({
                name: toolName,
                arguments: toolParams,
                startTime: new Date(toolCallStartTime).toISOString(),
                endTime: new Date(toolCallEndTime).toISOString(),
                duration: toolCallDuration,
                result: resultContent,
                success: result.success,
              })

              // Add the tool call and result to messages (both success and failure)
              const toolUseId = generateToolUseId(toolName)

              currentMessages.push({
                role: 'assistant',
                content: [
                  {
                    type: 'tool_use',
                    id: toolUseId,
                    name: toolName,
                    input: toolArgs,
                  } as any,
                ],
              })

              currentMessages.push({
                role: 'user',
                content: [
                  {
                    type: 'tool_result',
                    tool_use_id: toolUseId,
                    content: JSON.stringify(resultContent),
                  } as any,
                ],
              })
            } catch (error) {
              logger.error('Error processing tool call:', { error })
            }
          }

          // Calculate tool call time for this iteration
          const thisToolsTime = Date.now() - toolsStartTime
          toolsTime += thisToolsTime

          // Make the next request with updated messages
          const nextPayload = {
            ...payload,
            messages: currentMessages,
          }

          // Update tool_choice based on which forced tools have been used
          if (
            typeof originalToolChoice === 'object' &&
            hasUsedForcedTool &&
            forcedTools.length > 0
          ) {
            // If we have remaining forced tools, get the next one to force
            const remainingTools = forcedTools.filter((tool) => !usedForcedTools.includes(tool))

            if (remainingTools.length > 0) {
              // Force the next tool - use Anthropic format
              nextPayload.tool_choice = {
                type: 'tool',
                name: remainingTools[0],
              }
              logger.info(`Forcing next tool: ${remainingTools[0]}`)
            } else {
              // All forced tools have been used, switch to auto by removing tool_choice
              nextPayload.tool_choice = undefined
              logger.info('All forced tools have been used, removing tool_choice parameter')
            }
          } else if (hasUsedForcedTool && typeof originalToolChoice === 'object') {
            // Handle the case of a single forced tool that was used
            nextPayload.tool_choice = undefined
            logger.info(
              'Removing tool_choice parameter for subsequent requests after forced tool was used'
            )
          }

          // Time the next model call
          const nextModelStartTime = Date.now()

          // Make the next request
          currentResponse = (await makeAnthropicRequest(nextPayload, false)) as Anthropic.Message

          // Check if any forced tools were used in this response
          checkForForcedToolUsage(currentResponse, nextPayload.tool_choice)

          const nextModelEndTime = Date.now()
          const thisModelTime = nextModelEndTime - nextModelStartTime

          // Add to time segments
          timeSegments.push({
            type: 'model',
            name: `Model response (iteration ${iterationCount + 1})`,
            startTime: nextModelStartTime,
            endTime: nextModelEndTime,
            duration: thisModelTime,
          })

          // Add to model time
          modelTime += thisModelTime

          // Update content if we have a text response
          const textContent = currentResponse.content
            .filter((item) => item.type === 'text')
            .map((item) => item.text)
            .join('\n')

          if (textContent) {
            content = textContent
          }

          // Update token counts
          if (currentResponse.usage) {
            tokens.prompt += currentResponse.usage.input_tokens || 0
            tokens.completion += currentResponse.usage.output_tokens || 0
            tokens.total +=
              (currentResponse.usage.input_tokens || 0) + (currentResponse.usage.output_tokens || 0)
          }

          iterationCount++
        }
      } catch (error) {
        logger.error('Error in Anthropic request:', { error })
        throw error
      }

      if (useNativeStructuredOutputs) {
        logger.info('Anthropic structured output content (non-streaming path)', {
          contentLength: content.length,
          contentPreview: content.substring(0, 200),
        })
      } else if (content.includes('{') && content.includes('}')) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/m)
          if (jsonMatch) {
            content = jsonMatch[0]
          }
        } catch (e) {
          logger.error('Error extracting JSON from response:', { error: e })
        }
      }

      // Calculate overall timing
      const providerEndTime = Date.now()
      const providerEndTimeISO = new Date(providerEndTime).toISOString()
      const totalDuration = providerEndTime - providerStartTime

      // After all tool processing complete, if streaming was requested, use streaming for the final response
      if (request.stream) {
        logger.info('Using streaming for final Anthropic response after tool processing')

        // When streaming after tool calls with forced tools, make sure tool_choice is removed
        // This prevents the API from trying to force tool usage again in the final streaming response
        const streamingPayload = {
          ...payload,
          messages: currentMessages,
          // For Anthropic, omit tool_choice entirely rather than setting it to 'none'
        }

        // Remove the tool_choice parameter as Anthropic doesn't accept 'none' as a string value
        streamingPayload.tool_choice = undefined

        const streamResponse: any = await makeAnthropicRequest(streamingPayload, true)

        // Create a StreamingExecution response with all collected data
        const streamingResult = {
          stream: createReadableStreamFromAnthropicStream(streamResponse),
          execution: {
            success: true,
            output: {
              content: '', // Will be filled by the callback
              model: request.model || 'claude-3-7-sonnet-20250219',
              tokens: {
                prompt: tokens.prompt,
                completion: tokens.completion,
                total: tokens.total,
              },
              toolCalls:
                toolCalls.length > 0
                  ? {
                      list: toolCalls,
                      count: toolCalls.length,
                    }
                  : undefined,
              providerTiming: {
                startTime: providerStartTimeISO,
                endTime: new Date().toISOString(),
                duration: Date.now() - providerStartTime,
                modelTime: modelTime,
                toolsTime: toolsTime,
                firstResponseTime: firstResponseTime,
                iterations: iterationCount + 1,
                timeSegments: timeSegments,
              },
              cost: {
                total: (tokens.total || 0) * 0.0001, // Estimate cost based on tokens
                input: (tokens.prompt || 0) * 0.0001,
                output: (tokens.completion || 0) * 0.0001,
              },
            },
            logs: [], // No block logs at provider level
            metadata: {
              startTime: providerStartTimeISO,
              endTime: new Date().toISOString(),
              duration: Date.now() - providerStartTime,
            },
            isStreaming: true,
          },
        }

        return streamingResult as StreamingExecution
      }

      return {
        content,
        model: request.model || 'claude-3-7-sonnet-20250219',
        tokens,
        toolCalls:
          toolCalls.length > 0
            ? toolCalls.map((tc) => ({
                name: tc.name,
                arguments: tc.arguments as Record<string, any>,
                startTime: tc.startTime,
                endTime: tc.endTime,
                duration: tc.duration,
                result: tc.result,
              }))
            : undefined,
        toolResults: toolResults.length > 0 ? toolResults : undefined,
        timing: {
          startTime: providerStartTimeISO,
          endTime: providerEndTimeISO,
          duration: totalDuration,
          modelTime: modelTime,
          toolsTime: toolsTime,
          firstResponseTime: firstResponseTime,
          iterations: iterationCount + 1,
          timeSegments: timeSegments,
        },
      }
    } catch (error) {
      // Include timing information even for errors
      const providerEndTime = Date.now()
      const providerEndTimeISO = new Date(providerEndTime).toISOString()
      const totalDuration = providerEndTime - providerStartTime

      logger.error('Error in Anthropic request:', {
        error,
        duration: totalDuration,
      })

      // Create a new error with timing information
      const enhancedError = new Error(error instanceof Error ? error.message : String(error))
      // @ts-ignore - Adding timing property to the error
      enhancedError.timing = {
        startTime: providerStartTimeISO,
        endTime: providerEndTimeISO,
        duration: totalDuration,
      }

      throw enhancedError
    }
  },
}
