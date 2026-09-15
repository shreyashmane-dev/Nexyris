# Nexyris Local — Portable AI Studio

> **Your AI. Your Models. Your Drive. Your Data.**
> A premium, 100% offline, self-contained AI studio designed to run directly from a USB pendrive or removable storage on any computer without re-installation or cloud dependencies.

Inspired by the portable architecture of **Portable-AI-USB** and **Uncensored-Local-Studio**, Nexyris Local unites LLM Chat, Real Shell Terminal, Code Assistant, and Stable Diffusion Image Generation into a single, zero-trace desktop application.

---

## 🌟 Key Capabilities

1. 🔒 **100% Offline, Private & Air-Gapped**
   - Inference runs entirely on local hardware (CPU, CUDA, Vulkan).
   - Zero telemetry, zero cloud tracking, zero login requirements.
   - Chats, code projects, terminal logs, and model weights live exclusively on your USB pendrive.

2. ⚡ **Real Local AI Engine (llama.cpp & Ollama)**
   - No mock simulations: executes `.gguf` weights directly via official `llama.cpp` (`llama-server`) or host `ollama`.
   - Real-time token streaming with live generation velocity (`tok/s`).
   - 1-click portable engine installer straight to the pendrive (`bin/llama-server.exe`).

3. 🔓 **Curated Model Catalog (Uncensored & Standard)**
   - **NemoMix Unleashed 12B** (~7.0 GB) — `[UNCENSORED]` `[RECOMMENDED]`
   - **Dolphin 2.9 Llama 3 8B** (~4.9 GB) — `[UNCENSORED]` `[ALL-ROUNDER]`
   - **Mistral 7B Instruct v0.3** (~4.1 GB) — `[STANDARD]` `[CODING]`
   - **Qwen 2.5 7B Instruct** (~4.7 GB) — `[STANDARD]` `[MULTILINGUAL]`
   - **Llama 3.2 3B Instruct** (~2.0 GB) — `[LIGHTWEIGHT]` `[FAST]`
   - **Phi-3.5 Mini 3.8B** (~2.2 GB) — `[REASONING]`
   - **SmolLM2 135M & 360M** — `[INSTANT USB TEST]` (Runs fast on any hardware)
   - **DreamShaper 8 & CyberRealistic V8** — `[IMAGE GEN]` (Stable Diffusion)

4. 💻 **Real Portable Shell Terminal**
   - Executes real commands (`dir`, `node -v`, `ollama list`, `git status`, `powershell`) with working directory set strictly to your USB pendrive (`E:\Nexyris-main`).
   - Returns real stdout, stderr, exit codes, and execution timings.

5. 🎨 **Offline Image Generation Studio**
   - Generate high-quality art and photorealistic scenes offline using Stable Diffusion checkpoints.
   - Live parameters (Prompt, Negative Prompt, Steps, CFG Scale, Resolution).
   - All generated outputs saved directly to the USB `outputs/` folder.

6. 📂 **Import from Computer & Browser-Style Downloader**
   - Auto-scans host PC's `Downloads/`, `Desktop/`, and `Documents/` for existing `.gguf` files with 1-click **[ Copy to Pendrive ]**.
   - Direct browser file upload button (`<input type="file" accept=".gguf">`).
   - Docked floating download bar visible across all screens (progress %, speed in MB/s, ETA, pause, cancel).

7. 🛡️ **USB Disconnection Guard & Safe Eject**
   - Live storage heartbeat detects drive removal and protects database state.
   - Safe Eject shuts down runtimes and safely commits SQLite transactions.

---

## 🚀 Quick Start (From USB Flash Drive)

### Windows
1. Extract or copy `Nexyris` to your USB drive (e.g. `E:\Nexyris-main`).
2. Double-click **`Nexyris.bat`** to start the application in clean desktop window mode.
3. *Optional*: Run **`install.bat`** to pre-install models and engine via interactive setup.

### Linux & macOS
- Linux: `chmod +x start-linux.sh && ./start-linux.sh`
- macOS: `chmod +x start-mac.command && ./start-mac.command`

---

## 📁 USB Drive Structure

```text
USB Drive/
├── Nexyris.bat                  # Main Windows launcher with health-check loop
├── install.bat                  # Interactive USB setup & model downloader
├── start-linux.sh               # Linux launcher
├── start-mac.command            # macOS launcher
├── bin/                         # Portable llama.cpp server binaries
├── models/
│   ├── gguf/                    # AI model weights (.gguf)
│   └── image/                   # Diffusion checkpoints (.safetensors)
├── outputs/                     # Generated images and artworks
├── data/
│   ├── database/nexyris.db      # SQLite persistent storage (100% portable)
│   ├── conversations/           # Saved chat threads
│   └── projects/                # Code assistant projects
├── downloads/                   # Resumable partial model downloads (.part)
├── dist/                        # Compiled production frontend UI
├── server/                      # Zero-dependency Node.js portable backend
└── logs/                        # Portable diagnostics
```

---

## 🧪 Automated Testing

Verify the complete test suite (Portability, SQLite, GGUF binary inspection, Range downloads, Hardware scoring, and Runtime lifecycle):

```bash
npm test
```

All 28/28 tests pass in ~1.1s.

---

## 📄 License
MIT License - Copyright (c) 2026 Nexyris Local.
