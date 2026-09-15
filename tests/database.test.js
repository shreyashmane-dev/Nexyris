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
  deleteCodeProject,
  getDatabase
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

  await t.test('Multi-model message tagging & shared database persistence', () => {
    const multiConvId = 'multi-conv-' + Date.now();
    createConversation(multiConvId, 'Multi Model Chat', 'smollm2-135m');

    // Model 1 (SmolLM2) replies
    addMessage('m-1', multiConvId, 'user', 'What is 2+2?', 0, 0, 'smollm2-135m');
    addMessage('m-2', multiConvId, 'assistant', '2+2 is 4', 15, 60.5, 'smollm2-135m');

    // User switches to Model 2 (Mistral 7B) in the same conversation
    addMessage('m-3', multiConvId, 'user', 'Explain why.', 0, 0, 'mistral-7b');
    addMessage('m-4', multiConvId, 'assistant', 'Addition is combining discrete sets.', 25, 45.2, 'mistral-7b');

    const msgs = getConversationMessages(multiConvId);
    assert.strictEqual(msgs.length, 4);
    assert.strictEqual(msgs[1].model_id, 'smollm2-135m');
    assert.strictEqual(msgs[3].model_id, 'mistral-7b');
    assert.strictEqual(msgs[1].tokens_per_sec, 60.5);
    assert.strictEqual(msgs[3].tokens_per_sec, 45.2);

    deleteConversation(multiConvId);
  });

  await t.test('SQLite optimization PRAGMAs (WAL and memory temp_store)', () => {
    const db = getDatabase();
    const journal = db.prepare('PRAGMA journal_mode').get();
    const tempStore = db.prepare('PRAGMA temp_store').get();

    assert.strictEqual(journal.journal_mode.toLowerCase(), 'wal');
    assert.strictEqual(Number(tempStore.temp_store), 2); // 2 = MEMORY
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
