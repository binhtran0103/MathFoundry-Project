import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

// Opens the SQLite database and initializes its schema.
function openDatabase(path) {
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

const libraryLimit = 5

// Opens the database and prepares operations for accounts, sessions, and saved work.
export function openWorkspaceStore(path) {
  const db = openDatabase(path)
  const getUser = db.prepare(`
    SELECT users.id, users.name, users.email FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE token_hash = ? AND expires_at > ?
  `)
  const getCredentials = db.prepare('SELECT * FROM users WHERE email = ?')
  const insertUser = db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING')
  const insertSession = db.prepare('INSERT INTO sessions VALUES (?, ?, ?)')
  const deleteSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?')
  const deleteExpired = db.prepare('DELETE FROM sessions WHERE expires_at <= ?')
  const listItems = db.prepare('SELECT payload FROM library_items WHERE user_id = ? AND in_library = 1 ORDER BY created_at DESC, rowid DESC')
  const listPublic = db.prepare('SELECT user_id, item_id, payload FROM library_items WHERE published = 1 ORDER BY created_at DESC, rowid DESC')
  const insertItem = db.prepare(`
    INSERT INTO library_items (user_id, item_id, payload, published, created_at)
    SELECT :userId, :itemId, :payload, :published, :createdAt
    WHERE EXISTS (SELECT 1 FROM library_items WHERE user_id = :userId AND item_id = :itemId)
       OR (SELECT COUNT(*) FROM library_items
           WHERE user_id = :userId AND json_extract(payload, '$.kind') = :kind) < :limit
    ON CONFLICT(user_id, item_id) DO UPDATE SET in_library = 1
  `)
  const removeItem = db.prepare('DELETE FROM library_items WHERE user_id = ? AND item_id = ? AND published = 0')
  const hideItem = db.prepare('UPDATE library_items SET in_library = 0 WHERE user_id = ? AND item_id = ? AND published = 1')

  return {
    // Finds the profile for a current session.
    getUser: (tokenHash, now) => getUser.get(tokenHash, now),
    // Looks up the stored credentials for an email address.
    getCredentials: email => getCredentials.get(email),
    // Creates a session and, for registration, inserts the account in the same transaction.
    startSession(profile, credentials, tokenHash, previousTokenHash, now, expiresAt) {
      db.exec('BEGIN IMMEDIATE')
      let started
      try {
        started = !credentials || Boolean(insertUser.run(
          profile.id, profile.name, profile.email, credentials.salt, credentials.passwordHash,
        ).changes)
        if (started) {
          deleteExpired.run(now)
          if (previousTokenHash) deleteSession.run(previousTokenHash)
          insertSession.run(tokenHash, profile.id, expiresAt)
          db.exec('COMMIT')
        } else {
          db.exec('ROLLBACK')
        }
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
      return started
    },
    // Ends the session for the supplied token hash.
    deleteSession: tokenHash => deleteSession.run(tokenHash),
    // Loads the user's visible library items.
    listSaved: userId => listItems.all(userId).map(row => JSON.parse(row.payload)),
    // Loads public catalog items with IDs scoped to their owners.
    listPublished: () => listPublic.all().map(row => ({ ...JSON.parse(row.payload), id: `${row.user_id}/${row.item_id}` })),
    // Saves or restores an item, counting new items against the limit for their kind.
    saveItem(userId, item, publish, now) {
      return insertItem.run({
        userId,
        itemId: item.id,
        payload: JSON.stringify({ ...item, name: item.title, popularity: 0 }),
        published: Number(publish),
        createdAt: now,
        kind: item.kind,
        limit: libraryLimit,
      }).changes > 0
    },
    // Removes private work or hides a published item from the user's library.
    removeItem(userId, itemId) {
      if (!removeItem.run(userId, itemId).changes) hideItem.run(userId, itemId)
    },
    // Closes the workspace database.
    close: () => db.close(),
  }
}
