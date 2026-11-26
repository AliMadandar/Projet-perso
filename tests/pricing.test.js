import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../src/catalog.js';
import { fixedTier } from '../web/pricing.js';
import { quoteItems } from '../web/edition.js';

test('la dépose et les autres postes fixes affichent un seul tarif dans les nouveaux devis', () => {
  const get = id => catalog.find(service => service.id === id);
  assert.equal(fixedTier(get('s6')), 1);
  assert.equal(fixedTier(get('s54')), 0);
  assert.equal(fixedTier(get('s109')), 0);
  assert.equal(fixedTier(get('s1')), undefined);
  assert.equal(fixedTier({ label: 'Dépose de lavabo' }), 0);
  assert.equal(fixedTier({ label: 'Dépose et pose de carrelage' }), undefined);
  const line = { serviceId: 's54', label: 'Dépose de receveur', tier: 3, quantity: 100, price: 64200, unit: 'forfait', tax: 2000 };
  assert.match(quoteItems([line], 0), /Premium/);
  const draft = quoteItems([line], 0, true);
  assert.doesNotMatch(draft, /Premium/);
  assert.match(draft, /642,00/);
  assert.doesNotMatch(quoteItems([{ ...line, fixedPrice: true }], 0), /Premium/);
  assert.doesNotMatch(quoteItems([{ ...line, serviceId: '', label: 'Ligne libre' }], 0, true), /Premium/);
});
