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
  RotateCcw,
  Search,
  Replace,
  Download,
  Upload,
  Globe,
  FileDown,
  ShieldAlert,
  Wand2,
  ExternalLink,
  BookOpen,
  Zap,
  Shield,
  HelpCircle,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { CodeProject } from '../../types';
import { 
  fetchCodeProjects, 
  saveCodeProject, 
  deleteCodeProject, 
  streamChatCompletion, 
  executeCode,
  executePluginTool
} from '../../lib/api';

export interface LanguageConfig {
  id: string;
  name: string;
  extension: string;
  testFramework: string;
  sampleCode: string;
  color: string;
  badge: string;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    extension: '.ts',
    color: '#3178c6',
    badge: 'TS',
    testFramework: 'Vitest / Jest with ts-jest',
    sampleCode: `interface SearchResult<T> {\n  index: number;\n  value: T | null;\n  iterations: number;\n}\n\nfunction binarySearch<T>(arr: T[], target: T): SearchResult<T> {\n  let left = 0;\n  let right = arr.length - 1;\n  let iterations = 0;\n\n  while (left <= right) {\n    iterations++;\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) {\n      return { index: mid, value: arr[mid], iterations };\n    }\n    if (arr[mid] < target) {\n      left = mid + 1;\n    } else {\n      right = mid - 1;\n    }\n  }\n\n  return { index: -1, value: null, iterations };\n}\n\nconst dataset = [10, 20, 30, 40, 50, 60];\nconsole.log('Result for 40:', binarySearch(dataset, 40));\n`,
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    extension: '.js',
    color: '#eab308',
    badge: 'JS',
    testFramework: 'Node.js Test Runner / Jest',
    sampleCode: `/**\n * Fast binary search in sorted array\n * @param {number[]} arr\n * @param {number} target\n * @returns {number}\n */\nfunction binarySearch(arr, target) {\n  let left = 0;\n  let right = arr.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}\n\nconst numbers = [2, 4, 6, 8, 10, 12, 14];\nconsole.log('Index of 10:', binarySearch(numbers, 10));\n`,
  },
  python: {
    id: 'python',
    name: 'Python',
    extension: '.py',
    color: '#3b82f6',
    badge: 'PY',
    testFramework: 'pytest / unittest',
    sampleCode: `def binary_search(arr, target):\n    \"\"\"Perform binary search on a sorted list.\"\"\"\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n\nif __name__ == '__main__':\n    data = [1, 3, 5, 7, 9, 11, 13]\n    print("Index of 7:", binary_search(data, 7))\n`,
  },
  cpp: {
    id: 'cpp',
    name: 'C++',
    extension: '.cpp',
    color: '#ec4899',
    badge: 'C++',
    testFramework: 'GoogleTest (gtest) / Catch2',
    sampleCode: `#include <iostream>\n#include <vector>\n\nint binarySearch(const std::vector<int>& arr, int target) {\n    int left = 0;\n    int right = static_cast<int>(arr.size()) - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}\n\nint main() {\n    std::vector<int> numbers = {1, 3, 5, 7, 9, 11};\n    int idx = binarySearch(numbers, 7);\n    std::cout << "Found 7 at index: " << idx << std::endl;\n    return 0;\n}\n`,
  },
  rust: {
    id: 'rust',
    name: 'Rust',
    extension: '.rs',
    color: '#f97316',
    badge: 'RS',
    testFramework: 'cargo test (built-in test harness)',
    sampleCode: `pub fn binary_search<T: Ord>(arr: &[T], target: &T) -> Option<usize> {\n    let mut left = 0;\n    let mut right = arr.len();\n\n    while left < right {\n        let mid = left + (right - left) / 2;\n        match arr[mid].cmp(target) {\n            std::cmp::Ordering::Equal => return Some(mid),\n            std::cmp::Ordering::Less => left = mid + 1,\n            std::cmp::Ordering::Greater => right = mid,\n        }\n    }\n    None\n}\n\nfn main() {\n    let list = [10, 20, 30, 40, 50];\n    println!("Found 30 at {:?}", binary_search(&list, &30));\n}\n`,
  },
  go: {
    id: 'go',
    name: 'Go',
    extension: '.go',
    color: '#06b6d4',
    badge: 'GO',
    testFramework: 'go test (standard testing package)',
    sampleCode: `package main\n\nimport "fmt"\n\nfunc BinarySearch(arr []int, target int) int {\n\tleft := 0\n\tright := len(arr) - 1\n\tfor left <= right {\n\t\tmid := left + (right-left)/2\n\t\tif arr[mid] == target {\n\t\t\treturn mid\n\t\t} else if arr[mid] < target {\n\t\t\tleft = mid + 1\n\t\t} else {\n\t\t\tright = mid - 1\n\t\t}\n\t}\n\treturn -1\n}\n\nfunc main() {\n\tdata := []int{2, 4, 6, 8, 10, 12}\n\tidx := BinarySearch(data, 8)\n\tfmt.Printf("Found 8 at index %d\\n", idx)\n}\n`,
  },
  java: {
    id: 'java',
    name: 'Java',
    extension: '.java',
    color: '#d97706',
    badge: 'JV',
    testFramework: 'JUnit 5 / AssertJ',
    sampleCode: `public class SearchAlgorithm {\n    public static int binarySearch(int[] arr, int target) {\n        int left = 0;\n        int right = arr.length - 1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (arr[mid] == target) return mid;\n            if (arr[mid] < target) left = mid + 1;\n            else right = mid - 1;\n        }\n        return -1;\n    }\n\n    public static void main(String[] args) {\n        int[] list = {1, 3, 5, 7, 9};\n        System.out.println("Index of 5: " + binarySearch(list, 5));\n    }\n}\n`,
  },
  csharp: {
    id: 'csharp',
    name: 'C#',
    extension: '.cs',
    color: '#10b981',
    badge: 'C#',
    testFramework: 'xUnit / NUnit',
    sampleCode: `using System;\n\npublic class Program {\n    public static int BinarySearch(int[] arr, int target) {\n        int left = 0, right = arr.Length - 1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (arr[mid] == target) return mid;\n            if (arr[mid] < target) left = mid + 1;\n            else right = mid - 1;\n        }\n        return -1;\n    }\n\n    public static void Main() {\n        int[] numbers = { 1, 3, 5, 7, 9, 11 };\n        Console.WriteLine($"Found 7 at index: {BinarySearch(numbers, 7)}");\n    }\n}\n`,
  },
  sql: {
    id: 'sql',
    name: 'SQL',
    extension: '.sql',
    color: '#8b5cf6',
    badge: 'SQL',
    testFramework: 'pgTAP / SQLite test assertions',
    sampleCode: `-- Optimized indexed analytics query\nSELECT \n    u.id AS user_id,\n    u.username,\n    COUNT(o.id) AS total_orders,\n    SUM(o.amount) AS lifetime_spend\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE u.status = 'active'\nGROUP BY u.id, u.username\nHAVING COUNT(o.id) > 5\nORDER BY lifetime_spend DESC\nLIMIT 10;\n`,
  },
  html: {
    id: 'html',
    name: 'HTML & CSS',
    extension: '.html',
    color: '#ef4444',
    badge: 'HTML',
    testFramework: 'Playwright / Cypress',
    sampleCode: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Nexyris Local Studio</title>\n  <style>\n    body { font-family: system-ui, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }\n    .card { background: #18181b; padding: 2rem; border-radius: 1rem; border: 1px solid #27272a; text-align: center; }\n    .badge { color: #dc2626; font-weight: bold; }\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h1>Hello from <span class="badge">Nexyris</span></h1>\n    <p>Portable Local AI Code Workspace running 100% offline.</p>\n  </div>\n</body>\n</html>\n`,
  },
  json: {
    id: 'json',
    name: 'JSON',
    extension: '.json',
    color: '#ca8a04',
    badge: '{ }',
    testFramework: 'JSON Schema / ajv',
    sampleCode: `{\n  "name": "nexyris-project",\n  "version": "1.0.0",\n  "private": true,\n  "description": "High performance offline neural co-pilot workspace",\n  "scripts": {\n    "build": "vite build",\n    "test": "node --test"\n  },\n  "dependencies": {\n    "react": "^18.3.1"\n  }\n}\n`,
  },
  bash: {
    id: 'bash',
    name: 'Bash / Shell',
    extension: '.sh',
    color: '#22c55e',
    badge: 'SH',
    testFramework: 'Bats (Bash Automated Testing System)',
    sampleCode: `#!/usr/bin/env bash\n# Nexyris Portable Environment Health Check\nset -euo pipefail\n\necho "Checking USB mount and system memory..."\nfree -h 2>/dev/null || vm_stat 2>/dev/null || echo "Running on Host OS"\n\necho "Nexyris Offline Engine Ready."\nexit 0\n`,
  },
  markdown: {
    id: 'markdown',
    name: 'Markdown',
    extension: '.md',
    color: '#6366f1',
    badge: 'MD',
    testFramework: 'markdownlint',
    sampleCode: `# Project Specification\n\n## Overview\nThis is a portable local development environment designed for offline inference.\n\n### Key Features\n- 100% Offline SQLite database persistence\n- Hardware-accelerated local LLM execution\n- Interactive multi-language workspace\n`,
  },
};

