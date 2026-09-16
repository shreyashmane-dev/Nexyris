import React, { useState, useEffect, useRef } from 'react';
import { 
  Code2, 
  FileCode, 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  Copy, 
  Bug, 
  Wrench, 
  Send, 
  FilePlus, 
  FolderPlus, 
  ArrowRight,
  ChevronDown,
  Play,
  Terminal,
  X,
  RotateCcw
} from 'lucide-react';
import { CodeProject } from '../../types';
import { fetchCodeProjects, saveCodeProject, deleteCodeProject, streamChatCompletion, executeCode } from '../../lib/api';

interface LanguageConfig {
  id: string;
  name: string;
  extension: string;
  testFramework: string;
  sampleCode: string;
}

const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    extension: '.ts',
    testFramework: 'Vitest / Jest with ts-jest',
    sampleCode: `interface SearchResult<T> {\n  index: number;\n  value: T | null;\n  iterations: number;\n}\n\nfunction binarySearch<T>(arr: T[], target: T): SearchResult<T> {\n  let left = 0;\n  let right = arr.length - 1;\n  let iterations = 0;\n\n  while (left <= right) {\n    iterations++;\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) {\n      return { index: mid, value: arr[mid], iterations };\n    }\n    if (arr[mid] < target) {\n      left = mid + 1;\n    } else {\n      right = mid - 1;\n    }\n  }\n\n  return { index: -1, value: null, iterations };\n}\n\nconst dataset = [10, 20, 30, 40, 50, 60];\nconsole.log('Result for 40:', binarySearch(dataset, 40));\n`,
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    extension: '.js',
    testFramework: 'Node.js Test Runner / Jest',
    sampleCode: `/**\n * Fast binary search in sorted array\n * @param {number[]} arr\n * @param {number} target\n * @returns {number}\n */\nfunction binarySearch(arr, target) {\n  let left = 0;\n  let right = arr.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}\n\nconst numbers = [2, 4, 6, 8, 10, 12, 14];\nconsole.log('Index of 10:', binarySearch(numbers, 10));\n`,
  },
  python: {
    id: 'python',
    name: 'Python',
    extension: '.py',
    testFramework: 'pytest / unittest',
    sampleCode: `def binary_search(arr, target):\n    \"\"\"Perform binary search on a sorted list.\"\"\"\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n\nif __name__ == '__main__':\n    data = [1, 3, 5, 7, 9, 11, 13]\n    print("Index of 7:", binary_search(data, 7))\n`,
  },
  cpp: {
    id: 'cpp',
    name: 'C++',
    extension: '.cpp',
    testFramework: 'GoogleTest (gtest) / Catch2',
    sampleCode: `#include <iostream>\n#include <vector>\n\nint binarySearch(const std::vector<int>& arr, int target) {\n    int left = 0;\n    int right = static_cast<int>(arr.size()) - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}\n\nint main() {\n    std::vector<int> numbers = {1, 3, 5, 7, 9, 11};\n    int idx = binarySearch(numbers, 7);\n    std::cout << "Found 7 at index: " << idx << std::endl;\n    return 0;\n}\n`,
  },
  rust: {
    id: 'rust',
    name: 'Rust',
    extension: '.rs',
    testFramework: 'cargo test (built-in test harness)',
    sampleCode: `pub fn binary_search<T: Ord>(arr: &[T], target: &T) -> Option<usize> {\n    let mut left = 0;\n    let mut right = arr.len();\n\n    while left < right {\n        let mid = left + (right - left) / 2;\n        match arr[mid].cmp(target) {\n            std::cmp::Ordering::Equal => return Some(mid),\n            std::cmp::Ordering::Less => left = mid + 1,\n            std::cmp::Ordering::Greater => right = mid,\n        }\n    }\n    None\n}\n\nfn main() {\n    let list = [10, 20, 30, 40, 50];\n    println!("Found 30 at {:?}", binary_search(&list, &30));\n}\n`,
  },
  go: {
    id: 'go',
    name: 'Go',
    extension: '.go',
    testFramework: 'go test (standard testing package)',
    sampleCode: `package main\n\nimport "fmt"\n\nfunc BinarySearch(arr []int, target int) int {\n\tleft := 0\n\tright := len(arr) - 1\n\tfor left <= right {\n\t\tmid := left + (right-left)/2\n\t\tif arr[mid] == target {\n\t\t\treturn mid\n\t\t} else if arr[mid] < target {\n\t\t\tleft = mid + 1\n\t\t} else {\n\t\t\tright = mid - 1\n\t\t}\n\t}\n\treturn -1\n}\n\nfunc main() {\n\tdata := []int{2, 4, 6, 8, 10, 12}\n\tidx := BinarySearch(data, 8)\n\tfmt.Printf("Found 8 at index %d\\n", idx)\n}\n`,
  },
  java: {
    id: 'java',
    name: 'Java',
    extension: '.java',
    testFramework: 'JUnit 5 / AssertJ',
    sampleCode: `public class SearchAlgorithm {\n    public static int binarySearch(int[] arr, int target) {\n        int left = 0;\n        int right = arr.length - 1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (arr[mid] == target) return mid;\n            if (arr[mid] < target) left = mid + 1;\n            else right = mid - 1;\n        }\n        return -1;\n    }\n\n    public static void main(String[] args) {\n        int[] list = {1, 3, 5, 7, 9};\n        System.out.println("Index of 5: " + binarySearch(list, 5));\n    }\n}\n`,
  },
  sql: {
    id: 'sql',
    name: 'SQL',
    extension: '.sql',
    testFramework: 'pgTAP / SQLite test assertions',
    sampleCode: `-- Optimized indexed analytics query\nSELECT \n    u.id AS user_id,\n    u.username,\n    COUNT(o.id) AS total_orders,\n    SUM(o.amount) AS lifetime_spend\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE u.status = 'active'\nGROUP BY u.id, u.username\nHAVING COUNT(o.id) > 5\nORDER BY lifetime_spend DESC\nLIMIT 10;\n`,
  },
};

