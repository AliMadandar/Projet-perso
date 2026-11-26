import { fixedTier, hasLineTier } from './pricing.js';
import { $, esc, input, select, area, button, options, status, dateLabel, today, dialog, onForm, api, toast, icon } from './ui.js';
import { amounts, euros } from './money.js';
import { photoDialog, photosPaper } from './photos.js';
import { brief } from './brief.js';
import { assistant } from './assistant.js';
import { newEdition, editionDialog, editionPaper, lotIdeas, quoteItems } from './edition.js';
import {courrier} from './courrier.js';
import { bindSheet } from './sheet.js';
import { billingDialog } from './billing.js';
import { signatureProof } from './signature.js';
import { writer } from './writer.js';
import { niloButton } from './nilo.js';
const decimal = n => Number((n / 100).toFixed(2));
const percent = n => decimal(n).toLocaleString('fr-FR') + ' %';
const quoteStatuses = {
  Brouillon: ['Validé', 'Archivé'],
  Validé: ['Envoyé', 'Archivé'],
  Envoyé: ['Accepté', 'Refusé'],
  Accepté: ['Archivé'],
  Refusé: ['Archivé']
};
const statusLabels = {
  Validé: 'Valider et figer',
  Envoyé: 'Marquer comme envoyé',
  Accepté: 'Marquer accepté',
  Refusé: 'Marquer refusé',
  Archivé: 'Archiver'
};
const assistantStatuses = {
  validateQuote: 'Validé',
  markSent: 'Envoyé',
  acceptQuote: 'Accepté',
  rejectQuote: 'Refusé',
  archiveQuote: 'Archivé'
};
export function fresh(state) {
  return {
    id: crypto.randomUUID(),
    version: 0,
    status: 'Brouillon',
    title: 'Nouveau chantier',
    site: '',
    client: {
      name: '',
      email: '',
      phone: '',
      address: ''
    },
    company: state.company,
    issued: today(),
    valid: today(30),
    discount: 0,
    deposit: state.profiles?.['Tous corps d’état']?.first ?? 4000,
    edition:structuredClone(state.profiles?.['Tous corps d’état']?.edition||newEdition()),
    terms: state.company.terms || 'Toute prestation supplémentaire fera l’objet d’un chiffrage soumis à l’accord du client avant exécution.',
    notes: '',
    lines: []
  };
}
export function paper(d) {
  const html=unsignedPaper(d);
  return d.signature?html.replace(/<footer[^>]*>[\s\S]*?<\/footer>/,()=>signatureProof(d.signature)):html;
}
function unsignedPaper(d){
  if(d.edition)return editionPaper(d);
  const m = amounts(d.lines, d.discount, d.deposit),
    c = d.company;
  const row = (s, v, cls = '') => '<div class="' + cls + '"><span>' + esc(s) + '</span><strong>' + euros(v) + '</strong></div>';
  return '<article class="sheet quote-document"><header><div class="paperbrand"><img src="/ma-logo.png" alt="">' + esc(c.name) + '</div><div><b>DEVIS</b><br>' + esc(d.number || 'Brouillon') + '</div></header><div class="letter"><div><small>ÉMETTEUR</small><strong>' + esc(c.name) + '</strong>' + [c.address, c.email, c.phone, c.identity].filter(Boolean).map(x => '<div>' + esc(x) + '</div>').join('') + '</div><div><small>DESTINATAIRE</small><strong>' + esc(d.client.name || 'Client à renseigner') + '</strong>' + [d.client.address, d.client.email, d.client.phone].filter(Boolean).map(x => '<div>' + esc(x) + '</div>').join('') + '</div></div><h2>' + esc(d.title) + '</h2>' + (d.site ? '<p>' + esc(d.site) + '</p>' : '') + '<p>Émis le ' + (d.issued ? dateLabel(d.issued) : '…') + ' · Valable jusqu’au ' + (d.valid ? dateLabel(d.valid) : '…') + '</p>' + quoteItems(d.lines, d.discount, d.status === 'Brouillon') + '<div class="totals">' + (d.discount ? row('Sous-total HT', m.gross) + row('Remise (' + percent(d.discount) + ')', -m.discount) : '') + row('Total HT', m.net) + m.taxes.map(t => row('TVA ' + percent(t.rate), t.amount)).join('') + row('Total TTC', m.total, 'grand') + (d.deposit ? row('Acompte (' + percent(d.deposit) + ')', m.deposit) + row('Solde TTC', m.total - m.deposit) : '') + '</div>' + (d.notes ? '<section><b>Précisions</b><p>' + esc(d.notes) + '</p></section>' : '') + (d.terms ? '<section><b>Conditions</b><p>' + esc(d.terms) + '</p></section>' : '') + '<footer><b>Bon pour accord</b><p>Date et signature du client</p></footer>' + photosPaper(d.photos) + '</article>';
}
export function mountEditor(ctx, d) {
  const {
      state,
      main,
      done,
      go
    } = ctx,
    editable = d.status === 'Brouillon' && state.me.role !== 'Lecture';
  const recoveryKey = 'ma-draft-' + state.me.id + '-' + d.id;
  let dirty = !d.version,
    busy = false,
    edits = 0;
  const remember = () => {
    if (!editable || location.protocol === 'file:') return;
    try {
      sessionStorage.setItem(recoveryKey, JSON.stringify(d));
    } catch {/* Le devis reste éditable si le stockage du navigateur est indisponible. */}
  };
  const forget = () => {
    try {
      sessionStorage.removeItem(recoveryKey);
    } catch {}
  };
  const dirtyFlag = () => {
    dirty = true;
    edits++;
    remember();
  };
  const qrow = (l, i) => '<div class="linebox"><div class="lineinfo"><b>' + esc(l.label) + '</b><small>' + esc(l.lot || 'Prestation') + (hasLineTier(l) ? ' · ' + esc(state.tiers[l.tier]) : '') + ' · ' + decimal(l.quantity) + ' ' + esc(l.unit) + ' × ' + euros(l.price) + '</small></div><strong>' + euros(Math.round(l.price * l.quantity / 100)) + '</strong>' + (editable ? button('line-' + i, 'Modifier', 'edit', 'icononly') + button('del-' + i, 'Retirer', 'trash', 'icononly') : '') + '</div>';
  let sheetMode=false,mobilePane=editable?'saisie':'apercu';
  const panes=()=>'<div class="quote-switch" role="group" aria-label="Rubriques du devis">'+[['saisie','Fiche'],['apercu','Feuille'],...(d.version?[['suivi','Suivi']]:[])].map(([id,label])=>'<button type="button" data-act="pane-'+id+'" aria-pressed="'+(mobilePane===id)+'">'+label+'</button>').join('')+'</div>';
  function wireSheet(){
    if(sheetMode&&editable)bindSheet($('#paper'),d,()=>{
      dirtyFlag();
      for(const field of $('#quoteForm').elements){
        if(['title','site','notes','terms','client.name'].includes(field.name))field.value=field.name==='client.name'?d.client.name:d[field.name];
      }
    },lineDialog,openQuoteStyle,(from,to)=>{const [line]=d.lines.splice(from,1);d.lines.splice(to,0,line);dirtyFlag();draw();});
  }
  function draw(changedLine = -1, changedTotal = false) {
    const clientFields = input('Nom / société', 'client.name', d.client.name) + input('Adresse de facturation', 'client.address', d.client.address) + input('E-mail', 'client.email', d.client.email, 'email') + input('Téléphone', 'client.phone', d.client.phone, 'tel');
    main.innerHTML = '<div class="topline">' + button('return', 'Mes devis', 'back', 'subtle') + status(d.status) + '</div><div class="pagehead"><div><p class="eyebrow">' + esc(d.number || 'Nouveau devis') + '</p><h1>' + esc(editable ? 'Atelier de devis' : d.title) + '</h1></div><div class="actions">' + button('print', 'Imprimer / PDF', 'print') + (editable ? button('save', 'Enregistrer', 'check', 'primary') : '') + '</div></div>'+panes()+'<div class="edgrid" data-pane="'+mobilePane+'"><section class="editor">' + (editable ? '<div class="assistbar nilo-context-actions"><div><b>Assistant chantier</b><small>' + (state.ai ? 'À l’écrit ou à la voix, avec Gemini' : 'Chiffrer une pièce à partir du catalogue') + '</small></div>' + niloButton('Demander à Nilo') + button('assist', 'Carrelage guidé', 'book') + (state.ai ? button('brief', 'Décrire ou dicter', 'mic') : '') + '</div>' : '') + (editable?'<div class="doc-controls">'+button('edition','Personnaliser le devis','gear')+button('writer','Assistant de rédaction','edit')+'</div>':'') + '<form id="quoteForm"><fieldset ' + (editable ? '' : 'disabled') + '><details open><summary>Chantier et client</summary>' + input('Objet du devis', 'title', d.title, 'text', 'required maxlength="160"') + input('Adresse du chantier', 'site', d.site) + (editable ? select('Reprendre un client', 'pick', [['', 'Saisie libre'], ...state.customers.map(c => [c.id, c.name])], '') : '') + '<div class="fields">' + clientFields + '</div></details><section class="panel"><h3>Prestations</h3><div id="lineList">' + (d.lines.map(qrow).join('') || '<p class="empty">Ajoutez une prestation pour commencer le chiffrage.</p>') + '</div>' + (editable ? button('addline', 'Ajouter une prestation', 'plus', 'wide') : '') + '</section><details><summary>Dates et conditions</summary><div class="fields">' + input('Date d’émission', 'issued', d.issued, 'date', 'required') + input('Valable jusqu’au', 'valid', d.valid, 'date', 'required') + input('Remise globale (%)', 'discount', decimal(d.discount), 'number', 'min="0" max="100" step=".01" required') + (d.edition?'':input('Acompte (%)', 'deposit', decimal(d.deposit), 'number', 'min="0" max="100" step=".01" required')) + '</div>' + area('Précisions pour le client', 'notes', d.notes) + area('Conditions de vente et de paiement', 'terms', d.terms) + '</details>' + (editable ? button('photos','Photos du chantier ('+(d.photos?.length || 0)+'/4)') : '') + '</fieldset></form><div class="actions" id="workflow"></div></section><section class="preview"><div class="previewtitle"><span class="dot"></span>Aperçu du devis <small>En direct</small></div><div id="paper">' + paper(d) + '</div></section></div>';
    if(editable&&d.edition){
      const grid=main.querySelector('.edgrid');grid.classList.toggle('sheet-mode',sheetMode);
      const bar=main.querySelector('.previewtitle');bar.insertAdjacentHTML('beforeend',button('sheet',sheetMode?'Revenir au formulaire':'Modifier sur la feuille','edit',sheetMode?'':'primary'));
      if(sheetMode)bar.insertAdjacentHTML('afterend','<div class="sheet-tools">'+button('edition','Style et rubriques','gear')+button('addline','Ajouter une ligne','plus')+'</div>');
      wireSheet();
    }
    if (changedLine >= 0) {
      const paperRow = main.querySelectorAll('.quote-line')[changedLine];
      const formRow = main.querySelectorAll('.linebox')[changedLine];
      paperRow?.classList.add('quote-line-updated');
      formRow?.classList.add('quote-line-updated');
      if (changedTotal) main.querySelector('.q-grand, .totals .grand')?.classList.add('quote-total-updated');
      if (sheetMode) paperRow?.focus();
      else formRow?.querySelector('button')?.focus({ preventScroll: true });
    }
    $('#workflow').innerHTML = (d.version && state.me.role==='Administrateur'
      ? (quoteStatuses[d.status] || []).map(s => button('status-' + s, statusLabels[s])).join('') : '') +
      (d.version && state.me.role !== 'Lecture' ? button('duplicate', 'Dupliquer', 'copy') : '');
    if (d.version && state.me.role==='Administrateur' && !['Brouillon', 'Archivé'].includes(d.status)) {
      if (['Validé', 'Envoyé'].includes(d.status)) $('#workflow').insertAdjacentHTML('beforeend', button('share', 'Créer un lien client', 'arrow'));
      $('#workflow').insertAdjacentHTML('beforeend', button('revoke', 'Désactiver le lien'));
    }
    if(state.me.role==='Administrateur'&&['Validé','Envoyé'].includes(d.status)){
      if(d.status==='Validé')$('#workflow').insertAdjacentHTML('beforeend',button('mail','Envoyer via Gmail','arrow'));
      $('#workflow').insertAdjacentHTML('beforeend',button('reminder','Relance client','bell'));
    }
    if(state.me.role==='Administrateur'&&['Accepté','Archivé'].includes(d.status))$('#workflow').insertAdjacentHTML('afterbegin',button('billing','Factures et règlements','doc','primary'));
    if (state.me.role === 'Administrateur' && ['Validé', 'Envoyé', 'Accepté', 'Archivé'].includes(d.status)) {
      $('#workflow').insertAdjacentHTML('beforeend', niloButton('Demander à Nilo'));
    }
    if(d.signature&&state.me.role==='Administrateur')$('#workflow').insertAdjacentHTML('beforeend',button('evidence','Télécharger le dossier de signature','download'));
    if (d.version) $('#workflow').insertAdjacentHTML('beforeend', button('history', 'Historique des versions', 'doc'));
    $('#quoteForm').onsubmit = e => e.preventDefault();
    $('#quoteForm').oninput = e => {
      const el = e.target,
        n = el.name;
      if (!n || n === 'pick') return;
      if (n.startsWith('client.')) d.client[n.slice(7)] = el.value;else if (n === 'discount' || n === 'deposit') d[n] = Math.round(Number(el.value) * 100);else d[n] = el.value;
      dirtyFlag();
      $('#paper').innerHTML = paper(d);wireSheet();
    };
    const picker = $('[name="pick"]');
    if (picker) picker.onchange = () => {
      const c = state.customers.find(x => x.id === picker.value);
      if (c) {
        d.client = {
          ...c
        };
        dirtyFlag();
        draw();
      }
    };
  }
  function lineDialog(index) {
    const l = d.lines[index];
    const canSetPrice = state.me.role === 'Administrateur';
    const serviceOptions = rows => [[ '', canSetPrice || l ? 'Ligne libre' : 'Choisir une prestation'],
      ...rows.map(service => [service.id, service.category + ' · ' + service.label])];
    dialog(l ? 'Modifier la prestation' : 'Ajouter une prestation', '<form id="lineForm">' + select('Filtrer les prestations par métier','categoryFilter',[['','Tous les métiers'],...Array.from(new Set(state.services.map(s=>s.category))).sort().map(c=>[c,c])],'') + select('Catalogue', 'serviceId', serviceOptions(state.services), l?.serviceId || '') + select('Gamme tarifaire', 'tier', state.tiers.map((t, i) => [i, t]), l?.tier ?? 0) + input('Libellé', 'label', l?.label || '', 'text', 'required maxlength="250"') + select('Présentation du libellé','emphasis',[['normal','Normal'],['bold','Gras']],l?.strong?'bold':'normal') + input('Pièce ou lot', 'lot', l?.lot ?? d.lines.at(-1)?.lot ?? '', 'text','list="qLotIdeas"') + '<datalist id="qLotIdeas">'+(lotIdeas[d.edition?.trade]||[]).map(x=>'<option value="'+esc(x)+'">').join('')+'</datalist>' + '<div class="fields">' + input('Quantité', 'quantity', decimal(l?.quantity ?? 100), 'number', 'min=".01" max="10000" step=".01" required') + select('Unité', 'unit', state.units.map(v => [v, v]), l?.unit || 'm²') + input('Prix unitaire HT (€)', 'price', decimal(l?.price || 0), 'number', 'min="0" max="100000" step=".01" required') + input('TVA (%)', 'tax', decimal(l?.tax ?? 2000), 'number', 'min="0" max="100" step=".01" required') + '</div>' + (l ? input('Position dans le devis', 'position', index + 1, 'number', 'min="1" max="' + d.lines.length + '" required') : '') + '<button class="primary wide">Appliquer au devis</button></form>');
    const f = $('#lineForm'),
      v = f.elements;
    const selected = () => state.services.find(service => service.id === v.serviceId.value);
    const showTier = () => {
      const service = selected();
      const visible = Boolean(service && fixedTier(service) === undefined);
      v.tier.closest('label').hidden = !visible;
      v.tier.disabled = !visible;
    };
    v.categoryFilter.onchange = () => {
      const current = v.serviceId.value;
      const rows = state.services.filter(service =>
        !v.categoryFilter.value || service.category === v.categoryFilter.value || service.id === current
      );
      v.serviceId.innerHTML = options(serviceOptions(rows), current);
    };
    v.price.readOnly = !canSetPrice;
    v.serviceId.required = !canSetPrice && !l;
    v.serviceId.onchange = () => {
      const service = selected();
      const tier = fixedTier(service) ?? 0;
      v.tier.value = tier;
      v.label.value = service?.label || '';
      v.unit.value = service?.unit || 'm²';
      v.price.value = service ? decimal(service.prices[tier]) : '';
      showTier();
    };
    v.tier.onchange = () => {
      const service = selected();
      if (service) v.price.value = decimal(service.prices[Number(v.tier.value)]);
    };
    showTier();
    onForm('#lineForm', async o => {
      const service = selected();
      const line = {
        ...o,
        tier: Number(v.tier.value),
        ...((!service || fixedTier(service) !== undefined) && { fixedPrice: true })
      };
      line.strong = o.emphasis === 'bold';
      delete line.emphasis;
      delete line.categoryFilter;
      for (const k of ['price', 'quantity', 'tax']) line[k] = Math.round(Number(o[k]) * 100);
      const previousTotal = amounts(d.lines, d.discount).total;
      const target = l ? Number(o.position || index + 1) - 1 : d.lines.length;
      if (l) d.lines.splice(index, 1);
      delete line.position;
      d.lines.splice(target, 0, line);
      dirtyFlag();
      $('#modal').close();
      draw(target, previousTotal !== amounts(d.lines, d.discount).total);
    });
  }
  async function save() {
    if (!main.querySelector('#quoteForm').reportValidity()) throw Error('Vérifiez les champs du devis.');
    const submitted = edits;
    const saved = await api('documents', d);
    if (!main.isConnected) return false;
    done(saved);
    if (edits !== submitted) {
      Object.assign(d, { number: saved.number, version: saved.version, updated: saved.updated });
      remember();
      toast('Le devis a été enregistré. Vérifiez et enregistrez aussi les modifications saisies depuis.');
      return false;
    }
    Object.assign(d, saved);
    dirty = false;
    forget();
    draw();
    return true;
  }
  function openBrief(message) {
    brief(state, items => {
      d.lines.push(...items);
      dirtyFlag();
      draw();
    }, message);
  }
  function openGuidedQuote(recipe) {
    assistant(state, items => {
      if (!main.isConnected) return;
      d.lines.push(...items);
      dirtyFlag();
      draw();
    }, recipe);
  }
  function openWriter(instruction) {
    writer(state, d, (target, value) => {
      if (target.startsWith('line')) d.lines[Number(target.slice(4))].label = value;
      else if (['intro', 'spec'].includes(target)) d.edition[target] = value;
      else d[target] = value;
      dirtyFlag();
      draw();
    }, instruction);
  }
  function openMail(reminder) {
    courrier(state, d, reminder, saved => {
      done(saved);
      go('editor', saved, true);
    });
  }

  function openQuoteStyle() {
    editionDialog(d, state, (edition, deposit) => {
      d.edition = edition;
      d.deposit = deposit;
      dirtyFlag();
      draw();
    });
  }

  function openQuotePhotos() {
    photoDialog(d.photos || [], photos => {
      d.photos = photos;
      dirtyFlag();
      draw();
    });
  }

  function focusQuoteField(name) {
    sheetMode = false;
    mobilePane = 'saisie';
    draw();
    const field = main.querySelector('#quoteForm').elements.namedItem(name);
    const group = field.closest('details');
    if (group) group.open = true;
    const modal = $('#modal');
    const focus = () => { if (field.isConnected) field.focus(); };
    if (modal.open) modal.addEventListener('close', focus, { once: true });
    else focus();
  }

  function reviewDiscount(discount) {
    if (discount == null) return focusQuoteField('discount');
    if (!Number.isSafeInteger(discount) || discount < 0 || discount > 10000) {
      throw Error('La remise doit être comprise entre 0 et 100 %.');
    }
    const before = amounts(d.lines, d.discount).total;
    const after = amounts(d.lines, discount).total;
    dialog('Appliquer une remise', '<p>Remise proposée de ' + percent(discount) +
      '. Le total TTC passerait de ' + euros(before) + ' à ' + euros(after) + '.</p>' +
      '<p class="hint">La remise sera modifiée dans le brouillon. Enregistre ensuite le devis après vérification.</p>' +
      '<form id="discountReview"><button class="primary">Appliquer au brouillon</button></form>');
    onForm('#discountReview', () => {
      if (!main.isConnected) return;
      d.discount = discount;
      dirtyFlag();
      $('#modal').close();
      focusQuoteField('discount');
    });
  }

  function duplicateQuote() {
    const copy = fresh(state);
    Object.assign(copy, {
      title: d.title + ' · copie',
      site: d.site,
      client: { ...d.client },
      lines: structuredClone(d.lines),
      photos: structuredClone(d.photos || []),
      terms: d.terms,
      notes: d.notes,
      discount: d.discount,
      edition: structuredClone(d.edition),
      deposit: d.deposit
    });
    return go('editor', copy) === true;
  }

  async function shareQuote(active = () => main.isConnected) {
    const link = await api('share', { id: d.id });
    if (!active()) return false;
    dialog('Lien privé du devis', '<p>Transmettez ce lien au client. Le lien précédent est remplacé. Une réponse est possible au statut « Envoyé », pendant la validité du devis.</p>' +
      input('Lien valable 30 jours', 'publicLink', new URL(link.path, location.origin).href, 'text', 'readonly') +
      button('copylink', 'Copier le lien', 'copy'));
    const field = $('[name=publicLink]');
    field.select();
    $('[data-act=copylink]').onclick = async () => {
      try {
        await navigator.clipboard.writeText(field.value);
        toast('Lien copié.');
      } catch {
        field.select();
        toast('Copiez le lien sélectionné.');
      }
    };
    return true;
  }

  async function revokeShare(active = () => main.isConnected) {
    if (!confirm('Désactiver le lien de ce devis ?') || !active()) return false;
    await api('share', { id: d.id, revoke: true });
    if (active()) toast('Lien désactivé.');
    return true;
  }

  async function openQuoteHistory(active = () => main.isConnected) {
    const versions = await api('history/' + d.id);
    if (!active()) return false;
    dialog('Versions de ' + d.number, versions.map(v => '<div class="member"><div><b>Version ' + v.version +
      ' · ' + esc(v.status) + '</b><small>' + esc(new Date(v.at).toLocaleString('fr-FR')) + '</small></div>' +
      button('version-' + v.version, 'Consulter') + '</div>').join(''));
    const modal = $('#modal');
    modal.querySelectorAll('[data-act^="version-"]').forEach(control => control.onclick = async () => {
      const stillHere = () => main.isConnected && control.isConnected && modal.open;
      try {
        const old = await api('revision/' + d.id + '/' + control.dataset.act.slice(8));
        if (stillHere()) dialog('Version ' + old.version, paper(old));
      } catch (error) {
        if (stillHere()) toast(error.message);
      }
    });
    return true;
  }

  async function downloadSignature(active = () => main.isConnected) {
    const data = await api('evidence/' + d.id);
    if (!active()) return false;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = d.number + '-signature.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  async function changeQuoteStatus(next, active = () => main.isConnected) {
    if (!d.version) throw Error('Enregistre le brouillon avant de modifier son statut.');
    if (!quoteStatuses[d.status]?.includes(next)) throw Error('Ce statut est indisponible pour ce devis.');
    if (!confirm('Confirmer le statut « ' + next + ' » pour ce devis ?') || !active()) return false;
    if (dirty && !(await save())) return false;
    if (!active()) return false;
    const updated = await api('status', { id: d.id, status: next, version: d.version });
    if (!main.isConnected) return false;
    dirty = false;
    done(updated);
    go('editor', updated);
    if (updated.status === 'Envoyé') toast('Devis marqué comme envoyé.', 'sent');
    return true;
  }

  const draftTasks = {
    quote: task => {
      if (task.recipe?.type === 'tiling') openGuidedQuote(task.recipe);
      else if (state.ai) openBrief(task.prompt);
      else if (!task.newQuote) openGuidedQuote();
    },
    rewrite: task => openWriter(task.prompt),
    editQuote: () => focusQuoteField('title'),
    addLine: () => lineDialog(-1),
    quoteDates: () => focusQuoteField('issued'),
    quoteClient: () => focusQuoteField('client.name'),
    quoteStyle: openQuoteStyle,
    quotePhotos: openQuotePhotos,
    guidedQuote: task => openGuidedQuote(task.recipe),
    quoteDiscount: task => reviewDiscount(task.discount),
    saveQuote: async (_task, active) => {
      if (!confirm('Enregistrer ce brouillon et ses modifications ?') || !active()) return false;
      if (!(await save())) return false;
      if (active()) toast('Devis enregistré.');
      return true;
    }
  };

  async function openAssistantTask(task, active = () => true) {
    const current = () => main.isConnected && active();
    if (!current() || busy) return false;
    busy = true;
    try {
      const { action } = task;
      if (action === 'find') return true;
      if (action === 'quotePdf') {
        window.print();
        return true;
      }
      if (action === 'quoteHistory') {
        if (!d.version) throw Error('Enregistre le devis pour consulter ses versions.');
        return await openQuoteHistory(current);
      }
      if (Object.hasOwn(draftTasks, action)) {
        if (!editable) throw Error('Ouvre un brouillon modifiable pour cette action.');
        return (await draftTasks[action](task, current)) !== false;
      }
      if (action === 'duplicate') {
        if (!d.version || state.me.role === 'Lecture') throw Error('Ouvre un devis enregistré avec un rôle qui permet de le dupliquer.');
        return duplicateQuote();
      }
      if (state.me.role !== 'Administrateur') throw Error('Cette action est réservée à l’administration.');
      if (Object.hasOwn(assistantStatuses, action)) return await changeQuoteStatus(assistantStatuses[action], current);
      if (['billing', 'invoicePayment', 'invoicePdf'].includes(action)) {
        if (!['Accepté', 'Archivé'].includes(d.status)) throw Error('Ouvre un devis accepté pour accéder à la facturation.');
        return await billingDialog(d, {
          operation: action, kind: task.kind, delivery: task.delivery, gmail: state.gmail,
          invoiceNumber: task.invoiceNumber, amount: task.amount, active: current
        });
      }
      if (action === 'shareQuote') {
        if (!['Validé', 'Envoyé'].includes(d.status)) throw Error('Valide le devis avant de créer un lien privé.');
        if (!confirm('Créer un lien privé pour ce devis ? Le lien précédent sera remplacé.') || !current()) return false;
        return await shareQuote(current);
      }
      if (action === 'revokeShare') {
        if (['Brouillon', 'Archivé'].includes(d.status)) throw Error('Ce devis ne dispose pas de lien client à désactiver.');
        return await revokeShare(current);
      }
      if (action === 'signatureProof') {
        if (!d.signature) throw Error('Ce devis ne comporte pas de dossier de signature.');
        return await downloadSignature(current);
      }
      if (action === 'quoteMail' || action === 'reminder') {
        const reminder = action === 'reminder';
        if (!(reminder ? ['Validé', 'Envoyé'] : ['Validé']).includes(d.status)) {
          throw Error('Vérifie le statut du devis avant de préparer le message au client.');
        }
        openMail(reminder);
        return true;
      }
      throw Error('Cette action est indisponible dans le devis.');
    } finally {
      busy = false;
    }
  }
  main.onclick = async e => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (!a || busy) return;
    busy = true;
    try {
      if(a.startsWith('pane-')){mobilePane=a.slice(5);if(mobilePane!=='apercu')sheetMode=false;draw();main.querySelector('[data-act="'+a+'"]').focus();}
      if(a==='sheet'){sheetMode=!sheetMode;if(window.innerWidth<=900)mobilePane=sheetMode?'apercu':'saisie';draw();const focus=window.innerWidth<=900&&!sheetMode?'[data-act=pane-saisie]':'[data-act=sheet]';main.querySelector(focus).focus();}
      if (a === 'billing') await billingDialog(d, { gmail: state.gmail, active: () => main.isConnected });
      if (a === 'evidence') await downloadSignature();
      if (a === 'return') go('Devis');
      if (a === 'edition') openQuoteStyle();
      if (a === 'writer') openWriter();
      if (a === 'reminder' || a === 'mail') openMail(a === 'reminder');
      if (a === 'addline') lineDialog(-1);
      if (a.startsWith('line-')) lineDialog(Number(a.slice(5)));
      if (a.startsWith('del-')) {
        d.lines.splice(Number(a.slice(4)), 1);
        dirtyFlag();
        draw();
      }
      if (a === 'save') {
        if (await save()) toast('Devis enregistré.');
      }
      if (a === 'brief') openBrief();
      if (a === 'assist') openGuidedQuote();
      if (a === 'duplicate') duplicateQuote();
      if (a === 'share') await shareQuote();
      if (a === 'revoke') await revokeShare();
      if (a === 'history') await openQuoteHistory();
      if (a === 'photos') openQuotePhotos();
      if (a === 'print') window.print();
      if (a.startsWith('status-')) await changeQuoteStatus(a.slice(7));
    } catch (err) {
      toast(err.message);
    } finally {
      busy = false;
    }
  };
  draw();
  return { dirty: () => dirty, document: d, openAssistantTask };
}
