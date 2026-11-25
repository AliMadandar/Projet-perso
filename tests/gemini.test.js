import test from 'node:test';
import assert from 'node:assert/strict';
import { projectBrief } from '../src/gemini.js';
import { catalog } from '../src/catalog.js';
test('la proposition IA utilise exclusivement les références et tarifs du catalogue', async t => {
  let result = {
    questions: ['Qui fournit la peinture ?'],
    lines: [{
      serviceId: 's1',
      price: 1,
      quantity: 2.55,
      tier: 1,
      lot: 'Cuisine'
    }]
  };
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify(result)
          }]
        }
      }]
    })
  }));
  const request = () => projectBrief({
    description: 'Pose',
    history: []
  }, catalog, 'cle-de-test', 'modele-de-test');
  const p = await request();
  assert.equal(p.lines[0].price, 6500);
  assert.equal(p.lines[0].quantity, 255);
  result.lines[0].serviceId = 'inconnu';
  await assert.rejects(request, /illisible/);
});
