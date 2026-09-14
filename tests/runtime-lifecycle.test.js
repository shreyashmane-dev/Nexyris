import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { runtimeManager } from '../server/runtime-manager.js';
import { PATHS } from '../server/dynamic-root.js';

test('Runtime Lifecycle & Streaming Tests', async (t) => {
  // Create a synthetic tiny model in temp for testing
  const tempDir = path.join(PATHS.root, 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const testModelFile = path.join(tempDir, 'runtime-test-model.gguf');
  const buffer = Buffer.alloc(1024);
  buffer.writeUInt32LE(0x46554747, 0); // "GGUF"
  buffer.writeUInt32LE(3, 4);
  buffer.writeBigUInt64LE(10n, 8);
  buffer.writeBigUInt64LE(5n, 16);
  fs.writeFileSync(testModelFile, buffer);

  const modelInfo = {
    id: 'test-model',
    name: 'Test Synthetic Model',
    path: testModelFile,
    sizeGB: 0.1,
  };

  await t.test('Starts model and transitions to READY', async () => {
    const started = await runtimeManager.startModel(modelInfo, { threads: 4, contextSize: 2048 });
    assert.ok(started.success);
    assert.strictEqual(runtimeManager.status, 'READY');
    assert.strictEqual(runtimeManager.currentModel.id, 'test-model');
  });

  await t.test('Streams tokens and records token velocity', async () => {
    let tokensReceived = 0;
    let fullText = '';
    let finalMetrics = null;

    await runtimeManager.streamChat(
      [{ role: 'user', content: 'Explain recursion' }],
      {},
      (tokenData) => {
        tokensReceived++;
        fullText += tokenData.text;
      },
      (metrics) => {
        finalMetrics = metrics;
      }
    );

    assert.ok(tokensReceived > 5, 'Should receive multiple streaming tokens');
    assert.ok(fullText.includes('Recursion'), 'Output must contain response text');
    assert.ok(finalMetrics !== null, 'Metrics must be provided on completion');
    assert.ok(finalMetrics.tokensGenerated > 0, 'Tokens generated must be > 0');
  });

  await t.test('Safely stops model and resets state to STOPPED', async () => {
    const stopped = await runtimeManager.stopModel();
    assert.ok(stopped.success);
    assert.strictEqual(runtimeManager.status, 'STOPPED');
    assert.strictEqual(runtimeManager.currentModel, null);
  });

  // Clean up
  if (fs.existsSync(testModelFile)) fs.unlinkSync(testModelFile);
});
