import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { APPLICATION_ROOT } from '../server/dynamic-root.js';
import { runtimeManager } from '../server/runtime-manager.js';
import { estimateModelSizeGB, searchHuggingFace } from '../server/providers/hf-catalog.js';

test('Offline Engine Bundling & Model Size Estimation Tests', async (t) => {
  await t.test('Offline bundled llama.cpp engine binaries exist in repository', () => {
    const bundledZip = path.join(APPLICATION_ROOT, 'runtime', 'windows', 'llama-portable.zip');
    const bundledFolder = path.join(APPLICATION_ROOT, 'runtime', 'windows', 'llama');
    const bundledExe = path.join(bundledFolder, 'llama-server.exe');

    const zipExists = fs.existsSync(bundledZip);
    const exeExists = fs.existsSync(bundledExe);

    assert.ok(zipExists || exeExists, 'Either llama-portable.zip or runtime/windows/llama/llama-server.exe must exist offline');
    if (zipExists) {
      const stats = fs.statSync(bundledZip);
      assert.ok(stats.size > 500000, `llama-portable.zip should be a valid zip (>500KB), got ${stats.size} bytes`);
    }
  });

  await t.test('findEngine discovers portable llama.cpp without internet connection', async () => {
    const engine = await runtimeManager.findEngine();
    assert.ok(engine, 'Engine must be discoverable from local USB runtime');
    assert.ok(fs.existsSync(engine.path), `Engine binary at ${engine.path} must exist locally`);
    assert.ok(engine.type === 'llama-server' || engine.type === 'ollama', `Engine type should be valid, got: ${engine.type}`);
  });

  await t.test('installPortableEngine resolves local engine from repository package', async () => {
    const bin = await runtimeManager.installPortableEngine();
    assert.ok(bin, 'installPortableEngine must return binary path');
    assert.ok(fs.existsSync(bin), `Binary at ${bin} must exist on disk`);
    assert.ok(bin.includes('llama-server'), 'Binary should be llama-server');
  });

  await t.test('estimateModelSizeGB correctly calculates model sizes in GB', () => {
    assert.strictEqual(estimateModelSizeGB('SmolLM2-135M-Instruct-GGUF'), 0.2);
    assert.strictEqual(estimateModelSizeGB('Llama-3.2-1B-Instruct-GGUF'), 1.0);
    assert.strictEqual(estimateModelSizeGB('Llama-3.2-3B-Instruct-GGUF'), 2.2);
    assert.strictEqual(estimateModelSizeGB('Mistral-7B-Instruct-v0.3-GGUF'), 4.2);
    assert.strictEqual(estimateModelSizeGB('dolphin-2.9-llama3-8b-GGUF'), 4.9);
    assert.strictEqual(estimateModelSizeGB('Qwen2.5-14B-Instruct-GGUF'), 8.5);
    assert.strictEqual(estimateModelSizeGB('Llama-3.3-70B-Instruct-GGUF'), 42.0);

    // Quantization scaling
    assert.strictEqual(estimateModelSizeGB('Llama-3.2-1B-Q2_K.gguf', 'Q2_K'), 0.5);
    assert.strictEqual(estimateModelSizeGB('Llama-3.2-1B-Q8_0.gguf', 'Q8_0'), 1.8);
  });
});
