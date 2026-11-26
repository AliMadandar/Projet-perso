import test from 'node:test';
import assert from 'node:assert/strict';
import { checkNiloGemini, planNilo } from '../src/nilo.js';

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
  return t.mock.method(globalThis, 'fetch', async (_url, { body }) => {
    if (Object.hasOwn(JSON.parse(body).generationConfig, 'responseSchema')) {
      return Response.json({ error: { status: 'INVALID_ARGUMENT' } }, { status: 400 });
    }
    return Response.json({
      candidates: [{ content: { parts: [{
        text: JSON.stringify({ target: '', newQuote: false, kind: '', delivery: false, question: '', ...getPlan() })
      }] } }]
    });
  });
}

const sentRequest = (mock, index = 0) => JSON.parse(mock.mock.calls[index].arguments[1].body);

const tilingRequest = "prepare un devis pour ali, il veut poser 30 m2 dez carrelage dans sa salle de bain, et je dépose l'ancien carrelage et j'applique un primaire";

test('Nilo lance le chiffrage local du carrelage malgré une réponse 503 de Gemini', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({
    error: { status: 'UNAVAILABLE' }
  }, { status: 503 }));
  const customers = [{ id: '72ce81dd-2462-490b-b30a-2d1515608687', name: 'Ali', email: 'ali@example.test' }];
  const options = { ...context, model: 'gemini-3.8-flash', customers };
  const plan = await planNilo({ prompt: tilingRequest }, options);
  assert.equal(plan.action, 'quote');
  assert.equal(plan.newQuote, true);
  assert.equal(plan.local, true);
  assert.equal(plan.recipe.customerId, customers[0].id);
  assert.deepEqual(plan.recipe.facts, { area: 30, room: 'Salle de bains', removal: 'Oui', primer: 'Oui' });
  assert.equal(mock.mock.callCount(), 2);
  assert.doesNotMatch(JSON.stringify(sentRequest(mock)), /ali@example\.test|72ce81dd/);
  assert.deepEqual(await planNilo({ prompt: tilingRequest }, { ...options, role: 'Lecture' }), { action: 'forbidden' });
  await assert.rejects(() => planNilo({ prompt: 'Que penser du printemps ?' }, options), { status: 503 });
});

test('un devis de carrelage passe par le même parcours quand Gemini reconnaît la demande', async t => {
  mockGemini(t, () => ({ action: 'quote', target: 'ali' }));
  const plan = await planNilo({ prompt: tilingRequest, currentQuoteId: documents[2].id }, context);
  assert.equal(plan.newQuote, true);
  assert.equal(plan.recipe.clientName, 'Ali');
  assert.equal(plan.recipe.facts.area, 30);
  assert.equal(plan.local, undefined);
});

test('la préparation locale pendant une panne respecte le statut et les droits', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  const request = { prompt: "prépare une facture d'acompte pour ce devis", currentQuoteId: documents[0].id };
  const plan = await planNilo(request, context);
  assert.deepEqual(plan, { action: 'billing', kind: 'Acompte', delivery: false, current: true, local: true });
  assert.deepEqual(await planNilo(request, { ...context, role: 'Bureau' }), { action: 'forbidden' });
  const draft = await planNilo({ ...request, currentQuoteId: documents[2].id }, context);
  assert.deepEqual(draft.candidates, []);
  assert.match(draft.hint, /devis accepté/);
});

test('un règlement référencé et une remise explicite restent préparables en cas de panne', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  const payment = await planNilo({ prompt: 'Enregistre un règlement de 65,50 € sur la facture FAC-000004' }, {
    ...context,
    quoteForInvoice(number) {
      assert.equal(number, 'FAC-000004');
      return documents[0].id;
    }
  });
  assert.equal(payment.amount, 6550);
  assert.equal(payment.invoiceNumber, 'FAC-000004');
  assert.equal(payment.candidates[0].id, documents[0].id);
  assert.equal(payment.local, true);
  assert.deepEqual(await planNilo({
    prompt: 'Mets une remise de 10 % sur ce devis', currentQuoteId: documents[2].id
  }, context), { action: 'quoteDiscount', discount: 1000, current: true, local: true });
});

