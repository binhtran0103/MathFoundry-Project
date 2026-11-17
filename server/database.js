import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

// Opens the SQLite database and initializes its schema.
export function openDatabase(path) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
  db.exec('BEGIN IMMEDIATE')
  try {
    const { user_version: version } = db.prepare('PRAGMA user_version').get()
    if (version > 1) throw new Error('This MathFoundry database requires a newer app version.')
    if (version === 0) db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        salt TEXT NOT NULL,
        password_hash TEXT NOT NULL
      ) STRICT;
      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
      ) STRICT;
      CREATE INDEX sessions_expiration ON sessions(expires_at);
      CREATE TABLE library_items (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL,
        payload TEXT NOT NULL CHECK (json_valid(payload)),
        in_library INTEGER NOT NULL DEFAULT 1 CHECK (in_library IN (0, 1)),
        published INTEGER NOT NULL CHECK (published IN (0, 1)),
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, item_id)
      ) STRICT;
      CREATE INDEX catalog_items ON library_items(created_at DESC) WHERE published = 1;
      PRAGMA user_version = 1;
    `)
    db.exec('COMMIT')
    return db
  } catch (error) {
    db.exec('ROLLBACK')
    db.close()
    throw error
  }
}
