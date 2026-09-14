import React, { useState, useEffect } from 'react';
import { Settings, Shield, Sliders, HardDrive, Palette, Save, Check } from 'lucide-react';
import { HardwareInfo } from '../../types';
import { fetchConfig, updatePortableConfig, updateHostConfig } from '../../lib/api';

interface SettingsViewProps {
  hardware: HardwareInfo | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ hardware }) => {
  const [activeTab, setActiveTab] = useState<'performance' | 'general' | 'storage' | 'privacy'>('performance');
  const [threads, setThreads] = useState(4);
  const [gpuLayers, setGpuLayers] = useState(0);
  const [contextSize, setContextSize] = useState(4096);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [defaultApp, setDefaultApp] = useState('chat');
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [hardware]);

  const loadSettings = async () => {
    try {
      const data = await fetchConfig();
      if (data.host) {
        setThreads(data.host.threads || 4);
        setGpuLayers(data.host.gpuLayers || 0);
        setContextSize(data.host.contextSize || 4096);
        setTemperature(data.host.temperature || 0.7);
        setTopP(data.host.topP || 0.9);
      }
      if (data.portable) {
        setDefaultApp(data.portable.defaultApplication || 'chat');
      }
    } catch (e) {}
  };

  const handleSaveSettings = async () => {
    try {
      await updateHostConfig({
        threads: Number(threads),
        gpuLayers: Number(gpuLayers),
        contextSize: Number(contextSize),
        temperature: Number(temperature),
        topP: Number(topP),
      });

      await updatePortableConfig({
        defaultApplication: defaultApp,
      });

      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2500);
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  return (
    <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', backgroundColor: 'var(--bg-app)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Studio Settings
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Configure inference parameters, host tuning, and portable preferences.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleSaveSettings}>
          {savedMessage ? <Check size={14} color="#10b981" /> : <Save size={14} />}
          <span>{savedMessage ? 'Settings Saved' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '24px',
      }}>
        {[
          { id: 'performance', label: 'AI Performance & Hardware Tuning' },
          { id: 'general', label: 'General & Startup' },
          { id: 'storage', label: 'Storage & Portability' },
          { id: 'privacy', label: 'Privacy & Offline Mode' },
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
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
              CPU Threads Allocation
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Number of CPU threads to allocate to the local inference runtime. Recommended: {hardware?.recommendedConfig.threads || 4} threads.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input
                type="range"
                min={1}
                max={hardware?.cpu.logicalThreads || 16}
                value={threads}
                onChange={(e) => setThreads(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '15px', fontWeight: 700, minWidth: '40px' }}>{threads}</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
              GPU Layer Offloading (-ngl)
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Number of model layers to offload to GPU VRAM. Set to 0 for pure CPU mode (most compatible across USB hosts).
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input
                type="range"
                min={0}
                max={99}
                value={gpuLayers}
                onChange={(e) => setGpuLayers(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '15px', fontWeight: 700, minWidth: '40px' }}>
                {gpuLayers === 0 ? '0 (CPU)' : gpuLayers}
              </span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
              Context Window Size (Tokens)
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Larger context sizes allow longer conversation history and larger code files, but require more RAM.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              {[2048, 4096, 8192, 16384].map((size) => (
                <button
                  key={size}
                  onClick={() => setContextSize(size)}
                  className={`btn ${contextSize === size ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '10px' }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>
              Sampling Parameters
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span>Temperature:</span>
                  <strong>{temperature}</strong>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.5}
                  step={0.05}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span>Top-P:</span>
                  <strong>{topP}</strong>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={topP}
                  onChange={(e) => setTopP(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* General Tab */}
      {activeTab === 'general' && (
        <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
              Default Startup Workspace
            </h3>

            <select
              value={defaultApp}
              onChange={(e) => setDefaultApp(e.target.value)}
              style={{ width: '100%', padding: '10px' }}
            >
              <option value="chat">AI Chat (Default)</option>
              <option value="terminal">Terminal AI Workspace</option>
              <option value="code">Code Assistant</option>
              <option value="models">Model Library</option>
            </select>
          </div>
        </div>
      )}

      {/* Storage Tab */}
      {activeTab === 'storage' && (
        <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
              USB Portability Guarantee
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              All configuration, SQLite databases, and models are referenced strictly through relative paths derived from the portable USB root. When you plug this drive into another computer with a different drive letter (e.g. from E: to F:), no reconfiguration is required.
            </p>
          </div>
        </div>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#10b981', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} />
              <span>100% Local Inference & Privacy</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '14px' }}>
              <div>✓ <strong>Local Inference:</strong> All prompt evaluations and token generations happen on your PC's hardware.</div>
              <div>✓ <strong>Zero Cloud Telemetry:</strong> Conversations and prompts are never transmitted to any third-party servers.</div>
              <div>✓ <strong>Portable Storage:</strong> Conversations and code projects remain on the USB storage drive.</div>
              <div>✓ <strong>Air-Gapped Operation:</strong> Once models are downloaded, Nexyris requires no internet connection.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
