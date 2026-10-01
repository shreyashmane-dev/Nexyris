import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { exec } from 'node:child_process';
import { APPLICATION_ROOT, PATHS, toRelativePath, ensureDirectoryStructure } from './dynamic-root.js';
import { getStorageInfo, checkRequiredSpace, startStorageHeartbeat, getStorageAvailability } from './storage.js';
import { detectHardware, evaluateModelCompatibility } from './hardware.js';
import { getPortableConfig, savePortableConfig, getHostConfig, saveHostConfig } from './config-manager.js';
import { 
  getDatabase, 
  listConversations, 
  createConversation, 
  getConversationMessages, 
  addMessage, 
  deleteConversation,
  updateConversationTitle,
  getTerminalHistory,
  addTerminalCommand,
  listCodeProjects,
  saveCodeProject,
  deleteCodeProject,
  listMcpServers,
  saveMcpServer,
  deleteMcpServer,
  getUserProfile,
  saveUserProfile,
  listUserMemories,
  addUserMemory,
  updateUserMemory,
  deleteUserMemory,
  listPluginsDb,
  savePluginDb,
  togglePluginDb,
  deletePluginDb,
  closeDatabase
} from './db.js';
import { pluginManager } from './plugins/plugin-manager.js';
import { modelManager } from './model-manager.js';
import { downloadManager } from './download-manager.js';
import { runtimeManager } from './runtime-manager.js';
import { parseGgufHeader } from './gguf-parser.js';
import { scanLocalOllama, importOllamaBlob, POPULAR_OLLAMA_MODELS } from './providers/ollama-scanner.js';
import { getLiveHuggingFaceModels, searchHuggingFace, fetchRepoFiles } from './providers/hf-catalog.js';
import { processMcpRpcRequest, TOOLS, RESOURCES, PROMPTS, executeCodeLocally } from './mcp-server.js';

// Prevent server from crashing under any circumstance
process.on('uncaughtException', (err) => {
  console.error('Handled uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Handled unhandled rejection:', reason);
});

// Initialize directory structure & database
ensureDirectoryStructure();
const outputsDir = path.join(APPLICATION_ROOT, 'outputs');
if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir, { recursive: true });

getDatabase();

const PORT = process.env.PORT || 38192;

startStorageHeartbeat(3000, (available) => {
  if (!available) {
    console.warn('⚠️ ALERT: Portable storage root disconnected!');
  } else {
    // storage online
  }
});

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res, statusCode, data) {
  if (res.headersSent) return;
  try {
    const jsonStr = JSON.stringify(data);
    res.writeHead(statusCode, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(jsonStr);
  } catch (err) {
    console.error('Failed to stringify JSON response:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Serialization error' }));
    }
  }
}

/**
 * Synthesizes a concise, human-readable title from user prompt and assistant output
 */
