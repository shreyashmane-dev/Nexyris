# Nexyris Local — Portable AI Studio

> **Your AI. Your Models. Your Drive. Your Data.**
> Run powerful AI completely locally directly from your USB flash drive or portable storage on any computer without re-installation or cloud dependencies.

---

## 🌟 Key Features

- 🔌 **True USB Portability**: Derives all file references dynamically from `APPLICATION_ROOT`. Move from `E:\` to `F:\` across different PCs with zero configuration breakage.
- ⚡ **100% Local Inference**: Runs offline models locally via `llama.cpp` (`llama-server`) with real-time token streaming and speed metrics (`tok/s`).
- 🧠 **Multi-Model Hub & Marketplace**:
  - **Hugging Face**: Search, explore GGUF quantizations, and download directly to USB.
  - **Ollama**: Scan the host computer for installed Ollama models (`.ollama/models`) to copy GGUF blobs to USB in 1-click, plus browse popular Ollama library models.
  - **Direct URL**: Download arbitrary `.gguf` models with resumable Range headers.
  - **Browse This PC**: Import `.gguf` files from Downloads, Desktop, or other disks.
  - **Auto-Discovery**: Drop any `.gguf` into `models/gguf/` and Nexyris detects and registers it automatically.
- 💻 **Three Integrated AI Workspaces**:
  - **AI Chat**: Modern desktop chat with markdown rendering, syntax-highlighted code blocks, copy, and SQLite history.
  - **Terminal AI**: Command generator, shell output explainer, and script assistant.
  - **Code Assistant**: Multi-file project scratchpad, code explanation, refactoring, and debugging.
- 🖥️ **Hardware Adaptation & Recommendation Engine**:
  - Probes CPU, physical cores, RAM, GPU, VRAM, and storage.
  - Automatically scores models: `⭐ Recommended`, `✓ Good`, `⚠ Heavy`, `✕ Incompatible`.
  - Separates host-specific performance tuning (`config/hosts/<id>.json`) from portable preferences so different computers don't overwrite each other.
- 🛡️ **USB Removal Protection & Safe Eject**:
  - Storage heartbeat detects unexpected USB disconnection and immediately halts operations to protect data.
  - Safe Eject safely shuts down the runtime, flushes SQLite transactions, and releases resources.

---

## 🚀 Getting Started

### Windows
1. Copy or extract the `Nexyris` folder to your USB drive (e.g. `E:\Nexyris`).
2. Double-click `Nexyris.bat`.
3. The Setup Wizard will detect your drive, inspect hardware, recommend models, and launch your studio!

### Linux & macOS
- Linux: Run `./start-linux.sh`
- macOS: Run `./start-mac.command`

---

## 📁 Portable Directory Structure

```text
NEXYRIS/
├── Nexyris.bat                  # Windows launcher (app-mode window)
├── start-linux.sh               # Linux launcher
├── start-mac.command            # macOS launcher
├── runtime/
│   ├── windows/llama/           # llama-server.exe
│   └── metadata/
├── models/
│   ├── registry.json            # Model catalog & metadata
│   └── gguf/                    # GGUF models stored on USB
├── apps/                        # Chat, Terminal AI, and Code modules
├── data/
│   ├── database/nexyris.db      # SQLite persistent storage
│   ├── conversations/           # Exported chats
│   ├── projects/                # Code assistant projects
│   └── settings/
├── config/
│   ├── config.json              # Portable user preferences
│   └── hosts/                   # Host-specific hardware profiles
├── downloads/                   # Active and partial downloads
└── logs/                        # Portable diagnostic logs
```

---

## 🧪 Automated Testing

Nexyris Local includes an extensive test suite verifying portability, GGUF binary inspection, SQLite persistence, Range-resumable downloads, hardware detection, and runtime lifecycle:

```bash
npm test
```

---

## 📄 License
MIT License - Copyright (c) 2026 Nexyris Local.
