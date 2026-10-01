import test from 'node:test';
import assert from 'node:assert';
import { addTerminalCommand, getTerminalHistory } from '../server/db.js';

test('Terminal Command Execution & History Tests', async (t) => {
  await t.test('Logs terminal command and retrieves latest entries', () => {
    const termId = 'term-test-entry-' + Date.now();
    const result = addTerminalCommand(termId, 'echo "Testing USB shell"', 'Testing USB shell', 'qwen-coder');
    assert.ok(result);
    assert.strictEqual(result.command, 'echo "Testing USB shell"');
    assert.strictEqual(result.output, 'Testing USB shell');

    const history = getTerminalHistory(15);
    const found = history.find(h => h.id === termId);
    assert.ok(found, 'Should find logged command in history');
    assert.strictEqual(found.command, 'echo "Testing USB shell"');
    assert.strictEqual(found.model_id, 'qwen-coder');
  });
});