test('Nilo retrouve les deux devis admissibles malgré un prénom mal saisi', async t => {
  const mock = mockGemini(t, () => ({ action: 'billing', target: 'cchloe dufart', kind: 'Acompte', delivery: true }));
  const prompt = 'Envoie une facture d’acompte à la cliente « cchloe dufart ».';
  const { action, kind, delivery, candidates } = await planNilo({ prompt }, context);
  assert.deepEqual({ action, kind, delivery }, { action: 'billing', kind: 'Acompte', delivery: true });
  assert.deepEqual(candidates.map(record => record.number), ['DEV-00002', 'DEV-00001']);
  assert.deepEqual(Object.keys(candidates[0]), ['id', 'title', 'number', 'status', 'clientName']);
  const body = sentRequest(mock);
  const [userContent] = body.contents;
  assert.equal(userContent.role, 'user');
  assert.equal(userContent.parts.length, 2);
  assert.deepEqual(JSON.parse(userContent.parts[0].text), {
    context: { role: 'Administrateur', currentQuoteStatus: null }, history: []
  });
  assert.equal(userContent.parts[1].text, prompt);
  assert.deepEqual(body.generationConfig, { responseMimeType: 'application/json', temperature: 0 });
  assert.doesNotMatch(JSON.stringify(body), /prive@example\.test|7fc91614|Ossature/);
});

test('Gemini interprète la demande d’acompte et Rivqo vérifie le devis courant et les droits', async t => {
  let output = { action: 'billing', kind: 'Acompte' };
  const mock = mockGemini(t, () => output);
  const request = { prompt: "prépare une facture d'acompte pour ce devis", currentQuoteId: documents[0].id };
  assert.deepEqual(await planNilo(request, context), {
    action: 'billing', kind: 'Acompte', delivery: false, current: true
  });
  output = { ...output, delivery: true };
  assert.deepEqual(await planNilo({ ...request, prompt: 'Peux-tu envoyer la facture d’acompte de ce devis ?' }, context), {
    action: 'billing', kind: 'Acompte', delivery: true, current: true
  });
  output = { ...output, delivery: false };
  const draft = await planNilo({ ...request, currentQuoteId: documents[2].id }, context);
  assert.deepEqual(draft.candidates, []);
  assert.match(draft.hint, /devis accepté/);
  assert.deepEqual(await planNilo(request, { ...context, role: 'Bureau' }), { action: 'forbidden' });
  assert.equal(mock.mock.callCount(), 4);
  const body = sentRequest(mock);
  const [metadata, user] = body.contents[0].parts;
  assert.deepEqual(JSON.parse(metadata.text), { context: { role: 'Administrateur', currentQuoteStatus: 'Accepté' }, history: [] });
  assert.equal(user.text, request.prompt);
  assert.doesNotMatch(JSON.stringify(body.contents), /Chloé|Dufart|DEV-00002|prive@example\.test|7fc91614/);
  assert.equal(JSON.parse(sentRequest(mock, 2).contents[0].parts[0].text).context.currentQuoteStatus, 'Brouillon');
});

test('une demande d’acompte qui désigne un client cherche son dossier et ignore le devis ouvert', async t => {
  const mock = mockGemini(t, () => ({ action: 'billing', target: 'Chloé Dufart', kind: 'Acompte' }));
  const request = { prompt: 'Prépare une facture d’acompte pour Chloé Dufart', currentQuoteId: documents[0].id };
  const plan = await planNilo(request, context);
  assert.deepEqual(plan.candidates.map(candidate => candidate.id), [documents[0].id, documents[1].id]);
  assert.equal(plan.current, undefined);
  assert.equal(mock.mock.callCount(), 1);
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
  const mock = mockGemini(t, () => output);
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
    { action: 'quote', newQuote: true, recipe: {
      type: 'tiling', title: 'Carrelage · Cuisine', facts: { area: 12, room: 'Cuisine' }
    } });

  output = { action: 'rewrite' };
  const unsaved = 'dc10bc94-629c-4d2b-a6bf-c052c6006074';
  assert.deepEqual(await planNilo({ prompt: 'Reformule ce devis', currentQuoteId: unsaved }, context),
    { action: 'rewrite', current: true });
  assert.deepEqual(JSON.parse(sentRequest(mock, 4).contents[0].parts[0].text).context, {
    role: 'Administrateur', currentQuoteStatus: 'Brouillon non enregistré'
  });
});

