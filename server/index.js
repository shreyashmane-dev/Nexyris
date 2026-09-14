import express from 'express';
import cors from 'cors';
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
  updateConversationTitle, 
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

// Initialize directory structure
ensureDirectoryStructure();
getDatabase(); // Initialize SQLite tables

const app = express();
const PORT = process.env.PORT || 38192;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Start background storage heartbeat monitor
startStorageHeartbeat(3000, (available) => {
  if (!available) {
    console.warn('⚠️ ALERT: Portable storage root disconnected!');
  } else {
    console.log('✅ Storage verified online.');
  }
});

// -------------------------------------------------------------
// System & Diagnostics APIs
// -------------------------------------------------------------
app.get('/api/system/init', async (req, res) => {
  try {
    const hardware = await detectHardware();
    const storage = await getStorageInfo();
    const portableConfig = getPortableConfig();
    const hostConfig = getHostConfig(hardware);
    const { models } = await modelManager.scanAndSyncModels(hardware);

    res.json({
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/system/storage', async (req, res) => {
  try {
    const storage = await getStorageInfo();
    res.json(storage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/system/hardware', async (req, res) => {
  try {
    const hardware = await detectHardware(true);
    res.json(hardware);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/system/shutdown', async (req, res) => {
  try {
    console.log('Initiating safe shutdown of Nexyris Local...');
    // 1. Stop local runtime
    await runtimeManager.stopModel();
    // 2. Safely close database
    closeDatabase();
    res.json({ success: true, message: 'All local resources released safely. You may now eject the USB drive.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Models Management APIs
// -------------------------------------------------------------
app.get('/api/models', async (req, res) => {
  try {
    const hardware = await detectHardware();
    const result = await modelManager.scanAndSyncModels(hardware);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/models/import-local', async (req, res) => {
  try {
    const { filePath, customName } = req.body;
    if (!filePath) return res.status(400).json({ error: 'filePath is required' });
    const imported = await modelManager.importLocalGguf(filePath, customName);
    res.json(imported);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // If running, stop first
    if (runtimeManager.currentModel?.id === id) {
      await runtimeManager.stopModel();
    }
    const result = await modelManager.deleteModel(id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Providers APIs (Hugging Face & Ollama)
// -------------------------------------------------------------
app.get('/api/providers/huggingface', async (req, res) => {
  try {
    const query = req.query.q || '';
    const hardware = await detectHardware();
    
    // If query given, search HF API
    if (query) {
      const results = await searchHuggingFace(query);
      return res.json({ query, results });
    }

    // Otherwise return curated list enriched with current hardware compatibility
    const enrichedCurated = CURATED_HF_MODELS.map(m => ({
      ...m,
      compatibility: hardware && m.fileSizeGB 
        ? evaluateModelCompatibility(m.fileSizeGB, hardware) 
        : null
    }));

    res.json({ curated: enrichedCurated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/providers/ollama', async (req, res) => {
  try {
    const localOllama = await scanLocalOllama();
    res.json({
      local: localOllama,
      popular: POPULAR_OLLAMA_MODELS,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/providers/ollama/import', async (req, res) => {
  try {
    const { blobPath, tag } = req.body;
    if (!blobPath || !tag) return res.status(400).json({ error: 'blobPath and tag are required' });
    const imported = await importOllamaBlob(blobPath, tag);
    // Refresh registry
    const hardware = await detectHardware();
    await modelManager.scanAndSyncModels(hardware);
    res.json(imported);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Downloads Manager APIs
// -------------------------------------------------------------
app.get('/api/downloads', (req, res) => {
  res.json(downloadManager.getStatus());
});

app.post('/api/downloads/queue', async (req, res) => {
  try {
    const task = await downloadManager.queueDownload(req.body);
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/downloads/pause/:id', (req, res) => {
  downloadManager.pauseDownload(req.params.id);
  res.json({ success: true });
});

app.post('/api/downloads/resume/:id', (req, res) => {
  downloadManager.resumeDownload(req.params.id);
  res.json({ success: true });
});

app.post('/api/downloads/cancel/:id', (req, res) => {
  downloadManager.cancelDownload(req.params.id);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Runtime & Inference APIs
// -------------------------------------------------------------
app.get('/api/runtime/status', (req, res) => {
  res.json(runtimeManager.getStatus());
});

app.post('/api/runtime/start', async (req, res) => {
  try {
    const { modelId } = req.body;
    const registry = modelManager.getRegistry();
    const model = registry.find(m => m.id === modelId);
    if (!model) return res.status(404).json({ error: `Model ${modelId} not found in library` });

    const hardware = await detectHardware();
    const hostConfig = getHostConfig(hardware);

    const started = await runtimeManager.startModel(model, hostConfig);
    // Update active model in portable config
    savePortableConfig({ activeModelId: modelId });

    res.json({ success: true, model, mode: started.mode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/runtime/stop', async (req, res) => {
  try {
    await runtimeManager.stopModel();
    savePortableConfig({ activeModelId: null });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SSE Streaming Chat Endpoint
app.post('/api/chat/stream', async (req, res) => {
  const { messages, options, conversationId } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let accumulatedContent = '';

  try {
    await runtimeManager.streamChat(
      messages,
      options || {},
      // onToken
      (tokenData) => {
        accumulatedContent += tokenData.text;
        res.write(`data: ${JSON.stringify({ type: 'token', ...tokenData })}\n\n`);
      },
      // onDone
      (metrics) => {
        // Save assistant message to SQLite if conversationId provided
        if (conversationId && accumulatedContent.trim()) {
          const msgId = 'msg-' + Date.now();
          addMessage(msgId, conversationId, 'assistant', accumulatedContent, metrics.tokensGenerated, metrics.speedTokPerSec);
        }
        res.write(`data: ${JSON.stringify({ type: 'done', metrics })}\n\n`);
        res.end();
      },
      // onError
      (error) => {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
      }
    );
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
});

// -------------------------------------------------------------
// Conversations & Database APIs
// -------------------------------------------------------------
app.get('/api/conversations', (req, res) => {
  try {
    const list = listConversations();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/conversations', (req, res) => {
  try {
    const { title, modelId } = req.body;
    const id = 'conv-' + Date.now();
    const created = createConversation(id, title, modelId);
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/conversations/:id/messages', (req, res) => {
  try {
    const messages = getConversationMessages(req.params.id);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/conversations/:id/messages', (req, res) => {
  try {
    const { role, content, tokenCount, tokPerSec } = req.body;
    const msgId = 'msg-' + Date.now();
    const msg = addMessage(msgId, req.params.id, role, content, tokenCount, tokPerSec);
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/conversations/:id', (req, res) => {
  try {
    deleteConversation(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Terminal AI Workspace APIs
// -------------------------------------------------------------
app.get('/api/terminal/history', (req, res) => {
  try {
    const history = getTerminalHistory(100);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/terminal/command', async (req, res) => {
  try {
    const { command, modelId } = req.body;
    if (!command) return res.status(400).json({ error: 'command is required' });

    // Interpret command using local runtime or generate shell explanation
    const id = 'term-' + Date.now();
    const prompt = `You are Nexyris Terminal AI. Provide the exact command, explanation, and potential flags for: ${command}`;
    
    let output = '';
    await runtimeManager.streamChat(
      [{ role: 'user', content: prompt }],
      {},
      (token) => { output += token.text; },
      () => {},
      (err) => { output = `Error: ${err.message}`; }
    );

    const saved = addTerminalCommand(id, command, output, modelId);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Code Assistant Workspace APIs
// -------------------------------------------------------------
app.get('/api/code/projects', (req, res) => {
  try {
    res.json(listCodeProjects());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/code/projects', (req, res) => {
  try {
    const { id, name, description, files } = req.body;
    const projId = id || 'proj-' + Date.now();
    const saved = saveCodeProject(projId, name || 'Untitled Project', description || '', files || []);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/code/projects/:id', (req, res) => {
  try {
    deleteCodeProject(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Configuration APIs
// -------------------------------------------------------------
app.get('/api/config', async (req, res) => {
  try {
    const hardware = await detectHardware();
    const portable = getPortableConfig();
    const host = getHostConfig(hardware);
    res.json({ portable, host });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config/portable', (req, res) => {
  try {
    const updated = savePortableConfig(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config/host', async (req, res) => {
  try {
    const hardware = await detectHardware();
    const updated = saveHostConfig(hardware.hostId, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Serve Static Frontend if built
// -------------------------------------------------------------
const distDir = path.join(APPLICATION_ROOT, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`====================================================`);
  console.log(`🚀 Nexyris Local running at: http://127.0.0.1:${PORT}`);
  console.log(`📁 Portable Root: ${APPLICATION_ROOT}`);
  console.log(`====================================================`);
});
