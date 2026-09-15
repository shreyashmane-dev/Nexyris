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

      // If never installed or first run, display Setup Wizard
      if (!init.portableConfig.installed && !init.portableConfig.firstRunCompleted) {
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
        onOpenShutdown={() => setShowShutdownModal(true)}
      />

      {/* Main Workspace Frame */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' }}>
        <TopBar
          currentMode={currentMode}
          models={models}
          runtimeStatus={runtimeStatus}
          onSelectModel={handleSelectModel}
          onStopModel={handleStopModel}
          onNavigateToModels={() => setCurrentMode('models')}
        />

        {/* View Switcher */}
        {currentMode === 'chat' && (
          <ChatView
            runtimeStatus={runtimeStatus}
            onSelectModel={handleSelectModel}
            models={models}
            onNavigateToModels={() => setCurrentMode('models')}
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
            onRefreshModels={handleRefreshModels}
            onSelectModel={handleSelectModel}
          />
        )}

        {currentMode === 'downloads' && (
          <DownloadsView />
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

        {/* Global Browser-Style Floating Download Bar */}
        {activeDownload && (activeDownload.status === 'downloading' || activeDownload.status === 'verifying') && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '24px',
            left: '24px',
            maxWidth: '820px',
            margin: '0 auto',
            backgroundColor: '#090d18',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '12px',
            padding: '12px 18px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(56, 189, 248, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: 9999,
            backdropFilter: 'blur(16px)',
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              flexShrink: 0,
            }}>
              <Download size={20} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Downloading to USB: {activeDownload.name}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                  {activeDownload.status === 'verifying' ? 'Verifying GGUF Header...' : `${activeDownload.percent}% • ${activeDownload.speedMBs || 0} MB/s`}
                  {activeDownload.etaSeconds && activeDownload.status !== 'verifying' ? ` (ETA ${Math.floor(activeDownload.etaSeconds / 60)}m ${activeDownload.etaSeconds % 60}s)` : ''}
                </span>
              </div>

              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: `${activeDownload.percent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #38bdf8 0%, #6366f1 100%)',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }} />
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
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e2e8f0',
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
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
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
