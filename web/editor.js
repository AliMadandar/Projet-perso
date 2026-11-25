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
const decimal = n => Number((n / 100).toFixed(2));
const percent = n => decimal(n).toLocaleString('fr-FR') + ' %';
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
  return '<article class="sheet quote-document"><header><div class="paperbrand"><img src="/ma-logo.png" alt="">' + esc(c.name) + '</div><div><b>DEVIS</b><br>' + esc(d.number || 'Brouillon') + '</div></header><div class="letter"><div><small>ÉMETTEUR</small><strong>' + esc(c.name) + '</strong>' + [c.address, c.email, c.phone, c.identity].filter(Boolean).map(x => '<div>' + esc(x) + '</div>').join('') + '</div><div><small>DESTINATAIRE</small><strong>' + esc(d.client.name || 'Client à renseigner') + '</strong>' + [d.client.address, d.client.email, d.client.phone].filter(Boolean).map(x => '<div>' + esc(x) + '</div>').join('') + '</div></div><h2>' + esc(d.title) + '</h2>' + (d.site ? '<p>' + esc(d.site) + '</p>' : '') + '<p>Émis le ' + (d.issued ? dateLabel(d.issued) : '…') + ' · Valable jusqu’au ' + (d.valid ? dateLabel(d.valid) : '…') + '</p>' + quoteItems(d.lines, d.discount) + '<div class="totals">' + (d.discount ? row('Sous-total HT', m.gross) + row('Remise (' + percent(d.discount) + ')', -m.discount) : '') + row('Total HT', m.net) + m.taxes.map(t => row('TVA ' + percent(t.rate), t.amount)).join('') + row('Total TTC', m.total, 'grand') + (d.deposit ? row('Acompte (' + percent(d.deposit) + ')', m.deposit) + row('Solde TTC', m.total - m.deposit) : '') + '</div>' + (d.notes ? '<section><b>Précisions</b><p>' + esc(d.notes) + '</p></section>' : '') + (d.terms ? '<section><b>Conditions</b><p>' + esc(d.terms) + '</p></section>' : '') + '<footer><b>Bon pour accord</b><p>Date et signature du client</p></footer>' + photosPaper(d.photos) + '</article>';
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
    busy = false;
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
    remember();
  };
  const qrow = (l, i) => '<div class="linebox"><div class="lineinfo"><b>' + esc(l.label) + '</b><small>' + esc(l.lot || 'Prestation') + ' · ' + esc(state.tiers[l.tier]) + ' · ' + decimal(l.quantity) + ' ' + esc(l.unit) + ' × ' + euros(l.price) + '</small></div><strong>' + euros(Math.round(l.price * l.quantity / 100)) + '</strong>' + (editable ? button('line-' + i, 'Modifier', 'edit', 'icononly') + button('del-' + i, 'Retirer', 'trash', 'icononly') : '') + '</div>';
  let sheetMode=false,mobilePane=editable?'saisie':'apercu';
  const panes=()=>'<div class="quote-switch" role="group" aria-label="Rubriques du devis">'+[['saisie','Fiche'],['apercu','Feuille'],...(d.version?[['suivi','Suivi']]:[])].map(([id,label])=>'<button type="button" data-act="pane-'+id+'" aria-pressed="'+(mobilePane===id)+'">'+label+'</button>').join('')+'</div>';
  function wireSheet(){
    if(sheetMode&&editable)bindSheet($('#paper'),d,()=>{
      dirtyFlag();
      for(const field of $('#quoteForm').elements){
        if(['title','site','notes','terms','client.name'].includes(field.name))field.value=field.name==='client.name'?d.client.name:d[field.name];
      }
    },lineDialog,()=>main.querySelector('[data-act=edition]').click(),(from,to)=>{const [line]=d.lines.splice(from,1);d.lines.splice(to,0,line);dirtyFlag();draw();});
  }
  function draw(changedLine = -1, changedTotal = false) {
    const clientFields = input('Nom / société', 'client.name', d.client.name) + input('Adresse de facturation', 'client.address', d.client.address) + input('E-mail', 'client.email', d.client.email, 'email') + input('Téléphone', 'client.phone', d.client.phone, 'tel');
    main.innerHTML = '<div class="topline">' + button('return', 'Mes devis', 'back', 'subtle') + status(d.status) + '</div><div class="pagehead"><div><p class="eyebrow">' + esc(d.number || 'Nouveau devis') + '</p><h1>' + esc(editable ? 'Atelier de devis' : d.title) + '</h1></div><div class="actions">' + button('print', 'Imprimer / PDF', 'print') + (editable ? button('save', 'Enregistrer', 'check', 'primary') : '') + '</div></div>'+panes()+'<div class="edgrid" data-pane="'+mobilePane+'"><section class="editor">' + (editable ? '<div class="assistbar"><div><b>Assistant chantier</b><small>Décrire ou dicter une zone à chiffrer</small></div>' + button('assist', 'Carrelage guidé', 'book') + (state.ai ? button('brief', 'Dicter un chantier', 'mic') : '') + '</div>' : '') + (editable?'<div class="doc-controls">'+button('edition','Personnaliser le devis','gear')+button('writer','Assistant de rédaction','edit')+'</div>':'') + '<form id="quoteForm"><fieldset ' + (editable ? '' : 'disabled') + '><details open><summary>Chantier et client</summary>' + input('Objet du devis', 'title', d.title, 'text', 'required maxlength="160"') + input('Adresse du chantier', 'site', d.site) + (editable ? select('Reprendre un client', 'pick', [['', 'Saisie libre'], ...state.customers.map(c => [c.id, c.name])], '') : '') + '<div class="fields">' + clientFields + '</div></details><section class="panel"><h3>Prestations</h3><div id="lineList">' + (d.lines.map(qrow).join('') || '<p class="empty">Ajoutez une prestation pour commencer le chiffrage.</p>') + '</div>' + (editable ? button('addline', 'Ajouter une prestation', 'plus', 'wide') : '') + '</section><details><summary>Dates et conditions</summary><div class="fields">' + input('Date d’émission', 'issued', d.issued, 'date', 'required') + input('Valable jusqu’au', 'valid', d.valid, 'date', 'required') + input('Remise globale (%)', 'discount', decimal(d.discount), 'number', 'min="0" max="100" step=".01" required') + (d.edition?'':input('Acompte (%)', 'deposit', decimal(d.deposit), 'number', 'min="0" max="100" step=".01" required')) + '</div>' + area('Précisions pour le client', 'notes', d.notes) + area('Conditions de vente et de paiement', 'terms', d.terms) + '</details>' + (editable ? button('photos','Photos du chantier ('+(d.photos?.length || 0)+'/4)') : '') + '</fieldset></form><div class="actions" id="workflow"></div></section><section class="preview"><div class="previewtitle"><span class="dot"></span>Aperçu du devis <small>En direct</small></div><div id="paper">' + paper(d) + '</div></section></div>';
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
    const next = {
      Brouillon: ['Validé', 'Archivé'],
      Validé: ['Envoyé', 'Archivé'],
      Envoyé: ['Accepté', 'Refusé'],
      Accepté: ['Archivé'],
      Refusé: ['Archivé']
    };
    $('#workflow').innerHTML = (d.version && state.me.role==='Administrateur' ? (next[d.status] || []).map(s => button('status-' + s, {
      Validé: 'Valider et figer',
      Envoyé: 'Marquer comme envoyé',
      Accepté: 'Marquer accepté',
      Refusé: 'Marquer refusé',
      Archivé: 'Archiver'
    }[s])).join('') : '') + (d.version && state.me.role !== 'Lecture' ? button('duplicate', 'Dupliquer', 'copy') : '');
    if (d.version && state.me.role==='Administrateur' && !['Brouillon', 'Archivé'].includes(d.status)) {
      if (['Validé', 'Envoyé'].includes(d.status)) $('#workflow').insertAdjacentHTML('beforeend', button('share', 'Créer un lien client', 'arrow'));
      $('#workflow').insertAdjacentHTML('beforeend', button('revoke', 'Désactiver le lien'));
    }
    if(state.me.role==='Administrateur'&&['Validé','Envoyé'].includes(d.status)){
      if(d.status==='Validé')$('#workflow').insertAdjacentHTML('beforeend',button('mail','Envoyer via Gmail','arrow'));
      $('#workflow').insertAdjacentHTML('beforeend',button('reminder','Relance client','bell'));
    }
    if(state.me.role==='Administrateur'&&['Accepté','Archivé'].includes(d.status))$('#workflow').insertAdjacentHTML('afterbegin',button('billing','Factures et règlements','doc','primary'));
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
    dialog(l ? 'Modifier la prestation' : 'Ajouter une prestation', '<form id="lineForm">' + select('Filtrer les prestations par métier','categoryFilter',[['','Tous les métiers'],...Array.from(new Set(state.services.map(s=>s.category))).sort().map(c=>[c,c])],'') + select('Catalogue', 'serviceId', [['', 'Ligne libre'], ...state.services.map(s => [s.id, s.category + ' · ' + s.label])], l?.serviceId || '') + select('Gamme tarifaire', 'tier', state.tiers.map((t, i) => [i, t]), l?.tier ?? 0) + input('Libellé', 'label', l?.label || '', 'text', 'required maxlength="250"') + select('Présentation du libellé','emphasis',[['normal','Normal'],['bold','Gras']],l?.strong?'bold':'normal') + input('Pièce ou lot', 'lot', l?.lot ?? d.lines.at(-1)?.lot ?? '', 'text','list="qLotIdeas"') + '<datalist id="qLotIdeas">'+(lotIdeas[d.edition?.trade]||[]).map(x=>'<option value="'+esc(x)+'">').join('')+'</datalist>' + '<div class="fields">' + input('Quantité', 'quantity', decimal(l?.quantity ?? 100), 'number', 'min=".01" max="10000" step=".01" required') + select('Unité', 'unit', state.units.map(v => [v, v]), l?.unit || 'm²') + input('Prix unitaire HT (€)', 'price', decimal(l?.price || 0), 'number', 'min="0" max="100000" step=".01" required') + input('TVA (%)', 'tax', decimal(l?.tax ?? 2000), 'number', 'min="0" max="100" step=".01" required') + '</div>' + (l ? input('Position dans le devis', 'position', index + 1, 'number', 'min="1" max="' + d.lines.length + '" required') : '') + '<button class="primary wide">Appliquer au devis</button></form>');
    const f = $('#lineForm'),
      v = f.elements;
    function sync() {
      const s = state.services.find(x => x.id === v.serviceId.value);
      if (s) {
        v.label.value = s.label;
        v.unit.value = s.unit;
        v.price.value = decimal(s.prices[Number(v.tier.value)]);
      }
    }
    v.categoryFilter.onchange=()=>{
      const rows=state.services.filter(s=>!v.categoryFilter.value||s.category===v.categoryFilter.value);
      v.serviceId.innerHTML=options([['','Ligne libre'],...rows.map(s=>[s.id,s.label])],v.serviceId.value);
    };
    if(state.me.role!=='Administrateur')v.price.readOnly=true;
    v.serviceId.onchange = sync;
    v.tier.onchange = sync;
    onForm('#lineForm', async o => {
      const line = {
        ...o,
        tier: Number(o.tier)
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
    if (!$('#quoteForm').reportValidity()) throw Error('Vérifiez les champs du devis.');
    const saved = await api('documents', d);
    Object.assign(d, saved);
    done(saved);
    dirty = false;
    forget();
    draw();
    return saved;
  }
  main.onclick = async e => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (!a || busy) return;
    busy = true;
    try {
      if(a.startsWith('pane-')){mobilePane=a.slice(5);if(mobilePane!=='apercu')sheetMode=false;draw();main.querySelector('[data-act="'+a+'"]').focus();}
      if(a==='sheet'){sheetMode=!sheetMode;if(window.innerWidth<=900)mobilePane=sheetMode?'apercu':'saisie';draw();const focus=window.innerWidth<=900&&!sheetMode?'[data-act=pane-saisie]':'[data-act=sheet]';main.querySelector(focus).focus();}
      if(a==='billing')await billingDialog(d);
      if(a==='evidence'){
        const data=await api('evidence/'+d.id),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=d.number+'-signature.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }
      if (a === 'return') go('Devis');
      if(a==='edition')editionDialog(d,state,(edition,deposit)=>{d.edition=edition;d.deposit=deposit;dirtyFlag();draw();});
      if(a==='writer')writer(state,d,(target,value)=>{if(target.startsWith('line'))d.lines[Number(target.slice(4))].label=value;
        else if(['intro','spec'].includes(target))d.edition[target]=value;else d[target]=value;dirtyFlag();draw();});
      if(a==='reminder'||a==='mail')courrier(state,d,a==='reminder',saved=>{done(saved);go('editor',saved,true);});
      if (a === 'addline') lineDialog(-1);
      if (a.startsWith('line-')) lineDialog(Number(a.slice(5)));
      if (a.startsWith('del-')) {
        d.lines.splice(Number(a.slice(4)), 1);
        dirtyFlag();
        draw();
      }
      if (a === 'save') {
        await save();
        toast('Devis enregistré.');
      }
      if (a === 'brief') brief(state, items => {
        d.lines.push(...items);
        dirtyFlag();
        draw();
      });
      if (a === 'assist') assistant(state, items => {
        d.lines.push(...items);
        dirtyFlag();
        draw();
      });
      if (a === 'duplicate') {
        const n = fresh(state);
        Object.assign(n, {
          title: d.title + ' · copie',
          site: d.site,
          client: {
            ...d.client
          },
          lines: structuredClone(d.lines),
          photos: structuredClone(d.photos || []),
          terms: d.terms,
          notes: d.notes,
          discount: d.discount,
          edition:structuredClone(d.edition), deposit: d.deposit
        });
        go('editor', n);
      }
      if (a === 'share') {
        const link = await api('share', {
          id: d.id
        });
        dialog('Lien privé du devis', '<p>Transmettez ce lien au client. Le lien précédent est remplacé. Une réponse est possible au statut « Envoyé », pendant la validité du devis.</p>' + input('Lien valable 30 jours', 'publicLink', new URL(link.path, location.origin).href, 'text', 'readonly') + button('copylink', 'Copier le lien', 'copy'));
        const el = $('[name=publicLink]');
        el.select();
        $('[data-act=copylink]').onclick = async () => {
          try {
            await navigator.clipboard.writeText(el.value);
            toast('Lien copié.');
          } catch {
            el.select();
            toast('Copiez le lien sélectionné.');
          }
        };
      }
      if (a === 'revoke' && confirm('Désactiver le lien de ce devis ?')) {
        await api('share', {
          id: d.id,
          revoke: true
        });
        toast('Lien désactivé.');
      }
      if (a === 'history') {
        const versions = await api('history/' + d.id);
        dialog('Versions de ' + d.number, versions.map(v => '<div class="member"><div><b>Version ' + v.version + ' · ' + esc(v.status) + '</b><small>' + esc(new Date(v.at).toLocaleString('fr-FR')) + '</small></div>' + button('version-' + v.version, 'Consulter') + '</div>').join(''));
        $('#modal').querySelectorAll('[data-act^="version-"]').forEach(b => b.onclick = async () => {
          try {
            const old = await api('revision/' + d.id + '/' + b.dataset.act.slice(8));
            dialog('Version ' + old.version, paper(old));
          } catch (err) {
            toast(err.message);
          }
        });
      }
      if (a === 'photos') photoDialog(d.photos || [], photos=>{d.photos=photos;dirtyFlag();draw();});
      if (a === 'print') window.print();
      if (a.startsWith('status-')) {
        const s = a.slice(7);
        if (!confirm('Confirmer le statut « ' + s + ' » pour ce devis ?')) return;
        if (dirty) await save();
        const updated = await api('status', {
          id: d.id,
          status: s,
          version: d.version
        });
        dirty = false;
        done(updated);
        go('editor', updated);
        if (updated.status === 'Envoyé') toast('Devis marqué comme envoyé.', 'sent');
      }
    } catch (err) {
      toast(err.message);
    } finally {
      busy = false;
    }
  };
  draw();
  return () => dirty;
}
