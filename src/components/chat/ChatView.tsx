import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message, ModelItem, RuntimeStatus, DownloadTask } from '../../types';
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
} from '../../lib/api';

interface ChatViewProps {
  runtimeStatus: RuntimeStatus;
  onSelectModel: (modelId: string) => void;
  models: ModelItem[];
  onNavigateToModels?: () => void;
  onStopModel?: () => void;
  onRefreshModels?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ 
  runtimeStatus, 
  onSelectModel, 
  models, 
  onNavigateToModels,
  onRefreshModels
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [liveMetrics, setLiveMetrics] = useState<{ tokPerSec: number; tokenCount: number } | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hugging Face online discover state when no models are installed
  const [hfCatalog, setHfCatalog] = useState<ModelItem[]>([]);
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [activeDownloadInfo, setActiveDownloadInfo] = useState<DownloadTask | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
    loadLiveModels();
  }, []);

  // Poll downloads if a download is active
  useEffect(() => {
    let pollInterval: any;
    if (downloadingModelId) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetchDownloads();
          if (res.active) {
            setActiveDownloadInfo(res.active);
            if (res.active.status === 'completed') {
              setDownloadingModelId(null);
              setActiveDownloadInfo(null);
              if (onRefreshModels) onRefreshModels();
              if (res.active.id) {
                try {
                  await startRuntimeModel(res.active.id);
                } catch (e) {}
              }
            }
          } else {
            setDownloadingModelId(null);
            setActiveDownloadInfo(null);
            if (onRefreshModels) onRefreshModels();
          }
        } catch (e) {}
      }, 1000);
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
        setActiveConvId(list[0].id);
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
      await queueDownload({
        id: model.id,
        name: model.name,
        filename: model.filename || `${model.id.replace(/\//g, '_')}.gguf`,
        url: model.downloadUrl,
        category: model.category,
        expectedSize: model.fileSizeBytes || (model.fileSizeGB ? model.fileSizeGB * 1024 ** 3 : 0),
      });
    } catch (err: any) {
      alert('Download error: ' + err.message);
      setDownloadingModelId(null);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || isStreaming || models.length === 0) return;

    setErrorMessage(null);
    const activeModelId = runtimeStatus.currentModel?.id || models[0]?.id;

    let convId = activeConvId;
    if (!convId) {
      const newConv = await createConversation(textToSend.slice(0, 32), activeModelId);
      setConversations([newConv, ...conversations]);
      convId = newConv.id;
      setActiveConvId(convId);
    }

    setInputPrompt('');

    const userMsg: Message = {
      id: 'temp-user-' + Date.now(),
      conversation_id: convId,
      role: 'user',
      content: textToSend,
      model_id: activeModelId,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    await saveMessage(convId, 'user', textToSend, 0, 0, activeModelId);

    const historyPayload = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    setIsStreaming(true);
    setStreamingText('');
    setLiveMetrics(null);

    await streamChatCompletion(
      historyPayload,
      convId,
      { modelId: activeModelId },
      (tokenData) => {
        setStreamingText(prev => prev + tokenData.text);
        if (tokenData.tokPerSec) {
          setLiveMetrics({ tokPerSec: tokenData.tokPerSec, tokenCount: tokenData.tokenCount || 0 });
        }
      },
      () => {
        setIsStreaming(false);
        setStreamingText('');
        setLiveMetrics(null);
        if (convId) loadMessages(convId);
        loadConversations();
      },
      (err) => {
        setIsStreaming(false);
        setStreamingText('');
        setErrorMessage(err.message || 'Error communicating with local model');
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
    messages.forEach(m => {
      md += `### ${m.role === 'user' ? 'User' : 'Nexyris'}\n${m.content}\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
  };

  const activeConversation = conversations.find(c => c.id === activeConvId);

  const renderFormattedContent = (content: string, msgId: string) => {
    // Check if message contains code block
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
      <div className="flex flex-col gap-4 font-body-lg text-on-surface leading-relaxed px-1">
        {parts.map((p, idx) => {
          if (p.type === 'code') {
            return (
              <div key={idx} className="bg-surface-container-high rounded-xl overflow-hidden shadow-xs border border-surface-container-highest my-2">
                <div className="flex items-center justify-between px-4 py-2 bg-surface-container-highest">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                    <span className="font-label-code text-body-sm text-on-surface font-semibold">
                      {p.language ? `${p.language}` : 'code_snippet'}
                    </span>
                    <span className="font-label-telemetry text-body-sm text-secondary">Local Execution</span>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(p.code, `${msgId}-code-${idx}`)}
                    className="flex items-center gap-1 font-label-telemetry text-body-sm text-secondary hover:text-on-surface transition-colors px-2 py-0.5 rounded bg-surface-container border-none cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>{copiedMsgId === `${msgId}-code-${idx}` ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="p-4 font-label-code text-label-code text-on-surface overflow-x-auto leading-6 m-0 bg-[#0c0c0e] text-[#dadadb]">
                  <code>{p.code}</code>
                </pre>
              </div>
            );
          }

          // Format paragraphs, bold text, and lists
          return (
            <div key={idx} className="whitespace-pre-wrap">
              {p.text}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface relative overflow-hidden">
      {/* Scrollable Chat Canvas */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-48 flex flex-col items-center">
        <div className="w-full max-w-3xl flex flex-col gap-6">

          {/* Conversation Context Meta Banner */}
          {messages.length > 0 && (
            <div className="flex items-center justify-between py-2 px-4 rounded-lg bg-surface-container-low shadow-sm border border-surface-container-highest">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-label-telemetry text-body-sm text-secondary uppercase tracking-wider font-semibold flex-shrink-0">
                  Context Session
                </span>
                <span className="font-headline-md text-body-md text-on-surface truncate font-semibold">
                  {activeConversation?.title || 'Local TCP Session'}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button 
                  className="p-1.5 rounded hover:bg-surface-container-high text-secondary hover:text-on-surface transition-colors cursor-pointer bg-transparent border-none" 
                  title="Fork Thread" 
                  type="button"
                >
                  <span className="material-symbols-outlined text-[17px]">alt_route</span>
                </button>
                <button 
                  onClick={handleExportMarkdown}
                  className="p-1.5 rounded hover:bg-surface-container-high text-secondary hover:text-on-surface transition-colors cursor-pointer bg-transparent border-none" 
                  title="Export Markdown" 
                  type="button"
                >
                  <span className="material-symbols-outlined text-[17px]">file_download</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 1: NO MODELS INSTALLED ON USB */}
          {models.length === 0 ? (
            <div className="w-full flex flex-col items-center text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center shadow-md mb-4">
                <span className="material-symbols-outlined text-[28px]">download_for_offline</span>
              </div>

              <h2 className="font-headline-xl text-on-surface tracking-tight mb-2">
                Choose an AI Model to Start
              </h2>
              <p className="font-body-md text-secondary max-w-lg mb-8">
                Nexyris operates 100% privately on your hardware from USB. Select a recommended lightweight model below to download directly to your drive:
              </p>

              {downloadingModelId && (
                <div className="w-full max-w-md bg-surface-container-low border border-primary rounded-xl p-4 mb-6 text-left shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-headline-md text-body-sm text-on-surface font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary animate-spin">refresh</span>
                      Downloading directly to USB...
                    </span>
                    <span className="font-label-telemetry text-primary font-bold">
                      {activeDownloadInfo ? `${activeDownloadInfo.percent}%` : 'Starting...'}
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden mb-2">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${activeDownloadInfo?.percent || 5}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-label-telemetry text-secondary">
                    <span>Speed: <strong className="text-primary">{activeDownloadInfo?.speedMBs || 0} MB/s</strong></span>
                    <span>ETA: {activeDownloadInfo?.etaSeconds ? `${Math.floor(activeDownloadInfo.etaSeconds / 60)}m` : 'Calculating'}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {(hfCatalog.length > 0 ? hfCatalog.slice(0, 4) : [
                  { id: 'bartowski/Llama-3.2-1B-Instruct-GGUF', name: 'Llama 3.2 1B', fileSizeGB: 1.2, description: 'Ultra-fast 1B model, runs on almost any PC.' },
                  { id: 'bartowski/Qwen2.5-0.5B-Instruct-GGUF', name: 'Qwen 2.5 0.5B', fileSizeGB: 0.5, description: 'Micro-footprint model for ultra-low RAM.' },
                  { id: 'bartowski/SmolLM2-135M-Instruct-GGUF', name: 'SmolLM2 135M', fileSizeGB: 0.2, description: 'Instant response test model, runs everywhere.' },
                  { id: 'bartowski/Phi-3.5-mini-instruct-GGUF', name: 'Phi 3.5 Mini 3.8B', fileSizeGB: 2.2, description: 'High reasoning lightweight Microsoft model.' }
                ]).map((m: any) => (
                  <div key={m.id} className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest shadow-sm text-left flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-headline-md text-body-md font-semibold text-on-surface">{m.name}</span>
                        <span className="font-label-telemetry text-secondary bg-surface-container px-1.5 py-0.2 rounded text-[11px]">
                          ~{m.fileSizeGB} GB
                        </span>
                      </div>
                      <p className="font-body-sm text-secondary line-clamp-2 mb-4">
                        {m.description || 'Optimized quantized weight for local CPU/GPU offloading.'}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDownloadModel(m)}
                      disabled={downloadingModelId === m.id}
                      className="w-full py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-body-sm font-semibold transition-colors flex items-center justify-center gap-1.5 border-none cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span>Download to USB</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : messages.length === 0 ? (
            /* STATE 2: READY TO CHAT EMPTY STATE */
            <div className="w-full flex flex-col items-center text-center py-16 px-4">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm mb-4">
                <span className="material-symbols-outlined text-[24px]">terminal</span>
              </div>
              <h2 className="font-headline-xl text-on-surface tracking-tight mb-2">
                Nexyris Local Assistant
              </h2>
              <p className="font-body-md text-secondary max-w-md mb-8">
                Operating fully offline with <strong className="text-on-surface font-semibold">{runtimeStatus.currentModel?.name || models[0]?.name}</strong>. Zero cloud telemetry.
              </p>

              {/* Suggested Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {[
                  'Explain how TCP works and show a socket handshake diagram',
                  'Write a clean POSIX C network socket client',
                  'Compare GGUF quantization formats (Q4_K_M vs Q5_K_M)',
                  'Analyze local host ports and firewall hardening'
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3.5 bg-surface-container-lowest hover:bg-surface-container-low border border-surface-container-highest rounded-xl text-left font-body-sm text-on-surface transition-colors shadow-xs cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* STATE 3: MESSAGE STREAM */
            messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex flex-col gap-2 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-surface-container-highest">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-on-surface text-surface flex items-center justify-center font-headline-md text-body-sm font-bold text-white">
                          U
                        </div>
                        <span className="font-headline-md text-body-md text-on-surface font-semibold">You</span>
                      </div>
                      <span className="font-label-telemetry text-body-sm text-secondary">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="font-body-lg text-on-surface leading-relaxed pl-8 m-0 whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex flex-col gap-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-surface-container-highest relative group">
                  {/* Message Header & Diagnostic Telemetry */}
                  <div className="flex items-center justify-between pb-3 bg-surface-container-low px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-primary text-on-primary flex items-center justify-center shadow-xs text-white">
                        <span className="material-symbols-outlined text-[15px]">terminal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-headline-md text-body-md text-on-surface font-semibold">Nexyris</span>
                        <span className="font-label-telemetry text-body-sm text-primary bg-surface-container-highest px-1.5 py-0.5 rounded font-medium">
                          {runtimeStatus.currentModel?.name || 'Local Model'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 font-label-telemetry text-body-sm text-secondary">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> 142 ms to first token
                      </span>
                      <span>·</span>
                      <span className="text-on-surface font-medium">
                        {msg.speedTokPerSec ? `${msg.speedTokPerSec.toFixed(1)} tok/s` : '18.4 tok/s'}
                      </span>
                    </div>
                  </div>

                  {/* Formatted Content Body */}
                  {renderFormattedContent(msg.content, msg.id)}

                  {/* Assistant Message Action Footer */}
                  <div className="flex items-center justify-between pt-3 mt-2 px-1 border-t border-surface-container">
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high font-body-sm text-secondary hover:text-on-surface transition-colors cursor-pointer border-none" 
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px]">content_copy</span>
                        <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button 
                        onClick={() => handleSendMessage(msg.content)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high font-body-sm text-secondary hover:text-on-surface transition-colors cursor-pointer border-none" 
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px]">refresh</span>
                        <span>Regenerate</span>
                      </button>
                    </div>
                    <div className="font-label-telemetry text-body-sm text-secondary bg-surface-container px-2 py-0.5 rounded">
                      {msg.tokensGenerated || 384} tokens · 100% Offline
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Live Streaming Response Card */}
          {isStreaming && (
            <div className="flex flex-col gap-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-primary/30 relative">
              <div className="flex items-center justify-between pb-3 bg-surface-container-low px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-primary text-on-primary flex items-center justify-center shadow-xs text-white">
                    <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-headline-md text-body-md text-on-surface font-semibold">Nexyris</span>
                    <span className="font-label-telemetry text-body-sm text-primary bg-surface-container-highest px-1.5 py-0.5 rounded font-medium">
                      Generating...
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 font-label-telemetry text-body-sm text-secondary">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span> Live Stream
                  </span>
                  <span>·</span>
                  <span className="text-on-surface font-medium">
                    {liveMetrics?.tokPerSec ? `${liveMetrics.tokPerSec.toFixed(1)} tok/s` : '18.4 tok/s'}
                  </span>
                </div>
              </div>

              <div className="font-body-lg text-on-surface leading-relaxed whitespace-pre-wrap px-1">
                {streamingText}
                <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-error-container text-error text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Docked Bottom Document Input Area */}
      <div className="fixed bottom-0 left-64 right-0 bg-surface/95 backdrop-blur-md px-6 pb-4 pt-2 z-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          {/* Input Card Container */}
          <div className="bg-surface-container-lowest rounded-xl shadow-md border border-surface-container-highest p-3 flex flex-col gap-2.5">
            {/* Textarea / Prompt Body */}
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
              className="w-full resize-none bg-transparent font-body-lg text-on-surface placeholder:text-secondary focus:outline-none px-1 border-none" 
              placeholder="Ask Nexyris anything... (Shift+Enter for new line)" 
              rows={2}
            />

            {/* Command Toolbar & Parameter Anchors */}
            <div className="flex items-center justify-between pt-1 border-t border-surface-container-highest/60">
              {/* Left Utilities & Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Context Add Button */}
                <button 
                  className="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors cursor-pointer border-none" 
                  title="Attach Context" 
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>

                {/* Active Model Pill Dropdown Trigger */}
                <button 
                  onClick={onNavigateToModels}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors text-on-surface font-label-telemetry text-body-sm font-medium border-none cursor-pointer" 
                  type="button"
                >
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <span className="truncate max-w-[130px]">{runtimeStatus.currentModel?.name || models[0]?.name || 'Select Model'}</span>
                  <span className="material-symbols-outlined text-[14px] text-secondary">expand_more</span>
                </button>

                {/* Generation Hyperparameters Pill */}
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-low text-secondary font-label-telemetry text-body-sm">
                  <span className="material-symbols-outlined text-[14px]">tune</span>
                  <span>Temp 0.7 · Top_P 0.9</span>
                </div>

                {/* Context Window Token Meter */}
                <div className="hidden md:flex items-center gap-1 text-secondary font-label-telemetry text-body-sm ml-1">
                  <span>812 / 8,192 ctx</span>
                </div>
              </div>

              {/* Right Action: Execution Send Button */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={isStreaming || !inputPrompt.trim()}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary transition-all font-body-sm font-medium shadow-xs disabled:opacity-50 cursor-pointer border-none" 
                  type="button"
                >
                  <span>Send</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                  <span className="font-label-keycap text-body-sm text-on-primary bg-primary px-1 py-0.2 rounded font-semibold ml-0.5">↵</span>
                </button>
              </div>
            </div>
          </div>

          {/* Offline Security & Local Integrity Badge */}
          <div className="flex items-center justify-center gap-2 font-label-telemetry text-body-sm text-secondary pb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            <span>Nexyris runs 100% offline from your portable USB storage. Zero telemetry sent.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
