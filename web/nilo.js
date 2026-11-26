import { $, api, button, dialog, esc, icon, status } from './ui.js';

const portrait = '<span class="nilo-portrait" aria-hidden="true"><span class="nilo-eyes"></span></span>';

export function niloButton(label = 'Nilo') {
  return '<button type="button" class="nilo-trigger" data-act="nilo" aria-label="' +
    (label === 'Nilo' ? 'Ouvrir Nilo' : esc(label)) + '">' + portrait + esc(label) + '</button>';
}

const actionLabels = {
  quote: 'Préparer le devis',
  find: 'Ouvrir le devis',
  rewrite: 'Ouvrir la rédaction',
  quoteMail: 'Préparer le mail du devis',
  reminder: 'Préparer une relance',
  billing: 'Ouvrir le suivi'
};

function shortcuts(state, current) {
  const editable = state.me.role !== 'Lecture';
  const admin = state.me.role === 'Administrateur';
  if (editable && current?.status === 'Brouillon') return [
    ['doc', state.ai ? 'Chiffrer le chantier' : 'Carrelage guidé', { action: 'quote', current: true }],
    ['edit', 'Relire le devis', { action: 'rewrite', current: true }]
  ];
  if (admin && ['Accepté', 'Archivé'].includes(current?.status)) {
    const choices = [['book', 'Suivre les règlements', { action: 'billing', current: true }]];
    if (current.status === 'Accepté') choices.unshift(
      ['doc', 'Préparer l’acompte', { action: 'billing', current: true, kind: 'Acompte' }]
    );
    return choices;
  }
  if (admin && ['Validé', 'Envoyé'].includes(current?.status)) return [
    current.status === 'Validé'
      ? ['arrow', 'Préparer l’envoi', { action: 'quoteMail', current: true }]
      : ['bell', 'Préparer une relance', { action: 'reminder', current: true }]
  ];
  return [
    ...(editable ? [['doc', 'Préparer un devis', { action: 'quote', newQuote: true }]] : []),
    ['book', 'Retrouver un devis', { action: 'find' }]
  ];
}

export function openNilo(state, current, onAction) {
  const choices = shortcuts(state, current);
  const scope = current ? [current.number || 'Brouillon', current.title].filter(Boolean).join(' · ') : '';
  dialog('Nilo', '<div class="nilo-panel"><div class="nilo-intro">' + portrait +
    '<div><h3>Qu’est-ce qu’on prépare ?</h3>' +
    (scope ? '<p>' + esc(scope) + '</p>' : '<p>Ton assistant dans l’atelier Rivqo.</p>') +
    '</div></div><div class="nilo-shortcuts" aria-label="Actions rapides">' +
    choices.map(([mark, label], i) => button('nilo-quick-' + i, label, mark)).join('') + '</div>' +
    '<div class="nilo-log" role="log" aria-live="polite" aria-label="Réponse de Nilo"></div>' +
    (state.ai
      ? '<form class="nilo-compose"><label for="nilo-prompt">Ta demande</label><textarea id="nilo-prompt" rows="2" maxlength="1800" required placeholder="Ex. Prépare une facture d’acompte pour Camille Martin"></textarea>' +
        '<div class="nilo-compose-footer"><small>Le texte de ta demande est traité par Gemini.</small><button class="primary" type="submit">' + icon('arrow') + 'Envoyer</button></div></form>'
      : '<p class="hint">Les raccourcis sont disponibles. Active Gemini dans les paramètres serveur pour écrire une demande à Nilo.</p>') +
    '</div>');

  const panel = $('.nilo-panel');
  const modal = $('#modal');
  const log = panel.querySelector('.nilo-log');
  const form = panel.querySelector('.nilo-compose');
  const field = panel.querySelector('#nilo-prompt');
  let busy = false;

  function setBusy(value) {
    busy = value;
    panel.querySelectorAll('button, textarea').forEach(control => control.disabled = value);
  }

  function tell(text) {
    const note = document.createElement('p');
    note.className = 'nilo-reply';
    note.textContent = text;
    log.append(note);
  }

  async function openTask(plan, prompt) {
    if (busy) return;
    setBusy(true);
    try {
      const opened = await onAction({ ...plan, prompt }, () => panel.isConnected && modal.open);
      if (!opened || !modal.open) return;
      if (panel.isConnected) {
        modal.close();
        $('#main')?.focus({ preventScroll: true });
      } else {
        modal.querySelector('[data-act="close"]')?.focus({ preventScroll: true });
      }
    } catch (error) {
      if (panel.isConnected && modal.open) tell(error.message);
    } finally {
      if (panel.isConnected) setBusy(false);
    }
  }

  function showPlan(plan, prompt) {
    if (plan.action === 'forbidden') return tell('Cette action demande un autre rôle dans Rivqo.');
    if (plan.action === 'help') {
      return tell('Je peux retrouver un devis, aider à le rédiger ou à le chiffrer, et préparer une facture, un envoi ou une relance selon tes accès.');
    }
    if (plan.hint) tell(plan.hint);
    const candidates = plan.candidates || [];
    if (candidates.length) {
      const label = candidates.length > 1 ? 'Choisis le devis concerné.' : 'Voici le devis que j’ai retrouvé.';
      tell(label);
      if (plan.action === 'billing' && plan.delivery) {
        tell('Tu pourras vérifier le montant et le destinataire avant l’envoi.');
      }
      const list = document.createElement('div');
      list.className = 'nilo-results';
      list.innerHTML = candidates.map((quote, index) =>
        '<button type="button" data-quote-choice="' + index + '"><span><strong>' +
        esc(quote.title) + '</strong><small>' + esc([quote.number, quote.clientName].filter(Boolean).join(' · ')) +
        '</small></span>' + status(quote.status) + icon('arrow') + '</button>'
      ).join('');
      log.append(list);
      list.querySelectorAll('button').forEach((control, index) => {
        control.onclick = () => openTask({ ...plan, id: candidates[index].id }, prompt);
      });
      return;
    }
    if (plan.current || plan.newQuote) {
      const label = plan.action === 'billing' && plan.kind ? 'Préparer la facture · ' + plan.kind : actionLabels[plan.action];
      log.insertAdjacentHTML('beforeend', button('nilo-open', label, 'arrow', 'primary'));
      log.querySelector('[data-act="nilo-open"]').onclick = () => openTask(plan, prompt);
    } else if (!plan.hint) {
      tell('Indique le nom du client, le chantier ou le numéro du devis dans ta demande.');
    }
  }

  choices.forEach(([, , plan], i) => {
    panel.querySelector('[data-act="nilo-quick-' + i + '"]').onclick = () => openTask(plan, '');
  });
  if (!form) return;
  form.onsubmit = async event => {
    event.preventDefault();
    const prompt = field.value.trim();
    if (!prompt || busy) return;
    log.innerHTML = '<p class="nilo-request">' + esc(prompt) + '</p>';
    tell('Je regarde ta demande…');
    setBusy(true);
    try {
      const plan = await api('nilo', { prompt, currentQuoteId: current?.id });
      if (!panel.isConnected || !modal.open) return;
      log.lastElementChild.remove();
      showPlan(plan, prompt);
    } catch (error) {
      if (!panel.isConnected || !modal.open) return;
      log.lastElementChild.remove();
      tell(error.message);
    } finally {
      if (panel.isConnected) setBusy(false);
    }
  };
}
