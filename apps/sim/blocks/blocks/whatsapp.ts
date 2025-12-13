import { WhatsAppIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import { AuthMode } from '@/blocks/types'
import type { WhatsAppResponse } from '@/tools/whatsapp/types'
import { getTrigger } from '@/triggers'

export const WhatsAppBlock: BlockConfig<WhatsAppResponse> = {
  type: 'whatsapp',
  name: 'WhatsApp',
  description: 'Send WhatsApp messages',
  authMode: AuthMode.ApiKey,
  longDescription: 'Integrate WhatsApp into the workflow. Can send messages.',
  docsLink: 'https://docs.sim.ai/tools/whatsapp',
  category: 'tools',
  bgColor: '#25D366',
  icon: WhatsAppIcon,
  triggerAllowed: true,
  subBlocks: [
    {
      id: 'phoneNumber',
      title: 'Recipient Phone Number',
      type: 'short-input',
      placeholder: 'Enter phone number with country code (e.g., +1234567890)',
      required: true,
    },
    {
      id: 'message',
      title: 'Message',
      type: 'long-input',
      placeholder: 'Enter your message',
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert at writing WhatsApp messages. Compose clear, friendly messages optimized for mobile.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.customer_name>\`, \`<function1.result>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{BUSINESS_NAME}}\`)

### GUIDELINES
1. **Tone**: Friendly and conversational, appropriate for WhatsApp
2. **Length**: Keep messages concise for mobile reading
3. **Emojis**: Use emojis naturally to add warmth
4. **Structure**: Use line breaks for readability
5. **No Markdown**: WhatsApp has limited formatting support

### EXAMPLES

**Customer notification**: "Send order confirmation"
→ Hi! 👋

Your order has been confirmed! 🎉

Order #12345
Total: $99.99

We'll notify you when it ships. Thanks for shopping with us! 💙

**With variables**: "Send appointment reminder"
→ Hi <agent1.customer_name>! 👋

Just a reminder about your appointment:

📅 Date: <function1.date>
⏰ Time: <function1.time>
📍 Location: {{BUSINESS_ADDRESS}}

Reply YES to confirm or call us to reschedule.

See you soon! 😊

### REMEMBER
Keep messages mobile-friendly and conversational.`,
        placeholder: 'Describe the WhatsApp message you want to send...',
        generationType: 'message-content',
      },
    },
    {
      id: 'phoneNumberId',
      title: 'WhatsApp Phone Number ID',
      type: 'short-input',
      placeholder: 'Your WhatsApp Business Phone Number ID',
      required: true,
    },
    {
      id: 'accessToken',
      title: 'Access Token',
      type: 'short-input',
      placeholder: 'Your WhatsApp Business API Access Token',
      password: true,
      required: true,
    },
    ...getTrigger('whatsapp_webhook').subBlocks,
  ],
  tools: {
    access: ['whatsapp_send_message'],
    config: {
      tool: () => 'whatsapp_send_message',
    },
  },
  inputs: {
    phoneNumber: { type: 'string', description: 'Recipient phone number' },
    message: { type: 'string', description: 'Message text' },
    phoneNumberId: { type: 'string', description: 'WhatsApp phone number ID' },
    accessToken: { type: 'string', description: 'WhatsApp access token' },
  },
  outputs: {
    // Send operation outputs
    success: { type: 'boolean', description: 'Send success status' },
    messageId: { type: 'string', description: 'WhatsApp message identifier' },
    error: { type: 'string', description: 'Error information if sending fails' },
    // Webhook trigger outputs
    from: { type: 'string', description: 'Sender phone number' },
    to: { type: 'string', description: 'Recipient phone number' },
    text: { type: 'string', description: 'Message text content' },
    timestamp: { type: 'string', description: 'Message timestamp' },
    type: { type: 'string', description: 'Message type (text, image, etc.)' },
  },
  triggers: {
    enabled: true,
    available: ['whatsapp_webhook'],
  },
}
