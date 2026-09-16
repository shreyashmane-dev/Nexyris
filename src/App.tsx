import React, { useState, useEffect } from 'react';
import { Download, Pause, X, AlertCircle } from 'lucide-react';
import { AppMode, HardwareInfo, StorageInfo, ModelItem, RuntimeStatus, DownloadTask } from './types';
import { 
  fetchInitData, 
  fetchStorage, 
  fetchModels, 
  fetchRuntimeStatus, 
  fetchDownloads,
  startRuntimeModel, 
  stopRuntimeModel,
  fetchHuggingFaceCatalog,
  pauseDownload,
  cancelDownload
} from './lib/api';

import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { SafeShutdownModal } from './components/layout/SafeShutdownModal';
import { USBDisconnectModal } from './components/layout/USBDisconnectModal';
import { WizardModal } from './components/wizard/WizardModal';

import { ChatView } from './components/chat/ChatView';
import { TerminalView } from './components/terminal/TerminalView';
import { CodeAssistantView } from './components/code/CodeAssistantView';
import { ImageStudioView } from './components/image/ImageStudioView';
import { ModelLibraryView } from './components/models/ModelLibraryView';
import { DownloadsView } from './components/downloads/DownloadsView';
import { DiagnosticsView } from './components/diagnostics/DiagnosticsView';
import { SettingsView } from './components/settings/SettingsView';

