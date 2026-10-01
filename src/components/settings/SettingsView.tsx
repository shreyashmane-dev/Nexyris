import React, { useState, useEffect } from 'react';
import { Settings, Shield, Sliders, HardDrive, Palette, Save, Check, Server, Plus, Trash2, Copy, RefreshCw, Terminal, Radio, Sun, Moon, Sparkles } from 'lucide-react';
import { HardwareInfo } from '../../types';
import { getStoredTheme, applyTheme, ThemeMode } from '../../lib/theme';
import { 
  fetchConfig, 
  updatePortableConfig, 
  updateHostConfig, 
  fetchMcpServers, 
  addMcpServer, 
  deleteMcpServer, 
  McpStatusResponse, 
  McpServerInfo,
  fetchUserProfile,
  saveUserProfile,
  fetchUserMemories,
  addUserMemory,
  deleteUserMemory
} from '../../lib/api';
import { UserProfile, UserMemory } from '../../types';

interface SettingsViewProps {
  hardware: HardwareInfo | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ hardware }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(getStoredTheme());
  const [activeTab, setActiveTab] = useState<'performance' | 'general' | 'storage' | 'privacy' | 'mcp' | 'profile'>('performance');
  const [threads, setThreads] = useState(4);
  const [gpuLayers, setGpuLayers] = useState(0);
  const [contextSize, setContextSize] = useState(4096);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [defaultApp, setDefaultApp] = useState('chat');
  const [savedMessage, setSavedMessage] = useState(false);

  // User Profile & Memory States
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userName, setUserName] = useState('');
  const [userTitle, setUserTitle] = useState('');
  const [userBio, setUserBio] = useState('');
  const [userEmoji, setUserEmoji] = useState('🚀');
  const [userInstructions, setUserInstructions] = useState('');
  const [userMemories, setUserMemories] = useState<UserMemory[]>([]);
  const [newMemKey, setNewMemKey] = useState('');
  const [newMemValue, setNewMemValue] = useState('');

  // MCP State
  const [mcpData, setMcpData] = useState<McpStatusResponse | null>(null);
  const [loadingMcp, setLoadingMcp] = useState(false);
  const [showAddServer, setShowAddServer] = useState(false);
  const [copiedMcpConfig, setCopiedMcpConfig] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerType, setNewServerType] = useState<'stdio' | 'sse'>('stdio');
  const [newServerCommand, setNewServerCommand] = useState('');
  const [newServerArgs, setNewServerArgs] = useState('');
  const [newServerUrl, setNewServerUrl] = useState('');

  useEffect(() => {
    loadSettings();
    loadMcpData();
  }, [hardware]);

  const loadMcpData = async () => {
    try {
      setLoadingMcp(true);
      const data = await fetchMcpServers();
      setMcpData(data);
    } catch (e) {
    } finally {
      setLoadingMcp(false);
    }
  };

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

      const prof = await fetchUserProfile();
      setUserProfile(prof);
      setUserName(prof.name || '');
      setUserTitle(prof.title || '');
      setUserBio(prof.bio || '');
      setUserEmoji(prof.avatar_emoji || '🚀');
      setUserInstructions(prof.custom_instructions || '');

      const mems = await fetchUserMemories();
      setUserMemories(mems);
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
          { id: 'profile', label: 'User Profile & Persona' },
          { id: 'general', label: 'General & Startup' },
          { id: 'mcp', label: 'Model Context Protocol (MCP)' },
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
                color: isActive ? '#dc2626' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid #dc2626' : '2px solid transparent',
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
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
              Studio Color Theme & Appearance
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Customize how Nexyris displays surfaces and contrast. Dark mode turns white surfaces into sleek black/charcoal while preserving signature crimson node accents.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { id: 'dark', label: 'Dark Charcoal', desc: 'Default studio surfaces', icon: Moon },
                { id: 'oled', label: 'Pure OLED', desc: 'Pitch black #000000', icon: Sparkles },
                { id: 'light', label: 'Studio Light', desc: 'Inverted light mode', icon: Sun },
              ].map((item) => {
                const isSelected = currentTheme === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCurrentTheme(item.id as ThemeMode);
                      applyTheme(item.id as ThemeMode);
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #dc2626' : '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'rgba(220, 38, 38, 0.08)' : 'var(--surface-container-low)',
                      color: 'var(--on-surface)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Icon size={18} color={isSelected ? '#dc2626' : 'var(--text-secondary)'} />
                      {isSelected && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626' }} />}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{item.label}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

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
      {/* MCP (Model Context Protocol) Tab */}
      {activeTab === 'mcp' && (
        <div style={{ maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Built-in MCP Server Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Server size={18} color="#dc2626" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                    Nexyris Native MCP Server
                  </h3>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                    color: '#10b981', 
                    padding: '2px 8px', 
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    ONLINE (JSON-RPC 2.0)
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Exposes local USB neural inference, GGUF model library, USB storage health, and sandboxed execution tools to any external MCP client (Claude Desktop, Cursor, Antigravity IDE, Windsurf).
                </p>
              </div>

              <button
                onClick={() => {
                  const snippet = JSON.stringify({
                    mcpServers: {
                      nexyris: {
                        command: "node",
                        args: [`${window.location.protocol}//${window.location.host}/server/mcp-server.js`]
                      }
                    }
                  }, null, 2);
                  navigator.clipboard.writeText(snippet);
                  setCopiedMcpConfig(true);
                  setTimeout(() => setCopiedMcpConfig(false), 2000);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                type="button"
              >
                {copiedMcpConfig ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                <span>{copiedMcpConfig ? 'Config Copied' : 'Copy Client Config'}</span>
              </button>
            </div>

            {/* Endpoints & Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-app)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  STDIO Command (Local Transport)
                </div>
                <div style={{ fontSize: '12.5px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  node server/mcp-server.js
                </div>
              </div>

              <div style={{ background: 'var(--bg-app)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  HTTP & SSE Endpoint (Network Transport)
                </div>
                <div style={{ fontSize: '12.5px', fontFamily: 'monospace', color: '#dc2626' }}>
                  http://127.0.0.1:38192/mcp
                </div>
              </div>
            </div>

            {/* Built-in Tools Table */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                Exposed MCP Tools & Resources ({mcpData?.builtIn.tools.length || 6})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(mcpData?.builtIn.tools || [
                  { name: 'nexyris_chat', description: 'Real-time neural chat inference from offline GGUF weights on USB.' },
                  { name: 'nexyris_list_models', description: 'List all verified local GGUF models on the USB pendrive.' },
                  { name: 'nexyris_system_status', description: 'Host CPU, RAM, GPU offload capacity, and USB partition telemetry.' },
                  { name: 'nexyris_search_history', description: 'Query conversation history and code projects in SQLite database.' },
                  { name: 'nexyris_run_command', description: 'Execute sandboxed commands confined to the USB pendrive.' },
                  { name: 'nexyris_execute_code', description: 'Run Python, JS, TypeScript, C++, Rust, Go code with local output capture.' },
                ]).map((tool) => (
                  <div 
                    key={tool.name}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'baseline', 
                      gap: '12px', 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>
                      {tool.name}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {tool.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* External MCP Servers Section */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0' }}>
                  External MCP Servers
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                  Add external Model Context Protocol servers (e.g. filesystem, github, fetch, postgres) to expand tool capabilities.
                </p>
              </div>

              <button
                onClick={() => setShowAddServer(!showAddServer)}
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '6px 14px' }}
                type="button"
              >
                <Plus size={14} />
                <span>{showAddServer ? 'Cancel' : 'Add MCP Server'}</span>
              </button>
            </div>

            {/* Add Server Form Drawer */}
            {showAddServer && (
              <div style={{ 
                background: 'var(--bg-app)', 
                padding: '16px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-subtle)',
                marginBottom: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>Register New MCP Server</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Server Identifier
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. filesystem, github, sqlite"
                      value={newServerName}
                      onChange={(e) => setNewServerName(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '12.5px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Transport Protocol
                    </label>
                    <select
                      value={newServerType}
                      onChange={(e) => setNewServerType(e.target.value as any)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '12.5px' }}
                    >
                      <option value="stdio">stdio (Local Command)</option>
                      <option value="sse">SSE / HTTP (Remote URL)</option>
                    </select>
                  </div>
                </div>

                {newServerType === 'stdio' ? (
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Executable Command
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. npx -y @modelcontextprotocol/server-filesystem D:/"
                      value={newServerCommand}
                      onChange={(e) => setNewServerCommand(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '12.5px' }}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Server URL
                    </label>
                    <input
                      type="text"
                      placeholder="http://127.0.0.1:8000/sse"
                      value={newServerUrl}
                      onChange={(e) => setNewServerUrl(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '12.5px' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  <button 
                    onClick={() => setShowAddServer(false)}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px' }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      if (!newServerName.trim()) {
                        alert('Please enter a server identifier');
                        return;
                      }
                      await addMcpServer({
                        name: newServerName.trim(),
                        type: newServerType,
                        command: newServerCommand.trim(),
                        url: newServerUrl.trim(),
                        enabled: true,
                      });
                      setNewServerName('');
                      setNewServerCommand('');
                      setNewServerUrl('');
                      setShowAddServer(false);
                      await loadMcpData();
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: '12px' }}
                    type="button"
                  >
                    Save MCP Server
                  </button>
                </div>
              </div>
            )}

            {/* List of Configured Servers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(!mcpData?.externalServers || mcpData.externalServers.length === 0) ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No external MCP servers configured yet. Click "Add MCP Server" above to connect tools like Filesystem, GitHub, or SQLite.
                </div>
              ) : (
                mcpData.externalServers.map((srv) => (
                  <div
                    key={srv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Radio size={16} color="#10b981" />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {srv.name}
                        </div>
                        <div style={{ fontSize: '11.5px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {srv.type === 'stdio' ? srv.command : srv.url}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                        Ready
                      </span>
                      <button
                        onClick={async () => {
                          if (srv.id) {
                            await deleteMcpServer(srv.id);
                            await loadMcpData();
                          }
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Delete MCP Server"
                        type="button"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
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

      {/* User Profile & Persona Tab */}
      {activeTab === 'profile' && (
        <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
              User Profile & Identity
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Information saved persistently in local SQLite on your USB drive. Injected into AI context to personalize responses.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    User Name / Alias
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Alex Vance"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={userTitle}
                    onChange={(e) => setUserTitle(e.target.value)}
                    placeholder="e.g. Senior Software Architect"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  About You (Bio)
                </label>
                <textarea
                  rows={2}
                  value={userBio}
                  onChange={(e) => setUserBio(e.target.value)}
                  placeholder="Details about your background and workflows..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '13px', resize: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Custom System Persona Instructions
                </label>
                <textarea
                  rows={3}
                  value={userInstructions}
                  onChange={(e) => setUserInstructions(e.target.value)}
                  placeholder="Direct instructions for the AI on how to format responses, tone, preferences..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '13px', resize: 'none' }}
                />
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await saveUserProfile({
                      name: userName,
                      title: userTitle,
                      bio: userBio,
                      avatar_emoji: userEmoji,
                      custom_instructions: userInstructions,
                    });
                    alert('Profile saved to USB database!');
                  } catch (e: any) {
                    alert('Error saving profile: ' + e.message);
                  }
                }}
                style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}
              >
                Save Profile to SQLite
              </button>
            </div>
          </div>

          {/* Memories Card */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
              Persistent AI Memories ({userMemories.length})
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Facts and preferences the AI remembers across all sessions.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                value={newMemKey}
                onChange={(e) => setNewMemKey(e.target.value)}
                placeholder="Topic (e.g. Favorite Language)"
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '12px' }}
              />
              <input
                type="text"
                value={newMemValue}
                onChange={(e) => setNewMemValue(e.target.value)}
                placeholder="Details (e.g. TypeScript strict)"
                style={{ flex: 2, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '12px' }}
              />
              <button
                type="button"
                onClick={async () => {
                  if (!newMemValue) return;
                  try {
                    const m = await addUserMemory({ key: newMemKey || 'Fact', value: newMemValue });
                    setUserMemories([m, ...userMemories]);
                    setNewMemKey('');
                    setNewMemValue('');
                  } catch (e: any) {
                    alert('Error: ' + e.message);
                  }
                }}
                style={{ padding: '8px 14px', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
              >
                + Add
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {userMemories.map((mem) => (
                <div key={mem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{mem.key}:</strong>{' '}
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{mem.value}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteUserMemory(mem.id);
                      setUserMemories(userMemories.filter(m => m.id !== mem.id));
                    }}
                    style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
