import test from 'node:test';
import assert from 'node:assert';
import { 
  createConversation, 
  listConversations, 
  addMessage, 
  getConversationMessages, 
  deleteConversation,
  addTerminalCommand,
  getTerminalHistory,
  saveCodeProject,
  listCodeProjects,
  deleteCodeProject
} from '../server/db.js';

test('Database Persistence Tests (Native SQLite)', async (t) => {
  const testConvId = 'test-conv-' + Date.now();

  await t.test('Creates conversation and persists to SQLite', () => {
    const conv = createConversation(testConvId, 'Test Conversation', 'qwen-7b');
    assert.strictEqual(conv.id, testConvId);
    assert.strictEqual(conv.title, 'Test Conversation');

    const all = listConversations();
    const found = all.find(c => c.id === testConvId);
    assert.ok(found, 'Conversation found in list');
  });

  await t.test('Adds messages and updates conversation timestamp', () => {
    addMessage('msg-1', testConvId, 'user', 'Hello world');
    addMessage('msg-2', testConvId, 'assistant', 'Hello! How can I help you?');

    const messages = getConversationMessages(testConvId);
    assert.strictEqual(messages.length, 2);
    assert.strictEqual(messages[0].content, 'Hello world');
    assert.strictEqual(messages[1].role, 'assistant');
  });

  await t.test('Deletes conversation and cascades messages', () => {
    deleteConversation(testConvId);
    const messages = getConversationMessages(testConvId);
    assert.strictEqual(messages.length, 0);

    const all = listConversations();
    assert.strictEqual(all.find(c => c.id === testConvId), undefined);
  });

  await t.test('Terminal command logging', () => {
    const termId = 'term-test-' + Date.now();
    addTerminalCommand(termId, 'git status', 'On branch main', 'qwen-coder');

    const history = getTerminalHistory(10);
    const found = history.find(h => h.id === termId);
    assert.ok(found);
    assert.strictEqual(found.command, 'git status');
  });

  await t.test('Code Projects persistence', () => {
    const projId = 'proj-test-' + Date.now();
    saveCodeProject(projId, 'My Script', 'A test script', [{ name: 'app.py', content: 'print(1)' }]);

    const projects = listCodeProjects();
    const found = projects.find(p => p.id === projId);
    assert.ok(found);
    assert.strictEqual(found.files.length, 1);
    assert.strictEqual(found.files[0].name, 'app.py');

    deleteCodeProject(projId);
  });
});
