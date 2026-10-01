import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Globe,
  Code2,
  Terminal,
  Database,
  Cpu,
  Search,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  HelpCircle,
  FileCode,
  HardDrive
} from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const navItems = [
    { id: 'overview', label: 'System Overview', icon: Cpu },
    { id: 'plugins', label: 'World Connect Plugins', icon: Globe },
    { id: 'workspace', label: 'Code Workspace IDE', icon: Code2 },
    { id: 'terminal', label: 'Hardware Terminal', icon: Terminal },
    { id: 'profile', label: 'User Persona & DB Memory', icon: Database },
    { id: 'faq', label: 'Troubleshooting & FAQ', icon: HelpCircle }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[85vh] flex flex-col rounded-3xl border border-surface-container-highest bg-surface-container-lowest shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container-highest bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                Nexyris Studio Documentation & Manual
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-container-high text-secondary border border-surface-container-highest">
                  v2.4 Offline Core
                </span>
              </h2>
              <p className="text-xs text-secondary">
                Comprehensive guide to plugins, local LLM execution, persistent memory, and code workspace.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-secondary hover:text-on-surface hover:bg-surface-container-high transition cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-full md:w-64 border-r border-surface-container-highest bg-surface-container-low p-4 space-y-1 overflow-y-auto">
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-secondary absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-container border border-surface-container-highest text-xs text-on-surface placeholder-secondary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="text-[10px] font-semibold text-secondary uppercase tracking-wider px-3 mb-2">
              Studio Manual
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer border ${
                    isActive
                      ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                      : 'text-secondary hover:text-on-surface hover:bg-surface-container border-transparent bg-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-secondary'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-4 mt-4 border-t border-surface-container-highest px-3 text-[11px] text-secondary">
              <p>Portable USB Node</p>
              <p className="text-on-surface-variant font-mono mt-0.5">Zero Telemetry Mode</p>
            </div>
          </div>

          {/* Detailed Document Body */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-on-surface text-sm leading-relaxed bg-surface-container-lowest">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-2">System Architecture & Design</h3>
                  <p className="text-secondary">
                    Nexyris is designed from first principles as a self-contained, high-performance AI station that boots and runs directly from a portable USB stick or localized directory without cloud dependencies.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-surface-container border border-surface-container-highest">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 mb-2" />
                    <h4 className="font-semibold text-on-surface text-xs">Air-Gapped Core</h4>
                    <p className="text-secondary text-xs mt-1">
                      Prompts and code never leave your drive. Inference is executed entirely on local CPU/VRAM.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-surface-container border border-surface-container-highest">
                    <Zap className="w-5 h-5 text-primary mb-2" />
                    <h4 className="font-semibold text-on-surface text-xs">Direct Hardware Acceleration</h4>
                    <p className="text-secondary text-xs mt-1">
                      Optimized for Vulkan, CUDA, Metal, and high-performance AVX2 CPU instructions.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-surface-container border border-surface-container-highest">
                    <HardDrive className="w-5 h-5 text-blue-500 mb-2" />
                    <h4 className="font-semibold text-on-surface text-xs">SQLite Persistence</h4>
                    <p className="text-secondary text-xs mt-1">
                      User profiles, custom instructions, and persistent memories are stored in SQLite WAL database.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest space-y-2">
                  <h4 className="font-semibold text-on-surface text-xs">USB Directory Structure:</h4>
                  <pre className="text-xs font-mono text-secondary overflow-x-auto p-2 bg-surface-container rounded-xl border border-surface-container-highest">
{`Nexyris/
├── data/
│   ├── database/       <- SQLite database (nexyris.db)
│   ├── models/         <- GGUF & Diffusion model weights
│   └── workspace/      <- User code projects & saved files
├── server/             <- Isolated backend execution engine & plugins
├── src/                <- React + TypeScript frontend interface
└── launcher.bat        <- One-click portable USB bootstrapper`}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'plugins' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-2">World Connect Plugins</h3>
                  <p className="text-secondary">
                    World Connect gives your offline LLM instant, real-time access to the live web without requiring external API keys or paid accounts.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      name: 'DuckDuckGo Instant Web Search',
                      id: 'world_search',
                      cmd: '/search <query>',
                      desc: 'Queries the live web via DuckDuckGo and passes top results and snippet summaries directly to the LLM.'
                    },
                    {
                      name: 'Live Global Weather Forecaster',
                      id: 'world_weather',
                      cmd: '/weather <city_name>',
                      desc: 'Fetches real-time temperature, humidity, wind velocity, and 3-day forecasts via Open-Meteo & wttr.in.'
                    },
                    {
                      name: 'Wikipedia Knowledge Retriever',
                      id: 'wikipedia',
                      cmd: '/wiki <topic>',
                      desc: 'Extracts official Wikipedia article summaries, references, and citations directly into the conversation.'
                    },
                    {
                      name: 'GitHub Repository Inspector',
                      id: 'github_explorer',
                      cmd: '/github <owner/repo>',
                      desc: 'Inspects public GitHub repositories, stars, language breakdowns, and downloads raw source files.'
                    },
                    {
                      name: 'Clean Webpage Scraper & Reader',
                      id: 'web_fetch',
                      cmd: '/fetch <url>',
                      desc: 'Downloads any URL, strips out ads/scripts/HTML tags, and passes clean markdown text into context.'
                    }
                  ].map((plugin) => (
                    <div key={plugin.id} className="p-4 rounded-2xl bg-surface-container border border-surface-container-highest">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-on-surface text-xs">{plugin.name}</span>
                        <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                          {plugin.cmd}
                        </code>
                      </div>
                      <p className="text-xs text-secondary mt-1">{plugin.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-xs text-on-surface">
                  <span className="font-semibold text-primary">Offline Fallback:</span> If your device is offline or air-gapped, World Connect plugins gracefully notify you and your local models continue functioning without errors.
                </div>
              </div>
            )}

            {activeTab === 'workspace' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-2">Autonomous Code Workspace</h3>
                  <p className="text-secondary">
                    A full in-browser development environment tailored for inspecting, writing, and executing code alongside your local AI.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-highest">
                    <h4 className="text-xs font-semibold text-on-surface">Search & Replace:</h4>
                    <p className="text-xs text-secondary mt-1">
                      Click the Search icon in the workspace toolbar or press Ctrl+F to open the floating search and replace bar.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-highest">
                    <h4 className="text-xs font-semibold text-on-surface">Workspace Plugins Drawer:</h4>
                    <p className="text-xs text-secondary mt-1">
                      Open "Workspace Plugins" to scrape online documentation into your open file or pull raw code files directly from any GitHub repo URL.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-highest">
                    <h4 className="text-xs font-semibold text-on-surface">Export & Download:</h4>
                    <p className="text-xs text-secondary mt-1">
                      Download individual code files or click Export All to save your entire project package into your host OS.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'terminal' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-2">Hardware Shell Terminal</h3>
                  <p className="text-secondary">
                    Nexyris features a direct OS shell execution environment with real command evaluation, process isolation, and history buffering.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest space-y-3">
                  <h4 className="text-xs font-semibold text-on-surface">Supported Environments:</h4>
                  <ul className="text-xs text-secondary space-y-1.5 list-disc pl-4">
                    <li><strong className="text-on-surface">Windows:</strong> PowerShell and Windows Command Processor (cmd.exe).</li>
                    <li><strong className="text-on-surface">Linux / macOS:</strong> Bash or Zsh with full POSIX environment support.</li>
                    <li><strong className="text-on-surface">History Navigation:</strong> Press the Up and Down arrow keys to quickly rerun recent commands.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-2">User Persona & SQLite Memory</h3>
                  <p className="text-secondary">
                    Personalize how Nexyris responds to you with stored user profiles and permanent factual memories.
                  </p>
                </div>

                <div className="space-y-3 text-xs text-on-surface">
                  <p>
                    Unlike temporary browser cookies, your profile is stored in a real SQLite database on your USB drive (`data/database/nexyris.db`).
                  </p>
                  <div className="p-4 rounded-2xl bg-surface-container border border-surface-container-highest space-y-2">
                    <span className="font-semibold text-on-surface">How Memory Injection Works:</span>
                    <p className="text-secondary">
                      Before each chat prompt, Nexyris extracts your user profile (Name, Title, System Instructions) and active memories from the database and inserts them into the LLM system prompt:
                    </p>
                    <code className="block p-3 rounded-xl bg-surface-container-high font-mono text-[11px] text-primary border border-surface-container-highest">
{`[User Context: Shreyash (Lead AI Engineer)]
Custom Instructions: Always provide production-ready TypeScript code with tests.
Stored Memories:
- Prefers dark mode and Tailwind CSS
- Works primarily on offline robotics and LLM pipelines`}
                    </code>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'faq' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-on-surface mb-2">Frequently Asked Questions</h3>

                <div className="p-4 rounded-2xl bg-surface-container border border-surface-container-highest space-y-1">
                  <h4 className="text-xs font-semibold text-on-surface">Can I run Nexyris with zero internet connection?</h4>
                  <p className="text-xs text-secondary">
                    Yes! All local GGUF models, the code workspace, terminal, SQLite database, and image generator work 100% offline. Only the World Connect web plugins need internet access.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container border border-surface-container-highest space-y-1">
                  <h4 className="text-xs font-semibold text-on-surface">What model format should I place in data/models/?</h4>
                  <p className="text-xs text-secondary">
                    Standard GGUF models (e.g., LLaMA-3.2, Mistral, Qwen2.5, Phi-3). We recommend Q4_K_M or Q5_K_M quantizations for the best balance of speed and reasoning quality.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container border border-surface-container-highest space-y-1">
                  <h4 className="text-xs font-semibold text-on-surface">How do I safely unplug the USB drive?</h4>
                  <p className="text-xs text-secondary">
                    Close the Nexyris application window, ensure no models are actively generating, and use Windows "Safely Remove Hardware and Eject Media". SQLite WAL checkpoints automatically flush on exit.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
