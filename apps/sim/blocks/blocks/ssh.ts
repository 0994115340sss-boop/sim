import { SshIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import { AuthMode } from '@/blocks/types'
import type { SSHResponse } from '@/tools/ssh/types'

export const SSHBlock: BlockConfig<SSHResponse> = {
  type: 'ssh',
  name: 'SSH',
  description: 'Connect to remote servers via SSH',
  authMode: AuthMode.ApiKey,
  longDescription:
    'Execute commands, transfer files, and manage remote servers via SSH. Supports password and private key authentication for secure server access.',
  docsLink: 'https://docs.sim.ai/tools/ssh',
  category: 'tools',
  bgColor: '#000000',
  icon: SshIcon,
  subBlocks: [
    // Operation selector
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { label: 'Execute Command', id: 'ssh_execute_command' },
        { label: 'Execute Script', id: 'ssh_execute_script' },
        { label: 'Check Command Exists', id: 'ssh_check_command_exists' },
        { label: 'Upload File', id: 'ssh_upload_file' },
        { label: 'Download File', id: 'ssh_download_file' },
        { label: 'List Directory', id: 'ssh_list_directory' },
        { label: 'Check File/Directory Exists', id: 'ssh_check_file_exists' },
        { label: 'Create Directory', id: 'ssh_create_directory' },
        { label: 'Delete File/Directory', id: 'ssh_delete_file' },
        { label: 'Move/Rename', id: 'ssh_move_rename' },
        { label: 'Get System Info', id: 'ssh_get_system_info' },
        { label: 'Read File Content', id: 'ssh_read_file_content' },
        { label: 'Write File Content', id: 'ssh_write_file_content' },
      ],
      value: () => 'ssh_execute_command',
    },

    // Connection parameters
    {
      id: 'host',
      title: 'Host',
      type: 'short-input',
      placeholder: 'example.com or 192.168.1.100',
      required: true,
    },
    {
      id: 'port',
      title: 'Port',
      type: 'short-input',
      placeholder: '22',
      value: () => '22',
    },
    {
      id: 'username',
      title: 'Username',
      type: 'short-input',
      placeholder: 'ubuntu, root, or deploy',
      required: true,
    },

    // Authentication method selector
    {
      id: 'authMethod',
      title: 'Authentication Method',
      type: 'dropdown',
      options: [
        { label: 'Password', id: 'password' },
        { label: 'Private Key', id: 'privateKey' },
      ],
      value: () => 'password',
    },

    // Password authentication
    {
      id: 'password',
      title: 'Password',
      type: 'short-input',
      password: true,
      placeholder: 'Your SSH password',
      condition: { field: 'authMethod', value: 'password' },
    },

    // Private key authentication
    {
      id: 'privateKey',
      title: 'Private Key',
      type: 'code',
      placeholder: '-----BEGIN OPENSSH PRIVATE KEY-----\n...',
      condition: { field: 'authMethod', value: 'privateKey' },
    },
    {
      id: 'passphrase',
      title: 'Passphrase',
      type: 'short-input',
      password: true,
      placeholder: 'Passphrase for encrypted key (optional)',
      condition: { field: 'authMethod', value: 'privateKey' },
    },

    // EXECUTE COMMAND
    {
      id: 'command',
      title: 'Command',
      type: 'code',
      placeholder: 'ls -la /var/www',
      required: true,
      condition: { field: 'operation', value: 'ssh_execute_command' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Linux/Unix system administrator. Generate shell commands based on the user's request.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.filename>\`, \`<function1.result.path>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{APP_PATH}}\`, \`{{USER}}\`)

### CRITICAL INSTRUCTION
Return ONLY the shell command(s). Do not include any explanations, markdown formatting, or comments outside the command.

### COMMAND GUIDELINES
1. **Single Command**: For simple operations, return just the command
2. **Multiple Commands**: Chain with && or ; as appropriate
3. **Variables**: Use proper shell variable syntax when needed
4. **Safety**: Prefer safe commands; avoid rm -rf without careful consideration
5. **Quoting**: Use proper quoting for paths with spaces

### EXAMPLES

**List files**: "List all files in /var/www"
→ ls -la /var/www

**Check disk space**: "Show disk usage for /home"
→ df -h /home && du -sh /home/*

**Find files**: "Find all .log files larger than 100MB"
→ find /var/log -name "*.log" -size +100M

**Service management**: "Restart nginx and check status"
→ sudo systemctl restart nginx && sudo systemctl status nginx

**With variables**: "Create directory from previous block"
→ mkdir -p <agent1.directory_path>

### REMEMBER
Return ONLY the command - no explanations.`,
        placeholder: 'Describe what you want to do on the server...',
        generationType: 'javascript-function-body',
      },
    },
    {
      id: 'workingDirectory',
      title: 'Working Directory',
      type: 'short-input',
      placeholder: '/var/www/html (optional)',
      condition: { field: 'operation', value: 'ssh_execute_command' },
    },

    // EXECUTE SCRIPT
    {
      id: 'script',
      title: 'Script Content',
      type: 'code',
      placeholder: '#!/bin/bash\necho "Hello World"',
      required: true,
      condition: { field: 'operation', value: 'ssh_execute_script' },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Linux/Unix shell script developer. Generate shell scripts based on the user's request.

### CONTEXT
{context}

### VARIABLE RESOLUTION
You can reference variables from previous blocks and environment variables:
- **Block variables**: Use \`<block_name.field_name>\` syntax (e.g., \`<agent1.filename>\`)
- **Environment variables**: Use \`{{ENV_VAR_NAME}}\` syntax (e.g., \`{{APP_PATH}}\`)

### CRITICAL INSTRUCTION
Return ONLY the shell script. Do not include any explanations outside the script. Comments inside the script are fine.

### SCRIPT GUIDELINES
1. **Shebang**: Start with #!/bin/bash (or appropriate interpreter)
2. **Error Handling**: Use set -e for strict error handling when appropriate
3. **Variables**: Quote variables properly to handle spaces
4. **Exit Codes**: Return appropriate exit codes
5. **Comments**: Add brief comments for complex operations

### EXAMPLES

**Simple script**: "Print system info"
→ #!/bin/bash
echo "Hostname: $(hostname)"
echo "Uptime: $(uptime)"
echo "Disk Usage:"
df -h

**Backup script**: "Backup a directory to /backup"
→ #!/bin/bash
set -e
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SOURCE="/var/www/html"
DEST="/backup/www_$TIMESTAMP.tar.gz"
tar -czf "$DEST" "$SOURCE"
echo "Backup created: $DEST"

**Deploy script**: "Pull latest code and restart service"
→ #!/bin/bash
set -e
cd /var/www/app
git pull origin main
npm install
sudo systemctl restart app
echo "Deployment complete"

### REMEMBER
Return ONLY the script - no explanations outside the script.`,
        placeholder: 'Describe the script you need...',
        generationType: 'javascript-function-body',
      },
    },
    {
      id: 'interpreter',
      title: 'Interpreter',
      type: 'short-input',
      placeholder: '/bin/bash',
      condition: { field: 'operation', value: 'ssh_execute_script' },
    },
    {
      id: 'scriptWorkingDirectory',
      title: 'Working Directory',
      type: 'short-input',
      placeholder: '/var/www/html (optional)',
      condition: { field: 'operation', value: 'ssh_execute_script' },
    },

    // CHECK COMMAND EXISTS
    {
      id: 'commandName',
      title: 'Command Name',
      type: 'short-input',
      placeholder: 'docker, git, python3',
      required: true,
      condition: { field: 'operation', value: 'ssh_check_command_exists' },
    },

    // UPLOAD FILE
    {
      id: 'fileContent',
      title: 'File Content',
      type: 'code',
      placeholder: 'Content to upload...',
      required: true,
      condition: { field: 'operation', value: 'ssh_upload_file' },
    },
    {
      id: 'fileName',
      title: 'File Name',
      type: 'short-input',
      placeholder: 'config.json',
      required: true,
      condition: { field: 'operation', value: 'ssh_upload_file' },
    },
    {
      id: 'remotePath',
      title: 'Remote Path',
      type: 'short-input',
      placeholder: '/var/www/html/config.json',
      required: true,
      condition: { field: 'operation', value: 'ssh_upload_file' },
    },
    {
      id: 'permissions',
      title: 'Permissions',
      type: 'short-input',
      placeholder: '0644',
      condition: { field: 'operation', value: 'ssh_upload_file' },
    },

    // DOWNLOAD FILE
    {
      id: 'downloadRemotePath',
      title: 'Remote File Path',
      type: 'short-input',
      placeholder: '/var/log/app.log',
      required: true,
      condition: { field: 'operation', value: 'ssh_download_file' },
    },

    // LIST DIRECTORY
    {
      id: 'listPath',
      title: 'Directory Path',
      type: 'short-input',
      placeholder: '/var/www',
      required: true,
      condition: { field: 'operation', value: 'ssh_list_directory' },
    },
    {
      id: 'detailed',
      title: 'Show Details',
      type: 'switch',
      condition: { field: 'operation', value: 'ssh_list_directory' },
    },

    // CHECK FILE EXISTS
    {
      id: 'checkPath',
      title: 'Path to Check',
      type: 'short-input',
      placeholder: '/etc/nginx/nginx.conf',
      required: true,
      condition: { field: 'operation', value: 'ssh_check_file_exists' },
    },
    {
      id: 'checkType',
      title: 'Expected Type',
      type: 'dropdown',
      options: [
        { label: 'Any', id: 'any' },
        { label: 'File', id: 'file' },
        { label: 'Directory', id: 'directory' },
      ],
      value: () => 'any',
      condition: { field: 'operation', value: 'ssh_check_file_exists' },
    },

    // CREATE DIRECTORY
    {
      id: 'createPath',
      title: 'Directory Path',
      type: 'short-input',
      placeholder: '/var/www/new-site',
      required: true,
      condition: { field: 'operation', value: 'ssh_create_directory' },
    },
    {
      id: 'recursive',
      title: 'Create Parent Directories',
      type: 'switch',
      defaultValue: true,
      condition: { field: 'operation', value: 'ssh_create_directory' },
    },

    // DELETE FILE
    {
      id: 'deletePath',
      title: 'Path to Delete',
      type: 'short-input',
      placeholder: '/tmp/old-file.txt',
      required: true,
      condition: { field: 'operation', value: 'ssh_delete_file' },
    },
    {
      id: 'deleteRecursive',
      title: 'Recursive Delete',
      type: 'switch',
      condition: { field: 'operation', value: 'ssh_delete_file' },
    },
    {
      id: 'force',
      title: 'Force Delete',
      type: 'switch',
      condition: { field: 'operation', value: 'ssh_delete_file' },
    },

    // MOVE/RENAME
    {
      id: 'sourcePath',
      title: 'Source Path',
      type: 'short-input',
      placeholder: '/var/www/old-name',
      required: true,
      condition: { field: 'operation', value: 'ssh_move_rename' },
    },
    {
      id: 'destinationPath',
      title: 'Destination Path',
      type: 'short-input',
      placeholder: '/var/www/new-name',
      required: true,
      condition: { field: 'operation', value: 'ssh_move_rename' },
    },
    {
      id: 'overwrite',
      title: 'Overwrite if Exists',
      type: 'switch',
      condition: { field: 'operation', value: 'ssh_move_rename' },
    },

    // READ FILE CONTENT
    {
      id: 'readPath',
      title: 'File Path',
      type: 'short-input',
      placeholder: '/var/log/app.log',
      required: true,
      condition: { field: 'operation', value: 'ssh_read_file_content' },
    },
    {
      id: 'encoding',
      title: 'Encoding',
      type: 'short-input',
      placeholder: 'utf-8',
      condition: { field: 'operation', value: 'ssh_read_file_content' },
    },
    {
      id: 'maxSize',
      title: 'Max Size (MB)',
      type: 'short-input',
      placeholder: '10',
      condition: { field: 'operation', value: 'ssh_read_file_content' },
    },

    // WRITE FILE CONTENT
    {
      id: 'writePath',
      title: 'File Path',
      type: 'short-input',
      placeholder: '/etc/config.json',
      required: true,
      condition: { field: 'operation', value: 'ssh_write_file_content' },
    },
    {
      id: 'content',
      title: 'File Content',
      type: 'code',
      placeholder: 'Content to write...',
      required: true,
      condition: { field: 'operation', value: 'ssh_write_file_content' },
    },
    {
      id: 'writeMode',
      title: 'Write Mode',
      type: 'dropdown',
      options: [
        { label: 'Overwrite', id: 'overwrite' },
        { label: 'Append', id: 'append' },
        { label: 'Create (fail if exists)', id: 'create' },
      ],
      value: () => 'overwrite',
      condition: { field: 'operation', value: 'ssh_write_file_content' },
    },
    {
      id: 'writePermissions',
      title: 'Permissions',
      type: 'short-input',
      placeholder: '0644',
      condition: { field: 'operation', value: 'ssh_write_file_content' },
    },
  ],
  tools: {
    access: [
      'ssh_execute_command',
      'ssh_execute_script',
      'ssh_check_command_exists',
      'ssh_upload_file',
      'ssh_download_file',
      'ssh_list_directory',
      'ssh_check_file_exists',
      'ssh_create_directory',
      'ssh_delete_file',
      'ssh_move_rename',
      'ssh_get_system_info',
      'ssh_read_file_content',
      'ssh_write_file_content',
    ],
    config: {
      tool: (params) => {
        return params.operation || 'ssh_execute_command'
      },
      params: (params) => {
        // Build connection config
        const connectionConfig: Record<string, unknown> = {
          host: params.host,
          port:
            typeof params.port === 'string' ? Number.parseInt(params.port, 10) : params.port || 22,
          username: params.username,
        }

        // Add authentication based on method
        if (params.authMethod === 'privateKey') {
          connectionConfig.privateKey = params.privateKey
          if (params.passphrase) {
            connectionConfig.passphrase = params.passphrase
          }
        } else {
          connectionConfig.password = params.password
        }

        // Build operation-specific parameters based on the selected operation
        const operation = params.operation || 'ssh_execute_command'

        switch (operation) {
          case 'ssh_execute_command':
            return {
              ...connectionConfig,
              command: params.command,
              workingDirectory: params.workingDirectory,
            }
          case 'ssh_execute_script':
            return {
              ...connectionConfig,
              script: params.script,
              interpreter: params.interpreter || '/bin/bash',
              workingDirectory: params.scriptWorkingDirectory,
            }
          case 'ssh_check_command_exists':
            return {
              ...connectionConfig,
              commandName: params.commandName,
            }
          case 'ssh_upload_file':
            return {
              ...connectionConfig,
              fileContent: params.fileContent,
              fileName: params.fileName,
              remotePath: params.remotePath,
              permissions: params.permissions,
            }
          case 'ssh_download_file':
            return {
              ...connectionConfig,
              remotePath: params.downloadRemotePath,
            }
          case 'ssh_list_directory':
            return {
              ...connectionConfig,
              path: params.listPath,
              detailed: params.detailed,
            }
          case 'ssh_check_file_exists':
            return {
              ...connectionConfig,
              path: params.checkPath,
              type: params.checkType || 'any',
            }
          case 'ssh_create_directory':
            return {
              ...connectionConfig,
              path: params.createPath,
              recursive: params.recursive !== false,
            }
          case 'ssh_delete_file':
            return {
              ...connectionConfig,
              path: params.deletePath,
              recursive: params.deleteRecursive,
              force: params.force,
            }
          case 'ssh_move_rename':
            return {
              ...connectionConfig,
              sourcePath: params.sourcePath,
              destinationPath: params.destinationPath,
              overwrite: params.overwrite,
            }
          case 'ssh_get_system_info':
            return connectionConfig
          case 'ssh_read_file_content':
            return {
              ...connectionConfig,
              path: params.readPath,
              encoding: params.encoding || 'utf-8',
              maxSize: params.maxSize ? Number.parseInt(params.maxSize, 10) : 10,
            }
          case 'ssh_write_file_content':
            return {
              ...connectionConfig,
              path: params.writePath,
              content: params.content,
              mode: params.writeMode || 'overwrite',
              permissions: params.writePermissions,
            }
          default:
            return connectionConfig
        }
      },
    },
  },
  inputs: {
    operation: { type: 'string', description: 'SSH operation to perform' },
    host: { type: 'string', description: 'SSH server hostname' },
    port: { type: 'number', description: 'SSH server port' },
    username: { type: 'string', description: 'SSH username' },
    authMethod: { type: 'string', description: 'Authentication method' },
    password: { type: 'string', description: 'Password for authentication' },
    privateKey: { type: 'string', description: 'Private key for authentication' },
    passphrase: { type: 'string', description: 'Passphrase for encrypted key' },
    command: { type: 'string', description: 'Command to execute' },
    script: { type: 'string', description: 'Script content to execute' },
    commandName: { type: 'string', description: 'Command name to check' },
    fileContent: { type: 'string', description: 'File content to upload' },
    fileName: { type: 'string', description: 'Name of the file' },
    remotePath: { type: 'string', description: 'Remote file/directory path' },
    content: { type: 'string', description: 'File content' },
  },
  outputs: {
    stdout: { type: 'string', description: 'Command standard output' },
    stderr: { type: 'string', description: 'Command standard error' },
    exitCode: { type: 'number', description: 'Command exit code' },
    success: { type: 'boolean', description: 'Operation success status' },
    fileContent: { type: 'string', description: 'Downloaded/read file content' },
    entries: { type: 'json', description: 'Directory entries' },
    exists: { type: 'boolean', description: 'File/directory existence' },
    content: { type: 'string', description: 'File content' },
    hostname: { type: 'string', description: 'Server hostname' },
    os: { type: 'string', description: 'Operating system' },
    message: { type: 'string', description: 'Operation status message' },
  },
}
