import React, { useState, useRef, useEffect } from 'react';
import { AppMode, ModelItem, RuntimeStatus, HardwareInfo } from '../../types';

interface TopBarProps {
  currentMode: AppMode;
  models: ModelItem[];
  runtimeStatus: RuntimeStatus;
  hardware?: HardwareInfo | null;
  onSelectModel: (modelId: string) => void;
  onStopModel: () => void;
  onNavigateToModels: () => void;
  onOpenSettings?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentMode,
  models,
  runtimeStatus,
  hardware,
  onSelectModel,
  onStopModel,
  onNavigateToModels,
  onOpenSettings,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setDropdownOpen(prev => !prev);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const activeModel = runtimeStatus.currentModel;
  const isRunning = runtimeStatus.status === 'READY';
  const isStarting = runtimeStatus.status === 'STARTING' || runtimeStatus.status === 'LOADING_MODEL';

  const filteredModels = models.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.quantization && m.quantization.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatRam = () => {
    if (hardware?.ram) {
      const usedGB = Math.max(0, hardware.ram.totalGB - hardware.ram.freeGB).toFixed(1);
      return `${usedGB} / ${hardware.ram.totalGB} GB`;
    }
    return '4.8 / 32 GB';
  };

  return (
    <header className="h-14 bg-surface-container-lowest border-b border-surface-container-highest z-30 flex items-center justify-between px-6 flex-shrink-0 relative">
      {/* Left: Model Trigger & Runtime State */}
      <div className="flex items-center gap-3" ref={dropdownRef}>
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1 bg-surface-container-low border border-surface-container-highest rounded-lg hover:border-outline transition-colors text-left cursor-pointer" 
            type="button"
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-headline-md text-[12px] font-semibold text-on-surface leading-tight truncate max-w-[160px]">
                  {activeModel ? activeModel.name : (models.length > 0 ? 'Select a Model' : 'No Model')}
                </span>
                <span className="material-symbols-outlined text-[14px] text-secondary">keyboard_arrow_down</span>
              </div>
              <span className="font-label-telemetry text-[10px] text-secondary leading-none">
                {activeModel 
                  ? `${activeModel.sizeGB || '4.5'} GB · ${activeModel.quantization || 'Q4_K_M'} · Local Engine` 
                  : `${models.length} Models on USB`}
              </span>
            </div>
            <span className="font-label-keycap text-[9px] text-secondary bg-surface-container-highest px-1 py-0.5 rounded ml-1">
              Ctrl+K
            </span>
          </button>

          {/* Quick Model Switcher Popover Dropdown */}
          {dropdownOpen && (
            <div className="absolute top-12 left-0 z-50 w-96 bg-surface-container-lowest rounded-xl shadow-xl p-3 flex flex-col gap-2 border border-surface-container-highest animate-in fade-in zoom-in-95 duration-100">
              {/* Popover Header & Instant Search */}
              <div className="flex items-center justify-between px-1 pb-1">
                <div className="flex items-center gap-2">
                  <span className="font-headline-md text-body-md text-on-surface font-semibold">Switch Model</span>
                  <span className="font-label-telemetry text-body-sm text-secondary bg-surface-container-high px-1.5 py-0.5 rounded">
                    {models.length} Local
                  </span>
                </div>
                <button 
                  onClick={() => setDropdownOpen(false)}
                  className="font-label-keycap text-body-sm text-secondary bg-surface-container px-1.5 py-0.5 rounded hover:bg-surface-container-high border-none cursor-pointer"
                >
                  ESC
                </button>
              </div>

              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-secondary text-[16px]">search</span>
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-surface-container-low text-on-surface rounded-lg font-body-sm placeholder:text-secondary focus:outline-none focus:bg-surface-container-lowest border border-transparent focus:border-outline transition-colors" 
                  placeholder="Search models... (Ctrl+K)" 
                  type="text"
                  autoFocus
                />
              </div>

              {/* Models List */}
              <div className="flex flex-col gap-1 max-h-72 overflow-y-auto mt-1 pr-0.5">
                {filteredModels.length === 0 ? (
                  <div className="py-6 text-center text-secondary font-body-sm">
                    No matching models found.
                  </div>
                ) : (
                  filteredModels.map((m) => {
                    const isCurrent = activeModel?.id === m.id;
                    return (
                      <div 
                        key={m.id}
                        onClick={() => {
                          onSelectModel(m.id);
                          setDropdownOpen(false);
                        }}
                        className={`flex items-start justify-between p-2.5 rounded-lg cursor-pointer transition-colors group ${
                          isCurrent ? 'bg-surface-container-high' : 'hover:bg-surface-container-low'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            isCurrent ? 'bg-primary animate-pulse' : 'bg-tertiary'
                          }`}></div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-headline-md text-body-md font-semibold truncate ${
                                isCurrent ? 'text-on-surface' : 'text-on-surface group-hover:text-primary transition-colors'
                              }`}>
                                {m.name}
                              </span>
                              {isCurrent && (
                                <span className="font-label-telemetry text-body-sm text-primary bg-surface-container-highest px-1.5 py-0.2 rounded font-medium">
                                  Active
                                </span>
                              )}
                              {!isCurrent && (
                                <span className="font-label-telemetry text-body-sm text-tertiary bg-surface-container px-1.5 py-0.2 rounded font-medium">
                                  Ready
                                </span>
                              )}
                            </div>
                            <span className="font-label-telemetry text-body-sm text-secondary mt-0.5 truncate">
                              {m.sizeGB ? `${m.sizeGB} GB` : ''} · GGUF · {m.quantization || 'Q4_K_M'} · Cached on USB
                            </span>
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                        ) : (
                          <button 
                            className="opacity-0 group-hover:opacity-100 font-label-telemetry text-body-sm text-on-surface px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-highest transition-opacity border-none cursor-pointer" 
                            type="button"
                          >
                            Swap
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown Footer Action Links */}
              <div className="flex items-center justify-between pt-2 px-1 bg-surface-container-low rounded-lg p-2 mt-1">
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavigateToModels();
                  }}
                  className="flex items-center gap-1.5 font-body-sm text-primary font-medium hover:underline bg-transparent border-none cursor-pointer p-0" 
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px]">add_circle</span>
                  <span>Add Model (.gguf)</span>
                </button>
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavigateToModels();
                  }}
                  className="flex items-center gap-1 font-label-telemetry text-body-sm text-secondary hover:text-on-surface bg-transparent border-none cursor-pointer p-0"
                >
                  <span>Manage Storage</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-surface-container-highest"></div>

        {/* Runtime Status Pill */}
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${
            isRunning ? 'bg-primary animate-pulse' : isStarting ? 'bg-secondary animate-ping' : 'bg-secondary'
          }`}></span>
          <span className={`font-label-telemetry text-[11px] font-semibold uppercase tracking-wide ${
            isRunning ? 'text-primary' : 'text-secondary'
          }`}>
            {isRunning ? 'LOCAL RUNTIME ACTIVE' : isStarting ? 'STARTING MODEL...' : 'RUNTIME OFFLINE'}
          </span>
        </div>

        {(isRunning || isStarting || activeModel) && onStopModel && (
          <button
            onClick={onStopModel}
            title="Stop running model and free system memory"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white transition-all border-none cursor-pointer shadow-xs ml-2"
            type="button"
          >
            <span className="material-symbols-outlined text-[15px]">stop_circle</span>
            <span>Stop Model</span>
          </button>
        )}
      </div>

      {/* Right: Hardware Telemetry, Search, and User Controls */}
      <div className="flex items-center gap-4">
        {/* Telemetry Pill */}
        <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded bg-surface-container border border-surface-container-highest font-label-telemetry text-[11px]">
          <span className="text-secondary">
            RAM: <span className="text-on-surface font-medium">{formatRam()}</span>
          </span>
          <span className="text-secondary">
            VRAM: <span className="text-on-surface font-medium">
              {hardware?.gpu.vramMB ? `${(hardware.gpu.vramMB / 1024).toFixed(1)} GB` : '6.1 GB'}
            </span>
          </span>
          <span className="text-primary font-medium">
            {runtimeStatus.lastMetrics?.speedTokPerSec 
              ? `${runtimeStatus.lastMetrics.speedTokPerSec.toFixed(1)} tok/s` 
              : '14.2 tok/s'}
          </span>
        </div>

        {/* Quick Search Shortcut */}
        <button 
          onClick={onNavigateToModels}
          className="flex items-center gap-1.5 px-2 py-1 rounded border border-surface-container-highest text-secondary hover:text-on-surface bg-surface-container-low cursor-pointer transition-colors" 
          type="button"
          title="Browse Models (Ctrl+/)"
        >
          <span className="material-symbols-outlined text-[15px]">search</span>
          <span className="font-label-keycap text-[9px] bg-surface-container-highest px-1 py-0.5 rounded">Ctrl+/</span>
        </button>

        {/* Tune / Settings Link */}
        {onOpenSettings && (
          <button 
            onClick={onOpenSettings}
            className="text-secondary hover:text-on-surface transition-colors bg-transparent border-none cursor-pointer p-0 flex items-center" 
            title="Studio Settings"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </button>
        )}

        {/* Avatar Badge */}
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-xs">
          <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
        </div>
      </div>
    </header>
  );
};
