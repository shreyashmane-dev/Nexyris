import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { parseGgufHeader } from '../server/gguf-parser.js';
import { PATHS } from '../server/dynamic-root.js';

test('GGUF Parser & Validation Tests', async (t) => {
  const tempDir = path.join(PATHS.root, 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const validGgufFile = path.join(tempDir, 'test-valid-qwen.gguf');
  const invalidGgufFile = path.join(tempDir, 'test-invalid.gguf');
  const tinyFile = path.join(tempDir, 'test-tiny.gguf');

  // Create a synthetic valid GGUF header
  // Magic: 0x46554747 (GGUF), Version: 3, Tensors: 100, MetadataKV: 50
  const validHeader = Buffer.alloc(1024);
  validHeader.writeUInt32LE(0x46554747, 0); // "GGUF"
  validHeader.writeUInt32LE(3, 4);          // version 3
  validHeader.writeBigUInt64LE(100n, 8);    // 100 tensors
  validHeader.writeBigUInt64LE(50n, 16);    // 50 metadata KV
  validHeader.write('general.architecture: qwen2', 24, 'utf-8');
  fs.writeFileSync(validGgufFile, validHeader);

  // Create an invalid header (e.g. corrupt bytes or random file)
  const corruptHeader = Buffer.alloc(1024);
  corruptHeader.write('THIS IS NOT A GGUF FILE AT ALL', 0, 'utf-8');
  fs.writeFileSync(invalidGgufFile, corruptHeader);

  // Create a tiny file < 24 bytes
  fs.writeFileSync(tinyFile, Buffer.from('hello'));

  await t.test('Validates authentic GGUF file header and extracts version & tensors', async () => {
    const result = await parseGgufHeader(validGgufFile);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.version, 3);
    assert.strictEqual(result.tensorCount, 100);
    assert.strictEqual(result.architecture, 'Qwen');
  });

  await t.test('Rejects corrupted / non-GGUF file', async () => {
    const result = await parseGgufHeader(invalidGgufFile);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('Invalid GGUF header magic'));
  });

  await t.test('Rejects files too small to contain header', async () => {
    const result = await parseGgufHeader(tinyFile);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('too small'));
  });

  // Cleanup
  fs.unlinkSync(validGgufFile);
  fs.unlinkSync(invalidGgufFile);
  fs.unlinkSync(tinyFile);
});
