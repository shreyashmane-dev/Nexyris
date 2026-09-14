import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Send, Copy, Check, CornerDownLeft, Sparkles, Trash2 } from 'lucide-react';
import { TerminalEntry } from '../../types';
import { fetchTerminalHistory, runTerminalCommand } from '../../lib/api';

export const TerminalView: React.FC = () => {
  const [history, setHistory] = useState<TerminalEntry[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

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

  const handleRunCommand = async () => {
    if (!commandInput.trim() || isLoading) return;
    const cmd = commandInput.trim();
    setCommandInput('');
    setIsLoading(true);

    try {
      const entry = await runTerminalCommand(cmd);
      setHistory(prev => [...prev, entry]);
    } catch (err: any) {
      alert('Terminal error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', backgroundColor: 'var(--bg-terminal)' }}>
      {/* Terminal Header */}
      <div style={{
        padding: '12px 20px',
        backgroundColor: '#05070c',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={16} color="#38bdf8" />
          <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: '#e2e8f0' }}>
            nexyris-terminal-ai:~$
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['find files > 500MB', 'powershell port check', 'tar extract command'].map((quick, i) => (
            <button
              key={i}
              onClick={() => setCommandInput(quick)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {quick}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Logs Viewport */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '13px',
        lineHeight: 1.6,
      }}>
        {history.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>⚡ Nexyris Terminal Assistant Initialized</div>
            <div style={{ fontSize: '12px' }}>
              Type a task, command request, or script inquiry to get precise, runnable shell commands with explanations.
            </div>
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} style={{ marginBottom: '24px' }}>
              {/* Prompt line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', marginBottom: '8px' }}>
                <span style={{ color: '#10b981' }}>nexyris@usb</span>
                <span style={{ color: '#64748b' }}>:</span>
                <span style={{ color: '#60a5fa' }}>~</span>
                <span style={{ color: '#f8fafc' }}>$ {item.command}</span>
              </div>

              {/* Output block */}
              <div style={{
                backgroundColor: '#0a0d17',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                position: 'relative',
                color: '#e2e8f0',
                whiteSpace: 'pre-wrap',
              }}>
                <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                  <button
                    onClick={() => copyCode(item.output, item.id)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      color: '#94a3b8',
                      padding: '4px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedId === item.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                {item.output}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
            <span className="pulse-dot">⚡</span>
            <span>Synthesizing command & analyzing flags...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Input Prompt */}
      <div style={{
        padding: '14px 20px',
        backgroundColor: '#05070c',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ fontFamily: 'JetBrains Mono', color: '#10b981', fontWeight: 700 }}>&gt;</span>
        <input
          type="text"
          placeholder="Ask Terminal AI (e.g. 'kill process listening on port 38195', 'regex for email')..."
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRunCommand();
          }}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '13.5px',
            color: '#f8fafc',
            outline: 'none',
          }}
        />
        <button
          className="btn btn-primary"
          onClick={handleRunCommand}
          disabled={!commandInput.trim() || isLoading}
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          <CornerDownLeft size={14} />
          <span>Execute</span>
        </button>
      </div>
    </div>
  );
};
