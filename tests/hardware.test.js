import test from 'node:test';
import assert from 'node:assert';
import { detectHardware, evaluateModelCompatibility } from '../server/hardware.js';

test('Hardware Detection & Compatibility Evaluation Tests', async (t) => {
  await t.test('Detects CPU, RAM, and architecture', async () => {
    const hw = await detectHardware();
    assert.ok(hw.hostId, 'Host ID generated');
    assert.ok(hw.cpu.physicalCores >= 1, 'Physical cores >= 1');
    assert.ok(hw.cpu.logicalThreads >= 1, 'Logical threads >= 1');
    assert.ok(hw.ram.totalGB > 0, 'Total RAM > 0');
    assert.ok(hw.recommendedConfig.threads >= 1, 'Recommended threads >= 1');
  });

  await t.test('Correctly scores model compatibility against RAM', async () => {
    const hw = await detectHardware();
    
    // Tiny model (0.2 GB) should always be RECOMMENDED on any modern machine
    const tinyCompat = evaluateModelCompatibility(0.2, hw);
    assert.strictEqual(tinyCompat.status, 'RECOMMENDED');
    assert.strictEqual(tinyCompat.canRun, true);

    // Enormous model (200 GB) should be UNSUPPORTED on standard 16GB machine
    const hugeCompat = evaluateModelCompatibility(200, hw);
    assert.strictEqual(hugeCompat.status, 'UNSUPPORTED');
    assert.strictEqual(hugeCompat.canRun, false);
    assert.ok(hugeCompat.reason.includes('OOM') || hugeCompat.reason.includes('installed'));
  });
});
