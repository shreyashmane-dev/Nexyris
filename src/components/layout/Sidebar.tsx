import React from 'react';
import { 
  MessageSquare, 
  Terminal, 
  Code2, 
  Cpu, 
  Download, 
  Activity, 
  Settings, 
  HardDrive, 
  Power,
  Usb
} from 'lucide-react';
import { AppMode, StorageInfo } from '../../types';

interface SidebarProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  storage: StorageInfo | null;
  activeDownloadsCount: number;
  onOpenShutdown: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMode,
  onSelectMode,
  storage,
  activeDownloadsCount,
  onOpenShutdown,
}) => {
  const navItems: Array<{ id: AppMode; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={18} /> },
    { id: 'terminal', label: 'Terminal', icon: <Terminal size={18} /> },
    { id: 'code', label: 'Code Assistant', icon: <Code2 size={18} /> },
    { id: 'image', label: 'Image Studio', icon: <Cpu size={18} color="#ec4899" /> },
    { id: 'models', label: 'Model Library', icon: <Cpu size={18} /> },
    { id: 'downloads', label: 'Downloads', icon: <Download size={18} />, badge: activeDownloadsCount },
    { id: 'diagnostics', label: 'Diagnostics', icon: <Activity size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <aside style={{
      width: '260px',
      height: '100vh',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      userSelect: 'none',
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '20px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)',
        }}>
          <Usb size={22} color="white" />
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.2px', color: '#fff' }}>
            Nexyris Local
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--status-ready)' }}></span>
            Portable AI Studio
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '4px 10px 8px' }}>
          Workspaces
        </div>
        {navItems.slice(0, 3).map((item) => {
          const isActive = currentMode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectMode(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: isActive ? '#60a5fa' : 'var(--text-secondary)',
                border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                fontSize: '13.5px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {item.icon}
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}

        <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '16px 10px 8px' }}>
          Management
        </div>
        {navItems.slice(3).map((item) => {
          const isActive = currentMode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectMode(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: isActive ? '#60a5fa' : 'var(--text-secondary)',
                border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                fontSize: '13.5px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge && item.badge > 0 ? (
                <span style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  padding: '2px 6px',
                }}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* USB Storage Gauge */}
      <div style={{
        padding: '14px 16px',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <HardDrive size={13} color="#94a3b8" />
            <span>{storage?.isRemovable ? 'USB Drive' : 'Storage Drive'}</span>
            <span style={{ color: 'var(--text-muted)' }}>({storage?.driveLetter || 'USB:'})</span>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--status-ready)' }}>
            {storage ? `${storage.freeGB} GB free` : 'Checking...'}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: '6px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: storage ? `${Math.min(100, Math.max(5, 100 - storage.freePercentage))}%` : '50%',
            background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
            borderRadius: '3px',
            transition: 'width 0.5s ease',
          }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '10px', color: 'var(--text-muted)' }}>
          <span>{storage?.fileSystem || 'exFAT'}</span>
          <span>{storage ? `${storage.usedGB} GB / ${storage.totalGB} GB` : ''}</span>
        </div>
      </div>

      {/* Safe Shutdown / Eject Button */}
      <div style={{ padding: '12px 14px' }}>
        <button
          onClick={onOpenShutdown}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '9px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          }}
        >
          <Power size={14} />
          <span>Safe Eject & Shutdown</span>
        </button>
      </div>
    </aside>
  );
};