test('Nilo demande une précision et reprend l’intention au tour suivant', async t => {
  const prompt = 'Il me faudrait un acompte au début du chantier.';
  const question = 'Pour quel client ou devis veux-tu préparer l’acompte ?';
  let output = { action: 'clarify', question };
  const mock = mockGemini(t, () => output);
  assert.deepEqual(await planNilo({ prompt }, context), { action: 'clarify', question });

  const history = [{ prompt, reply: question }];
  const followup = 'Pour Chloé Dufart, le dossier cuisine.';
  output = { action: 'billing', target: 'cuisine', kind: 'Acompte' };
  const plan = await planNilo({ prompt: followup, history }, context);
  assert.equal(plan.kind, 'Acompte');
  assert.deepEqual(plan.candidates.map(candidate => candidate.number), ['DEV-00002']);
  const [metadata, user] = sentRequest(mock, 1).contents[0].parts;
  assert.deepEqual(JSON.parse(metadata.text), { context: { role: 'Administrateur', currentQuoteStatus: null }, history });
  assert.equal(user.text, followup);
});

test('une cible doit provenir d’un message utilisateur et non d’une réponse de Nilo', async t => {
  mockGemini(t, () => ({ action: 'billing', target: 'Chloé Dufart', kind: 'Acompte' }));
  const history = [{ prompt: 'Prépare-moi un acompte.', reply: 'Le devis de Chloé Dufart ?' }];
  const guessed = await planNilo({ prompt: 'Oui.', history }, context);
  assert.deepEqual(guessed.candidates, []);
  assert.match(guessed.hint, /nom du client/);

  history[0].prompt = 'Prépare-moi un acompte pour Chloé Dufart.';
  const confirmedName = await planNilo({ prompt: 'Oui, pour le chantier de rénovation.', history }, context);
  assert.deepEqual(confirmedName.candidates.map(candidate => candidate.number), ['DEV-00002', 'DEV-00001']);
});