export function detectLanguage(filename: string): LanguageConfig {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return SUPPORTED_LANGUAGES.typescript;
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.mjs')) return SUPPORTED_LANGUAGES.javascript;
  if (lower.endsWith('.py')) return SUPPORTED_LANGUAGES.python;
  if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.c') || lower.endsWith('.h') || lower.endsWith('.hpp')) return SUPPORTED_LANGUAGES.cpp;
  if (lower.endsWith('.rs')) return SUPPORTED_LANGUAGES.rust;
  if (lower.endsWith('.go')) return SUPPORTED_LANGUAGES.go;
  if (lower.endsWith('.java')) return SUPPORTED_LANGUAGES.java;
  if (lower.endsWith('.cs')) return SUPPORTED_LANGUAGES.csharp;
  if (lower.endsWith('.sql')) return SUPPORTED_LANGUAGES.sql;
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return SUPPORTED_LANGUAGES.html;
  if (lower.endsWith('.json')) return SUPPORTED_LANGUAGES.json;
  if (lower.endsWith('.sh') || lower.endsWith('.bash')) return SUPPORTED_LANGUAGES.bash;
  if (lower.endsWith('.md')) return SUPPORTED_LANGUAGES.markdown;
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
  const [aiError, setAiError] = useState<string | null>(null);

  // Language Dropdown Selector State
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const [executionResult, setExecutionResult] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    elapsedMs: number;
    output: string;
  } | null>(null);

  // Search & Replace
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [formatSuccess, setFormatSuccess] = useState(false);

  // Workspace World Connect Plugins Drawer
  const [showPluginDrawer, setShowPluginDrawer] = useState(false);
  const [activePluginTab, setActivePluginTab] = useState<'web_fetch' | 'github' | 'search_code' | 'security'>('web_fetch');
  const [pluginUrl, setPluginUrl] = useState('https://raw.githubusercontent.com/facebook/react/main/package.json');
  const [pluginRepo, setPluginRepo] = useState('facebook/react');
  const [pluginFilePath, setPluginFilePath] = useState('package.json');
  const [pluginSearchTerm, setPluginSearchTerm] = useState('binary search');
  const [pluginExecuting, setPluginExecuting] = useState(false);
  const [pluginResultData, setPluginResultData] = useState<any>(null);
  const [pluginNotification, setPluginNotification] = useState<string | null>(null);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setShowLangDropdown(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLangDropdown(false);
      }
    };
    if (showLangDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showLangDropdown]);

  const handleSelectLanguage = (langKey: string) => {
    const selected = SUPPORTED_LANGUAGES[langKey];
    if (!selected || !activeProject) return;

    setShowLangDropdown(false);
    setLangSearch('');

    const current = activeProject.files[activeFileIndex];
    if (!current) return;

    const baseName = current.name.includes('.') 
      ? current.name.substring(0, current.name.lastIndexOf('.')) 
      : current.name;
    const newFileName = `${baseName}${selected.extension}`;

    // If current file is empty or matches any default sample, load the new language's starter sample
    const isSampleOrEmpty = !codeContent.trim() || Object.values(SUPPORTED_LANGUAGES).some(l => l.sampleCode.trim() === codeContent.trim());
    const newCode = isSampleOrEmpty ? selected.sampleCode : codeContent;

    const updatedFiles = activeProject.files.map((f, idx) => {
      if (idx === activeFileIndex) {
        return { ...f, name: newFileName, content: newCode };
      }
      return f;
    });

    const updatedProj = { ...activeProject, files: updatedFiles, updated_at: new Date().toISOString() };
    setActiveProject(updatedProj);
    setCodeContent(newCode);
    saveCodeProject({ ...updatedProj });
  };

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

  const handleFormatCode = () => {
    try {
      if (currentFile.name.endsWith('.json')) {
        const parsed = JSON.parse(codeContent);
        const formatted = JSON.stringify(parsed, null, 2);
        handleSaveCode(formatted);
      } else {
        const lines = codeContent.split('\n');
        const cleaned = lines
          .map(l => l.trimEnd())
          .join('\n')
          .replace(/\n{3,}/g, '\n\n');
        handleSaveCode(cleaned);
      }
      setFormatSuccess(true);
      setTimeout(() => setFormatSuccess(false), 2000);
    } catch (e) {
      alert('Formatting error: ' + (e as any).message);
    }
  };

  const handleDownloadCurrentFile = () => {
    const blob = new Blob([codeContent], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = currentFile.name;
    a.click();
  };

  const handleExportProject = () => {
    if (!activeProject) return;
    const blob = new Blob([JSON.stringify(activeProject, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeProject.name.toLowerCase().replace(/\s+/g, '-')}-project.json`;
    a.click();
  };

  const handleImportLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const newFile = { name: file.name, content };
      const updatedFiles = [...activeProject.files, newFile];
      const saved = await saveCodeProject({
        ...activeProject,
        files: updatedFiles,
      });
      setActiveProject(saved);
      setActiveFileIndex(updatedFiles.length - 1);
      setCodeContent(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReplaceOne = () => {
    if (!searchQuery) return;
    const newCode = codeContent.replace(searchQuery, replaceQuery);
    handleSaveCode(newCode);
  };

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    const newCode = codeContent.replaceAll(searchQuery, replaceQuery);
    handleSaveCode(newCode);
  };

  const handlePluginFetch = async () => {
    setPluginExecuting(true);
    setPluginResultData(null);
    try {
      if (activePluginTab === 'web_fetch') {
        const res = await executePluginTool('web_fetch', 'fetch_webpage', { url: pluginUrl, maxChars: 8000 });
        setPluginResultData(res.result);
      } else if (activePluginTab === 'github') {
        const res = await executePluginTool('github_explorer', 'fetch_github_file', { repo: pluginRepo, path: pluginFilePath });
        setPluginResultData(res.result);
      } else if (activePluginTab === 'search_code') {
        const res = await executePluginTool('world_search', 'web_search', { query: `${pluginSearchTerm} ${currentLang.name} example`, limit: 4 });
        setPluginResultData(res.result);
      }
    } catch (err: any) {
      setPluginResultData({ error: err.message });
    } finally {
      setPluginExecuting(false);
    }
  };

  const handleInsertFetchedCode = async (contentToInsert: string, suggestedFilename?: string) => {
    if (!activeProject || !contentToInsert) return;

    if (suggestedFilename) {
      const newFile = { name: suggestedFilename, content: contentToInsert };
      const updatedFiles = [...activeProject.files, newFile];
      const saved = await saveCodeProject({
        ...activeProject,
        files: updatedFiles,
      });
      setActiveProject(saved);
      setActiveFileIndex(updatedFiles.length - 1);
      setCodeContent(contentToInsert);
      setPluginNotification(`Created new file ${suggestedFilename}!`);
    } else {
      const updated = codeContent + '\n\n' + contentToInsert;
      handleSaveCode(updated);
      setPluginNotification('Inserted code into active file!');
    }
    setTimeout(() => setPluginNotification(null), 3000);
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
    } else if (actionType === 'optimize') {
      prompt = `You are a high-performance systems and algorithms optimization specialist for ${lang.name}.
Analyze this ${lang.name} code (${filename}) for computational complexity, memory allocation overhead, and execution bottlenecks.
Provide:
1. Analysis of Current Time & Space Complexity
2. High-Performance Optimized Code Implementation (inside \`\`\`${lang.id} ... \`\`\`)
3. Benchmarks & Performance Improvements Summary

Code (${filename}):
\`\`\`${lang.id}
${codeContent}
\`\`\``;
    } else if (actionType === 'security') {
      prompt = `You are an application security specialist auditing ${lang.name} code.
Analyze this ${lang.name} code (${filename}) for:
1. Input validation & injection risks (SQLi, XSS, Command Injection)
2. Buffer overflows, memory safety, or resource exhaustion
3. Sensitive data exposure, insecure cryptography, or hardcoded secrets
4. Hardened, secure refactored code (inside \`\`\`${lang.id} ... \`\`\`)

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
    setAiError(null);

    await streamChatCompletion(
      [{ role: 'user', content: prompt }],
      undefined,
      {},
      (token) => setAiResponse(prev => prev + token.text),
      () => setIsGenerating(false),
      (err) => {
        setIsGenerating(false);
        setAiError(err.message || 'Error communicating with local AI model. Ensure a model is running.');
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

          {/* Top Bar Actions: Language Dropdown Selector + Utilities */}
          <div className="flex items-center gap-2">
            {/* Interactive Language Selector Dropdown */}
            <div className="relative" ref={langDropdownRef}>
              <button
                type="button"
                onClick={() => setShowLangDropdown(prev => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#27272a] hover:bg-[#323238] border border-neutral-700 hover:border-neutral-600 transition-colors text-xs cursor-pointer select-none"
                title={`Language: ${currentLang.name} (${currentLang.extension}). Click to switch.`}
              >
                <span 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentLang.color || '#3178c6' }}
                />
                <span className="font-mono text-xs font-semibold text-neutral-200">
                  {currentLang.name}
                </span>
                <span className="text-[10px] px-1 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                  {currentLang.extension}
                </span>
                <ChevronDown size={12} className={`text-neutral-400 transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Language Dropdown Menu */}
              {showLangDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#1e1e22] border border-neutral-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  {/* Dropdown Header & Search */}
                  <div className="p-2.5 border-b border-neutral-800 bg-[#18181b]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider font-mono">
                        Select Language
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {Object.keys(SUPPORTED_LANGUAGES).length} available
                      </span>
                    </div>
                    <div className="relative">
                      <Search size={12} className="absolute left-2 top-2 text-neutral-500" />
                      <input
                        type="text"
                        value={langSearch}
                        onChange={(e) => setLangSearch(e.target.value)}
                        placeholder="Search languages..."
                        className="w-full pl-6 pr-2 py-1 text-xs bg-[#27272a] border border-neutral-700 rounded text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-primary"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Language Options */}
                  <div className="max-h-60 overflow-y-auto p-1 divide-y divide-neutral-800/40">
                    {Object.entries(SUPPORTED_LANGUAGES)
                      .filter(([key, lang]) =>
                        lang.name.toLowerCase().includes(langSearch.toLowerCase()) ||
                        lang.extension.toLowerCase().includes(langSearch.toLowerCase()) ||
                        key.toLowerCase().includes(langSearch.toLowerCase())
                      )
                      .map(([key, lang]) => {
                        const isCurrent = currentLang.id === lang.id;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleSelectLanguage(key)}
                            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left text-xs transition-colors border-none cursor-pointer ${
                              isCurrent
                                ? 'bg-primary/20 text-white font-semibold'
                                : 'bg-transparent hover:bg-[#27272a] text-neutral-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: lang.color }}
                              />
                              <span className="truncate">{lang.name}</span>
                              <span className="text-[10px] font-mono text-neutral-500">
                                {lang.extension}
                              </span>
                            </div>
                            {isCurrent && <Check size={13} className="text-primary flex-shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
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

            {/* Format Button */}
            <button
              onClick={handleFormatCode}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#27272a] hover:bg-[#3f3f46] text-neutral-300 hover:text-white text-xs font-medium transition-colors border border-neutral-700 cursor-pointer"
              title="Clean & Format Code"
              type="button"
            >
              <Wand2 size={12} className={formatSuccess ? 'text-green-400' : 'text-neutral-400'} />
              <span>{formatSuccess ? 'Done' : 'Format'}</span>
            </button>

            {/* Find / Replace Toggle */}
            <button
              onClick={() => setShowSearchReplace(!showSearchReplace)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors border border-neutral-700 cursor-pointer ${
                showSearchReplace ? 'bg-primary text-white' : 'bg-[#27272a] hover:bg-[#3f3f46] text-neutral-300'
              }`}
              title="Search & Replace"
              type="button"
            >
              <Search size={12} />
              <span>Find</span>
            </button>

            {/* World Plugins Drawer Toggle */}
            <button
              onClick={() => setShowPluginDrawer(!showPluginDrawer)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors border cursor-pointer ${
                showPluginDrawer 
                  ? 'bg-primary border-primary text-white' 
                  : 'bg-[#27272a] hover:bg-[#3f3f46] border-primary/40 text-primary hover:text-white'
              }`}
              title="World Connect Plugins for Workspace"
              type="button"
            >
              <Globe size={12} />
              <span>Plugins</span>
            </button>

            {/* Download File */}
            <button
              onClick={handleDownloadCurrentFile}
              className="p-1.5 rounded bg-[#27272a] hover:bg-[#3f3f46] text-neutral-300 hover:text-white transition-colors border border-neutral-700 cursor-pointer"
              title={`Download ${currentFile.name}`}
              type="button"
            >
              <Download size={13} />
            </button>

            {/* Import File Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded bg-[#27272a] hover:bg-[#3f3f46] text-neutral-300 hover:text-white transition-colors border border-neutral-700 cursor-pointer"
              title="Import file from computer into project"
              type="button"
            >
              <Upload size={13} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportLocalFile}
              className="hidden"
            />
          </div>
        </div>

        {/* Dedicated Full-Width AI Actions Toolbar - Highly Visible & Accessible */}
        <div className="px-3 py-1.5 bg-[#1b1b1e] border-b border-neutral-800 flex items-center justify-between gap-2 flex-shrink-0 select-none overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20 mr-1 flex-shrink-0">
              <Sparkles size={12} className="animate-pulse text-primary" />
              <span>AI Assist:</span>
            </div>

            {/* 1. Explain Code */}
            <button
              type="button"
              onClick={() => handleAiAction('explain')}
              disabled={isGenerating}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border cursor-pointer flex-shrink-0 ${
                activeAction === 'explain' && isGenerating
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-[#27272a] hover:bg-[#323238] text-neutral-200 border-neutral-700 hover:border-neutral-600'
              }`}
              title={`Explain this ${currentLang.name} code step-by-step`}
            >
              <Sparkles size={12} className={activeAction === 'explain' && isGenerating ? 'text-white animate-spin' : 'text-amber-400'} />
              <span>Explain</span>
            </button>

            {/* 2. Refactor Code */}
            <button
              type="button"
              onClick={() => handleAiAction('refactor')}
              disabled={isGenerating}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border cursor-pointer flex-shrink-0 ${
                activeAction === 'refactor' && isGenerating
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-[#27272a] hover:bg-[#323238] text-neutral-200 border-neutral-700 hover:border-neutral-600'
              }`}
              title={`Clean, modernize and refactor ${currentLang.name} code`}
            >
              <Wrench size={12} className={activeAction === 'refactor' && isGenerating ? 'text-white animate-spin' : 'text-emerald-400'} />
              <span>Refactor</span>
            </button>

            {/* 3. Find Bugs */}
            <button
              type="button"
              onClick={() => handleAiAction('debug')}
              disabled={isGenerating}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border cursor-pointer flex-shrink-0 ${
                activeAction === 'debug' && isGenerating
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-[#27272a] hover:bg-[#323238] text-neutral-200 border-neutral-700 hover:border-neutral-600'
              }`}
              title={`Static analysis & bug detection for ${currentLang.name}`}
            >
              <Bug size={12} className={activeAction === 'debug' && isGenerating ? 'text-white animate-spin' : 'text-rose-400'} />
              <span>Find Bugs</span>
            </button>

            {/* 4. Unit Tests */}
            <button
              type="button"
              onClick={() => handleAiAction('tests')}
              disabled={isGenerating}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border cursor-pointer flex-shrink-0 ${
                activeAction === 'tests' && isGenerating
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-[#27272a] hover:bg-[#323238] text-neutral-200 border-neutral-700 hover:border-neutral-600'
              }`}
              title={`Generate unit tests with ${currentLang.testFramework}`}
            >
              <Check size={12} className={activeAction === 'tests' && isGenerating ? 'text-white animate-spin' : 'text-sky-400'} />
              <span>Unit Tests</span>
            </button>

            {/* 5. Optimize */}
            <button
              type="button"
              onClick={() => handleAiAction('optimize')}
              disabled={isGenerating}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border cursor-pointer flex-shrink-0 ${
                activeAction === 'optimize' && isGenerating
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-[#27272a] hover:bg-[#323238] text-neutral-200 border-neutral-700 hover:border-neutral-600'
              }`}
              title={`Analyze and optimize Big-O time and space complexity`}
            >
              <Zap size={12} className={activeAction === 'optimize' && isGenerating ? 'text-white animate-spin' : 'text-yellow-400'} />
              <span>Optimize</span>
            </button>

            {/* 6. Security Audit */}
            <button
              type="button"
              onClick={() => handleAiAction('security')}
              disabled={isGenerating}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border cursor-pointer flex-shrink-0 ${
                activeAction === 'security' && isGenerating
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-[#27272a] hover:bg-[#323238] text-neutral-200 border-neutral-700 hover:border-neutral-600'
              }`}
              title={`Audit code for vulnerabilities, injections and memory safety`}
            >
              <Shield size={12} className={activeAction === 'security' && isGenerating ? 'text-white animate-spin' : 'text-purple-400'} />
              <span>Security</span>
            </button>
          </div>

          {/* Right Status Indicator */}
          <div className="flex items-center gap-2 flex-shrink-0 text-[11px] font-mono">
            {isGenerating ? (
              <span className="flex items-center gap-1 text-primary animate-pulse font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                <span>AI Streaming...</span>
              </span>
            ) : (
              <span className="text-neutral-400">
                Mode: <span className="text-neutral-200 font-semibold">{currentLang.name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Search and Replace Bar (Conditional) */}
        {showSearchReplace && (
          <div className="px-4 py-2 bg-[#1f1f23] border-b border-neutral-800 flex items-center justify-between gap-4 flex-shrink-0 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                <Search size={14} className="text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find in file..."
                  className="w-full px-2.5 py-1 rounded bg-[#27272a] border border-neutral-700 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                <Replace size={14} className="text-neutral-400" />
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replace with..."
                  className="w-full px-2.5 py-1 rounded bg-[#27272a] border border-neutral-700 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleReplaceOne}
                  disabled={!searchQuery}
                  className="px-2.5 py-1 rounded bg-[#27272a] hover:bg-neutral-700 text-neutral-200 text-xs transition-colors border border-neutral-700 cursor-pointer disabled:opacity-50"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleReplaceAll}
                  disabled={!searchQuery}
                  className="px-2.5 py-1 rounded bg-[#27272a] hover:bg-neutral-700 text-neutral-200 text-xs transition-colors border border-neutral-700 cursor-pointer disabled:opacity-50"
                >
                  Replace All
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowSearchReplace(false)}
              className="p-1 rounded text-neutral-400 hover:text-white bg-transparent border-none cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* World Connect Plugins Drawer (Conditional) */}
        {showPluginDrawer && (
          <div className="p-4 bg-[#1b1b1e] border-b border-neutral-800 flex flex-col gap-3 flex-shrink-0 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-primary" />
                <span className="font-headline-md text-xs font-semibold text-white uppercase tracking-wider">
                  Workspace World Connect Plugin
                </span>
                {pluginNotification && (
                  <span className="text-xs text-emerald-400 font-medium ml-2 animate-in fade-in">
                    ✓ {pluginNotification}
                  </span>
                )}
              </div>

              {/* Plugin Tabs */}
              <div className="flex items-center gap-1 bg-[#27272a] p-0.5 rounded-lg border border-neutral-700">
                <button
                  onClick={() => setActivePluginTab('web_fetch')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer border-none ${
                    activePluginTab === 'web_fetch' ? 'bg-primary text-white' : 'bg-transparent text-neutral-300 hover:text-white'
                  }`}
                >
                  Fetch URL
                </button>
                <button
                  onClick={() => setActivePluginTab('github')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer border-none ${
                    activePluginTab === 'github' ? 'bg-primary text-white' : 'bg-transparent text-neutral-300 hover:text-white'
                  }`}
                >
                  GitHub File
                </button>
                <button
                  onClick={() => setActivePluginTab('search_code')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer border-none ${
                    activePluginTab === 'search_code' ? 'bg-primary text-white' : 'bg-transparent text-neutral-300 hover:text-white'
                  }`}
                >
                  Search Web Code
                </button>
              </div>

              <button
                onClick={() => setShowPluginDrawer(false)}
                className="p-1 rounded text-neutral-400 hover:text-white bg-transparent border-none cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tab Form */}
            <div className="flex flex-col gap-3">
              {activePluginTab === 'web_fetch' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pluginUrl}
                    onChange={(e) => setPluginUrl(e.target.value)}
                    placeholder="https://example.com/api.ts or raw URL"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#27272a] border border-neutral-700 text-xs text-white focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={handlePluginFetch}
                    disabled={pluginExecuting || !pluginUrl.trim()}
                    className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-container cursor-pointer border-none disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Play size={12} />
                    <span>{pluginExecuting ? 'Fetching...' : 'Fetch URL'}</span>
                  </button>
                </div>
              )}

              {activePluginTab === 'github' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pluginRepo}
                    onChange={(e) => setPluginRepo(e.target.value)}
                    placeholder="owner/repo (e.g. facebook/react)"
                    className="w-1/3 px-3 py-1.5 rounded-lg bg-[#27272a] border border-neutral-700 text-xs text-white focus:outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    value={pluginFilePath}
                    onChange={(e) => setPluginFilePath(e.target.value)}
                    placeholder="File path (e.g. src/index.js)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#27272a] border border-neutral-700 text-xs text-white focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={handlePluginFetch}
                    disabled={pluginExecuting || !pluginRepo.trim() || !pluginFilePath.trim()}
                    className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-container cursor-pointer border-none disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Play size={12} />
                    <span>{pluginExecuting ? 'Pulling...' : 'Pull from GitHub'}</span>
                  </button>
                </div>
              )}

              {activePluginTab === 'search_code' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pluginSearchTerm}
                    onChange={(e) => setPluginSearchTerm(e.target.value)}
                    placeholder="Search algorithm, library pattern, or solution..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#27272a] border border-neutral-700 text-xs text-white focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={handlePluginFetch}
                    disabled={pluginExecuting || !pluginSearchTerm.trim()}
                    className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-container cursor-pointer border-none disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Play size={12} />
                    <span>{pluginExecuting ? 'Searching...' : 'Search Solutions'}</span>
                  </button>
                </div>
              )}

              {/* Plugin Results Preview & Insert Actions */}
              {pluginResultData && (
                <div className="bg-[#121215] p-3 rounded-lg border border-neutral-800 flex flex-col gap-2 max-h-48 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-mono">
                      {pluginResultData.title || pluginResultData.path || 'Results Ready'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleInsertFetchedCode(pluginResultData.content || pluginResultData.formattedSummary || JSON.stringify(pluginResultData, null, 2))}
                        className="px-2.5 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-white text-[11px] font-medium border-none cursor-pointer"
                      >
                        Append to Current File
                      </button>
                      <button
                        onClick={() => handleInsertFetchedCode(
                          pluginResultData.content || pluginResultData.formattedSummary || JSON.stringify(pluginResultData, null, 2),
                          pluginFilePath ? pluginFilePath.split('/').pop() : 'imported_snippet.ts'
                        )}
                        className="px-2.5 py-1 rounded bg-primary hover:bg-primary-container text-white text-[11px] font-semibold border-none cursor-pointer"
                      >
                        + Create as New File
                      </button>
                    </div>
                  </div>
                  <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap m-0">
                    {(pluginResultData.content || pluginResultData.formattedSummary || JSON.stringify(pluginResultData, null, 2)).slice(0, 1000)}
                    {(pluginResultData.content || '').length > 1000 ? '\n...[truncated for preview]...' : ''}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Quick Action Pills Strip */}
        <div className="px-3 py-2 bg-surface-container-low border-b border-surface-container-highest flex items-center gap-1.5 overflow-x-auto flex-shrink-0 select-none">
          <span className="text-[10px] font-mono text-secondary uppercase tracking-wider flex-shrink-0">
            Quick:
          </span>
          {[
            { id: 'explain', label: 'Explain', icon: Sparkles, color: 'text-amber-400' },
            { id: 'refactor', label: 'Refactor', icon: Wrench, color: 'text-emerald-400' },
            { id: 'debug', label: 'Find Bugs', icon: Bug, color: 'text-rose-400' },
            { id: 'tests', label: 'Tests', icon: Check, color: 'text-sky-400' },
            { id: 'optimize', label: 'Optimize', icon: Zap, color: 'text-yellow-400' },
            { id: 'security', label: 'Security', icon: Shield, color: 'text-purple-400' },
          ].map((action) => {
            const Icon = action.icon;
            const isActive = activeAction === action.id && isGenerating;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => handleAiAction(action.id)}
                disabled={isGenerating}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors border cursor-pointer flex-shrink-0 ${
                  isActive
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-surface-container-highest'
                }`}
              >
                <Icon size={11} className={isActive ? 'animate-spin' : action.color} />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>

        {/* AI Error Alert with Retry */}
        {aiError && (
          <div className="mx-3 mt-3 p-3 rounded-lg bg-red-950/40 border border-red-800/60 flex items-start gap-2.5 text-xs text-red-200 animate-in fade-in flex-shrink-0">
            <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-300">AI Assistant Error</div>
              <p className="text-[11px] text-red-300/80 mt-0.5">{aiError}</p>
            </div>
            <button
              type="button"
              onClick={() => handleAiAction(activeAction)}
              className="px-2 py-1 rounded bg-red-800/60 hover:bg-red-700 text-white text-[11px] font-semibold border-none cursor-pointer flex-shrink-0"
            >
              Retry
            </button>
          </div>
        )}

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
            <div className="flex flex-col gap-3 py-2">
              <div className="text-center px-2 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                  <Sparkles size={20} />
                </div>
                <h4 className="font-headline-md text-body-md font-semibold text-on-surface mb-0.5">
                  {currentLang.name} Assistant Ready
                </h4>
                <p className="text-xs text-secondary max-w-xs mx-auto leading-relaxed">
                  Choose a one-click action below or type a custom question at the bottom.
                </p>
              </div>

              {/* Action Cards Grid */}
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => handleAiAction('explain')}
                  className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-left transition-all cursor-pointer group flex items-start gap-2.5"
                >
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform flex-shrink-0 mt-0.5">
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors">
                      Explain Step-by-Step
                    </div>
                    <div className="text-[11px] text-secondary mt-0.5">
                      Detailed logic breakdown, algorithmic complexity & design patterns.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleAiAction('refactor')}
                  className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-left transition-all cursor-pointer group flex items-start gap-2.5"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform flex-shrink-0 mt-0.5">
                    <Wrench size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors">
                      Refactor & Modernize
                    </div>
                    <div className="text-[11px] text-secondary mt-0.5">
                      Clean idiomatic code, improved readability & extract helper functions.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleAiAction('debug')}
                  className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-left transition-all cursor-pointer group flex items-start gap-2.5"
                >
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-105 transition-transform flex-shrink-0 mt-0.5">
                    <Bug size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors">
                      Find Bugs & Edge Cases
                    </div>
                    <div className="text-[11px] text-secondary mt-0.5">
                      Detect syntax errors, off-by-one flaws, null checks and memory leaks.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleAiAction('tests')}
                  className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-left transition-all cursor-pointer group flex items-start gap-2.5"
                >
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 group-hover:scale-105 transition-transform flex-shrink-0 mt-0.5">
                    <Check size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors">
                      Generate Unit Tests
                    </div>
                    <div className="text-[11px] text-secondary mt-0.5">
                      Full test suite with {currentLang.testFramework}.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleAiAction('optimize')}
                  className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-left transition-all cursor-pointer group flex items-start gap-2.5"
                >
                  <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 group-hover:scale-105 transition-transform flex-shrink-0 mt-0.5">
                    <Zap size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors">
                      Optimize Performance
                    </div>
                    <div className="text-[11px] text-secondary mt-0.5">
                      Analyze Big-O runtime, memory allocations & compute bottlenecks.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleAiAction('security')}
                  className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-left transition-all cursor-pointer group flex items-start gap-2.5"
                >
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-transform flex-shrink-0 mt-0.5">
                    <Shield size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors">
                      Security Audit
                    </div>
                    <div className="text-[11px] text-secondary mt-0.5">
                      Scan for injection flaws, buffer overflows, and unsafe practices.
                    </div>
                  </div>
                </button>
              </div>
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
