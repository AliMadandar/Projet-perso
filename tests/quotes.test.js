import test from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../src/store.js';
const sample = {
  area: 30,
  room: 'Cuisine',
  face: 'Sol',
  range: 'pose',
  removal: 'Non',
  level: 'Non',
  primer: 'Non'
};
test('historique figé, répétition idempotente et nouveau tarif', () => {
  const store = openStore(':memory:');
  try {
    const first = store.save('a', sample);
    assert.equal(first.total, 120000);
    store.update('pose', 5000, 4000);
    assert.deepEqual(store.save('a', sample), first);
    assert.equal(store.save('b', sample).total, 150000);
    assert.equal(store.recent().find(q => q.id === 'a').total, 120000);
    assert.throws(() => store.save('a', {
      ...sample,
      area: 40
    }));
    assert.throws(() => store.update('pose', 6000, 4000));
  } finally {
    store.close();
  }
});
test('questions conditionnelles, gamme et surface décimale', () => {
  const store = openStore(':memory:');
  try {
    const wall = {
      ...sample,
      room: 'Douche',
      face: 'Mur',
      area: 1.25,
      range: 'eco',
      level: 'Oui'
    };
    assert.throws(() => store.save('a', wall), /étanchéité/);
    assert.equal(store.save('a', {
      ...wall,
      sealing: 'Oui'
    }).total, 11250);
    for (const area of [0, -1, 0.001, '30', NaN]) assert.throws(() => store.save('b', {
      ...sample,
      area
    }));
    assert.throws(() => store.save('b', {
      ...sample,
      range: 'inconnu'
    }));
  } finally {
    store.close();
  }
});
