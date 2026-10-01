export type AppMode = 'dashboard' | 'chat' | 'terminal' | 'code' | 'image' | 'models' | 'downloads' | 'diagnostics' | 'settings' | 'plugins';

export interface StorageInfo {
  rootPath: string;
  driveLetter: string;
  volumeName: string;
  fileSystem: string;
  isRemovable: boolean;
  driveType: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  totalGB: number;
  freeGB: number;
  usedGB: number;
  freePercentage: number;
  isAvailable: boolean;
}

export interface HardwareInfo {
  hostId: string;
  hostname: string;
  os: {
    platform: string;
    type: string;
    release: string;
    arch: string;
    distro: string;
  };
  cpu: {
    model: string;
    physicalCores: number;
    logicalThreads: number;
    recommendedThreads: number;
  };
  ram: {
    totalBytes: number;
    freeBytes: number;
    totalGB: number;
    freeGB: number;
  };
  gpu: {
    detected: boolean;
    name: string;
    vendor: string;
    vramMB: number;
    vramGB: number;
    hasCuda: boolean;
    hasVulkan: boolean;
    acceleration: string;
  };
  performanceProfile: string;
  recommendedConfig: {
    threads: number;
    gpuLayers: number;
    contextSize: number;
    batchSize: number;
  };
}

export interface ModelCompatibility {
  status: 'RECOMMENDED' | 'COMPATIBLE' | 'WARNING' | 'UNSUPPORTED';
  label: string;
  badge: string;
  color: string;
  score: number;
  canRun: boolean;
  reason: string;
  accelerationAdvice: string;
}

export interface ModelItem {
  id: string;
  name: string;
  filename?: string;
  path?: string;
  format: string;
  source: string;
  quantization?: string;
  sizeGB?: number;
  fileSizeGB?: number;
  sizeBytes?: number;
  fileSizeBytes?: number;
  contextLength?: number;
  architecture?: string;
  installedDate?: string;
  status: string;
  compatibility?: ModelCompatibility | null;
  description?: string;
  category?: string;
  downloadUrl?: string;
  badge?: string;
  label?: string;
  isRecommended?: boolean;
}

export interface DownloadTask {
  id: string;
  name: string;
  filename?: string;
  expectedSize?: number;
  downloadedBytes: number;
  totalBytes: number;
  speedMBs: number;
  etaSeconds: number;
  percent: number;
  status: 'queued' | 'downloading' | 'paused' | 'verifying' | 'completed' | 'error';
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  model_id?: string;
  last_message?: string;
  message_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_id?: string;
  token_count?: number;
  tokensGenerated?: number;
  tokens_per_sec?: number;
  speedTokPerSec?: number;
  speed_tok_s?: number;
  created_at: string;
}

export interface TerminalEntry {
  id: string;
  command: string;
  output: string;
  model_id?: string;
  created_at: string;
}

export interface CodeProject {
  id: string;
  name: string;
  description?: string;
  files: Array<{ name: string; content: string }>;
  created_at: string;
  updated_at: string;
}

export interface RuntimeStatus {
  status: 'STOPPED' | 'STARTING' | 'LOADING_MODEL' | 'HEALTH_CHECKING' | 'READY' | 'ERROR';
  currentModel: ModelItem | null;
  binaryAvailable: boolean;
  binaryPath: string | null;
  port: number;
  host: string;
  errorDetails: string | null;
  lastMetrics: {
    tokensGenerated: number;
    speedTokPerSec: number;
    elapsedMs: number;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  display_name?: string;
  title?: string;
  bio?: string;
  avatar_emoji?: string;
  custom_instructions?: string;
  preferred_model?: string;
  theme?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserMemory {
  id: string;
  category: 'preference' | 'fact' | 'project' | 'personal';
  key: string;
  value: string;
  created_at?: string;
  updated_at?: string;
}

export interface PluginToolParameter {
  type: string;
  description: string;
  required?: boolean;
}

export interface PluginTool {
  name: string;
  description: string;
  parameters?: Record<string, PluginToolParameter>;
}

export interface WorldPlugin {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  enabled: boolean;
  isCustom?: boolean;
  config?: Record<string, any>;
  tools: PluginTool[];
}

export interface PluginExecutionResult {
  success: boolean;
  pluginId: string;
  toolName: string;
  elapsedMs: number;
  result?: any;
  error?: string;
}

