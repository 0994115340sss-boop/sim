import { xIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import { AuthMode } from '@/blocks/types'
import type { XResponse } from '@/tools/x/types'

export const XBlock: BlockConfig<XResponse> = {
  type: 'x',
  name: 'X',
  description: 'Interact with X',
  authMode: AuthMode.OAuth,
  longDescription:
    'Integrate X into the workflow. Can post a new tweet, get tweet details, search tweets, and get user profile.',
  docsLink: 'https://docs.sim.ai/tools/x',
  category: 'tools',
  bgColor: '#000000', // X's black color
  icon: xIcon,
  subBlocks: [
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { label: 'Post a New Tweet', id: 'x_write' },
        { label: 'Get Tweet Details', id: 'x_read' },
        { label: 'Search Tweets', id: 'x_search' },
        { label: 'Get User Profile', id: 'x_user' },
      ],
      value: () => 'x_write',
    },
    {
      id: 'credential',
      title: 'X Account',
      type: 'oauth-input',
      serviceId: 'x',
      requiredScopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      placeholder: 'Select X account',
    },
    {
      id: 'text',
      title: 'Tweet Text',
      type: 'long-input',
      placeholder: "What's happening?",
      condition: { field: 'operation', value: 'x_write' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert X (Twitter) content creator. Write engaging tweets optimized for the platform.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.topic>\`, \`<function1.result>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{HANDLE}}\`)

### X/TWITTER BEST PRACTICES
1. **Length**: 280 characters max, but shorter often performs better
2. **Hook**: Lead with the most interesting part
3. **Hashtags**: Use 1-2 relevant hashtags sparingly
4. **Threads**: For longer content, suggest a thread format
5. **Engagement**: Ask questions or invite responses
6. **Emojis**: Use to add personality and visual breaks

### GUIDELINES
- Be concise and punchy
- Use conversational tone
- Avoid excessive hashtags
- Include a hook in the first few words
- Create curiosity or value

### EXAMPLES

**Announcement**: "Tweet about a new feature launch"
→ Just shipped: Dark mode is finally here 🌙

Your eyes will thank you.

Update now →

**Hot take**: "Share an opinion on tech trends"
→ Unpopular opinion: Most "AI tools" are just GPT wrappers with nice UIs.

The real innovation isn't the model—it's the UX.

**With variables**: "Share automated update"
→ 📊 Weekly stats update:

Users: <function1.user_count>
Growth: <function1.growth_rate>%

Thanks for being part of the journey! 🚀

**Thread starter**: "Start a thread on a topic"
→ I've spent 10 years building products.

Here are 7 lessons I wish I knew on day one:

🧵 (1/8)

### REMEMBER
Keep it under 280 characters. Be concise and engaging.`,
        placeholder: 'Describe the tweet you want to create...',
        generationType: 'social-post',
      },
    },
    {
      id: 'replyTo',
      title: 'Reply To (Tweet ID)',
      type: 'short-input',
      placeholder: 'Enter tweet ID to reply to',
      condition: { field: 'operation', value: 'x_write' },
    },
    {
      id: 'mediaIds',
      title: 'Media IDs',
      type: 'short-input',
      placeholder: 'Enter comma-separated media IDs',
      condition: { field: 'operation', value: 'x_write' },
    },
    {
      id: 'tweetId',
      title: 'Tweet ID',
      type: 'short-input',
      placeholder: 'Enter tweet ID to read',
      condition: { field: 'operation', value: 'x_read' },
      required: true,
    },
    {
      id: 'includeReplies',
      title: 'Include Replies',
      type: 'dropdown',
      options: [
        { label: 'true', id: 'true' },
        { label: 'false', id: 'false' },
      ],
      value: () => 'false',
      condition: { field: 'operation', value: 'x_read' },
    },
    {
      id: 'query',
      title: 'Search Query',
      type: 'long-input',
      placeholder: 'Enter search terms (supports X search operators)',
      condition: { field: 'operation', value: 'x_search' },
      required: true,
    },
    {
      id: 'maxResults',
      title: 'Max Results',
      type: 'short-input',
      placeholder: '10',
      condition: { field: 'operation', value: 'x_search' },
    },
    {
      id: 'sortOrder',
      title: 'Sort Order',
      type: 'dropdown',
      options: [
        { label: 'recency', id: 'recency' },
        { label: 'relevancy', id: 'relevancy' },
      ],
      value: () => 'recency',
      condition: { field: 'operation', value: 'x_search' },
    },
    {
      id: 'startTime',
      title: 'Start Time',
      type: 'short-input',
      placeholder: 'YYYY-MM-DDTHH:mm:ssZ',
      condition: { field: 'operation', value: 'x_search' },
    },
    {
      id: 'endTime',
      title: 'End Time',
      type: 'short-input',
      placeholder: 'YYYY-MM-DDTHH:mm:ssZ',
      condition: { field: 'operation', value: 'x_search' },
    },
    {
      id: 'username',
      title: 'Username',
      type: 'short-input',
      placeholder: 'Enter username (without @)',
      condition: { field: 'operation', value: 'x_user' },
      required: true,
    },
  ],
  tools: {
    access: ['x_write', 'x_read', 'x_search', 'x_user'],
    config: {
      tool: (params) => {
        switch (params.operation) {
          case 'x_write':
            return 'x_write'
          case 'x_read':
            return 'x_read'
          case 'x_search':
            return 'x_search'
          case 'x_user':
            return 'x_user'
          default:
            return 'x_write'
        }
      },
      params: (params) => {
        const { credential, ...rest } = params

        const parsedParams: Record<string, any> = {
          credential: credential,
        }

        Object.keys(rest).forEach((key) => {
          const value = rest[key]

          if (value === 'true' || value === 'false') {
            parsedParams[key] = value === 'true'
          } else if (key === 'maxResults' && value) {
            parsedParams[key] = Number.parseInt(value as string, 10)
          } else if (key === 'mediaIds' && typeof value === 'string') {
            parsedParams[key] = value
              .split(',')
              .map((id) => id.trim())
              .filter((id) => id !== '')
          } else {
            parsedParams[key] = value
          }
        })

        return parsedParams
      },
    },
  },
  inputs: {
    operation: { type: 'string', description: 'Operation to perform' },
    credential: { type: 'string', description: 'X account credential' },
    text: { type: 'string', description: 'Tweet text content' },
    replyTo: { type: 'string', description: 'Reply to tweet ID' },
    mediaIds: { type: 'string', description: 'Media identifiers' },
    poll: { type: 'json', description: 'Poll configuration' },
    tweetId: { type: 'string', description: 'Tweet identifier' },
    includeReplies: { type: 'boolean', description: 'Include replies' },
    query: { type: 'string', description: 'Search query terms' },
    maxResults: { type: 'number', description: 'Maximum search results' },
    startTime: { type: 'string', description: 'Search start time' },
    endTime: { type: 'string', description: 'Search end time' },
    sortOrder: { type: 'string', description: 'Result sort order' },
    username: { type: 'string', description: 'User profile name' },
    includeRecentTweets: { type: 'boolean', description: 'Include recent tweets' },
  },
  outputs: {
    // Write and Read operation outputs
    tweet: {
      type: 'json',
      description: 'Tweet data including contextAnnotations and publicMetrics',
      condition: { field: 'operation', value: ['x_write', 'x_read'] },
    },
    // Read operation outputs
    replies: {
      type: 'json',
      description: 'Tweet replies (when includeReplies is true)',
      condition: { field: 'operation', value: 'x_read' },
    },
    context: {
      type: 'json',
      description: 'Tweet context (parent and quoted tweets)',
      condition: { field: 'operation', value: 'x_read' },
    },
    // Search operation outputs
    tweets: {
      type: 'json',
      description: 'Tweets data including contextAnnotations and publicMetrics',
      condition: { field: 'operation', value: 'x_search' },
    },
    includes: {
      type: 'json',
      description: 'Additional data (users, media, polls)',
      condition: { field: 'operation', value: 'x_search' },
    },
    meta: {
      type: 'json',
      description: 'Response metadata',
      condition: { field: 'operation', value: 'x_search' },
    },
    // User operation outputs
    user: {
      type: 'json',
      description: 'User profile data',
      condition: { field: 'operation', value: 'x_user' },
    },
    recentTweets: {
      type: 'json',
      description: 'Recent tweets data',
      condition: { field: 'operation', value: 'x_user' },
    },
  },
}
