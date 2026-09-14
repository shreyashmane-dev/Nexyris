# Troubleshooting Guide

## 1. "Model fails to start / Out of Memory"
- **Cause**: The model size plus context window exceeds your host computer's available physical RAM.
- **Solution**:
  1. Open **Settings** -> **AI Performance**.
  2. Reduce **Context Window Size** from 8192 to 2048 or 4096.
  3. Close memory-heavy applications on the host (Chrome tabs, IDEs).
  4. Select a model with a smaller parameter size (e.g. SmolLM2 135M / 360M, Qwen 2.5 0.5B, or Llama 3.2 1B).

---

## 2. "Drive Disconnected Modal Appears"
- **Cause**: The USB drive had a momentary connection drop or was physically unplugged.
- **Solution**: Reconnect the USB drive and click **Check Connection Again**. Nexyris will verify storage access and resume operations.

---

## 3. "Downloads are slow"
- **Cause**: USB 2.0 ports have maximum real-world write throughput of 15-25 MB/s.
- **Solution**: Ensure your USB drive is plugged into a USB 3.0+ port (usually marked with blue plastic or an 'SS' SuperSpeed logo).
