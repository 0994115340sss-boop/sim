import { DatadogIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import { AuthMode } from '@/blocks/types'
import type { DatadogResponse } from '@/tools/datadog/types'

export const DatadogBlock: BlockConfig<DatadogResponse> = {
  type: 'datadog',
  name: 'Datadog',
  description: 'Monitor infrastructure, applications, and logs with Datadog',
  authMode: AuthMode.ApiKey,
  longDescription:
    'Integrate Datadog monitoring into workflows. Submit metrics, manage monitors, query logs, create events, handle downtimes, and more.',
  docsLink: 'https://docs.sim.ai/tools/datadog',
  category: 'tools',
  bgColor: '#632CA6',
  icon: DatadogIcon,
  subBlocks: [
    // Operation selector
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { label: 'Submit Metrics', id: 'datadog_submit_metrics' },
        { label: 'Query Timeseries', id: 'datadog_query_timeseries' },
        { label: 'Create Event', id: 'datadog_create_event' },
        { label: 'Create Monitor', id: 'datadog_create_monitor' },
        { label: 'Get Monitor', id: 'datadog_get_monitor' },
        { label: 'List Monitors', id: 'datadog_list_monitors' },
        { label: 'Mute Monitor', id: 'datadog_mute_monitor' },
        { label: 'Query Logs', id: 'datadog_query_logs' },
        { label: 'Send Logs', id: 'datadog_send_logs' },
        { label: 'Create Downtime', id: 'datadog_create_downtime' },
        { label: 'List Downtimes', id: 'datadog_list_downtimes' },
        { label: 'Cancel Downtime', id: 'datadog_cancel_downtime' },
      ],
      value: () => 'datadog_submit_metrics',
    },

    // ========================
    // Submit Metrics inputs
    // ========================
    {
      id: 'series',
      title: 'Metrics Data (JSON)',
      type: 'code',
      placeholder: `[
  {
    "metric": "custom.app.response_time",
    "type": "gauge",
    "points": [{"timestamp": ${Math.floor(Date.now() / 1000)}, "value": 0.85}],
    "tags": ["env:production", "service:api"]
  }
]`,
      condition: { field: 'operation', value: 'datadog_submit_metrics' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Datadog developer. Generate Datadog metrics series JSON array.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.metric_value>\`, \`<function1.result.tags>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DD_SERVICE}}\`, \`{{ENVIRONMENT}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY the metrics series as a valid JSON array. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON array.

### METRICS GUIDELINES
1. **Array Format**: Always return a JSON array, even for single metric
2. **Metric Types**: gauge, count, rate, histogram, distribution
3. **Points**: Array of {timestamp, value} objects (timestamp in Unix seconds)
4. **Tags**: Array of strings in "key:value" format
5. **Metric Names**: Use dot notation (e.g., "custom.app.response_time")

### EXAMPLES

**Single gauge metric**: "Submit response time metric"
→ [{"metric": "custom.app.response_time", "type": "gauge", "points": [{"timestamp": 1704067200, "value": 0.85}], "tags": ["env:production"]}]

**Multiple metrics**: "Submit CPU and memory metrics"
→ [{"metric": "system.cpu.usage", "type": "gauge", "points": [{"timestamp": 1704067200, "value": 75.5}], "tags": ["env:production"]}, {"metric": "system.memory.used", "type": "gauge", "points": [{"timestamp": 1704067200, "value": 8192}], "tags": ["env:production"]}]

**With multiple points**: "Submit metric with multiple data points"
→ [{"metric": "custom.app.requests", "type": "count", "points": [{"timestamp": 1704067200, "value": 100}, {"timestamp": 1704067300, "value": 150}], "tags": ["env:production", "service:api"]}]

### REMEMBER
Return ONLY valid JSON array - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the metrics you want to submit...',
        generationType: 'json-array',
      },
    },

    // ========================
    // Query Timeseries inputs
    // ========================
    {
      id: 'query',
      title: 'Query',
      type: 'long-input',
      placeholder: 'avg:system.cpu.user{*}',
      condition: { field: 'operation', value: 'datadog_query_timeseries' },
      required: true,
    },
    {
      id: 'from',
      title: 'From (Unix Timestamp)',
      type: 'short-input',
      placeholder: 'e.g., 1701360000',
      condition: { field: 'operation', value: 'datadog_query_timeseries' },
      required: true,
    },
    {
      id: 'to',
      title: 'To (Unix Timestamp)',
      type: 'short-input',
      placeholder: 'e.g., 1701446400',
      condition: { field: 'operation', value: 'datadog_query_timeseries' },
      required: true,
    },

    // ========================
    // Create Event inputs
    // ========================
    {
      id: 'title',
      title: 'Event Title',
      type: 'short-input',
      placeholder: 'Deployment completed',
      condition: { field: 'operation', value: 'datadog_create_event' },
      required: true,
    },
    {
      id: 'text',
      title: 'Event Text',
      type: 'long-input',
      placeholder: 'Describe the event...',
      condition: { field: 'operation', value: 'datadog_create_event' },
      required: true,
    },
    {
      id: 'alertType',
      title: 'Alert Type',
      type: 'dropdown',
      options: [
        { label: 'Info', id: 'info' },
        { label: 'Success', id: 'success' },
        { label: 'Warning', id: 'warning' },
        { label: 'Error', id: 'error' },
      ],
      value: () => 'info',
      condition: { field: 'operation', value: 'datadog_create_event' },
    },
    {
      id: 'priority',
      title: 'Priority',
      type: 'dropdown',
      options: [
        { label: 'Normal', id: 'normal' },
        { label: 'Low', id: 'low' },
      ],
      value: () => 'normal',
      condition: { field: 'operation', value: 'datadog_create_event' },
    },
    {
      id: 'tags',
      title: 'Tags',
      type: 'short-input',
      placeholder: 'env:production, service:api',
      condition: { field: 'operation', value: 'datadog_create_event' },
    },

    // ========================
    // Create Monitor inputs
    // ========================
    {
      id: 'name',
      title: 'Monitor Name',
      type: 'short-input',
      placeholder: 'High CPU Usage Alert',
      condition: { field: 'operation', value: 'datadog_create_monitor' },
      required: true,
    },
    {
      id: 'type',
      title: 'Monitor Type',
      type: 'dropdown',
      options: [
        { label: 'Metric Alert', id: 'metric alert' },
        { label: 'Service Check', id: 'service check' },
        { label: 'Event Alert', id: 'event alert' },
        { label: 'Log Alert', id: 'log alert' },
        { label: 'Query Alert', id: 'query alert' },
        { label: 'Composite', id: 'composite' },
        { label: 'SLO Alert', id: 'slo alert' },
      ],
      value: () => 'metric alert',
      condition: { field: 'operation', value: 'datadog_create_monitor' },
      required: true,
    },
    {
      id: 'monitorQuery',
      title: 'Monitor Query',
      type: 'long-input',
      placeholder: 'avg(last_5m):avg:system.cpu.idle{*} < 20',
      condition: { field: 'operation', value: 'datadog_create_monitor' },
      required: true,
    },
    {
      id: 'message',
      title: 'Notification Message',
      type: 'long-input',
      placeholder: 'Alert! CPU usage is high. @slack-alerts',
      condition: { field: 'operation', value: 'datadog_create_monitor' },
    },
    {
      id: 'monitorTags',
      title: 'Tags',
      type: 'short-input',
      placeholder: 'team:backend, priority:high',
      condition: { field: 'operation', value: 'datadog_create_monitor' },
    },
    {
      id: 'monitorPriority',
      title: 'Priority (1-5)',
      type: 'short-input',
      placeholder: '3',
      condition: { field: 'operation', value: 'datadog_create_monitor' },
    },
    {
      id: 'options',
      title: 'Options (JSON)',
      type: 'code',
      placeholder: '{"notify_no_data": true, "thresholds": {"critical": 90}}',
      condition: { field: 'operation', value: 'datadog_create_monitor' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Datadog developer. Generate Datadog monitor options JSON.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.threshold>\`, \`<function1.result.interval>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{ALERT_THRESHOLD}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY the options as valid JSON. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON object.

### OPTIONS GUIDELINES
1. **Thresholds**: Define warning and critical thresholds
2. **Notify No Data**: Whether to notify when no data is received
3. **Evaluation Delay**: Delay before evaluation (in seconds)
4. **Renotify Interval**: Minutes between renotifications
5. **Timeout**: Evaluation timeout (in seconds)

### EXAMPLES

**Basic thresholds**: "Set critical threshold at 90"
→ {"thresholds": {"critical": 90}}

**With warning**: "Set warning at 70 and critical at 90"
→ {"thresholds": {"warning": 70, "critical": 90}}

**Full options**: "Monitor with thresholds, notify no data, and renotify every 60 minutes"
→ {"notify_no_data": true, "thresholds": {"warning": 70, "critical": 90}, "renotify_interval": 60}

**With evaluation delay**: "Monitor with 5 minute evaluation delay"
→ {"thresholds": {"critical": 90}, "evaluation_delay": 300}

### REMEMBER
Return ONLY valid JSON - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the monitor options you need...',
        generationType: 'json-object',
      },
    },

    // ========================
    // Get Monitor inputs
    // ========================
    {
      id: 'monitorId',
      title: 'Monitor ID',
      type: 'short-input',
      placeholder: '12345678',
      condition: { field: 'operation', value: 'datadog_get_monitor' },
      required: true,
    },

    // ========================
    // List Monitors inputs
    // ========================
    {
      id: 'listMonitorName',
      title: 'Filter by Name',
      type: 'short-input',
      placeholder: 'CPU',
      condition: { field: 'operation', value: 'datadog_list_monitors' },
    },
    {
      id: 'listMonitorTags',
      title: 'Filter by Tags',
      type: 'short-input',
      placeholder: 'env:production',
      condition: { field: 'operation', value: 'datadog_list_monitors' },
    },

    // ========================
    // Mute Monitor inputs
    // ========================
    {
      id: 'muteMonitorId',
      title: 'Monitor ID',
      type: 'short-input',
      placeholder: '12345678',
      condition: { field: 'operation', value: 'datadog_mute_monitor' },
      required: true,
    },
    {
      id: 'scope',
      title: 'Scope',
      type: 'short-input',
      placeholder: 'host:myhost (optional)',
      condition: { field: 'operation', value: 'datadog_mute_monitor' },
    },
    {
      id: 'end',
      title: 'End Time (Unix Timestamp)',
      type: 'short-input',
      placeholder: 'Leave empty for indefinite',
      condition: { field: 'operation', value: 'datadog_mute_monitor' },
    },

    // ========================
    // Query Logs inputs
    // ========================
    {
      id: 'logQuery',
      title: 'Search Query',
      type: 'long-input',
      placeholder: 'service:web-app status:error',
      condition: { field: 'operation', value: 'datadog_query_logs' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Datadog developer. Generate Datadog log search queries.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks using \`<block_name.field_name>\` syntax.
Environment variables use \`{{ENV_VAR_NAME}}\` syntax.

### CRITICAL INSTRUCTION
Return ONLY the log search query string. Do not include any explanations, markdown formatting, comments, or additional text.

### LOG QUERY SYNTAX

**Basic Filters**:
- service:my-service
- status:error
- host:my-host

**Text Search**:
- "exact phrase"
- message:*error*

**Comparisons**:
- @duration:>1000
- @status_code:>=400

**Combining**:
- service:api AND status:error
- status:error OR status:warn
- NOT service:healthcheck

**Facets**:
- @http.url:"/api/*"
- @user.id:12345

### EXAMPLES

**Simple**: "Find errors in the API service"
→ service:api status:error

**With text**: "Find logs containing 'timeout'"
→ service:api "timeout"

**Complex**: "Find API errors except healthcheck"
→ service:api status:error NOT @http.url:"/health*"

### REMEMBER
Return ONLY the query string - no explanations.`,
        placeholder: 'Describe the logs you want to find...',
        generationType: 'sql-query',
      },
    },
    {
      id: 'logFrom',
      title: 'From',
      type: 'short-input',
      placeholder: 'now-1h',
      condition: { field: 'operation', value: 'datadog_query_logs' },
      required: true,
    },
    {
      id: 'logTo',
      title: 'To',
      type: 'short-input',
      placeholder: 'now',
      condition: { field: 'operation', value: 'datadog_query_logs' },
      required: true,
    },
    {
      id: 'logLimit',
      title: 'Limit',
      type: 'short-input',
      placeholder: '50',
      condition: { field: 'operation', value: 'datadog_query_logs' },
    },

    // ========================
    // Send Logs inputs
    // ========================
    {
      id: 'logs',
      title: 'Logs (JSON)',
      type: 'code',
      placeholder: `[
  {
    "message": "Application started successfully",
    "service": "my-app",
    "ddsource": "custom",
    "ddtags": "env:production"
  }
]`,
      condition: { field: 'operation', value: 'datadog_send_logs' },
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Datadog developer. Generate Datadog logs JSON array.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.message>\`, \`<function1.result.user_id>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{DD_SERVICE}}\`, \`{{ENVIRONMENT}}\`)

Do NOT wrap variable references in quotes for non-string values.

### CRITICAL INSTRUCTION
Return ONLY the logs as a valid JSON array. Do not include any explanations, markdown formatting, comments, or additional text. Just the raw JSON array.

### LOGS GUIDELINES
1. **Array Format**: Always return a JSON array, even for single log
2. **Message**: Required field with the log message
3. **Service**: Application/service name
4. **ddsource**: Source identifier (e.g., "custom", "nginx", "python")
5. **ddtags**: Comma-separated tags in "key:value" format
6. **Additional Fields**: Add any custom fields as needed

### EXAMPLES

**Single log**: "Send application start log"
→ [{"message": "Application started successfully", "service": "my-app", "ddsource": "custom", "ddtags": "env:production"}]

**Multiple logs**: "Send error and info logs"
→ [{"message": "Error occurred", "service": "api", "ddsource": "custom", "ddtags": "env:production,level:error"}, {"message": "Request processed", "service": "api", "ddsource": "custom", "ddtags": "env:production,level:info"}]

**With custom fields**: "Send log with user context"
→ [{"message": "User logged in", "service": "auth", "ddsource": "custom", "ddtags": "env:production", "user_id": "123", "ip": "192.168.1.1"}]

### REMEMBER
Return ONLY valid JSON array - no explanations, no markdown, no extra text.`,
        placeholder: 'Describe the logs you want to send...',
        generationType: 'json-array',
      },
    },

    // ========================
    // Create Downtime inputs
    // ========================
    {
      id: 'downtimeScope',
      title: 'Scope',
      type: 'short-input',
      placeholder: 'host:myhost or env:production or *',
      condition: { field: 'operation', value: 'datadog_create_downtime' },
      required: true,
    },
    {
      id: 'downtimeMessage',
      title: 'Message',
      type: 'long-input',
      placeholder: 'Scheduled maintenance',
      condition: { field: 'operation', value: 'datadog_create_downtime' },
    },
    {
      id: 'downtimeStart',
      title: 'Start Time (Unix Timestamp)',
      type: 'short-input',
      placeholder: 'Leave empty for now',
      condition: { field: 'operation', value: 'datadog_create_downtime' },
    },
    {
      id: 'downtimeEnd',
      title: 'End Time (Unix Timestamp)',
      type: 'short-input',
      placeholder: 'e.g., 1701450000',
      condition: { field: 'operation', value: 'datadog_create_downtime' },
    },
    {
      id: 'downtimeMonitorId',
      title: 'Monitor ID (optional)',
      type: 'short-input',
      placeholder: '12345678',
      condition: { field: 'operation', value: 'datadog_create_downtime' },
    },

    // ========================
    // List Downtimes inputs
    // ========================
    {
      id: 'currentOnly',
      title: 'Current Only',
      type: 'switch',
      condition: { field: 'operation', value: 'datadog_list_downtimes' },
    },

    // ========================
    // Cancel Downtime inputs
    // ========================
    {
      id: 'downtimeId',
      title: 'Downtime ID',
      type: 'short-input',
      placeholder: 'abc123',
      condition: { field: 'operation', value: 'datadog_cancel_downtime' },
      required: true,
    },

    // ========================
    // Authentication (common)
    // ========================
    {
      id: 'apiKey',
      title: 'API Key',
      type: 'short-input',
      placeholder: 'Enter your Datadog API key',
      password: true,
      required: true,
    },
    // Application Key - REQUIRED only for read/manage operations (not needed for submit_metrics, create_event, send_logs)
    {
      id: 'applicationKey',
      title: 'Application Key',
      type: 'short-input',
      placeholder: 'Enter your Datadog application key',
      password: true,
      condition: {
        field: 'operation',
        value: [
          'datadog_query_timeseries',
          'datadog_create_monitor',
          'datadog_get_monitor',
          'datadog_list_monitors',
          'datadog_mute_monitor',
          'datadog_query_logs',
          'datadog_create_downtime',
          'datadog_list_downtimes',
          'datadog_cancel_downtime',
        ],
      },
      required: true,
    },
    {
      id: 'site',
      title: 'Datadog Site',
      type: 'dropdown',
      options: [
        { label: 'US1 (datadoghq.com)', id: 'datadoghq.com' },
        { label: 'US3 (us3.datadoghq.com)', id: 'us3.datadoghq.com' },
        { label: 'US5 (us5.datadoghq.com)', id: 'us5.datadoghq.com' },
        { label: 'EU (datadoghq.eu)', id: 'datadoghq.eu' },
        { label: 'AP1 (ap1.datadoghq.com)', id: 'ap1.datadoghq.com' },
        { label: 'US1-FED (ddog-gov.com)', id: 'ddog-gov.com' },
      ],
      value: () => 'datadoghq.com',
    },
  ],
  tools: {
    access: [
      'datadog_submit_metrics',
      'datadog_query_timeseries',
      'datadog_create_event',
      'datadog_create_monitor',
      'datadog_get_monitor',
      'datadog_list_monitors',
      'datadog_mute_monitor',
      'datadog_query_logs',
      'datadog_send_logs',
      'datadog_create_downtime',
      'datadog_list_downtimes',
      'datadog_cancel_downtime',
    ],
    config: {
      tool: (params) => params.operation,
      params: (params) => {
        // Base params that are always needed
        const baseParams: Record<string, any> = {
          apiKey: params.apiKey,
          applicationKey: params.applicationKey,
          site: params.site,
        }

        // Only include params relevant to each operation
        switch (params.operation) {
          case 'datadog_submit_metrics':
            return { ...baseParams, series: params.series }

          case 'datadog_query_timeseries':
            return {
              ...baseParams,
              query: params.query,
              from: params.from ? Number(params.from) : undefined,
              to: params.to ? Number(params.to) : undefined,
            }

          case 'datadog_create_event':
            return {
              ...baseParams,
              title: params.title,
              text: params.text,
              alertType: params.alertType,
              priority: params.priority,
              tags: params.tags,
            }

          case 'datadog_create_monitor':
            return {
              ...baseParams,
              name: params.name,
              type: params.type,
              query: params.monitorQuery,
              message: params.message,
              tags: params.monitorTags,
              priority: params.monitorPriority ? Number(params.monitorPriority) : undefined,
              options: params.options,
            }

          case 'datadog_get_monitor':
            return { ...baseParams, monitorId: params.monitorId }

          case 'datadog_list_monitors':
            return {
              ...baseParams,
              name: params.listMonitorName || undefined,
              tags: params.listMonitorTags || undefined,
            }

          case 'datadog_mute_monitor':
            return {
              ...baseParams,
              monitorId: params.muteMonitorId,
              scope: params.scope,
              end: params.end ? Number(params.end) : undefined,
            }

          case 'datadog_query_logs':
            return {
              ...baseParams,
              query: params.logQuery,
              from: params.logFrom,
              to: params.logTo,
              limit: params.logLimit ? Number(params.logLimit) : undefined,
            }

          case 'datadog_send_logs':
            return { ...baseParams, logs: params.logs }

          case 'datadog_create_downtime':
            return {
              ...baseParams,
              scope: params.downtimeScope,
              message: params.downtimeMessage,
              start: params.downtimeStart ? Number(params.downtimeStart) : undefined,
              end: params.downtimeEnd ? Number(params.downtimeEnd) : undefined,
              monitorId: params.downtimeMonitorId,
            }

          case 'datadog_list_downtimes':
            return { ...baseParams, currentOnly: params.currentOnly }

          case 'datadog_cancel_downtime':
            return { ...baseParams, downtimeId: params.downtimeId }

          default:
            return baseParams
        }
      },
    },
  },
  inputs: {
    operation: { type: 'string', description: 'Operation to perform' },
    apiKey: { type: 'string', description: 'Datadog API key' },
    applicationKey: { type: 'string', description: 'Datadog Application key' },
    site: { type: 'string', description: 'Datadog site/region' },
    // Metrics
    series: { type: 'json', description: 'Metrics data to submit' },
    query: { type: 'string', description: 'Query string' },
    from: { type: 'number', description: 'Start time (Unix timestamp)' },
    to: { type: 'number', description: 'End time (Unix timestamp)' },
    // Events
    title: { type: 'string', description: 'Event title' },
    text: { type: 'string', description: 'Event text/body' },
    alertType: { type: 'string', description: 'Alert type' },
    priority: { type: 'string', description: 'Priority level' },
    tags: { type: 'string', description: 'Comma-separated tags' },
    // Monitors
    name: { type: 'string', description: 'Monitor name' },
    type: { type: 'string', description: 'Monitor type' },
    monitorQuery: { type: 'string', description: 'Monitor query' },
    message: { type: 'string', description: 'Notification message' },
    monitorTags: { type: 'string', description: 'Monitor tags' },
    monitorPriority: { type: 'number', description: 'Monitor priority (1-5)' },
    options: { type: 'json', description: 'Monitor options' },
    monitorId: { type: 'string', description: 'Monitor ID' },
    muteMonitorId: { type: 'string', description: 'Monitor ID to mute' },
    scope: { type: 'string', description: 'Scope for muting' },
    end: { type: 'number', description: 'End time for mute' },
    // Logs
    logQuery: { type: 'string', description: 'Log search query' },
    logFrom: { type: 'string', description: 'Log start time' },
    logTo: { type: 'string', description: 'Log end time' },
    logLimit: { type: 'number', description: 'Max logs to return' },
    logs: { type: 'json', description: 'Logs to send' },
    // Downtimes
    downtimeScope: { type: 'string', description: 'Downtime scope' },
    downtimeMessage: { type: 'string', description: 'Downtime message' },
    downtimeStart: { type: 'number', description: 'Downtime start time' },
    downtimeEnd: { type: 'number', description: 'Downtime end time' },
    downtimeMonitorId: { type: 'string', description: 'Monitor ID for downtime' },
    currentOnly: { type: 'boolean', description: 'Filter to current downtimes' },
    downtimeId: { type: 'string', description: 'Downtime ID to cancel' },
    listMonitorName: { type: 'string', description: 'Filter monitors by name' },
    listMonitorTags: { type: 'string', description: 'Filter monitors by tags' },
  },
  outputs: {
    success: { type: 'boolean', description: 'Whether the operation succeeded' },
    // Metrics
    series: { type: 'json', description: 'Timeseries data' },
    status: { type: 'string', description: 'Query status' },
    // Events
    event: { type: 'json', description: 'Event data' },
    events: { type: 'json', description: 'List of events' },
    // Monitors
    monitor: { type: 'json', description: 'Monitor data' },
    monitors: { type: 'json', description: 'List of monitors' },
    // Logs
    logs: { type: 'json', description: 'Log entries' },
    nextLogId: { type: 'string', description: 'Pagination cursor for logs' },
    // Downtimes
    downtime: { type: 'json', description: 'Downtime data' },
    downtimes: { type: 'json', description: 'List of downtimes' },
  },
}
