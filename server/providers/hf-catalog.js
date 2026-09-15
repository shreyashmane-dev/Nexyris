/**
 * Curated list of verified, high-performance GGUF & AI models from Hugging Face
 * Contains direct CDN/resolve URLs, quantizations, size benchmarks, and badges
 * Matches techjarves/Portable-AI-USB and Uncensored-Local-Studio
 */
export const CURATED_HF_MODELS = [
  // ── Uncensored Flagships ─────────────────────────────────────
  {
    id: 'nemomix-unleashed-12b',
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
    capabilities: { coding: 85, reasoning: 92, chat: 98 },
    description: 'Top-tier 12B uncensored model. Answers everything with rich, natural depth and no moralizing refusals.',
    filename: 'NemoMix-Unleashed-12B-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/NemoMix-Unleashed-12B-GGUF/resolve/main/NemoMix-Unleashed-12B-Q4_K_M.gguf',
  },
  {
    id: 'dolphin-2.9-llama3-8b',
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
    capabilities: { coding: 88, reasoning: 89, chat: 95 },
    description: 'Classic uncensored all-rounder based on Llama 3 8B. Fast, smart, creative, and obedient.',
    filename: 'dolphin-2.9-llama3-8b-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/dolphin-2.9-llama3-8b-GGUF/resolve/main/dolphin-2.9-llama3-8b-Q4_K_M.gguf',
  },

  // ── High Performance Standard ────────────────────────────────
  {
    id: 'mistral-7b-instruct-v0.3',
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
    capabilities: { coding: 90, reasoning: 88, chat: 90 },
    description: 'Strong reasoning and coding prowess with huge 32K context window. Benchmark standard 7B model.',
    filename: 'Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
  },
  {
    id: 'qwen2.5-7b-instruct',
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
    capabilities: { coding: 94, reasoning: 92, chat: 93 },
    description: 'Phenomenal multilingual and coding capabilities. Outperforms many larger models on reasoning benchmarks.',
    filename: 'Qwen2.5-7B-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf',
  },

  // ── Lightweight Daily Drivers ────────────────────────────────
  {
    id: 'llama-3.2-3b-instruct',
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
    capabilities: { coding: 75, reasoning: 80, chat: 90 },
    description: 'Ultra-fast Meta model designed for edge devices. Runs smoothly even on older laptops with 4-8 GB RAM.',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
  },
  {
    id: 'phi-3.5-mini-3.8b',
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
    capabilities: { coding: 82, reasoning: 88, chat: 85 },
    description: 'Microsoft compact model with huge 128K context window. Excellent logic, math, and code comprehension.',
    filename: 'Phi-3.5-mini-instruct-Q4_K_M.gguf',
    downloadUrl: 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf',
  },

  // ── Fast USB Quick-Test Models ────────────────────────────────
  {
    id: 'smollm2-135m-instruct',
    name: 'SmolLM2 135M Instruct',
    provider: 'Hugging Face',
    creator: 'HuggingFaceTB',
    format: 'GGUF',
    quantization: 'Q4_K_M',
    fileSizeGB: 0.11,
    fileSizeBytes: 115000000,
    contextLength: 2048,
    category: 'Lightweight',
    label: 'STANDARD',
    badge: 'INSTANT TEST',
    capabilities: { coding: 40, reasoning: 45, chat: 70 },
    description: 'Tiny 115 MB model. Downloads in seconds, negligible memory usage, perfect for immediate test runs from USB.',
    filename: 'smollm2-135m-instruct-q4_k_m.gguf',
    downloadUrl: 'https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct-GGUF/resolve/main/smollm2-135m-instruct-q4_k_m.gguf',
  },
  {
    id: 'smollm2-360m-instruct',
    name: 'SmolLM2 360M Instruct',
    provider: 'Hugging Face',
    creator: 'HuggingFaceTB',
    format: 'GGUF',
    quantization: 'Q4_K_M',
    fileSizeGB: 0.23,
    fileSizeBytes: 240000000,
    contextLength: 4096,
    category: 'Lightweight',
    label: 'STANDARD',
    badge: 'ULTRA LIGHT',
    capabilities: { coding: 55, reasoning: 58, chat: 78 },
    description: 'Crisp, fast responses with tiny memory footprint (~400 MB RAM). Runs on any laptop or ancient CPU.',
    filename: 'smollm2-360m-instruct-q4_k_m.gguf',
    downloadUrl: 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q4_k_m.gguf',
  },
  {
    id: 'qwen2.5-0.5b-instruct',
    name: 'Qwen 2.5 0.5B Instruct',
    provider: 'Hugging Face',
    creator: 'Qwen',
    format: 'GGUF',
    quantization: 'Q4_K_M',
    fileSizeGB: 0.39,
    fileSizeBytes: 420000000,
    contextLength: 4096,
    category: 'Lightweight',
    label: 'STANDARD',
    badge: 'FAST MULTILINGUAL',
    capabilities: { coding: 65, reasoning: 68, chat: 82 },
    description: 'Sub-billion parameter powerhouse (~400 MB). Crisp reasoning, multilingual support, and fast generation.',
    filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
  },

  // ── Image Generation Models (Stable Diffusion) ───────────────
  {
    id: 'dreamshaper-8',
    name: 'DreamShaper 8 (SD 1.5)',
    provider: 'Hugging Face',
    creator: 'Lykon',
    format: 'SafeTensors',
    quantization: 'FP16',
    fileSizeGB: 2.1,
    fileSizeBytes: 2250000000,
    contextLength: 77,
    category: 'image',
    label: 'IMAGE GEN',
    badge: 'CREATIVE ART',
    capabilities: { coding: 0, reasoning: 0, chat: 0 },
    description: 'Fast, lower-memory offline image generation. General art, fantasy, anime, illustration, and realistic renders.',
    filename: 'DreamShaper_8_pruned.safetensors',
    downloadUrl: 'https://huggingface.co/Lykon/DreamShaper/resolve/main/DreamShaper_8_pruned.safetensors',
  },
  {
    id: 'cyberrealistic-v8',
    name: 'CyberRealistic V8 (SD 1.5)',
    provider: 'Hugging Face',
    creator: 'Cyberdelia',
    format: 'SafeTensors',
    quantization: 'FP16',
    fileSizeGB: 2.0,
    fileSizeBytes: 2150000000,
    contextLength: 77,
    category: 'image',
    label: 'IMAGE GEN',
    badge: 'PHOTOREALISM',
    capabilities: { coding: 0, reasoning: 0, chat: 0 },
    description: 'High photorealism on mid-tier hardware. Offline portrait and realistic scene generation.',
    filename: 'CyberRealistic_V8_FP16.safetensors',
    downloadUrl: 'https://huggingface.co/cyberdelia/CyberRealistic/resolve/main/CyberRealistic_V8_FP16.safetensors',
  }
];

/**
 * Searches Hugging Face Hub API for community GGUF models
 */
export async function searchHuggingFace(query = 'gguf', limit = 15) {
  const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&filter=gguf&sort=downloads&direction=-1&limit=${limit}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Nexyris-Local/1.0' },
    });

    if (!res.ok) {
      throw new Error(`HF API error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.map((item) => ({
      id: item.id.replace('/', '_').toLowerCase(),
      name: item.id,
      creator: item.author || item.id.split('/')[0],
      downloads: item.downloads || 0,
      likes: item.likes || 0,
      tags: item.tags || [],
      lastModified: item.lastModified,
      format: 'GGUF',
    }));
  } catch (err) {
    return [];
  }
}
