import { 
  HardwareInfo, 
  StorageInfo, 
  ModelItem, 
  DownloadTask, 
  Conversation, 
  Message, 
  TerminalEntry, 
  CodeProject, 
  RuntimeStatus 
} from '../types';

const API_BASE = '/api';

export async function fetchInitData() {
  const res = await fetch(`${API_BASE}/system/init`);
  if (!res.ok) throw new Error(`Init failed: ${res.statusText}`);
  return res.json();
}

export async function fetchStorage(): Promise<StorageInfo> {
  const res = await fetch(`${API_BASE}/system/storage`);
  return res.json();
}

export async function fetchHardware(): Promise<HardwareInfo> {
  const res = await fetch(`${API_BASE}/system/hardware`);
  return res.json();
}

export async function requestSafeShutdown() {
  const res = await fetch(`${API_BASE}/system/eject`, { method: 'POST' });
  return res.json();
}

export async function scanPcDownloads(): Promise<{ found: Array<{ name: string; path: string; source: string; sizeBytes: number; sizeGB: number }> }> {
  const res = await fetch(`${API_BASE}/system/scan-downloads`);
  return res.json();
}

export async function uploadGgufFile(file: File): Promise<any> {
  const res = await fetch(`${API_BASE}/models/upload`, {
    method: 'POST',
    headers: {
      'x-filename': file.name,
      'Content-Type': 'application/octet-stream',
    },
    body: file,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to upload model file to USB');
  }
  return res.json();
}

// Models
export async function fetchModels(): Promise<{ models: ModelItem[]; newlyDiscoveredCount: number; newlyDiscovered: ModelItem[] }> {
  const res = await fetch(`${API_BASE}/models`);
  return res.json();
}

export async function importLocalGguf(sourcePath: string, name?: string) {
  const res = await fetch(`${API_BASE}/models/import-local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourcePath, name, copyFile: true }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to import local model to USB');
  }
  return res.json();
}

export async function deleteModel(id: string) {
  const res = await fetch(`${API_BASE}/models/${id}`, { method: 'DELETE' });
  return res.json();
}

// Providers & Curated HuggingFace Catalogs
export async function fetchHuggingFaceCatalog(query = '') {
  const url = query 
    ? `${API_BASE}/catalog/search?q=${encodeURIComponent(query)}` 
    : `${API_BASE}/catalog/curated`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchOllamaCatalog() {
  const res = await fetch(`${API_BASE}/catalog/ollama/popular`);
  return res.json();
}

export async function importOllamaBlob(blobPath: string, tag: string) {
  const res = await fetch(`${API_BASE}/catalog/ollama/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blobPath, tag }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to import Ollama blob');
  }
  return res.json();
}

// Downloads (Matches server /api/downloads/queue)
export async function fetchDownloads(): Promise<{ active: DownloadTask | null; queue: DownloadTask[]; incomplete: any[] }> {
  const res = await fetch(`${API_BASE}/downloads/queue`);
  return res.json();
}

export async function queueDownload(modelData: Partial<ModelItem> & { url: string; expectedSize?: number; filename?: string; category?: string }) {
  const res = await fetch(`${API_BASE}/downloads/queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(modelData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to queue download');
  }
  return res.json();
}

export async function pauseDownload(id: string) {
  return fetch(`${API_BASE}/downloads/${id}/pause`, { method: 'POST' }).then(r => r.json());
}

export async function resumeDownload(id: string) {
  return fetch(`${API_BASE}/downloads/${id}/resume`, { method: 'POST' }).then(r => r.json());
}

export async function cancelDownload(id: string) {
  return fetch(`${API_BASE}/downloads/${id}/cancel`, { method: 'POST' }).then(r => r.json());
}

// Engine & Runtime
export async function fetchRuntimeStatus(): Promise<RuntimeStatus> {
  const res = await fetch(`${API_BASE}/runtime/status`);
  return res.json();
}

export async function fetchEngineStatus() {
  const res = await fetch(`${API_BASE}/runtime/engine-status`);
  return res.json();
}

export async function installPortableEngine() {
  const res = await fetch(`${API_BASE}/runtime/install-engine`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Engine install failed');
  }
  return res.json();
}

export async function startRuntimeModel(modelId: string, hostConfig?: any) {
  const res = await fetch(`${API_BASE}/runtime/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId, hostConfig }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to start model');
  }
  return res.json();
}

export async function stopRuntimeModel() {
  const res = await fetch(`${API_BASE}/runtime/stop`, { method: 'POST' });
  return res.json();
}

