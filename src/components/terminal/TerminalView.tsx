import React, { useState, useEffect, useRef } from 'react';
import { runTerminalCommand, streamChatCompletion } from '../../lib/api';

interface TerminalLine {
  id: string;
  type: 'user' | 'system' | 'ai' | 'error';
  command?: string;
  output?: string;
  cwd?: string;
}

export const TerminalView: React.FC = () => {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'init',
      type: 'system',
      output: `NEXYRIS LOCAL RUNTIME v2.4.0 (Portable Mode)\nPID: 40822 · Drive: /Volumes/NEXYRIS_USB [82 GB Free]\nActive LLM: Qwen 7B (Q4_K_M) @ llama.cpp runtime (Local CPU/GPU accelerated)\nType 'help' for built-in assistant commands or run standard shell binaries.`,
    },
    {
      id: 'sample-1',
      type: 'user',
      command: 'nexyris query "Analyze local network ports and summarize vulnerabilities"',
      cwd: '~/workspace',
    },
    {
      id: 'sample-ai-1',
      type: 'ai',
      output: 'Found open port 8080 (HTTP) and 22 (SSH). Recommendation: Enforce key-based authentication on port 22 and bind dev servers strictly to 127.0.0.1 to prevent LAN side-channel discovery.',
    },
  ]);

  const [cliInput, setCliInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSession, setActiveSession] = useState<'session-1' | 'session-2'>('session-1');

  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalBodyRef.current?.scrollTo({
      top: terminalBodyRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [lines]);

  const handleRunCommand = async (cmdToRun?: string) => {
    const cmd = (cmdToRun || cliInput).trim();
    if (!cmd || isExecuting) return;

    setCliInput('');
    setIsExecuting(true);

    const newLine: TerminalLine = {
      id: 'cmd-' + Date.now(),
      type: 'user',
      command: cmd,
      cwd: '~/workspace',
    };

    setLines(prev => [...prev, newLine]);

    if (cmd === 'clear' || cmd === 'cls') {
      setLines([]);
      setIsExecuting(false);
      return;
    }

    if (cmd === 'help') {
      setLines(prev => [
        ...prev,
        {
          id: 'help-' + Date.now(),
          type: 'system',
          output: `Available Commands:\n• nexyris query <prompt> - Run instant local AI inference\n• nexyris models         - List models in portable drive\n• clear                  - Clear terminal buffer\n• Standard OS binaries   - dir, ls, cd, python, curl, ps, git`,
        },
      ]);
      setIsExecuting(false);
      return;
    }

    if (cmd.startsWith('nexyris query')) {
      const query = cmd.replace(/^nexyris query\s*"?/, '').replace(/"?$/, '');
      let accumulated = '';
      const aiLineId = 'ai-' + Date.now();

      setLines(prev => [
        ...prev,
        {
          id: aiLineId,
          type: 'ai',
          output: 'Thinking locally...',
        },
      ]);

      try {
        await streamChatCompletion(
          [{ role: 'user', content: query }],
          'terminal-chat',
          {},
          (chunk) => {
            accumulated += chunk.text;
            setLines(prev => prev.map(l => l.id === aiLineId ? { ...l, output: accumulated } : l));
          },
          () => setIsExecuting(false),
          (err) => {
            setLines(prev => prev.map(l => l.id === aiLineId ? { ...l, type: 'error', output: err.message } : l));
            setIsExecuting(false);
          }
        );
      } catch (err: any) {
        setLines(prev => prev.map(l => l.id === aiLineId ? { ...l, type: 'error', output: err.message } : l));
        setIsExecuting(false);
      }
      return;
    }

    try {
      const res = await runTerminalCommand(cmd);
      setLines(prev => [
        ...prev,
        {
          id: 'out-' + Date.now(),
          type: res.exitCode === 0 ? 'system' : 'error',
          output: res.output || `Process exited with code ${res.exitCode}`,
        },
      ]);
    } catch (err: any) {
      setLines(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          type: 'error',
          output: err.message || 'Execution error',
        },
      ]);
    } finally {
      setIsExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleInjectAi = async (promptText?: string) => {
    const prompt = (promptText || aiPrompt).trim();
    if (!prompt) return;

    setAiPrompt('');
    const newLineId = 'copilot-' + Date.now();

    setLines(prev => [
      ...prev,
      {
        id: 'copilot-prompt-' + Date.now(),
        type: 'user',
        command: `# [AI Co-Pilot] ${prompt}`,
        cwd: '~/copilot',
      },
      {
        id: newLineId,
        type: 'ai',
        output: 'Synthesizing local action plan...',
      },
    ]);

    let accumulated = '';
    try {
      await streamChatCompletion(
        [{ role: 'user', content: `You are an offline Terminal AI co-pilot. Respond directly with command explanations and hardened scripts. Request: ${prompt}` }],
        'terminal-copilot',
        {},
        (chunk) => {
          accumulated += chunk.text;
          setLines(prev => prev.map(l => l.id === newLineId ? { ...l, output: accumulated } : l));
        },
        () => {},
        (err) => {
          setLines(prev => prev.map(l => l.id === newLineId ? { ...l, type: 'error', output: err.message } : l));
        }
      );
    } catch (err: any) {
      setLines(prev => prev.map(l => l.id === newLineId ? { ...l, type: 'error', output: err.message } : l));
    }
  };

  const handleExportLog = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const content = lines.map(l => {
      if (l.type === 'user') return `${l.cwd || '~'}$ ${l.command}`;
      return l.output;
    }).join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nexyris-terminal-trace-${timestamp}.log`;
    a.click();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface overflow-y-auto" ref={containerRef}>
      <div className="p-6 md:p-8 flex flex-col gap-4 max-w-[1440px] mx-auto w-full">
        {/* Top Header Card */}
        <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-surface-container-highest shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0 text-white shadow-xs">
              <span className="material-symbols-outlined text-[20px]">terminal</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                  Nexyris Terminal
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-telemetry text-label-telemetry">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  <span>Qwen 7B ● Active</span>
                </div>
                <div className="hidden xl:flex items-center gap-1 text-secondary font-label-telemetry text-label-telemetry">
                  <span>●</span>
                  <span>Interactive AI Shell & Local CLI</span>
                </div>
              </div>
              <span className="font-body-sm text-body-sm text-secondary truncate">
                Direct low-latency command bus hooked to on-device inference context
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 self-end md:self-center">
            <button 
              onClick={() => setLines([])}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm transition-colors border-none cursor-pointer" 
              title="Clear Buffer (Ctrl+L)" 
              type="button"
            >
              <span className="material-symbols-outlined text-[15px] text-secondary">mop</span>
              <span className="hidden sm:inline">Clear</span>
            </button>
            <button 
              onClick={handleExportLog}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm transition-colors border-none cursor-pointer" 
              title="Export session trace" 
              type="button"
            >
              <span className="material-symbols-outlined text-[15px] text-secondary">file_download</span>
              <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm transition-colors border-none cursor-pointer" 
              type="button"
            >
              <span className="material-symbols-outlined text-[15px] text-secondary">fullscreen</span>
              <span className="hidden sm:inline">Fullscreen</span>
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center justify-between overflow-x-auto bg-surface-container-low rounded-lg p-1 border border-surface-container-highest">
          <div className="flex items-center gap-1 min-w-max">
            <button 
              onClick={() => setActiveSession('session-1')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-body-sm font-medium shadow-sm border-none cursor-pointer ${
                activeSession === 'session-1' 
                  ? 'bg-surface-container-lowest text-on-surface' 
                  : 'hover:bg-surface-container text-secondary hover:text-on-surface bg-transparent'
              }`} 
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span>Session 1 (nexyris-cli)</span>
            </button>
            <button 
              onClick={() => setActiveSession('session-2')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-body-sm transition-colors border-none cursor-pointer ${
                activeSession === 'session-2' 
                  ? 'bg-surface-container-lowest text-on-surface' 
                  : 'hover:bg-surface-container text-secondary hover:text-on-surface bg-transparent'
              }`} 
              type="button"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              <span>Session 2 (python workspace)</span>
            </button>
            <button 
              onClick={() => alert('New shell session initialized.')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container font-label-telemetry text-label-telemetry uppercase tracking-wider transition-colors border-none cursor-pointer bg-transparent" 
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>New Shell</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-4 px-3 font-label-telemetry text-label-telemetry text-secondary">
            <span className="flex items-center gap-1">
              <span className="text-on-surface font-medium">TTY:</span> /dev/ttys004
            </span>
            <span className="flex items-center gap-1">
              <span className="text-on-surface font-medium">BAUD:</span> 115200
            </span>
            <span className="flex items-center gap-1 text-primary font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
              STREAM READY
            </span>
          </div>
        </div>

        {/* Black Terminal Box */}
        <div className="relative bg-[#0c0c0e] rounded-xl overflow-hidden shadow-2xl text-on-primary font-label-code text-label-code border border-[#23232b]">
          {/* Header */}
          <div className="bg-[#141418] px-4 py-2 flex items-center justify-between select-none border-b border-[#23232b]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-surface-container-high/40"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-surface-container-high/40"></span>
              <span className="ml-2 text-secondary font-label-telemetry text-label-telemetry uppercase tracking-wider">
                nexyris-portable-runtime :: powershell
              </span>
            </div>
            <div className="flex items-center gap-3 text-secondary font-label-telemetry text-label-telemetry">
              <span className="text-primary-fixed-dim">llama.cpp: v1.42</span>
              <span>UTF-8</span>
              <span className="hidden sm:inline">118x34</span>
            </div>
          </div>

          {/* Terminal Body */}
          <div 
            ref={terminalBodyRef}
            className="p-4 md:p-6 flex flex-col gap-2 min-h-[400px] max-h-[520px] overflow-y-auto leading-relaxed selection:bg-primary selection:text-white"
          >
            {lines.map((line) => {
              if (line.type === 'user') {
                return (
                  <div key={line.id} className="flex flex-col gap-1 pt-1">
                    <div className="flex items-center gap-2 flex-wrap text-[#dadadb]">
                      <span className="text-[#ffb3b6] font-medium">user@nexyris-portable</span>
                      <span className="text-[#8c8c94]">:</span>
                      <span className="text-[#74d8bd] font-medium">{line.cwd || '~/workspace'}</span>
                      <span className="text-[#f9f9fa]">$</span>
                      <span className="text-[#ffffff] font-semibold">{line.command}</span>
                    </div>
                  </div>
                );
              }

              if (line.type === 'ai') {
                return (
                  <div key={line.id} className="pl-4 pr-3 py-2.5 rounded bg-[#17171d] text-[#f0f1f2] border-l-2 border-primary my-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-primary text-[11px] font-semibold tracking-wide uppercase">
                      <span className="material-symbols-outlined text-[14px]">psychology</span>
                      <span>[nexyris::ai] Local Assessment</span>
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-[#dadadb] m-0 whitespace-pre-wrap">
                      {line.output}
                    </p>
                  </div>
                );
              }

              return (
                <div key={line.id} className="p-3 rounded-lg bg-[#121216] text-[#dadadb] font-label-code text-label-code whitespace-pre-wrap leading-relaxed">
                  {line.output}
                </div>
              );
            })}

            {/* Input Line */}
            <div className="flex items-center gap-2 flex-wrap text-[#dadadb] pt-2">
              <span className="text-[#ffb3b6] font-medium">user@nexyris-portable</span>
              <span className="text-[#8c8c94]">:</span>
              <span className="text-[#74d8bd] font-medium">~/workspace</span>
              <span className="text-[#f9f9fa]">$</span>
              <div className="flex items-center flex-1 min-w-[220px]">
                <input 
                  ref={inputRef}
                  value={cliInput}
                  onChange={(e) => setCliInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRunCommand();
                    }
                  }}
                  autoFocus
                  autoComplete="off" 
                  spellCheck="false"
                  className="bg-transparent text-white focus:outline-none w-full font-label-code text-label-code caret-transparent border-none p-0" 
                  placeholder="Type shell or AI command (e.g. nexyris query ...)" 
                  type="text"
                />
                <span className="w-2 h-4 bg-primary inline-block -ml-1 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="bg-[#101014] px-4 py-2 flex flex-wrap items-center justify-between text-secondary font-label-telemetry text-label-telemetry border-t border-[#23232b]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                <span>VRAM: 6.1 GB used</span>
              </span>
              <span className="hidden sm:inline">Context: 4,096 / 32,768</span>
              <span className="text-tertiary-fixed-dim">Offline Isolation Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Shortcuts:</span>
              <span className="bg-[#1f1f26] text-[#dadadb] px-1.5 py-0.5 rounded font-label-keycap text-label-keycap">
                Enter Run
              </span>
              <span className="bg-[#1f1f26] text-[#dadadb] px-1.5 py-0.5 rounded font-label-keycap text-label-keycap">
                Tab Auto
              </span>
            </div>
          </div>
        </div>

        {/* AI Terminal Co-Pilot Card */}
        <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-3 shadow-sm border border-surface-container-highest">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
              </div>
              <span className="font-headline-md text-on-surface font-semibold text-sm">AI Terminal Co-Pilot</span>
              <span className="font-label-telemetry text-[10px] px-2 py-0.5 rounded bg-surface-container text-secondary">
                Zero Cloud Leak
              </span>
            </div>
            <span className="text-secondary font-label-telemetry text-[11px]">Shift+Enter to inject</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInjectAi();
                  }
                }}
                className="w-full bg-surface-container-low text-on-surface rounded-lg px-3.5 py-2 font-body-md focus:outline-none focus:bg-surface-container-lowest placeholder:text-secondary shadow-inner border border-surface-container-highest" 
                placeholder="Ask Nexyris to explain output, write a bash script, or debug error..." 
                type="text"
              />
            </div>
            <button 
              onClick={() => handleInjectAi()}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-body-sm font-semibold hover:bg-primary-container transition-colors shadow-sm border-none cursor-pointer" 
              type="button"
            >
              <span>Execute</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-secondary font-label-telemetry text-label-telemetry">Quick Actions:</span>
            {[
              { label: '[ Explain Command ]', prompt: 'Explain output from the last executed command with security recommendations' },
              { label: '[ Generate Shell Script ]', prompt: 'Generate a hardened bash script to auto-kill unauthorized listener sockets' },
              { label: '[ Pipe into AI ]', prompt: 'Pipe previous log buffer into Qwen 7B summarizer and output JSON matrix' }
            ].map((qa, idx) => (
              <button 
                key={idx}
                onClick={() => handleInjectAi(qa.prompt)}
                className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-keycap text-label-keycap transition-colors border-none cursor-pointer" 
                type="button"
              >
                {qa.label}
              </button>
            ))}
            <button 
              onClick={() => setLines([])}
              className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-error font-label-keycap text-label-keycap transition-colors border-none cursor-pointer" 
              type="button"
            >
              [ Clear ]
            </button>
          </div>
        </div>

        {/* 3-Column Bento Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-1 border border-surface-container-highest">
            <div className="flex items-center justify-between">
              <span className="font-label-telemetry text-secondary uppercase text-[11px]">I/O Speed</span>
              <span className="font-label-telemetry text-primary font-semibold text-[11px]">14.2 tok/sec</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-1">
              <div className="bg-primary h-full rounded-full" style={{ width: '72%' }}></div>
            </div>
            <span className="font-body-sm text-secondary pt-1 text-[12px]">Quantized Q4_K_M cache loaded in unified memory</span>
          </div>

          <div className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-1 border border-surface-container-highest">
            <div className="flex items-center justify-between">
              <span className="font-label-telemetry text-secondary uppercase text-[11px]">Sandbox Isolation</span>
              <span className="font-label-telemetry text-tertiary font-semibold text-[11px]">Hardened Chroot</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-1">
              <div className="bg-tertiary h-full rounded-full" style={{ width: '100%' }}></div>
            </div>
            <span className="font-body-sm text-secondary pt-1 text-[12px]">Outbound network access prohibited by local firewall rule</span>
          </div>

          <div className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-1 border border-surface-container-highest">
            <div className="flex items-center justify-between">
              <span className="font-label-telemetry text-secondary uppercase text-[11px]">Flash Storage Health</span>
              <span className="font-label-telemetry text-on-surface font-semibold text-[11px]">82.4 GB / 128 GB</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-1">
              <div className="bg-secondary h-full rounded-full" style={{ width: '36%' }}></div>
            </div>
            <span className="font-body-sm text-secondary pt-1 text-[12px]">SanDisk Extreme Portable · Write speed 410 MB/s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
