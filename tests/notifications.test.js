import test from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../src/store.js';
import { workspace } from '../src/workspace.js';
import { notifications } from '../src/notifications.js';
test('file de notifications persistante, reprise après échec, contenu minimal', async () => {
  const store = openStore(':memory:'),
    w = workspace(store.db);
  let calls = 0;
  const n = notifications(w, {
    NTFY_URL: 'https://exemple.invalid/prive'
  }, async (_url, request) => {
    assert.equal(request.body, 'Devis créé');
    return {
      ok: ++calls > 1
    };
  });
  try {
    w.event('Utilisateur', 'Devis créé', 'essai');
    await n.tick();
    assert.equal(w.get('SELECT attempts FROM delivery_queue').attempts, 1);
    w.run('UPDATE delivery_queue SET retry_after=0');
    await n.tick();
    assert.equal(w.get('SELECT COUNT(*) AS n FROM delivery_queue').n, 0);
  } finally {
    n.stop();
    store.close();
  }
});