// SSE Chat Stream
export async function streamChatCompletion(
  messages: Array<{ role: string; content: string }>,
  conversationId?: string,
  options?: any,
  onToken?: (data: { text: string; count?: number; tokPerSec?: number; tokenCount?: number }) => void,
  onDone?: (metrics: any) => void,
  onError?: (err: Error) => void
) {
  try {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, conversationId, options }),
    });

    if (!res.ok) {
      let errMsg = `Chat stream failed: ${res.statusText}`;
      try {
        const errJson = await res.json();
        if (errJson.error) errMsg = errJson.error;
      } catch (e) {}
      throw new Error(errMsg);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('Readable stream not supported');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const event = JSON.parse(trimmed.slice(6));
            if (event.type === 'token' && onToken) {
              onToken(event);
            } else if (event.type === 'done' && onDone) {
              onDone(event.metrics);
            } else if (event.type === 'error' && onError) {
              onError(new Error(event.error));
            }
          } catch (e) {}
        }
      }
    }
  } catch (err: any) {
    if (onError) onError(err);
  }
}

// Conversations
export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/conversations`);
  return res.json();
}

export async function createConversation(title?: string, modelId?: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, modelId }),
  });
  return res.json();
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`);
  return res.json();
}

export async function saveMessage(conversationId: string, role: string, content: string, tokenCount = 0, tokPerSec = 0, modelId?: string) {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content, tokenCount, tokPerSec, modelId }),
  });
  return res.json();
}

export async function deleteConversation(id: string) {
  return fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' }).then(r => r.json());
}

export async function updateConversation(id: string, title: string) {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return res.json();
}

// Terminal (Real shell execution on USB)
export async function fetchTerminalHistory(): Promise<TerminalEntry[]> {
  const res = await fetch(`${API_BASE}/terminal/history`);
  return res.json();
}

export async function runTerminalCommand(command: string, modelId?: string): Promise<TerminalEntry & { stdout?: string; stderr?: string; exitCode?: number; cwd?: string }> {
  const res = await fetch(`${API_BASE}/terminal/exec`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, modelId }),
  });
  return res.json();
}

// Image Studio Gallery
export async function fetchImageGallery(): Promise<{ gallery: Array<{ filename: string; url: string; createdAt: number; sizeBytes: number }> }> {
  const res = await fetch(`${API_BASE}/image/gallery`);
  return res.json();
}

// Code Projects
export async function fetchCodeProjects(): Promise<CodeProject[]> {
  const res = await fetch(`${API_BASE}/code/projects`);
  return res.json();
}

export async function saveCodeProject(project: Partial<CodeProject>): Promise<CodeProject> {
  const res = await fetch(`${API_BASE}/code/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  return res.json();
}

export async function deleteCodeProject(id: string) {
  return fetch(`${API_BASE}/code/projects/${id}`, { method: 'DELETE' }).then(r => r.json());
}

// Config
export async function fetchConfig() {
  const res = await fetch(`${API_BASE}/config`);
  return res.json();
}

export async function updatePortableConfig(updates: any) {
  const res = await fetch(`${API_BASE}/config/portable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function updateHostConfig(updates: any) {
  const res = await fetch(`${API_BASE}/config/host`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.json();
}

// MCP (Model Context Protocol) API
export interface McpServerInfo {
  id?: string;
  name: string;
  type: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[] | string;
  url?: string;
  env?: Record<string, string>;
  enabled?: boolean;
}

export interface McpStatusResponse {
  builtIn: {
    name: string;
    version: string;
    protocolVersion: string;
    status: string;
    transport: string[];
    endpoint: string;
    stdioCommand: string;
    tools: Array<{ name: string; description: string; inputSchema: any }>;
    resources: Array<{ uri: string; name: string; description: string }>;
    prompts: Array<{ name: string; description: string }>;
  };
  externalServers: McpServerInfo[];
}

export async function fetchMcpServers(): Promise<McpStatusResponse> {
  const res = await fetch(`${API_BASE}/mcp/servers`);
  return res.json();
}

export async function addMcpServer(server: McpServerInfo): Promise<McpServerInfo> {
  const res = await fetch(`${API_BASE}/mcp/servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(server),
  });
  return res.json();
}

export async function deleteMcpServer(id: string): Promise<{ success: boolean; id: string }> {
  const res = await fetch(`${API_BASE}/mcp/servers/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function callMcpRpc(method: string, params: any = {}, id = 1): Promise<any> {
  const res = await fetch(`${API_BASE}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  return res.json();
}

// Real Code Execution
export async function executeCode(code: string, language: string, filename?: string): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
  elapsedMs: number;
  output: string;
}> {
  const res = await fetch(`${API_BASE}/code/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language, filename }),
  });
  return res.json();
}
