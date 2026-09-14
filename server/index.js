import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { APPLICATION_ROOT, PATHS, ensureDirectoryStructure } from './dynamic-root.js';
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
  getTerminalHistory,
  addTerminalCommand,
  listCodeProjects,
  saveCodeProject,
  deleteCodeProject,
  closeDatabase
} from './db.js';
import { modelManager } from './model-manager.js';
import { downloadManager } from './download-manager.js';
import { runtimeManager } from './runtime-manager.js';
import { scanLocalOllama, importOllamaBlob, POPULAR_OLLAMA_MODELS } from './providers/ollama-scanner.js';
import { CURATED_HF_MODELS, searchHuggingFace } from './providers/hf-catalog.js';

// Initialize directory structure & database
ensureDirectoryStructure();
getDatabase();

const PORT = process.env.PORT || 38192;

startStorageHeartbeat(3000, (available) => {
  if (!available) {
    console.warn('⚠️ ALERT: Portable storage root disconnected!');
  } else {
    console.log('✅ Storage verified online.');
  }
});

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
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
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
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

      return sendJson(res, 200, {
        product: 'Nexyris Local',
        applicationRoot: APPLICATION_ROOT,
        hardware,
        storage,
        portableConfig,
        hostConfig,
        modelsCount: models.length,
        storageOnline: getStorageAvailability(),
        runtimeStatus: runtimeManager.getStatus(),
      });
    }

    if (method === 'GET' && pathname === '/api/system/storage') {
      return sendJson(res, 200, getStorageInfo());
    }

    if (method === 'GET' && pathname === '/api/system/hardware') {
      return sendJson(res, 200, detectHardware(true));
    }

    if (method === 'POST' && pathname === '/api/system/shutdown') {
      await runtimeManager.stopModel();
      closeDatabase();
      return sendJson(res, 200, { success: true, message: 'All local resources released safely.' });
    }

    // -------------------------------------------------------------
    // Models APIs
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/models') {
      const hardware = detectHardware();
      const result = await modelManager.scanAndSyncModels(hardware);
      return sendJson(res, 200, result);
    }

    if (method === 'POST' && pathname === '/api/models/import-local') {
      const body = await parseBody(req);
      if (!body.filePath) return sendJson(res, 400, { error: 'filePath is required' });
      const imported = await modelManager.importLocalGguf(body.filePath, body.customName);
      return sendJson(res, 200, imported);
    }

    if (method === 'DELETE' && pathname.startsWith('/api/models/')) {
      const id = pathname.replace('/api/models/', '');
      if (runtimeManager.currentModel?.id === id) {
        await runtimeManager.stopModel();
      }
      const result = await modelManager.deleteModel(id);
      return sendJson(res, 200, result);
    }

    // -------------------------------------------------------------
    // Providers APIs
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/providers/huggingface') {
      const query = url.searchParams.get('q') || '';
      const hardware = detectHardware();

      if (query) {
        const results = await searchHuggingFace(query);
        return sendJson(res, 200, { query, results });
      }

      const enriched = CURATED_HF_MODELS.map(m => ({
        ...m,
        compatibility: hardware && m.fileSizeGB ? evaluateModelCompatibility(m.fileSizeGB, hardware) : null,
      }));
      return sendJson(res, 200, { curated: enriched });
    }

    if (method === 'GET' && pathname === '/api/providers/ollama') {
      const localOllama = await scanLocalOllama();
      return sendJson(res, 200, { local: localOllama, popular: POPULAR_OLLAMA_MODELS });
    }

    if (method === 'POST' && pathname === '/api/providers/ollama/import') {
      const body = await parseBody(req);
      if (!body.blobPath || !body.tag) return sendJson(res, 400, { error: 'blobPath and tag required' });
      const imported = await importOllamaBlob(body.blobPath, body.tag);
      const hardware = detectHardware();
      await modelManager.scanAndSyncModels(hardware);
      return sendJson(res, 200, imported);
    }

    // -------------------------------------------------------------
    // Downloads APIs
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/downloads') {
      return sendJson(res, 200, downloadManager.getStatus());
    }

    if (method === 'POST' && pathname === '/api/downloads/queue') {
      const body = await parseBody(req);
      const task = await downloadManager.queueDownload(body);
      return sendJson(res, 200, task);
    }

    if (method === 'POST' && pathname.startsWith('/api/downloads/pause/')) {
      const id = pathname.replace('/api/downloads/pause/', '');
      downloadManager.pauseDownload(id);
      return sendJson(res, 200, { success: true });
    }

    if (method === 'POST' && pathname.startsWith('/api/downloads/resume/')) {
      const id = pathname.replace('/api/downloads/resume/', '');
      downloadManager.resumeDownload(id);
      return sendJson(res, 200, { success: true });
    }

    if (method === 'POST' && pathname.startsWith('/api/downloads/cancel/')) {
      const id = pathname.replace('/api/downloads/cancel/', '');
      downloadManager.cancelDownload(id);
      return sendJson(res, 200, { success: true });
    }

    // -------------------------------------------------------------
    // Runtime APIs
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/runtime/status') {
      return sendJson(res, 200, runtimeManager.getStatus());
    }

    if (method === 'POST' && pathname === '/api/runtime/start') {
      const body = await parseBody(req);
      const registry = modelManager.getRegistry();
      const model = registry.find(m => m.id === body.modelId);
      if (!model) return sendJson(res, 404, { error: `Model ${body.modelId} not found` });

      const hardware = detectHardware();
      const hostConfig = getHostConfig(hardware);
      const started = await runtimeManager.startModel(model, hostConfig);
      savePortableConfig({ activeModelId: body.modelId });

      return sendJson(res, 200, { success: true, model, mode: started.mode });
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

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      let accumulated = '';
      try {
        await runtimeManager.streamChat(
          messages,
          options || {},
          (tokenData) => {
            accumulated += tokenData.text;
            res.write(`data: ${JSON.stringify({ type: 'token', ...tokenData })}\n\n`);
          },
          (metrics) => {
            if (conversationId && accumulated.trim()) {
              const msgId = 'msg-' + Date.now();
              addMessage(msgId, conversationId, 'assistant', accumulated, metrics.tokensGenerated, metrics.speedTokPerSec);
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
    // Conversations APIs
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/conversations') {
      return sendJson(res, 200, listConversations());
    }

    if (method === 'POST' && pathname === '/api/conversations') {
      const body = await parseBody(req);
      const id = 'conv-' + Date.now();
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
      const msgId = 'msg-' + Date.now();
      const msg = addMessage(msgId, convId, body.role, body.content, body.tokenCount, body.tokPerSec);
      return sendJson(res, 200, msg);
    }

    if (method === 'DELETE' && pathname.startsWith('/api/conversations/')) {
      const id = pathname.replace('/api/conversations/', '');
      deleteConversation(id);
      return sendJson(res, 200, { success: true });
    }

    // -------------------------------------------------------------
    // Terminal APIs
    // -------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/terminal/history') {
      return sendJson(res, 200, getTerminalHistory(100));
    }

    if (method === 'POST' && pathname === '/api/terminal/command') {
      const body = await parseBody(req);
      if (!body.command) return sendJson(res, 400, { error: 'command is required' });

      const id = 'term-' + Date.now();
      const prompt = `You are Nexyris Terminal AI. Provide the exact command, explanation, and flags for: ${body.command}`;
      let output = '';

      await runtimeManager.streamChat(
        [{ role: 'user', content: prompt }],
        {},
        (t) => { output += t.text; },
        () => {},
        (err) => { output = `Error: ${err.message}`; }
      );

      const saved = addTerminalCommand(id, body.command, output, body.modelId);
      return sendJson(res, 200, saved);
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
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`====================================================`);
  console.log(`🚀 Nexyris Local running at: http://127.0.0.1:${PORT}`);
  console.log(`📁 Portable Root: ${APPLICATION_ROOT}`);
  console.log(`====================================================`);
});
