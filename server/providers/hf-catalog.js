import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '../dynamic-root.js';

const DISK_CACHE_PATH = path.join(PATHS.data, 'catalog-cache.json');

const FALLBACK_PRESETS = [
  {
    id: 'bartowski/NemoMix-Unleashed-12B-GGUF',
    name: 'NemoMix Unleashed 12B',
    provider: 'Hugging Face',
    creator: 'bartowski',
    format: 'GGUF',
    quantization: 'Q4_K_M',
    fileSizeGB: 7.0,
    fileSizeBytes: 7510000000,
    contextLength: 8192,
    category: 'Flagship',
    label: 'UNCENSORED',
    badge: 'RECOMMENDED',
    description: 'Top-tier 12B uncensored model. Answers everything with rich, natural depth and no refusals.',
    filename: 'NemoMix-Unleashed-12B-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/NemoMix-Unleashed-12B-GGUF/resolve/main/NemoMix-Unleashed-12B-Q4_K_M.gguf',
  },
  {
    id: 'bartowski/dolphin-2.9-llama3-8b-GGUF',
    name: 'Dolphin 2.9 Llama 3 8B',
    provider: 'Hugging Face',
    creator: 'bartowski / Eric Hartford',
    format: 'GGUF',
    quantization: 'Q4_K_M',
    fileSizeGB: 4.9,
    fileSizeBytes: 5260000000,
    contextLength: 8192,
    category: 'Balanced',
    label: 'UNCENSORED',
    badge: 'ALL-ROUNDER',
    description: 'Classic uncensored all-rounder based on Llama 3 8B. Fast, smart, creative, and obedient.',
    filename: 'dolphin-2.9-llama3-8b-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/dolphin-2.9-llama3-8b-GGUF/resolve/main/dolphin-2.9-llama3-8b-Q4_K_M.gguf',
  },
  {
    id: 'bartowski/Mistral-7B-Instruct-v0.3-GGUF',
    name: 'Mistral 7B Instruct v0.3',
    provider: 'Hugging Face',
    creator: 'Mistral AI / bartowski',
    format: 'GGUF',
    quantization: 'Q4_K_M',
    fileSizeGB: 4.1,
    fileSizeBytes: 4400000000,
    contextLength: 32768,
    category: 'Balanced',
    label: 'STANDARD',
    badge: 'CODING',
    description: 'Strong reasoning and coding prowess with 32K context window. Industry benchmark 7B.',
    filename: 'Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
  },
  {
    id: 'bartowski/Qwen2.5-7B-Instruct-GGUF',
    name: 'Qwen 2.5 7B Instruct',
    provider: 'Hugging Face',
    creator: 'Alibaba / bartowski',
    format: 'GGUF',
    quantization: 'Q4_K_M',
    fileSizeGB: 4.7,
    fileSizeBytes: 5040000000,
    contextLength: 32768,
    category: 'Balanced',
    label: 'STANDARD',
    badge: 'MULTILINGUAL',
    description: 'Phenomenal multilingual and coding capabilities from Alibaba Cloud.',
    filename: 'Qwen2.5-7B-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf',
  },
  {
    id: 'bartowski/Llama-3.2-3B-Instruct-GGUF',
    name: 'Llama 3.2 3B Instruct',
    provider: 'Hugging Face',
    creator: 'Meta / bartowski',
    format: 'GGUF',
    quantization: 'Q4_K_M',
    fileSizeGB: 2.0,
    fileSizeBytes: 2150000000,
    contextLength: 8192,
    category: 'Lightweight',
    label: 'STANDARD',
    badge: 'FAST',
    description: 'Ultra-fast Meta model designed for edge devices. Runs smoothly on 4-8 GB RAM.',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
  },
  {
    id: 'bartowski/Phi-3.5-mini-instruct-GGUF',
    name: 'Phi-3.5 Mini 3.8B',
    provider: 'Hugging Face',
    creator: 'Microsoft / bartowski',
    format: 'GGUF',
    quantization: 'Q4_K_M',
    fileSizeGB: 2.2,
    fileSizeBytes: 2360000000,
    contextLength: 128000,
    category: 'Lightweight',
    label: 'STANDARD',
    badge: 'REASONING',
    description: 'Microsoft compact model with huge 128K context. Strong math and logic reasoning.',
    filename: 'Phi-3.5-mini-instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf',
  },
  {
    id: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
    name: 'Llama 3.2 1B Instruct',
    provider: 'Hugging Face',
    creator: 'Meta / bartowski',
    format: 'GGUF',
    quantization: 'Q4_K_M',
    fileSizeGB: 0.81,
    fileSizeBytes: 807694464,
    contextLength: 8192,
    category: 'Lightweight',
    label: 'STANDARD',
    badge: 'INSTANT TEST',
    description: 'Extremely lightweight 1B model from Meta. Instant download, tiny memory footprint.',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
  }
];

let memoryCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

/**
 * Fetches real, live models directly from Hugging Face Hub API
 */
export async function getLiveHuggingFaceModels(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && memoryCache && (now - lastCacheTime) < CACHE_TTL_MS) {
    return memoryCache;
  }

  // Check disk cache first if available
  if (!memoryCache && fs.existsSync(DISK_CACHE_PATH)) {
    try {
      const diskData = JSON.parse(fs.readFileSync(DISK_CACHE_PATH, 'utf-8'));
      if (Array.isArray(diskData) && diskData.length > 0) {
        memoryCache = diskData;
      }
    } catch (e) {}
  }

  try {
    // 1. Fetch live top GGUF models directly from Hugging Face API with quick 4s timeout
    const url = 'https://huggingface.co/api/models?search=gguf&filter=gguf&sort=downloads&direction=-1&limit=30';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Nexyris-Local-Studio' },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) throw new Error(`HF API HTTP ${res.status}`);

    const hfList = await res.json();

    // Transform live HuggingFace models into studio format
    const dynamicModels = hfList.map((item) => {
      const repoName = item.id.split('/')[1] || item.id;
      const cleanName = repoName.replace(/-GGUF$/i, '').replace(/_/g, ' ');
      const isUncensored = item.id.toLowerCase().includes('uncensored') || 
                           item.id.toLowerCase().includes('dolphin') || 
                           item.id.toLowerCase().includes('abliterated') ||
                           item.id.toLowerCase().includes('nemo');

      const isCoding = item.id.toLowerCase().includes('coder') || item.id.toLowerCase().includes('code');

      // Guess primary filename for 1-click download
      const defaultFilename = `${repoName.replace(/-GGUF$/i, '')}-Q4_K_M.gguf`;
      const directUrl = `https://huggingface.co/${item.id}/resolve/main/${defaultFilename}`;

      return {
        id: item.id,
        name: cleanName,
        provider: 'Hugging Face',
        creator: item.author || item.id.split('/')[0],
        format: 'GGUF',
        quantization: 'Q4_K_M',
        fileSizeGB: 4.5,
        fileSizeBytes: 4800000000,
        contextLength: 8192,
        category: 'Live Hub',
        label: isUncensored ? 'UNCENSORED' : 'STANDARD',
        badge: isUncensored ? 'UNCENSORED' : (isCoding ? 'CODING' : `${(item.downloads || 0).toLocaleString()} DLs`),
        downloads: item.downloads || 0,
        likes: item.likes || 0,
        description: `Live from Hugging Face. ${item.downloads?.toLocaleString() || 0} downloads, ${item.likes || 0} likes.`,
        filename: defaultFilename,
        downloadUrl: directUrl,
      };
    });

    // Merge with our verified presets
    const combined = [...FALLBACK_PRESETS];
    for (const dm of dynamicModels) {
      if (!combined.some(c => c.id.toLowerCase() === dm.id.toLowerCase())) {
        combined.push(dm);
      }
    }

    memoryCache = combined;
    lastCacheTime = now;

    // Persist to USB disk cache for offline access
    try {
      fs.writeFileSync(DISK_CACHE_PATH, JSON.stringify(combined, null, 2), 'utf-8');
    } catch (e) {}

    return combined;
  } catch (err) {
    lastCacheTime = now; // Prevent immediate retry storm when offline
    if (!memoryCache || memoryCache.length === 0) {
      memoryCache = FALLBACK_PRESETS;
    }
    return memoryCache;
  }
}

/**
 * Estimates realistic file size in GB based on model parameters and quantization
 */
