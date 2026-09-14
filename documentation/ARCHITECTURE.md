# Architecture & Portability Deep Dive

## 1. Zero Hard-Coded Path Guarantee

In a portable environment, drive letters fluctuate across operating systems and hardware configurations. For example:
- Computer A mounts the USB as `E:\Nexyris`
- Computer B mounts the USB as `F:\Nexyris`
- Linux mounts the USB as `/media/user/USB/Nexyris`

### How Nexyris Solves This:
1. **`APPLICATION_ROOT` Resolution**:
   On startup, `server/dynamic-root.js` resolves the absolute location of the execution folder using `path.resolve(__dirname, '..')` or the `NEXYRIS_ROOT` environment variable.
2. **Path Normalization**:
   All paths saved in `models/registry.json`, `config/config.json`, and SQLite (`data/database/nexyris.db`) are stripped of their absolute prefixes and saved strictly as relative POSIX paths (e.g. `models/gguf/qwen2.5-0.5b.gguf`).
3. **Runtime Reconstruction**:
   Whenever a model or asset is loaded, `resolvePath(relativePath)` prefixes `APPLICATION_ROOT`, guaranteeing instant resolution regardless of drive letter.

---

## 2. Host-Specific Hardware Profiling vs Portable Preferences

When moving between computers, hardware changes dramatically (e.g. a 4-core laptop with 8GB RAM vs a 16-core desktop with 64GB RAM and an RTX 4090).

Nexyris creates a unique **Host Fingerprint** based on the CPU model, core count, RAM, and GPU.
- Portable user preferences (theme, default app, model registry) remain in `config/config.json`.
- Machine-specific performance tuning (thread counts, context lengths, GPU offload layers) is stored in `config/hosts/<hostId>.json`.

When plugged into a new machine, Nexyris automatically tunes parameters to that machine's hardware without overwriting or invalidating previous host profiles.

---

## 3. Storage Heartbeat & USB Removal Protection

If a USB drive is disconnected unexpectedly while an application is writing data, operating systems may corrupt the filesystem or leak data onto host paths.

Nexyris runs a continuous **Storage Heartbeat** every 3 seconds (`server/storage.js`):
- Pings the `APPLICATION_ROOT` directory.
- Verifies write capability.
- If the volume disappears, Nexyris immediately locks the frontend into a protective overlay, pausing all I/O until the drive is reconnected.
