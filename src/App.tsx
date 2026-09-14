import React, { useState, useEffect } from 'react';
import { AppMode, HardwareInfo, StorageInfo, ModelItem, RuntimeStatus, DownloadTask } from './types';
import { 
  fetchInitData, 
  fetchStorage, 
  fetchModels, 
  fetchRuntimeStatus, 
  fetchDownloads,
  startRuntimeModel,
  stopRuntimeModel,
  fetchHuggingFaceCatalog
} from './lib/api';

import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { SafeShutdownModal } from './components/layout/SafeShutdownModal';
import { USBDisconnectModal } from './components/layout/USBDisconnectModal';
import { WizardModal } from './components/wizard/WizardModal';

import { ChatView } from './components/chat/ChatView';
import { TerminalView } from './components/terminal/TerminalView';
import { CodeAssistantView } from './components/code/CodeAssistantView';
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
    }, 2500);

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
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        storage={storage}
        activeDownloadsCount={activeDownloadsCount}
        onOpenShutdown={() => setShowShutdownModal(true)}
      />

      {/* Main Workspace Frame */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
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
          />
        )}

        {currentMode === 'terminal' && (
          <TerminalView />
        )}

        {currentMode === 'code' && (
          <CodeAssistantView />
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
