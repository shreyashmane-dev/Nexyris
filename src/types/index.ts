export type AppMode = 'chat' | 'terminal' | 'code' | 'image' | 'models' | 'downloads' | 'diagnostics' | 'settings';

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
  sizeBytes?: number;
  contextLength?: number;
  architecture?: string;
  installedDate?: string;
  status: string;
  compatibility?: ModelCompatibility | null;
  description?: string;
  category?: string;
  downloadUrl?: string;
}

export interface DownloadTask {
  id: string;
  name: string;
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
  token_count?: number;
  tokens_per_sec?: number;
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
