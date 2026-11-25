import test from 'node:test';
import assert from 'node:assert/strict';
import { projectBrief } from '../src/gemini.js';
import { rewriteText } from '../src/rewrite.js';
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

test('la rédaction Gemini conserve le texte et la consigne et ignore les parties de réflexion', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({
    candidates: [{ finishReason: 'STOP', content: {
      parts: [{ thought: true, text: 'Réflexion' }, { text: 'Pose de 12 m².' }]
    } }]
  }));
  const result = await rewriteText('Poser 12 m²', 'Professionnel', 'cle-test', 'gemini-test', 'Garder la surface');
  assert.deepEqual(result, { text: 'Pose de 12 m².' });
  const [url, request] = mock.mock.calls[0].arguments;
  assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
  assert.equal(request.headers['x-goog-api-key'], 'cle-test');
  assert.deepEqual(JSON.parse(JSON.parse(request.body).contents[0].parts[0].text),
    { texte: 'Poser 12 m²', consigne: 'Garder la surface' });
});

test('les erreurs de Gemini sont exploitables sans transmettre le détail de Google', async t => {
  let respond;
  const mock = t.mock.method(globalThis, 'fetch', () => respond());
  const ask = (key = 'cle-test') => rewriteText('Pose', 'Professionnel', key, 'gemini-test');
  await assert.rejects(() => ask(''), { status: 503, message: /GEMINI_API_KEY/ });
  assert.equal(mock.mock.callCount(), 0);

  for (const [http, details, status, message] of [
    [400, [{ reason: 'API_KEY_INVALID' }], 502, /Accès refusé/],
    [404, [], 502, /GEMINI_MODEL/],
    [429, [], 429, /Quota/],
    [503, [], 503, /temporairement indisponible/]
  ]) {
    respond = async () => Response.json({ error: { message: 'cle-test', details } }, { status: http });
    await assert.rejects(ask, error =>
      error.status === status && message.test(error.message) && !error.message.includes('cle-test'));
  }

  respond = async () => { throw new DOMException('Délai', 'TimeoutError'); };
  await assert.rejects(ask, { status: 504, message: /trop de temps/ });
  respond = async () => Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: {
    parts: [{ text: 'Texte tronqué' }]
  } }] });
  await assert.rejects(ask, { status: 502, message: /réponse incomplète/ });
});
