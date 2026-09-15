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
  `);

  // Migration: Ensure model_id exists in messages table for multi-model history tracking
  try {
    dbInstance.exec(`ALTER TABLE messages ADD COLUMN model_id TEXT;`);
  } catch (e) {
    // Column already present in existing databases
  }

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
  const stmt = db.prepare(`
    INSERT INTO conversations (id, title, model_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, title || 'New Conversation', modelId || null, now, now);
  return { id, title: title || 'New Conversation', model_id: modelId, created_at: now, updated_at: now };
}

export function getConversationMessages(conversationId) {
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
  
  const stmt = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, model_id, token_count, tokens_per_sec, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, conversationId, role, content, modelId || null, tokenCount, tokPerSec, now);

  // Update conversation updated_at and optionally model_id
  const updateStmt = db.prepare(`
    UPDATE conversations SET updated_at = ?, model_id = COALESCE(?, model_id) WHERE id = ?
  `);
  updateStmt.run(now, modelId || null, conversationId);

  return { id, conversation_id: conversationId, role, content, model_id: modelId, token_count: tokenCount, tokens_per_sec: tokPerSec, created_at: now };
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

export function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {}
    dbInstance = null;
  }
}
