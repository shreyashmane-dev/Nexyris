import React, { useState, useEffect } from 'react';
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
  Info
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
  stopRuntimeModel 
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
  const [activeTab, setActiveTab] = useState<'installed' | 'huggingface' | 'ollama' | 'custom'>('installed');
  const [hfModels, setHfModels] = useState<ModelItem[]>([]);
  const [ollamaData, setOllamaData] = useState<{ local: any; popular: any[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanningOllama, setIsScanningOllama] = useState(false);
  const [importFilePath, setImportFilePath] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [importing, setImporting] = useState(false);
  const [selectedDetailsModel, setSelectedDetailsModel] = useState<ModelItem | null>(null);

  useEffect(() => {
    loadHfCatalog();
    loadOllamaCatalog();
  }, []);

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

  const handleDownloadModel = async (model: any) => {
    try {
      await queueDownload({
        id: model.id,
        name: model.name,
        filename: model.filename || `${model.id}.gguf`,
        url: model.downloadUrl,
        expectedSize: model.fileSizeBytes || (model.fileSizeGB ? model.fileSizeGB * 1024 ** 3 : 0),
      });
      alert(`Queued download for ${model.name}. Check Downloads tab to monitor progress.`);
    } catch (err: any) {
      alert('Download error: ' + err.message);
    }
  };

  const handleImportOllama = async (blobPath: string, tag: string) => {
    setImporting(true);
    try {
      await importOllamaBlob(blobPath, tag);
      alert(`Successfully imported Ollama model ${tag} to your USB drive!`);
      onRefreshModels();
    } catch (err: any) {
      alert('Ollama import error: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleImportLocalFile = async () => {
    if (!importFilePath.trim()) return;
    setImporting(true);
    try {
      await importLocalGguf(importFilePath.trim(), customName || undefined);
      alert('Successfully imported local GGUF model to USB!');
      setImportFilePath('');
      setCustomName('');
      onRefreshModels();
      setActiveTab('installed');
    } catch (err: any) {
      alert('Import error: ' + err.message);
    } finally {
      setImporting(false);
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
      alert('Download queued from URL! Monitor in the Downloads tab.');
      setCustomUrl('');
      setCustomName('');
    } catch (err: any) {
      alert('URL download error: ' + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete ${name} from your USB drive? This frees storage space permanently.`)) {
      try {
        await deleteModel(id);
        onRefreshModels();
      } catch (err: any) {
        alert('Delete error: ' + err.message);
      }
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', backgroundColor: 'var(--bg-app)', padding: '24px 32px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Model Library & Marketplace
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Manage installed models on your USB drive or download new models from Hugging Face & Ollama.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onRefreshModels}>
            <RefreshCw size={14} />
            <span>Rescan USB</span>
          </button>
          <button className="btn btn-primary" onClick={() => setActiveTab('custom')}>
            <Plus size={15} />
            <span>Add Custom Model</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '20px',
      }}>
        {[
          { id: 'installed', label: `Installed on USB (${models.length})` },
          { id: 'huggingface', label: 'Hugging Face GGUFs' },
          { id: 'ollama', label: 'Ollama Models & Local Scanner' },
          { id: 'custom', label: 'Custom Import (PC / URL)' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 16px',
                fontSize: '13.5px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#60a5fa' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Installed Models */}
      {activeTab === 'installed' && (
        <div>
          {models.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Cpu size={30} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>No Models Installed on USB</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 20px' }}>
                Your portable models directory is currently empty. Browse the Hugging Face catalog, import from Ollama, or select a local GGUF file.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => setActiveTab('huggingface')}>
                  Browse Hugging Face
                </button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('ollama')}>
                  Scan Host for Ollama
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {models.map((model) => {
                const isRunning = runtimeStatus.currentModel?.id === model.id && runtimeStatus.status === 'READY';
                const compat = model.compatibility;

                return (
                  <div key={model.id} className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                            {model.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {model.filename || model.path}
                          </div>
                        </div>

                        {compat && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: compat.status === 'RECOMMENDED' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)',
                            color: compat.status === 'RECOMMENDED' ? '#34d399' : '#60a5fa',
                          }}>
                            {compat.badge}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', padding: '10px 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', margin: '12px 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Size:</span> <strong>{model.sizeGB || '~1'} GB</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Quant:</span> <strong>{model.quantization || 'Q4'}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Format:</span> <strong>GGUF</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      {isRunning ? (
                        <button
                          className="btn btn-danger"
                          style={{ flex: 1, padding: '7px' }}
                          onClick={() => stopRuntimeModel()}
                        >
                          <Square size={13} fill="#f87171" />
                          <span>Stop Model</span>
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          style={{ flex: 1, padding: '7px' }}
                          onClick={() => onSelectModel(model.id)}
                        >
                          <Play size={13} fill="white" />
                          <span>Launch Model</span>
                        </button>
                      )}

                      <button
                        className="btn btn-secondary"
                        style={{ padding: '7px 10px' }}
                        onClick={() => setSelectedDetailsModel(model)}
                        title="Model Details"
                      >
                        <Info size={14} />
                      </button>

                      <button
                        className="btn btn-secondary"
                        style={{ padding: '7px 10px', color: '#f87171' }}
                        onClick={() => handleDelete(model.id, model.name)}
                        title="Delete from USB"
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

      {/* Tab 2: Hugging Face GGUF Hub */}
      {activeTab === 'huggingface' && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search models on Hugging Face (e.g. 'qwen', 'deepseek', 'llama3')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadHfCatalog();
                }}
                style={{ background: 'transparent', border: 'none', width: '100%', fontSize: '13px' }}
              />
            </div>
            <button className="btn btn-primary" onClick={loadHfCatalog}>
              Search HF
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
            {hfModels.map((model) => (
              <div key={model.id} className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                      {model.name}
                    </div>
                    {model.compatibility && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: model.compatibility.status === 'RECOMMENDED' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)',
                        color: model.compatibility.status === 'RECOMMENDED' ? '#34d399' : '#60a5fa',
                      }}>
                        {model.compatibility.badge}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
                    {model.description || 'Verified GGUF quantized model for local CPU/GPU execution.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    <span>Size: <strong>~{model.fileSizeGB} GB</strong></span>
                    <span>Quant: <strong>{model.quantization || 'Q4_K_M'}</strong></span>
                    <span>Context: <strong>{model.contextLength || 4096}</strong></span>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => handleDownloadModel(model)}
                >
                  <Download size={14} />
                  <span>Download to USB Drive</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Ollama Models & Local PC Scanner */}
      {activeTab === 'ollama' && (
        <div>
          {/* Host Scanner Section */}
          <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Host PC Ollama Models Scanner</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {ollamaData?.local?.message || 'Scanning for existing local Ollama models on this computer...'}
                </p>
              </div>
              <button className="btn btn-secondary" onClick={loadOllamaCatalog} disabled={isScanningOllama}>
                <RefreshCw size={13} className={isScanningOllama ? 'pulse-dot' : ''} />
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
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Blob Size: {om.sizeGB} GB • Ready to copy to USB
                      </div>
                    </div>

                    <button
                      className="btn btn-primary"
                      disabled={importing}
                      onClick={() => handleImportOllama(om.blobPath, om.tag)}
                    >
                      <Download size={13} />
                      <span>{importing ? 'Importing...' : 'Copy to USB'}</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', padding: '10px 0' }}>
                No local Ollama models detected in standard user profile directories. You can also pull from the Ollama library below.
              </div>
            )}
          </div>

          {/* Popular Ollama library models */}
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
            Popular Ollama Library Models
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {ollamaData?.popular?.map((m: any) => (
              <div key={m.id} className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{m.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{m.desc}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>Tag: <code>{m.id}</code></span>
                  <span>Size: ~{m.sizeGB} GB</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Custom GGUF Import */}
      {activeTab === 'custom' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOpen size={18} color="#60a5fa" />
              <span>Import Local GGUF from Host Computer</span>
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Select an existing <code>.gguf</code> model file on your computer (e.g. from your Downloads or Desktop folder). Nexyris will validate the GGUF binary header and copy it directly to your USB drive.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Path to .gguf file on host:
                </label>
                <input
                  type="text"
                  placeholder="e.g. C:\Users\Username\Downloads\model.gguf"
                  value={importFilePath}
                  onChange={(e) => setImportFilePath(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Custom Display Name (optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Custom Fine-Tuned Llama"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleImportLocalFile}
                disabled={!importFilePath.trim() || importing}
                style={{ alignSelf: 'flex-end', marginTop: '6px' }}
              >
                {importing ? 'Validating & Copying...' : 'Import to USB'}
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link2 size={18} color="#38bdf8" />
              <span>Download Direct from Model URL</span>
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Paste any direct download link for a <code>.gguf</code> file.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="https://.../model.gguf"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                style={{ width: '100%' }}
              />

              <button
                className="btn btn-primary"
                onClick={handleImportFromUrl}
                disabled={!customUrl.trim()}
                style={{ alignSelf: 'flex-end' }}
              >
                Download to USB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Model Details Modal */}
      {selectedDetailsModel && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="glass-modal" style={{ width: '500px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
              {selectedDetailsModel.name}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              <div><strong>Format:</strong> {selectedDetailsModel.format}</div>
              <div><strong>Architecture:</strong> {selectedDetailsModel.architecture || 'Unknown'}</div>
              <div><strong>Quantization:</strong> {selectedDetailsModel.quantization || 'Q4_K_M'}</div>
              <div><strong>File Size:</strong> {selectedDetailsModel.sizeGB} GB</div>
              <div><strong>Location on USB:</strong> <code>{selectedDetailsModel.path}</code></div>
              <div><strong>Status:</strong> {selectedDetailsModel.status}</div>
              {selectedDetailsModel.compatibility && (
                <div style={{ marginTop: '8px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                  <strong>Hardware Compatibility:</strong> {selectedDetailsModel.compatibility.badge}<br />
                  {selectedDetailsModel.compatibility.reason}
                </div>
              )}
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => setSelectedDetailsModel(null)}
              style={{ width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
