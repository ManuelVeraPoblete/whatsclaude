import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "messages.db");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  mode TEXT CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI',
  last_message_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  role TEXT CHECK(role IN ('user','assistant','human')) NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_messages_conv
  ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS connection_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT CHECK(status IN ('disconnected','qr','connecting','connected'))
    NOT NULL DEFAULT 'disconnected',
  qr_string TEXT,
  phone TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO connection_state (id, status) VALUES (1, 'disconnected');

CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  phone TEXT NOT NULL,
  content TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending
  ON outbox(sent, created_at);
`);

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
  created_at: number;
}

export interface ConversationWithPreview extends Conversation {
  last_message_preview: string | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "human";
  content: string;
  created_at: number;
}

export interface ConnectionState {
  id: 1;
  status: "disconnected" | "qr" | "connecting" | "connected";
  qr_string: string | null;
  phone: string | null;
  updated_at: number;
}

export interface OutboxItem {
  id: number;
  conversation_id: number;
  phone: string;
  content: string;
  sent: number;
  created_at: number;
}

// ── Conversaciones ────────────────────────────────────────────────────────────

const stmtGetConvByPhone = db.prepare<[string], Conversation>(
  "SELECT * FROM conversations WHERE phone = ?"
);
const stmtInsertConv = db.prepare<[string, string | null]>(
  "INSERT OR IGNORE INTO conversations (phone, name) VALUES (?, ?)"
);
const stmtUpdateName = db.prepare<[string | null, string]>(
  "UPDATE conversations SET name = ? WHERE phone = ?"
);

export function getOrCreateConversation(
  phone: string,
  name?: string | null
): Conversation {
  const existing = stmtGetConvByPhone.get(phone);
  if (existing) {
    if (name && name !== existing.name) {
      stmtUpdateName.run(name, phone);
      return { ...existing, name };
    }
    return existing;
  }
  stmtInsertConv.run(phone, name ?? null);
  return stmtGetConvByPhone.get(phone)!;
}

const stmtGetConvById = db.prepare<[number], Conversation>(
  "SELECT * FROM conversations WHERE id = ?"
);

export function getConversationById(id: number): Conversation | null {
  return stmtGetConvById.get(id) ?? null;
}

const stmtListConversations = db.prepare<[], ConversationWithPreview>(`
  SELECT
    c.*,
    (
      SELECT m.content FROM messages m
      WHERE m.conversation_id = c.id
      ORDER BY m.created_at DESC
      LIMIT 1
    ) AS last_message_preview
  FROM conversations c
  ORDER BY c.last_message_at DESC NULLS LAST
`);

export function listConversations(): ConversationWithPreview[] {
  return stmtListConversations.all();
}

const stmtSetMode = db.prepare<[string, number]>(
  "UPDATE conversations SET mode = ? WHERE id = ?"
);

export function setMode(conversationId: number, mode: "AI" | "HUMAN"): void {
  stmtSetMode.run(mode, conversationId);
}

// ── Mensajes ──────────────────────────────────────────────────────────────────

const stmtInsertMessage = db.prepare<[number, string, string]>(
  "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)"
);
const stmtUpdateLastMessage = db.prepare<[number]>(
  "UPDATE conversations SET last_message_at = unixepoch() WHERE id = ?"
);

const txInsertMessage = db.transaction(
  (conversationId: number, role: string, content: string) => {
    stmtInsertMessage.run(conversationId, role, content);
    stmtUpdateLastMessage.run(conversationId);
  }
);

export function insertMessage(
  conversationId: number,
  role: "user" | "assistant" | "human",
  content: string
): void {
  txInsertMessage(conversationId, role, content);
}

const stmtGetMessages = db.prepare<[number, number], Message>(`
  SELECT * FROM messages
  WHERE conversation_id = ?
  ORDER BY created_at ASC
  LIMIT ?
`);

export function getMessages(
  conversationId: number,
  limit = 50
): Message[] {
  return stmtGetMessages.all(conversationId, limit);
}

const stmtGetRecentHistory = db.prepare<[number, number], Message>(`
  SELECT * FROM (
    SELECT * FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  ) ORDER BY created_at ASC
`);

export function getRecentHistory(
  conversationId: number,
  limit = 20
): Message[] {
  return stmtGetRecentHistory.all(conversationId, limit);
}

// ── Estado de conexión ────────────────────────────────────────────────────────

const stmtGetConnectionState = db.prepare<[], ConnectionState>(
  "SELECT * FROM connection_state WHERE id = 1"
);

export function getConnectionState(): ConnectionState {
  return stmtGetConnectionState.get()!;
}

export function setConnectionState(patch: {
  status: "disconnected" | "qr" | "connecting" | "connected";
  qr_string?: string | null;
  phone?: string | null;
}): void {
  const current = getConnectionState();

  const qr_string =
    "qr_string" in patch ? patch.qr_string : current.qr_string;
  const phone =
    "phone" in patch ? patch.phone : current.phone;

  db.prepare<[string, string | null, string | null]>(`
    UPDATE connection_state
    SET status = ?, qr_string = ?, phone = ?, updated_at = unixepoch()
    WHERE id = 1
  `).run(patch.status, qr_string ?? null, phone ?? null);
}

// ── Outbox ────────────────────────────────────────────────────────────────────

const stmtEnqueueOutbox = db.prepare<[number, string, string]>(
  "INSERT INTO outbox (conversation_id, phone, content) VALUES (?, ?, ?)"
);

export function enqueueOutbox(
  conversationId: number,
  phone: string,
  content: string
): void {
  stmtEnqueueOutbox.run(conversationId, phone, content);
}

const stmtGetPendingOutbox = db.prepare<[number], OutboxItem>(
  "SELECT * FROM outbox WHERE sent = 0 ORDER BY created_at ASC LIMIT ?"
);

export function getPendingOutbox(limit = 20): OutboxItem[] {
  return stmtGetPendingOutbox.all(limit);
}

const stmtMarkOutboxSent = db.prepare<[number]>(
  "UPDATE outbox SET sent = 1 WHERE id = ?"
);

export function markOutboxSent(id: number): void {
  stmtMarkOutboxSent.run(id);
}

// ── Borrar conversación ───────────────────────────────────────────────────────

const txDeleteConversation = db.transaction((id: number) => {
  db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);
  db.prepare(
    "DELETE FROM outbox WHERE conversation_id = ? AND sent = 0"
  ).run(id);
  db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
});

export function deleteConversation(id: number): void {
  txDeleteConversation(id);
}

export default db;
