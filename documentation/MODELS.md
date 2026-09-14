# Model Management & GGUF Guide

## 1. Supported Model Formats

Nexyris Local uses the universal **GGUF** (GPT-Generated Unified Format) standard. GGUF is:
- Self-contained (contains weights, architecture, and tokenizer metadata).
- Memory-mappable (`mmap`), allowing fast loading and low RAM overhead.
- Optimized for cross-platform CPU, Vulkan, and CUDA acceleration.

---

## 2. Recommended Quantizations

| Quantization | Quality | Memory Savings | Recommended Use Case |
|--------------|---------|----------------|----------------------|
| **Q4_K_M**   | High    | ~60%           | **Standard Default**. Ideal balance between speed, RAM, and perplexity. |
| **Q5_K_M**   | Very High | ~50%         | For reasoning and coding tasks where precision matters. |
| **Q8_0**     | Near Lossless | ~25%     | High-end machines with ample RAM and GPU VRAM. |
| **Q3_K_S**   | Moderate | ~70%          | Low-RAM PCs (e.g. 4GB - 8GB systems). |

---

## 3. Importing Models

### Method A: Hugging Face
Use the in-app **Model Library** -> **Hugging Face Hub** tab to search and download directly to your USB drive.

### Method B: Ollama Local Scanner
If Ollama is already installed on the host PC, go to **Ollama Models & Local Scanner** tab. Nexyris will locate the underlying GGUF layer blobs and offer a 1-click copy directly into your USB storage.

### Method C: Manual Drag & Drop
Copy any `.gguf` file directly into your USB's `models/gguf/` directory. On next launch or when clicking **Rescan USB**, Nexyris parses the binary header and registers the model automatically.
