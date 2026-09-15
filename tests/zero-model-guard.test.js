import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { runtimeManager } from '../server/runtime-manager.js';
import { PATHS, APPLICATION_ROOT } from '../server/dynamic-root.js';

test('Strict Zero-Model Guard & USB Confinement Tests', async (t) => {
  await t.test('USB Confinement: process.env.TEMP/TMP strictly confined to pendrive temp/ folder', () => {
    assert.strictEqual(process.env.TEMP, PATHS.temp, 'TEMP environment must point to USB temp directory');
    assert.strictEqual(process.env.TMP, PATHS.temp, 'TMP environment must point to USB temp directory');
    assert.strictEqual(process.env.TMPDIR, PATHS.temp, 'TMPDIR environment must point to USB temp directory');
    assert.ok(PATHS.temp.startsWith(APPLICATION_ROOT), 'Temp path must be inside APPLICATION_ROOT');
    assert.ok(fs.existsSync(PATHS.temp), 'USB temp directory must exist');
  });

  await t.test('Zero-Model Guard: AI chat throws and refuses to stream when no model is active/loaded', async () => {
    // Ensure runtime is stopped and has no model
    await runtimeManager.stopModel();
    assert.strictEqual(runtimeManager.status, 'STOPPED');
    assert.strictEqual(runtimeManager.currentModel, null);

    let tokensEmitted = 0;
    let errorCaught = null;

    try {
      await runtimeManager.streamChat(
        [{ role: 'user', content: 'Hello? Is anyone there?' }],
        {},
        () => { tokensEmitted++; },
        () => {},
        (err) => { errorCaught = err; }
      );
    } catch (err) {
      errorCaught = err;
    }

    assert.strictEqual(tokensEmitted, 0, 'Zero tokens must be emitted when no model is active');
    assert.ok(errorCaught !== null, 'An explicit error must be thrown');
    assert.match(errorCaught.message, /No AI model is currently active/i);
  });

  await t.test('Zero-Model Guard: Refuses to start non-existent model', async () => {
    const fakeModel = {
      id: 'fake-ghost-model',
      name: 'Ghost Model',
      path: path.join(PATHS.modelsGguf, 'non-existent-model-file.gguf'),
    };

    let startError = null;
    try {
      await runtimeManager.startModel(fakeModel);
    } catch (e) {
      startError = e;
    }

    assert.ok(startError !== null, 'Must reject non-existent model file');
    assert.strictEqual(runtimeManager.status, 'ERROR');
  });
});