test('Nilo limite les échanges transmis à Gemini au texte des derniers tours', async t => {
  const mock = mockGemini(t, () => ({ action: 'help' }));
  const turn = { prompt: 'Retrouve un dossier.', reply: 'Lequel ?' };
  const prompt = 'Je vais regarder.';
  await planNilo({ prompt, history: [{ ...turn, record: documents[0] }] }, context);
  assert.deepEqual(JSON.parse(sentRequest(mock).contents[0].parts[0].text).history, [turn]);

  await assert.rejects(() => planNilo({ prompt, history: Array(4).fill(turn) }, context), { status: 400 });
  await assert.rejects(() => planNilo({ prompt, history: [{ ...turn, reply: 'a'.repeat(301) }] }, context), {
    status: 400
  });
  assert.equal(mock.mock.callCount(), 1);
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

test('le diagnostic teste la réponse structurée de Nilo et identifie le modèle qui a répondu', async () => {
  let output = { action: 'billing', target: '', newQuote: false, kind: 'Acompte', delivery: false, question: '' };
  const request = {
    key: 'clé-de-test',
    model: 'gemini-3.8-flash',
    generate: async ({ generationConfig }) => {
      assert.deepEqual(generationConfig, { responseMimeType: 'application/json', temperature: 0 });
      return { model: 'gemini-3.5-flash-lite', text: JSON.stringify(output) };
    }
  };
  assert.deepEqual(await checkNiloGemini(request), { model: 'gemini-3.5-flash-lite', fallback: true });
  output = { ...output, action: 'help' };
  await assert.rejects(() => checkNiloGemini(request), { status: 502 });
});

test('Nilo vérifie la rubrique, le rôle et les options de l’espace de travail', async t => {
  let output = { action: 'workspace', destination: 'Catalogue' };
  mockGemini(t, () => output);
  const request = { prompt: 'Montre-moi le catalogue.' };
  const readOnly = { ...context, role: 'Lecture' };
  assert.deepEqual(await planNilo(request, readOnly),
    { action: 'workspace', scope: 'workspace', destination: 'Catalogue' });

  output = { action: 'workspace', destination: 'Administration' };
  assert.deepEqual(await planNilo(request, readOnly), { action: 'forbidden' });
  output = { action: 'workspace', destination: '../admin' };
  assert.deepEqual(await planNilo(request, context), { action: 'help' });
  output = { action: 'constructor' };
  assert.deepEqual(await planNilo(request, context), { action: 'help' });

  output = { action: 'exportQuotes', quoteStatus: 'Accepté' };
  assert.deepEqual(await planNilo({ prompt: 'Exporte les devis validés en CSV.' }, context),
    { action: 'exportQuotes', scope: 'workspace', quoteStatus: 'Validé' });
  output = { action: 'appearance', theme: 'dark' };
  assert.deepEqual(await planNilo({ prompt: 'Passe en mode sombre.' }, readOnly),
    { action: 'appearance', scope: 'workspace', theme: 'dark' });
});

test('Nilo cherche dans les fiches locales et prépare seulement les valeurs dictées', async t => {
  const customers = [{ id: 'client-1', name: 'Justine Laurent', address: 'Adresse de test', email: 'prive@example.test' }];
  const services = [{ id: 's23', label: 'Pose de parquet', category: 'Menuiserie', unit: 'm²', prices: [4, 5, 6, 7] }];
  const members = [{ id: 17, name: 'Jules Coton', role: 'Bureau', login: 'jules.test' }];
  const lookupContext = { ...context, customers, services, members };
  let output = { action: 'editClient', target: 'Justine Laurent' };
  const mock = mockGemini(t, () => output);
  assert.deepEqual(await planNilo({ prompt: 'Modifie le mail de Justine Laurent, nouveau@example.test.' }, lookupContext), {
    action: 'editClient',
    scope: 'customer',
    email: 'nouveau@example.test',
    candidates: [{ id: 'client-1', title: 'Justine Laurent', detail: 'Adresse de test' }]
  });
  assert.doesNotMatch(JSON.stringify(sentRequest(mock).contents), /prive@example\.test|Adresse de test|Jules Coton/);

  output = { action: 'editService', target: 'pose de parquet', price: 2, tier: 3 };
  const price = await planNilo({ prompt: 'Fixe la pose de parquet en Confort à 48,60 € HT.' }, lookupContext);
  assert.deepEqual(price, {
    action: 'editService', scope: 'service', tier: 2, price: 4860,
    candidates: [{ id: 's23', title: 'Pose de parquet', detail: 'Menuiserie · m²' }]
  });
  const ambiguous = await planNilo({ prompt: 'Fixe la pose de parquet en Confort et Premium à 45 €.' }, lookupContext);
  assert.equal(ambiguous.price, undefined);
  assert.equal(ambiguous.tier, undefined);

  output = { action: 'editMember', target: 'jules.test' };
  assert.deepEqual(await planNilo({ prompt: 'Gère le compte jules.test.' }, lookupContext), {
    action: 'editMember', scope: 'member', candidates: [{ id: 17, title: 'Jules Coton', detail: 'jules.test · Bureau' }]
  });
  const forbidden = await planNilo({ prompt: 'Gère le compte jules.test.' }, { ...lookupContext, role: 'Bureau' });
  assert.deepEqual(forbidden, { action: 'forbidden' });
  output = { action: 'createClient', target: 'Léa Maurin' };
  assert.deepEqual(await planNilo({ prompt: 'Crée pour Léa Maurin une fiche avec lea@example.test.' }, lookupContext),
    { action: 'createClient', scope: 'workspace', name: 'Léa Maurin', email: 'lea@example.test' });
});

test('Nilo prépare une remise explicite en points de base pour un brouillon', async t => {
  mockGemini(t, () => ({ action: 'quoteDiscount', discount: 4 }));
  const currentQuoteId = documents[2].id;
  assert.deepEqual(await planNilo({ prompt: 'Applique 12,5 % de remise.', currentQuoteId }, context),
    { action: 'quoteDiscount', discount: 1250, current: true });
  const ambiguous = await planNilo({ prompt: 'Mets 10 % ou 5 % de remise.', currentQuoteId }, context);
  assert.deepEqual(ambiguous, { action: 'quoteDiscount', current: true });
  assert.deepEqual(await planNilo({ prompt: 'Applique 10 % de remise.', currentQuoteId }, { ...context, role: 'Lecture' }),
    { action: 'forbidden' });
});

test('Nilo privilégie le libellé précis du catalogue et conserve les homonymes', async t => {
  let output = { action: 'findService', target: 'Pose de carrelage' };
  mockGemini(t, () => output);
  const services = [
    { id: 's1', label: 'Pose de carrelage', category: 'Carrelage', unit: 'm²' },
    { id: 's2', label: 'Pose de mosaïque', category: 'Carrelage', unit: 'm²' },
    { id: 's3', label: 'Pose de carrelage', category: 'Prestation locale', unit: 'm²' }
  ];
  const plan = await planNilo({ prompt: 'Retrouve Pose de carrelage.' }, { ...context, services });
  assert.deepEqual(plan.candidates.map(candidate => candidate.id), ['s1', 's3']);
  output = { ...output, target: 's3' };
  const byId = await planNilo({ prompt: 'Retrouve la prestation s3.' }, { ...context, services });
  assert.deepEqual(byId.candidates.map(candidate => candidate.id), ['s3']);
});

test('Nilo résout le devis de la facture explicitement mentionnée et vérifie le montant du règlement', async t => {
  let output = { action: 'invoicePayment', invoiceNumber: 'FAC-999999', amount: 50 };
  mockGemini(t, () => output);
  const called = [];
  const invoiceContext = { ...context, quoteForInvoice: number => {
    called.push(number);
    return number === 'FAC-000007' ? documents[1].id : undefined;
  } };
  const currentQuoteId = documents[0].id;
  const result = await planNilo({ prompt: 'Enregistre 1 240,50 € de règlement sur FAC-7.', currentQuoteId }, invoiceContext);
  assert.equal(result.amount, 124050);
  assert.equal(result.invoiceNumber, 'FAC-000007');
  assert.equal(result.current, undefined);
  assert.equal(result.candidates[0].id, documents[1].id);
  assert.deepEqual(called, ['FAC-000007']);

  const missing = await planNilo({ prompt: 'Enregistre le règlement de FAC-8.', currentQuoteId }, invoiceContext);
  assert.equal(missing.amount, undefined);
  assert.deepEqual(missing.candidates, []);
  assert.match(missing.hint, /Aucun devis/);
  const ambiguous = await planNilo({ prompt: 'Règle 200 € sur FAC-7 ou FAC-8.', currentQuoteId }, invoiceContext);
  assert.match(ambiguous.hint, /un seul numéro/);
  const noNumber = await planNilo({ prompt: 'Prépare le règlement.', currentQuoteId }, invoiceContext);
  assert.deepEqual(noNumber, { action: 'invoicePayment', current: true });
  assert.deepEqual(called, ['FAC-000007', 'FAC-000008']);

  output = { action: 'invoicePdf', kind: 'Acompte' };
  assert.deepEqual(await planNilo({ prompt: 'Ouvre le PDF de l’acompte.', currentQuoteId }, invoiceContext),
    { action: 'invoicePdf', kind: 'Acompte', current: true });

  output = { action: 'billing', kind: 'Acompte', delivery: true };
  const send = await planNilo({ prompt: 'Prépare l’envoi de FAC-7.', currentQuoteId }, invoiceContext);
  assert.equal(send.candidates[0].id, documents[1].id);
  assert.equal(send.current, undefined);
});