function detectLanguage(filename: string): LanguageConfig {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return SUPPORTED_LANGUAGES.typescript;
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.mjs')) return SUPPORTED_LANGUAGES.javascript;
  if (lower.endsWith('.py')) return SUPPORTED_LANGUAGES.python;
  if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.c') || lower.endsWith('.h') || lower.endsWith('.hpp')) return SUPPORTED_LANGUAGES.cpp;
  if (lower.endsWith('.rs')) return SUPPORTED_LANGUAGES.rust;
  if (lower.endsWith('.go')) return SUPPORTED_LANGUAGES.go;
  if (lower.endsWith('.java')) return SUPPORTED_LANGUAGES.java;
  if (lower.endsWith('.sql')) return SUPPORTED_LANGUAGES.sql;
  return SUPPORTED_LANGUAGES.typescript;
}

export const CodeAssistantView: React.FC = () => {
  const [projects, setProjects] = useState<CodeProject[]>([]);
  const [activeProject, setActiveProject] = useState<CodeProject | null>(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [codeContent, setCodeContent] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeAction, setActiveAction] = useState<string>('explain');
  const [appliedFeedback, setAppliedFeedback] = useState(false);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    elapsedMs: number;
    output: string;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

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
        // Create initial default TypeScript project
        const defaultProj = await saveCodeProject({
          name: 'Algorithm Studio',
          description: 'Local multi-language experiments',
          files: [
            {
              name: 'binary_search.ts',
              content: SUPPORTED_LANGUAGES.typescript.sampleCode
            },
            {
              name: 'binary_search.py',
              content: SUPPORTED_LANGUAGES.python.sampleCode
            }
          ]
        });
        setProjects([defaultProj]);
        setActiveProject(defaultProj);
        setCodeContent(defaultProj.files[0]?.content || '');
      }
    } catch (e) {}
  };

  const currentFile = activeProject?.files[activeFileIndex] || { name: 'scratchpad.ts', content: codeContent };
  const currentLang = detectLanguage(currentFile.name);

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

  const handleSelectProject = (proj: CodeProject) => {
    setActiveProject(proj);
    setActiveFileIndex(0);
    setCodeContent(proj.files[0]?.content || '');
  };

  const handleSelectFile = (index: number) => {
    if (!activeProject || !activeProject.files[index]) return;
    setActiveFileIndex(index);
    setCodeContent(activeProject.files[index].content);
  };

  const handleCreateNewProject = async (langKey = 'typescript') => {
    const template = SUPPORTED_LANGUAGES[langKey] || SUPPORTED_LANGUAGES.typescript;
    const name = prompt(`Enter new project name:`, `${template.name} Workspace`);
    if (!name) return;

    const newP = await saveCodeProject({
      name,
      description: `Local ${template.name} workspace`,
      files: [
        {
          name: `main${template.extension}`,
          content: template.sampleCode,
        }
      ]
    });
    setProjects(prev => [...prev, newP]);
    setActiveProject(newP);
    setActiveFileIndex(0);
    setCodeContent(newP.files[0]?.content || '');
  };

  const handleAddFile = async () => {
    if (!activeProject) return;
    const filename = prompt('Enter filename (e.g. utils.ts, main.py, query.sql, algorithm.cpp):', `file_${activeProject.files.length + 1}.ts`);
    if (!filename) return;

    const lang = detectLanguage(filename);
    const updatedFiles = [
      ...activeProject.files,
      {
        name: filename,
        content: `// ${filename} - ${lang.name}\n`,
      }
    ];

    const saved = await saveCodeProject({
      ...activeProject,
      files: updatedFiles,
    });
    setActiveProject(saved);
    setActiveFileIndex(updatedFiles.length - 1);
    setCodeContent(updatedFiles[updatedFiles.length - 1].content);
  };

  const handleDeleteFile = async (fileIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeProject || activeProject.files.length <= 1) {
      alert('Cannot delete the last remaining file in the project.');
      return;
    }

    if (!confirm(`Delete ${activeProject.files[fileIndex].name}?`)) return;

    const updatedFiles = activeProject.files.filter((_, idx) => idx !== fileIndex);
    const saved = await saveCodeProject({
      ...activeProject,
      files: updatedFiles,
    });
    setActiveProject(saved);
    const nextIdx = Math.max(0, fileIndex - 1);
    setActiveFileIndex(nextIdx);
    setCodeContent(saved.files[nextIdx]?.content || '');
  };

  const handleDeleteProject = async (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await deleteCodeProject(projId);
      const remaining = projects.filter(p => p.id !== projId);
      setProjects(remaining);
      if (activeProject?.id === projId) {
        if (remaining.length > 0) {
          setActiveProject(remaining[0]);
          setActiveFileIndex(0);
          setCodeContent(remaining[0].files[0]?.content || '');
        } else {
          setActiveProject(null);
          setCodeContent('');
        }
      }
    } catch (e) {}
  };

  const handleAiAction = async (actionType: string, customQuestion?: string) => {
    if (!codeContent.trim() || isGenerating) return;

    const lang = currentLang;
    const filename = currentFile.name;
    setActiveAction(actionType);

    let prompt = '';
    if (actionType === 'explain') {
      prompt = `You are an expert ${lang.name} software architect. Explain this ${lang.name} code clearly with:
1. High-Level Overview & Objective
2. Step-by-Step Logic Breakdown
3. Algorithmic Complexity Analysis (Big-O Time and Space)
4. Design Patterns, Modern Idioms & Best Practices

Code (${filename}):
\`\`\`${lang.id}
${codeContent}
\`\`\``;
    } else if (actionType === 'refactor') {
      prompt = `You are an expert ${lang.name} engineer. Refactor this ${lang.name} code for maximum readability, modern ${lang.name} idioms, performance, and clean architecture.
Return the clean, production-grade refactored code block inside \`\`\`${lang.id} ... \`\`\`, followed by a concise bulleted summary of key improvements made:

Code (${filename}):
\`\`\`${lang.id}
${codeContent}
\`\`\``;
    } else if (actionType === 'tests') {
      prompt = `You are an expert ${lang.name} test engineer. Write a comprehensive, production-grade unit test suite for this ${lang.name} code using ${lang.testFramework}.
Include:
- Normal / happy path execution tests
- Boundary condition tests
- Edge cases (null/empty data, large values, off-by-one checks)
- Descriptive test names and clear assertions

Code (${filename}):
\`\`\`${lang.id}
${codeContent}
\`\`\``;
    } else if (actionType === 'debug') {
      prompt = `You are a static code analysis and security auditing expert for ${lang.name}. Thoroughly inspect this ${lang.name} code for:
1. Syntax, typing, or compilation issues
2. Logical flaws, infinite loops, and boundary/off-by-one bugs
3. Resource leaks, race conditions, or unhandled errors
4. Concrete fix suggestions with corrected code snippets

Code (${filename}):
\`\`\`${lang.id}
${codeContent}
\`\`\``;
    } else if (actionType === 'custom') {
      const q = (customQuestion || aiPrompt).trim();
      if (!q) return;
      prompt = `You are an expert ${lang.name} engineer assisting with this ${lang.name} codebase (${filename}).

User Query: ${q}

Code (${filename}):
\`\`\`${lang.id}
${codeContent}
\`\`\``;
      setAiPrompt('');
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

  // Helper to extract first code block from AI response and apply to editor
  const extractCodeBlock = (text: string): string | null => {
    const match = /```[a-zA-Z0-9_-]*\n([\s\S]*?)```/.exec(text);
    return match ? match[1] : null;
  };

  const handleApplyRefactoredCode = () => {
    const extracted = extractCodeBlock(aiResponse);
    if (extracted) {
      handleSaveCode(extracted);
      setAppliedFeedback(true);
      setTimeout(() => setAppliedFeedback(false), 2500);
    }
  };

  const handleRunCode = async () => {
    if (!codeContent.trim() || isRunningCode) return;
    setIsRunningCode(true);
    setShowConsole(true);
    try {
      const result = await executeCode(codeContent, currentLang.id, currentFile.name);
      setExecutionResult(result);
    } catch (err: any) {
      setExecutionResult({
        stdout: '',
        stderr: err?.message || 'Failed to execute code locally.',
        exitCode: 1,
        elapsedMs: 0,
        output: err?.message || 'Failed to execute code locally.',
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  const handleScrollSync = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lines = codeContent.split('\n');
  const extractedCode = extractCodeBlock(aiResponse);

  // Formats AI markdown response with headers, code blocks, bold text, and lists
  const renderFormattedAiResponse = (content: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: Array<{ type: 'text' | 'code'; code?: string; language?: string; text?: string }> = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIdx) {
        parts.push({ type: 'text', text: content.slice(lastIdx, match.index) });
      }
      parts.push({
        type: 'code',
        language: match[1] || currentLang.id,
        code: match[2],
      });
      lastIdx = match.index + match[0].length;
    }

    if (lastIdx < content.length) {
      parts.push({ type: 'text', text: content.slice(lastIdx) });
    }

    return (
      <div className="flex flex-col gap-3 font-body-sm leading-relaxed">
        {parts.map((p, idx) => {
          if (p.type === 'code' && p.code) {
            const blockCode = p.code;
            return (
              <div key={idx} className="bg-[#121214] rounded-xl border border-neutral-800 overflow-hidden my-2 shadow-sm">
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#1c1c1f] border-b border-neutral-800 text-xs">
                  <span className="font-mono text-primary font-semibold text-[11px] uppercase tracking-wider">
                    {p.language || currentLang.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        handleSaveCode(blockCode);
                        setAppliedFeedback(true);
                        setTimeout(() => setAppliedFeedback(false), 2500);
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/20 hover:bg-primary/30 text-primary hover:text-white text-[11px] font-medium transition-colors border-none cursor-pointer"
                      title="Apply this code to editor"
                      type="button"
                    >
                      <span>{appliedFeedback ? 'Applied!' : 'Apply to Editor'}</span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(blockCode);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[11px] font-medium transition-colors border-none cursor-pointer"
                      type="button"
                    >
                      <Copy size={11} />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
                <pre className="p-3 font-mono text-[12px] leading-relaxed text-[#f4f4f5] bg-[#121214] overflow-x-auto select-text m-0">
                  <code>{blockCode}</code>
                </pre>
              </div>
            );
          }

          // Format markdown headings, bullet points, and bold text
          const lines = (p.text || '').split('\n');
          return (
            <div key={idx} className="space-y-1.5 text-on-surface">
              {lines.map((line, lineIdx) => {
                const trimmed = line.trim();
                if (trimmed.startsWith('### ')) {
                  return (
                    <h4 key={lineIdx} className="font-semibold text-primary text-xs uppercase tracking-wider mt-3 mb-1">
                      {trimmed.slice(4)}
                    </h4>
                  );
                }
                if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
                  return (
                    <h3 key={lineIdx} className="font-bold text-on-surface text-sm mt-3 mb-1 border-b border-surface-container-highest pb-1">
                      {trimmed.replace(/^#+\s*/, '')}
                    </h3>
                  );
                }
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                  return (
                    <div key={lineIdx} className="flex items-start gap-2 pl-2">
                      <span className="text-primary mt-1.5 text-[8px]">•</span>
                      <span className="flex-1 text-on-surface text-xs leading-relaxed">
                        {trimmed.slice(2)}
                      </span>
                    </div>
                  );
                }
                if (/^\d+\.\s/.test(trimmed)) {
                  const numberMatch = trimmed.match(/^(\d+\.)\s*(.*)/);
                  return (
                    <div key={lineIdx} className="flex items-start gap-2 pl-2">
                      <span className="text-primary font-mono text-xs font-semibold">{numberMatch?.[1]}</span>
                      <span className="flex-1 text-on-surface text-xs leading-relaxed">{numberMatch?.[2]}</span>
                    </div>
                  );
                }
                if (!trimmed) {
                  return <div key={lineIdx} className="h-1.5" />;
                }
                return (
                  <p key={lineIdx} className="text-xs text-on-surface leading-relaxed m-0">
                    {line}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex h-[calc(100vh-3.5rem)] bg-surface overflow-hidden">
      {/* Left Project Explorer */}
      <div className="w-60 bg-surface-container-low border-r border-surface-container-highest flex flex-col flex-shrink-0 select-none">
        <div className="px-4 py-3 border-b border-surface-container-highest flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 size={15} className="text-primary" />
            <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider font-label-telemetry">
              Projects ({projects.length})
            </span>
          </div>

          <button
            onClick={() => handleCreateNewProject('typescript')}
            className="p-1 rounded hover:bg-surface-container text-secondary hover:text-primary transition-colors border-none bg-transparent cursor-pointer flex items-center gap-1"
            title="New Project (TypeScript / Python / C++ / etc.)"
            type="button"
          >
            <FolderPlus size={15} />
          </button>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {projects.map((proj) => {
            const isActive = activeProject?.id === proj.id;
            return (
              <div
                key={proj.id}
                onClick={() => handleSelectProject(proj)}
                className={`group px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  isActive 
                    ? 'bg-primary text-white font-semibold shadow-xs' 
                    : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <FileCode size={14} className={isActive ? 'text-white' : 'text-primary'} />
                  <span className="truncate">{proj.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleDeleteProject(proj.id, e)}
                    className="p-0.5 rounded hover:bg-black/20 text-current transition-colors border-none bg-transparent cursor-pointer"
                    title="Delete Project"
                    type="button"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Language Template Presets */}
        <div className="p-3 border-t border-surface-container-highest bg-surface-container-lowest flex flex-col gap-1.5">
          <span className="font-label-telemetry text-[10px] text-secondary uppercase tracking-wider">
            Quick Template
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {['typescript', 'python', 'javascript', 'cpp', 'rust', 'go'].map((langKey) => (
              <button
                key={langKey}
                onClick={() => handleCreateNewProject(langKey)}
                className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-mono transition-colors border border-surface-container-highest text-left cursor-pointer truncate"
                type="button"
              >
                + {SUPPORTED_LANGUAGES[langKey].name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Center: Code Editor */}
      <div className="flex-1 flex flex-col border-r border-surface-container-highest bg-[#18181b]">
        {/* Editor Tab bar */}
        <div className="px-3 py-2 bg-[#212124] border-b border-neutral-800 flex items-center justify-between flex-shrink-0 select-none">
          {/* File Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[50%]">
            {activeProject?.files.map((file, idx) => {
              const isSelected = activeFileIndex === idx;
              return (
                <div
                  key={idx}
                  onClick={() => handleSelectFile(idx)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-mono cursor-pointer transition-colors border ${
                    isSelected 
                      ? 'bg-[#18181b] text-[#f4f4f5] border-neutral-700 font-semibold' 
                      : 'bg-[#27272a] text-neutral-400 hover:text-white border-transparent'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  {activeProject.files.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteFile(idx, e)}
                      className="p-0.5 rounded hover:bg-white/10 text-neutral-400 hover:text-red-400 border-none bg-transparent cursor-pointer ml-1"
                      title="Delete file"
                      type="button"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              onClick={handleAddFile}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#27272a] hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs transition-colors border-none cursor-pointer"
              title="Add file to project"
              type="button"
            >
              <FilePlus size={13} />
              <span>File</span>
            </button>
          </div>

          {/* Active Language Badge & Run Button & AI Action Tools */}
          <div className="flex items-center gap-2">
            {/* Active Language Detection Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#27272a] border border-neutral-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-mono text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                {currentLang.name}
              </span>
            </div>

            {/* Run Code Button */}
            <button
              onClick={handleRunCode}
              disabled={isRunningCode}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all border-none cursor-pointer ${
                isRunningCode
                  ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
              title={`Execute ${currentFile.name} locally on USB`}
              type="button"
            >
              <Play size={11} className={isRunningCode ? 'animate-spin' : 'fill-current'} />
              <span>{isRunningCode ? 'Running...' : 'Run'}</span>
            </button>

            {/* AI Preset Analysis Actions */}
            <div className="flex items-center gap-1.5 bg-[#27272a] p-0.5 rounded-lg border border-neutral-700">
              <button 
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border-none cursor-pointer ${
                  activeAction === 'explain' && isGenerating 
                    ? 'bg-primary text-white' 
                    : 'bg-transparent hover:bg-[#3f3f46] text-white'
                }`}
                onClick={() => handleAiAction('explain')}
                title={`Explain this ${currentLang.name} code`}
                type="button"
              >
                <Sparkles size={12} className="text-red-400" />
                <span>Explain</span>
              </button>

              <button 
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border-none cursor-pointer ${
                  activeAction === 'refactor' && isGenerating 
                    ? 'bg-primary text-white' 
                    : 'bg-transparent hover:bg-[#3f3f46] text-white'
                }`}
                onClick={() => handleAiAction('refactor')}
                title={`Refactor ${currentLang.name} code`}
                type="button"
              >
                <Wrench size={12} className="text-emerald-400" />
                <span>Refactor</span>
              </button>

              <button 
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border-none cursor-pointer ${
                  activeAction === 'debug' && isGenerating 
                    ? 'bg-primary text-white' 
                    : 'bg-transparent hover:bg-[#3f3f46] text-white'
                }`}
                onClick={() => handleAiAction('debug')}
                title={`Debug ${currentLang.name} code`}
                type="button"
              >
                <Bug size={12} className="text-amber-400" />
                <span>Debug</span>
              </button>

              <button 
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border-none cursor-pointer ${
                  activeAction === 'tests' && isGenerating 
                    ? 'bg-primary text-white' 
                    : 'bg-transparent hover:bg-[#3f3f46] text-white'
                }`}
                onClick={() => handleAiAction('tests')}
                title={`Generate ${currentLang.testFramework} unit tests`}
                type="button"
              >
                <span>Tests</span>
              </button>
            </div>
          </div>
        </div>

        {/* Textarea code editor with synchronized line numbers - High Contrast Visible Code */}
        <div className="flex-1 relative flex bg-[#18181b] overflow-hidden">
          {/* Synchronized Line Numbers Gutter */}
          <div 
            ref={lineNumbersRef}
            className="w-12 bg-[#141416] border-r border-neutral-800 text-neutral-500 font-mono text-[13px] leading-relaxed py-4 text-right pr-3 select-none overflow-hidden"
          >
            {lines.map((_, i) => (
              <div key={i} className="leading-relaxed">{i + 1}</div>
            ))}
          </div>

          {/* Code Textarea */}
          <textarea
            ref={textareaRef}
            value={codeContent}
            onScroll={handleScrollSync}
            onChange={(e) => handleSaveCode(e.target.value)}
            className="flex-1 w-full p-4 bg-[#18181b] text-[#f4f4f5] font-mono text-[13px] leading-relaxed border-none resize-none outline-none selection:bg-primary/40 focus:outline-none overflow-y-auto"
            style={{ color: '#f4f4f5', backgroundColor: '#18181b' }}
            spellCheck={false}
            placeholder={`Type or paste ${currentLang.name} code here...`}
          />
        </div>

        {/* Execution Output Console Drawer */}
        {showConsole && (
          <div className="h-44 bg-[#0e0e10] border-t border-neutral-800 flex flex-col flex-shrink-0">
            {/* Console Header */}
            <div className="px-3 py-1.5 bg-[#141416] border-b border-neutral-800 flex items-center justify-between text-xs select-none">
              <div className="flex items-center gap-2">
                <Terminal size={12} className="text-emerald-400" />
                <span className="font-mono text-neutral-300 text-[11px] font-semibold">Console Output</span>
                {executionResult && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    executionResult.exitCode === 0 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' 
                      : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                  }`}>
                    {executionResult.exitCode === 0 ? 'EXIT 0 SUCCESS' : `EXIT ${executionResult.exitCode} ERROR`}
                  </span>
                )}
                {executionResult && (
                  <span className="text-neutral-500 text-[10px] font-mono">
                    {executionResult.elapsedMs}ms
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExecutionResult(null)}
                  className="text-neutral-400 hover:text-neutral-200 text-[11px] bg-transparent border-none cursor-pointer flex items-center gap-1"
                  type="button"
                  title="Clear output"
                >
                  <RotateCcw size={11} />
                  <span>Clear</span>
                </button>
                <button
                  onClick={() => setShowConsole(false)}
                  className="text-neutral-400 hover:text-neutral-200 bg-transparent border-none cursor-pointer p-0.5"
                  type="button"
                  title="Close Console"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Console Body */}
            <div className="flex-1 p-3 font-mono text-[12px] leading-relaxed overflow-y-auto select-text text-neutral-300 bg-[#0e0e10]">
              {isRunningCode ? (
                <div className="flex items-center gap-2 text-amber-400">
                  <span className="animate-spin text-sm">⠋</span>
                  <span>Executing {currentFile.name} with local {currentLang.name} runtime...</span>
                </div>
              ) : executionResult ? (
                <div className="space-y-1">
                  <div className="text-neutral-500 text-[11px]">
                    $ run {currentFile.name}
                  </div>
                  {executionResult.stdout && (
                    <pre className="text-emerald-300 whitespace-pre-wrap m-0 font-mono">
                      {executionResult.stdout}
                    </pre>
                  )}
                  {executionResult.stderr && (
                    <pre className="text-rose-400 whitespace-pre-wrap m-0 font-mono">
                      {executionResult.stderr}
                    </pre>
                  )}
                  {!executionResult.stdout && !executionResult.stderr && (
                    <div className="text-neutral-500 italic">
                      [Process completed with exit code {executionResult.exitCode} and no output]
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-neutral-500 italic text-[11px]">
                  Click "Run" above to execute this code locally on USB or view process outputs here.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Editor Status Bar */}
        <div className="h-6 px-4 bg-[#141416] border-t border-neutral-800 flex items-center justify-between text-[11px] font-mono text-neutral-400 select-none flex-shrink-0">
          <div className="flex items-center gap-3">
            <span>{currentFile.name}</span>
            <span>·</span>
            <span className="text-emerald-400">{currentLang.name}</span>
            <span>·</span>
            <span>{lines.length} lines</span>
            <span>·</span>
            <span>{codeContent.length} chars</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConsole(prev => !prev)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors border-none cursor-pointer ${
                showConsole ? 'bg-primary/20 text-primary' : 'bg-transparent text-neutral-400 hover:text-white'
              }`}
              type="button"
            >
              <Terminal size={11} />
              <span>Console {executionResult ? (executionResult.exitCode === 0 ? '✓' : '✗') : ''}</span>
            </button>
            <span className="text-secondary">Auto-saved to USB</span>
            <span>UTF-8</span>
          </div>
        </div>
      </div>

      {/* Right: AI Code Intelligence Panel */}
      <div className="w-[420px] flex flex-col bg-surface-container-lowest border-l border-surface-container-highest flex-shrink-0 overflow-hidden">
        {/* Panel Header */}
        <div className="px-4 py-2.5 border-b border-surface-container-highest flex items-center justify-between bg-surface-container-low flex-shrink-0">
          <div className="flex items-center gap-2 text-on-surface font-semibold text-xs">
            <Sparkles size={14} className="text-primary" />
            <span>AI Code Intelligence ({currentLang.name})</span>
          </div>

          <div className="flex items-center gap-1.5">
            {extractedCode && (
              <button
                onClick={handleApplyRefactoredCode}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/15 hover:bg-primary text-primary hover:text-white text-xs font-medium transition-colors border-none cursor-pointer"
                title="Replace editor code with AI refactored code"
                type="button"
              >
                <span>{appliedFeedback ? 'Applied!' : 'Apply Code'}</span>
              </button>
            )}
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
        </div>

        {/* Panel Body: Formatted AI Analysis */}
        <div className="flex-1 overflow-y-auto p-4 select-text">
          {aiResponse ? (
            renderFormattedAiResponse(aiResponse)
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-secondary">
              <span className="animate-spin text-2xl mb-3">⚡</span>
              <p className="font-headline-md text-body-md text-on-surface font-semibold mb-1">
                Analyzing {currentLang.name} Code...
              </p>
              <p className="font-body-sm text-secondary text-xs max-w-xs">
                Local model is streaming real-time complexity breakdown and code insights.
              </p>
            </div>
          ) : (
            <div className="text-center mt-16 px-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <Sparkles size={20} />
              </div>
              <h4 className="font-headline-md text-body-md font-semibold text-on-surface mb-1">
                {currentLang.name} Assistant Ready
              </h4>
              <p className="text-xs text-secondary max-w-xs mx-auto leading-relaxed mb-6">
                Select an action above (<strong className="text-on-surface">Explain</strong>, <strong className="text-on-surface">Refactor</strong>, <strong className="text-on-surface">Debug</strong>, <strong className="text-on-surface">Tests</strong>) or ask a custom question below.
              </p>
            </div>
          )}
        </div>

        {/* Interactive Freeform AI Query Bar */}
        <div className="p-3 border-t border-surface-container-highest bg-surface-container-low flex-shrink-0">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleAiAction('custom');
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={`Ask AI about this ${currentLang.name} code...`}
              disabled={isGenerating}
              className="flex-1 px-3 py-2 bg-surface-container-lowest border border-surface-container-highest rounded-lg text-xs text-on-surface placeholder:text-secondary focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isGenerating || !aiPrompt.trim()}
              className="p-2 rounded-lg bg-primary hover:bg-primary-container text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-none cursor-pointer flex items-center justify-center"
              title="Send prompt to AI"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
