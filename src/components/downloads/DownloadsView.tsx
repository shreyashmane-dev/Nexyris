import React, { useState, useEffect } from 'react';
import { Download, Pause, Play, X, RefreshCw, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { DownloadTask } from '../../types';
import { fetchDownloads, pauseDownload, resumeDownload, cancelDownload } from '../../lib/api';

export const DownloadsView: React.FC = () => {
  const [downloadData, setDownloadData] = useState<{ active: DownloadTask | null; queue: DownloadTask[]; incomplete: any[] }>({
    active: null,
    queue: [],
    incomplete: [],
  });

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 1500);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const data = await fetchDownloads();
      setDownloadData(data);
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

  const active = downloadData.active;
  const queue = downloadData.queue;
  const incomplete = downloadData.incomplete;

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const gb = bytes / (1024 ** 3);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', backgroundColor: 'var(--bg-app)' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Download Manager
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Controlled sequential downloads with HTTP Range resume and USB write protection.
        </p>
      </div>

      {/* Active Download Card */}
      {active ? (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <span className="status-pill active" style={{ marginBottom: '6px' }}>
                Downloading Now
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
                {active.name}
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {active.status === 'downloading' ? (
                <button className="btn btn-secondary" onClick={() => handlePause(active.id)}>
                  <Pause size={14} />
                  <span>Pause</span>
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => handleResume(active.id)}>
                  <Play size={14} fill="white" />
                  <span>Resume</span>
                </button>
              )}

              <button className="btn btn-danger" onClick={() => handleCancel(active.id)}>
                <X size={14} />
                <span>Cancel</span>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            height: '10px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '5px',
            overflow: 'hidden',
            marginBottom: '12px',
          }}>
            <div style={{
              height: '100%',
              width: `${active.percent}%`,
              background: 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)',
              transition: 'width 0.3s ease',
            }}></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <div>
              <strong>{active.percent}%</strong> ({formatBytes(active.downloadedBytes)} / {formatBytes(active.totalBytes)})
            </div>
            <div>
              Speed: <strong style={{ color: '#38bdf8' }}>{active.speedMBs} MB/s</strong>
              {active.etaSeconds > 0 ? ` • ETA: ${Math.floor(active.etaSeconds / 60)}m ${active.etaSeconds % 60}s` : ''}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', marginBottom: '24px', color: 'var(--text-muted)' }}>
          <Download size={28} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>No active downloads</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>Browse the Model Library to start a download.</div>
        </div>
      )}

      {/* Interrupted / Incomplete Downloads Section */}
      {incomplete.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>Interrupted Downloads Detected on USB</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {incomplete.map((item) => (
              <div key={item.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {item.currentGB} GB already downloaded ({item.progressPercent}% of total)
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" onClick={() => handleResume(item.id)}>
                    <Play size={13} fill="white" />
                    <span>Resume from {item.currentGB} GB</span>
                  </button>
                  <button className="btn btn-secondary" onClick={() => handleCancel(item.id)}>
                    <X size={13} />
                    <span>Discard</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queue Section */}
      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>
        Download Queue ({queue.length})
      </h3>

      {queue.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Queue is empty.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {queue.map((task) => (
            <div key={task.id} className="glass-panel" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{task.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Status: {task.status} {task.error ? `• Error: ${task.error}` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary" onClick={() => handleCancel(task.id)}>
                  <X size={13} />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