export const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>('chat');
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({
    status: 'STOPPED',
    currentModel: null,
    binaryAvailable: false,
    binaryPath: null,
    port: 38195,
    host: '127.0.0.1',
    errorDetails: null,
    lastMetrics: { tokensGenerated: 0, speedTokPerSec: 0, elapsedMs: 0 },
  });
  const [activeDownload, setActiveDownload] = useState<DownloadTask | null>(null);
  const [activeDownloadsCount, setActiveDownloadsCount] = useState(0);
  const [curatedModels, setCuratedModels] = useState<ModelItem[]>([]);

  // Modals
  const [showWizard, setShowWizard] = useState(false);
  const [showShutdownModal, setShowShutdownModal] = useState(false);
  const [isUsbDisconnected, setIsUsbDisconnected] = useState(false);

  // Chat conversation state
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [newChatTrigger, setNewChatTrigger] = useState<number>(0);

  const handleNewChat = () => {
    setCurrentMode('chat');
    setActiveConvId(null);
    setNewChatTrigger(n => n + 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    initApp();

    // Storage and download polling interval
    const interval = setInterval(() => {
      checkStorageHealth();
      checkRuntimeAndDownloads();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const initApp = async () => {
    try {
      const init = await fetchInitData();
      setHardware(init.hardware);
      setStorage(init.storage);
      setRuntimeStatus(init.runtimeStatus);

      // Load models
      const mData = await fetchModels();
      setModels(mData.models);

      // Load curated HF catalog
      const hfData = await fetchHuggingFaceCatalog();
      setCuratedModels(hfData.curated || []);

      // If first run or no models installed on USB, display Setup Wizard to choose & download a model
      if (!init.portableConfig.firstRunCompleted || mData.models.length === 0) {
        setShowWizard(true);
      } else if (mData.models.length > 0 && !init.runtimeStatus.currentModel) {
        // Auto-select first model if not started
        startRuntimeModel(mData.models[0].id).then(status => {
          fetchRuntimeStatus().then(setRuntimeStatus);
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Init error:', err);
    }
  };

  const checkStorageHealth = async () => {
    try {
      const s = await fetchStorage();
      setStorage(s);
      setIsUsbDisconnected(false);
    } catch (e) {
      setIsUsbDisconnected(true);
    }
  };

  const checkRuntimeAndDownloads = async () => {
    try {
      const r = await fetchRuntimeStatus();
      setRuntimeStatus(r);

      const d = await fetchDownloads();
      setActiveDownload(d.active);
      const activeCount = (d.active ? 1 : 0) + d.queue.filter(q => q.status === 'queued').length;
      setActiveDownloadsCount(activeCount);
    } catch (e) {}
  };

  const handleSelectModel = async (modelId: string) => {
    try {
      await startRuntimeModel(modelId);
      const updated = await fetchRuntimeStatus();
      setRuntimeStatus(updated);
    } catch (err: any) {
      alert('Failed to launch model: ' + err.message);
    }
  };

  const handleStopModel = async () => {
    try {
      await stopRuntimeModel();
      const updated = await fetchRuntimeStatus();
      setRuntimeStatus(updated);
    } catch (e) {}
  };

  const handleRefreshModels = async () => {
    try {
      const data = await fetchModels();
      setModels(data.models);
      if (data.newlyDiscoveredCount > 0) {
        alert(`Discovered ${data.newlyDiscoveredCount} new model(s) in models/gguf/!`);
      }
    } catch (e) {}
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        storage={storage}
        activeDownloadsCount={activeDownloadsCount}
        modelsCount={models.length}
        onOpenShutdown={() => setShowShutdownModal(true)}
        onNewChat={handleNewChat}
        activeConvId={activeConvId}
        onSelectConversation={(id) => {
          setActiveConvId(id);
          setCurrentMode('chat');
        }}
        refreshTrigger={newChatTrigger}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar
          currentMode={currentMode}
          models={models}
          runtimeStatus={runtimeStatus}
          hardware={hardware}
          onSelectModel={handleSelectModel}
          onStopModel={handleStopModel}
          onNavigateToModels={() => setCurrentMode('models')}
          onOpenSettings={() => setCurrentMode('settings')}
        />

        {/* View Switcher */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {currentMode === 'chat' && (
            <ChatView
              runtimeStatus={runtimeStatus}
              onSelectModel={handleSelectModel}
              models={models}
              onNavigateToModels={() => setCurrentMode('models')}
              onStopModel={handleStopModel}
              onRefreshModels={handleRefreshModels}
              activeConvId={activeConvId}
              setActiveConvId={setActiveConvId}
              newChatTrigger={newChatTrigger}
            />
          )}

          {currentMode === 'terminal' && (
            <TerminalView />
          )}

          {currentMode === 'code' && (
            <CodeAssistantView />
          )}

          {currentMode === 'image' && (
            <ImageStudioView models={models} />
          )}

          {currentMode === 'models' && (
            <ModelLibraryView
              models={models}
              runtimeStatus={runtimeStatus}
              hardware={hardware}
              storage={storage}
              onRefreshModels={handleRefreshModels}
              onSelectModel={handleSelectModel}
            />
          )}

          {currentMode === 'downloads' && (
            <DownloadsView 
              storage={storage}
              onSelectModel={handleSelectModel}
              onNavigateToChat={() => setCurrentMode('chat')}
            />
          )}

        {currentMode === 'diagnostics' && (
          <DiagnosticsView
            hardware={hardware}
            storage={storage}
            runtimeStatus={runtimeStatus}
            models={models}
            onRefreshAll={() => {
              checkStorageHealth();
              checkRuntimeAndDownloads();
              handleRefreshModels();
            }}
          />
        )}

        {currentMode === 'settings' && (
          <SettingsView hardware={hardware} />
        )}
        </div>

        {/* Global Browser-Style Floating Download Bar */}
        {activeDownload && (activeDownload.status === 'downloading' || activeDownload.status === 'verifying') && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '24px',
            left: '24px',
            maxWidth: '820px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '12px 18px',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: 9999,
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              flexShrink: 0,
            }}>
              <Download size={20} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Downloading: {activeDownload.name}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>
                  {activeDownload.status === 'verifying' ? 'Verifying GGUF Header...' : `${activeDownload.percent}% • ${activeDownload.speedMBs || 0} MB/s`}
                  {activeDownload.etaSeconds && activeDownload.status !== 'verifying' ? ` (ETA ${Math.floor(activeDownload.etaSeconds / 60)}m ${activeDownload.etaSeconds % 60}s)` : ''}
                </span>
              </div>

              <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '5px' }}>
                <div style={{
                  width: `${activeDownload.percent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>Saving to: <strong style={{ color: '#dc2626' }}>{storage?.driveLetter || 'USB:'}\models\{activeDownload.filename}</strong></span>
                <span>Free on Drive: {storage?.freeGB || 0} GB</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button
                onClick={() => pauseDownload(activeDownload.id)}
                style={{
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Pause size={12} />
                <span>Pause</span>
              </button>
              <button
                onClick={() => cancelDownload(activeDownload.id)}
                style={{
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  backgroundColor: 'rgba(220, 38, 38, 0.08)',
                  border: '1px solid rgba(220, 38, 38, 0.25)',
                  color: '#dc2626',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <X size={12} />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Setup Wizard */}
      <WizardModal
        isOpen={showWizard}
        onComplete={() => {
          setShowWizard(false);
          handleRefreshModels();
        }}
        hardware={hardware}
        storage={storage}
        curatedModels={curatedModels}
      />

      {/* Safe Eject Shutdown Modal */}
      <SafeShutdownModal
        isOpen={showShutdownModal}
        onClose={() => setShowShutdownModal(false)}
      />

      {/* USB Removal Guard Modal */}
      <USBDisconnectModal
        isDisconnected={isUsbDisconnected}
        onRetry={checkStorageHealth}
      />
    </div>
  );
};
