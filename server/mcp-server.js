#!/usr/bin/env node
/**
 * Nexyris Local - Model Context Protocol (MCP) Server
 * Exposes portable USB AI models, storage, SQLite history, and tools
 * to any MCP client (Claude Desktop, Cursor, Antigravity IDE, Windsurf).
 */

import readline from 'node:readline';
import { exec } from 'node:child_process';
import { PATHS, APPLICATION_ROOT, ensureDirectoryStructure } from './dynamic-root.js';
import { detectHardware } from './hardware.js';
import { getStorageInfo } from './storage.js';
import { modelManager } from './model-manager.js';
import { runtimeManager } from './runtime-manager.js';
import { getDatabase, listConversations, getConversationMessages } from './db.js';

ensureDirectoryStructure();

// Send JSON-RPC response to stdout (one line per message)
function sendResponse(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function sendError(id, code, message) {
  sendResponse({
    jsonrpc: '2.0',
    id,
    error: { code, message },
  });
}

function sendResult(id, result) {
  sendResponse({
    jsonrpc: '2.0',
    id,
    result,
  });
}

// All debug / informational logging MUST go to stderr to not corrupt JSON-RPC stream
function logDebug(...args) {
  process.stderr.write(`[Nexyris-MCP] ${args.join(' ')}\n`);
}

const TOOLS = [
  {
    name: 'nexyris_chat',
    description: 'Generate real-time neural inference responses using the offline AI model installed on the USB pendrive.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The user query or prompt to run against the portable AI model',
        },
        modelId: {
          type: 'string',
          description: 'Optional ID or filename of the model to use (defaults to active/first installed model)',
        },
        temperature: {
          type: 'number',
          description: 'Sampling temperature (0.0 to 1.0, default: 0.7)',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'nexyris_list_models',
    description: 'List all installed GGUF models on the USB pendrive with file sizes and quantization.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'nexyris_system_status',
    description: 'Get real-time telemetry on USB pendrive storage capacity, free space, and host CPU/RAM/GPU detection.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'nexyris_search_history',
    description: 'Search offline conversation history and code projects stored in the USB pendrive SQLite database.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term or keyword to find past conversations',
        },
      },
    },
  },
  {
    name: 'nexyris_run_command',
    description: 'Execute a shell command strictly confined to the USB pendrive directory with zero host C: leakage.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Shell command to run on the pendrive',
        },
      },
      required: ['command'],
    },
  },
];

const RESOURCES = [
  {
    uri: 'nexyris://models',
    name: 'Installed AI Models on USB',
    description: 'List of all verified GGUF weights present on the pendrive',
    mimeType: 'application/json',
  },
  {
    uri: 'nexyris://storage',
    name: 'USB Storage Status',
    description: 'Volume free space and partition metrics for the pendrive',
    mimeType: 'application/json',
  },
  {
    uri: 'nexyris://hardware',
    name: 'Host System Assessment',
    description: 'Host CPU, RAM, and GPU detection metrics',
    mimeType: 'application/json',
  },
];