export function estimateModelSizeGB(nameOrId = '', quant = 'Q4_K_M') {
  const text = (nameOrId || '').toLowerCase();
  let baseGB = 4.5; // default 7B/8B

  if (text.includes('135m')) baseGB = 0.2;
  else if (text.includes('0.5b') || text.includes('500m')) baseGB = 0.4;
  else if (text.includes('1b') || text.includes('1.5b')) baseGB = 1.0;
  else if (text.includes('2b') || text.includes('3b') || text.includes('3.2b') || text.includes('3.8b')) baseGB = 2.2;
  else if (text.includes('7b')) baseGB = 4.2;
  else if (text.includes('8b')) baseGB = 4.9;
  else if (text.includes('9b')) baseGB = 5.5;
  else if (text.includes('11b') || text.includes('12b')) baseGB = 7.0;
  else if (text.includes('14b')) baseGB = 8.5;
  else if (text.includes('27b') || text.includes('32b') || text.includes('34b')) baseGB = 19.0;
  else if (text.includes('70b') || text.includes('72b')) baseGB = 42.0;

  // Extract quant if present in filename
  let effectiveQuant = quant || 'Q4_K_M';
  const matchQuant = text.match(/(q[0-9]_[a-z0-9_]+|bf16|f16|f32)/i);
  if (matchQuant) effectiveQuant = matchQuant[1].toUpperCase();

  const q = effectiveQuant.toUpperCase();
  if (q.includes('Q2')) return Math.round(baseGB * 0.5 * 10) / 10;
  if (q.includes('Q3')) return Math.round(baseGB * 0.75 * 10) / 10;
  if (q.includes('Q5')) return Math.round(baseGB * 1.2 * 10) / 10;
  if (q.includes('Q6')) return Math.round(baseGB * 1.4 * 10) / 10;
  if (q.includes('Q8')) return Math.round(baseGB * 1.8 * 10) / 10;
  if (q.includes('16')) return Math.round(baseGB * 3.5 * 10) / 10;

  return Math.round(baseGB * 10) / 10;
}

/**
 * Searches Hugging Face Hub live API for any community model query
 */
export async function searchHuggingFace(query = 'gguf', limit = 25) {
  const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query + ' gguf')}&filter=gguf&sort=downloads&direction=-1&limit=${limit}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Nexyris-Local-Studio' },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) throw new Error(`HF API error: ${res.statusText}`);

    const data = await res.json();
    return data.map((item) => {
      const repoName = item.id.split('/')[1] || item.id;
      const cleanName = repoName.replace(/-GGUF$/i, '').replace(/_/g, ' ');
      const defaultFilename = `${repoName.replace(/-GGUF$/i, '')}-Q4_K_M.gguf`;
      const sizeGB = estimateModelSizeGB(item.id, 'Q4_K_M');

      return {
        id: item.id,
        name: cleanName,
        creator: item.author || item.id.split('/')[0],
        downloads: item.downloads || 0,
        likes: item.likes || 0,
        tags: item.tags || [],
        format: 'GGUF',
        quantization: 'Q4_K_M',
        fileSizeGB: sizeGB,
        fileSizeBytes: Math.round(sizeGB * 1024 ** 3),
        filename: defaultFilename,
        downloadUrl: `https://huggingface.co/${item.id}/resolve/main/${defaultFilename}`,
        description: `Direct from Hugging Face Hub (${item.downloads?.toLocaleString() || 0} downloads).`,
      };
    });
  } catch (err) {
    console.warn('[Catalog] Search Hugging Face error:', err.message);
    return [];
  }
}

/**
 * Fetches all available GGUF files in a specific Hugging Face repository
 */
export async function fetchRepoFiles(repoId) {
  try {
    const res = await fetch(`https://huggingface.co/api/models/${repoId}`, {
      headers: { 'User-Agent': 'Nexyris-Local-Studio' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const files = (data.siblings || [])
      .filter(s => s.rfilename.toLowerCase().endsWith('.gguf'))
      .map(s => {
        const sizeGB = estimateModelSizeGB(s.rfilename);
        return {
          filename: s.rfilename,
          downloadUrl: `https://huggingface.co/${repoId}/resolve/main/${s.rfilename}`,
          sizeGB,
          fileSizeBytes: Math.round(sizeGB * 1024 ** 3),
        };
      });

    return files;
  } catch (e) {
    return [];
  }
}

export const CURATED_HF_MODELS = FALLBACK_PRESETS;
