import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { PATHS } from './dynamic-root.js';

let dbInstance = null;

export function getDatabase() {
  if (dbInstance) return dbInstance;

  const dbPath = path.join(PATHS.database, 'nexyris.db');
  dbInstance = new DatabaseSync(dbPath);

  // Performance & storage isolation PRAGMAs (Zero host C: disk churn, fast WAL mode on USB)
  dbInstance.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA temp_store = MEMORY;
    PRAGMA foreign_keys = ON;
    PRAGMA cache_size = -64000;
  `);

  // Initialize schema
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      model_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model_id TEXT,
      token_count INTEGER DEFAULT 0,
      tokens_per_sec REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS terminal_sessions (
      id TEXT PRIMARY KEY,
      command TEXT NOT NULL,
      output TEXT NOT NULL,
      model_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS code_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      files_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'stdio',
      command TEXT,
      args TEXT,
      url TEXT,
      env_json TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY DEFAULT 'primary',
      name TEXT NOT NULL DEFAULT 'Explorer',
      title TEXT DEFAULT 'Software Engineer',
      bio TEXT DEFAULT 'Building intelligent software with local offline AI.',
      avatar_emoji TEXT DEFAULT '⚡',
      custom_instructions TEXT DEFAULT '',
      preferred_model TEXT,
      theme TEXT DEFAULT 'crimson-dark',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_memories (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'preference',
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'world',
      enabled INTEGER DEFAULT 1,
      config_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Migration: Ensure model_id exists in messages table for multi-model history tracking
  try {
    dbInstance.exec(`ALTER TABLE messages ADD COLUMN model_id TEXT;`);
  } catch (e) {
    // Column already present in existing databases
  }

  // Ensure default primary user profile exists
  try {
    const existingUser = dbInstance.prepare(`SELECT id FROM user_profiles WHERE id = 'primary'`).get();
    if (!existingUser) {
      const now = new Date().toISOString();
      dbInstance.prepare(`
        INSERT INTO user_profiles (id, name, title, bio, avatar_emoji, custom_instructions, preferred_model, theme, created_at, updated_at)
        VALUES ('primary', 'Explorer', 'AI Engineer', 'Building intelligent tools with private local models on portable storage.', '⚡', 'Provide clean, modular code with concise explanations.', null, 'crimson-dark', ?, ?)
      `).run(now, now);
    }
  } catch (e) {}

  return dbInstance;
}

// Conversation helpers
export function listConversations() {
  const db = getDatabase();
  const query = db.prepare(`
    SELECT c.*, 
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
    FROM conversations c
    ORDER BY c.updated_at DESC
  `);
  return query.all();
}

export function createConversation(id, title, modelId) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const safeId = id || ('conv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
  const stmt = db.prepare(`
    INSERT INTO conversations (id, title, model_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, title = COALESCE(excluded.title, conversations.title)
  `);
  stmt.run(safeId, title || 'New Conversation', modelId || null, now, now);
  return { id: safeId, title: title || 'New Conversation', model_id: modelId, created_at: now, updated_at: now };
}

export function getConversationMessages(conversationId) {
  if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
    return [];
  }
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM messages 
    WHERE conversation_id = ? 
    ORDER BY created_at ASC
  `);
  return stmt.all(conversationId);
}

