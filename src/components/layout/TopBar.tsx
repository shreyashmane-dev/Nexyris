import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  Cpu, 
  ShieldCheck, 
  Play, 
  Square, 
  Sparkles,
  Check,
  Plus
} from 'lucide-react';
import { AppMode, ModelItem, RuntimeStatus } from '../../types';

interface TopBarProps {
  currentMode: AppMode;
  models: ModelItem[];
  runtimeStatus: RuntimeStatus;
  onSelectModel: (modelId: string) => void;
  onStopModel: () => void;
  onNavigateToModels: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentMode,
  models,
  runtimeStatus,
  onSelectModel,
  onStopModel,
  onNavigateToModels,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getModeTitle = () => {
    switch (currentMode) {
      case 'chat': return 'AI Chat';
      case 'terminal': return 'Terminal AI Workspace';
      case 'code': return 'Code Assistant';
      case 'models': return 'Model Library & Hub';
      case 'downloads': return 'Download Manager';
      case 'diagnostics': return 'System Diagnostics';
      case 'settings': return 'Studio Settings';
      default: return 'Nexyris Local';
    }
  };

  const activeModel = runtimeStatus.currentModel;
  const isRunning = runtimeStatus.status === 'READY';
  const isLoading = runtimeStatus.status === 'STARTING' || runtimeStatus.status === 'LOADING_MODEL' || runtimeStatus.status === 'HEALTH_CHECKING';

  return (
    <header style={{
      height: '60px',
      backgroundColor: 'rgba(14, 20, 36, 0.75)',
      backdropFilter: 'var(--glass-blur)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'relative',
      zIndex: 20,
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
          {getModeTitle()}
        </h1>
      </div>

      {/* Center: Model Selector & Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} ref={dropdownRef}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '7px 14px',
              backgroundColor: 'rgba(21, 30, 51, 0.9)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all var(--transition-fast)',
            }}
          >
            {/* Model Status Indicator */}
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isRunning ? 'var(--status-ready)' : isLoading ? 'var(--status-active)' : 'var(--text-muted)',
              boxShadow: isRunning ? '0 0 8px #10b981' : isLoading ? '0 0 8px #38bdf8' : 'none',
            }} className={isLoading ? 'pulse-dot' : ''}></div>

            <Cpu size={15} color="#60a5fa" />

            <span style={{ fontWeight: 600 }}>
              {activeModel ? activeModel.name : (models.length > 0 ? 'Select a Model' : 'No Model Installed')}
            </span>

            {activeModel?.quantization && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '1px 5px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}>
                {activeModel.quantization}
              </span>
            )}

            <ChevronDown size={14} color="#94a3b8" />
          </button>

          {/* Model Switcher Dropdown */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              backgroundColor: 'var(--bg-modal)',
              backdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              padding: '8px',
              zIndex: 100,
              animation: 'fadeIn 0.15s ease-out',
            }}>
              <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Installed Models on USB ({models.length})
              </div>

              <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {models.length === 0 ? (
                  <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                    No models installed on your USB drive yet.
                  </div>
                ) : (
                  models.map((m) => {
                    const isCurrent = activeModel?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          onSelectModel(m.id);
                          setDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: isCurrent ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                          border: isCurrent ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                          color: isCurrent ? '#60a5fa' : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '12.5px',
                          textAlign: 'left',
                          transition: 'all var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => {
                          if (!isCurrent) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{m.name}</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                            {m.sizeGB ? `${m.sizeGB} GB` : ''} {m.quantization ? `• ${m.quantization}` : ''}
                          </div>
                        </div>

                        {isCurrent ? (
                          <Check size={14} color="#60a5fa" />
                        ) : (
                          <Play size={12} color="#94a3b8" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '6px', paddingTop: '6px' }}>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavigateToModels();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={13} />
                  <span>Browse & Install More Models</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Runtime Stop Button if active */}
        {isRunning && (
          <button
            onClick={onStopModel}
            title="Unload model from RAM"
            style={{
              padding: '6px 10px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-full)',
              color: '#f87171',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Square size={10} fill="#f87171" />
            <span>Unload</span>
          </button>
        )}
      </div>

      {/* Right: Local/Offline Verification Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 'var(--radius-full)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--status-ready)',
          letterSpacing: '0.4px',
        }}>
          <ShieldCheck size={13} />
          <span>100% LOCAL • OFFLINE</span>
        </div>
      </div>
    </header>
  );
};
