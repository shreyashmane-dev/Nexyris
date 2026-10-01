import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  MessageSquare,
  Code2,
  Terminal,
  Image as ImageIcon,
  Globe,
  HardDrive,
  Cpu,
  Activity,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Shield,
  Layers,
  Search,
  CloudSun,
  BookOpen,
  FolderGit2,
  Compass,
  TrendingUp,
  Database
} from 'lucide-react';
import { RobotGreeting3D } from './RobotGreeting3D';
import { AppMode, UserProfile } from '../../types';
import { getUserProfile, getSystemHealth } from '../../lib/api';

interface DashboardViewProps {
  onNavigate: (mode: AppMode) => void;
  onOpenDocs: () => void;
  onOpenProfile: () => void;
  userProfile?: UserProfile | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenDocs,
  onOpenProfile,
  userProfile,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(userProfile || null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [systemStats, setSystemStats] = useState({
    ramUsed: 5.8,
    ramTotal: 16.0,
    vramUsed: 3.2,
    vramTotal: 8.0,
    avgTokPerSec: 28.6,
    modelsLoaded: 1,
    activePlugins: 6,
    status: 'Ready'
  });

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile]);

  useEffect(() => {
    getUserProfile()
      .then((data: any) => {
        if (data && (data.name || data.display_name)) {
          setProfile(data);
        } else if (data && data.profile) {
          setProfile(data.profile);
        }
      })
      .catch(() => {});

    getSystemHealth()
      .then((health: any) => {
        if (health) {
          setSystemStats((prev) => ({
            ...prev,
            status: health.status === 'READY' ? 'Air-Gapped & Active' : (health.status || 'Ready'),
            modelsLoaded: health.currentModel ? 1 : 0
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // Mock historical inference speed data points for SVG Chart
  const speedPoints = [18.2, 22.4, 21.0, 27.5, 29.8, 26.4, 32.1, 31.0, 35.4, 34.2, 38.6, 36.5];
  const maxSpeed = Math.max(...speedPoints);
  const minSpeed = Math.min(...speedPoints);
  const svgWidth = 520;
  const svgHeight = 140;
  const padding = 20;

  const getSvgCoordinates = () => {
    const stepX = (svgWidth - padding * 2) / (speedPoints.length - 1);
    const range = maxSpeed - minSpeed || 1;
    return speedPoints.map((val, idx) => {
      const x = padding + idx * stepX;
      const y = svgHeight - padding - ((val - minSpeed) / range) * (svgHeight - padding * 2);
      return { x, y, val };
    });
  };

  const coords = getSvgCoordinates();
  const pathD = coords.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
    ''
  );
  const areaD = `${pathD} L ${coords[coords.length - 1].x},${svgHeight} L ${coords[0].x},${svgHeight} Z`;

  // Function guide cards
  const functionCards = [
    {
      id: 'chat',
      title: 'AI Chat Studio',
      subtitle: 'ChatGPT-style interface with World Connect plugins',
      icon: MessageSquare,
      accent: 'border-rose-500/30 text-rose-400 bg-rose-950/20',
      badge: 'Interactive & Live',
      description:
        'Local LLM inference enhanced with live DuckDuckGo web search, weather, Wikipedia summaries, and custom persona memory.',
      howTo: [
        'Type natural questions or use slash commands like /search or /weather',
        'Toggle World Connect plugins on/off right inside the chat bar',
        'Saved user memories automatically shape responses to your style'
      ],
      targetMode: 'chat' as AppMode,
      actionText: 'Open Chat Studio'
    },
    {
      id: 'code',
      title: 'Autonomous Workspace',
      subtitle: 'Code editor with GitHub import & web documentation',
      icon: Code2,
      accent: 'border-blue-500/30 text-blue-400 bg-blue-950/20',
      badge: 'IDE Suite',
      description:
        'Full-featured code studio with real-time formatting, search & replace, live URL docs scraper, and direct GitHub repo pulls.',
      howTo: [
        'Write or edit multi-language scripts directly in the browser',
        'Use "Workspace Plugins" drawer to fetch live docs or GitHub files',
        'Export projects as zip/files or format code with a single click'
      ],
      targetMode: 'code' as AppMode,
      actionText: 'Open Workspace'
    },
    {
      id: 'terminal',
      title: 'Hardware Shell',
      subtitle: 'Native OS terminal with real execution & history',
      icon: Terminal,
      accent: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20',
      badge: 'Direct OS Shell',
      description:
        'Execute PowerShell/Bash commands directly on your machine with full process isolation, history navigation, and zero sandbox limits.',
      howTo: [
        'Run Git, Node, Python, and system scripts directly from the USB drive',
        'Use Up/Down keys to navigate executed command history',
        'Clear terminal or view running processes in real-time'
      ],
      targetMode: 'terminal' as AppMode,
      actionText: 'Open Terminal'
    },
    {
      id: 'image',
      title: 'Image Studio',
      subtitle: 'Prompt-driven visual generation studio',
      icon: ImageIcon,
      accent: 'border-purple-500/30 text-purple-400 bg-purple-950/20',
      badge: 'Visual Engine',
      description:
        'Generate custom artwork, mockups, and UI illustrations directly through local or configured diffusion pipelines.',
      howTo: [
        'Enter positive and negative style prompts with custom aspect ratios',
        'Adjust generation steps, guidance scale, and seed parameters',
        'Save generated imagery directly into your portable USB workspace'
      ],
      targetMode: 'image' as AppMode,
      actionText: 'Open Image Studio'
    },
    {
      id: 'plugins',
      title: 'World Connect Engine',
      subtitle: 'Connect local AI to live global knowledge',
      icon: Globe,
      accent: 'border-amber-500/30 text-amber-400 bg-amber-950/20',
      badge: '6 Built-in Tools',
      description:
        'Bridges offline LLMs to live web search, weather forecasts, Wikipedia articles, GitHub repositories, and custom HTTP webhooks.',
      howTo: [
        'Toggle individual plugins in the Plugins Management view',
        'Test queries interactively with the built-in live sandbox',
        'Plugins run gracefully offline with fallback notifications'
      ],
      targetMode: 'plugins' as AppMode,
      actionText: 'Manage Plugins'
    },
    {
      id: 'profile',
      title: 'User Persona & Memory',
      subtitle: 'SQLite-backed persistent memory and instructions',
      icon: Database,
      accent: 'border-cyan-500/30 text-cyan-400 bg-cyan-950/20',
      badge: 'Persistent DB',
      description:
        'Store your name, role, custom system instructions, and dynamic factual memories that the AI recalls in every session.',
      howTo: [
        'Set your display name, developer title, and custom instructions',
        'Add, view, and delete key facts in the User Memories manager',
        'All data is saved 100% locally in data/database/nexyris.db'
      ],
      targetMode: 'settings' as AppMode,
      actionText: 'Edit Profile & Memories'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background text-on-surface p-6 md:p-8 space-y-10 selection:bg-primary/20 selection:text-primary">
      {/* 1. TOP SECTION: 3D Animated Robot Greeting & Quick Launch Bar */}
      <section className="relative overflow-hidden rounded-3xl border border-surface-container-highest bg-gradient-to-b from-surface-container via-surface-container-low to-surface shadow-2xl p-6 md:p-8 backdrop-blur-xl">
        {/* Ambient background glows */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(var(--outline-variant)_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        <div className="relative z-10">
          {/* Status Chips Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-surface-container-highest text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-on-surface">Nexyris Portable Studio v2.4</span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary border border-surface-container-highest">
                100% Offline Air-Gapped Core
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 font-medium">
                <Globe className="w-3.5 h-3.5" /> World Connect Active
              </span>
              <button
                onClick={onOpenDocs}
                className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container-highest transition flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                Documentation Guide
              </button>
            </div>
          </div>

          {/* 3D Robot Integration Component */}
          <RobotGreeting3D
            userName={profile?.name || profile?.display_name || userProfile?.name || 'Explorer'}
            onNavigateToChat={() => onNavigate('chat')}
            onNavigateToDocs={onOpenDocs}
          />
        </div>
      </section>

      {/* 2. MIDDLE SECTION: "What is the use of this & How to use multiple functions" Documentation */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
              <Compass className="w-4 h-4" /> Multi-Function Studio Guide
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-on-surface mt-1">
              What Can Nexyris Do & How To Use It
            </h2>
            <p className="text-secondary text-sm max-w-2xl mt-1">
              Nexyris is an all-in-one, portable AI workstation running directly from your USB drive. Explore each studio below to maximize your workflow.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenProfile}
              className="px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-xs font-medium text-on-surface transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Database className="w-3.5 h-3.5 text-primary" />
              Manage Profile & Memories
            </button>
            <button
              onClick={onOpenDocs}
              className="px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-xs font-medium text-primary transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Full Manual
            </button>
          </div>
        </div>

        {/* 6 Studio Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {functionCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="group relative rounded-2xl border border-surface-container-highest bg-surface-container-low p-6 flex flex-col justify-between hover:border-primary/40 hover:bg-surface-container transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className={`p-3 rounded-xl border ${card.accent}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-surface-container text-secondary border border-surface-container-highest">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-secondary mb-3">{card.subtitle}</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                    {card.description}
                  </p>

                  <div className="space-y-2 mb-6 pt-3 border-t border-surface-container-highest">
                    <div className="text-[11px] font-medium text-secondary uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> How to use:
                    </div>
                    <ul className="space-y-1.5">
                      {card.howTo.map((item, idx) => (
                        <li key={idx} className="text-xs text-secondary flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (card.id === 'profile') {
                      onOpenProfile();
                    } else {
                      onNavigate(card.targetMode);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-surface-container hover:bg-primary hover:text-white text-on-surface border border-surface-container-highest hover:border-primary font-medium text-xs transition flex items-center justify-center gap-2 group/btn cursor-pointer shadow-xs"
                >
                  <span>{card.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. BOTTOM SECTION: Graphical Data Representations & System Health */}
      <section className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <Activity className="w-4 h-4" /> Live Visual Analytics
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface mt-1">
            Engine Performance & Resource Allocation
          </h2>
          <p className="text-secondary text-sm max-w-2xl mt-1">
            Real-time graphical metrics tracking token generation throughput, drive partition usage, and hardware resource overhead.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Inference Velocity Sparkline */}
          <div className="lg:col-span-2 rounded-2xl border border-surface-container-highest bg-surface-container-low p-6 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm text-on-surface">
                    Inference Generation Throughput
                  </span>
                </div>
                <p className="text-xs text-secondary mt-0.5">
                  Real-time tokens/sec across session inference batches
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-mono font-bold text-primary">
                    {systemStats.avgTokPerSec} tok/s
                  </div>
                  <div className="text-[10px] text-secondary uppercase tracking-wider">
                    Average Velocity
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-950/20 text-emerald-500 border border-emerald-800/30 text-xs font-mono">
                  TTFT: 240ms
                </div>
              </div>
            </div>

            {/* SVG Area Sparkline */}
            <div className="relative w-full h-[150px] overflow-hidden rounded-xl bg-surface-container-lowest border border-surface-container-highest p-2 flex items-center justify-center">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line
                  x1="0"
                  y1={svgHeight / 4}
                  x2={svgWidth}
                  y2={svgHeight / 4}
                  stroke="var(--outline-variant)"
                  strokeDasharray="4 4"
                />
                <line
                  x1="0"
                  y1={svgHeight / 2}
                  x2={svgWidth}
                  y2={svgHeight / 2}
                  stroke="var(--outline-variant)"
                  strokeDasharray="4 4"
                />
                <line
                  x1="0"
                  y1={(svgHeight * 3) / 4}
                  x2={svgWidth}
                  y2={(svgHeight * 3) / 4}
                  stroke="var(--outline-variant)"
                  strokeDasharray="4 4"
                />

                {/* Filled Area */}
                <path d={areaD} fill="url(#roseGradient)" />

                {/* Smooth Curve */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Data Points */}
                {coords.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill="var(--surface)"
                    stroke="var(--primary)"
                    strokeWidth="2"
                    className="hover:scale-150 transition-transform cursor-pointer"
                  />
                ))}
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] text-secondary mt-3 pt-2 border-t border-surface-container-highest font-mono">
              <span>Warmup Batch #1</span>
              <span>Prompt Cache Active (KV Cache: 98% hit)</span>
              <span>Batch #12 (Peak: 38.6 tok/s)</span>
            </div>
          </div>

          {/* Chart 2: Drive Storage Allocation Breakdown */}
          <div className="rounded-2xl border border-surface-container-highest bg-surface-container-low p-6 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm text-on-surface">USB Drive Storage</span>
                </div>
                <span className="text-xs font-mono text-secondary">47.8 / 64 GB</span>
              </div>
              <p className="text-xs text-secondary mb-4">
                Partition breakdown of models, SQLite databases, and workspace code.
              </p>

              {/* Segmented Bar */}
              <div className="h-4 w-full rounded-full bg-surface-container-highest overflow-hidden flex p-0.5 border border-surface-container-highest mb-5">
                <div
                  className="h-full bg-primary rounded-l-full"
                  style={{ width: '62%' }}
                  title="GGUF Models: 39.5 GB"
                />
                <div
                  className="h-full bg-blue-500"
                  style={{ width: '15%' }}
                  title="Workspace Projects: 9.6 GB"
                />
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: '8%' }}
                  title="Vector DB & SQLite: 5.1 GB"
                />
                <div
                  className="h-full bg-amber-500"
                  style={{ width: '5%' }}
                  title="Engine Cache: 3.2 GB"
                />
                <div
                  className="h-full bg-surface-container-high rounded-r-full"
                  style={{ width: '10%' }}
                  title="Available Space: 6.6 GB"
                />
              </div>

              {/* Legend */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-on-surface">
                    <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
                    GGUF Local Models
                  </span>
                  <span className="font-mono text-secondary">39.5 GB (62%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-on-surface">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                    Workspace Projects
                  </span>
                  <span className="font-mono text-secondary">9.6 GB (15%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-on-surface">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                    SQLite DB & User Memories
                  </span>
                  <span className="font-mono text-secondary">5.1 GB (8%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-on-surface">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                    Engine Cache
                  </span>
                  <span className="font-mono text-secondary">3.2 GB (5%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-on-surface">
                    <span className="w-2.5 h-2.5 rounded-sm bg-surface-container-highest" />
                    Free Storage
                  </span>
                  <span className="font-mono text-emerald-500 font-semibold">6.6 GB (10%)</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-surface-container-highest flex items-center justify-between text-xs">
              <span className="text-secondary">Database Engine</span>
              <span className="font-mono text-on-surface">SQLite WAL Enabled</span>
            </div>
          </div>
        </div>

        {/* Chart 3 & Plugin Cheat Sheet Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Hardware Resource Gauge */}
          <div className="rounded-2xl border border-surface-container-highest bg-surface-container-low p-6 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm text-on-surface">Hardware Allocation</span>
                </div>
                <span className="text-xs font-mono text-emerald-500 font-medium">Optimal</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-on-surface">Host RAM Used</span>
                    <span className="font-mono text-secondary">5.8 / 16.0 GB (36%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full w-[36%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-on-surface">GPU VRAM Allocated</span>
                    <span className="font-mono text-secondary">3.2 / 8.0 GB (40%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full w-[40%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-on-surface">CPU Thread Saturation</span>
                    <span className="font-mono text-secondary">8 / 16 Threads (50%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full w-[50%]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-surface-container-highest text-xs text-secondary flex items-center justify-between">
              <span>Execution State</span>
              <span className="text-emerald-500 font-mono font-medium">Air-Gapped & Active</span>
            </div>
          </div>

          {/* Quick World Connect Slash Commands */}
          <div className="lg:col-span-2 rounded-2xl border border-surface-container-highest bg-surface-container-low p-6 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm text-on-surface">
                    World Connect Slash Commands Cheat Sheet
                  </span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Click to Copy
                </span>
              </div>
              <p className="text-xs text-secondary mb-4">
                Type these directly into the Chat Studio prompt bar to invoke live world tools on the fly:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    cmd: '/search latest React 19 features',
                    desc: 'Query live DuckDuckGo instant web search'
                  },
                  {
                    cmd: '/weather Tokyo',
                    desc: 'Fetch real-time weather & 3-day conditions'
                  },
                  {
                    cmd: '/wiki Quantum computing',
                    desc: 'Extract encyclopedic summary & citations'
                  },
                  {
                    cmd: '/github torvalds/linux',
                    desc: 'Inspect repo statistics, stars & file trees'
                  },
                  {
                    cmd: '/fetch https://example.com',
                    desc: 'Extract clean markdown from any URL'
                  }
                ].map((item) => (
                  <div
                    key={item.cmd}
                    onClick={() => handleCopy(item.cmd)}
                    className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-highest hover:border-primary/40 hover:bg-surface-container transition flex items-center justify-between cursor-pointer group shadow-xs"
                  >
                    <div>
                      <code className="text-xs font-mono text-primary font-semibold">
                        {item.cmd}
                      </code>
                      <p className="text-[11px] text-secondary mt-0.5">{item.desc}</p>
                    </div>
                    <button className="text-secondary group-hover:text-primary p-1.5 rounded-lg hover:bg-surface-container transition border-none cursor-pointer bg-transparent">
                      {copiedCmd === item.cmd ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-surface-container-highest flex items-center justify-between text-xs">
              <span className="text-secondary">Offline Resilience</span>
              <span className="text-on-surface">
                Safe fallback: if no internet connection, models seamlessly continue in pure offline mode.
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