export function addMessage(id, conversationId, role, content, tokenCount = 0, tokPerSec = 0, modelId = null) {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  // Ensure conversation exists before inserting message to prevent foreign key violation
  let targetConvId = conversationId;
  if (!targetConvId || targetConvId === 'undefined' || targetConvId === 'null') {
    targetConvId = 'conv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  }
  
  const convCheck = db.prepare(`SELECT id FROM conversations WHERE id = ?`).get(targetConvId);
  if (!convCheck) {
    createConversation(targetConvId, 'New Chat', modelId);
  }

  const safeMsgId = id || ('msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));

  const stmt = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, model_id, token_count, tokens_per_sec, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET content = excluded.content, token_count = excluded.token_count
  `);
  stmt.run(safeMsgId, targetConvId, role, content, modelId || null, tokenCount, tokPerSec, now);

  // Update conversation updated_at and optionally model_id
  const updateStmt = db.prepare(`
    UPDATE conversations SET updated_at = ?, model_id = COALESCE(?, model_id) WHERE id = ?
  `);
  updateStmt.run(now, modelId || null, targetConvId);

  return { id: safeMsgId, conversation_id: targetConvId, role, content, model_id: modelId, token_count: tokenCount, tokens_per_sec: tokPerSec, created_at: now };
}

export function updateConversationTitle(id, title) {
  const db = getDatabase();
  const stmt = db.prepare(`UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?`);
  stmt.run(title, new Date().toISOString(), id);
}

export function deleteConversation(id) {
  const db = getDatabase();
  db.prepare(`DELETE FROM messages WHERE conversation_id = ?`).run(id);
  db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id);
}

// Terminal session helpers
export function addTerminalCommand(id, command, output, modelId) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO terminal_sessions (id, command, output, model_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, command, output, modelId || null, now);
  return { id, command, output, model_id: modelId, created_at: now };
}

export function getTerminalHistory(limit = 50) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM terminal_sessions ORDER BY created_at DESC LIMIT ?
  `);
  return stmt.all(limit).reverse();
}

// Code Projects helpers
export function listCodeProjects() {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM code_projects ORDER BY updated_at DESC`);
  return stmt.all().map(p => ({
    ...p,
    files: JSON.parse(p.files_json || '[]')
  }));
}

export function saveCodeProject(id, name, description, files) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const existing = db.prepare(`SELECT id FROM code_projects WHERE id = ?`).get(id);

  if (existing) {
    db.prepare(`
      UPDATE code_projects SET name = ?, description = ?, files_json = ?, updated_at = ?
      WHERE id = ?
    `).run(name, description, JSON.stringify(files), now, id);
  } else {
    db.prepare(`
      INSERT INTO code_projects (id, name, description, files_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, description, JSON.stringify(files), now, now);
  }
  return { id, name, description, files, updated_at: now };
}

export function deleteCodeProject(id) {
  const db = getDatabase();
  db.prepare(`DELETE FROM code_projects WHERE id = ?`).run(id);
}

