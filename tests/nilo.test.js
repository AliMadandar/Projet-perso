import test from 'node:test';
import assert from 'node:assert/strict';
import { planNilo } from '../src/nilo.js';

const documents = [
  {
    id: '7fc91614-3bc6-41b7-9046-58243c06c2bd',
    number: 'DEV-00002',
    title: 'Cuisine',
    status: 'Accepté',
    client: { name: 'Chloé Dufart', email: 'prive@example.test' }
  },
  {
    id: 'f6d42e3e-8caa-4aa3-af82-1a8276cbc38d',
    number: 'DEV-00001',
    title: 'Entrée',
    status: 'Accepté',
    client: { name: 'Chloé Dufart', email: 'prive@example.test' }
  },
  {
    id: '86c6fb1b-1b37-4fc0-ae2d-c3be9a792751',
    number: 'DEV-00003',
    title: 'Ossature',
    status: 'Brouillon',
    client: { name: 'Chloé Dufart' }
  },
  {
    id: '23b5dd0b-1db7-41b1-a694-aefc17d37700',
    number: 'DEV-00004',
    title: 'Peinture extérieure',
    status: 'Validé',
    client: { name: 'Anne-Marie Picard' }
  }
];
const context = { role: 'Administrateur', documents, key: 'clé-de-test', model: 'modèle-de-test' };

function mockGemini(t, getPlan) {
  return t.mock.method(globalThis, 'fetch', async () => Response.json({
    candidates: [{ content: { parts: [{
      text: JSON.stringify({ target: '', newQuote: false, kind: '', delivery: false, ...getPlan() })
    }] } }]
  }));
}

test('Nilo retrouve les deux devis admissibles malgré un prénom mal saisi', async t => {
  const mock = mockGemini(t, () => ({ action: 'billing', target: 'cchloe dufart', kind: 'Acompte', delivery: true }));
  const prompt = 'Envoie une facture d’acompte à la cliente « cchloe dufart ».';
  const { action, kind, delivery, candidates } = await planNilo({ prompt }, context);
  assert.deepEqual({ action, kind, delivery }, { action: 'billing', kind: 'Acompte', delivery: true });
  assert.deepEqual(candidates.map(record => record.number), ['DEV-00002', 'DEV-00001']);
  assert.deepEqual(Object.keys(candidates[0]), ['id', 'title', 'number', 'status', 'clientName']);
  const body = mock.mock.calls[0].arguments[1].body;
  assert.deepEqual(JSON.parse(body).contents, [{ role: 'user', parts: [{ text: prompt }] }]);
  assert.doesNotMatch(body, /prive@example\.test|7fc91614|Ossature/);
});

test('Nilo résout une référence exacte et refuse les actions hors du rôle', async t => {
  let output = { action: 'find', target: 'dev 00003' };
  mockGemini(t, () => output);
  const readOnly = { ...context, role: 'Lecture' };
  const response = await planNilo({ prompt: 'Ouvre le DEV-00003' }, readOnly);
  assert.equal(response.candidates[0].id, documents[2].id);

  output = { action: 'billing', target: 'dev 00003', delivery: true };
  assert.deepEqual(await planNilo({ prompt: 'Envoie la facture du DEV-00003' }, readOnly), { action: 'forbidden' });
  const notAccepted = await planNilo({ prompt: 'Prépare la facture du DEV-00003' }, context);
  assert.deepEqual(notAccepted.candidates, []);
  assert.match(notAccepted.hint, /devis accepté/);

  output = { action: 'quoteMail', target: 'Anne Marie Picard' };
  const request = { prompt: 'Envoie le devis à Anne-Marie Picard' };
  assert.deepEqual(await planNilo(request, { ...context, role: 'Bureau' }), { action: 'forbidden' });
  assert.equal((await planNilo(request, context)).candidates[0].id, documents[3].id);
});

test('Nilo distingue une cible inconnue du brouillon courant et d’un nouveau devis', async t => {
  let output = { action: 'quote', target: 'Nom inventé' };
  mockGemini(t, () => output);
  const currentQuoteId = documents[2].id;
  const forged = await planNilo({ prompt: 'Complète le devis de Marie', currentQuoteId }, context);
  assert.deepEqual(forged.candidates, []);
  assert.match(forged.hint, /nom du client/);
  output = { action: 'quote', target: 'Amélie' };
  const missing = await planNilo({ prompt: 'Complète le devis d’Amélie', currentQuoteId }, context);
  assert.deepEqual(missing.candidates, []);
  assert.match(missing.hint, /Aucun devis trouvé/);

  output = { action: 'quote', target: 'Marie', newQuote: true };
  assert.deepEqual(await planNilo({ prompt: 'Nouveau devis pour Marie', currentQuoteId }, context),
    { action: 'quote', newQuote: true });

  output = { action: 'quote' };
  assert.deepEqual(await planNilo({ prompt: 'Chiffre 12 m² de carrelage en cuisine' }, context),
    { action: 'quote', newQuote: true });

  output = { action: 'rewrite' };
  const unsaved = 'dc10bc94-629c-4d2b-a6bf-c052c6006074';
  assert.deepEqual(await planNilo({ prompt: 'Reformule ce devis', currentQuoteId: unsaved }, context),
    { action: 'rewrite', current: true });
});

test('Nilo demande de préciser la recherche quand trop de dossiers correspondent', async t => {
  mockGemini(t, () => ({ action: 'find', target: 'Dufart' }));
  const sameClient = Array.from({ length: 9 }, (_, index) => ({
    ...documents[0], number: 'DEV-000' + index
  }));
  const result = await planNilo({ prompt: 'Retrouver un dossier Dufart' }, { ...context, documents: sameClient });
  assert.deepEqual(result.candidates, []);
  assert.match(result.hint, /Précisez le chantier/);
});
