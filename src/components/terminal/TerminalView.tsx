import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Send, Copy, Check, CornerDownLeft, Sparkles, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { TerminalEntry } from '../../types';
import { fetchTerminalHistory, runTerminalCommand } from '../../lib/api';

export const TerminalView: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [workingDir, setWorkingDir] = useState<string>('E:\\Nexyris-main');
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const loadHistory = async () => {
    try {
      const data = await fetchTerminalHistory();
      setHistory(data);
    } catch (e) {}
  };

  const handleRunCommand = async (commandToRun?: string) => {
    const cmd = (commandToRun || commandInput).trim();
    if (!cmd || isLoading) return;
    setCommandInput('');
    setIsLoading(true);

    try {
      const entry = await runTerminalCommand(cmd);
      if (entry.cwd) setWorkingDir(entry.cwd);
      setHistory(prev => [...prev, entry]);
    } catch (err: any) {
      setHistory(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          command: cmd,
          output: `Command failed: ${err.message}`,
          exitCode: 1,
          created_at: new Date().toISOString(),
        }
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setHistory([]);
  };

  const quickCommands = [
    { label: 'List USB Root', cmd: 'dir' },
    { label: 'List Models', cmd: 'dir models\\gguf' },
    { label: 'Check Node', cmd: 'node -v' },
    { label: 'Ollama Status', cmd: 'ollama list' },
    { label: 'Check Disks', cmd: 'powershell Get-PSDrive' },
    { label: 'Git Status', cmd: 'git status' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', backgroundColor: '#060911' }}>
      {/* Terminal Top Bar */}
      <div style={{
        padding: '12px 20px',
        backgroundColor: '#030509',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
          }}>
            <Terminal size={15} />
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: '#e2e8f0' }}>
              Nexyris Portable Shell
            </span>
            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>
              Working Dir: <code style={{ color: '#38bdf8' }}>{workingDir}</code>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {quickCommands.map((q, i) => (
            <button
              key={i}
              onClick={() => handleRunCommand(q.cmd)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#94a3b8',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              {q.label}
            </button>
          ))}

          <button
            onClick={handleClear}
            title="Clear terminal buffer"
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        fontFamily: 'JetBrains Mono, Consolas, monospace',
        fontSize: '13px',
        lineHeight: 1.6,
        color: '#e2e8f0',
      }}>
        {history.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '60px 0' }}>
            <Terminal size={36} style={{ opacity: 0.25, marginBottom: '12px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Real Portable Command Terminal</div>
            <div style={{ fontSize: '12px', marginTop: '6px' }}>
              Commands execute directly in your USB environment (<code style={{ color: '#38bdf8' }}>{workingDir}</code>).
            </div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
              Type any shell command below or click a quick action above.
            </div>
          </div>
        ) : (
          history.map((entry) => (
            <div key={entry.id} style={{ marginBottom: '20px' }}>
              {/* Command Prompt Line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>nexyris@usb</span>
                <span style={{ color: '#64748b' }}>:</span>
                <span style={{ color: '#38bdf8' }}>{workingDir}&gt;</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>{entry.command}</span>
                
                {entry.elapsed ? (
                  <span style={{ marginLeft: 'auto', fontSize: '10.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={10} />
                    <span>{entry.elapsed}ms</span>
                  </span>
                ) : null}

                {entry.exitCode !== undefined ? (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: entry.exitCode === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: entry.exitCode === 0 ? '#10b981' : '#ef4444',
                    border: `1px solid ${entry.exitCode === 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}>
                    {entry.exitCode === 0 ? 'EXIT 0' : `EXIT ${entry.exitCode}`}
                  </span>
                ) : null}

                <button
                  onClick={() => copyCode(entry.output || entry.stdout, entry.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '2px 4px',
                  }}
                  title="Copy output"
                >
                  {copiedId === entry.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                </button>
              </div>

              {/* Output Content */}
              <pre style={{
                backgroundColor: '#0a0e1a',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: entry.exitCode !== 0 && entry.stderr ? '#fca5a5' : '#cbd5e1',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '12.5px',
                margin: 0,
              }}>
                {entry.output || entry.stdout || entry.stderr || '[No output returned]'}
              </pre>
            </div>
          ))
        )}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', padding: '10px 0' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '14px', backgroundColor: '#38bdf8', animation: 'blink 0.8s infinite' }}></span>
            <span style={{ fontSize: '12px' }}>Executing in USB environment...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Input Prompt Box */}
      <div style={{
        padding: '14px 20px',
        backgroundColor: '#030509',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 600 }}>
          <span>{workingDir}&gt;</span>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleRunCommand();
            }
          }}
          placeholder="Type command (e.g. dir, ollama list, node -v) and press Enter..."
          disabled={isLoading}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            color: '#f8fafc',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '13.5px',
            outline: 'none',
          }}
        />

        <button
          onClick={() => handleRunCommand()}
          disabled={!commandInput.trim() || isLoading}
          style={{
            padding: '7px 16px',
            borderRadius: '6px',
            backgroundColor: commandInput.trim() ? '#2563eb' : 'rgba(255, 255, 255, 0.05)',
            color: commandInput.trim() ? '#fff' : '#64748b',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: commandInput.trim() && !isLoading ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Send size={13} />
          <span>Run</span>
        </button>
      </div>
    </div>
  );
};
