import fs from 'node:fs';
import path from 'node:path';
import { PATHS, resolvePath, toRelativePath } from './dynamic-root.js';
import { parseGgufHeader } from './gguf-parser.js';
import { evaluateModelCompatibility } from './hardware.js';

const REGISTRY_FILE = path.join(PATHS.models, 'registry.json');

class ModelManager {
  constructor() {
    this.cachedModels = null;
  }

  getRegistry() {
    try {
      if (fs.existsSync(REGISTRY_FILE)) {
        return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
      }
    } catch (e) {
      console.warn('Could not read registry.json, returning empty array');
    }
    return [];
  }

  saveRegistry(models) {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(models, null, 2), 'utf-8');
    this.cachedModels = models;
  }

  /**
   * Scans models/gguf/ directory for any GGUF files and merges with registry
   * Discovers manually copied models automatically
   */
  async scanAndSyncModels(hardware) {
    const registry = this.getRegistry();
    const registeredFilenames = new Set(registry.map(m => path.basename(m.path || m.filename || '')));
    const ggufDir = PATHS.modelsGguf;

    if (!fs.existsSync(ggufDir)) {
      fs.mkdirSync(ggufDir, { recursive: true });
    }

    const files = fs.readdirSync(ggufDir);
    const discoveredNew = [];
    const activeModels = [];

    for (const file of files) {
      if (file.toLowerCase().endsWith('.gguf')) {
        const fullPath = path.join(ggufDir, file);
        const relativePath = toRelativePath(fullPath);

        let existingEntry = registry.find(m => 
          (m.path && path.basename(m.path) === file) || 
          (m.filename && m.filename === file)
        );

        if (!existingEntry) {
          // Newly discovered file! Parse its header
          const header = await parseGgufHeader(fullPath);
          if (header.valid) {
            const cleanName = file.replace(/\.gguf$/i, '').replace(/[-_]/g, ' ');
            const newModel = {
              id: file.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
              name: cleanName,
              filename: file,
              path: relativePath,
              format: 'GGUF',
              source: 'Auto-Discovered',
              quantization: header.quantization || 'Q4_K_M',
              sizeGB: header.fileSizeGB,
              sizeBytes: header.fileSizeBytes,
              contextLength: 4096,
              architecture: header.architecture,
              installedDate: new Date().toISOString(),
              status: 'ready',
            };
            registry.push(newModel);
            discoveredNew.push(newModel);
            existingEntry = newModel;
          }
        }

        if (existingEntry) {
          // Attach hardware compatibility calculation
          const compat = hardware ? evaluateModelCompatibility(existingEntry.sizeGB || 1, hardware) : null;
          activeModels.push({
            ...existingEntry,
            path: relativePath, // ensure normalized relative path
            compatibility: compat,
          });
        }
      }
    }

    // Clean up registry to remove entries whose files no longer exist on disk
    const existingFileNames = new Set(files.filter(f => f.toLowerCase().endsWith('.gguf')));
    const prunedRegistry = registry.filter(m => {
      const fn = path.basename(m.path || m.filename || '');
      return existingFileNames.has(fn);
    });

    // Save updated registry if new files were found or deleted files were pruned
    if (discoveredNew.length > 0 || prunedRegistry.length !== registry.length) {
      this.saveRegistry(prunedRegistry);
    }

    this.cachedModels = activeModels;
    return {
      models: activeModels,
      newlyDiscoveredCount: discoveredNew.length,
      newlyDiscovered: discoveredNew,
    };
  }

  /**
   * Imports a local GGUF file from anywhere on the PC into USB storage
   */
  async importLocalGguf(sourcePath, customName = null, onProgress) {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file not found at ${sourcePath}`);
    }

    const header = await parseGgufHeader(sourcePath);
    if (!header.valid) {
      throw new Error(`File is not a valid GGUF model: ${header.error}`);
    }

    const sourceFilename = path.basename(sourcePath);
    const destPath = path.join(PATHS.modelsGguf, sourceFilename);

    if (fs.existsSync(destPath)) {
      throw new Error(`A model named ${sourceFilename} already exists in Nexyris models.`);
    }

    const stats = fs.statSync(sourcePath);
    const totalBytes = stats.size;
    let copiedBytes = 0;

    const readStream = fs.createReadStream(sourcePath);
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

    const modelId = sourceFilename.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const relativePath = toRelativePath(destPath);
    const cleanName = customName || sourceFilename.replace(/\.gguf$/i, '').replace(/[-_]/g, ' ');

    const newModel = {
      id: modelId,
      name: cleanName,
      filename: sourceFilename,
      path: relativePath,
      format: 'GGUF',
      source: 'Local PC Import',
      quantization: header.quantization,
      sizeGB: header.fileSizeGB,
      sizeBytes: header.fileSizeBytes,
      contextLength: 4096,
      architecture: header.architecture,
      installedDate: new Date().toISOString(),
      status: 'ready',
    };

    const registry = this.getRegistry();
    registry.push(newModel);
    this.saveRegistry(registry);

    return newModel;
  }

  async importExternalFile(sourcePath, options = {}) {
    return this.importLocalGguf(sourcePath, options.name, options.onProgress);
  }

  /**
   * Deletes a model from USB storage and removes registry metadata
   */
  async deleteModel(modelId) {
    const registry = this.getRegistry();
    const index = registry.findIndex(m => m.id === modelId);

    if (index === -1) {
      throw new Error(`Model ${modelId} not found in registry.`);
    }

    const model = registry[index];
    const absPath = path.normalize(resolvePath(model.path));
    const allowedDir = path.normalize(PATHS.modelsGguf);

    // Safeguard: strictly ensure the file is inside models/gguf
    if (absPath.toLowerCase().startsWith(allowedDir.toLowerCase()) && fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }

    registry.splice(index, 1);
    this.saveRegistry(registry);

    return { success: true, deletedId: modelId };
  }
}

export const modelManager = new ModelManager();