async function handleToolCall(name, args) {
  switch (name) {
    case 'nexyris_chat': {
      const { models } = await modelManager.scanAndSyncModels();
      if (!models || models.length === 0) {
        return {
          content: [{ type: 'text', text: 'Error: No AI models installed on USB pendrive. Please install a GGUF model first.' }],
          isError: true,
        };
      }

      const targetModel = (args.modelId && models.find(m => m.id === args.modelId || m.filename === args.modelId)) || models[0];

      if (runtimeManager.status !== 'READY' || !runtimeManager.process) {
        logDebug(`Starting model ${targetModel.name}...`);
        await runtimeManager.startModel(targetModel);
      }

      let accumulated = '';
      await new Promise((resolve, reject) => {
        runtimeManager.streamChat(
          [{ role: 'user', content: args.prompt }],
          { temperature: args.temperature || 0.7 },
          (token) => { accumulated += token.text; },
          () => resolve(),
          (err) => reject(err)
        );
      });

      return {
        content: [{ type: 'text', text: accumulated.trim() }],
        isError: false,
      };
    }

    case 'nexyris_list_models': {
      const { models } = await modelManager.scanAndSyncModels();
      const summary = models.map(m => ({
        id: m.id,
        name: m.name,
        filename: m.filename,
        sizeGB: m.sizeGB,
        quantization: m.quantization || 'Q4_K_M',
        contextLength: m.contextLength,
        status: m.status,
      }));

      return {
        content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
        isError: false,
      };
    }

    case 'nexyris_system_status': {
      const storage = getStorageInfo();
      const hardware = detectHardware();
      const status = {
        usbRoot: APPLICATION_ROOT,
        storage: {
          freeGB: storage.freeGB,
          totalGB: storage.totalGB,
          freePercentage: storage.freePercentage,
          driveLetter: storage.driveLetter,
        },
        hardware: {
          cpu: hardware.cpu.model,
          physicalCores: hardware.cpu.physicalCores,
          threads: hardware.cpu.logicalThreads,
          ramTotalGB: hardware.ram.totalGB,
          ramFreeGB: hardware.ram.freeGB,
          gpu: hardware.gpu.name,
        },
        engine: runtimeManager.getStatus(),
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(status, null, 2) }],
        isError: false,
      };
    }

    case 'nexyris_search_history': {
      const convs = listConversations();
      const q = (args.query || '').toLowerCase();
      const filtered = q
        ? convs.filter(c => c.title.toLowerCase().includes(q) || (c.last_message && c.last_message.toLowerCase().includes(q)))
        : convs;

      return {
        content: [{ type: 'text', text: JSON.stringify(filtered.slice(0, 10), null, 2) }],
        isError: false,
      };
    }

    case 'nexyris_run_command': {
      const cmd = args.command;
      const isWindows = process.platform === 'win32';

      const outputText = await new Promise((resolve) => {
        exec(cmd, {
          cwd: APPLICATION_ROOT,
          env: {
            ...process.env,
            TEMP: PATHS.temp,
            TMP: PATHS.temp,
            TMPDIR: PATHS.temp,
            PORTABLE_ROOT: APPLICATION_ROOT,
          },
          timeout: 20000,
          shell: isWindows ? 'powershell.exe' : '/bin/bash',
        }, (error, stdout, stderr) => {
          resolve((stdout || '') + (stderr ? `\n[STDERR]: ${stderr}` : ''));
        });
      });

      return {
        content: [{ type: 'text', text: outputText.trim() || '[Completed with no output]' }],
        isError: false,
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

async function handleResourceRead(uri) {
  if (uri === 'nexyris://models') {
    const { models } = await modelManager.scanAndSyncModels();
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(models, null, 2),
      }],
    };
  }

  if (uri === 'nexyris://storage') {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(getStorageInfo(), null, 2),
      }],
    };
  }

  if (uri === 'nexyris://hardware') {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(detectHardware(), null, 2),
      }],
    };
  }

  throw new Error(`Resource not found: ${uri}`);
}

async function startMcpServer() {
  logDebug(`Initializing Nexyris Local MCP Server on stdio transport...`);
  logDebug(`Portable Root: ${APPLICATION_ROOT}`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let req;
    try {
      req = JSON.parse(trimmed);
    } catch (e) {
      logDebug('Invalid JSON received:', trimmed);
      return sendError(null, -32700, 'Parse error: invalid JSON');
    }

    const { id, method, params } = req;

    try {
      switch (method) {
        case 'initialize':
          sendResult(id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {},
            },
            serverInfo: {
              name: 'nexyris-local-mcp',
              version: '1.0.0',
            },
          });
          break;

        case 'notifications/initialized':
          // Handshake complete, client is ready
          logDebug('Client handshake confirmed.');
          break;

        case 'ping':
          sendResult(id, {});
          break;

        case 'tools/list':
          sendResult(id, { tools: TOOLS });
          break;

        case 'tools/call': {
          const { name, arguments: args } = params || {};
          const result = await handleToolCall(name, args || {});
          sendResult(id, result);
          break;
        }

        case 'resources/list':
          sendResult(id, { resources: RESOURCES });
          break;

        case 'resources/read': {
          const { uri } = params || {};
          const result = await handleResourceRead(uri);
          sendResult(id, result);
          break;
        }

        default:
          if (id !== undefined) {
            sendError(id, -32601, `Method not found: ${method}`);
          }
      }
    } catch (err) {
      logDebug(`Error handling ${method}:`, err.message);
      if (id !== undefined) {
        sendError(id, -32603, `Internal error: ${err.message}`);
      }
    }
  });

  rl.on('close', async () => {
    logDebug('MCP Stdio stream closed. Shutting down runtime...');
    await runtimeManager.stopModel();
    process.exit(0);
  });
}

startMcpServer().catch(err => {
  logDebug('Fatal MCP server crash:', err);
  process.exit(1);
});
