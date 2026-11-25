import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
test('le fichier autonome démarre et recalcule son aperçu après la saisie', async () => {
  const html = readFileSync(new URL('../APERCU.html', import.meta.url), 'utf8');
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      innerHTML: '',
      addEventListener() {},
      classList:{toggle(){}},
      querySelector(selector) {
        return element(selector);
      },
      insertAdjacentHTML(_where, v) {
        this.innerHTML += v;
      }
    });
    return elements.get(id);
  }
  const document = {
      querySelector: element
    },
    window = {
      innerWidth: 1440,
      scrollTo() {},
      addEventListener() {}
    };
  const context = vm.createContext({
    document,
    window,
    crypto,
    structuredClone,
    navigator: {},
    location: {
      protocol: 'file:'
    },
    setInterval: () => 1,
    clearInterval() {},
    clearTimeout() {},
    setTimeout() {},
    Intl,
    Date,
    URL
  });
  vm.runInContext(script, context);
  await new Promise(resolve => setImmediate(resolve));
  assert.match(element('#main').innerHTML, /Rénovation de la cuisine/);
  assert.match(element('#main').innerHTML.replaceAll(/\s/g, ''), /3696,00/);
  element('#quoteForm').oninput({
    target: {
      name: 'discount',
      value: '10'
    }
  });
  assert.match(element('#paper').innerHTML.replaceAll(/\s/g, ''), /3326,40/);
});
