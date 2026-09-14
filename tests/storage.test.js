import test from 'node:test';
import assert from 'node:assert';
import { getStorageInfo, checkRequiredSpace, getStorageAvailability } from '../server/storage.js';

test('Storage Detection & Heartbeat Tests', async (t) => {
  await t.test('Inspects host storage volume', async () => {
    const info = await getStorageInfo();
    assert.ok(info, 'Storage info returned');
    assert.ok(info.totalBytes > 0, 'Total bytes should be > 0');
    assert.ok(info.freeBytes >= 0, 'Free bytes should be >= 0');
    assert.ok(info.driveLetter, 'Drive letter detected');
  });

  await t.test('Accurately checks required space against available space', async () => {
    const info = await getStorageInfo();
    // Test a small requirement that should pass
    const smallReq = await checkRequiredSpace(10 * 1024 * 1024); // 10MB
    assert.strictEqual(smallReq.sufficient, true);

    // Test a giant requirement that should fail (e.g. 50,000 GB)
    const giantReq = await checkRequiredSpace(50000 * 1024 * 1024 * 1024);
    assert.strictEqual(giantReq.sufficient, false);
    assert.ok(giantReq.shortfallBytes > 0);
  });

  await t.test('Storage availability status is online', () => {
    assert.strictEqual(getStorageAvailability(), true);
  });
});
