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
  billing: 'Ouvrir le suivi',
  duplicate: 'Créer une copie du devis',
  saveQuote: 'Vérifier et enregistrer le brouillon',
  editQuote: 'Ouvrir le brouillon',
  addLine: 'Préparer une prestation',
  quoteDates: 'Ouvrir les dates et conditions',
  quoteClient: 'Vérifier le client du devis',
  quoteStyle: 'Personnaliser le devis',
  quotePhotos: 'Ouvrir les photos',
  guidedQuote: 'Ouvrir le carrelage guidé',
  quotePdf: 'Ouvrir l’impression du devis',
  quoteHistory: 'Consulter les versions',
  shareQuote: 'Préparer le lien client',
  revokeShare: 'Vérifier la désactivation du lien',
  validateQuote: 'Vérifier la validation du devis',
  markSent: 'Vérifier le statut « Envoyé »',
  acceptQuote: 'Vérifier le statut « Accepté »',
  rejectQuote: 'Vérifier le statut « Refusé »',
  archiveQuote: 'Vérifier l’archivage',
  signatureProof: 'Télécharger le dossier de signature',
  quoteDiscount: 'Préparer la remise',
  invoicePayment: 'Préparer le règlement',
  invoicePdf: 'Ouvrir le PDF de la facture',
  exportQuotes: 'Préparer l’export des devis',
  createClient: 'Préparer une fiche client',
  editClient: 'Ouvrir la fiche à modifier',
  findClient: 'Consulter la fiche client',
  createService: 'Préparer une prestation du catalogue',
  editService: 'Préparer le tarif à modifier',
  findService: 'Consulter les tarifs',
  companySettings: 'Ouvrir la fiche entreprise',
  inviteMember: 'Préparer un compte membre',
  editMember: 'Ouvrir le compte à gérer',
  notificationSettings: 'Ouvrir les réglages des notifications',
  geminiCheck: 'Tester la connexion Gemini',
  appearance: 'Ouvrir les réglages d’apparence',
  markActivityRead: 'Marquer l’activité comme lue'
};

function actionLabel(plan) {
  if (plan.recipe?.type === 'tiling') return 'Préparer le devis de carrelage';
  if (plan.action === 'workspace') return 'Ouvrir ' + plan.destination;
  if (plan.action === 'billing' && plan.kind) return 'Préparer la facture · ' + plan.kind;
  if (plan.action === 'appearance') {
    const theme = { auto: 'automatique', light: 'clair', dark: 'sombre' }[plan.theme];
    if (theme) return 'Appliquer le thème ' + theme;
  }
  return actionLabels[plan.action] || 'Vérifier l’action';
}

function shortcuts(state, current, page) {
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
  if (page === 'Clients' && editable) return [
    ['users', 'Préparer une fiche client', { scope: 'workspace', action: 'createClient' }]
  ];
  if (page === 'Catalogue' && admin) return [
    ['plus', 'Préparer une prestation', { scope: 'workspace', action: 'createService' }]
  ];
  if (page === 'Devis') return [
    ...(editable ? [['doc', 'Préparer un devis', { action: 'quote', newQuote: true }]] : []),
    ['download', 'Préparer l’export CSV', { scope: 'workspace', action: 'exportQuotes' }]
  ];
  if (page === 'Activité') return [
    ['check', 'Marquer comme lu', { scope: 'workspace', action: 'markActivityRead' }],
    ['bell', 'Régler les notifications', { scope: 'workspace', action: 'notificationSettings' }]
  ];
  if (page === 'Paramètres') return [
    ['gear', 'Choisir le thème', { scope: 'workspace', action: 'appearance' }],
    ...(admin && state.ai ? [['arrow', 'Tester Gemini', { scope: 'workspace', action: 'geminiCheck' }]] : [])
  ];
  return [
    ...(editable ? [['doc', 'Préparer un devis', { action: 'quote', newQuote: true }]] : []),
    ['book', 'Retrouver un devis', { action: 'find' }]
  ];
}

const examples = {
  Clients: 'Crée une fiche pour Camille Martin',
  Catalogue: 'Retrouve le tarif de la pose de carrelage',
  Devis: 'Prépare l’export des devis acceptés',
  Paramètres: 'Passe l’atelier en mode sombre',
  Activité: 'Marque l’activité comme lue'
};

