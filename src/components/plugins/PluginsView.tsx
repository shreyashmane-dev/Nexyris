import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  FileText, 
  CloudSun, 
  BookOpen, 
  Code2, 
  Cable, 
  Check, 
  AlertCircle, 
  Play, 
  ExternalLink, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight,
  Shield,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  X,
  Layers,
  HelpCircle
} from 'lucide-react';
import { WorldPlugin, PluginExecutionResult } from '../../types';
import { fetchPlugins, togglePlugin, executePluginTool, createCustomPlugin, deleteCustomPlugin } from '../../lib/api';

export const PluginsView: React.FC = () => {
  const [plugins, setPlugins] = useState<WorldPlugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<string>('world_search');

  // Sandbox Test States
  const [testQuery, setTestQuery] = useState('latest quantum computing discoveries');
  const [testUrl, setTestUrl] = useState('https://news.ycombinator.com');
  const [testCity, setTestCity] = useState('Tokyo');
  const [testTopic, setTestTopic] = useState('Artificial intelligence');
  const [testRepo, setTestRepo] = useState('facebook/react');
  const [testFilePath, setTestFilePath] = useState('package.json');
  const [testHttpUrl, setTestHttpUrl] = useState('https://httpbin.org/get');
  const [testCustomParams, setTestCustomParams] = useState('');

  const [executing, setExecuting] = useState(false);
  const [testResult, setTestResult] = useState<PluginExecutionResult | null>(null);

  // Add Custom Plugin Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customMethod, setCustomMethod] = useState<'GET' | 'POST'>('GET');
  const [customCategory, setCustomCategory] = useState('integration');
  const [customHeaders, setCustomHeaders] = useState('');
  const [addingPlugin, setAddingPlugin] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const list = await fetchPlugins();
      setPlugins(list);
    } catch (e) {
      console.error('Failed to load plugins:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlugin = async (id: string, currentEnabled: boolean) => {
    try {
      await togglePlugin(id, !currentEnabled);
      setPlugins(prev => prev.map(p => p.id === id ? { ...p, enabled: !currentEnabled } : p));
    } catch (e: any) {
      alert('Failed to toggle plugin: ' + e.message);
    }
  };

  const handleRunTest = async (pluginId: string, tool: string, params: any) => {
    try {
      setExecuting(true);
      setTestResult(null);
      const res = await executePluginTool(pluginId, tool, params);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        pluginId,
        toolName: tool,
        elapsedMs: 0,
        error: err.message
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleCreatePlugin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customEndpoint.trim()) {
      setAddError('Plugin name and endpoint URL are required');
      return;
    }

    try {
      setAddingPlugin(true);
      setAddError(null);

      let parsedHeaders = {};
      if (customHeaders.trim()) {
        try {
          parsedHeaders = JSON.parse(customHeaders);
        } catch (err) {
          setAddError('Headers must be valid JSON (e.g. {"Authorization": "Bearer ..."})');
          setAddingPlugin(false);
          return;
        }
      }

      const newPlugin = await createCustomPlugin({
        name: customName.trim(),
        description: customDesc.trim() || `Custom HTTP connector for ${customEndpoint.trim()}`,
        endpoint: customEndpoint.trim(),
        method: customMethod,
        category: customCategory,
        headers: parsedHeaders,
        icon: 'cable'
      });

      setShowAddModal(false);
      setCustomName('');
      setCustomDesc('');
      setCustomEndpoint('');
      setCustomHeaders('');
      await loadPlugins();
      setSelectedPlugin(newPlugin.id);
    } catch (err: any) {
      setAddError(err.message || 'Failed to create custom plugin');
    } finally {
      setAddingPlugin(false);
    }
  };

  const handleDeleteCustomPlugin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this custom plugin?')) return;
    try {
      await deleteCustomPlugin(id);
      await loadPlugins();
      if (selectedPlugin === id) {
        setSelectedPlugin('world_search');
      }
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    }
  };

  const getPluginIcon = (id: string) => {
    switch (id) {
      case 'world_search': return <Search className="text-primary" size={20} />;
      case 'web_fetch': return <FileText className="text-tertiary" size={20} />;
      case 'wikipedia': return <BookOpen className="text-blue-500" size={20} />;
      case 'world_weather': return <CloudSun className="text-amber-500" size={20} />;
      case 'github_explorer': return <Code2 className="text-purple-500" size={20} />;
      case 'http_webhook': return <Cable className="text-emerald-500" size={20} />;
      default: return <Cable className="text-rose-400" size={20} />;
    }
  };

  const activePluginObj = plugins.find(p => p.id === selectedPlugin);

  return (
    <div className="flex-1 flex flex-col h-full bg-surface overflow-y-auto selection:bg-rose-500/20 selection:text-rose-200">
      <div className="p-6 md:p-8 flex flex-col gap-6 max-w-[1440px] mx-auto w-full">
        
        {/* Header Banner */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container-highest shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 shadow-xs">
              <Globe size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">
                  World Connect Plugins Hub
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-telemetry text-xs font-semibold">
                  LIVE INTERNET CONNECTORS & CUSTOM WEBHOCKS
                </span>
              </div>
              <p className="font-body-sm text-sm text-secondary mt-1 max-w-2xl">
                Break the offline isolation barrier whenever you choose. Connect your portable local AI to live search engines, web articles, encyclopedias, weather stations, and GitHub repositories in real time — or add your own custom webhooks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-center flex-shrink-0">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-white font-body-sm text-xs font-semibold transition-all shadow-sm cursor-pointer border-none"
            >
              <Plus size={14} />
              <span>Add Custom Plugin</span>
            </button>

            <button
              onClick={loadPlugins}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-xs transition-colors border-none cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 2-Column Layout: Plugins Grid & Interactive Sandbox */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Plugins List (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-headline-md text-sm font-semibold text-on-surface uppercase tracking-wider">
                Installed Plugins ({plugins.length})
              </span>
              <span className="font-label-telemetry text-xs text-secondary">
                {plugins.filter(p => p.enabled).length} Active
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {plugins.map((plugin) => {
                const isSelected = selectedPlugin === plugin.id;
                return (
                  <div
                    key={plugin.id}
                    onClick={() => setSelectedPlugin(plugin.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-3 ${
                      isSelected
                        ? 'bg-surface-container-lowest border-primary shadow-sm ring-1 ring-primary/20'
                        : 'bg-surface-container-low border-surface-container-highest hover:bg-surface-container-lowest'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0 shadow-xs">
                          {getPluginIcon(plugin.id)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-headline-md text-sm font-semibold text-on-surface truncate">
                              {plugin.name}
                            </span>
                            <span className="font-label-telemetry text-[10px] px-2 py-0.5 rounded bg-surface-container text-secondary uppercase font-medium">
                              {plugin.category}
                            </span>
                            {plugin.isCustom && (
                              <span className="font-label-telemetry text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase font-semibold">
                                Custom
                              </span>
                            )}
                          </div>
                          <p className="font-body-sm text-xs text-secondary mt-1 leading-relaxed">
                            {plugin.description}
                          </p>
                        </div>
                      </div>

                      {/* Right controls: Toggle & optional Delete */}
                      <div className="flex items-center gap-2">
                        {plugin.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomPlugin(plugin.id, e)}
                            className="p-1 rounded text-secondary hover:text-red-400 hover:bg-surface-container transition-colors cursor-pointer border-none bg-transparent"
                            title="Delete custom plugin"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePlugin(plugin.id, plugin.enabled);
                          }}
                          className="text-secondary hover:text-on-surface transition-colors border-none bg-transparent cursor-pointer p-0"
                          title={plugin.enabled ? 'Click to disable' : 'Click to enable'}
                        >
                          {plugin.enabled ? (
                            <ToggleRight size={28} className="text-primary" />
                          ) : (
                            <ToggleLeft size={28} className="text-secondary" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Tools Provided */}
                    <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-surface-container-highest/60">
                      <span className="font-label-telemetry text-[10px] text-secondary">Available Tools:</span>
                      {(plugin.tools || []).map((tool, idx) => (
                        <span
                          key={idx}
                          className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface border border-surface-container-highest"
                        >
                          {tool.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Interactive Sandbox (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-headline-md text-sm font-semibold text-on-surface uppercase tracking-wider">
                Live Test Sandbox
              </span>
              <span className="font-label-telemetry text-xs text-primary font-medium">
                {activePluginObj?.name || 'Select a plugin'}
              </span>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest p-5 shadow-sm flex flex-col gap-4">
              
              {/* Selected Plugin Controls */}
              {selectedPlugin === 'world_search' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Search size={16} className="text-primary" />
                    <span className="font-headline-md text-xs font-semibold text-on-surface">
                      Test Live DuckDuckGo Search
                    </span>
                  </div>
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="Enter keywords to search..."
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleRunTest('world_search', 'web_search', { query: testQuery, limit: 3 })}
                    disabled={executing || !testQuery.trim()}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-body-sm text-xs font-semibold hover:bg-primary-container transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    <Play size={13} />
                    <span>{executing ? 'Searching Web...' : 'Execute Live Search'}</span>
                  </button>
                </div>
              )}

              {selectedPlugin === 'web_fetch' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-tertiary" />
                    <span className="font-headline-md text-xs font-semibold text-on-surface">
                      Test Webpage Content Reader
                    </span>
                  </div>
                  <input
                    type="text"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleRunTest('web_fetch', 'fetch_webpage', { url: testUrl, maxChars: 3000 })}
                    disabled={executing || !testUrl.trim()}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-body-sm text-xs font-semibold hover:bg-primary-container transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    <Play size={13} />
                    <span>{executing ? 'Reading Webpage...' : 'Fetch & Extract Markdown'}</span>
                  </button>
                </div>
              )}

              {selectedPlugin === 'world_weather' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <CloudSun size={16} className="text-amber-500" />
                    <span className="font-headline-md text-xs font-semibold text-on-surface">
                      Test Global Weather & Timezone
                    </span>
                  </div>
                  <input
                    type="text"
                    value={testCity}
                    onChange={(e) => setTestCity(e.target.value)}
                    placeholder="City name (e.g. London, Tokyo)"
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleRunTest('world_weather', 'get_weather', { location: testCity })}
                    disabled={executing || !testCity.trim()}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-body-sm text-xs font-semibold hover:bg-primary-container transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    <Play size={13} />
                    <span>{executing ? 'Getting Weather...' : 'Fetch Live Weather'}</span>
                  </button>
                </div>
              )}

              {selectedPlugin === 'wikipedia' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-blue-500" />
                    <span className="font-headline-md text-xs font-semibold text-on-surface">
                      Test Wikipedia Knowledge Query
                    </span>
                  </div>
                  <input
                    type="text"
                    value={testTopic}
                    onChange={(e) => setTestTopic(e.target.value)}
                    placeholder="Topic or person..."
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleRunTest('wikipedia', 'wikipedia_lookup', { topic: testTopic })}
                    disabled={executing || !testTopic.trim()}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-body-sm text-xs font-semibold hover:bg-primary-container transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    <Play size={13} />
                    <span>{executing ? 'Querying Wikipedia...' : 'Lookup Wikipedia Summary'}</span>
                  </button>
                </div>
              )}

              {selectedPlugin === 'github_explorer' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Code2 size={16} className="text-purple-500" />
                    <span className="font-headline-md text-xs font-semibold text-on-surface">
                      Test GitHub Repository Explorer
                    </span>
                  </div>
                  <input
                    type="text"
                    value={testRepo}
                    onChange={(e) => setTestRepo(e.target.value)}
                    placeholder="owner/repo (e.g. facebook/react)"
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRunTest('github_explorer', 'inspect_github_repo', { repo: testRepo })}
                      disabled={executing || !testRepo.trim()}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white font-body-sm text-xs font-semibold hover:bg-primary-container transition-all cursor-pointer border-none disabled:opacity-50"
                    >
                      <Play size={12} />
                      <span>Inspect Repo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunTest('github_explorer', 'fetch_github_file', { repo: testRepo, path: testFilePath })}
                      disabled={executing || !testRepo.trim()}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-xs font-semibold transition-all cursor-pointer border-none disabled:opacity-50"
                    >
                      <FileText size={12} />
                      <span>Fetch Code</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedPlugin === 'http_webhook' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Cable size={16} className="text-emerald-500" />
                    <span className="font-headline-md text-xs font-semibold text-on-surface">
                      Test HTTP Webhook Endpoint
                    </span>
                  </div>
                  <input
                    type="text"
                    value={testHttpUrl}
                    onChange={(e) => setTestHttpUrl(e.target.value)}
                    placeholder="https://example.com/api"
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleRunTest('http_webhook', 'call_http_endpoint', { url: testHttpUrl, method: 'GET' })}
                    disabled={executing || !testHttpUrl.trim()}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-body-sm text-xs font-semibold hover:bg-primary-container transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    <Play size={13} />
                    <span>{executing ? 'Calling Webhook...' : 'Execute HTTP Request'}</span>
                  </button>
                </div>
              )}

              {/* Custom Plugin Test Runner */}
              {activePluginObj?.isCustom && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Cable size={16} className="text-rose-400" />
                    <span className="font-headline-md text-xs font-semibold text-on-surface">
                      Test Custom Plugin: {activePluginObj.name}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-secondary bg-surface-container px-2 py-1 rounded">
                    Endpoint: {activePluginObj.config?.endpoint} ({(activePluginObj.config?.method || 'GET').toUpperCase()})
                  </div>
                  <input
                    type="text"
                    value={testCustomParams}
                    onChange={(e) => setTestCustomParams(e.target.value)}
                    placeholder="Optional query param or JSON string..."
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      let p = {};
                      if (testCustomParams.trim()) {
                        try { p = JSON.parse(testCustomParams); } catch (e) { p = { query: testCustomParams }; }
                      }
                      handleRunTest(selectedPlugin, 'execute_custom_api', p);
                    }}
                    disabled={executing}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-body-sm text-xs font-semibold hover:bg-primary-container transition-all cursor-pointer border-none disabled:opacity-50"
                  >
                    <Play size={13} />
                    <span>{executing ? 'Executing Custom API...' : 'Run Custom Plugin'}</span>
                  </button>
                </div>
              )}

              {/* Output Results Window */}
              {testResult && (
                <div className="flex flex-col gap-2 pt-3 border-t border-surface-container-highest">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-headline-md font-semibold text-on-surface flex items-center gap-1.5">
                      {testResult.success ? (
                        <Check size={14} className="text-tertiary" />
                      ) : (
                        <AlertCircle size={14} className="text-error" />
                      )}
                      <span>Result: {testResult.success ? 'Success' : 'Failed'}</span>
                    </span>
                    <span className="font-label-telemetry text-secondary">
                      {testResult.elapsedMs} ms
                    </span>
                  </div>

                  <pre className="p-3 bg-surface-container rounded-xl font-mono text-[11px] text-on-surface max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-surface-container-highest">
                    {testResult.error
                      ? `Error: ${testResult.error}`
                      : typeof testResult.result === 'object'
                      ? JSON.stringify(testResult.result, null, 2)
                      : String(testResult.result)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Plugin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-container-highest">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Cable size={18} />
                </div>
                <div>
                  <h3 className="font-headline-md text-base font-bold text-on-surface">Add Custom Plugin</h3>
                  <p className="font-body-sm text-xs text-secondary">Connect any external REST API, webhook, or local IoT endpoint</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition cursor-pointer border-none bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            {addError && (
              <div className="mb-4 p-3 rounded-xl bg-error-container text-error text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePlugin} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Plugin Name *</label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Crypto Price Feed"
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">API Endpoint URL *</label>
                <input
                  type="url"
                  required
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">HTTP Method</label>
                  <select
                    value={customMethod}
                    onChange={(e: any) => setCustomMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Category</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="integration">Integration</option>
                    <option value="finance">Finance</option>
                    <option value="developer">Developer</option>
                    <option value="iot">Local IoT</option>
                    <option value="web">Web API</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Description</label>
                <input
                  type="text"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Fetches live cryptocurrency prices in USD"
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Custom Headers <span className="text-secondary font-normal">(Optional JSON)</span>
                </label>
                <textarea
                  rows={2}
                  value={customHeaders}
                  onChange={(e) => setCustomHeaders(e.target.value)}
                  placeholder='{"Authorization": "Bearer token_here"}'
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container-highest mt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingPlugin}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer border-none disabled:opacity-50"
                >
                  {addingPlugin ? 'Saving...' : 'Create & Save Plugin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
