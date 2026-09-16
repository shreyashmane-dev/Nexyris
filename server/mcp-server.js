#!/usr/bin/env node
/**
 * Nexyris Local - Model Context Protocol (MCP) Server
 * Exposes portable USB AI models, storage, SQLite history, and tools
 * to any MCP client (Claude Desktop, Cursor, Antigravity IDE, Windsurf).
 */

import readline from 'node:readline';
import { exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
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
  {
    name: 'nexyris_execute_code',
    description: 'Execute code in Python, JavaScript, TypeScript, C++, Rust, Go, or Shell strictly confined to USB pendrive with zero host footprint.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Source code string to execute',
        },
        language: {
          type: 'string',
          description: 'Programming language (python, javascript, typescript, cpp, rust, go, shell)',
        },
        filename: {
          type: 'string',
          description: 'Optional file name for execution',
        },
      },
      required: ['code'],
    },
  },
];

export const PROMPTS = [
  {
    name: 'code_review',
    description: 'Perform a comprehensive code review focusing on bugs, security, and performance.',
    arguments: [
      { name: 'code', description: 'Source code to review', required: true },
      { name: 'language', description: 'Programming language', required: false },
    ],
  },
  {
    name: 'explain_algorithm',
    description: 'Explain the algorithm and compute its Big-O time and space complexity.',
    arguments: [
      { name: 'code', description: 'Algorithm code', required: true },
    ],
  },
  {
    name: 'system_diagnosis',
    description: 'Provide an AI health diagnosis of the USB storage and host hardware.',
    arguments: [],
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

    case 'nexyris_execute_code': {
      const res = await executeCodeLocally(args.code, args.language, args.filename);
      return {
        content: [{ type: 'text', text: res.output }],
        isError: res.exitCode !== 0,
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

export async function executeCodeLocally(code, language = 'python', filename) {
  const isWindows = process.platform === 'win32';
  const tempDir = PATHS.temp;
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const lang = (language || 'python').toLowerCase();
  let ext = '.py';
  if (lang.includes('ts') || lang.includes('typescript')) ext = '.ts';
  else if (lang.includes('js') || lang.includes('javascript') || lang.includes('node')) ext = '.js';
  else if (lang.includes('cpp') || lang.includes('c++')) ext = '.cpp';
  else if (lang.includes('rust') || lang.includes('rs')) ext = '.rs';
  else if (lang.includes('go')) ext = '.go';
  else if (lang.includes('sh') || lang.includes('bash') || lang.includes('shell')) ext = isWindows ? '.bat' : '.sh';

  const scriptFile = path.join(tempDir, filename || `exec_${Date.now()}${ext}`);
  fs.writeFileSync(scriptFile, code, 'utf8');

  let command = '';
  if (ext === '.py') {
    command = `python "${scriptFile}"`;
  } else if (ext === '.js') {
    command = `node "${scriptFile}"`;
  } else if (ext === '.ts') {
    command = `npx -y tsx "${scriptFile}"`;
  } else if (ext === '.go') {
    command = `go run "${scriptFile}"`;
  } else if (ext === '.cpp') {
    const binOut = path.join(tempDir, `cpp_${Date.now()}.exe`);
    command = `g++ "${scriptFile}" -o "${binOut}" && "${binOut}"`;
  } else if (ext === '.rs') {
    const binOut = path.join(tempDir, `rs_${Date.now()}.exe`);
    command = `rustc "${scriptFile}" -o "${binOut}" && "${binOut}"`;
  } else {
    command = isWindows ? `cmd.exe /c "${scriptFile}"` : `bash "${scriptFile}"`;
  }

  const startTime = Date.now();
  return new Promise((resolve) => {
    exec(command, {
      cwd: APPLICATION_ROOT,
      env: {
        ...process.env,
        TEMP: tempDir,
        TMP: tempDir,
        TMPDIR: tempDir,
        PORTABLE_ROOT: APPLICATION_ROOT,
      },
      timeout: 25000,
      shell: isWindows ? 'powershell.exe' : '/bin/bash',
    }, (error, stdout, stderr) => {
      const elapsedMs = Date.now() - startTime;
      const exitCode = error ? (error.code || 1) : 0;
      try { if (fs.existsSync(scriptFile)) fs.unlinkSync(scriptFile); } catch (e) {}
      const combined = ((stdout || '') + (stderr ? ('\n' + stderr) : '')).trim();
      resolve({
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode,
        elapsedMs,
        output: combined || `[Execution completed with exit code ${exitCode}]`,
      });
    });
  });
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

/**
 * Standard MCP JSON-RPC 2.0 processor for both stdio and HTTP/SSE transports
 */
export async function processMcpRpcRequest(req) {
  if (!req || typeof req !== 'object') {
    return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } };
  }

  const { id, method, params } = req;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: {
            name: 'nexyris-local-mcp',
            version: '1.0.0',
          },
        },
      };

    case 'notifications/initialized':
      logDebug('Client handshake confirmed.');
      return null;

    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };

    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } };

    case 'tools/call': {
      const { name, arguments: args } = params || {};
      const result = await handleToolCall(name, args || {});
      return { jsonrpc: '2.0', id, result };
    }

    case 'resources/list':
      return { jsonrpc: '2.0', id, result: { resources: RESOURCES } };

    case 'resources/read': {
      const { uri } = params || {};
      const result = await handleResourceRead(uri);
      return { jsonrpc: '2.0', id, result };
    }

    case 'prompts/list':
      return { jsonrpc: '2.0', id, result: { prompts: PROMPTS } };

    case 'prompts/get': {
      const { name, arguments: args } = params || {};
      const promptObj = PROMPTS.find(p => p.name === name);
      if (!promptObj) {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: `Prompt not found: ${name}` },
        };
      }
      let promptText = '';
      if (name === 'code_review') {
        promptText = `Perform a thorough code review for this ${args?.language || 'code'}:\n\`\`\`\n${args?.code || ''}\n\`\`\``;
      } else if (name === 'explain_algorithm') {
        promptText = `Explain this algorithm step-by-step and provide Big-O complexity analysis:\n\`\`\`\n${args?.code || ''}\n\`\`\``;
      } else {
        promptText = `Diagnose the health of this offline system.`;
      }
      return {
        jsonrpc: '2.0',
        id,
        result: {
          description: promptObj.description,
          messages: [{ role: 'user', content: { type: 'text', text: promptText } }],
        },
      };
    }

    default:
      if (id !== undefined) {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
      }
      return null;
  }
}

export async function startMcpServer() {
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

    try {
      const response = await processMcpRpcRequest(req);
      if (response) {
        sendResponse(response);
      }
    } catch (err) {
      logDebug(`Error handling ${req?.method}:`, err.message);
      if (req?.id !== undefined) {
        sendError(req.id, -32603, `Internal error: ${err.message}`);
      }
    }
  });

  rl.on('close', async () => {
    logDebug('MCP Stdio stream closed. Shutting down runtime...');
    await runtimeManager.stopModel();
    process.exit(0);
  });
}

export { TOOLS, RESOURCES };

// Automatically start stdio loop if executed directly (e.g. node server/mcp-server.js)
const currentFilePath = fileURLToPath(import.meta.url);
const isDirectExecution = Boolean(
  process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === path.resolve(currentFilePath).toLowerCase()
);

if (isDirectExecution) {
  startMcpServer().catch(err => {
    logDebug('Fatal MCP server crash:', err);
    process.exit(1);
  });
}
