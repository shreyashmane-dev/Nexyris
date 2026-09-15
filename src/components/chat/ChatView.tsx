import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowUp,
  Square, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Bot, 
  User, 
  Sparkles,
  Zap,
  Search,
  AlertTriangle,
  Download,
  MessageSquare,
  X,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Edit2,
  RefreshCw,
  Cpu,
  Layers,
  Code2,
  Lightbulb,
  Terminal,
  ShieldCheck,
  Play
} from 'lucide-react';
import { Conversation, Message, ModelItem, RuntimeStatus, DownloadTask } from '../../types';
import { 
  fetchConversations, 
  createConversation, 
  fetchMessages, 
  saveMessage, 
  deleteConversation,
  updateConversation,
  streamChatCompletion,
  fetchHuggingFaceCatalog,
  queueDownload,
  fetchDownloads,
  startRuntimeModel,
  stopRuntimeModel
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
  onStopModel,
  onRefreshModels
}) => {
  // Navigation & History State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [liveMetrics, setLiveMetrics] = useState<{ tokPerSec: number; tokenCount: number } | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ChatGPT Model Dropdown
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Online Hugging Face Discovery & Search State
  const [hfCatalog, setHfCatalog] = useState<ModelItem[]>([]);
  const [isSearchingHf, setIsSearchingHf] = useState(false);
  const [hfSearchQuery, setHfSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'edge' | 'smart' | 'uncensored'>('all');
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [activeDownloadInfo, setActiveDownloadInfo] = useState<DownloadTask | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize
  useEffect(() => {
    loadConversations();
    loadLiveModels();

    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
              // Auto-launch the newly downloaded model
              if (res.active.id) {
                try {
                  await startRuntimeModel(res.active.id);
                } catch (e) {}
              }
            }
          } else {
            // Check if queue completed
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

  // Load Past Chats
  const loadConversations = async () => {
    try {
      const list = await fetchConversations();
      setConversations(list);
      if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0].id);
      }
    } catch (e) {}
  };

  // Load Messages for a Chat
  const loadMessages = async (convId: string) => {
    try {
      const msgs = await fetchMessages(convId);
      setMessages(msgs);
    } catch (e) {}
  };

  // Fetch Live Models from Hugging Face online
  const loadLiveModels = async (query = '') => {
    setIsSearchingHf(true);
    try {
      const data = await fetchHuggingFaceCatalog(query);
      setHfCatalog(data.curated || data.results || []);
    } catch (e) {
      console.warn('Could not load live Hugging Face catalog:', e);
    } finally {
      setIsSearchingHf(false);
    }
  };

  // Search input debouncer for live Hugging Face search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadLiveModels(hfSearchQuery);
    }, 450);
    return () => clearTimeout(timer);
  }, [hfSearchQuery]);

  // Start New Chat (ChatGPT Style)
  const handleNewChat = async () => {
    try {
      const modelId = runtimeStatus.currentModel?.id || models[0]?.id;
      const newConv = await createConversation('New Chat', modelId);
      setConversations([newConv, ...conversations]);
      setActiveConvId(newConv.id);
      setMessages([]);
      setErrorMessage(null);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (e) {}
  };

  // Rename Conversation Title
  const handleSaveTitle = async (convId: string) => {
    if (!editTitle.trim()) {
      setEditingConvId(null);
      return;
    }
    try {
      await updateConversation(convId, editTitle.trim());
      setConversations(conversations.map(c => c.id === convId ? { ...c, title: editTitle.trim() } : c));
    } catch (e) {}
    setEditingConvId(null);
  };

  // Delete Conversation
  const handleDeleteConv = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      const remaining = conversations.filter(c => c.id !== id);
      setConversations(remaining);
      if (activeConvId === id) {
        setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (e) {}
  };

  // 1-Click Online Model Download & Launch
  const handleDownloadAndStart = async (model: any) => {
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

  // Send Message
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || isStreaming || models.length === 0) return;

    setErrorMessage(null);
    const activeModelId = runtimeStatus.currentModel?.id || models[0]?.id;

    let convId = activeConvId;
    if (!convId) {
      const newConv = await createConversation(textToSend.slice(0, 30), activeModelId);
      setConversations([newConv, ...conversations]);
      convId = newConv.id;
      setActiveConvId(convId);
    }

    setInputPrompt('');

    // Optimistically append user message
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
        setErrorMessage(err.message || 'Error communicating with local AI model');
      }
    );
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Chronological grouping helper for history (Today, Yesterday, Previous 7 Days, Older)
  const groupConversations = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    const groups: { [key: string]: Conversation[] } = {
      'Today': [],
      'Yesterday': [],
      'Previous 7 Days': [],
      'Older': [],
    };

    const filtered = conversations.filter(c => 
      !historySearch || c.title.toLowerCase().includes(historySearch.toLowerCase())
    );

    filtered.forEach(c => {
      const d = new Date(c.updated_at || c.created_at);
      if (d >= today) {
        groups['Today'].push(c);
      } else if (d >= yesterday) {
        groups['Yesterday'].push(c);
      } else if (d >= last7Days) {
        groups['Previous 7 Days'].push(c);
      } else {
        groups['Older'].push(c);
      }
    });

    return groups;
  };

  const groupedHistory = groupConversations();

  // Filtered live Hugging Face catalog
  const filteredHfModels = hfCatalog.filter(m => {
    if (activeFilter === 'edge') {
      return (m.fileSizeGB && m.fileSizeGB <= 2.2) || m.name.toLowerCase().includes('1b') || m.name.toLowerCase().includes('smollm');
    }
    if (activeFilter === 'smart') {
      return (m.fileSizeGB && m.fileSizeGB > 2.2 && m.fileSizeGB <= 6) || m.name.toLowerCase().includes('qwen') || m.name.toLowerCase().includes('llama');
    }
    if (activeFilter === 'uncensored') {
      return m.label === 'UNCENSORED' || m.name.toLowerCase().includes('uncensored') || m.name.toLowerCase().includes('dolphin') || m.name.toLowerCase().includes('nemo');
    }
    return true;
  });

  const activeModel = runtimeStatus.currentModel || models[0];
  const isModelRunning = runtimeStatus.status === 'READY';

  // ChatGPT Starter Suggestions
  const starterPrompts = [
    { title: "Explain a concept", desc: "How does LLM quantization like Q4_K_M work?", icon: <Lightbulb size={16} color="#fbbf24" /> },
    { title: "Write a script", desc: "Write a Python script to scan and hash local files", icon: <Code2 size={16} color="#34d399" /> },
    { title: "Review & Debug", desc: "Check this TypeScript function for memory leaks", icon: <Terminal size={16} color="#60a5fa" /> },
    { title: "Inspect System", desc: "Show PowerShell commands for disk IO & RAM usage", icon: <Cpu size={16} color="#c084fc" /> },
  ];

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100vh',
      backgroundColor: '#090d16',
      color: '#ececec',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
    }}>
      
      {/* ================================================================= */}
      {/* 1. COLLAPSIBLE CHATGPT SIDEBAR                                    */}
      {/* ================================================================= */}
      <aside style={{
        width: sidebarOpen ? '260px' : '0px',
        minWidth: sidebarOpen ? '260px' : '0px',
        height: '100%',
        backgroundColor: '#0c101c',
        borderRight: sidebarOpen ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        zIndex: 30,
        position: 'relative',
      }}>
        <div style={{ width: '260px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          
          {/* Top Brand & Sidebar Close Button */}
          <div style={{
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '7px',
                background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}>
                <Sparkles size={14} />
              </div>
              <span>Nexyris</span>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              title="Close sidebar"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          {/* "+ New chat" Button (ChatGPT Style) */}
          <div style={{ padding: '0 12px 10px' }}>
            <button
              onClick={handleNewChat}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              <Plus size={16} color="#38bdf8" />
              <span>New chat</span>
            </button>
          </div>

          {/* Search past chats input */}
          <div style={{ padding: '0 12px 10px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(0,0,0,0.35)',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <Search size={13} color="#64748b" />
              <input
                type="text"
                placeholder="Search chats..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '12px',
                  color: '#ececec',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Grouped Conversations List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
            {conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', fontSize: '12px', color: '#64748b' }}>
                No past chats yet.
              </div>
            ) : (
              Object.entries(groupedHistory).map(([groupTitle, convs]) => {
                if (convs.length === 0) return null;
                return (
                  <div key={groupTitle} style={{ marginBottom: '14px' }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748b',
                      padding: '6px 10px 4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                    }}>
                      {groupTitle}
                    </div>

                    {convs.map((conv) => {
                      const isActive = activeConvId === conv.id;
                      const isEditing = editingConvId === conv.id;

                      return (
                        <div
                          key={conv.id}
                          onClick={() => setActiveConvId(conv.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '7px',
                            backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                            color: isActive ? '#fff' : '#cbd5e1',
                            fontSize: '13px',
                            cursor: 'pointer',
                            marginBottom: '2px',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={editTitle}
                              autoFocus
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={() => handleSaveTitle(conv.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle(conv.id);
                                if (e.key === 'Escape') setEditingConvId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #38bdf8',
                                color: '#fff',
                                fontSize: '12.5px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                width: '150px',
                                outline: 'none',
                              }}
                            />
                          ) : (
                            <div style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '170px',
                            }}>
                              {conv.title || 'Untitled Chat'}
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isActive && !isEditing && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingConvId(conv.id);
                                  setEditTitle(conv.title);
                                }}
                                title="Rename chat"
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                              >
                                <Edit2 size={12} />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDeleteConv(e, conv.id)}
                              title="Delete chat"
                              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#fb7185')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer: USB Privacy Note */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '11px',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <ShieldCheck size={14} color="#34d399" />
            <span>100% Offline • Saved on USB</span>
          </div>

        </div>
      </aside>

      {/* ================================================================= */}
      {/* 2. MAIN CHATGPT CONVERSATION VIEWPORT                              */}
      {/* ================================================================= */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#090d16',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Minimalist ChatGPT Top Header */}
        <header style={{
          height: '52px',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          backgroundColor: 'rgba(9, 13, 22, 0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Sidebar toggle button (visible if closed) */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Open sidebar"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <PanelLeftOpen size={18} />
              </button>
            )}

            {!sidebarOpen && (
              <button
                onClick={handleNewChat}
                title="New chat"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Plus size={18} />
              </button>
            )}

            {/* Signature ChatGPT Model Selector Dropdown Pill */}
            <div style={{ position: 'relative' }} ref={modelDropdownRef}>
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
              >
                <div style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isModelRunning ? '#10b981' : models.length > 0 ? '#38bdf8' : '#eab308',
                  boxShadow: isModelRunning ? '0 0 8px #10b981' : 'none',
                }} />
                <span>{activeModel ? activeModel.name : 'Choose AI Model'}</span>
                <ChevronDown size={14} color="#94a3b8" />
              </button>

              {/* Model Switcher Popover */}
              {modelDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  width: '310px',
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
                  padding: '8px',
                  zIndex: 100,
                }}>
                  <div style={{ padding: '6px 8px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Installed on USB Drive ({models.length})
                  </div>

                  <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {models.length === 0 ? (
                      <div style={{ padding: '12px 8px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                        No models installed yet. Pick one below to download!
                      </div>
                    ) : (
                      models.map((m) => {
                        const isSelected = runtimeStatus.currentModel?.id === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              onSelectModel(m.id);
                              setModelDropdownOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                              border: isSelected ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                              color: isSelected ? '#38bdf8' : '#f8fafc',
                              fontSize: '12.5px',
                              cursor: 'pointer',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>{m.name}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {m.sizeGB ? `${m.sizeGB} GB` : ''} • {m.quantization || 'Q4_K_M'}
                              </div>
                            </div>
                            {isSelected && <Check size={14} color="#38bdf8" />}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', marginTop: '6px', paddingTop: '6px' }}>
                    {onNavigateToModels && (
                      <button
                        onClick={() => {
                          setModelDropdownOpen(false);
                          onNavigateToModels();
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          background: 'transparent',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <Download size={13} />
                        <span>Browse Model Library</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Header Action: Stop Engine or Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isModelRunning && onStopModel && (
              <button
                onClick={onStopModel}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fb7185',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Square size={11} fill="#fb7185" />
                <span>Stop Engine</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Center Viewport (ChatGPT 768px Column) */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ maxWidth: '768px', width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>

            {/* ======================================================= */}
            {/* STATE 1: NO MODELS INSTALLED -> LIVE ONLINE DISCOVERY    */}
            {/* ======================================================= */}
            {models.length === 0 ? (
              <div style={{
                margin: 'auto',
                width: '100%',
                padding: '20px 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 0 25px rgba(56, 189, 248, 0.3)',
                  marginBottom: '16px',
                }}>
                  <Sparkles size={26} />
                </div>

                <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px', letterSpacing: '-0.3px' }}>
                  Choose an AI Model to Start Chatting
                </h1>
                <p style={{ fontSize: '13.5px', color: '#94a3b8', maxWidth: '520px', lineHeight: 1.5, marginBottom: '20px' }}>
                  Nexyris operates 100% privately on your hardware with zero cloud dependencies. Pick a recommended model or search Hugging Face Hub below.
                </p>

                {/* Active Interactive Download Widget */}
                {downloadingModelId && (
                  <div style={{
                    width: '100%',
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid #38bdf8',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    boxShadow: '0 8px 30px rgba(56, 189, 248, 0.2)',
                    textAlign: 'left',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
                        <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} color="#38bdf8" />
                        <span>Downloading Model Directly to USB...</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                        {activeDownloadInfo ? `${activeDownloadInfo.percent}%` : 'Connecting...'}
                      </span>
                    </div>

                    {/* Glowing Progress Bar */}
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                      <div style={{
                        width: `${activeDownloadInfo?.percent || 5}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #38bdf8 0%, #10b981 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#94a3b8' }}>
                      <span>Speed: <strong style={{ color: '#10b981' }}>{activeDownloadInfo?.speedMBs || 0} MB/s</strong></span>
                      <span>ETA: <strong style={{ color: '#f8fafc' }}>{activeDownloadInfo ? `${Math.floor(activeDownloadInfo.etaSeconds / 60)}m ${activeDownloadInfo.etaSeconds % 60}s` : 'Calculating...'}</strong></span>
                      <span style={{ color: '#38bdf8' }}>Auto-resume enabled</span>
                    </div>
                  </div>
                )}

                {/* Live Online Hugging Face Search Bar */}
                <div style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  marginBottom: '16px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}>
                  {isSearchingHf ? (
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} color="#38bdf8" />
                  ) : (
                    <Search size={16} color="#64748b" />
                  )}
                  <input
                    type="text"
                    placeholder="Search Hugging Face Hub (e.g. 'smollm', 'qwen2.5', 'llama-3.2', 'deepseek')..."
                    value={hfSearchQuery}
                    onChange={(e) => setHfSearchQuery(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#f8fafc',
                      fontSize: '13.5px',
                      width: '100%',
                    }}
                  />
                  {hfSearchQuery && (
                    <button
                      onClick={() => setHfSearchQuery('')}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[
                    { id: 'all', label: 'All Models' },
                    { id: 'edge', label: '⚡ Ultra Fast (1-2B)' },
                    { id: 'smart', label: '🧠 Balanced (3-8B)' },
                    { id: 'uncensored', label: '🔓 Uncensored' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id as any)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: activeFilter === tab.id ? 700 : 500,
                        backgroundColor: activeFilter === tab.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                        border: activeFilter === tab.id ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                        color: activeFilter === tab.id ? '#38bdf8' : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Live Model Cards Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '12px',
                  width: '100%',
                  textAlign: 'left',
                }}>
                  {filteredHfModels.slice(0, 6).map((model) => (
                    <div
                      key={model.id}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.35)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#f8fafc' }}>
                            {model.name}
                          </span>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            backgroundColor: model.label === 'UNCENSORED' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                            color: model.label === 'UNCENSORED' ? '#fb7185' : '#38bdf8',
                          }}>
                            {model.badge || model.label || 'GGUF'}
                          </span>
                        </div>

                        <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4, marginBottom: '10px' }}>
                          {model.description || 'Verified local model for fast CPU/GPU offline execution.'}
                        </p>

                        {/* Hardware Compatibility Tag */}
                        {model.compatibility && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11px',
                            color: model.compatibility.canRun ? '#34d399' : '#fbbf24',
                            marginBottom: '12px',
                          }}>
                            <Check size={12} />
                            <span>{model.compatibility.reason || model.compatibility.accelerationAdvice}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                          Size: <strong style={{ color: '#f8fafc' }}>~{model.fileSizeGB || '1.8'} GB</strong>
                        </span>

                        <button
                          disabled={downloadingModelId !== null}
                          onClick={() => handleDownloadAndStart(model)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            background: downloadingModelId === model.id ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                            color: '#fff',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: downloadingModelId !== null ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Download size={13} />
                          <span>{downloadingModelId === model.id ? 'Queued' : 'Download & Start'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : messages.length === 0 && !streamingText ? (
              /* ======================================================= */
              /* STATE 2: SIGNATURE CHATGPT "What can I help with?"      */
              /* ======================================================= */
              <div style={{
                margin: 'auto',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '40px 0',
              }}>
                <h1 style={{ fontSize: '30px', fontWeight: 700, color: '#f8fafc', marginBottom: '28px', letterSpacing: '-0.3px' }}>
                  What can I help with?
                </h1>

                {/* 2x2 Clean Starter Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px',
                  width: '100%',
                  textAlign: 'left',
                }}>
                  {starterPrompts.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSendMessage(item.desc)}
                      style={{
                        padding: '16px',
                        borderRadius: '14px',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        {item.icon}
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{item.title}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ======================================================= */
              /* STATE 3: ACTIVE CONVERSATION THREAD (ChatGPT Style)     */
              /* ======================================================= */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', paddingBottom: '30px' }}>
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                        width: '100%',
                      }}
                    >
                      {/* Message Bubble Container */}
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        maxWidth: isUser ? '80%' : '100%',
                        alignItems: 'flex-start',
                      }}>
                        {!isUser && (
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}>
                            <Bot size={16} />
                          </div>
                        )}

                        <div style={{
                          padding: isUser ? '12px 18px' : '6px 0',
                          borderRadius: isUser ? '20px' : '0',
                          backgroundColor: isUser ? '#262d3d' : 'transparent',
                          color: '#ececec',
                          fontSize: '14.5px',
                          lineHeight: 1.6,
                        }}>
                          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {msg.content}
                          </div>

                          {/* Assistant Footer Actions */}
                          {!isUser && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              marginTop: '8px',
                              fontSize: '11px',
                              color: '#64748b',
                            }}>
                              <button
                                onClick={() => copyToClipboard(msg.content, msg.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: copiedMsgId === msg.id ? '#10b981' : '#94a3b8',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11.5px',
                                  padding: '2px 4px',
                                }}
                              >
                                {copiedMsgId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                                <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                              </button>

                              {(msg.tokens_per_sec || msg.speed_tok_s) && (
                                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Zap size={11} />
                                  <span>{msg.tokens_per_sec || msg.speed_tok_s} tok/s</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Live Assistant Streaming Response */}
                {isStreaming && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', width: '100%' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}>
                      <Bot size={16} />
                    </div>

                    <div style={{ padding: '6px 0', color: '#ececec', fontSize: '14.5px', lineHeight: 1.6, width: '100%' }}>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {streamingText}
                        <span style={{
                          display: 'inline-block',
                          width: '7px',
                          height: '14px',
                          backgroundColor: '#38bdf8',
                          marginLeft: '4px',
                          verticalAlign: 'middle',
                          animation: 'pulse 1s infinite',
                        }} />
                      </div>

                      {liveMetrics && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginTop: '8px',
                          fontSize: '11px',
                          color: '#10b981',
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Zap size={12} />
                            <span>{liveMetrics.tokPerSec} tok/s</span>
                          </span>
                          <span style={{ color: '#64748b' }}>• {liveMetrics.tokenCount} tokens generated</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. SIGNATURE CHATGPT FLOATING BOTTOM INPUT DOCK                   */}
        {/* ================================================================= */}
        <div style={{
          padding: '12px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: 'rgba(9, 13, 22, 0.95)',
        }}>
          <div style={{ maxWidth: '768px', width: '100%' }}>
            
            {/* Error banner if any */}
            {errorMessage && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fb7185',
                fontSize: '12px',
                marginBottom: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Signature ChatGPT Capsule Input Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              backgroundColor: '#161d2d',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '26px',
              padding: '8px 14px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              transition: 'border-color 0.15s ease',
            }}>
              
              {/* Left Action Button (+) */}
              <button
                onClick={handleNewChat}
                title="New chat"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  marginRight: '8px',
                  marginBottom: '2px',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
              >
                <Plus size={16} />
              </button>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                rows={1}
                disabled={models.length === 0}
                placeholder={models.length === 0 ? "Download a model above to start chatting..." : "Message Nexyris..."}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ececec',
                  fontSize: '14.5px',
                  lineHeight: '22px',
                  resize: 'none',
                  padding: '6px 4px',
                  maxHeight: '160px',
                  fontFamily: 'inherit',
                  cursor: models.length === 0 ? 'not-allowed' : 'text',
                }}
              />

              {/* Right Circular Send / Stop Button */}
              {isStreaming ? (
                <button
                  onClick={() => setIsStreaming(false)}
                  title="Stop generating"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: '#fb7185',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginBottom: '1px',
                  }}
                >
                  <Square size={14} fill="#fff" color="#fff" />
                </button>
              ) : (
                <button
                  onClick={() => handleSendMessage()}
                  disabled={models.length === 0 || !inputPrompt.trim()}
                  title="Send message"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: (models.length > 0 && inputPrompt.trim()) ? '#f8fafc' : 'rgba(255, 255, 255, 0.1)',
                    color: (models.length > 0 && inputPrompt.trim()) ? '#090d16' : '#64748b',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: (models.length > 0 && inputPrompt.trim()) ? 'pointer' : 'not-allowed',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                    marginBottom: '1px',
                  }}
                >
                  <ArrowUp size={18} strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Subtle Centered Disclaimer */}
            <div style={{
              textAlign: 'center',
              fontSize: '11.5px',
              color: '#64748b',
              marginTop: '8px',
            }}>
              Nexyris can make mistakes. Runs 100% locally & privately on your hardware.
            </div>

          </div>
        </div>

      </main>

    </div>
  );
};