// MCP Servers Helpers
export function listMcpServers() {
  const db = getDatabase();
  const rows = db.prepare(`SELECT * FROM mcp_servers ORDER BY created_at DESC`).all();
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    command: r.command,
    args: r.args ? JSON.parse(r.args) : [],
    url: r.url,
    env: r.env_json ? JSON.parse(r.env_json) : {},
    enabled: Boolean(r.enabled),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export function saveMcpServer(server) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = server.id || ('mcp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
  const existing = db.prepare(`SELECT id FROM mcp_servers WHERE id = ?`).get(id);

  const argsJson = Array.isArray(server.args) ? JSON.stringify(server.args) : (typeof server.args === 'string' ? server.args : '[]');
  const envJson = server.env ? JSON.stringify(server.env) : '{}';
  const enabled = server.enabled !== false ? 1 : 0;

  if (existing) {
    db.prepare(`
      UPDATE mcp_servers SET name = ?, type = ?, command = ?, args = ?, url = ?, env_json = ?, enabled = ?, updated_at = ?
      WHERE id = ?
    `).run(server.name, server.type || 'stdio', server.command || '', argsJson, server.url || '', envJson, enabled, now, id);
  } else {
    db.prepare(`
      INSERT INTO mcp_servers (id, name, type, command, args, url, env_json, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, server.name, server.type || 'stdio', server.command || '', argsJson, server.url || '', envJson, enabled, now, now);
  }

  return { ...server, id, updated_at: now };
}

export function deleteMcpServer(id) {
  const db = getDatabase();
  db.prepare(`DELETE FROM mcp_servers WHERE id = ?`).run(id);
}

// User Profile helpers
export function getUserProfile() {
  const db = getDatabase();
  let profile = db.prepare(`SELECT * FROM user_profiles WHERE id = 'primary'`).get();
  if (!profile) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO user_profiles (id, name, title, bio, avatar_emoji, custom_instructions, preferred_model, theme, created_at, updated_at)
      VALUES ('primary', 'Explorer', 'AI Engineer', 'Building intelligent tools with private local models on portable storage.', '⚡', '', null, 'crimson-dark', ?, ?)
    `).run(now, now);
    profile = db.prepare(`SELECT * FROM user_profiles WHERE id = 'primary'`).get();
  }
  return profile;
}

export function saveUserProfile(updates = {}) {
  const db = getDatabase();
  const current = getUserProfile();
  const now = new Date().toISOString();

  const name = updates.name !== undefined ? updates.name : current.name;
  const title = updates.title !== undefined ? updates.title : current.title;
  const bio = updates.bio !== undefined ? updates.bio : current.bio;
  const avatar_emoji = updates.avatar_emoji !== undefined ? updates.avatar_emoji : current.avatar_emoji;
  const custom_instructions = updates.custom_instructions !== undefined ? updates.custom_instructions : current.custom_instructions;
  const preferred_model = updates.preferred_model !== undefined ? updates.preferred_model : current.preferred_model;
  const theme = updates.theme !== undefined ? updates.theme : current.theme;

  db.prepare(`
    UPDATE user_profiles 
    SET name = ?, title = ?, bio = ?, avatar_emoji = ?, custom_instructions = ?, preferred_model = ?, theme = ?, updated_at = ?
    WHERE id = 'primary'
  `).run(name, title, bio, avatar_emoji, custom_instructions, preferred_model, theme, now);

  return getUserProfile();
}

// User Memories helpers
export function listUserMemories() {
  const db = getDatabase();
  return db.prepare(`SELECT * FROM user_memories ORDER BY updated_at DESC`).all();
}

export function addUserMemory(memory) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = memory.id || ('mem-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
  const category = memory.category || 'preference';
  const key = memory.key || 'Fact';
  const value = memory.value || '';

  db.prepare(`
    INSERT INTO user_memories (id, category, key, value, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, category, key, value, now, now);

  return { id, category, key, value, created_at: now, updated_at: now };
}

export function updateUserMemory(id, memory) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const existing = db.prepare(`SELECT * FROM user_memories WHERE id = ?`).get(id);
  if (!existing) throw new Error('Memory not found');

  const category = memory.category !== undefined ? memory.category : existing.category;
  const key = memory.key !== undefined ? memory.key : existing.key;
  const value = memory.value !== undefined ? memory.value : existing.value;

  db.prepare(`
    UPDATE user_memories SET category = ?, key = ?, value = ?, updated_at = ? WHERE id = ?
  `).run(category, key, value, now, id);

  return { id, category, key, value, created_at: existing.created_at, updated_at: now };
}

export function deleteUserMemory(id) {
  const db = getDatabase();
  db.prepare(`DELETE FROM user_memories WHERE id = ?`).run(id);
  return { success: true, id };
}

// Plugin database helpers
export function listPluginsDb() {
  const db = getDatabase();
  return db.prepare(`SELECT * FROM plugins ORDER BY created_at ASC`).all();
}

export function savePluginDb(plugin) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = plugin.id;
  const existing = db.prepare(`SELECT id FROM plugins WHERE id = ?`).get(id);
  const configJson = typeof plugin.config === 'object' ? JSON.stringify(plugin.config) : (plugin.config_json || '{}');
  const enabled = plugin.enabled ? 1 : 0;

  if (existing) {
    db.prepare(`
      UPDATE plugins SET name = ?, description = ?, type = ?, enabled = ?, config_json = ?, updated_at = ?
      WHERE id = ?
    `).run(plugin.name, plugin.description || '', plugin.type || 'world', enabled, configJson, now, id);
  } else {
    db.prepare(`
      INSERT INTO plugins (id, name, description, type, enabled, config_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, plugin.name, plugin.description || '', plugin.type || 'world', enabled, configJson, now, now);
  }
  return { ...plugin, updated_at: now };
}

export function togglePluginDb(id, enabled) {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`UPDATE plugins SET enabled = ?, updated_at = ? WHERE id = ?`).run(enabled ? 1 : 0, now, id);
  return { id, enabled: Boolean(enabled) };
}

export function deletePluginDb(id) {
  const db = getDatabase();
  db.prepare(`DELETE FROM plugins WHERE id = ?`).run(id);
  return { success: true, id };
}

export function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {}
    dbInstance = null;
  }
}

