import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import { APPLICATION_ROOT, PATHS, resolvePath } from './dynamic-root.js';
import { detectHardware } from './hardware.js';

const execAsync = promisify(exec);

class RuntimeManager {
  constructor() {
    this.process = null;
    this.status = 'STOPPED'; // STOPPED, STARTING, LOADING_MODEL, HEALTH_CHECKING, READY, NEEDS_ENGINE, ERROR
    this.currentModel = null;
    this.port = 38195;
    this.host = '127.0.0.1';
    this.activeStreamingAbort = null;
    this.listeners = new Set();
    this.errorDetails = null;
    this.engineType = null; // 'llama-server' | 'ollama' | 'native-fallback' | null
    this.isStopping = false;
    this.lastMetrics = {
      tokensGenerated: 0,
      speedTokPerSec: 0,
      elapsedMs: 0,
    };
  }

  onStatusChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  setStatus(status, details = null) {
    this.status = status;
    if (details !== null) this.errorDetails = details;
    for (const listener of this.listeners) {
      try {
        listener({ status, details: this.errorDetails, model: this.currentModel, engineType: this.engineType });
      } catch (e) {}
    }
  }

  /**
   * Discovers whether llama-server or Ollama is available
   */
  async findEngine() {
    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'llama-server.exe' : 'llama-server';

    const possiblePaths = [
      path.join(APPLICATION_ROOT, 'bin', binaryName),
      path.join(PATHS.runtimeWindows, binaryName),
      path.join(PATHS.runtime, binaryName),
      path.join(APPLICATION_ROOT, 'app', 'llm-backend', 'win', 'cuda', binaryName),
      path.join(APPLICATION_ROOT, 'app', 'llm-backend', 'win', 'vulkan', binaryName),
      path.join(APPLICATION_ROOT, 'runtime', 'windows', 'llama', binaryName),
      path.join(APPLICATION_ROOT, 'ollama', isWindows ? 'ollama.exe' : 'ollama'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return { type: p.includes('ollama') ? 'ollama' : 'llama-server', path: p };
      }
    }

    // Check if offline bundled zip exists in runtime/windows/
    const bundledZip = path.join(APPLICATION_ROOT, 'runtime', 'windows', 'llama-portable.zip');
    if (fs.existsSync(bundledZip)) {
      try {
        const binDir = path.join(APPLICATION_ROOT, 'bin');
        if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
        const extractCmd = `powershell -NoProfile -Command "Expand-Archive -Path '${bundledZip}' -DestinationPath '${binDir}' -Force"`;
        await execAsync(extractCmd);
        const extractedBinary = path.join(binDir, binaryName);
        if (fs.existsSync(extractedBinary)) {
          return { type: 'llama-server', path: extractedBinary };
        }
      } catch (e) {}
    }

    // Check if host has Ollama running on default port 11434
    try {
      const res = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(800) });
      if (res.ok) {
        return { type: 'ollama-host', path: 'http://127.0.0.1:11434' };
      }
    } catch (e) {}

    // Check if llama-server is in system PATH
    try {
      const cmd = isWindows ? 'where llama-server' : 'which llama-server';
      const { stdout } = await execAsync(cmd);
      const bin = stdout.trim().split(/\r?\n/)[0];
      if (bin && fs.existsSync(bin)) {
        return { type: 'llama-server', path: bin };
      }
    } catch (e) {}

    // Check if ollama is in system PATH
    try {
      const cmd = isWindows ? 'where ollama' : 'which ollama';
      const { stdout } = await execAsync(cmd);
      const bin = stdout.trim().split(/\r?\n/)[0];
      if (bin) {
        return { type: 'ollama-cli', path: bin };
      }
    } catch (e) {}

    return null;
  }

  /**
   * Installs the portable llama-server binary onto the USB drive (offline-first)
   */
  async installPortableEngine(onProgress) {
    const isWindows = process.platform === 'win32';
    const binDir = path.join(APPLICATION_ROOT, 'bin');
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

    if (!isWindows) {
      throw new Error('Automated portable engine is tailored for Windows x64. On Linux/Mac please install llama.cpp or Ollama.');
    }

    // 1. First Priority: Check for pre-placed offline folder in runtime/windows/llama
    const bundledDir = path.join(APPLICATION_ROOT, 'runtime', 'windows', 'llama');
    const bundledServer = path.join(bundledDir, 'llama-server.exe');
    if (fs.existsSync(bundledServer)) {
      if (onProgress) onProgress({ status: 'extracting', message: 'Copying pre-bundled offline llama.cpp engine to USB bin/...' });
      const copyCmd = `powershell -NoProfile -Command "Copy-Item -Path '${bundledDir}\\*' -Destination '${binDir}' -Recurse -Force"`;
      try {
        await execAsync(copyCmd);
        const binaryPath = path.join(binDir, 'llama-server.exe');
        if (fs.existsSync(binaryPath)) {
          return binaryPath;
        }
      } catch (e) {}
    }

    // 2. Second Priority: Check for offline pre-bundled zip in runtime/windows/
    const bundledZip = path.join(APPLICATION_ROOT, 'runtime', 'windows', 'llama-portable.zip');
    if (fs.existsSync(bundledZip)) {
      if (onProgress) onProgress({ status: 'extracting', message: 'Extracting pre-bundled offline llama.cpp engine to USB bin/...' });
      const extractCmd = `powershell -NoProfile -Command "Expand-Archive -Path '${bundledZip}' -DestinationPath '${binDir}' -Force"`;
      await execAsync(extractCmd);
      const binaryPath = path.join(binDir, 'llama-server.exe');
      if (fs.existsSync(binaryPath)) {
        return binaryPath;
      }
    }

    // 2. Fallback to internet download only if bundled zip is missing
    const downloadUrl = 'https://github.com/ggml-org/llama.cpp/releases/download/b3500/llama-b3500-bin-win-avx2-x64.zip';
    const tempZip = path.join(binDir, 'llama-temp.zip');

    if (onProgress) onProgress({ status: 'downloading', message: 'Downloading portable llama.cpp engine to USB (~16 MB)...' });

    await new Promise((resolve, reject) => {
      const req = https.get(downloadUrl, { headers: { 'User-Agent': 'Nexyris-Local' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return https.get(res.headers.location, (redirectRes) => {
            const fileStream = fs.createWriteStream(tempZip);
            redirectRes.pipe(fileStream);
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
          }).on('error', reject);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download engine: HTTP ${res.statusCode}`));
        }

        const fileStream = fs.createWriteStream(tempZip);
        res.pipe(fileStream);
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
      });

      req.on('error', reject);
    });

    if (onProgress) onProgress({ status: 'extracting', message: 'Extracting engine to USB bin/ directory...' });

    // Extract using PowerShell
    const extractCmd = `powershell -NoProfile -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${binDir}' -Force"`;
    await execAsync(extractCmd);

    if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);

    const binaryPath = path.join(binDir, 'llama-server.exe');
    if (!fs.existsSync(binaryPath)) {
      throw new Error('Extraction completed but llama-server.exe was not found in bin/');
    }

    return binaryPath;
  }

  /**
   * Starts a model using llama-server, Ollama, or fallback engine
   */
  async startModel(modelInfo, hostConfig = {}) {
    const modelPath = resolvePath(modelInfo.path || modelInfo.relativePath);
    if (!fs.existsSync(modelPath)) {
      this.setStatus('ERROR', `Model file not found at ${modelPath}`);
      throw new Error(`Model file not found at ${modelPath}`);
    }

    // Check if llama-server is already running on this.port with this exact model
    try {
      const healthRes = await fetch(`http://${this.host}:${this.port}/health`, { signal: AbortSignal.timeout(600) });
      if (healthRes.ok) {
        const modelsRes = await fetch(`http://${this.host}:${this.port}/v1/models`, { signal: AbortSignal.timeout(600) });
        if (modelsRes.ok) {
          const data = await modelsRes.json();
          const loadedId = data.data?.[0]?.id || '';
          const targetName = path.basename(modelPath);
          if (loadedId.includes(targetName)) {
            this.currentModel = modelInfo;
            this.engineType = 'llama-server';
            this.setStatus('READY');
            return { success: true, engine: 'llama-server' };
          }
        }
      }
    } catch (e) {}

    if (this.process) {
      this.isStopping = true;
      await this.stopModel();
      this.isStopping = false;
    }

    this.currentModel = modelInfo;
    this.setStatus('STARTING');

    const engine = await this.findEngine();

    if (engine && engine.type.startsWith('llama-server')) {
      this.engineType = 'llama-server';
      this.setStatus('LOADING_MODEL', `Loading ${modelInfo.name} into memory via llama-server...`);

      const hardware = detectHardware();
      const threads = hostConfig?.threads || hardware.cpu?.recommendedThreads || Math.min(hardware.cpu?.physicalCores || 4, 8);
      const gpuLayers = hardware.gpu?.hasDedicatedGpu ? (hostConfig?.gpuLayers || 99) : 0;
      const contextSize = hostConfig?.contextSize || 2048;

      const args = [
        '-m', modelPath,
        '-c', String(contextSize),
        '-t', String(threads),
        '-ngl', String(gpuLayers),
        '-b', '512',
        '-ub', '512',
        '--no-warmup',
        '--no-mmap',
        '--threads-http', '2',
        '--simple-io',
        '--port', String(this.port),
        '--host', this.host,
      ];

      try {
        let stderrBuffer = '';
        const engineBinDir = path.dirname(engine.path);
        const childEnv = {
          ...process.env,
          PATH: `${engineBinDir};${process.env.PATH || ''}`,
          TEMP: PATHS.temp,
          TMP: PATHS.temp,
          TMPDIR: PATHS.temp,
        };

        this.process = spawn(engine.path, args, {
          cwd: APPLICATION_ROOT,
          env: childEnv,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        this.process.on('error', (err) => {
          if (!this.isStopping) {
            this.setStatus('ERROR', `Engine process error: ${err.message}`);
          }
        });

        this.process.stdout.on('data', (d) => {
          const out = d.toString();
          if (out.includes('HTTP server listening') || out.includes('model loaded') || out.includes('all slots are idle')) {
            this.setStatus('READY');
          }
        });

        this.process.stderr.on('data', (d) => {
          const err = d.toString();
          stderrBuffer = (stderrBuffer + err).slice(-2000);
          if (err.includes('HTTP server listening') || err.includes('model loaded') || err.includes('all slots are idle')) {
            this.setStatus('READY');
          }
        });

        this.process.on('exit', (code, signal) => {
          this.process = null;
          if (!this.isStopping && this.status !== 'STOPPED' && this.status !== 'READY') {
            const cleanErr = stderrBuffer.trim().split('\n').slice(-3).join(' ') || (signal ? `signal ${signal}` : 'process terminated');
            this.setStatus('ERROR', `llama-server exited with code ${code ?? signal ?? 'none'} (${cleanErr})`);
          }
        });

        this.setStatus('HEALTH_CHECKING', 'Verifying local AI engine readiness...');
        let ready = false;
        for (let i = 0; i < 45; i++) {
          await new Promise(r => setTimeout(r, 500));
          if (this.status === 'READY') {
            ready = true;
            break;
          }
          if (this.status === 'ERROR') {
            break;
          }
          try {
            const res = await fetch(`http://${this.host}:${this.port}/health`, { signal: AbortSignal.timeout(800) });
            if (res.ok) {
              ready = true;
              this.setStatus('READY');
              break;
            }
          } catch (e) {}
        }

        if (!ready) {
          throw new Error(this.errorDetails || 'Local llama-server did not become ready');
        }

        return { success: true, engine: 'llama-server' };
      } catch (err) {
        this.setStatus('ERROR', err.message);
        throw err;
      }
    } else if (engine && engine.type.startsWith('ollama')) {
      this.engineType = 'ollama';
      this.setStatus('LOADING_MODEL', `Connecting to Ollama for ${modelInfo.name}...`);
      this.setStatus('READY');
      return { success: true, engine: 'ollama' };
    } else {
      this.setStatus('ERROR', 'No local AI inference engine found. Please install the portable engine into USB bin/');
      throw new Error('No local AI inference engine found. Please install the portable engine in the Models tab.');
    }
  }

  /**
   * Streams a chat completion response (Real SSE / chunked token generation)
   */
  async streamChat(messages, options = {}, onToken, onDone, onError) {
    if (this.status !== 'READY' || !this.currentModel) {
      const err = new Error('No AI model is currently active or running on the USB pendrive. Please start an installed model from the Models catalog.');
      if (onError) onError(err);
      throw err;
    }

    const startTime = Date.now();
    let tokenCount = 0;

    // Connect to llama-server OpenAI-compatible API
    if (this.engineType === 'llama-server') {
      try {
        const payload = {
          messages,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.9,
          stream: true,
          max_tokens: options.maxTokens || 2048,
        };

        const res = await fetch(`http://${this.host}:${this.port}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`llama-server responded with HTTP ${res.status}: ${res.statusText}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                const text = data.choices?.[0]?.delta?.content || '';
                if (text) {
                  tokenCount++;
                  if (onToken) onToken({ text, count: tokenCount });
                }
              } catch (e) {}
            }
          }
        }

        const elapsedMs = Date.now() - startTime;
        const speedTokPerSec = Math.round((tokenCount / (Math.max(elapsedMs, 1) / 1000)) * 10) / 10;
        this.lastMetrics = { tokensGenerated: tokenCount, speedTokPerSec, elapsedMs };

        if (onDone) onDone({ tokensGenerated: tokenCount, speedTokPerSec, elapsedMs });
      } catch (err) {
        if (onError) onError(err);
      }
    } else if (this.engineType === 'ollama') {
      // Connect to Ollama API
      try {
        const modelName = this.currentModel?.id || 'llama3';
        const res = await fetch('http://127.0.0.1:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelName,
            messages,
            stream: true,
          }),
        });

        if (!res.ok) throw new Error(`Ollama responded with HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                tokenCount++;
                if (onToken) onToken({ text: data.message.content, count: tokenCount });
              }
            } catch (e) {}
          }
        }

        const elapsedMs = Date.now() - startTime;
        const speedTokPerSec = Math.round((tokenCount / (Math.max(elapsedMs, 1) / 1000)) * 10) / 10;
        this.lastMetrics = { tokensGenerated: tokenCount, speedTokPerSec, elapsedMs };
        if (onDone) onDone({ tokensGenerated: tokenCount, speedTokPerSec, elapsedMs });
      } catch (err) {
        if (onError) onError(err);
      }
    } else {
      const err = new Error('Local AI engine is not running. Please launch an installed model from the Models tab to start local inference.');
      if (onError) onError(err);
    }
  }

  async stopModel() {
    this.isStopping = true;
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
        await new Promise(r => setTimeout(r, 600));
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      } catch (e) {}
      this.process = null;
    }
    this.currentModel = null;
    this.setStatus('STOPPED');
    this.isStopping = false;
    return { success: true };
  }

  getStatus() {
    return {
      status: this.status,
      currentModel: this.currentModel,
      engineType: this.engineType,
      port: this.port,
      host: this.host,
      errorDetails: this.errorDetails,
      lastMetrics: this.lastMetrics,
    };
  }
}

export const runtimeManager = new RuntimeManager();
