import { DatabaseSync, backup } from 'node:sqlite';
import { access, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const source = resolve(process.env.DB_PATH || 'data/atelier.sqlite');
await access(source);
const target = resolve(process.argv[2] || 'backups/atelier-' + new Date().toISOString().replaceAll(':', '-') + '.sqlite');
await mkdir(dirname(target), {
  recursive: true
});
const {
  open
} = await import('node:fs/promises');
const empty = await open(target, 'wx', 0o600);
await empty.close();
const db = new DatabaseSync(source, {
  readOnly: true
});
try {
  await backup(db, target);
  const check = new DatabaseSync(target, {
    readOnly: true
  });
  try {
    if (check.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw Error('Copie invalide.');
  } finally {
    check.close();
  }
  console.log('Sauvegarde vérifiée : ' + target);
} finally {
  db.close();
}
