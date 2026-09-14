import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// APPLICATION_ROOT is dynamically determined from the project root
// Can also be overridden by environment variable for custom mounts
export const APPLICATION_ROOT = process.env.NEXYRIS_ROOT 
  ? path.resolve(process.env.NEXYRIS_ROOT)
  : path.resolve(__dirname, '..');

// Standard portable directory paths relative to root
export const PATHS = {
  root: APPLICATION_ROOT,
  runtime: path.join(APPLICATION_ROOT, 'runtime'),
  runtimeWindows: path.join(APPLICATION_ROOT, 'runtime', 'windows', 'llama'),
  runtimeMetadata: path.join(APPLICATION_ROOT, 'runtime', 'metadata'),
  models: path.join(APPLICATION_ROOT, 'models'),
  modelsGguf: path.join(APPLICATION_ROOT, 'models', 'gguf'),
  modelsMetadata: path.join(APPLICATION_ROOT, 'models', 'metadata'),
  data: path.join(APPLICATION_ROOT, 'data'),
  database: path.join(APPLICATION_ROOT, 'data', 'database'),
  conversations: path.join(APPLICATION_ROOT, 'data', 'conversations'),
  projects: path.join(APPLICATION_ROOT, 'data', 'projects'),
  settings: path.join(APPLICATION_ROOT, 'data', 'settings'),
  config: path.join(APPLICATION_ROOT, 'config'),
  configHosts: path.join(APPLICATION_ROOT, 'config', 'hosts'),
  downloads: path.join(APPLICATION_ROOT, 'downloads'),
  cache: path.join(APPLICATION_ROOT, 'cache'),
  logs: path.join(APPLICATION_ROOT, 'logs'),
  apps: path.join(APPLICATION_ROOT, 'apps'),
};

/**
 * Resolves a relative path against APPLICATION_ROOT
 * Never stores or relies on hard-coded drive letters
 */
export function resolvePath(relOrAbsPath) {
  if (!relOrAbsPath) return APPLICATION_ROOT;
  if (path.isAbsolute(relOrAbsPath)) {
    return relOrAbsPath;
  }
  return path.resolve(APPLICATION_ROOT, relOrAbsPath);
}

/**
 * Converts an absolute path to a portable relative path from APPLICATION_ROOT
 * Ensures that if drive letter changes (e.g. E: -> F:), paths remain valid
 */
export function toRelativePath(targetPath) {
  if (!targetPath) return '';
  const relative = path.relative(APPLICATION_ROOT, targetPath);
  // Normalize forward slashes for cross-platform portability
  return relative.split(path.sep).join('/');
}

/**
 * Automatically creates the entire portable directory tree if missing
 */
export function ensureDirectoryStructure() {
  const dirsToEnsure = [
    PATHS.runtime,
    PATHS.runtimeWindows,
    PATHS.runtimeMetadata,
    PATHS.models,
    PATHS.modelsGguf,
    PATHS.modelsMetadata,
    PATHS.data,
    PATHS.database,
    PATHS.conversations,
    PATHS.projects,
    PATHS.settings,
    PATHS.config,
    PATHS.configHosts,
    PATHS.downloads,
    PATHS.cache,
    PATHS.logs,
    PATHS.apps,
  ];

  for (const dir of dirsToEnsure) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Ensure default models/registry.json if not present
  const registryFile = path.join(PATHS.models, 'registry.json');
  if (!fs.existsSync(registryFile)) {
    fs.writeFileSync(registryFile, JSON.stringify([], null, 2), 'utf-8');
  }

  // Ensure default config/config.json if not present
  const configFile = path.join(PATHS.config, 'config.json');
  if (!fs.existsSync(configFile)) {
    const defaultConfig = {
      product: 'Nexyris Local',
      version: '1.0.0',
      installed: false,
      firstRunCompleted: false,
      theme: 'dark',
      defaultApplication: 'chat',
      defaultModelId: null,
      storageCheckThresholdMB: 1024,
      downloadMaxConcurrent: 1,
      offlineOnly: true,
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  }

  return PATHS;
}
