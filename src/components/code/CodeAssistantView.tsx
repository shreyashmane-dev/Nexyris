import React, { useState, useEffect } from 'react';
import { Code2, Play, FileCode, Plus, Trash2, Sparkles, Check, Copy, Bug, Wrench } from 'lucide-react';
import { CodeProject } from '../../types';
import { fetchCodeProjects, saveCodeProject, deleteCodeProject, streamChatCompletion } from '../../lib/api';

export const CodeAssistantView: React.FC = () => {
  const [projects, setProjects] = useState<CodeProject[]>([]);
  const [activeProject, setActiveProject] = useState<CodeProject | null>(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [codeContent, setCodeContent] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projs = await fetchCodeProjects();
      setProjects(projs);
      if (projs.length > 0 && !activeProject) {
        setActiveProject(projs[0]);
        setCodeContent(projs[0].files[0]?.content || '');
      } else if (projs.length === 0) {
        // Create initial default project
        const defaultProj = await saveCodeProject({
          name: 'Algorithm Playground',
          description: 'Local code experiments',
          files: [
            {
              name: 'binary_search.py',
              content: `def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n\nif __name__ == '__main__':\n    data = [1, 3, 5, 7, 9, 11, 13]\n    print("Index of 7:", binary_search(data, 7))\n`
            }
          ]
        });
        setProjects([defaultProj]);
        setActiveProject(defaultProj);
        setCodeContent(defaultProj.files[0]?.content || '');
      }
    } catch (e) {}
  };

  const handleSaveCode = async (newCode: string) => {
    setCodeContent(newCode);
    if (!activeProject) return;

    const updatedFiles = [...activeProject.files];
    if (updatedFiles[activeFileIndex]) {
      updatedFiles[activeFileIndex].content = newCode;
    }

    try {
      const saved = await saveCodeProject({
        ...activeProject,
        files: updatedFiles,
      });
      setActiveProject(saved);
    } catch (e) {}
  };

  const handleAiAction = async (actionType: string) => {
    if (!codeContent.trim() || isGenerating) return;

    let prompt = '';
    if (actionType === 'explain') {
      prompt = `Explain this code in clear, concise points with complexity analysis:\n\`\`\`\n${codeContent}\n\`\`\``;
    } else if (actionType === 'refactor') {
      prompt = `Refactor this code for optimal readability, performance, and best practices. Return the refactored code block:\n\`\`\`\n${codeContent}\n\`\`\``;
    } else if (actionType === 'tests') {
      prompt = `Generate comprehensive unit tests with edge cases for this code:\n\`\`\`\n${codeContent}\n\`\`\``;
    } else if (actionType === 'debug') {
      prompt = `Inspect this code for potential bugs, security vulnerabilities, or off-by-one errors:\n\`\`\`\n${codeContent}\n\`\`\``;
    }

    setIsGenerating(true);
    setAiResponse('');

    await streamChatCompletion(
      [{ role: 'user', content: prompt }],
      undefined,
      {},
      (token) => setAiResponse(prev => prev + token.text),
      () => setIsGenerating(false),
      (err) => {
        setIsGenerating(false);
        alert('AI Assistant error: ' + err.message);
      }
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 60px)', backgroundColor: 'var(--bg-app)' }}>
      {/* Left Project / Files list */}
      <div style={{
        width: '220px',
        backgroundColor: 'rgba(14, 20, 36, 0.85)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Projects ({projects.length})
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {projects.map((proj) => {
            const isActive = activeProject?.id === proj.id;
            return (
              <div
                key={proj.id}
                onClick={() => {
                  setActiveProject(proj);
                  setActiveFileIndex(0);
                  setCodeContent(proj.files[0]?.content || '');
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'rgba(220, 38, 38, 0.08)' : 'transparent',
                  color: isActive ? '#dc2626' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FileCode size={14} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {proj.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center: Code Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-subtle)' }}>
        {/* Editor Tab bar */}
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#070a12',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              {activeProject?.files[activeFileIndex]?.name || 'scratchpad.py'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleAiAction('explain')}>
              <Sparkles size={12} color="#dc2626" />
              <span>Explain</span>
            </button>
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleAiAction('refactor')}>
              <Wrench size={12} color="#34d399" />
              <span>Refactor</span>
            </button>
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleAiAction('debug')}>
              <Bug size={12} color="#f87171" />
              <span>Debug</span>
            </button>
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleAiAction('tests')}>
              <span>Unit Tests</span>
            </button>
          </div>
        </div>

        {/* Textarea code editor */}
        <textarea
          value={codeContent}
          onChange={(e) => handleSaveCode(e.target.value)}
          style={{
            flex: 1,
            width: '100%',
            backgroundColor: '#060810',
            color: '#e2e8f0',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '13px',
            lineHeight: 1.6,
            padding: '16px',
            border: 'none',
            resize: 'none',
            outline: 'none',
            tabSize: 4,
          }}
          spellCheck={false}
        />
      </div>

      {/* Right: AI Output Panel */}
      <div style={{ width: '380px', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(11, 16, 28, 0.95)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
            <Sparkles size={14} color="#dc2626" />
            <span>AI Code Analysis</span>
          </div>

          {aiResponse && (
            <button
              className="btn btn-secondary"
              style={{ padding: '3px 8px', fontSize: '11px' }}
              onClick={() => {
                navigator.clipboard.writeText(aiResponse);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', fontSize: '13px', lineHeight: 1.6, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
          {aiResponse ? (
            <div>{aiResponse}</div>
          ) : isGenerating ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
              <span className="pulse-dot">⚡</span>
              <span>Generating code insights locally...</span>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px', fontSize: '12.5px' }}>
              Select an action above (Explain, Refactor, Debug, Unit Tests) to analyze your code with the local model.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
