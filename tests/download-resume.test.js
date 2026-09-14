import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { downloadManager } from '../server/download-manager.js';
import { PATHS } from '../server/dynamic-root.js';

test('Download Manager & Resume Tests', async (t) => {
  // Setup a mock HTTP server with Range request support
  const mockFileSize = 100 * 1024; // 100 KB
  const mockData = Buffer.alloc(mockFileSize);
  // Write a valid GGUF header into the mock data so verification passes
  mockData.writeUInt32LE(0x46554747, 0); // "GGUF"
  mockData.writeUInt32LE(3, 4);          // version 3
  mockData.writeBigUInt64LE(10n, 8);     // 10 tensors
  mockData.writeBigUInt64LE(5n, 16);     // 5 metadata KV

  let rangeRequestsReceived = 0;

  const mockServer = http.createServer((req, res) => {
    const range = req.headers['range'];
    if (range) {
      rangeRequestsReceived++;
      const match = range.match(/bytes=(\d+)-/);
      const start = match ? parseInt(match[1], 10) : 0;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${mockFileSize - 1}/${mockFileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': mockFileSize - start,
        'Content-Type': 'application/octet-stream',
      });
      res.end(mockData.subarray(start));
    } else {
      res.writeHead(200, {
        'Accept-Ranges': 'bytes',
        'Content-Length': mockFileSize,
        'Content-Type': 'application/octet-stream',
      });
      res.end(mockData);
    }
  });

  const mockPort = 39871;
  await new Promise(resolve => mockServer.listen(mockPort, '127.0.0.1', resolve));

  await t.test('Queues and completes a chunked download', async () => {
    const taskId = 'test-mock-model';
    const testModel = {
      id: taskId,
      name: 'Mock Test Model',
      filename: 'mock-test-model.gguf',
      url: `http://127.0.0.1:${mockPort}/model.gguf`,
      expectedSize: mockFileSize,
    };

    let completed = false;
    const unsub = downloadManager.onProgress((event, data) => {
      if (event === 'completed' && data.id === taskId) {
        completed = true;
      }
    });

    await downloadManager.queueDownload(testModel);

    // Wait up to 5s for completion
    for (let i = 0; i < 50; i++) {
      if (completed) break;
      await new Promise(r => setTimeout(r, 100));
    }

    unsub();
    assert.strictEqual(completed, true, 'Download should complete');

    const destFile = path.join(PATHS.modelsGguf, 'mock-test-model.gguf');
    assert.ok(fs.existsSync(destFile), 'Model file must exist in models/gguf/');
    assert.strictEqual(fs.statSync(destFile).size, mockFileSize);

    // Clean up
    fs.unlinkSync(destFile);
  });

  mockServer.close();
});
