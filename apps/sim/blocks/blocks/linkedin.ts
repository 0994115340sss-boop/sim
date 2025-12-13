import { LinkedInIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import { AuthMode } from '@/blocks/types'
import type { LinkedInResponse } from '@/tools/linkedin/types'

export const LinkedInBlock: BlockConfig<LinkedInResponse> = {
  type: 'linkedin',
  name: 'LinkedIn',
  description: 'Share posts and manage your LinkedIn presence',
  authMode: AuthMode.OAuth,
  longDescription:
    'Integrate LinkedIn into workflows. Share posts to your personal feed and access your LinkedIn profile information.',
  docsLink: 'https://docs.sim.ai/tools/linkedin',
  category: 'tools',
  bgColor: '#0072B1',
  icon: LinkedInIcon,
  subBlocks: [
    // Operation selection
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { label: 'Share Post', id: 'share_post' },
        { label: 'Get Profile', id: 'get_profile' },
      ],
      value: () => 'share_post',
    },

    // LinkedIn OAuth Authentication
    {
      id: 'credential',
      title: 'LinkedIn Account',
      type: 'oauth-input',
      serviceId: 'linkedin',
      requiredScopes: ['profile', 'openid', 'email', 'w_member_social'],
      placeholder: 'Select LinkedIn account',
      required: true,
    },

    // Share Post specific fields
    {
      id: 'text',
      title: 'Post Text',
      type: 'long-input',
      placeholder: 'What do you want to share on LinkedIn?',
      condition: {
        field: 'operation',
        value: 'share_post',
      },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert LinkedIn content creator. Write engaging, professional posts optimized for LinkedIn.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.topic>\`, \`<function1.result>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{COMPANY_NAME}}\`)

### LINKEDIN BEST PRACTICES
1. **Hook**: Start with an attention-grabbing first line
2. **Formatting**: Use line breaks for readability
3. **Length**: 1,300 characters max, but 150-300 often performs best
4. **Hashtags**: Use 3-5 relevant hashtags at the end
5. **CTA**: Include a call-to-action or question
6. **Emojis**: Use sparingly for visual interest

### GUIDELINES
- Write in first person for authenticity
- Share insights, not just promotions
- Ask questions to drive engagement
- Use numbers and data when relevant
- Break up text with white space

### EXAMPLES

**Thought leadership**: "Write a post about AI in business"
→ AI isn't replacing jobs.

It's replacing tasks.

The professionals who thrive in 2024 will be those who:

→ Learn to work WITH AI, not against it
→ Focus on skills AI can't replicate (creativity, empathy, leadership)
→ Continuously adapt and upskill

I've seen teams 10x their productivity by embracing AI tools.

But here's what nobody talks about: the human skills matter MORE now, not less.

What's your take? Is your company embracing AI or resisting it?

#AI #FutureOfWork #Leadership #Technology #Innovation

**With variables**: "Announce a product launch"
→ Exciting news! 🚀

We just launched <agent1.product_name> - and I couldn't be more proud of our team.

What makes it special:

✅ <agent1.feature_1>
✅ <agent1.feature_2>
✅ <agent1.feature_3>

This has been months in the making, and seeing it live is incredible.

Check it out: <function1.product_url>

What features would you like to see next? 👇

#ProductLaunch #{{COMPANY_NAME}} #Innovation

### REMEMBER
Write professional but personable content. Use line breaks and keep it scannable.`,
        placeholder: 'Describe the LinkedIn post you want to create...',
        generationType: 'social-post',
      },
    },
    {
      id: 'visibility',
      title: 'Visibility',
      type: 'dropdown',
      options: [
        { label: 'Public', id: 'PUBLIC' },
        { label: 'Connections Only', id: 'CONNECTIONS' },
      ],
      condition: {
        field: 'operation',
        value: 'share_post',
      },
      value: () => 'PUBLIC',
      required: true,
    },
  ],
  tools: {
    access: ['linkedin_share_post', 'linkedin_get_profile'],
    config: {
      tool: (inputs) => {
        const operation = inputs.operation || 'share_post'

        if (operation === 'get_profile') {
          return 'linkedin_get_profile'
        }

        return 'linkedin_share_post'
      },
      params: (inputs) => {
        const operation = inputs.operation || 'share_post'
        const { credential, ...rest } = inputs

        if (operation === 'get_profile') {
          return {
            accessToken: credential,
          }
        }

        return {
          text: rest.text,
          visibility: rest.visibility || 'PUBLIC',
          accessToken: credential,
        }
      },
    },
  },
  inputs: {
    operation: { type: 'string', description: 'Operation to perform' },
    credential: { type: 'string', description: 'LinkedIn access token' },
    text: { type: 'string', description: 'Post text content' },
    visibility: { type: 'string', description: 'Post visibility (PUBLIC or CONNECTIONS)' },
  },
  outputs: {
    success: { type: 'boolean', description: 'Operation success status' },
    postId: { type: 'string', description: 'Created post ID' },
    profile: { type: 'json', description: 'LinkedIn profile information' },
    error: { type: 'string', description: 'Error message if operation failed' },
  },
}
