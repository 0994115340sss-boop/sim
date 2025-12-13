import { SmtpIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import { AuthMode } from '@/blocks/types'
import type { SmtpSendMailResult } from '@/tools/smtp/types'

export const SmtpBlock: BlockConfig<SmtpSendMailResult> = {
  type: 'smtp',
  name: 'SMTP',
  description: 'Send emails via any SMTP mail server',
  longDescription:
    'Send emails using any SMTP server (Gmail, Outlook, custom servers, etc.). Configure SMTP connection settings and send emails with full control over content, recipients, and attachments.',
  docsLink: 'https://docs.sim.ai/tools/smtp',
  category: 'tools',
  bgColor: '#2D3748',
  icon: SmtpIcon,
  authMode: AuthMode.ApiKey,

  subBlocks: [
    {
      id: 'smtpHost',
      title: 'SMTP Host',
      type: 'short-input',
      placeholder: 'smtp.gmail.com, smtp.example.com',
      required: true,
    },
    {
      id: 'smtpPort',
      title: 'SMTP Port',
      type: 'short-input',
      placeholder: '587',
      required: true,
      value: () => '587',
    },
    {
      id: 'smtpUsername',
      title: 'SMTP Username',
      type: 'short-input',
      placeholder: 'your-email@example.com',
      required: true,
    },
    {
      id: 'smtpPassword',
      title: 'SMTP Password',
      type: 'short-input',
      placeholder: 'Your SMTP password',
      required: true,
      password: true,
    },
    {
      id: 'smtpSecure',
      title: 'Security Mode',
      type: 'dropdown',
      options: [
        { label: 'TLS (Port 587)', id: 'TLS' },
        { label: 'SSL (Port 465)', id: 'SSL' },
        { label: 'None (Port 25)', id: 'None' },
      ],
      value: () => 'TLS',
      required: true,
    },

    {
      id: 'from',
      title: 'From',
      type: 'short-input',
      placeholder: 'sender@example.com',
      required: true,
    },
    {
      id: 'to',
      title: 'To',
      type: 'short-input',
      placeholder: 'recipient@example.com',
      required: true,
    },
    {
      id: 'subject',
      title: 'Subject',
      type: 'short-input',
      placeholder: 'Email subject',
      required: true,
    },
    {
      id: 'body',
      title: 'Body',
      type: 'long-input',
      placeholder: 'Email content',
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert email writer. Compose professional, clear, and effective email content.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.recipient_name>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{SENDER_NAME}}\`)

### GUIDELINES
1. **Content Type**: Plain text or HTML based on selected type
2. **Structure**: Use clear paragraphs and formatting
3. **Brevity**: Be concise but complete
4. **Personalization**: Use variables for dynamic content

### EXAMPLES

**Notification email**: "Send a system alert notification"
→ System Alert

A new event has been detected that requires your attention.

Details:
- Event Type: Security Alert
- Time: <function1.timestamp>
- Status: Requires Review

Please log in to review this alert.

**With variables**: "Send appointment reminder"
→ Hi <agent1.customer_name>,

This is a reminder about your upcoming appointment:

Date: <function1.appointment_date>
Time: <function1.appointment_time>
Location: {{OFFICE_ADDRESS}}

Please arrive 10 minutes early.

See you soon!

### REMEMBER
Write the email body only. Format based on selected content type.`,
        placeholder: 'Describe the email you want to write...',
        generationType: 'email-content',
      },
    },
    {
      id: 'contentType',
      title: 'Content Type',
      type: 'dropdown',
      options: [
        { label: 'Plain Text', id: 'text' },
        { label: 'HTML', id: 'html' },
      ],
      value: () => 'text',
      required: false,
    },

    // Attachments Section
    // File upload (basic mode)
    {
      id: 'attachmentFiles',
      title: 'Attachments',
      type: 'file-upload',
      canonicalParamId: 'attachments',
      placeholder: 'Upload files to attach',
      mode: 'basic',
      multiple: true,
      required: false,
    },
    // Variable reference (advanced mode)
    {
      id: 'attachments',
      title: 'Attachments',
      type: 'short-input',
      canonicalParamId: 'attachments',
      placeholder: 'Reference files from previous blocks',
      mode: 'advanced',
      required: false,
    },

    // Advanced Options Section
    {
      id: 'fromName',
      title: 'From Name',
      type: 'short-input',
      placeholder: 'Display name for sender',
      mode: 'advanced',
      required: false,
    },
    {
      id: 'cc',
      title: 'CC',
      type: 'short-input',
      placeholder: 'cc1@example.com, cc2@example.com',
      mode: 'advanced',
      required: false,
    },
    {
      id: 'bcc',
      title: 'BCC',
      type: 'short-input',
      placeholder: 'bcc1@example.com, bcc2@example.com',
      mode: 'advanced',
      required: false,
    },
    {
      id: 'replyTo',
      title: 'Reply To',
      type: 'short-input',
      placeholder: 'reply@example.com',
      mode: 'advanced',
      required: false,
    },
  ],

  tools: {
    access: ['smtp_send_mail'],
    config: {
      tool: () => 'smtp_send_mail',
      params: (params) => ({
        smtpHost: params.smtpHost,
        smtpPort: Number(params.smtpPort),
        smtpUsername: params.smtpUsername,
        smtpPassword: params.smtpPassword,
        smtpSecure: params.smtpSecure,
        from: params.from,
        to: params.to,
        subject: params.subject,
        body: params.body,
        contentType: params.contentType,
        fromName: params.fromName,
        cc: params.cc,
        bcc: params.bcc,
        replyTo: params.replyTo,
        attachments: params.attachments,
      }),
    },
  },

  inputs: {
    smtpHost: { type: 'string', description: 'SMTP server hostname' },
    smtpPort: { type: 'number', description: 'SMTP server port' },
    smtpUsername: { type: 'string', description: 'SMTP authentication username' },
    smtpPassword: { type: 'string', description: 'SMTP authentication password' },
    smtpSecure: { type: 'string', description: 'Security protocol (TLS, SSL, or None)' },
    from: { type: 'string', description: 'Sender email address' },
    to: { type: 'string', description: 'Recipient email address' },
    subject: { type: 'string', description: 'Email subject' },
    body: { type: 'string', description: 'Email body content' },
    contentType: { type: 'string', description: 'Content type (text or html)' },
    fromName: { type: 'string', description: 'Display name for sender' },
    cc: { type: 'string', description: 'CC recipients (comma-separated)' },
    bcc: { type: 'string', description: 'BCC recipients (comma-separated)' },
    replyTo: { type: 'string', description: 'Reply-to email address' },
    attachments: { type: 'array', description: 'Files to attach (UserFile array)' },
  },

  outputs: {
    success: { type: 'boolean', description: 'Whether the email was sent successfully' },
    messageId: { type: 'string', description: 'Message ID from SMTP server' },
    to: { type: 'string', description: 'Recipient email address' },
    subject: { type: 'string', description: 'Email subject' },
    error: { type: 'string', description: 'Error message if sending failed' },
  },
}
