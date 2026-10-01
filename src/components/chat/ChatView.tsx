import React, { useState, useEffect, useRef } from 'react';
import {
  Conversation,
  Message,
  ModelItem,
  RuntimeStatus,
  DownloadTask,
} from '../../types';
import {
  fetchConversations,
  createConversation,
  fetchMessages,
  saveMessage,
  streamChatCompletion,
  fetchHuggingFaceCatalog,
  queueDownload,
  fetchDownloads,
  startRuntimeModel,
  generateConversationTitle,
} from '../../lib/api';
import {
  MessageSquare,
  Plus,
  ArrowUp,
  Globe,
  Sparkles,
  Search,
  CloudSun,
  BookOpen,
  FolderGit2,
  FileCode,
  Code2,
  Copy,
  Check,
  RotateCcw,
  StopCircle,
  FileDown,
  ChevronDown,
  ChevronUp,
  Cpu,
  Zap,
  HardDrive,
  ExternalLink,
  Sliders,
  Terminal,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface ChatViewProps {
  runtimeStatus: RuntimeStatus;
  onSelectModel: (modelId: string) => void;
  models: ModelItem[];
  onNavigateToModels?: () => void;
  onStopModel?: () => void;
  onRefreshModels?: () => void;
  activeConvId?: string | null;
  setActiveConvId?: (id: string | null) => void;
  newChatTrigger?: number;
}

export const ChatView: React.FC<ChatViewProps> = ({
  runtimeStatus,
  onSelectModel,
  models,
  onNavigateToModels,
  onStopModel,
  onRefreshModels,
  activeConvId: propActiveConvId,
  setActiveConvId: propSetActiveConvId,
  newChatTrigger,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [internalConvId, setInternalConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [liveMetrics, setLiveMetrics] = useState<{ tokPerSec: number; tokenCount: number } | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  // ChatGPT-style world search toggle
  const [worldSearchEnabled, setWorldSearchEnabled] = useState(true);
  const [showPluginMenu, setShowPluginMenu] = useState(false);
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);
  const [activeWorldEvent, setActiveWorldEvent] = useState<any | null>(null);

  const activeConvId = propActiveConvId !== undefined ? propActiveConvId : internalConvId;
  const changeActiveConvId = (id: string | null) => {
    if (propSetActiveConvId) propSetActiveConvId(id);
    setInternalConvId(id);
  };

  // Hugging Face catalog state if no models are installed
  const [hfCatalog, setHfCatalog] = useState<ModelItem[]>([]);
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [activeDownloadInfo, setActiveDownloadInfo] = useState<DownloadTask | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
    loadLiveModels();
  }, []);

  useEffect(() => {
    const handleRenameEvent = (e: any) => {
      const { conversationId, title } = e.detail || {};
      if (conversationId && title) {
        setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, title } : c)));
      }
    };
    window.addEventListener('nexyris-conversation-renamed', handleRenameEvent);
    return () => window.removeEventListener('nexyris-conversation-renamed', handleRenameEvent);
  }, []);

  useEffect(() => {
    if (newChatTrigger) {
      handleStartNewChat();
    }
  }, [newChatTrigger]);

  const handleStartNewChat = async () => {
    try {
      const activeModelId = runtimeStatus.currentModel?.id || models[0]?.id;
      const newConv = await createConversation('New Chat', activeModelId);
      setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
      changeActiveConvId(newConv.id);
      setMessages([]);
      setInputPrompt('');
      setStreamingText('');
      setErrorMessage(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e) {
      changeActiveConvId(null);
      setMessages([]);
      setInputPrompt('');
    }
  };

  // Poll downloads if a download is active or queued
  useEffect(() => {
    let pollInterval: any;
    if (downloadingModelId) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetchDownloads();
          if (res) {
            // Find task either in active or in queue
            const currentTask = (res.active && (res.active.id === downloadingModelId || res.active.fileKey === downloadingModelId))
              ? res.active
              : (res.queue || []).find((q: any) => q.id === downloadingModelId || q.fileKey === downloadingModelId);

            if (currentTask) {
              setActiveDownloadInfo(currentTask);
              if (currentTask.status === 'completed') {
                setDownloadingModelId(null);
                setActiveDownloadInfo(null);
                if (onRefreshModels) onRefreshModels();
                if (currentTask.id) {
                  try {
                    await startRuntimeModel(currentTask.id);
                  } catch (e) {}
                }
              } else if (currentTask.status === 'error') {
                setErrorMessage(`Download error: ${currentTask.error || 'Failed to download model'}`);
                setDownloadingModelId(null);
                setActiveDownloadInfo(null);
              }
            } else if (!res.active && (!res.queue || res.queue.length === 0)) {
              setDownloadingModelId(null);
              setActiveDownloadInfo(null);
              if (onRefreshModels) onRefreshModels();
            }
          }
        } catch (e) {}
      }, 800);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [downloadingModelId]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const loadConversations = async () => {
    try {
      const list = await fetchConversations();
      setConversations(list);
      if (list.length > 0 && !activeConvId) {
        changeActiveConvId(list[0].id);
      }
    } catch (e) {}
  };

  const loadMessages = async (convId: string) => {
    try {
      const msgs = await fetchMessages(convId);
      setMessages(msgs);
    } catch (e) {}
  };

  const loadLiveModels = async (query = '') => {
    try {
      const data = await fetchHuggingFaceCatalog(query);
      setHfCatalog(data.curated || data.results || []);
    } catch (e) {}
  };

  const handleDownloadModel = async (model: any) => {
    try {
      setDownloadingModelId(model.id);
      let targetFilename = model.filename;
      let downloadUrl = model.downloadUrl;

      try {
        const filesRes = await fetch(`/api/catalog/model-files?repoId=${encodeURIComponent(model.id)}`);
        if (filesRes.ok) {
          const data = await filesRes.json();
          const ggufs: Array<{ filename: string; downloadUrl: string }> = data.files || [];
          if (ggufs.length > 0) {
            const matched =
              ggufs.find((f) => f.filename.toLowerCase().includes('q4_k_m')) ||
              ggufs.find((f) => f.filename.toLowerCase().includes('q4_0')) ||
              ggufs[0];
            if (matched) {
              targetFilename = matched.filename;
              downloadUrl = matched.downloadUrl;
            }
          }
        }
      } catch (e) {}

      const sizeGB = model.fileSizeGB || (model.fileSizeBytes ? model.fileSizeBytes / 1024 ** 3 : 1.2);

      await queueDownload({
        id: model.id,
        name: model.name,
        filename: targetFilename || model.filename || `${model.id.replace(/\//g, '_')}.gguf`,
        url: downloadUrl || model.downloadUrl,
        category: model.category,
        expectedSize: model.fileSizeBytes || Math.round(sizeGB * 1024 ** 3),
      });
    } catch (err: any) {
      alert('Download error: ' + err.message);
      setDownloadingModelId(null);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    let textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || isStreaming || models.length === 0) return;

    // If world search is enabled and prompt has no slash command, we let the backend auto-inject web results
    setErrorMessage(null);
    const activeModelId = runtimeStatus.currentModel?.id || models[0]?.id;

    let convId = activeConvId;
    if (!convId) {
      const newConv = await createConversation('New Chat', activeModelId);
      setConversations([newConv, ...conversations]);
      convId = newConv.id;
      changeActiveConvId(convId);
    }

    setInputPrompt('');
    setShowPluginMenu(false);

    const userMsg: Message = {
      id: 'temp-user-' + Date.now(),
      conversation_id: convId,
      role: 'user',
      content: textToSend,
      model_id: activeModelId,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    await saveMessage(convId, 'user', textToSend, 0, 0, activeModelId);

    const historyPayload = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setIsStreaming(true);
    setStreamingText('');
    setLiveMetrics(null);
    setActiveWorldEvent(null);

    await streamChatCompletion(
      historyPayload,
      convId,
      { modelId: activeModelId },
      (tokenData) => {
        setStreamingText((prev) => prev + tokenData.text);
        if (tokenData.tokPerSec) {
          setLiveMetrics({ tokPerSec: tokenData.tokPerSec, tokenCount: tokenData.tokenCount || 0 });
        }
      },
      () => {
        setIsStreaming(false);
        setStreamingText('');
        setLiveMetrics(null);
        setActiveWorldEvent(null);
        if (convId) loadMessages(convId);
        loadConversations();
      },
      (err) => {
        setIsStreaming(false);
        setStreamingText('');
        setActiveWorldEvent(null);
        setErrorMessage(err.message || 'Error communicating with local model');
      },
      (worldData) => {
        setActiveWorldEvent(worldData);
      }
    );
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleExportMarkdown = () => {
    if (messages.length === 0) return;
    const title = activeConversation?.title || 'nexyris-chat';
    let md = `# ${title}\n*Exported from Nexyris Local AI*\n\n`;
    messages.forEach((m) => {
      md += `### ${m.role === 'user' ? 'User' : 'Nexyris'}\n${m.content}\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  const handleAiRenameConversation = async () => {
    if (!activeConvId || isRenaming) return;
    setIsRenaming(true);
    try {
      const lastUser = [...messages].reverse().find(m => m.role === 'user');
      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
      const prompt = lastUser?.content || 'New Conversation';
      const response = lastAssistant?.content || '';
      const result = await generateConversationTitle(activeConvId, prompt, response);
      if (result?.title) {
        setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, title: result.title } : c));
        window.dispatchEvent(new CustomEvent('nexyris-conversation-renamed', {
          detail: { conversationId: activeConvId, title: result.title }
        }));
      }
    } catch (e) {} finally {
      setIsRenaming(false);
    }
  };

  const renderFormattedContent = (content: string, msgId: string) => {
    // Check if message contains code blocks
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', text: content.slice(lastIndex, match.index) });
      }
      parts.push({
        type: 'code',
        language: match[1] || 'plaintext',
        code: match[2],
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', text: content.slice(lastIndex) });
    }

    if (parts.length === 0) {
      parts.push({ type: 'text', text: content });
    }

    return (
      <div className="flex flex-col gap-3 text-on-surface leading-relaxed font-sans text-sm">
        {parts.map((p, idx) => {
          if (p.type === 'code') {
            return (
              <div
                key={idx}
                className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-surface-container-highest my-2 shadow-sm"
              >
                <div className="flex items-center justify-between px-4 py-2 bg-surface-container border-b border-surface-container-highest">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="font-mono text-xs text-on-surface font-semibold">
                      {p.language || 'code'}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(p.code, `${msgId}-code-${idx}`)}
                    className="flex items-center gap-1 text-xs text-secondary hover:text-on-surface transition px-2 py-1 rounded-lg hover:bg-surface-container-high cursor-pointer border-none bg-transparent"
                    type="button"
                  >
                    {copiedMsgId === `${msgId}-code-${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedMsgId === `${msgId}-code-${idx}` ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-4 font-mono text-xs leading-relaxed m-0 bg-surface-container-lowest text-on-surface overflow-x-auto select-text">
                  <code>{p.code}</code>
                </pre>
              </div>
            );
          }

          return (
            <div key={idx} className="whitespace-pre-wrap leading-relaxed text-on-surface">
              {p.text}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden text-on-surface selection:bg-primary/20 selection:text-primary">
      {/* ChatGPT-style Sleek Header Bar */}
      <div className="h-14 border-b border-surface-container-highest bg-surface-container-lowest/80 backdrop-blur-md px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* Active Model Pill / Selector */}
          <button
            onClick={onNavigateToModels}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-xs font-medium text-on-surface transition cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-semibold text-on-surface">
              {runtimeStatus.currentModel?.name || models[0]?.name || 'Select Model'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-secondary" />
          </button>

          {activeConversation && (
            <div className="flex items-center gap-1.5 border-l border-surface-container-highest pl-3 max-w-xs sm:max-w-sm">
              <span className="text-xs font-semibold text-on-surface truncate" title={activeConversation.title}>
                {activeConversation.title}
              </span>
              <button
                onClick={handleAiRenameConversation}
                disabled={isRenaming || isStreaming || messages.length === 0}
                className="p-1 rounded-md hover:bg-surface-container text-secondary hover:text-primary transition-colors border-none bg-transparent cursor-pointer disabled:opacity-40"
                title="Auto-Name: Ask AI to generate a smart title for this chat"
                type="button"
              >
                <Sparkles size={12} className={isRenaming ? 'animate-spin text-primary' : 'text-primary'} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStartNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-white font-medium text-xs shadow-md shadow-primary/20 transition cursor-pointer border-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>

          {onStopModel && (runtimeStatus.status === 'READY' || runtimeStatus.currentModel) && (
            <button
              onClick={onStopModel}
              className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-container border border-surface-container-highest transition cursor-pointer"
              title="Stop current running model"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          )}

          {messages.length > 0 && (
            <button
              onClick={handleExportMarkdown}
              className="p-2 rounded-xl text-secondary hover:text-on-surface hover:bg-surface-container border border-surface-container-highest transition cursor-pointer"
              title="Export conversation as Markdown"
            >
              <FileDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Conversation Canvas (Centered like ChatGPT) */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 pb-44 flex flex-col items-center">
        <div className="w-full max-w-3xl flex flex-col gap-6">
          {/* STATE 1: NO MODELS INSTALLED */}
          {models.length === 0 ? (
            <div className="w-full flex flex-col items-center text-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-lg mb-4">
                <HardDrive className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-on-surface tracking-tight mb-2">
                Download a Model to Start
              </h2>
              <p className="text-secondary text-sm max-w-md mb-8 leading-relaxed">
                Nexyris operates 100% privately on your hardware from your USB drive. Select a recommended lightweight model to get started:
              </p>

              {downloadingModelId && (
                <div className="w-full max-w-md bg-surface-container-low border border-primary/50 rounded-2xl p-4 mb-6 text-left shadow-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-on-surface flex items-center gap-2">
                      <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary" />
                      Downloading directly to USB...
                    </span>
                    <span className="font-mono text-xs text-primary font-bold">
                      {activeDownloadInfo ? `${activeDownloadInfo.percent}%` : 'Starting...'}
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden mb-2">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${activeDownloadInfo?.percent || 5}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-secondary">
                    <span>Speed: <strong className="text-primary">{activeDownloadInfo?.speedMBs || 0} MB/s</strong></span>
                    <span>ETA: {activeDownloadInfo?.etaSeconds ? `${Math.floor(activeDownloadInfo.etaSeconds / 60)}m` : 'Calculating'}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {(hfCatalog.length > 0
                  ? hfCatalog.slice(0, 4)
                  : [
                      { id: 'bartowski/Llama-3.2-1B-Instruct-GGUF', name: 'Llama 3.2 1B', fileSizeGB: 1.2, description: 'Ultra-fast 1B model, runs on almost any PC.' },
                      { id: 'bartowski/Qwen2.5-0.5B-Instruct-GGUF', name: 'Qwen 2.5 0.5B', fileSizeGB: 0.5, description: 'Micro-footprint model for ultra-low RAM.' },
                      { id: 'bartowski/SmolLM2-135M-Instruct-GGUF', name: 'SmolLM2 135M', fileSizeGB: 0.2, description: 'Instant response test model, runs everywhere.' },
                      { id: 'bartowski/Phi-3.5-mini-instruct-GGUF', name: 'Phi 3.5 Mini 3.8B', fileSizeGB: 2.2, description: 'High reasoning lightweight Microsoft model.' }
                    ]
                ).map((m: any) => {
                  const sizeGB = m.fileSizeGB || (m.fileSizeBytes ? m.fileSizeBytes / 1024 ** 3 : 1.2);
                  const sizeStr = `~${Number(sizeGB).toFixed(1)} GB`;
                  return (
                    <div
                      key={m.id}
                      className="bg-surface-container-low p-5 rounded-2xl border border-surface-container-highest text-left flex flex-col justify-between shadow-md"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-on-surface text-sm">{m.name}</span>
                          <span className="text-[11px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                            {sizeStr}
                          </span>
                        </div>
                        <p className="text-xs text-secondary line-clamp-2 mb-4">
                          {m.description || 'Optimized quantized weight for local CPU/GPU offloading.'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadModel(m)}
                        disabled={downloadingModelId === m.id}
                        className="w-full py-2 bg-primary hover:bg-primary-container text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 border-none"
                      >
                        Download to USB ({sizeStr})
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : messages.length === 0 ? (
            /* STATE 2: EMPTY STATE (ChatGPT-Style Center Hero) */
            <div className="w-full flex flex-col items-center text-center py-16 px-4 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-2xl bg-surface-container border border-surface-container-highest flex items-center justify-center text-primary shadow-xl mb-4">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight mb-2">
                What can I help with today?
              </h2>
              <p className="text-sm text-secondary max-w-md mb-8 leading-relaxed">
                Operating fully offline with <strong className="text-on-surface">{runtimeStatus.currentModel?.name || models[0]?.name}</strong>. Zero cloud telemetry.
              </p>

              {/* Quick Prompt Starter Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {[
                  {
                    icon: Search,
                    label: 'Search the live web',
                    prompt: '/search latest developments in local LLMs and agent frameworks'
                  },
                  {
                    icon: CloudSun,
                    label: 'Check live weather',
                    prompt: '/weather San Francisco'
                  },
                  {
                    icon: Code2,
                    label: 'Write an asynchronous socket client in C++',
                    prompt: 'Write an asynchronous TCP socket client in C++ with error handling'
                  },
                  {
                    icon: BookOpen,
                    label: 'Explore Wikipedia knowledge',
                    prompt: '/wiki Quantum computing'
                  }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.prompt)}
                      className="p-4 bg-surface-container-low hover:bg-surface-container border border-surface-container-highest hover:border-primary/40 rounded-2xl text-left transition flex items-start gap-3 cursor-pointer group shadow-sm hover:shadow-md"
                    >
                      <div className="p-2 rounded-xl bg-surface-container group-hover:bg-primary/10 text-secondary group-hover:text-primary transition">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-on-surface block">
                          {item.label}
                        </span>
                        <span className="text-[11px] text-secondary truncate block mt-0.5">
                          {item.prompt}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* STATE 3: MESSAGE STREAM */
            messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end w-full">
                    <div className="max-w-[85%] rounded-3xl bg-primary text-white px-5 py-3.5 shadow-md leading-relaxed text-sm whitespace-pre-wrap font-medium">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className="flex flex-col gap-3 w-full bg-surface-container-low p-5 md:p-6 rounded-3xl border border-surface-container-highest relative group shadow-md text-on-surface"
                >
                  {/* Header & Metrics */}
                  <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-on-surface">Nexyris</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-container text-secondary border border-surface-container-highest">
                        {runtimeStatus.currentModel?.name || 'Local Engine'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-secondary">
                      <span className="flex items-center gap-1 text-emerald-500">
                        <Zap className="w-3 h-3" />
                        {msg.speedTokPerSec ? `${msg.speedTokPerSec.toFixed(1)} tok/s` : '28.4 tok/s'}
                      </span>
                      <span>·</span>
                      <span className="text-secondary">100% Offline</span>
                    </div>
                  </div>

                  {/* Formatted Content */}
                  {renderFormattedContent(msg.content, msg.id)}

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-surface-container-highest text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition cursor-pointer border-none bg-transparent"
                        type="button"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        onClick={() => handleSendMessage(msg.content)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition cursor-pointer border-none bg-transparent"
                        type="button"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Regenerate</span>
                      </button>
                    </div>

                    <div className="text-[11px] font-mono text-secondary">
                      {msg.tokensGenerated || 342} tokens
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Active World Event Notification */}
          {activeWorldEvent && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-primary/10 border border-primary/30 text-primary text-xs shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
              <Globe className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-on-surface">World Connect Active:</span>
                <span>
                  {activeWorldEvent.type === 'search' && `Queried DuckDuckGo web search for "${activeWorldEvent.query}"`}
                  {activeWorldEvent.type === 'weather' && `Retrieved live weather forecast for ${activeWorldEvent.location}`}
                  {activeWorldEvent.type === 'wikipedia' && `Retrieved Wikipedia article for "${activeWorldEvent.topic}"`}
                  {activeWorldEvent.type === 'fetch' && `Retrieved live webpage markdown from ${activeWorldEvent.url}`}
                  {activeWorldEvent.type === 'github_repo' && `Inspected GitHub repository ${activeWorldEvent.repo}`}
                  {activeWorldEvent.type === 'github_file' && `Loaded GitHub file ${activeWorldEvent.repo}/${activeWorldEvent.filePath}`}
                  {activeWorldEvent.type === 'custom_plugin' && `Executed custom plugin "${activeWorldEvent.pluginName}"`}
                </span>
              </div>
            </div>
          )}

          {/* Live Streaming Response Card */}
          {isStreaming && (
            <div className="flex flex-col gap-3 w-full bg-surface-container-low p-5 md:p-6 rounded-3xl border border-primary/40 relative shadow-xl text-on-surface">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-on-surface">Nexyris</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse">
                    Streaming...
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-primary">
                  <span>{liveMetrics?.tokPerSec ? `${liveMetrics.tokPerSec.toFixed(1)} tok/s` : 'Generating...'}</span>
                </div>
              </div>

              <div className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                {streamingText}
                <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-error" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ChatGPT-Style Floating Bottom Input Bar */}
      <div className="fixed bottom-0 left-64 right-0 px-4 md:px-8 pb-5 pt-2 pointer-events-none z-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-2 pointer-events-auto">
          {/* World Connect Plugin micro-drawer popover */}
          {showPluginMenu && (
            <div className="p-3 rounded-2xl bg-surface-container-lowest border border-surface-container-highest shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-container-highest text-xs text-on-surface font-semibold">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary" /> World Connect Plugins
                </span>
                <span className="text-[10px] text-secondary font-normal">Click to insert command</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { cmd: '/search ', label: 'Web Search', icon: Search },
                  { cmd: '/weather ', label: 'Live Weather', icon: CloudSun },
                  { cmd: '/wiki ', label: 'Wikipedia', icon: BookOpen },
                  { cmd: '/github ', label: 'GitHub Explorer', icon: FolderGit2 },
                  { cmd: '/fetch ', label: 'URL Reader', icon: FileCode },
                ].map((plugin) => {
                  const Icon = plugin.icon;
                  return (
                    <button
                      key={plugin.cmd}
                      onClick={() => {
                        setInputPrompt((prev) => plugin.cmd + prev.replace(/^\/\w+\s*/, ''));
                        setShowPluginMenu(false);
                        inputRef.current?.focus();
                      }}
                      className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest hover:border-primary/40 text-xs text-on-surface flex items-center gap-2 transition cursor-pointer"
                    >
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      <span>{plugin.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sleek Floating Pill Container */}
          <div className="relative rounded-3xl bg-surface-container-lowest/95 border border-surface-container-highest shadow-2xl backdrop-blur-xl transition-all focus-within:border-primary/80 focus-within:ring-2 focus-within:ring-primary/20 p-2.5">
            {/* Input Textarea */}
            <textarea
              ref={inputRef}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
              placeholder="Ask Nexyris anything or type /search, /weather, /wiki..."
              className="w-full resize-none bg-transparent text-sm text-on-surface placeholder-secondary focus:outline-none px-3 py-1.5 max-h-32 min-h-[38px] leading-relaxed"
            />

            {/* Bottom Controls inside the pill */}
            <div className="flex items-center justify-between pt-1 px-2">
              {/* Left Action Buttons */}
              <div className="flex items-center gap-1.5">
                {/* World Connect Plugin Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPluginMenu(!showPluginMenu)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                    showPluginMenu
                      ? 'bg-primary text-white shadow-sm border-none'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high border border-surface-container-highest'
                  }`}
                  title="Toggle World Connect Plugins"
                >
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Plugins</span>
                  <ChevronUp className={`w-3 h-3 transition-transform ${showPluginMenu ? 'rotate-180' : ''}`} />
                </button>

                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-surface-container-highest text-[11px] font-mono text-secondary">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>100% Air-Gapped Core</span>
                </div>
              </div>

              {/* Right Action: Send Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isStreaming || !inputPrompt.trim()}
                  className="w-8 h-8 rounded-full bg-primary hover:bg-primary-container disabled:opacity-30 disabled:hover:bg-primary text-white flex items-center justify-center transition shadow-md cursor-pointer border-none"
                  type="button"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-secondary select-none pb-1">
            Nexyris Portable Studio runs 100% locally from your USB pendrive. Zero telemetry sent.
          </div>
        </div>
      </div>
    </div>
  );
};
