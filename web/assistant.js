import { $, esc, input, select, dialog, button, api, toast } from './ui.js';
import { wavBase64, startRecording } from './voice.js';
import { euros } from './money.js';
export function assistant(state, apply) {
  const f = {},
    tierIds = ['pose', 'eco', 'standard', 'premium'];
  let audio = null,
    stop = null,
    pending = false,
    active = true,
    text = '';
  const relevant = k => !state.conditions[k] || state.conditions[k][1].includes(f[state.conditions[k][0]]);
  const missing = () => Object.keys(state.fields).filter(k => relevant(k) && f[k] == null);
  const fieldLabel = (k, v) => k === 'range' ? state.tiers[tierIds.indexOf(v)] : v;
  const names = {
    area: 'Surface',
    room: 'Pièce',
    face: 'Support',
    range: 'Gamme',
    removal: 'Dépose',
    level: 'Ragréage',
    primer: 'Primaire',
    sealing: 'Étanchéité'
  };
  const modal = $('#modal');
  const cleanup = () => {
    active = false;
    if (stop) stop(true);
    audio = null;
  };
  modal.addEventListener('close', cleanup, {
    once: true
  });
  function makeLines(tax) {
    const tier = tierIds.indexOf(f.range),
      base = f.face === 'Mur' ? 's9' : 's1';
    const ids = [base, ...[['removal', 's6'], ['primer', 's7'], ['level', 's8'], ['sealing', 's10']].filter(([k]) => relevant(k) && f[k] === 'Oui').map(x => x[1])];
    return ids.map(id => {
      const s = state.services.find(v => v.id === id);
      const t = id === base ? tier : 1;
      return {
        label: s.label,
        lot: f.room,
        unit: s.unit,
        tier: t,
        price: s.prices[t],
        quantity: Math.round(f.area * 100),
        tax,
        serviceId: id
      };
    });
  }
  function render() {
    if (!active) return;
    const k = missing()[0],
      spec = state.fields[k];
    const summary = Object.entries(f).filter(([k]) => relevant(k)).map(([k, v]) => '<button type="button" class="chip" data-reset="' + k + '">' + esc(names[k] + ' · ' + fieldLabel(k, v) + (k === 'area' ? ' m²' : '')) + ' ×</button>').join('');
    const controls = state.ai ? '<label>Description ou réponse<textarea id="words" rows="2" placeholder="Ex. 30 m² de carrelage au sol dans la cuisine">' + esc(text) + '</textarea></label><div class="actions">' + button('record', stop ? 'Terminer la dictée' : 'Dicter', 'mic') + (stop || audio ? button('cancel', 'Annuler la dictée') : '') + button('analyze', pending ? 'Analyse en cours…' : 'Analyser avec Gemini', 'arrow') + '</div>' + (audio ? '<audio id="playback" controls></audio>' : '') : '<p class="hint">Le questionnaire fonctionne dès maintenant. La dictée sera disponible après activation de Gemini.</p>';
    const manual = k ? '<form id="answer"><h3>' + esc(spec[0]) + '</h3>' + (spec[1] ? '<div class="choices">' + spec[1].map(v => '<button type="button" data-answer="' + esc(v) + '">' + esc(fieldLabel(k, v)) + '</button>').join('') + '</div>' : input('Surface en m²', 'value', '', 'number', 'step=".01" min=".01" max="10000" required') + '<button class="primary">Continuer</button>') + '</form>' : '<form id="finish"><h3>Prestations proposées</h3>' + makeLines(0).map(l => '<p>' + esc(l.label) + ' · ' + euros(l.price) + ' / ' + esc(l.unit) + '</p>').join('') + input('TVA à appliquer (%)', 'tax', 20, 'number', 'step=".01" min="0" max="100" required') + '<button class="primary wide">Ajouter ces lignes au devis</button></form>';
    dialog('Assistant carrelage et faïence', '<p>Décrivez une pièce à la fois. Vous pourrez compléter le devis avec les autres métiers du catalogue.</p>' + controls + '<div class="chips">' + summary + '</div>' + manual);
    const words = $('#words');
    if (words) words.oninput = () => text = words.value;
    if (audio) {
      const url = URL.createObjectURL(audio);
      $('#playback').src = url;
      modal.addEventListener('close', () => URL.revokeObjectURL(url), {
        once: true
      });
    }
    modal.querySelectorAll('[data-reset]').forEach(b => b.onclick = () => {
      delete f[b.dataset.reset];
      render();
    });
    modal.querySelectorAll('[data-answer]').forEach(b => b.onclick = () => {
      f[k] = b.dataset.answer;
      render();
    });
    if ($('#answer')) $('#answer').onsubmit = e => {
      e.preventDefault();
      if (k === 'area') {
        f.area = Number(e.target.elements.value.value);
        render();
      }
    };
    if ($('#finish')) $('#finish').onsubmit = e => {
      e.preventDefault();
      const lines = makeLines(Math.round(Number(e.target.elements.tax.value) * 100));
      modal.close();
      apply(lines);
    };
    const b = a => modal.querySelector('[data-act="' + a + '"]');
    if (b('record')) {
      b('record').disabled = pending;
      b('record').onclick = async () => {
        if (stop) {
          stop();
          return;
        }
        try {
          b('record').disabled = true;
          audio = null;
          const end = await startRecording(blob => {
            stop = null;
            audio = blob;
            render();
          });
          if (!active) end(true);else {
            stop = end;
            render();
          }
        } catch {
          toast('Microphone indisponible. Utilisez la saisie ou vérifiez l’autorisation du navigateur.');
          render();
        }
      };
    }
    if (b('cancel')) b('cancel').onclick = () => {
      if (stop) stop(true);
      audio = null;
      render();
    };
    if (b('analyze')) {
      b('analyze').disabled = pending || !!stop;
      b('analyze').onclick = async () => {
        if (!audio && !text.trim()) return toast('Dictez ou écrivez votre demande.');
        pending = true;
        render();
        try {
          const facts = await api('extract', {
            current: f,
            description: text,
            audio: audio ? await wavBase64(audio) : undefined
          });
          if (facts.multiple) toast('Traitez chaque zone de carrelage séparément. Les autres travaux se chiffrent dans le catalogue.');else {
            Object.assign(f, facts);
            audio = null;
            text = '';
          }
        } catch (e) {
          toast(e.message);
        } finally {
          pending = false;
          render();
        }
      };
    }
  }
  render();
}
