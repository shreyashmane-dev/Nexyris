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
  const res = await fetch(`${API_BASE}/system/shutdown`, { method: 'POST' });
  return res.json();
}

// Models
export async function fetchModels(): Promise<{ models: ModelItem[]; newlyDiscoveredCount: number; newlyDiscovered: ModelItem[] }> {
  const res = await fetch(`${API_BASE}/models`);
  return res.json();
}

export async function importLocalGguf(filePath: string, customName?: string) {
  const res = await fetch(`${API_BASE}/models/import-local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, customName }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to import local model');
  }
  return res.json();
}

export async function deleteModel(id: string) {
  const res = await fetch(`${API_BASE}/models/${id}`, { method: 'DELETE' });
  return res.json();
}

// Providers
export async function fetchHuggingFaceCatalog(query = '') {
  const url = query ? `${API_BASE}/providers/huggingface?q=${encodeURIComponent(query)}` : `${API_BASE}/providers/huggingface`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchOllamaCatalog() {
  const res = await fetch(`${API_BASE}/providers/ollama`);
  return res.json();
}

export async function importOllamaBlob(blobPath: string, tag: string) {
  const res = await fetch(`${API_BASE}/providers/ollama/import`, {
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

// Downloads
export async function fetchDownloads(): Promise<{ active: DownloadTask | null; queue: DownloadTask[]; incomplete: any[] }> {
  const res = await fetch(`${API_BASE}/downloads`);
  return res.json();
}

export async function queueDownload(modelData: Partial<ModelItem> & { url: string; expectedSize?: number }) {
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
  return fetch(`${API_BASE}/downloads/pause/${id}`, { method: 'POST' }).then(r => r.json());
}

export async function resumeDownload(id: string) {
  return fetch(`${API_BASE}/downloads/resume/${id}`, { method: 'POST' }).then(r => r.json());
}

export async function cancelDownload(id: string) {
  return fetch(`${API_BASE}/downloads/cancel/${id}`, { method: 'POST' }).then(r => r.json());
}

// Runtime
export async function fetchRuntimeStatus(): Promise<RuntimeStatus> {
  const res = await fetch(`${API_BASE}/runtime/status`);
  return res.json();
}

export async function startRuntimeModel(modelId: string) {
  const res = await fetch(`${API_BASE}/runtime/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId }),
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
  onToken?: (data: { text: string; tokenCount: number; tokPerSec: number }) => void,
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
      throw new Error(`Chat stream failed: ${res.statusText}`);
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

export async function saveMessage(conversationId: string, role: string, content: string, tokenCount = 0, tokPerSec = 0) {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content, tokenCount, tokPerSec }),
  });
  return res.json();
}

export async function deleteConversation(id: string) {
  return fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' }).then(r => r.json());
}

// Terminal
export async function fetchTerminalHistory(): Promise<TerminalEntry[]> {
  const res = await fetch(`${API_BASE}/terminal/history`);
  return res.json();
}

export async function runTerminalCommand(command: string, modelId?: string): Promise<TerminalEntry> {
  const res = await fetch(`${API_BASE}/terminal/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, modelId }),
  });
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
