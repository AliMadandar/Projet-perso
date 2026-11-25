import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { seed, quote } from './domain.js';
export function openStore(path) {
  mkdirSync(dirname(path), {
    recursive: true
  });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000');
  const atomic = fn => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };
  atomic(() => {
    db.exec('CREATE TABLE IF NOT EXISTS migrations(name TEXT PRIMARY KEY)');
    const folder = new URL('../migrations/', import.meta.url);
    for (const name of readdirSync(folder).filter(n => n.endsWith('.sql')).sort()) {
      if (db.prepare('SELECT name FROM migrations WHERE name=?').get(name)) continue;
      db.exec(readFileSync(new URL(name, folder), 'utf8'));
      if (name === '001-initial.sql') {
        const insert = db.prepare('INSERT INTO prices VALUES(?,?,?)');
        for (const [code, [label, cents]] of Object.entries(seed)) insert.run(code, label, cents);
      }
      db.prepare('INSERT INTO migrations VALUES(?)').run(name);
    }
  });
  const prices = () => Object.fromEntries(db.prepare('SELECT * FROM prices').all().map(row => [row.code, row]));
  return {
    db,
    prices,
    close: () => db.close(),
    update(code, cents, previous) {
      if (!Object.hasOwn(seed, code) || !Number.isSafeInteger(cents) || cents < 0 || cents > 10000000) throw Error('Prix invalide.');
      if (!db.prepare('UPDATE prices SET cents=? WHERE code=? AND cents=?').run(cents, code, previous).changes) throw Error('Tarif modifié ailleurs. Recharge la page.');
    },
    save(id, facts) {
      return atomic(() => {
        const old = db.prepare('SELECT facts,snapshot FROM quotes WHERE id=?').get(id);
        const canonical = JSON.stringify(facts, Object.keys(facts).sort());
        if (old) {
          if (old.facts !== canonical) throw Error('Ce brouillon existe déjà avec un autre contenu.');
          return JSON.parse(old.snapshot);
        }
        const snapshot = {
          id,
          created: new Date().toISOString(),
          facts,
          ...quote(facts, prices())
        };
        db.prepare('INSERT INTO quotes VALUES(?,?,?,?)').run(id, snapshot.created, canonical, JSON.stringify(snapshot));
        return snapshot;
      });
    },
    recent() {
      return db.prepare('SELECT snapshot FROM quotes ORDER BY created DESC LIMIT 50').all().map(row => JSON.parse(row.snapshot));
    }
  };
}
