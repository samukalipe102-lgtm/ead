// Camada de acesso ao banco usando o SQLite embutido do Node 22 (node:sqlite).
// Sem dependências nativas externas -> empacotamento mais simples.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db;

export function getDb() {
  if (!db) {
    throw new Error('Banco não inicializado. Chame initDb() primeiro.');
  }
  return db;
}

export function initDb(dbPath) {
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  return db;
}

// Helpers de conveniência
export function all(sql, params = []) {
  return getDb().prepare(sql).all(...params);
}
export function get(sql, params = []) {
  return getDb().prepare(sql).get(...params);
}
export function run(sql, params = []) {
  return getDb().prepare(sql).run(...params);
}
export function tx(fn) {
  const d = getDb();
  d.exec('BEGIN');
  try {
    const r = fn();
    d.exec('COMMIT');
    return r;
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}
