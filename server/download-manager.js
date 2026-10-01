import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { PATHS, toRelativePath } from './dynamic-root.js';
import { parseGgufHeader } from './gguf-parser.js';
import { checkRequiredSpace } from './storage.js';
import { fetchRepoFiles } from './providers/hf-catalog.js';

function toSafeFileId(id) {
  return String(id).replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Persistent high-performance HTTP/HTTPS agent pool with Keep-Alive
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 32,
  maxFreeSockets: 16,
  timeout: 60000,
});

const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 32,
  maxFreeSockets: 16,
  timeout: 60000,
});

class DownloadManager {
  constructor() {
    this.queue = [];
    this.activeDownload = null;
    this.activeWorkers = new Map(); // taskId -> array of active request abort controllers/requests
    this.activeFileDescriptors = new Map(); // taskId -> fd
    this.listeners = new Set();
  }

  onProgress(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error('Download listener error:', e);
      }
    }
  }

  /**
   * Scans downloads directory for partial downloads from previous sessions
   */
  getIncompleteDownloads() {
    const incomplete = [];
    if (!fs.existsSync(PATHS.downloads)) return incomplete;

    const files = fs.readdirSync(PATHS.downloads);
    for (const file of files) {
      if (file.endsWith('.info.json')) {
        try {
          const infoPath = path.join(PATHS.downloads, file);
          const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
          const safeKey = toSafeFileId(info.fileKey || info.id || file.replace(/\.info\.json$/, ''));
          const partPath = path.join(PATHS.downloads, `${safeKey}.part`);
          const currentSize = fs.existsSync(partPath) ? fs.statSync(partPath).size : 0;

          incomplete.push({
            ...info,
            currentSize,
            currentGB: Math.round((currentSize / (1024 ** 3)) * 100) / 100,
            progressPercent: info.totalBytes > 0 ? Math.round((currentSize / info.totalBytes) * 100) : 0,
          });
        } catch (e) {}
      }
    }
    return incomplete;
  }

  /**
   * Resolves direct CDN URL and inspects headers (following redirects)
   */
  async resolveEndpointInfo(initialUrl, startOffset = 0) {
    let currentUrl = initialUrl;
    let hops = 0;
    const maxHops = 12;

    while (hops < maxHops) {
      hops++;
      const parsed = new URL(currentUrl);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;
      const agent = isHttps ? httpsAgent : httpAgent;

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Nexyris/1.0',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
      };

      if (startOffset > 0) {
        headers['Range'] = `bytes=${startOffset}-`;
      }

      const res = await new Promise((resolve, reject) => {
        const req = client.get({
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname + parsed.search,
          headers,
          agent,
          timeout: 45000,
        }, resolve);

        req.on('timeout', () => { req.destroy(); reject(new Error('Connection timed out')); });
        req.on('error', reject);
      });

      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, currentUrl).href;
        res.resume();
        currentUrl = nextUrl;
        continue;
      }

      // Final destination reached
      const contentLength = Number(res.headers['content-length']) || 0;
      const acceptRanges = String(res.headers['accept-ranges'] || '').toLowerCase();
      const contentRange = String(res.headers['content-range'] || '').toLowerCase();
      const supportsRanges = acceptRanges.includes('bytes') || contentRange.includes('bytes') || res.statusCode === 206;

      let totalSize = contentLength;
      if (res.statusCode === 206 && contentRange) {
        const match = contentRange.match(/\/(\d+)/);
        if (match) {
          totalSize = Number(match[1]);
        }
      }

      return {
        finalUrl: currentUrl,
        statusCode: res.statusCode,
        headers: res.headers,
        contentLength,
        totalSize,
        supportsRanges,
        initialResponse: res,
      };
    }

    throw new Error('Too many redirects encountered while resolving model download URL');
  }

  /**
   * Queues a model or engine binary for download
   */
  async queueDownload(modelMetadata) {
    let { id, name, url, expectedSize, filename, category } = modelMetadata;

    // Automatically resolve authentic Hugging Face file URL if repo ID provided or placeholder
    if (id && id.includes('/') && (!url || url.includes('_GGUF.') || !url.toLowerCase().endsWith('.gguf'))) {
      try {
        const repoFiles = await fetchRepoFiles(id);
        if (repoFiles && repoFiles.length > 0) {
          const matched = repoFiles.find(f => f.filename.toLowerCase().includes('q4_k_m')) ||
            repoFiles.find(f => f.filename.toLowerCase().includes('q4_0')) ||
            repoFiles[0];
          if (matched) {
            filename = matched.filename;
            url = matched.downloadUrl;
          }
        }
      } catch (e) {}
    }

    const targetFilename = filename || `${id.replace(/\//g, '_')}.gguf`;
    const finalDir = category === 'image' 
      ? path.join(PATHS.root, 'models', 'image')
      : (category === 'speech' ? path.join(PATHS.root, 'models', 'speech') : PATHS.modelsGguf);

    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }

    const finalPath = path.join(finalDir, targetFilename);

    if (fs.existsSync(finalPath)) {
      throw new Error(`Model file ${targetFilename} already exists in models/`);
    }

    // Check disk space on pendrive
    if (expectedSize) {
      const spaceCheck = checkRequiredSpace(expectedSize);
      if (!spaceCheck.sufficient) {
        throw new Error(`Insufficient storage on USB! Need ${Math.round((expectedSize / (1024 ** 3)) * 10) / 10} GB, but only ${Math.round((spaceCheck.freeBytes / (1024 ** 3)) * 10) / 10} GB free.`);
      }
    }

    const safeFileKey = toSafeFileId(id);
    const downloadTask = {
      id,
      fileKey: safeFileKey,
      name: name || targetFilename,
      url,
      filename: targetFilename,
      finalDir,
      expectedSize: expectedSize || 0,
      downloadedBytes: 0,
      totalBytes: expectedSize || 0,
      speedMBs: 0,
      etaSeconds: 0,
      percent: 0,
      status: 'queued', // queued, downloading, paused, verifying, completed, error
      error: null,
      created: Date.now(),
      chunks: null,
    };

    if (!fs.existsSync(PATHS.downloads)) {
      fs.mkdirSync(PATHS.downloads, { recursive: true });
    }

    // Check if partial exists on pendrive
    const partPath = path.join(PATHS.downloads, `${safeFileKey}.part`);
    const infoPath = path.join(PATHS.downloads, `${safeFileKey}.info.json`);

    if (fs.existsSync(infoPath)) {
      try {
        const savedInfo = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
        if (savedInfo.chunks) {
          downloadTask.chunks = savedInfo.chunks;
        }
      } catch (e) {}
    }

    if (fs.existsSync(partPath)) {
      downloadTask.downloadedBytes = fs.statSync(partPath).size;
      if (downloadTask.totalBytes > 0) {
        downloadTask.percent = Math.round((downloadTask.downloadedBytes / downloadTask.totalBytes) * 100);
      }
    }

    fs.writeFileSync(infoPath, JSON.stringify(downloadTask, null, 2), 'utf-8');

    this.queue.push(downloadTask);
    this.notify('queue_updated', this.getStatus());
    this.processQueue();

    return downloadTask;
  }

  async processQueue() {
    if (this.activeDownload) return;
    const nextTask = this.queue.find(t => t.status === 'queued');
    if (!nextTask) return;

    this.startDownload(nextTask);
  }

  /**
   * Starts high-speed segmented parallel download with fallback to single stream
   */
  async startDownload(task) {
    this.activeDownload = task;
    task.status = 'downloading';
    task.error = null;

    const safeFileKey = task.fileKey || toSafeFileId(task.id);
    const partPath = path.join(PATHS.downloads, `${safeFileKey}.part`);
    const infoPath = path.join(PATHS.downloads, `${safeFileKey}.info.json`);
    fs.mkdirSync(path.dirname(infoPath), { recursive: true });
    fs.mkdirSync(path.dirname(partPath), { recursive: true });

    let speedTrackerBytes = 0;
    let lastSpeedCheckTime = Date.now();
    let smoothedSpeedMBs = 0;

    const speedInterval = setInterval(() => {
      const now = Date.now();
      const timeDelta = (now - lastSpeedCheckTime) / 1000;
      if (timeDelta >= 0.5) {
        const instantSpeed = (speedTrackerBytes / (1024 * 1024)) / timeDelta;
        smoothedSpeedMBs = smoothedSpeedMBs === 0 ? instantSpeed : (smoothedSpeedMBs * 0.6) + (instantSpeed * 0.4);
        task.speedMBs = Math.round(smoothedSpeedMBs * 10) / 10;
        speedTrackerBytes = 0;
        lastSpeedCheckTime = now;

        if (task.totalBytes > 0) {
          task.percent = Math.min(100, Math.round((task.downloadedBytes / task.totalBytes) * 100));
        }

        if (task.speedMBs > 0 && task.totalBytes > task.downloadedBytes) {
          const remainingBytes = task.totalBytes - task.downloadedBytes;
          task.etaSeconds = Math.round(remainingBytes / (task.speedMBs * 1024 * 1024));
        }

        this.notify('progress', task);
      }
    }, 500);

    const cleanupActive = () => {
      clearInterval(speedInterval);
      const reqs = this.activeWorkers.get(task.id) || [];
      for (const req of reqs) {
        try { req.destroy(); } catch (e) {}
      }
      this.activeWorkers.delete(task.id);

      const fd = this.activeFileDescriptors.get(task.id);
      if (fd !== undefined) {
        try { fs.closeSync(fd); } catch (e) {}
        this.activeFileDescriptors.delete(task.id);
      }
    };

    const handleFailure = (errMsg) => {
      cleanupActive();
      task.status = 'error';
      task.error = errMsg;
      this.activeDownload = null;
      this.notify('error', task);
      this.processQueue();
    };

    try {
      console.log(`[DownloadManager] Resolving endpoint for ${task.name}...`);
      let endpointInfo;
      try {
        endpointInfo = await this.resolveEndpointInfo(task.url);
      } catch (err) {
        // If 404, try to auto-resolve authentic HF repo files if repo ID provided
        if (task.id && task.id.includes('/') && !task._hasResolvedRepo) {
          task._hasResolvedRepo = true;
          try {
            const files = await fetchRepoFiles(task.id);
            if (files && files.length > 0) {
              const matched = files.find(f => f.filename.toLowerCase().includes('q4_k_m')) ||
                files.find(f => f.filename.toLowerCase().includes('q4_0')) ||
                files[0];
              if (matched) {
                console.log(`[DownloadManager] Auto-resolved to authentic Hugging Face file: ${matched.filename}`);
                task.filename = matched.filename;
                task.url = matched.downloadUrl;
                endpointInfo = await this.resolveEndpointInfo(matched.downloadUrl);
              }
            }
          } catch (e) {}
        }
        if (!endpointInfo) throw err;
      }

      if (endpointInfo.statusCode !== 200 && endpointInfo.statusCode !== 206) {
        throw new Error(`Server returned HTTP ${endpointInfo.statusCode} for model download`);
      }

      if (endpointInfo.totalSize > 0) {
        task.totalBytes = endpointInfo.totalSize;
      } else if (endpointInfo.contentLength > 0) {
        task.totalBytes = endpointInfo.contentLength;
      }

      const totalSize = task.totalBytes;
      const resolvedDirectUrl = endpointInfo.finalUrl;

      // Close probe response
      endpointInfo.initialResponse.destroy();

      // Determine concurrency: 4 parallel connections for large files (> 10MB) if ranges supported
      const PARALLEL_CONCURRENCY = 4;
      const shouldUseParallel = endpointInfo.supportsRanges && totalSize > (10 * 1024 * 1024);

      if (shouldUseParallel) {
        console.log(`[DownloadManager] Starting HIGH-SPEED PARALLEL download (${PARALLEL_CONCURRENCY} streams) for ${task.name} (${Math.round(totalSize / (1024 ** 3) * 10) / 10} GB)`);
        
        // Open file descriptor for direct positional chunk writes
        const fileFlags = fs.existsSync(partPath) ? 'r+' : 'w+';
        const fd = fs.openSync(partPath, fileFlags);
        this.activeFileDescriptors.set(task.id, fd);

        // Pre-allocate or calculate chunk slices
        if (!task.chunks || task.chunks.length !== PARALLEL_CONCURRENCY) {
          const chunkSize = Math.floor(totalSize / PARALLEL_CONCURRENCY);
          task.chunks = [];
          for (let i = 0; i < PARALLEL_CONCURRENCY; i++) {
            const start = i * chunkSize;
            const end = (i === PARALLEL_CONCURRENCY - 1) ? totalSize - 1 : (start + chunkSize - 1);
            task.chunks.push({
              index: i,
              start,
              end,
              current: start,
              downloaded: 0,
              total: (end - start) + 1,
              done: false,
            });
          }
        }

        // Calculate current total downloaded from chunks
        task.downloadedBytes = task.chunks.reduce((acc, c) => acc + (c.downloaded || 0), 0);
        if (task.totalBytes > 0) {
          task.percent = Math.round((task.downloadedBytes / task.totalBytes) * 100);
        }

        const workers = [];
        this.activeWorkers.set(task.id, workers);

        const downloadChunk = (chunk) => {
          return new Promise((resolve, reject) => {
            if (chunk.done || chunk.current > chunk.end) {
              chunk.done = true;
              return resolve();
            }

            const chunkStart = chunk.current;
            const chunkEnd = chunk.end;
            const parsed = new URL(resolvedDirectUrl);
            const isHttps = parsed.protocol === 'https:';
            const client = isHttps ? https : http;
            const agent = isHttps ? httpsAgent : httpAgent;

            const headers = {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Nexyris/1.0',
              'Accept': '*/*',
              'Range': `bytes=${chunkStart}-${chunkEnd}`,
              'Accept-Encoding': 'identity',
            };

            const req = client.get({
              protocol: parsed.protocol,
              hostname: parsed.hostname,
              port: parsed.port || (isHttps ? 443 : 80),
              path: parsed.pathname + parsed.search,
              headers,
              agent,
              timeout: 60000,
            }, (res) => {
              if (res.statusCode !== 200 && res.statusCode !== 206) {
                return reject(new Error(`Chunk ${chunk.index} HTTP ${res.statusCode}`));
              }

              res.on('data', (buffer) => {
                if (task.status !== 'downloading') {
                  req.destroy();
                  return;
                }

                const writeOffset = chunk.current;
                chunk.current += buffer.length;
                chunk.downloaded += buffer.length;
                task.downloadedBytes += buffer.length;
                speedTrackerBytes += buffer.length;

                // Direct atomic write to file position
                fs.write(fd, buffer, 0, buffer.length, writeOffset, (writeErr) => {
                  if (writeErr && task.status === 'downloading') {
                    console.error(`[DownloadManager] Disk write error at offset ${writeOffset}:`, writeErr);
                  }
                });
              });

              res.on('end', () => {
                if (chunk.current >= chunk.end) {
                  chunk.done = true;
                }
                resolve();
              });

              res.on('error', reject);
            });

            req.on('timeout', () => {
              req.destroy();
              reject(new Error(`Chunk ${chunk.index} timed out`));
            });

            req.on('error', reject);
            workers.push(req);
          });
        };

        // Run chunks concurrently with chunk-level auto-retry
        const runChunkWithRetry = async (chunk) => {
          let chunkAttempts = 0;
          const maxChunkRetries = 6;
          while (chunkAttempts < maxChunkRetries && !chunk.done && task.status === 'downloading') {
            try {
              chunkAttempts++;
              await downloadChunk(chunk);
              if (chunk.current >= chunk.end) {
                chunk.done = true;
                break;
              }
            } catch (err) {
              if (task.status !== 'downloading') break;
              console.warn(`[DownloadManager] Chunk ${chunk.index} retry ${chunkAttempts}/${maxChunkRetries}: ${err.message}`);
              await new Promise(r => setTimeout(r, Math.min(1000 * chunkAttempts, 5000)));
            }
          }
          if (!chunk.done && task.status === 'downloading') {
            throw new Error(`Segment ${chunk.index} failed to complete after multiple retries`);
          }
        };

        // Execute all parallel chunk workers
        await Promise.all(task.chunks.map(chunk => runChunkWithRetry(chunk)));

      } else {
        // Fallback: Optimized Single Stream with 4MB write buffer & Keep-Alive
        console.log(`[DownloadManager] Streaming single connection for ${task.name}...`);
        
        let startOffset = 0;
        if (fs.existsSync(partPath)) {
          startOffset = fs.statSync(partPath).size;
        }
        task.downloadedBytes = startOffset;

        const parsed = new URL(resolvedDirectUrl);
        const isHttps = parsed.protocol === 'https:';
        const client = isHttps ? https : http;
        const agent = isHttps ? httpsAgent : httpAgent;

        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Nexyris/1.0',
          'Accept': '*/*',
          'Accept-Encoding': 'identity',
        };

        if (startOffset > 0) {
          headers['Range'] = `bytes=${startOffset}-`;
        }

        await new Promise((resolve, reject) => {
          const req = client.get({
            protocol: parsed.protocol,
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search,
            headers,
            agent,
            timeout: 60000,
          }, (res) => {
            if (res.statusCode !== 200 && res.statusCode !== 206) {
              return reject(new Error(`Server returned HTTP ${res.statusCode}`));
            }

            if (res.statusCode === 200) {
              task.totalBytes = Number(res.headers['content-length']) || 0;
              startOffset = 0;
            } else if (res.statusCode === 206) {
              const cl = Number(res.headers['content-length']) || 0;
              task.totalBytes = startOffset + cl;
            }

            const writeStream = fs.createWriteStream(partPath, {
              flags: startOffset > 0 ? 'a' : 'w',
              highWaterMark: 4 * 1024 * 1024 // 4 MB high-speed write buffer for USB
            });

            res.on('data', (chunk) => {
              if (task.status !== 'downloading') {
                req.destroy();
                writeStream.end();
                return;
              }
              task.downloadedBytes += chunk.length;
              speedTrackerBytes += chunk.length;
            });

            res.pipe(writeStream);

            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
            res.on('error', reject);
          });

          req.on('timeout', () => { req.destroy(); reject(new Error('Connection timed out')); });
          req.on('error', reject);

          this.activeWorkers.set(task.id, [req]);
        });
      }

      // Finalize completed download
      cleanupActive();

      if (task.status !== 'downloading') return;

      task.status = 'verifying';
      this.notify('verifying', task);

      // Verify authentic GGUF header
      if (task.filename.toLowerCase().endsWith('.gguf')) {
        const headerCheck = await parseGgufHeader(partPath);
        if (!headerCheck.valid) {
          throw new Error(`Corrupted GGUF header: ${headerCheck.error}`);
        }
        task.header = headerCheck;
      }

      // Move .part to final destination in USB models directory
      const finalDir = task.finalDir || PATHS.modelsGguf;
      if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
      const finalPath = path.join(finalDir, task.filename);

      if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
      fs.renameSync(partPath, finalPath);

      // Clean info file
      if (fs.existsSync(infoPath)) fs.unlinkSync(infoPath);

      task.status = 'completed';
      task.percent = 100;
      task.finalPath = toRelativePath(finalPath);
      this.activeDownload = null;
      console.log(`[DownloadManager] Successfully completed download for ${task.name} -> ${finalPath}`);
      this.notify('completed', task);

      this.processQueue();

    } catch (err) {
      handleFailure(err.message || 'Download error');
    }
  }

  pauseDownload(id) {
    const task = this.queue.find(t => t.id === id) || (this.activeDownload?.id === id ? this.activeDownload : null);
    if (!task) return;

    if (task.status === 'downloading') {
      task.status = 'paused';
      const workers = this.activeWorkers.get(id) || [];
      for (const req of workers) {
        try { req.destroy(); } catch (e) {}
      }
      this.activeWorkers.delete(id);

      const fd = this.activeFileDescriptors.get(id);
      if (fd !== undefined) {
        try { fs.closeSync(fd); } catch (e) {}
        this.activeFileDescriptors.delete(id);
      }

      this.activeDownload = null;
      this.notify('paused', task);
      this.processQueue();
    }
  }

  resumeDownload(id) {
    let task = this.queue.find(t => t.id === id);
    if (!task) {
      const incomplete = this.getIncompleteDownloads().find(t => t.id === id);
      if (incomplete) {
        task = {
          ...incomplete,
          status: 'queued',
          error: null,
        };
        this.queue.push(task);
      }
    }
    if (!task) return;

    if (task.status === 'paused' || task.status === 'error' || task.status === 'queued') {
      task.status = 'queued';
      task.error = null;
      this.notify('resumed', task);
      this.processQueue();
    }
  }

  cancelDownload(id) {
    const index = this.queue.findIndex(t => t.id === id);
    let task = null;

    if (index !== -1) {
      task = this.queue.splice(index, 1)[0];
    } else if (this.activeDownload?.id === id) {
      task = this.activeDownload;
      this.activeDownload = null;
    }

    if (task) {
      const workers = this.activeWorkers.get(id) || [];
      for (const req of workers) {
        try { req.destroy(); } catch (e) {}
      }
      this.activeWorkers.delete(id);

      const fd = this.activeFileDescriptors.get(id);
      if (fd !== undefined) {
        try { fs.closeSync(fd); } catch (e) {}
        this.activeFileDescriptors.delete(id);
      }

      const safeFileKey = task.fileKey || toSafeFileId(id);
      const partPath = path.join(PATHS.downloads, `${safeFileKey}.part`);
      const infoPath = path.join(PATHS.downloads, `${safeFileKey}.info.json`);
      if (fs.existsSync(partPath)) {
        try { fs.unlinkSync(partPath); } catch (e) {}
      }
      if (fs.existsSync(infoPath)) {
        try { fs.unlinkSync(infoPath); } catch (e) {}
      }

      this.notify('cancelled', { id });
      this.processQueue();
    }
  }

  getStatus() {
    return {
      active: this.activeDownload ? {
        id: this.activeDownload.id,
        fileKey: this.activeDownload.fileKey,
        name: this.activeDownload.name,
        downloadedBytes: this.activeDownload.downloadedBytes,
        totalBytes: this.activeDownload.totalBytes,
        speedMBs: this.activeDownload.speedMBs,
        etaSeconds: this.activeDownload.etaSeconds,
        percent: this.activeDownload.percent,
        status: this.activeDownload.status,
        error: this.activeDownload.error,
        filename: this.activeDownload.filename,
      } : null,
      queue: this.queue.map(t => ({
        id: t.id,
        fileKey: t.fileKey,
        name: t.name,
        percent: t.percent,
        status: t.status,
        error: t.error,
        filename: t.filename,
      })),
      incomplete: this.getIncompleteDownloads(),
    };
  }
}

export const downloadManager = new DownloadManager();
