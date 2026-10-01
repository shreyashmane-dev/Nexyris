import test from 'node:test';
import assert from 'node:assert';
import { 
  getUserProfile, 
  saveUserProfile, 
  listUserMemories, 
  addUserMemory, 
  updateUserMemory, 
  deleteUserMemory 
} from '../server/db.js';

test('User Profile & Memory Database Persistence Tests', async (t) => {
  await t.test('Retrieves default user profile or creates it', () => {
    const profile = getUserProfile();
    assert.ok(profile);
    assert.strictEqual(profile.id, 'primary');
    assert.ok(profile.name.length > 0);
  });

  await t.test('Updates user profile details in SQLite', () => {
    const updated = saveUserProfile({
      name: 'Alex Vance',
      title: 'Senior Quantum Engineer',
      bio: 'Researching local AI and neural systems.',
      avatar_emoji: '🪐',
      custom_instructions: 'Keep responses concise and mathematically rigorous.'
    });

    assert.strictEqual(updated.name, 'Alex Vance');
    assert.strictEqual(updated.title, 'Senior Quantum Engineer');
    assert.strictEqual(updated.avatar_emoji, '🪐');
    assert.strictEqual(updated.custom_instructions, 'Keep responses concise and mathematically rigorous.');

    // Verify retrieval from SQLite matches
    const reloaded = getUserProfile();
    assert.strictEqual(reloaded.name, 'Alex Vance');
    assert.strictEqual(reloaded.title, 'Senior Quantum Engineer');
  });

  await t.test('Adds, lists, updates and deletes user memories', () => {
    const mem1 = addUserMemory({
      category: 'preference',
      key: 'Coding Style',
      value: 'Prefers TypeScript strict mode with explicit return types'
    });

    assert.ok(mem1.id);
    assert.strictEqual(mem1.category, 'preference');
    assert.strictEqual(mem1.key, 'Coding Style');

    const mem2 = addUserMemory({
      category: 'project',
      key: 'Current Focus',
      value: 'Building autonomous agent tools on USB storage'
    });

    const list = listUserMemories();
    assert.ok(list.length >= 2);
    const found1 = list.find(m => m.id === mem1.id);
    assert.ok(found1);
    assert.strictEqual(found1.key, 'Coding Style');

    // Update memory
    const updatedMem = updateUserMemory(mem1.id, {
      value: 'Prefers TypeScript strict mode and Rust for native modules'
    });
    assert.strictEqual(updatedMem.value, 'Prefers TypeScript strict mode and Rust for native modules');

    // Delete memories
    deleteUserMemory(mem1.id);
    deleteUserMemory(mem2.id);

    const afterDelete = listUserMemories();
    assert.strictEqual(afterDelete.find(m => m.id === mem1.id), undefined);
    assert.strictEqual(afterDelete.find(m => m.id === mem2.id), undefined);
  });
});
