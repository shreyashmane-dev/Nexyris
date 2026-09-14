import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Square, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Bot, 
  User, 
  RotateCcw,
  Sparkles,
  Zap,
  Clock,
  Search
} from 'lucide-react';
import { Conversation, Message, ModelItem, RuntimeStatus } from '../../types';
import { 
  fetchConversations, 
  createConversation, 
  fetchMessages, 
  saveMessage, 
  deleteConversation,
  streamChatCompletion 
} from '../../lib/api';

interface ChatViewProps {
  runtimeStatus: RuntimeStatus;
  onSelectModel: (modelId: string) => void;
  models: ModelItem[];
}

export const ChatView: React.FC<ChatViewProps> = ({ runtimeStatus, onSelectModel, models }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [liveMetrics, setLiveMetrics] = useState<{ tokPerSec: number; tokenCount: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

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

  const handleNewChat = async () => {
    try {
      const modelId = runtimeStatus.currentModel?.id || models[0]?.id;
      const newConv = await createConversation('New Conversation', modelId);
      setConversations([newConv, ...conversations]);
      setActiveConvId(newConv.id);
      setMessages([]);
      if (inputRef.current) inputRef.current.focus();
    } catch (e) {}
  };

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

  const handleSendMessage = async () => {
    if (!inputPrompt.trim() || isStreaming) return;

    let convId = activeConvId;
    if (!convId) {
      const modelId = runtimeStatus.currentModel?.id || models[0]?.id;
      const newConv = await createConversation(inputPrompt.slice(0, 30), modelId);
      setConversations([newConv, ...conversations]);
      convId = newConv.id;
      setActiveConvId(convId);
    }

    const userText = inputPrompt.trim();
    setInputPrompt('');

    // Optimistically add user message
    const userMsg: Message = {
      id: 'temp-user-' + Date.now(),
      conversation_id: convId,
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    await saveMessage(convId, 'user', userText);

    // Prepare history payload for AI
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
      {},
      // onToken
      (tokenData) => {
        setStreamingText(prev => prev + tokenData.text);
        setLiveMetrics({ tokPerSec: tokenData.tokPerSec, tokenCount: tokenData.tokenCount });
      },
      // onDone
      (finalMetrics) => {
        setIsStreaming(false);
        setStreamingText('');
        setLiveMetrics(null);
        if (convId) loadMessages(convId);
        loadConversations();
      },
      // onError
      (err) => {
        setIsStreaming(false);
        setStreamingText('');
        alert('Chat error: ' + err.message);
      }
    );
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const filteredConversations = conversations.filter(c => 
    !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* Left Conversations Sidebar */}
      <div style={{
        width: '260px',
        backgroundColor: 'rgba(11, 16, 28, 0.95)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{ padding: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            className="btn btn-primary"
            onClick={handleNewChat}
            style={{ width: '100%', justifyContent: 'center', padding: '9px 14px' }}
          >
            <Plus size={15} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '6px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <Search size={14} color="#64748b" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                fontSize: '12px',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* List of Chats */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px' }}>
          {filteredConversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 10px', fontSize: '12px', color: 'var(--text-muted)' }}>
              No conversations yet. Start a new chat!
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = activeConvId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                    color: isActive ? '#60a5fa' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    marginBottom: '3px',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                    {conv.title || 'Untitled Conversation'}
                  </div>
                  <button
                    onClick={(e) => handleDeleteConv(e, conv.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Thread */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)' }}>
        {/* Messages Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {messages.length === 0 && !streamingText ? (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                color: '#60a5fa',
              }}>
                <Bot size={30} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Nexyris Portable AI Chat
              </h2>
              <p style={{ fontSize: '13.5px', maxWidth: '420px', lineHeight: 1.5, marginBottom: '20px' }}>
                Your model is running completely offline. Ask anything, brainstorm code, or analyze technical problems.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                {['Explain binary search in TypeScript', 'How does recursion work?', 'Generate a script to monitor disk space'].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInputPrompt(prompt)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: isUser ? '75%' : '100%',
                    }}
                  >
                    {!isUser && (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: 'white',
                      }}>
                        <Bot size={18} />
                      </div>
                    )}

                    <div style={{
                      backgroundColor: isUser ? '#2563eb' : 'var(--bg-card)',
                      border: isUser ? 'none' : '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '14px 18px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      position: 'relative',
                    }}>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.content}
                      </div>

                      {/* Assistant footer with metrics & copy */}
                      {!isUser && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '10px',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(255,255,255,0.08)',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {msg.tokens_per_sec ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                                <Zap size={11} />
                                <span>{msg.tokens_per_sec} tok/s</span>
                              </span>
                            ) : null}
                            {msg.token_count ? <span>{msg.token_count} tokens</span> : null}
                          </div>

                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            {copiedMsgId === msg.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                            <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: 'var(--text-secondary)',
                      }}>
                        <User size={18} />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Active Streaming Response */}
              {isStreaming && (
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'white',
                  }}>
                    <Bot size={18} />
                  </div>

                  <div style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '14px 18px',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    flex: 1,
                  }}>
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {streamingText}
                      <span className="pulse-dot" style={{ display: 'inline-block', width: '7px', height: '14px', backgroundColor: '#3b82f6', marginLeft: '3px', verticalAlign: 'middle' }}></span>
                    </div>

                    {liveMetrics && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '11px',
                        color: '#10b981',
                        fontWeight: 600,
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Zap size={12} />
                          <span>{liveMetrics.tokPerSec} tokens/sec</span>
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {liveMetrics.tokenCount} tokens
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Box Bottom Bar */}
        <div style={{
          padding: '16px 32px 20px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(14, 20, 36, 0.85)',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            maxWidth: '820px',
            margin: '0 auto',
            position: 'relative',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '6px 12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
            }}>
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Ask anything... (Ctrl + Enter to send)"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  resize: 'none',
                  padding: '8px',
                  maxHeight: '120px',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />

              {isStreaming ? (
                <button
                  className="btn btn-danger"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => setIsStreaming(false)}
                >
                  <Square size={12} fill="#f87171" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleSendMessage}
                  disabled={!inputPrompt.trim()}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    opacity: inputPrompt.trim() ? 1 : 0.4,
                  }}
                >
                  <Send size={14} />
                  <span>Send</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>
                Model: <strong>{runtimeStatus.currentModel?.name || 'Local AI Engine'}</strong>
              </span>
              <span>100% Offline • Running directly from USB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
