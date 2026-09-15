import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { PATHS, toRelativePath } from './dynamic-root.js';
import { parseGgufHeader } from './gguf-parser.js';
import { checkRequiredSpace } from './storage.js';

class DownloadManager {
  constructor() {
    this.queue = [];
    this.activeDownload = null;
    this.activeRequests = new Map();
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
          const partPath = path.join(PATHS.downloads, `${info.id}.part`);
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
   * Queues a model or engine binary for download
   */
  async queueDownload(modelMetadata) {
    const { id, name, url, expectedSize, filename, category } = modelMetadata;
    const targetFilename = filename || `${id}.gguf`;
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

    const downloadTask = {
      id,
      name,
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
    };

    // Check if partial exists on pendrive
    const partPath = path.join(PATHS.downloads, `${id}.part`);
    if (fs.existsSync(partPath)) {
      downloadTask.downloadedBytes = fs.statSync(partPath).size;
      if (downloadTask.totalBytes > 0) {
        downloadTask.percent = Math.round((downloadTask.downloadedBytes / downloadTask.totalBytes) * 100);
      }
    }

    // Save task info
    const infoPath = path.join(PATHS.downloads, `${id}.info.json`);
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

  async startDownload(task) {
    this.activeDownload = task;
    task.status = 'downloading';
    task.error = null;

    const partPath = path.join(PATHS.downloads, `${task.id}.part`);
    const infoPath = path.join(PATHS.downloads, `${task.id}.info.json`);

    let startOffset = 0;
    if (fs.existsSync(partPath)) {
      startOffset = fs.statSync(partPath).size;
    }
    task.downloadedBytes = startOffset;

    let speedTrackerBytes = 0;
    let lastSpeedCheckTime = Date.now();

    const speedInterval = setInterval(() => {
      const now = Date.now();
      const timeDelta = (now - lastSpeedCheckTime) / 1000;
      if (timeDelta >= 1) {
        task.speedMBs = Math.round((speedTrackerBytes / (1024 * 1024) / timeDelta) * 10) / 10;
        speedTrackerBytes = 0;
        lastSpeedCheckTime = now;

        if (task.speedMBs > 0 && task.totalBytes > task.downloadedBytes) {
          const remainingBytes = task.totalBytes - task.downloadedBytes;
          task.etaSeconds = Math.round(remainingBytes / (task.speedMBs * 1024 * 1024));
        }

        this.notify('progress', task);
      }
    }, 1000);

    let redirectHops = 0;
    const MAX_REDIRECTS = 10;

    const executeRequest = (currentUrlStr) => {
      let parsedUrl;
      try {
        parsedUrl = new URL(currentUrlStr);
      } catch (e) {
        clearInterval(speedInterval);
        task.status = 'error';
        task.error = `Invalid URL: ${currentUrlStr}`;
        this.activeDownload = null;
        this.notify('error', task);
        this.processQueue();
        return;
      }

      const client = parsedUrl.protocol === 'https:' ? https : http;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Nexyris/1.0',
        'Accept': '*/*',
      };

      if (startOffset > 0) {
        headers['Range'] = `bytes=${startOffset}-`;
      }

      const options = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        headers,
        timeout: 60000,
      };

      const req = client.get(options, (res) => {
        // Follow redirects (301, 302, 303, 307, 308)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          redirectHops++;
          if (redirectHops > MAX_REDIRECTS) {
            clearInterval(speedInterval);
            task.status = 'error';
            task.error = 'Too many redirects when resolving model URL';
            this.activeDownload = null;
            this.notify('error', task);
            this.processQueue();
            return;
          }
          const nextUrl = new URL(res.headers.location, currentUrlStr).href;
          res.resume();
          return executeRequest(nextUrl);
        }

        if (res.statusCode !== 200 && res.statusCode !== 206) {
          clearInterval(speedInterval);
          task.status = 'error';
          task.error = `Server returned HTTP ${res.statusCode}: ${res.statusMessage}`;
          this.activeDownload = null;
          this.notify('error', task);
          this.processQueue();
          return;
        }

        const contentLength = Number(res.headers['content-length']) || 0;
        if (res.statusCode === 200) {
          task.totalBytes = contentLength;
          startOffset = 0;
        } else if (res.statusCode === 206) {
          task.totalBytes = startOffset + contentLength;
        }

        const writeStream = fs.createWriteStream(partPath, { flags: startOffset > 0 ? 'a' : 'w' });

        res.on('data', (chunk) => {
          if (task.status !== 'downloading') {
            req.destroy();
            writeStream.end();
            return;
          }

          if (task.retryCount > 0) {
            task.retryCount = 0;
            task.error = null;
          }

          task.downloadedBytes += chunk.length;
          speedTrackerBytes += chunk.length;

          if (task.totalBytes > 0) {
            task.percent = Math.round((task.downloadedBytes / task.totalBytes) * 100);
          }
        });

        res.pipe(writeStream);

        writeStream.on('finish', async () => {
          clearInterval(speedInterval);
          if (task.status !== 'downloading') return;

          task.status = 'verifying';
          this.notify('verifying', task);

          try {
            // If GGUF file, verify authentic header
            if (task.filename.toLowerCase().endsWith('.gguf')) {
              const headerCheck = await parseGgufHeader(partPath);
              if (!headerCheck.valid) {
                task.status = 'error';
                task.error = `Corrupted GGUF header: ${headerCheck.error}`;
                this.activeDownload = null;
                this.notify('error', task);
                return;
              }
              task.header = headerCheck;
            }

            // Move from .part to final destination in USB models directory
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
            this.notify('completed', task);

            this.processQueue();
          } catch (err) {
            task.status = 'error';
            task.error = `Finalization error: ${err.message}`;
            this.activeDownload = null;
            this.notify('error', task);
            this.processQueue();
          }
        });

        writeStream.on('error', (err) => {
          clearInterval(speedInterval);
          task.status = 'error';
          task.error = `Disk write error on USB: ${err.message}`;
          this.activeDownload = null;
          this.notify('error', task);
          this.processQueue();
        });
      });

      const handleNetworkFailure = (reason) => {
        if (task.status !== 'downloading' && task.status !== 'reconnecting') return;

        clearInterval(speedInterval);
        task.retryCount = (task.retryCount || 0) + 1;
        const maxRetries = 10;

        if (task.retryCount <= maxRetries) {
          task.status = 'reconnecting';
          const backoffSec = Math.min(2 * task.retryCount, 15);
          task.error = `Network disconnected (${reason}). Auto-resuming in ${backoffSec}s (Attempt ${task.retryCount}/${maxRetries})...`;
          console.warn(`[DownloadManager] ${task.error}`);
          this.notify('reconnecting', task);

          setTimeout(() => {
            if (task.status === 'reconnecting') {
              task.status = 'downloading';
              // Check current size on disk as resume offset
              if (fs.existsSync(partPath)) {
                try {
                  startOffset = fs.statSync(partPath).size;
                  task.downloadedBytes = startOffset;
                } catch (e) {}
              }
              redirectHops = 0;
              executeRequest(task.url);
            }
          }, backoffSec * 1000);
        } else {
          task.status = 'paused';
          task.error = `Download paused after multiple failed attempts: ${reason}. You can resume anytime.`;
          this.activeDownload = null;
          this.notify('paused', task);
          this.processQueue();
        }
      };

      req.on('timeout', () => {
        req.destroy();
        handleNetworkFailure('Connection timed out');
      });

      req.on('error', (err) => {
        handleNetworkFailure(err.message || 'Connection lost');
      });

      this.activeRequests.set(task.id, req);
    };

