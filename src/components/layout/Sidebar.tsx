import React, { useState } from 'react';
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
  Usb,
  ChevronLeft,
  ChevronRight
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
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      width: isCollapsed ? '68px' : '230px',
      height: '100vh',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      userSelect: 'none',
      position: 'relative',
      zIndex: 10,
      transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* Brand Header */}
      <div style={{
        padding: isCollapsed ? '16px 14px' : '18px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(59, 130, 246, 0.35)',
            flexShrink: 0,
          }}>
            <Usb size={20} color="white" />
          </div>
          {!isCollapsed && (
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: '700', letterSpacing: '-0.2px', color: '#fff' }}>
                Nexyris Local
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--status-ready)' }}></span>
                Portable Studio
              </div>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Collapse Sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div style={{ textAlign: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setIsCollapsed(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="Expand Sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: isCollapsed ? '10px 8px' : '12px 10px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const isActive = currentMode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectMode(item.id)}
              title={isCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '10px 0' : '9px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isActive ? 'rgba(59, 130, 246, 0.16)' : 'transparent',
                color: isActive ? '#60a5fa' : 'var(--text-secondary)',
                border: isActive ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
                position: 'relative',
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
                {!isCollapsed && <span>{item.label}</span>}
              </div>
              {item.badge && item.badge > 0 ? (
                <span style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  padding: '1px 6px',
                  position: isCollapsed ? 'absolute' : 'static',
                  top: isCollapsed ? '4px' : undefined,
                  right: isCollapsed ? '4px' : undefined,
                }}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* USB Storage Gauge */}
      {!isCollapsed && (
        <div style={{
          padding: '12px 14px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <HardDrive size={13} color="#94a3b8" />
              <span>{storage?.driveLetter || 'USB:'}</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--status-ready)' }}>
              {storage ? `${storage.freeGB} GB free` : 'Checking...'}
            </span>
          </div>

          <div style={{
            height: '5px',
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
        </div>
      )}

      {/* Safe Shutdown Button */}
      <div style={{ padding: isCollapsed ? '10px 8px' : '10px 12px' }}>
        <button
          onClick={onOpenShutdown}
          title={isCollapsed ? "Safe Eject & Shutdown" : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            color: '#fb7185',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(244, 63, 94, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(244, 63, 94, 0.1)';
          }}
        >
          <Power size={14} />
          {!isCollapsed && <span>Safe Eject</span>}
        </button>
      </div>
    </aside>
  );
};
