import { ApifyIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { RunActorResult } from '@/tools/apify/types'

export const ApifyBlock: BlockConfig<RunActorResult> = {
  type: 'apify',
  name: 'Apify',
  description: 'Run Apify actors and retrieve results',
  longDescription:
    'Integrate Apify into your workflow. Run any Apify actor with custom input and retrieve results. Supports both synchronous and asynchronous execution with automatic dataset fetching.',
  docsLink: 'https://docs.sim.ai/tools/apify',
  category: 'tools',
  bgColor: '#E0E0E0',
  icon: ApifyIcon,

  subBlocks: [
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { label: 'Run Actor', id: 'apify_run_actor_sync' },
        { label: 'Run Actor (Async)', id: 'apify_run_actor_async' },
      ],
      value: () => 'apify_run_actor_sync',
    },
    {
      id: 'apiKey',
      title: 'Apify API Token',
      type: 'short-input',
      password: true,
      placeholder: 'Enter your Apify API token',
      required: true,
    },
    {
      id: 'actorId',
      title: 'Actor ID',
      type: 'short-input',
      placeholder: 'e.g., janedoe/my-actor or actor ID',
      required: true,
    },
    {
      id: 'input',
      title: 'Actor Input',
      type: 'code',
      language: 'json',
      placeholder: '{\n  "startUrl": "https://example.com",\n  "maxPages": 10\n}',
      required: false,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Apify developer. Generate JSON input for Apify actors based on the user's request.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.url>\`, \`<function1.result.query>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{APIFY_PROXY_PASSWORD}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY valid JSON input for the Apify actor. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### COMMON APIFY ACTOR INPUT PATTERNS

**Web Scraping Actors**:
- startUrls: Array of URLs to start scraping from
- maxRequestsPerCrawl: Maximum number of pages to scrape
- proxyConfiguration: Proxy settings

**E-commerce Scrapers**:
- searchTerms: Array of search queries
- maxItems: Maximum products to return
- categoryUrls: URLs of categories to scrape

**Social Media Scrapers**:
- handles: Array of usernames/handles
- resultsLimit: Maximum posts/items to return
- startDate/endDate: Date range filters

### EXAMPLES

**Web scraper**: "Scrape product pages from example.com, max 50 pages"
→ {
  "startUrls": [{"url": "https://example.com/products"}],
  "maxRequestsPerCrawl": 50,
  "proxyConfiguration": {"useApifyProxy": true}
}

**With variables**: "Scrape URL from previous block"
→ {
  "startUrls": [{"url": <agent1.target_url>}],
  "maxRequestsPerCrawl": <function1.max_pages>,
  "proxyConfiguration": {"useApifyProxy": true}
}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the input for the Apify actor...',
        generationType: 'json-object',
      },
    },
    {
      id: 'timeout',
      title: 'Timeout',
      type: 'short-input',
      placeholder: 'Actor timeout in seconds',
      required: false,
    },
    {
      id: 'build',
      title: 'Build',
      type: 'short-input',
      placeholder: 'Actor build (e.g., "latest", "beta", or build tag)',
      required: false,
    },
    {
      id: 'waitForFinish',
      title: 'Wait For Finish',
      type: 'short-input',
      placeholder: 'Initial wait time in seconds (0-60)',
      required: false,
      condition: {
        field: 'operation',
        value: 'apify_run_actor_async',
      },
    },
    {
      id: 'itemLimit',
      title: 'Item Limit',
      type: 'short-input',
      placeholder: 'Max dataset items to fetch (1-250000)',
      required: false,
      condition: {
        field: 'operation',
        value: 'apify_run_actor_async',
      },
    },
  ],

  tools: {
    access: ['apify_run_actor_sync', 'apify_run_actor_async'],
    config: {
      tool: (params) => params.operation,
      params: (params: Record<string, any>) => {
        const { operation, ...rest } = params
        const result: Record<string, any> = {
          apiKey: rest.apiKey,
          actorId: rest.actorId,
        }

        if (rest.input) {
          result.input = rest.input
        }

        if (rest.timeout) {
          result.timeout = Number(rest.timeout)
        }

        if (rest.build) {
          result.build = rest.build
        }

        if (rest.waitForFinish) {
          result.waitForFinish = Number(rest.waitForFinish)
        }

        if (rest.itemLimit) {
          result.itemLimit = Number(rest.itemLimit)
        }

        return result
      },
    },
  },

  inputs: {
    operation: { type: 'string', description: 'Operation to perform' },
    apiKey: { type: 'string', description: 'Apify API token' },
    actorId: { type: 'string', description: 'Actor ID or username/actor-name' },
    input: { type: 'string', description: 'Actor input as JSON string' },
    timeout: { type: 'number', description: 'Timeout in seconds' },
    build: { type: 'string', description: 'Actor build version' },
    waitForFinish: { type: 'number', description: 'Initial wait time in seconds' },
    itemLimit: { type: 'number', description: 'Max dataset items to fetch' },
  },

  outputs: {
    success: { type: 'boolean', description: 'Whether the actor run succeeded' },
    runId: { type: 'string', description: 'Apify run ID' },
    status: { type: 'string', description: 'Run status (SUCCEEDED, FAILED, etc.)' },
    datasetId: { type: 'string', description: 'Dataset ID containing results' },
    items: { type: 'json', description: 'Dataset items (if completed)' },
  },
}