    executeRequest(task.url);
  }

  pauseDownload(id) {
    const task = this.queue.find(t => t.id === id) || (this.activeDownload?.id === id ? this.activeDownload : null);
    if (!task) return;

    if (task.status === 'downloading') {
      task.status = 'paused';
      const req = this.activeRequests.get(id);
      if (req) {
        req.destroy();
        this.activeRequests.delete(id);
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
      const req = this.activeRequests.get(id);
      if (req) {
        req.destroy();
        this.activeRequests.delete(id);
      }
      const partPath = path.join(PATHS.downloads, `${id}.part`);
      const infoPath = path.join(PATHS.downloads, `${id}.info.json`);
      if (fs.existsSync(partPath)) fs.unlinkSync(partPath);
      if (fs.existsSync(infoPath)) fs.unlinkSync(infoPath);

      this.notify('cancelled', { id });
      this.processQueue();
    }
  }

  getStatus() {
    return {
      active: this.activeDownload ? {
        id: this.activeDownload.id,
        name: this.activeDownload.name,
        downloadedBytes: this.activeDownload.downloadedBytes,
        totalBytes: this.activeDownload.totalBytes,
        speedMBs: this.activeDownload.speedMBs,
        etaSeconds: this.activeDownload.etaSeconds,
        percent: this.activeDownload.percent,
        status: this.activeDownload.status,
      } : null,
      queue: this.queue.map(t => ({
        id: t.id,
        name: t.name,
        percent: t.percent,
        status: t.status,
        error: t.error,
      })),
      incomplete: this.getIncompleteDownloads(),
    };
  }
}

export const downloadManager = new DownloadManager();
