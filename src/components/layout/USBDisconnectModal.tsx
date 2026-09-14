import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface USBDisconnectModalProps {
  isDisconnected: boolean;
  onRetry: () => void;
}

export const USBDisconnectModal: React.FC<USBDisconnectModalProps> = ({ isDisconnected, onRetry }) => {
  if (!isDisconnected) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(10, 5, 5, 0.92)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div className="glass-modal" style={{
        width: '480px',
        padding: '36px',
        textAlign: 'center',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        boxShadow: '0 0 40px rgba(239, 68, 68, 0.3)',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#ef4444',
        }}>
          <AlertOctagon size={36} />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f87171', marginBottom: '10px' }}>
          Portable USB Drive Disconnected
        </h2>

        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
          Nexyris has detected that the USB storage volume hosting your models and database was disconnected.
          <br /><br />
          <strong>To prevent data loss or host pollution, all operations have been safely paused.</strong>
          <br />
          Please reconnect your USB drive to resume.
        </p>

        <button
          className="btn btn-primary"
          onClick={onRetry}
          style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 600 }}
        >
          <RefreshCw size={16} />
          <span>Check Connection Again</span>
        </button>
      </div>
    </div>
  );
};
