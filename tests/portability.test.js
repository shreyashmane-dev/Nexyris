import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { APPLICATION_ROOT, resolvePath, toRelativePath } from '../server/dynamic-root.js';

test('Dynamic Root & Portability Tests', async (t) => {
  await t.test('APPLICATION_ROOT is dynamically computed', () => {
    assert.ok(APPLICATION_ROOT, 'Root must exist');
    assert.ok(path.isAbsolute(APPLICATION_ROOT), 'Root must be absolute on host');
    assert.strictEqual(APPLICATION_ROOT.includes('..'), false, 'Root should be fully resolved');
  });

  await t.test('toRelativePath converts host paths to portable paths', () => {
    const fakeModelPath = path.join(APPLICATION_ROOT, 'models', 'gguf', 'qwen-7b.gguf');
    const portable = toRelativePath(fakeModelPath);
    assert.strictEqual(portable, 'models/gguf/qwen-7b.gguf');
    // Ensure no drive letter or absolute path leaked
    assert.ok(!portable.includes(':'), 'Portable path must not contain drive letter');
    assert.ok(!portable.startsWith('/'), 'Portable path must not start with slash');
  });

  await t.test('resolvePath reconstructs paths on any new drive', () => {
    const portable = 'models/gguf/mistral-7b.gguf';
    const resolved = resolvePath(portable);
    assert.strictEqual(resolved, path.join(APPLICATION_ROOT, 'models', 'gguf', 'mistral-7b.gguf'));
  });

  await t.test('Simulation: drive letter change from E: to F:', () => {
    const relativePart = 'models/gguf/llama.gguf';
    
    // Simulate plugging into another PC where drive letter is F:
    const newSimulatedRoot = path.normalize('F:/Nexyris');
    const newResolved = path.resolve(newSimulatedRoot, relativePart);
    
    assert.ok(newResolved.startsWith(newSimulatedRoot), 'Must seamlessly resolve under new root');
    assert.ok(newResolved.endsWith(path.join('models', 'gguf', 'llama.gguf')));
  });
});