export function openNilo(state, current, onAction, page) {
  const choices = shortcuts(state, current, page);
  const scope = current ? [current.number || 'Brouillon', current.title].filter(Boolean).join(' · ') : '';
  const example = current?.status === 'Accepté' ? 'Prépare une facture d’acompte pour ce devis' :
    examples[page] || 'Retrouve le devis de Camille Martin';
  dialog('Nilo', '<div class="nilo-panel"><div class="nilo-intro">' + portrait +
    '<div><h3>Qu’est-ce qu’on prépare ?</h3>' +
    (scope ? '<p>' + esc(scope) + '</p>' : '<p>Ton assistant dans l’atelier Rivqo.</p>') +
    '</div></div><div class="nilo-shortcuts" aria-label="Actions rapides">' +
    choices.map(([mark, label], i) => button('nilo-quick-' + i, label, mark)).join('') + '</div>' +
    '<div class="nilo-log" role="log" aria-live="polite" aria-label="Réponse de Nilo"></div>' +
    (state.ai
      ? '<form class="nilo-compose"><label for="nilo-prompt">Ta demande</label><textarea id="nilo-prompt" rows="2" maxlength="1800" required placeholder="Ex. ' + esc(example) + '"></textarea>' +
        '<div class="nilo-compose-footer"><small>Gemini interprète ta demande et les précisions que tu ajoutes.</small><button class="primary" type="submit">' + icon('arrow') + 'Envoyer</button></div></form>'
      : '<p class="hint">Les raccourcis sont disponibles. Active Gemini dans les paramètres serveur pour écrire une demande à Nilo.</p>') +
    '</div>');

  const panel = $('.nilo-panel');
  const modal = $('#modal');
  const log = panel.querySelector('.nilo-log');
  const form = panel.querySelector('.nilo-compose');
  const field = panel.querySelector('#nilo-prompt');
  let busy = false;
  let history = [];

  function setBusy(value) {
    busy = value;
    panel.querySelectorAll('button, textarea').forEach(control => control.disabled = value);
  }

  function tell(text) {
    const note = document.createElement('p');
    note.className = 'nilo-reply';
    note.textContent = text;
    log.append(note);
    return note;
  }

  function say(prompt) {
    const note = document.createElement('p');
    note.className = 'nilo-request';
    note.textContent = prompt;
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
    if (plan.action === 'forbidden') {
      tell('Cette action demande un autre rôle dans Rivqo.');
      return;
    }
    if (plan.action === 'clarify') {
      tell(plan.question);
      return plan.question;
    }
    if (plan.action === 'help') {
      tell('Je peux t’aider avec les devis, les factures, le carnet clients, le catalogue et les réglages de l’atelier, selon ton rôle.');
      return;
    }
    if (plan.local) {
      tell('Gemini est indisponible. Rivqo peut traiter cette demande avec un de ses parcours guidés.');
    }
    if (plan.recipe?.type === 'tiling' && (plan.current || plan.newQuote || plan.candidates?.length)) {
      tell('Je peux reprendre les détails du carrelage et te demander ce qu’il reste à préciser.');
    }
    if (plan.hint) tell(plan.hint);
    const candidates = plan.candidates || [];
    if (candidates.length) {
      const subject = { customer: 'la fiche client concernée', service: 'la prestation concernée', member: 'le compte concerné' }[plan.scope];
      const label = candidates.length > 1 ? 'Choisis ' + (subject || 'le devis concerné') + '.' : actionLabel(plan);
      tell(label);
      if (plan.action === 'billing' && plan.delivery) {
        tell('Tu pourras vérifier le montant et le destinataire avant l’envoi.');
      }
      const list = document.createElement('div');
      list.className = 'nilo-results';
      list.innerHTML = candidates.map((record, index) =>
        '<button type="button" data-quote-choice="' + index + '"><span><strong>' +
        esc(record.title) + '</strong><small>' + esc(record.detail || [record.number, record.clientName].filter(Boolean).join(' · ')) +
        '</small></span>' + (record.status ? status(record.status) : '') + icon('arrow') + '</button>'
      ).join('');
      log.append(list);
      list.querySelectorAll('button').forEach((control, index) => {
        control.onclick = () => openTask({ ...plan, id: candidates[index].id }, prompt);
      });
      return candidates.length > 1 ? label : undefined;
    }
    if (plan.current || plan.newQuote || (plan.scope === 'workspace' && !plan.hint)) {
      log.insertAdjacentHTML('beforeend', button('nilo-open', actionLabel(plan), 'arrow', 'primary'));
      log.querySelector('[data-act="nilo-open"]').onclick = () => openTask(plan, prompt);
      return;
    }
    const question = plan.hint || 'Indique le nom du client, le chantier ou le numéro du devis dans ta demande.';
    if (!plan.hint) tell(question);
    return question;
  }

  choices.forEach(([, , plan], i) => {
    panel.querySelector('[data-act="nilo-quick-' + i + '"]').onclick = () => openTask(plan, '');
  });
  if (!form) return;
  form.onsubmit = async event => {
    event.preventDefault();
    const prompt = field.value.trim();
    if (!prompt || busy) return;
    const actionPrompt = [...history.map(turn => turn.prompt), prompt].join('\n');
    log.replaceChildren();
    for (const turn of history) {
      say(turn.prompt);
      tell(turn.reply);
    }
    say(prompt);
    const waiting = tell('Je regarde ta demande…');
    log.scrollTop = log.scrollHeight;
    setBusy(true);
    let nextTask;
    try {
      const plan = await api('nilo', { prompt, currentQuoteId: current?.id, history });
      if (!panel.isConnected || !modal.open) return;
      waiting.remove();
      field.value = '';
      if (plan.action === 'billing' && plan.current) nextTask = plan;
      const reply = nextTask ? undefined : showPlan(plan, actionPrompt);
      history = reply ? [...history, { prompt, reply }].slice(-3) : [];
    } catch (error) {
      if (!panel.isConnected || !modal.open) return;
      waiting.remove();
      tell(error.message);
    } finally {
      if (panel.isConnected && modal.open) {
        setBusy(false);
        log.scrollTop = log.scrollHeight;
        if (!nextTask) field.focus({ preventScroll: true });
      }
    }
    if (nextTask) await openTask(nextTask, actionPrompt);
  };
}
