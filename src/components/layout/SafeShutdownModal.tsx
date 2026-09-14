import React, { useState } from 'react';
import { Power, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { requestSafeShutdown } from '../../lib/api';

interface SafeShutdownModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SafeShutdownModal: React.FC<SafeShutdownModalProps> = ({ isOpen, onClose }) => {
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [shutdownComplete, setShutdownComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    setError(null);
    try {
      await requestSafeShutdown();
      setShutdownComplete(true);
    } catch (err: any) {
      setError(err.message || 'Error occurred during shutdown');
      setIsShuttingDown(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div className="glass-modal" style={{ width: '440px', padding: '28px', textAlign: 'center' }}>
        {!shutdownComplete ? (
          <>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#ef4444',
            }}>
              <Power size={28} />
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              Shut Down Nexyris Local?
            </h2>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
              This will cleanly stop the local AI runtime, flush all conversations and logs to the USB storage, and release all host resources.
            </p>

            {error && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#f87171',
                fontSize: '12px',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isShuttingDown}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleShutdown}
                disabled={isShuttingDown}
                style={{ flex: 1 }}
              >
                {isShuttingDown ? (
                  <>
                    <Loader2 size={16} className="pulse-dot" />
                    <span>Stopping...</span>
                  </>
                ) : (
                  <span>Shut Down & Safe Eject</span>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="animate-fade-in">
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#10b981',
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', marginBottom: '8px' }}>
              Safe to Eject USB Drive
            </h2>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
              ✓ AI runtime process terminated<br />
              ✓ SQLite database safely closed<br />
              ✓ Temporary files flushed<br />
              You can now safely disconnect your USB pendrive.
            </p>

            <button
              className="btn btn-primary"
              onClick={() => window.close()}
              style={{ width: '100%' }}
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
