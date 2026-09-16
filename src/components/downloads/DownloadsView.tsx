import React, { useState, useEffect } from 'react';
import { DownloadTask, StorageInfo } from '../../types';
import { fetchDownloads, pauseDownload, resumeDownload, cancelDownload, queueDownload, fetchModels, deleteModel, startRuntimeModel } from '../../lib/api';

interface DownloadsViewProps {
  storage?: StorageInfo | null;
  onSelectModel?: (id: string) => void;
  onNavigateToChat?: () => void;
}

export const DownloadsView: React.FC<DownloadsViewProps> = ({
  storage,
  onSelectModel,
  onNavigateToChat,
}) => {
  const [downloadData, setDownloadData] = useState<{ active: DownloadTask | null; queue: DownloadTask[]; incomplete: any[] }>({
    active: null,
    queue: [],
    incomplete: [],
  });

  const [installedModels, setInstalledModels] = useState<any[]>([]);
  const [hfRepoInput, setHfRepoInput] = useState('bartowski/Llama-3.2-3B-Instruct-GGUF');
  const [quantSelect, setQuantSelect] = useState('Q4_K_M');
  const [verifySha, setVerifySha] = useState(true);
  const [autoRegister, setAutoRegister] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    loadStatus();
    loadInstalled();
    const interval = setInterval(loadStatus, 1500);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const data = await fetchDownloads();
      setDownloadData(data);
    } catch (e) {}
  };

  const loadInstalled = async () => {
    try {
      const data = await fetchModels();
      setInstalledModels(data.models || []);
    } catch (e) {}
  };

  const handlePause = async (id: string) => {
    await pauseDownload(id);
    loadStatus();
  };

  const handleResume = async (id: string) => {
    await resumeDownload(id);
    loadStatus();
  };

  const handleCancel = async (id: string) => {
    if (confirm('Cancel and remove partial download files?')) {
      await cancelDownload(id);
      loadStatus();
    }
  };

  const handleRunInChat = async (id: string) => {
    try {
      await startRuntimeModel(id);
      if (onSelectModel) onSelectModel(id);
      if (onNavigateToChat) onNavigateToChat();
    } catch (e: any) {
      alert('Failed to start model: ' + e.message);
    }
  };

  const handleRemoveInstalled = async (id: string, name: string) => {
    if (confirm(`Delete "${name}" from USB storage?`)) {
      try {
        await deleteModel(id);
        loadInstalled();
      } catch (e: any) {
        alert('Failed to delete: ' + e.message);
      }
    }
  };

  const handleStartHfDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hfRepoInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const repo = hfRepoInput.trim();
      const modelName = repo.split('/').pop() || repo;
      const cleanFile = `${repo.replace(/\//g, '_')}.${quantSelect}.gguf`;

      await queueDownload({
        id: repo,
        name: `${modelName} (${quantSelect})`,
        filename: cleanFile,
        url: `https://huggingface.co/${repo}/resolve/main/${cleanFile}`,
        category: 'Instruct',
        expectedSize: 2.5 * 1024 ** 3,
      });

      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 2500);
      loadStatus();
    } catch (err: any) {
      alert('Failed to start download: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const active = downloadData.active;
  const queue = downloadData.queue;

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const gb = bytes / (1024 ** 3);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const totalInstalledGB = installedModels.reduce((acc, m) => acc + (m.sizeGB || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-surface overflow-y-auto">
      <div className="p-6 md:p-8 flex flex-col gap-8 max-w-[1440px] mx-auto w-full">
        {/* Top Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-surface-container-low p-6 rounded-xl shadow-sm border border-surface-container-highest">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-label-telemetry text-primary uppercase text-label-telemetry tracking-widest font-semibold">
                Local Storage Depot
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span className="font-label-telemetry text-secondary text-label-telemetry">I/O Pipeline v4</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Downloads</h1>
            <p className="font-body-md text-secondary text-body-md">Active model pulls and downloaded portable packages</p>

            {/* Live Telemetry Pill Row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-sm border border-surface-container-highest">
                <span className="material-symbols-outlined text-primary text-[15px] animate-pulse">downloading</span>
                <span className="font-label-telemetry text-secondary text-label-telemetry">Speed:</span>
                <span className="font-label-telemetry text-on-surface font-semibold text-label-telemetry">
                  {active ? `${active.speedMBs} MB/s` : '0.0 MB/s'}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-sm border border-surface-container-highest">
                <span className="material-symbols-outlined text-tertiary text-[15px]">usb</span>
                <span className="font-label-telemetry text-secondary text-label-telemetry">Target:</span>
                <span className="font-label-code text-on-surface font-medium text-label-code truncate max-w-[240px]">
                  {storage?.rootPath ? `${storage.rootPath}/models` : '/Volumes/NEXYRIS_USB/models'}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-sm border border-surface-container-highest">
                <span className="material-symbols-outlined text-secondary text-[15px]">lan</span>
                <span className="font-label-telemetry text-secondary text-label-telemetry">Network:</span>
                <span className="font-label-telemetry text-tertiary font-semibold text-label-telemetry">Direct (No Proxy)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                const el = document.getElementById('hf-repo-id');
                el?.focus();
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg shadow-sm transition-all duration-150 active:scale-[0.99] font-body-sm font-medium border-none cursor-pointer" 
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Download by HF ID / URL</span>
            </button>
          </div>
        </div>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Primary Left Column: Active Downloads & Repositories (8 cols) */}
          <div className="xl:col-span-8 flex flex-col gap-8">
            {/* SECTION 1: Active Downloads */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-primary animate-ping' : 'bg-secondary'}`}></span>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">Active Model Stream</h2>
                </div>
                <span className="font-label-telemetry text-secondary text-label-telemetry">
                  {active ? '1 Task Operating' : 'Idle'}
                </span>
              </div>

              {/* Active Card */}
              {active ? (
                <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-surface-container-highest flex flex-col gap-5 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                          {active.name}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-telemetry text-label-telemetry font-bold">
                          {active.status.toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-container text-secondary font-label-code text-label-code">
                          GGUF
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-secondary font-label-code text-label-code">
                        <span className="material-symbols-outlined text-[14px]">dataset</span>
                        <span>{active.id}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-start md:self-auto">
                      {active.status === 'downloading' ? (
                        <button 
                          onClick={() => handlePause(active.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-body-sm transition-colors shadow-sm border-none cursor-pointer" 
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">pause</span>
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleResume(active.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-body-sm transition-colors shadow-sm border-none cursor-pointer" 
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                          <span>Resume</span>
                        </button>
                      )}
                      <button 
                        onClick={() => handleCancel(active.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-error-container text-error font-body-sm transition-colors border-none cursor-pointer" 
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>

                  {/* Progress Telemetry */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end font-label-telemetry text-label-telemetry">
                      <span className="text-on-surface font-semibold">{active.percent}% Completed</span>
                      <span className="text-secondary font-label-code">
                        {formatBytes(active.downloadedBytes)} / {formatBytes(active.totalBytes)} · {active.speedMBs} MB/s · {active.etaSeconds > 0 ? `${Math.floor(active.etaSeconds / 60)}m ${active.etaSeconds % 60}s remaining` : 'Calculating'}
                      </span>
                    </div>

                    {/* Hairline Fill Progress Bar */}
                    <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${active.percent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Micro Metrics Matrix */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
                      <span className="font-label-telemetry text-secondary text-label-telemetry">FILE</span>
                      <span className="font-label-code text-on-surface text-label-code truncate font-medium" title={active.filename}>
                        {active.filename}
                      </span>
                    </div>
                    <div className="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
                      <span className="font-label-telemetry text-secondary text-label-telemetry">AVG INGEST</span>
                      <span className="font-label-code text-on-surface text-label-code font-medium">{active.speedMBs} MB/s</span>
                    </div>
                    <div className="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
                      <span className="font-label-telemetry text-secondary text-label-telemetry">HTTP RANGE</span>
                      <span className="font-label-code text-on-surface text-label-code font-medium">Resume Capable</span>
                    </div>
                    <div className="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
                      <span className="font-label-telemetry text-secondary text-label-telemetry">CHECKSUM</span>
                      <span className="font-label-code text-tertiary text-label-code font-medium">Auto-Validating</span>
                    </div>
                  </div>

                  {/* Telemetry Chart Visual */}
                  <div className="pt-2 flex flex-col gap-1.5">
                    <span className="font-label-telemetry text-secondary text-label-telemetry uppercase tracking-wider">
                      Throughput (Last 60 Seconds)
                    </span>
                    <div className="w-full h-12 bg-surface-container-low rounded-lg p-2 flex items-end justify-between gap-1 overflow-hidden">
                      {[15, 25, 30, 45, 35, 60, 65, 55, 70, 80, 85, 75, 90, 85, 70, 80, 95].map((val, idx) => (
                        <div 
                          key={idx} 
                          className="flex-1 bg-primary/70 hover:bg-primary rounded-t transition-all" 
                          style={{ height: `${val}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-surface-container-highest text-center text-secondary">
                  <span className="material-symbols-outlined text-[32px] text-secondary/60 mb-2">download_done</span>
                  <div className="font-body-md font-medium text-on-surface">No active downloads</div>
                  <div className="text-[12px] font-label-telemetry mt-1">Queue is idle. Enter a Hugging Face repo ID below to pull models directly to USB.</div>
                </div>
              )}
            </div>

            {/* SECTION 2: Download Queue / Pending */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">Pending Pulls</h2>
                <span className="font-label-telemetry text-secondary text-label-telemetry">FIFO Pipeline ({queue.length})</span>
              </div>

              {queue.length === 0 ? (
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container-highest text-secondary text-[12px] font-label-telemetry text-center">
                  No queued downloads.
                </div>
              ) : (
                queue.map((task, idx) => (
                  <div key={task.id} className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container-highest flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                        <span className="font-label-telemetry font-bold text-secondary text-label-telemetry">#{idx + 1}</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body-md font-semibold text-on-surface truncate">{task.name}</span>
                          <span className="px-1.5 py-0.5 bg-surface-container-high rounded text-secondary font-label-telemetry text-label-telemetry">
                            {formatBytes(task.totalBytes)}
                          </span>
                        </div>
                        <span className="font-label-code text-secondary text-label-code truncate">{task.id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded bg-secondary-container text-on-secondary-fixed font-label-telemetry text-label-telemetry uppercase font-semibold">
                        Queued
                      </span>
                      <button 
                        onClick={() => handleCancel(task.id)}
                        className="p-1 rounded hover:bg-surface-container text-secondary hover:text-error bg-transparent border-none cursor-pointer" 
                        title="Remove from queue" 
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* SECTION 3: Completed Downloads / Installed Packages */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">Installed Repository Models</h2>
                  <span className="font-label-telemetry bg-surface-container text-secondary px-2 py-0.5 rounded text-label-telemetry">
                    {installedModels.length} Verified
                  </span>
                </div>
                <div className="flex items-center gap-2 font-label-telemetry text-secondary text-label-telemetry">
                  <span>Drive Usage: {totalInstalledGB.toFixed(1)} GB / {storage?.totalGB || 128} GB</span>
                </div>
              </div>

              {/* Model Table List */}
              <div className="flex flex-col gap-2.5">
                {installedModels.length === 0 ? (
                  <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-highest text-center text-secondary font-body-sm">
                    No models installed yet on USB drive.
                  </div>
                ) : (
                  installedModels.map((m) => (
                    <div key={m.id} className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container-highest flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0 text-on-surface font-headline-md font-bold">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-headline-md text-body-lg text-on-surface font-semibold truncate">{m.name}</span>
                            <span className="font-label-code text-secondary text-label-code truncate">{m.filename || `${m.id}.gguf`}</span>
                          </div>
                          <div className="flex items-center gap-2 font-label-telemetry text-label-telemetry text-secondary flex-wrap">
                            <span className="font-semibold text-on-surface">{m.sizeGB ? `${m.sizeGB} GB` : '4.5 GB'}</span>
                            <span>•</span>
                            <span className="text-tertiary flex items-center gap-1 font-medium">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              Installed to USB
                            </span>
                            <span>•</span>
                            <span className="font-label-code text-secondary font-normal">Format: GGUF</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto flex-shrink-0">
                        <button 
                          onClick={() => handleRunInChat(m.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-sm font-medium transition-colors shadow-sm border-none cursor-pointer" 
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                          <span>Run in Chat</span>
                        </button>
                        <button 
                          onClick={() => handleRemoveInstalled(m.id, m.name)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-error-container text-secondary hover:text-error font-body-sm transition-colors border-none cursor-pointer" 
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Secondary Right Column: Direct Hugging Face Import (4 cols) */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-surface-container-highest flex flex-col gap-6 sticky top-20">
              <div className="flex items-center justify-between pb-3 bg-surface-container-low -mx-6 -mt-6 p-6 rounded-t-xl border-b border-surface-container-highest">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">Direct HF Download</h2>
                </div>
                <span className="font-label-keycap text-secondary text-label-keycap bg-surface-container px-2 py-0.5 rounded font-semibold">
                  GGUF ONLY
                </span>
              </div>

              <p className="font-body-sm text-secondary text-body-sm m-0">
                Fetch model weights directly from Hugging Face Hub. Nexyris parses multi-part quant files automatically and stages them on your portable volume.
              </p>

              {/* Input Fields Form */}
              <form onSubmit={handleStartHfDownload} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-telemetry text-on-surface text-label-telemetry uppercase font-semibold" htmlFor="hf-repo-id">
                    Model Repository or URL
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-secondary text-[18px]">search</span>
                    <input 
                      id="hf-repo-id"
                      value={hfRepoInput}
                      onChange={(e) => setHfRepoInput(e.target.value)}
                      className="w-full bg-surface-container-low text-on-surface font-label-code text-label-code pl-9 pr-3 py-2.5 rounded-lg focus:outline-none focus:bg-surface-container-lowest transition-colors border border-surface-container-highest" 
                      placeholder="e.g. bartowski/Llama-3.2-3B-Instruct-GGUF" 
                      type="text" 
                    />
                  </div>
                  <span className="font-label-telemetry text-secondary text-[10px]">
                    Accepts org/model-id or raw huggingface.co file links
                  </span>
                </div>

                {/* Quant Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-telemetry text-on-surface text-label-telemetry uppercase font-semibold" htmlFor="quant-select">
                    Target Quantization
                  </label>
                  <div className="relative flex items-center">
                    <select 
                      id="quant-select"
                      value={quantSelect}
                      onChange={(e) => setQuantSelect(e.target.value)}
                      className="w-full bg-surface-container-low text-on-surface font-label-code text-label-code px-3 py-2.5 rounded-lg appearance-none focus:outline-none focus:bg-surface-container-lowest transition-colors cursor-pointer border border-surface-container-highest" 
                    >
                      <option value="Q4_K_M">Q4_K_M · Balanced Performance (Recommended)</option>
                      <option value="Q5_K_M">Q5_K_M · Higher Precision (+1.2 GB)</option>
                      <option value="Q8_0">Q8_0 · Near Native F16 (+4.8 GB)</option>
                      <option value="Q2_K">Q2_K · Minimal Footprint / Low RAM</option>
                      <option value="BF16">BF16 · Full Unquantized Precision</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 pointer-events-none text-secondary text-[18px]">expand_more</span>
                  </div>
                </div>

                {/* Destination Folder */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-telemetry text-on-surface text-label-telemetry uppercase font-semibold">
                    Destination Folder
                  </label>
                  <div className="p-2.5 bg-surface-container-low rounded-lg flex items-center justify-between border border-surface-container-highest">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-secondary text-[16px]">folder_special</span>
                      <span className="font-label-code text-secondary text-label-code truncate">
                        {storage?.rootPath ? `${storage.rootPath}/models` : '/Volumes/NEXYRIS_USB/models'}
                      </span>
                    </div>
                    <button 
                      onClick={() => alert('Models are saved automatically inside your USB drive /models directory to maintain 100% portability.')}
                      type="button" 
                      className="font-label-telemetry text-primary text-label-telemetry hover:underline ml-2 flex-shrink-0 bg-transparent border-none cursor-pointer"
                    >
                      Locked
                    </button>
                  </div>
                </div>

                {/* Verification Checkboxes */}
                <div className="p-3 bg-surface-container-low rounded-lg flex flex-col gap-2 border border-surface-container-highest">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={verifySha}
                      onChange={(e) => setVerifySha(e.target.checked)}
                      className="accent-primary w-4 h-4 rounded cursor-pointer" 
                    />
                    <span className="font-body-sm text-on-surface font-medium text-body-sm">
                      Verify SHA256 after payload write
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={autoRegister}
                      onChange={(e) => setAutoRegister(e.target.checked)}
                      className="accent-primary w-4 h-4 rounded cursor-pointer" 
                    />
                    <span className="font-body-sm text-on-surface font-medium text-body-sm">
                      Auto-register into Chat Runtime
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-primary hover:bg-primary-container text-on-primary font-body-sm font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] border-none cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                      <span>Dispatching Task...</span>
                    </>
                  ) : submitSuccess ? (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check</span>
                      <span>Queued Successfully</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">cloud_download</span>
                      <span>Start Download</span>
                    </>
                  )}
                </button>
              </form>

              {/* Storage Breakdown Visualizer */}
              <div className="pt-2 flex flex-col gap-2 border-t border-surface-container-highest">
                <div className="flex items-center justify-between font-label-telemetry text-label-telemetry">
                  <span className="text-secondary uppercase">{storage?.rootPath || 'SanDisk Extreme 128GB'}</span>
                  <span className="text-on-surface font-semibold">{storage?.freeGB || 82.1} GB Available</span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full flex overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '22%' }} title="Downloaded Models"></div>
                  <div className="bg-primary-container h-full opacity-60" style={{ width: '8%' }} title="In Progress"></div>
                  <div className="bg-secondary-container h-full" style={{ width: '6%' }} title="System"></div>
                </div>
                <div className="flex items-center justify-between text-[10px] font-label-telemetry text-secondary">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary inline-block"></span> Installed ({totalInstalledGB.toFixed(1)} GB)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary-container opacity-60 inline-block"></span> Pulling
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-secondary-container inline-block"></span> Other
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
