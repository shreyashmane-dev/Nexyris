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
    <div className="flex-1 flex h-[calc(100vh-3.5rem)] bg-surface overflow-hidden">
      {/* Left Project / Files list */}
      <div className="w-56 bg-surface-container-low border-r border-surface-container-highest flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-surface-container-highest flex items-center justify-between">
          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider font-label-telemetry">
            Projects ({projects.length})
          </span>
          <button
            onClick={async () => {
              const name = prompt('Enter project name:');
              if (!name) return;
              const newP = await saveCodeProject({ name, files: [{ name: 'main.py', content: '# Python code\nprint("Hello Nexyris")\n' }] });
              setProjects([...projects, newP]);
              setActiveProject(newP);
              setCodeContent(newP.files[0]?.content || '');
            }}
            className="p-1 rounded hover:bg-surface-container text-secondary hover:text-primary transition-colors border-none bg-transparent cursor-pointer"
            title="New Project"
            type="button"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
                className={`px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-2 ${
                  isActive 
                    ? 'bg-primary text-white font-semibold shadow-xs' 
                    : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                <FileCode size={14} className={isActive ? 'text-white' : 'text-secondary'} />
                <span className="truncate flex-1">{proj.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center: Code Editor */}
      <div className="flex-1 flex flex-col border-r border-surface-container-highest bg-[#18181b]">
        {/* Editor Tab bar */}
        <div className="px-4 py-2.5 bg-[#27272a] border-b border-neutral-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="font-mono text-xs font-semibold text-[#f4f4f5]">
              {activeProject?.files[activeFileIndex]?.name || 'scratchpad.py'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#3f3f46] hover:bg-primary text-white text-xs font-medium transition-colors border-none cursor-pointer" 
              onClick={() => handleAiAction('explain')}
              type="button"
            >
              <Sparkles size={12} className="text-red-400" />
              <span>Explain</span>
            </button>
            <button 
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#3f3f46] hover:bg-primary text-white text-xs font-medium transition-colors border-none cursor-pointer" 
              onClick={() => handleAiAction('refactor')}
              type="button"
            >
              <Wrench size={12} className="text-emerald-400" />
              <span>Refactor</span>
            </button>
            <button 
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#3f3f46] hover:bg-primary text-white text-xs font-medium transition-colors border-none cursor-pointer" 
              onClick={() => handleAiAction('debug')}
              type="button"
            >
              <Bug size={12} className="text-amber-400" />
              <span>Debug</span>
            </button>
            <button 
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#3f3f46] hover:bg-primary text-white text-xs font-medium transition-colors border-none cursor-pointer" 
              onClick={() => handleAiAction('tests')}
              type="button"
            >
              <span>Tests</span>
            </button>
          </div>
        </div>

        {/* Textarea code editor - High Contrast Visible Code */}
        <div className="flex-1 relative flex bg-[#18181b]">
          <textarea
            value={codeContent}
            onChange={(e) => handleSaveCode(e.target.value)}
            className="flex-1 w-full p-4 bg-[#18181b] text-[#f4f4f5] font-mono text-[13px] leading-relaxed border-none resize-none outline-none selection:bg-primary/40 focus:outline-none"
            style={{ color: '#f4f4f5', backgroundColor: '#18181b' }}
            spellCheck={false}
          />
        </div>
      </div>

      {/* Right: AI Output Panel */}
      <div className="w-96 flex flex-col bg-surface-container-lowest border-l border-surface-container-highest flex-shrink-0">
        <div className="px-4 py-2.5 border-b border-surface-container-highest flex items-center justify-between bg-surface-container-low flex-shrink-0">
          <div className="flex items-center gap-2 text-on-surface font-semibold text-xs">
            <Sparkles size={14} className="text-primary" />
            <span>AI Code Analysis</span>
          </div>

          {aiResponse && (
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium transition-colors border-none cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(aiResponse);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              type="button"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 text-xs font-mono leading-relaxed text-on-surface space-y-3">
          {aiResponse ? (
            <div className="whitespace-pre-wrap leading-relaxed text-on-surface">
              {aiResponse}
            </div>
          ) : isGenerating ? (
            <div className="flex items-center gap-2 text-primary font-medium p-4 bg-primary/5 rounded-lg border border-primary/20">
              <span className="animate-spin text-sm">⚡</span>
              <span>Generating code analysis via local model...</span>
            </div>
          ) : (
            <div className="text-secondary text-center mt-12 text-xs leading-relaxed max-w-xs mx-auto">
              Select an action above (<strong className="text-on-surface">Explain</strong>, <strong className="text-on-surface">Refactor</strong>, <strong className="text-on-surface">Debug</strong>, <strong className="text-on-surface">Tests</strong>) to analyze your code with the local model.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
