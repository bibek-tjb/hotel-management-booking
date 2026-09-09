import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Local delivery and tests use the same SQL as the hosted D1 database.
export function openDatabase(filename, migrations) {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (filename !== ':memory:') sqlite.exec('PRAGMA journal_mode = WAL;');
  sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY, hash TEXT NOT NULL)');
  for (const name of readdirSync(migrations).filter(n => n.endsWith('.sql')).sort()) {
    const sql = readFileSync(path.join(migrations, name), 'utf8');
    const hash = createHash('sha256').update(sql).digest('hex');
    const applied = sqlite.prepare('SELECT hash FROM local_migrations WHERE name = ?').get(name);
    if (applied) {
      if (applied.hash !== hash) throw new Error('An applied database migration has changed: ' + name);
      continue;
    }
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      sqlite.exec(sql);
      sqlite.prepare('INSERT INTO local_migrations (name, hash) VALUES (?, ?)').run(name, hash);
      sqlite.exec('COMMIT');
    } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  }
  const DB = { prepare(sql) {
    function statement(values = []) {
      return {
        bind(...bound) { return statement(bound); },
        async first() { return sqlite.prepare(sql).get(...values) || null; },
        async all() { return { results: sqlite.prepare(sql).all(...values), success: true }; },
        async run() { const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; }
      };
    }
    return statement();
  } };
  return { DB, sqlite, close: () => sqlite.close() };
}