function generateSmartTitle(prompt, assistantOutput = '') {
  if (!prompt || typeof prompt !== 'string') return 'New Conversation';
  let clean = prompt.trim();

  // Strip conversational filler prefixes (multi-pass)
  clean = clean.replace(/^(hey|hi|hello|please|can you|could you|would you|will you|help me with|help me|tell me|show me|explain to me|explain|i want to|i need to|how to|how do i|how can i|what is|what are|write me a|write me|write|generate a|generate|create a|create|build a|build|give me a|give me|make a|make)\s+/i, '');
  clean = clean.replace(/^(show me|tell me|explain to me|how to|how do i|how can i|to write|to create|to build|how)\s+/i, '');
  clean = clean.replace(/^(a|an|the)\s+/i, '');
  // Strip slash commands like /weather Tokyo -> Tokyo
  clean = clean.replace(/^[\/!](search|weather|wiki|fetch|github)\s+/i, '');
  // Strip code block markers
  clean = clean.replace(/```[a-z]*\s*/gi, '');
  // Strip trailing punctuation
  clean = clean.replace(/[\?\.\!\,]+$/, '').trim();

  if (!clean && assistantOutput) {
    clean = assistantOutput.trim().split('\n')[0].replace(/^[#*-\s]+/, '');
  }

  const words = clean.split(/\s+/).filter(Boolean).slice(0, 5);
  if (words.length === 0) return 'New Conversation';

  let title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  if (title.length > 36) {
    title = title.slice(0, 33) + '...';
  }
  return title;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = url.pathname;
  const method = req.method;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // -------------------------------------------------------------
    // System APIs
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/system/init') {
      const hardware = detectHardware();
      const storage = getStorageInfo();
      const portableConfig = getPortableConfig();
      const hostConfig = getHostConfig(hardware);
      const { models } = await modelManager.scanAndSyncModels(hardware);
      const engine = await runtimeManager.findEngine();

      return sendJson(res, 200, {
        product: 'Nexyris Local Studio',
        applicationRoot: APPLICATION_ROOT,
        hardware,
        storage,
        portableConfig,
        hostConfig,
        modelsCount: models.length,
        storageOnline: getStorageAvailability(),
        runtimeStatus: runtimeManager.getStatus(),
        engineAvailable: !!engine,
        engineDetails: engine,
      });
    }

    if (method === 'GET' && (pathname === '/api/system/storage' || pathname === '/api/storage')) {
      return sendJson(res, 200, getStorageInfo());
    }

    if (method === 'GET' && (pathname === '/api/system/hardware' || pathname === '/api/hardware')) {
      return sendJson(res, 200, detectHardware(true));
    }

    // Scan PC Downloads, Desktop, and Documents for GGUF models
    if (method === 'GET' && pathname === '/api/system/scan-downloads') {
      const homedir = os.homedir();
      const searchDirs = [
        { name: 'Downloads', dir: path.join(homedir, 'Downloads') },
        { name: 'Desktop', dir: path.join(homedir, 'Desktop') },
        { name: 'Documents', dir: path.join(homedir, 'Documents') },
      ];

      const foundFiles = [];
      for (const item of searchDirs) {
        if (fs.existsSync(item.dir)) {
          try {
            const files = fs.readdirSync(item.dir);
            for (const file of files) {
              if (file.toLowerCase().endsWith('.gguf') || file.toLowerCase().endsWith('.safetensors')) {
                try {
                  const fullPath = path.join(item.dir, file);
                  const stat = fs.statSync(fullPath);
                  foundFiles.push({
                    name: file,
                    path: fullPath,
                    source: item.name,
                    sizeBytes: stat.size,
                    sizeGB: Math.round((stat.size / (1024 ** 3)) * 100) / 100,
                  });
                } catch (e) {}
              }
            }
          } catch (e) {}
        }
      }

      return sendJson(res, 200, { found: foundFiles });
    }

    // Safe Eject
    if (method === 'POST' && pathname === '/api/system/eject') {
      console.log('Safe Eject requested. Stopping runtime & syncing SQLite...');
      await runtimeManager.stopModel();
      closeDatabase();
      return sendJson(res, 200, { success: true, message: 'All processes halted and database synced. Safe to unplug USB.' });
    }

    // -------------------------------------------------------------
    // Portable AI Engine Management (llama-server / Ollama)
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/runtime/engine-status') {
      const engine = await runtimeManager.findEngine();
      return sendJson(res, 200, {
        available: !!engine,
        engine,
      });
    }

    if (method === 'POST' && pathname === '/api/runtime/install-engine') {
      try {
        const binPath = await runtimeManager.installPortableEngine();
        return sendJson(res, 200, { success: true, binaryPath: binPath, message: 'Portable llama-server installed on USB drive!' });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    // -------------------------------------------------------------
    // Terminal APIs (Real Portable Shell Execution & History)
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/terminal/history') {
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      return sendJson(res, 200, getTerminalHistory(limit));
    }

    if (method === 'POST' && pathname === '/api/terminal/exec') {
      const body = await parseBody(req);
      const { command, modelId } = body;
      if (!command) {
        return sendJson(res, 400, { error: 'Command is required' });
      }

      const startTime = Date.now();
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'powershell.exe' : '/bin/bash';

      exec(command, {
        cwd: APPLICATION_ROOT,
        shell,
        timeout: 30000,
        maxBuffer: 5 * 1024 * 1024,
        env: {
          ...process.env,
          TEMP: PATHS.temp,
          TMP: PATHS.temp,
        }
      }, (error, stdout, stderr) => {
        const elapsed = Date.now() - startTime;
        const exitCode = error ? (error.code ?? 1) : 0;
        const output = (stdout || '') + (stderr ? (stdout ? '\n' : '') + stderr : '');
        const entryId = 'term-' + Date.now();

        try {
          addTerminalCommand(entryId, command, output.trim(), modelId);
        } catch (dbErr) {
          console.warn('Failed to log terminal command to SQLite:', dbErr);
        }

        return sendJson(res, 200, {
          id: entryId,
          command,
          output: output.trim(),
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode,
          elapsed,
          cwd: APPLICATION_ROOT,
        });
      });
      return;
    }

    // -------------------------------------------------------------
    // Model Management APIs
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/models') {
      const hardware = detectHardware();
      const result = await modelManager.scanAndSyncModels(hardware);
      return sendJson(res, 200, result);
    }

    if (method === 'POST' && pathname === '/api/models/import-local') {
      const body = await parseBody(req);
      const sourcePath = body.sourcePath || body.filePath;
      const name = body.name || body.customName;

      if (!sourcePath || !fs.existsSync(sourcePath)) {
        return sendJson(res, 400, { error: 'Invalid source path on host computer' });
      }

      const imported = await modelManager.importLocalGguf(sourcePath, name);
      return sendJson(res, 200, imported);
    }

    // -------------------------------------------------------------
    // Model Context Protocol (MCP) JSON-RPC 2.0 Standard Endpoints
    // -------------------------------------------------------------
    if ((pathname === '/mcp' || pathname === '/api/mcp') && method === 'POST') {
      const body = await parseBody(req);
      const mcpResponse = await processMcpRpcRequest(body);
      if (mcpResponse) {
        return sendJson(res, 200, mcpResponse);
      } else {
        res.writeHead(204);
        res.end();
        return;
      }
    }

    if ((pathname === '/mcp' || pathname === '/mcp/sse') && method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(`event: endpoint\ndata: /mcp\n\n`);
      return;
    }

    // List and Manage MCP Servers
    if (pathname === '/api/mcp/servers' && method === 'GET') {
      const servers = listMcpServers();
      return sendJson(res, 200, {
        builtIn: {
          name: 'nexyris-local-mcp',
          version: '1.0.0',
          protocolVersion: '2024-11-05',
          status: 'online',
          transport: ['stdio', 'http-post', 'sse'],
          endpoint: `http://${req.headers.host || '127.0.0.1:38192'}/mcp`,
          stdioCommand: `node server/mcp-server.js`,
          tools: TOOLS,
          resources: RESOURCES,
          prompts: PROMPTS,
        },
        externalServers: servers,
      });
    }

    if (pathname === '/api/mcp/servers' && method === 'POST') {
      const body = await parseBody(req);
      if (!body.name) return sendJson(res, 400, { error: 'Server name is required' });
      const saved = saveMcpServer(body);
      return sendJson(res, 200, saved);
    }

    if (pathname.startsWith('/api/mcp/servers/') && method === 'DELETE') {
      const serverId = pathname.replace('/api/mcp/servers/', '');
      deleteMcpServer(serverId);
      return sendJson(res, 200, { success: true, id: serverId });
    }

    // Real Code Execution Endpoint for Workspace & MCP
    if (pathname === '/api/code/run' && method === 'POST') {
      const body = await parseBody(req);
      const { code, language, filename } = body;
      if (!code) return sendJson(res, 400, { error: 'code is required' });
      const result = await executeCodeLocally(code, language, filename);
      return sendJson(res, 200, result);
    }

    // Direct Browser File Upload to USB models directory
    if (method === 'POST' && pathname === '/api/models/upload') {
      const filename = req.headers['x-filename'] || `model-${Date.now()}.gguf`;
      const cleanName = path.basename(filename);
      const destPath = path.join(PATHS.modelsGguf, cleanName);

      const writeStream = fs.createWriteStream(destPath);
      req.pipe(writeStream);

      writeStream.on('finish', async () => {
        try {
          const header = await parseGgufHeader(destPath);
          const hardware = detectHardware();
          const { models } = await modelManager.scanAndSyncModels(hardware);
          return sendJson(res, 200, { success: true, filename: cleanName, header, models });
        } catch (err) {
          return sendJson(res, 200, { success: true, filename: cleanName });
        }
      });

      writeStream.on('error', (err) => {
        return sendJson(res, 500, { error: `Upload failed: ${err.message}` });
      });
      return;
    }

    if (method === 'DELETE' && pathname.startsWith('/api/models/')) {
      const modelId = pathname.replace('/api/models/', '');
      try {
        const result = await modelManager.deleteModel(modelId);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // -------------------------------------------------------------
    // Model Catalogs (Hugging Face & Ollama)
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/catalog/curated') {
      const hardware = detectHardware();
      const liveModels = await getLiveHuggingFaceModels();
      const scored = liveModels.map(m => {
        const sizeGB = m.fileSizeGB || (m.fileSizeBytes ? m.fileSizeBytes / (1024 ** 3) : 3.5);
        const compat = evaluateModelCompatibility(sizeGB, hardware);
        return {
          ...m,
          compatibility: compat,
          isRecommended: compat.status === 'RECOMMENDED' || compat.status === 'COMPATIBLE',
        };
      });

      return sendJson(res, 200, {
        curated: scored,
        hardwareSummary: {
          ramGB: hardware.ram.totalGB,
          cpu: hardware.cpu.model,
          gpu: hardware.gpu.name,
        },
      });
    }

    if (method === 'GET' && pathname === '/api/catalog/model-files') {
      const repoId = url.searchParams.get('repoId');
      if (!repoId) return sendJson(res, 400, { error: 'repoId required' });
      const files = await fetchRepoFiles(repoId);
      return sendJson(res, 200, { files });
    }

    if (method === 'GET' && pathname === '/api/catalog/search') {
      const query = url.searchParams.get('q') || 'gguf';
      const results = await searchHuggingFace(query);
      const hardware = detectHardware();
      const scored = results.map(m => {
        const sizeGB = m.fileSizeGB || (m.fileSizeBytes ? m.fileSizeBytes / (1024 ** 3) : 3.5);
        const compat = evaluateModelCompatibility(sizeGB, hardware);
        return {
          ...m,
          compatibility: compat,
          isRecommended: compat.status === 'RECOMMENDED' || compat.status === 'COMPATIBLE',
        };
      });
      return sendJson(res, 200, { results: scored });
    }

    if (method === 'GET' && pathname === '/api/catalog/ollama/popular') {
      return sendJson(res, 200, { models: POPULAR_OLLAMA_MODELS });
    }

    if (method === 'GET' && pathname === '/api/catalog/ollama/local') {
      const discovered = scanLocalOllama();
      return sendJson(res, 200, discovered);
    }

    if (method === 'POST' && pathname === '/api/catalog/ollama/import') {
      const body = await parseBody(req);
      const result = await importOllamaBlob(body.blobPath, body.modelName);
      return sendJson(res, 200, result);
    }

    // -------------------------------------------------------------
    // Download Manager APIs
    // -------------------------------------------------------------
    if (method === 'GET' && (pathname === '/api/downloads' || pathname === '/api/downloads/' || pathname === '/api/downloads/queue')) {
      return sendJson(res, 200, downloadManager.getStatus());
    }

    if (method === 'POST' && (pathname === '/api/downloads' || pathname === '/api/downloads/' || pathname === '/api/downloads/queue')) {
      const body = await parseBody(req);
      const task = await downloadManager.queueDownload(body);
      return sendJson(res, 200, task);
    }

    if (method === 'POST' && pathname.startsWith('/api/downloads/') && pathname.endsWith('/pause')) {
      const id = pathname.replace('/api/downloads/', '').replace('/pause', '');
      downloadManager.pauseDownload(id);
      return sendJson(res, 200, { success: true });
    }

    if (method === 'POST' && pathname.startsWith('/api/downloads/') && pathname.endsWith('/resume')) {
      const id = pathname.replace('/api/downloads/', '').replace('/resume', '');
      downloadManager.resumeDownload(id);
      return sendJson(res, 200, { success: true });
    }

    if (method === 'POST' && pathname.startsWith('/api/downloads/') && pathname.endsWith('/cancel')) {
      const id = pathname.replace('/api/downloads/', '').replace('/cancel', '');
      downloadManager.cancelDownload(id);
      return sendJson(res, 200, { success: true });
    }

    // -------------------------------------------------------------
    // Runtime Lifecycle & Streaming APIs
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/runtime/status') {
      return sendJson(res, 200, runtimeManager.getStatus());
    }

    if (method === 'POST' && pathname === '/api/runtime/start') {
      const body = await parseBody(req);
      const { modelId, hostConfig } = body;

      const hardware = detectHardware();
      const { models } = await modelManager.scanAndSyncModels(hardware);
      const targetModel = models.find(m => m.id === modelId || m.filename === modelId || m.name === modelId);
      if (!targetModel) {
        return sendJson(res, 404, { error: `Model "${modelId}" is not installed on USB drive. Please download it first.` });
      }

      const result = await runtimeManager.startModel(targetModel, hostConfig);
      savePortableConfig({ activeModelId: modelId });
      return sendJson(res, 200, result);
    }

    if (method === 'POST' && pathname === '/api/runtime/stop') {
      await runtimeManager.stopModel();
      savePortableConfig({ activeModelId: null });
      return sendJson(res, 200, { success: true });
    }

    // -------------------------------------------------------------
    // SSE Chat Stream
    // -------------------------------------------------------------
    if (method === 'POST' && pathname === '/api/chat/stream') {
      const body = await parseBody(req);
      const { messages, options, conversationId } = body;

      if (!messages || !Array.isArray(messages)) {
        return sendJson(res, 400, { error: 'messages array is required' });
      }

      // Zero-Model Guard: Strictly verify at least one model exists on the USB pendrive
      const { models } = await modelManager.scanAndSyncModels();
      if (!models || models.length === 0) {
        return sendJson(res, 400, {
          error: 'No AI model is installed on the USB pendrive. Please download or import a GGUF model first.',
        });
      }

      // If runtime is not actively ready with a model, auto-launch the requested or first installed model
      if (runtimeManager.status !== 'READY' || !runtimeManager.currentModel || (!runtimeManager.process && runtimeManager.engineType !== 'ollama')) {
        const requestedModelId = options?.modelId;
        const targetModel = (requestedModelId && models.find(m => m.id === requestedModelId || m.filename === requestedModelId)) ||
          models[0];

        try {
          await runtimeManager.startModel(targetModel);
          savePortableConfig({ activeModelId: targetModel.id });
        } catch (startErr) {
          return sendJson(res, 500, {
            error: `Failed to initialize AI model (${targetModel.name}): ${startErr.message}`,
          });
        }
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      let accumulated = '';
      const activeModelId = runtimeManager.currentModel?.id || models[0]?.id;

      try {
        // Retrieve User Profile & Memories to inject into conversation context
        const userProfile = getUserProfile();
        const userMemories = listUserMemories();

        // Check for World Connect query or slash command in the last user message
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');

        // Auto-save user message directly to database if conversationId is provided
        if (conversationId && lastUserMsg && lastUserMsg.content) {
          try {
            const db = getDatabase();
            const existing = db.prepare(`SELECT id FROM messages WHERE conversation_id = ? AND role = 'user' AND content = ? ORDER BY created_at DESC LIMIT 1`).get(conversationId, lastUserMsg.content);
            if (!existing) {
              const userMsgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
              addMessage(userMsgId, conversationId, 'user', lastUserMsg.content, 0, 0, activeModelId);
            }
          } catch (e) {}
        }

        let worldResult = null;
        if (lastUserMsg && lastUserMsg.content) {
          try {
            worldResult = await pluginManager.processWorldQuery(lastUserMsg.content);
          } catch (pluginErr) {
            console.warn('World query error:', pluginErr.message);
          }
        }

        if (worldResult) {
          // Inform client of active world lookup
          res.write(`data: ${JSON.stringify({ type: 'world_event', data: worldResult })}\n\n`);
        }

        // Prepare enhanced system message
        let systemPrompt = `You are Nexyris, an advanced, high-performance AI assistant and neural co-pilot running 100% locally and privately from portable storage.
You are insightful, helpful, intelligent, direct, and conversational.
You automatically remember the user's preferences, background, and persistent memories across sessions.

Important Instructions:
- Answer naturally, clearly, and directly without robotic filler or repetitive disclaimers.
- If live world information (e.g. web search, Wikipedia summary, live weather forecast, or GitHub repository data) is appended to the user prompt in brackets, treat it as verified real-time factual knowledge and use it seamlessly to answer the user's question. Never claim you cannot access the internet when live data is provided in the prompt.
- When generating code, format it cleanly in markdown code blocks with the proper language tag.`;

        if (userProfile) {
          systemPrompt += `\n\nUser Context:\n- Name: ${userProfile.name || 'Explorer'}`;
          if (userProfile.title) systemPrompt += `\n- Title/Role: ${userProfile.title}`;
          if (userProfile.bio) systemPrompt += `\n- Bio: ${userProfile.bio}`;
          if (userProfile.custom_instructions) systemPrompt += `\n- User Preferences: ${userProfile.custom_instructions}`;
        }
        if (userMemories && userMemories.length > 0) {
          systemPrompt += `\n\nSaved User Memories & Facts:\n` + userMemories.map(m => `• [${m.category}] ${m.key}: ${m.value}`).join('\n');
        }

        // Build messages payload with injected context
        const processedMessages = messages.map(m => ({ ...m }));
        if (worldResult) {
          const targetIndex = processedMessages.findLastIndex(m => m.role === 'user');
          if (targetIndex !== -1) {
            processedMessages[targetIndex].content = processedMessages[targetIndex].content + worldResult.contextText;
          }
        }

        const hasSystem = processedMessages.some(m => m.role === 'system');
        let finalMessages;
        if (hasSystem) {
          finalMessages = processedMessages.map(m => m.role === 'system' ? { ...m, content: `${systemPrompt}\n\n${m.content}` } : m);
        } else {
          finalMessages = [{ role: 'system', content: systemPrompt }, ...processedMessages];
        }

        await runtimeManager.streamChat(
          finalMessages,
          options || {},
          (tokenData) => {
            accumulated += tokenData.text;
            res.write(`data: ${JSON.stringify({ type: 'token', ...tokenData })}\n\n`);
          },
          (metrics) => {
            if (conversationId && accumulated.trim()) {
              const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
              addMessage(msgId, conversationId, 'assistant', accumulated, metrics.tokensGenerated, metrics.speedTokPerSec, activeModelId);
              try {
                const db = getDatabase();
                // Auto-name conversation with AI on first exchange or if title is generic
                const currentConv = db.prepare('SELECT title FROM conversations WHERE id = ?').get(conversationId);
                const msgCountRow = db.prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?').get(conversationId);
                const isEarlyExchange = !msgCountRow || msgCountRow.count <= 2;
                const isGenericTitle = !currentConv || !currentConv.title || ['New Chat', 'New Conversation', 'Untitled', 'new chat', 'Default Conversation'].includes(currentConv.title.trim()) || currentConv.title.startsWith('temp-') || currentConv.title.length <= 4;

                if (isGenericTitle || isEarlyExchange) {
                  const autoTitle = generateSmartTitle(lastUserMsg?.content || '', accumulated);
                  if (autoTitle && autoTitle !== currentConv?.title) {
                    updateConversationTitle(conversationId, autoTitle);
                    res.write(`data: ${JSON.stringify({ type: 'renamed', conversationId, title: autoTitle })}\n\n`);
                  }
                }
                db.exec('PRAGMA wal_checkpoint(PASSIVE);');
              } catch (e) {
                console.warn('Auto-rename conversation error:', e.message);
              }
            }
            res.write(`data: ${JSON.stringify({ type: 'done', metrics })}\n\n`);
            res.end();
          },
          (err) => {
            res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
            res.end();
          }
        );
      } catch (err) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
        res.end();
      }
      return;
    }

    // -------------------------------------------------------------
    // User Profile & Memories APIs
    // -------------------------------------------------------------
    if (method === 'GET' && (pathname === '/api/user/profile' || pathname === '/api/profile')) {
      return sendJson(res, 200, getUserProfile());
    }

    if (method === 'POST' && (pathname === '/api/user/profile' || pathname === '/api/profile')) {
      const body = await parseBody(req);
      const updated = saveUserProfile(body);
      return sendJson(res, 200, updated);
    }

    if (method === 'GET' && pathname === '/api/user/memories') {
      return sendJson(res, 200, { memories: listUserMemories() });
    }

    if (method === 'POST' && pathname === '/api/user/memories') {
      const body = await parseBody(req);
      if (!body.value) return sendJson(res, 400, { error: 'Memory value is required' });
      const added = addUserMemory(body);
      return sendJson(res, 200, added);
    }

    if (method === 'DELETE' && pathname.startsWith('/api/user/memories/')) {
      const memId = pathname.replace('/api/user/memories/', '');
      const result = deleteUserMemory(memId);
      return sendJson(res, 200, result);
    }

    // -------------------------------------------------------------
    // World Connect Plugins APIs
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/plugins') {
      return sendJson(res, 200, { plugins: pluginManager.getAllPlugins() });
    }

    if (method === 'POST' && pathname === '/api/plugins') {
      const body = await parseBody(req);
      try {
        const created = pluginManager.createCustomPlugin(body);
        return sendJson(res, 201, created);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (method === 'DELETE' && pathname.startsWith('/api/plugins/') && !pathname.endsWith('/toggle') && !pathname.endsWith('/execute')) {
      const pluginId = pathname.replace('/api/plugins/', '');
      try {
        const result = pluginManager.deleteCustomPlugin(pluginId);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (method === 'POST' && pathname.startsWith('/api/plugins/') && pathname.endsWith('/toggle')) {
      const pluginId = pathname.replace('/api/plugins/', '').replace('/toggle', '');
      const body = await parseBody(req);
      try {
        const result = pluginManager.togglePlugin(pluginId, body.enabled);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (method === 'POST' && pathname.startsWith('/api/plugins/') && pathname.endsWith('/execute')) {
      const pluginId = pathname.replace('/api/plugins/', '').replace('/execute', '');
      const body = await parseBody(req);
      try {
        const result = await pluginManager.executeTool(pluginId, body.tool, body.params || {});
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // -------------------------------------------------------------
    // Image Generation Studio APIs (outputs saved to USB outputs/)
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/image/gallery') {
      const files = fs.existsSync(outputsDir) ? fs.readdirSync(outputsDir) : [];
      const imageFiles = files
        .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
        .map(f => {
          const stat = fs.statSync(path.join(outputsDir, f));
          return {
            filename: f,
            url: `/outputs/${f}`,
            createdAt: stat.mtimeMs,
            sizeBytes: stat.size,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);

      return sendJson(res, 200, { gallery: imageFiles });
    }

    // -------------------------------------------------------------
    // Conversations APIs
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/conversations') {
      return sendJson(res, 200, listConversations());
    }

    if (method === 'POST' && pathname === '/api/conversations') {
      const body = await parseBody(req);
      const id = body.id || ('conv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
      const created = createConversation(id, body.title, body.modelId);
      return sendJson(res, 200, created);
    }

    if (method === 'GET' && pathname.startsWith('/api/conversations/') && pathname.endsWith('/messages')) {
      const convId = pathname.replace('/api/conversations/', '').replace('/messages', '');
      return sendJson(res, 200, getConversationMessages(convId));
    }

    if (method === 'POST' && pathname.startsWith('/api/conversations/') && pathname.endsWith('/messages')) {
      const convId = pathname.replace('/api/conversations/', '').replace('/messages', '');
      const body = await parseBody(req);
      const msgId = body.id || ('msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
      const modelId = body.modelId || runtimeManager.currentModel?.id || null;
      const msg = addMessage(msgId, convId, body.role, body.content, body.tokenCount, body.tokPerSec, modelId);
      return sendJson(res, 200, msg);
    }

    if (method === 'PATCH' && pathname.startsWith('/api/conversations/')) {
      const id = pathname.replace('/api/conversations/', '');
      const body = await parseBody(req);
      if (body.title) {
        updateConversationTitle(id, body.title);
      }
      return sendJson(res, 200, { success: true });
    }

    if (method === 'POST' && pathname.startsWith('/api/conversations/') && pathname.endsWith('/generate-title')) {
      const id = pathname.replace('/api/conversations/', '').replace('/generate-title', '');
      const body = await parseBody(req);
      const title = generateSmartTitle(body.prompt || '', body.response || '');
      updateConversationTitle(id, title);
      return sendJson(res, 200, { success: true, id, title });
    }

    if (method === 'DELETE' && pathname.startsWith('/api/conversations/')) {
      const id = pathname.replace('/api/conversations/', '');
      deleteConversation(id);
      return sendJson(res, 200, { success: true });
    }

    // -------------------------------------------------------------
    // Code Projects APIs
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/code/projects') {
      return sendJson(res, 200, listCodeProjects());
    }

    if (method === 'POST' && pathname === '/api/code/projects') {
      const body = await parseBody(req);
      const projId = body.id || 'proj-' + Date.now();
      const saved = saveCodeProject(projId, body.name || 'Untitled Project', body.description || '', body.files || []);
      return sendJson(res, 200, saved);
    }

    if (method === 'DELETE' && pathname.startsWith('/api/code/projects/')) {
      const id = pathname.replace('/api/code/projects/', '');
      deleteCodeProject(id);
      return sendJson(res, 200, { success: true });
    }

    // -------------------------------------------------------------
    // Config APIs
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/config') {
      const hardware = detectHardware();
      const portable = getPortableConfig();
      const host = getHostConfig(hardware);
      return sendJson(res, 200, { portable, host });
    }

    if (method === 'POST' && pathname === '/api/config/portable') {
      const body = await parseBody(req);
      return sendJson(res, 200, savePortableConfig(body));
    }

    if (method === 'POST' && pathname === '/api/config/host') {
      const body = await parseBody(req);
      const hardware = detectHardware();
      return sendJson(res, 200, saveHostConfig(hardware.hostId, body));
    }

    // -------------------------------------------------------------
    // Static Outputs Server (/outputs/...)
    // -------------------------------------------------------------
    if (pathname.startsWith('/outputs/')) {
      const filename = path.basename(pathname);
      const filePath = path.join(outputsDir, filename);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    // -------------------------------------------------------------
    // API 404 Guard: Never serve index.html for unmatched API routes
    // -------------------------------------------------------------
    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, { error: `Endpoint not found: ${method} ${pathname}` });
    }

    // -------------------------------------------------------------
    // Static Frontend File Server
    // -------------------------------------------------------------
    const distDir = path.join(APPLICATION_ROOT, 'dist');
    if (fs.existsSync(distDir)) {
      let filePath = path.join(distDir, pathname === '/' ? 'index.html' : pathname);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, 'index.html');
      }

      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    sendJson(res, 404, { error: 'Not Found' });
  } catch (err) {
    console.error('Server error on', pathname, err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: err.message });
    }
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`ℹ️ Nexyris Local Studio is already running at: http://127.0.0.1:${PORT}`);
    process.exit(0);
  }
  console.error('Server listen error:', err);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`====================================================`);
  console.log(`🚀 Nexyris Local Studio running at: http://127.0.0.1:${PORT}`);
  console.log(`📁 Portable USB Root: ${APPLICATION_ROOT}`);
  console.log(`====================================================`);
});
