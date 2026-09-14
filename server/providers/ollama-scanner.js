import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PATHS, toRelativePath } from '../dynamic-root.js';
import { parseGgufHeader } from '../gguf-parser.js';

/**
 * Discovers any local Ollama installations and installed models on the host machine
 */
export async function scanLocalOllama() {
  const homeDir = os.homedir();
  const possiblePaths = [
    path.join(homeDir, '.ollama', 'models'),
    path.join(process.env.LOCALAPPDATA || '', 'Ollama', 'models'),
    '/usr/share/ollama/.ollama/models',
  ];

  let ollamaModelsDir = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      ollamaModelsDir = p;
      break;
    }
  }

  if (!ollamaModelsDir) {
    return {
      installedOnHost: false,
      models: [],
      message: 'No local Ollama installation detected on this host computer.',
    };
  }

  const manifestsDir = path.join(ollamaModelsDir, 'manifests');
  const blobsDir = path.join(ollamaModelsDir, 'blobs');

  if (!fs.existsSync(manifestsDir) || !fs.existsSync(blobsDir)) {
    return {
      installedOnHost: true,
      modelsDir: ollamaModelsDir,
      models: [],
      message: 'Ollama directories exist but no model manifests found.',
    };
  }

  const discoveredModels = [];

  function scanManifestDir(dir, prefix = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanManifestDir(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name);
        } else {
          // This is a manifest file (e.g. "latest", "7b", etc.)
          const modelTag = prefix ? `${prefix}:${entry.name}` : entry.name;
          try {
            const manifestContent = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
            // In Ollama manifests, the primary model weights layer has mediaType "application/vnd.ollama.image.model"
            const modelLayer = manifestContent.layers?.find(
              l => l.mediaType === 'application/vnd.ollama.image.model' || l.mediaType?.includes('model')
            );

            if (modelLayer && modelLayer.digest) {
              const digestFile = modelLayer.digest.replace('sha256:', 'sha256-');
              const blobPath = path.join(blobsDir, digestFile);

              if (fs.existsSync(blobPath)) {
                const stats = fs.statSync(blobPath);
                discoveredModels.push({
                  tag: modelTag.replace(/^registry\.ollama\.ai\/library\//, ''),
                  fullTag: modelTag,
                  sizeBytes: stats.size,
                  sizeGB: Math.round((stats.size / (1024 ** 3)) * 100) / 100,
                  blobPath,
                  digest: modelLayer.digest,
                });
              }
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  scanManifestDir(manifestsDir);

  return {
    installedOnHost: true,
    modelsDir: ollamaModelsDir,
    models: discoveredModels,
    count: discoveredModels.length,
    message: discoveredModels.length > 0 
      ? `Found ${discoveredModels.length} models in local Ollama storage on this PC.` 
      : 'Ollama is installed but no models are downloaded.',
  };
}

/**
 * Imports an existing Ollama model directly into Nexyris USB storage
 */
export async function importOllamaBlob(blobPath, modelTag, onProgress) {
  if (!fs.existsSync(blobPath)) {
    throw new Error(`Ollama blob file not found: ${blobPath}`);
  }

  const safeName = modelTag.replace(/[^a-zA-Z0-9._-]/g, '_');
  const targetFilename = `${safeName}.gguf`;
  const destPath = path.join(PATHS.modelsGguf, targetFilename);

  // Validate that the blob is indeed a valid GGUF file
  const header = await parseGgufHeader(blobPath);
  if (!header.valid) {
    throw new Error(`Ollama blob is not a valid GGUF model: ${header.error}`);
  }

  // Copy with stream to show progress and preserve memory
  const stats = fs.statSync(blobPath);
  const totalBytes = stats.size;
  let copiedBytes = 0;

  const readStream = fs.createReadStream(blobPath);
  const writeStream = fs.createWriteStream(destPath);

  await new Promise((resolve, reject) => {
    readStream.on('data', (chunk) => {
      copiedBytes += chunk.length;
      if (onProgress && totalBytes > 0) {
        onProgress({
          copiedBytes,
          totalBytes,
          percent: Math.round((copiedBytes / totalBytes) * 100),
        });
      }
    });

    writeStream.on('finish', resolve);
    readStream.on('error', reject);
    writeStream.on('error', reject);

    readStream.pipe(writeStream);
  });

  return {
    success: true,
    tag: modelTag,
    filename: targetFilename,
    relativePath: toRelativePath(destPath),
    header,
    sizeGB: header.fileSizeGB,
  };
}

/**
 * Curated catalog of popular Ollama library models for quick discovery
 */
export const POPULAR_OLLAMA_MODELS = [
  { id: 'llama3.2:1b', name: 'Llama 3.2 1B', sizeGB: 1.3, category: 'Lightweight', desc: 'Ultra-fast Meta small language model' },
  { id: 'llama3.2:3b', name: 'Llama 3.2 3B', sizeGB: 2.0, category: 'Balanced', desc: 'Capable compact assistant from Meta' },
  { id: 'qwen2.5:0.5b', name: 'Qwen 2.5 0.5B', sizeGB: 0.4, category: 'Lightweight', desc: 'Tiny, lightning fast general model' },
  { id: 'qwen2.5:1.5b', name: 'Qwen 2.5 1.5B', sizeGB: 1.0, category: 'Balanced', desc: 'Remarkable reasoning in a 1.5B size' },
  { id: 'qwen2.5-coder:1.5b', name: 'Qwen 2.5 Coder 1.5B', sizeGB: 1.0, category: 'Coding', desc: 'Dedicated code generation model' },
  { id: 'qwen2.5-coder:7b', name: 'Qwen 2.5 Coder 7B', sizeGB: 4.7, category: 'Coding', desc: 'Top tier coding assistant' },
  { id: 'deepseek-r1:1.5b', name: 'DeepSeek R1 Distill 1.5B', sizeGB: 1.1, category: 'Reasoning', desc: 'Chain-of-thought reasoning distilled' },
  { id: 'deepseek-r1:7b', name: 'DeepSeek R1 Distill 7B', sizeGB: 4.7, category: 'Reasoning', desc: 'DeepSeek R1 reasoning on Qwen 7B' },
  { id: 'mistral:7b', name: 'Mistral 7B', sizeGB: 4.1, category: 'General', desc: 'Classic powerhouse open-weight model' },
  { id: 'phi3.5:3.8b', name: 'Phi 3.5 Mini', sizeGB: 2.2, category: 'Reasoning', desc: 'High capability small model from Microsoft' },
];
