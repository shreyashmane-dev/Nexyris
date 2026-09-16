import React, { useState, useEffect } from 'react';
import { AppMode, StorageInfo, Conversation } from '../../types';
import { fetchConversations, createConversation } from '../../lib/api';

interface SidebarProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  storage: StorageInfo | null;
  activeDownloadsCount: number;
  modelsCount?: number;
  onOpenShutdown: () => void;
  onNewChat?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMode,
  onSelectMode,
  storage,
  activeDownloadsCount,
  modelsCount = 4,
  onOpenShutdown,
  onNewChat,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    loadRecentChats();
  }, [currentMode]);

  const loadRecentChats = async () => {
    try {
      const list = await fetchConversations();
      setConversations(list.slice(0, 10));
    } catch (e) {}
  };

  const handleCreateChat = async () => {
    if (onNewChat) {
      onNewChat();
    } else {
      try {
        await createConversation('New Chat');
        onSelectMode('chat');
        loadRecentChats();
      } catch (e) {}
    }
  };

  return (
    <aside className="w-64 h-screen bg-surface-container-low border-r border-surface-container-highest z-40 flex flex-col justify-between overflow-hidden flex-shrink-0 select-none">
      <div className="flex flex-col h-full">
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-surface-container-highest flex-shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelectMode('chat')}>
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center flex-shrink-0 shadow-xs">
              {/* Minimal geometric N mark with crimson red node accent */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="15" height="15" fill="none">
                <path d="M14 34V14L34 34V14" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="34" cy="14" r="3.5" fill="#e11d48" />
                <circle cx="14" cy="34" r="3" fill="#e11d48" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-md text-[13px] tracking-tight text-on-surface leading-none font-semibold">NEXYRIS</span>
              <span className="font-label-telemetry text-[9px] text-primary leading-tight uppercase font-medium">LOCAL v2.4</span>
            </div>
          </div>
          <span className="font-label-telemetry text-secondary text-[10px] px-1.5 py-0.5 rounded bg-surface-container border border-surface-container-highest">
            OFFLINE
          </span>
        </div>

        {/* New Chat CTA Button */}
        <div className="p-3 flex-shrink-0">
          <button 
            onClick={handleCreateChat}
            className="w-full flex items-center justify-between px-3 py-2 bg-surface-container-lowest border border-surface-container-highest rounded-lg shadow-sm hover:border-outline text-left group transition-colors" 
            type="button"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">add</span>
              <span className="font-body-sm text-on-surface font-medium">New Chat</span>
            </div>
            <span className="font-label-keycap text-[10px] text-secondary bg-surface-container-high px-1.5 py-0.5 rounded">Ctrl+N</span>
          </button>
        </div>

        {/* Conversation History List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="px-2 font-label-telemetry text-secondary uppercase text-[10px] tracking-wider">Recent Sessions</span>
            {conversations.length === 0 ? (
              <div className="px-2 py-2 text-[11px] font-label-telemetry text-secondary">
                No conversations yet
              </div>
            ) : (
              conversations.map((c, index) => {
                const isSelected = currentMode === 'chat' && index === 0;
                return (
                  <div 
                    key={c.id} 
                    onClick={() => onSelectMode('chat')}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer group transition-colors ${
                      isSelected ? 'bg-surface-container text-on-surface' : 'hover:bg-surface-container-high text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-1 h-3.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-primary' : 'bg-transparent'}`}></span>
                      <span className={`font-body-sm truncate ${isSelected ? 'text-on-surface font-medium' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                        {c.title}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="border-t border-surface-container-highest pt-2 pb-2 px-2 flex-shrink-0">
          <nav className="flex flex-col gap-0.5">
            {/* Chat */}
            <a 
              href="#chat"
              onClick={(e) => { e.preventDefault(); onSelectMode('chat'); }}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
                currentMode === 'chat' 
                  ? 'bg-surface-container-highest text-on-surface font-medium' 
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[17px]">chat_bubble</span>
                <span className="font-body-sm">Chat</span>
              </div>
              {currentMode === 'chat' && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
            </a>

            {/* Models */}
            <a 
              href="#models"
              onClick={(e) => { e.preventDefault(); onSelectMode('models'); }}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
                currentMode === 'models' 
                  ? 'bg-surface-container-highest text-on-surface font-medium' 
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[17px]">psychology</span>
                <span className="font-body-sm">Models</span>
              </div>
              <span className="font-label-telemetry text-[10px] bg-surface-container-high text-secondary px-1.5 py-0.2 rounded">
                {modelsCount}
              </span>
            </a>

            {/* Terminal */}
            <a 
              href="#terminal"
              onClick={(e) => { e.preventDefault(); onSelectMode('terminal'); }}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
                currentMode === 'terminal' 
                  ? 'bg-surface-container-highest text-on-surface font-medium' 
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[17px]">terminal</span>
                <span className="font-body-sm">Terminal</span>
              </div>
              {currentMode === 'terminal' && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
            </a>

            {/* Workspace / Code */}
            <a 
              href="#code"
              onClick={(e) => { e.preventDefault(); onSelectMode('code'); }}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
                currentMode === 'code' 
                  ? 'bg-surface-container-highest text-on-surface font-medium' 
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[17px]">code</span>
                <span className="font-body-sm">Workspace</span>
              </div>
              {currentMode === 'code' && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
            </a>

            {/* Downloads */}
            <a 
              href="#downloads"
              onClick={(e) => { e.preventDefault(); onSelectMode('downloads'); }}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
                currentMode === 'downloads' 
                  ? 'bg-surface-container-highest text-on-surface font-medium' 
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[17px]">download</span>
                <span className="font-body-sm">Downloads</span>
              </div>
              {activeDownloadsCount > 0 ? (
                <span className="material-symbols-outlined text-[14px] text-tertiary animate-pulse">sync</span>
              ) : currentMode === 'downloads' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              ) : null}
            </a>

            {/* Settings */}
            <a 
              href="#settings"
              onClick={(e) => { e.preventDefault(); onSelectMode('settings'); }}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
                currentMode === 'settings' 
                  ? 'bg-surface-container-highest text-on-surface font-medium' 
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[17px]">settings</span>
                <span className="font-body-sm">Settings</span>
              </div>
              {currentMode === 'settings' && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
            </a>
          </nav>
        </div>

        {/* Portable USB Storage Panel */}
        <div className="p-3 border-t border-surface-container-highest bg-surface-container-low flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span>
              <span className="font-label-telemetry text-[10px] text-on-surface font-semibold uppercase tracking-wider">
                Portable USB
              </span>
            </div>
            <span className="font-label-telemetry text-[10px] text-secondary">
              {storage ? `${storage.freeGB} GB free` : '82 GB free'}
            </span>
          </div>

          <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden mb-1">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-500" 
              style={{ width: storage ? `${Math.min(100, Math.max(5, 100 - storage.freePercentage))}%` : '36%' }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[9px] font-label-telemetry text-secondary">
            <span className="truncate max-w-[140px]">{storage?.rootPath || '128GB SanDisk Extreme'}</span>
            <button 
              onClick={onOpenShutdown}
              className="text-tertiary hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit"
              title="Click to safely eject USB drive"
            >
              Healthy
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
