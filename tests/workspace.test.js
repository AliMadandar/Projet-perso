import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openStore } from '../src/store.js';
import { workspace } from '../src/workspace.js';
import { portal } from '../src/portal.js';
import { amounts } from '../web/money.js';
const sample = () => ({
  id: randomUUID(),
  version: 0,
  title: 'Douche',
  site: 'Marseille',
  issued: '2026-01-01',
  valid: '2099-02-01',
  client: {
    name: 'Exemple'
  },
  discount: 500,
  deposit: 3000,
  terms: '',
  notes: '',
  lines: [{
    label: 'Carrelage',
    lot: 'Cuisine',
    unit: 'm²',
    tier: 0,
    quantity: 125,
    price: 4099,
    tax: 1000,
    serviceId: 's1'
  }]
});
test('montants décimaux, remise puis TVA groupée et acompte', () => {
  const d = sample(),
    r = amounts([...d.lines, {
      ...d.lines[0],
      price: 1000,
      quantity: 100,
      tax: 2000
    }], 500, 3000);
  assert.deepEqual([r.gross, r.discount, r.net, r.tax, r.total, r.deposit], [6124, 306, 5818, 677, 6495, 1949]);
});
test('conflit de saisie, émission figée, partage révocable et décision unique', () => {
  const store = openStore(':memory:'),
    w = workspace(store.db),
    p = portal(w);
  try {
    const d = w.save(sample(), 'Terrain');
    assert.equal(d.number, 'DEV-00001');
    assert.throws(() => w.save({
      ...d,
      version: 0
    }, 'Terrain'), /autre personne/);
    const approved = w.status(d.id, 'Validé', 1, 'Bureau');
    assert.throws(() => w.save(approved, 'Terrain'), /figé/);
    const sent = w.status(d.id, 'Envoyé', approved.version, 'Bureau');
    const key = p.create(d.id, 'Bureau').path.split('#')[1];
    assert.equal(p.view(key).document.version, sent.version);
    p.reply(key, {
      name: 'Client test',
      confirm: true,
      decision: 'Accepté',digest:p.view(key).digest,consent:p.view(key).consent
    });
    assert.equal(p.view(key).document.status, 'Accepté');
    assert.throws(() => p.reply(key, {
      name: 'Test',
      confirm: true,
      decision: 'Refusé'
    }));
    p.revoke(d.id, 'Bureau');
    assert.throws(() => p.view(key));
  } finally {
    store.close();
  }
});
test('reprise des anciens prix et devis', () => {
  const store = openStore(':memory:');
  try {
    store.update('pose', 5200, 4000);
    store.save('ancien', {
      area: 20,
      room: 'Cuisine',
      face: 'Sol',
      range: 'pose',
      removal: 'Non',
      level: 'Non',
      primer: 'Non'
    });
    const w = workspace(store.db);
    assert.equal(w.list('services')[0].prices[0], 5200);
    assert.equal(w.documents()[0].status, 'Archivé');
    assert.equal(amounts(w.documents()[0].lines).total, 104000);
    assert.equal(workspace(store.db).documents().length, 1);
  } finally {
    store.close();
  }
});
test('données incomplètes et reprise après refus', () => {
  const store = openStore(':memory:'),
    w = workspace(store.db);
  try {
    assert.throws(() => w.save({
      ...sample(),
      valid: '2026-02-30'
    }, 'Test'), /Date/);
    const d = w.save({
      ...sample(),
      lines: []
    }, 'Test');
    assert.throws(() => w.status(d.id, 'Validé', 1, 'Test'), /client/);
    const edited = w.save({
      ...d,
      lines: sample().lines
    }, 'Test');
    assert.equal(edited.version, 2);
  } finally {
    store.close();
  }
});
