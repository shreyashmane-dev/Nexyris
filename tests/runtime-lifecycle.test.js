import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { runtimeManager } from '../server/runtime-manager.js';
import { PATHS } from '../server/dynamic-root.js';

test('Runtime Lifecycle & Streaming Tests', async (t) => {
  const realModelPath = path.join(PATHS.modelsGguf, 'SmolLM2-135M-Instruct-Q4_K_M.gguf');
  const useRealModel = fs.existsSync(realModelPath);

  const tempDir = path.join(PATHS.root, 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const testModelFile = useRealModel ? realModelPath : path.join(tempDir, 'runtime-test-model.gguf');
  if (!useRealModel) {
    const buffer = Buffer.alloc(1024);
    buffer.writeUInt32LE(0x46554747, 0); // "GGUF"
    buffer.writeUInt32LE(3, 4);
    buffer.writeBigUInt64LE(10n, 8);
    buffer.writeBigUInt64LE(5n, 16);
    fs.writeFileSync(testModelFile, buffer);
  }

  const modelInfo = {
    id: useRealModel ? 'smollm2-135m-instruct-q4_k_m-gguf' : 'test-model',
    name: useRealModel ? 'SmolLM2 135M Instruct' : 'Test Synthetic Model',
    path: testModelFile,
    sizeGB: 0.1,
  };

  await t.test('Starts model and transitions to READY', async () => {
    const started = await runtimeManager.startModel(modelInfo, { threads: 4, contextSize: 2048 });
    assert.ok(started.success);
    assert.strictEqual(runtimeManager.status, 'READY');
  });

  await t.test('Streams tokens and records token velocity', async () => {
    let tokensReceived = 0;
    let fullText = '';
    let finalMetrics = null;

    await runtimeManager.streamChat(
      [{ role: 'user', content: 'What is 2+2?' }],
      {},
      (tokenData) => {
        tokensReceived++;
        fullText += tokenData.text;
      },
      (metrics) => {
        finalMetrics = metrics;
      }
    );

    assert.ok(tokensReceived > 1, 'Should receive multiple streaming tokens');
    assert.ok(fullText.length > 0, 'Output must contain response text');
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
  if (!useRealModel && fs.existsSync(testModelFile)) fs.unlinkSync(testModelFile);
});
