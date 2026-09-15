import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Download, 
  Trash2, 
  Play, 
  Square, 
  Search, 
  Plus, 
  HardDrive, 
  Sparkles, 
  Check, 
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  Link2,
  Info,
  UploadCloud,
  FileCheck,
  Zap,
  Wrench
} from 'lucide-react';
import { ModelItem, RuntimeStatus, HardwareInfo } from '../../types';
import { 
  fetchModels, 
  deleteModel, 
  fetchHuggingFaceCatalog, 
  fetchOllamaCatalog, 
  importOllamaBlob, 
  importLocalGguf,
  queueDownload, 
  startRuntimeModel, 
  stopRuntimeModel,
  scanPcDownloads,
  uploadGgufFile,
  installPortableEngine,
  fetchEngineStatus
} from '../../lib/api';

interface ModelLibraryViewProps {
  models: ModelItem[];
  runtimeStatus: RuntimeStatus;
  hardware: HardwareInfo | null;
  onRefreshModels: () => void;
  onSelectModel: (modelId: string) => void;
}

export const ModelLibraryView: React.FC<ModelLibraryViewProps> = ({
  models,
  runtimeStatus,
  hardware,
  onRefreshModels,
  onSelectModel,
}) => {
  const [activeTab, setActiveTab] = useState<'installed' | 'huggingface' | 'ollama' | 'computer'>('installed');
  const [hfModels, setHfModels] = useState<ModelItem[]>([]);
  const [ollamaData, setOllamaData] = useState<{ local: any; popular: any[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanningOllama, setIsScanningOllama] = useState(false);
  
  // Computer Import State
  const [pcFiles, setPcFiles] = useState<Array<{ name: string; path: string; source: string; sizeGB: number }>>([]);
  const [isScanningPc, setIsScanningPc] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [importFilePath, setImportFilePath] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [importing, setImporting] = useState(false);
  
  // Engine State
  const [engineInfo, setEngineInfo] = useState<{ available: boolean; engine: any } | null>(null);
  const [isInstallingEngine, setIsInstallingEngine] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHfCatalog();
    loadOllamaCatalog();
    loadPcDownloads();
    checkEngine();
  }, []);

  const checkEngine = async () => {
    try {
      const data = await fetchEngineStatus();
      setEngineInfo(data);
    } catch (e) {}
  };

  const handleInstallEngine = async () => {
    setIsInstallingEngine(true);
    try {
      await installPortableEngine();
      alert('Portable llama-server engine installed successfully to your USB drive!');
      await checkEngine();
    } catch (err: any) {
      alert('Engine install error: ' + err.message);
    } finally {
      setIsInstallingEngine(false);
    }
  };

  const loadHfCatalog = async () => {
    try {
      const data = await fetchHuggingFaceCatalog(searchQuery);
      setHfModels(data.curated || data.results || []);
    } catch (e) {}
  };

  const loadOllamaCatalog = async () => {
    setIsScanningOllama(true);
    try {
      const data = await fetchOllamaCatalog();
      setOllamaData(data);
    } catch (e) {} finally {
      setIsScanningOllama(false);
    }
  };

  const loadPcDownloads = async () => {
    setIsScanningPc(true);
    try {
      const res = await scanPcDownloads();
      setPcFiles(res.found || []);
    } catch (e) {} finally {
      setIsScanningPc(false);
    }
  };

  const handleDownloadModel = async (model: any) => {
    try {
      await queueDownload({
        id: model.id,
        name: model.name,
        filename: model.filename || `${model.id}.gguf`,
        url: model.downloadUrl,
        category: model.category,
        expectedSize: model.fileSizeBytes || (model.fileSizeGB ? model.fileSizeGB * 1024 ** 3 : 0),
      });
      alert(`Queued download for ${model.name}. Live progress is visible in the bottom bar and Downloads tab.`);
    } catch (err: any) {
      alert('Download error: ' + err.message);
    }
  };

  const handleImportPcFile = async (filePath: string, name?: string) => {
    setImporting(true);
    try {
      await importLocalGguf(filePath, name);
      alert('Successfully copied GGUF model directly into your USB pendrive!');
      onRefreshModels();
      setActiveTab('installed');
    } catch (err: any) {
      alert('Import error: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadGgufFile(file);
      alert(`Successfully transferred ${file.name} to USB pendrive!`);
      onRefreshModels();
      setActiveTab('installed');
    } catch (err: any) {
      alert('Upload error: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportFromUrl = async () => {
    if (!customUrl.trim()) return;
    try {
      const filename = customUrl.split('/').pop()?.split('?')[0] || 'custom-model.gguf';
      await queueDownload({
        id: 'custom-' + Date.now(),
        name: customName || filename.replace('.gguf', ''),
        filename,
        url: customUrl.trim(),
      });
      alert('Download queued from URL! Monitor progress in the bottom bar or Downloads tab.');
      setCustomUrl('');
      setCustomName('');
    } catch (err: any) {
      alert('URL download error: ' + err.message);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', backgroundColor: 'var(--bg-main)', overflowY: 'auto', padding: '24px 32px' }}>
      {/* Hidden File Picker */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".gguf,.safetensors"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Header & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={22} color="#38bdf8" />
            <span>AI Model Management</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            Your models live on this pendrive. Run them on any compatible PC.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          {[
            { id: 'installed', label: `Installed on USB (${models.length})` },
            { id: 'huggingface', label: 'Curated Models' },
            { id: 'computer', label: 'Import from Computer' },
            { id: 'ollama', label: 'Ollama Scanner' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: activeTab === t.id ? 700 : 500,
                color: activeTab === t.id ? '#fff' : 'var(--text-secondary)',
                backgroundColor: activeTab === t.id ? 'var(--accent-primary)' : 'transparent',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Engine Status Banner */}
      <div style={{
        padding: '12px 18px',
        backgroundColor: engineInfo?.available ? 'rgba(16, 185, 129, 0.08)' : 'rgba(234, 179, 8, 0.1)',
        border: `1px solid ${engineInfo?.available ? 'rgba(16, 185, 129, 0.25)' : 'rgba(234, 179, 8, 0.3)'}`,
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={18} color={engineInfo?.available ? '#10b981' : '#eab308'} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              Local AI Engine: {engineInfo?.available ? `Ready (${engineInfo.engine?.type})` : 'Portable Engine Not Installed on USB'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {engineInfo?.available 
                ? 'High-performance llama.cpp/Ollama execution active for full offline inference.' 
                : 'Download the official portable llama-server binary (~16MB) directly onto your pendrive to run GGUF models on any PC.'}
            </div>
          </div>
        </div>

        {!engineInfo?.available && (
          <button
            onClick={handleInstallEngine}
            disabled={isInstallingEngine}
            style={{
              padding: '7px 16px',
              backgroundColor: '#eab308',
              color: '#000',
              fontWeight: 700,
              fontSize: '12px',
              borderRadius: '6px',
              border: 'none',
              cursor: isInstallingEngine ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={13} />
            <span>{isInstallingEngine ? 'Downloading to USB...' : 'Download Portable Engine (16MB)'}</span>
          </button>
        )}
      </div>

      {/* Tab 1: Installed Models on USB */}
      {activeTab === 'installed' && (
        <div>
          {models.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '16px',
              border: '1px dashed var(--border-subtle)',
            }}>
              <AlertTriangle size={42} color="#eab308" style={{ marginBottom: '14px', opacity: 0.8 }} />
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                No AI Models Found on USB Pendrive
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                Your pendrive is currently empty. Download an uncensored or standard model from our curated catalog, or copy existing models from your computer.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button
                  onClick={() => setActiveTab('huggingface')}
                  className="btn btn-primary"
                  style={{ padding: '9px 18px', fontSize: '13px' }}
                >
                  <Download size={15} />
                  <span>Browse Curated Models</span>
                </button>
                <button
                  onClick={() => setActiveTab('computer')}
                  className="btn btn-secondary"
                  style={{ padding: '9px 18px', fontSize: '13px' }}
                >
                  <FolderOpen size={15} />
                  <span>Import from Computer</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {models.map((model) => {
                const isRunning = runtimeStatus.currentModel?.id === model.id && runtimeStatus.status === 'READY';
                return (
                  <div key={model.id} className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                            {model.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            File: <code>{model.filename}</code>
                          </div>
                        </div>

                        {isRunning ? (
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}>
                            ● RUNNING
                          </span>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '12px', marginBottom: '16px' }}>
                        <span>Size: <strong>{model.sizeGB} GB</strong></span>
                        <span>Format: <strong>{model.format || 'GGUF'}</strong></span>
                        <span>Quant: <strong>{model.quantization || 'Q4_K_M'}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {isRunning ? (
                        <button
                          onClick={() => stopRuntimeModel()}
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <Square size={13} />
                          <span>Stop Model</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectModel(model.id)}
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '6px',
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <Play size={13} />
                          <span>Start & Chat</span>
                        </button>
                      )}

                      <button
                        onClick={async () => {
                          if (confirm(`Delete ${model.name} from USB pendrive?`)) {
                            await deleteModel(model.id);
                            onRefreshModels();
                          }
                        }}
                        style={{
                          padding: '8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: '#94a3b8',
                          border: '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                        }}
                        title="Delete model"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Curated Models (Uncensored, Standard, Image) */}
      {activeTab === 'huggingface' && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search models on Hugging Face (e.g. 'nemomix', 'mistral', 'qwen')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadHfCatalog();
                }}
                style={{ background: 'transparent', border: 'none', width: '100%', fontSize: '13px', color: '#fff', outline: 'none' }}
              />
            </div>
            <button className="btn btn-primary" onClick={loadHfCatalog}>
              Search HF
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {hfModels.map((model: any) => (
              <div key={model.id} className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                      {model.name}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {model.label === 'UNCENSORED' && (
                        <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          🔓 UNCENSORED
                        </span>
                      )}
                      {model.badge && (
                        <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                          {model.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
                    {model.description || 'Quantized model for local offline CPU/GPU execution.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    <span>Size: <strong>~{model.fileSizeGB} GB</strong></span>
                    <span>Quant: <strong>{model.quantization || 'Q4_K_M'}</strong></span>
                    <span>Context: <strong>{model.contextLength || 4096}</strong></span>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => handleDownloadModel(model)}
                >
                  <Download size={14} />
                  <span>Download to Pendrive</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Import from Computer (Scan PC & File Upload) */}
      {activeTab === 'computer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 1. Direct Computer File Picker */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UploadCloud size={20} color="#38bdf8" />
                <span>Browse and Upload from This Computer</span>
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Click to open your computer's native file explorer and pick any <code>.gguf</code> or <code>.safetensors</code> model to copy directly onto your pendrive.
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(56, 189, 248, 0.3)',
              }}
            >
              <FolderOpen size={16} />
              <span>{isUploading ? 'Transferring to USB...' : 'Browse PC Files (.gguf)'}</span>
            </button>
          </div>

          {/* 2. Auto-Detected GGUF Files on PC */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCheck size={18} color="#10b981" />
                  <span>Auto-Detected Models on Host PC</span>
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Scanned Downloads, Desktop, and Documents folders on this machine.
                </p>
              </div>

              <button
                onClick={loadPcDownloads}
                disabled={isScanningPc}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={12} className={isScanningPc ? 'animate-spin' : ''} />
                <span>Rescan PC</span>
              </button>
            </div>

            {pcFiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No .gguf models automatically found in Downloads/Desktop on this computer. Use the browse button above or manual path below.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pcFiles.map((file, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc' }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Location: {file.source} • {file.sizeGB} GB • <code>{file.path}</code>
                      </div>
                    </div>

                    <button
                      onClick={() => handleImportPcFile(file.path, file.name)}
                      disabled={importing}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: importing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Download size={13} />
                      <span>{importing ? 'Copying...' : 'Copy to Pendrive'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Manual Path or Custom URL Import */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Manual Path */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                Manual File Path on Host PC
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Paste the absolute path to a <code>.gguf</code> file located on your PC drive.
              </p>
              <input
                type="text"
                placeholder="C:\Users\Username\Downloads\model.gguf"
                value={importFilePath}
                onChange={(e) => setImportFilePath(e.target.value)}
                style={{ width: '100%', marginBottom: '12px' }}
              />
              <button
                className="btn btn-primary"
                onClick={() => handleImportPcFile(importFilePath.trim(), customName || undefined)}
                disabled={!importFilePath.trim() || importing}
              >
                Copy to Pendrive
              </button>
            </div>

            {/* Custom URL */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                Download Custom HuggingFace URL
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Paste any direct download link for a <code>.gguf</code> model.
              </p>
              <input
                type="text"
                placeholder="https://huggingface.co/.../model.gguf"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                style={{ width: '100%', marginBottom: '12px' }}
              />
              <button
                className="btn btn-primary"
                onClick={handleImportFromUrl}
                disabled={!customUrl.trim()}
              >
                Download to USB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Ollama Scanner */}
      {activeTab === 'ollama' && (
        <div>
          <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>Host PC Ollama Scanner</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {ollamaData?.local?.message || 'Scanning for existing local Ollama models on this computer...'}
                </p>
              </div>
              <button className="btn btn-secondary" onClick={loadOllamaCatalog} disabled={isScanningOllama}>
                <RefreshCw size={13} className={isScanningOllama ? 'animate-spin' : ''} />
                <span>Rescan Host</span>
              </button>
            </div>

            {ollamaData?.local?.models && ollamaData.local.models.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ollamaData.local.models.map((om: any) => (
                  <div key={om.digest} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{om.tag}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Size: {om.sizeGB} GB</div>
                    </div>
                    <button
                      className="btn btn-secondary"
                      onClick={async () => {
                        setImporting(true);
                        try {
                          await importOllamaBlob(om.blobPath, om.tag);
                          alert(`Imported ${om.tag} to USB!`);
                          onRefreshModels();
                        } catch (e: any) {
                          alert(e.message);
                        } finally {
                          setImporting(false);
                        }
                      }}
                      disabled={importing}
                    >
                      <Download size={13} />
                      <span>Copy to USB</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', padding: '10px 0' }}>
                No local Ollama models detected in standard user profile directories.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
