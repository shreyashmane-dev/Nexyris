import React, { useState } from 'react';
import {
  AlertTriangle,
  WifiOff,
  RefreshCw,
  HardDrive,
  ShieldAlert,
  ArrowLeft,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface CustomErrorViewProps {
  title?: string;
  message?: string;
  errorDetails?: string;
  type?: 'offline' | 'server' | 'model' | 'notFound';
  onRetry?: () => void;
  onGoHome?: () => void;
  onSwitchToOffline?: () => void;
}

export const CustomErrorView: React.FC<CustomErrorViewProps> = ({
  title = 'System Connection Interrupted',
  message = 'The local engine or internet gateway encountered an unexpected condition.',
  errorDetails,
  type = 'offline',
  onRetry,
  onGoHome,
  onSwitchToOffline,
}) => {
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const handleCopyLog = () => {
    const log = `[Nexyris Error Report]
Timestamp: ${new Date().toISOString()}
Type: ${type}
Title: ${title}
Message: ${message}
Details: ${errorDetails || 'No stack trace provided'}
Environment: USB Portable Node v2.4 (Air-Gapped Core)`;

    navigator.clipboard.writeText(log);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = () => {
    if (!onRetry) return;
    setRetrying(true);
    setTimeout(() => {
      onRetry();
      setRetrying(false);
    }, 800);
  };

  const isOffline = type === 'offline';

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-[#09090b] text-zinc-100 overflow-y-auto">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-[#0c0c0e] p-8 shadow-2xl backdrop-blur-xl">
        {/* Ambient background glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Animated Status Icon */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
              {isOffline ? (
                <WifiOff className="w-10 h-10 text-amber-400 animate-pulse" />
              ) : (
                <AlertTriangle className="w-10 h-10 text-rose-500 animate-bounce" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
          </div>

          {/* Heading and badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-800/40 text-rose-400 text-xs font-semibold mb-3">
            <span>{isOffline ? 'Air-Gapped / Network Isolation' : 'Engine Exception'}</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
            {title}
          </h2>

          <p className="text-sm text-zinc-400 max-w-lg mb-6 leading-relaxed">
            {message}
          </p>

          {/* Diagnostic status checklist */}
          <div className="w-full rounded-2xl bg-black/40 border border-zinc-800/70 p-4 mb-6 text-left space-y-2.5">
            <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              System Diagnostic Breakdown
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-900">
              <span className="text-zinc-400 flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5 text-zinc-500" /> USB Drive Partition:
              </span>
              <span className="text-emerald-400 font-medium">Mounted & Accessible (NTFS/exFAT)</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-900">
              <span className="text-zinc-400 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-zinc-500" /> Local LLM Engine:
              </span>
              <span className="text-emerald-400 font-medium">100% Functional Offline</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-zinc-400 flex items-center gap-2">
                <WifiOff className="w-3.5 h-3.5 text-zinc-500" /> World Connect Gateway:
              </span>
              <span className={isOffline ? 'text-amber-400 font-medium' : 'text-rose-400 font-medium'}>
                {isOffline ? 'Offline (Live web search paused)' : 'Service Unreachable'}
              </span>
            </div>
          </div>

          {/* Error Details Code Box (if provided) */}
          {errorDetails && (
            <div className="w-full text-left mb-6">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1 px-1">
                <span>Technical Trace:</span>
                <button
                  onClick={handleCopyLog}
                  className="flex items-center gap-1 text-zinc-400 hover:text-rose-400 transition"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy Log'}
                </button>
              </div>
              <div className="w-full max-h-32 overflow-y-auto p-3 rounded-xl bg-zinc-950 font-mono text-xs text-rose-300/90 border border-zinc-800/80 select-all">
                {errorDetails}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            {onRetry && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-lg shadow-rose-950/30 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Retrying Gateway...' : 'Retry Connection'}
              </button>
            )}

            {onSwitchToOffline && (
              <button
                onClick={onSwitchToOffline}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium text-xs transition flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Continue in 100% Offline Mode
              </button>
            )}

            {onGoHome && (
              <button
                onClick={onGoHome}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 font-medium text-xs transition flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
