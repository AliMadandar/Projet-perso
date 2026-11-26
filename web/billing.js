import { $,esc,button,dialog,input,select,area,api,onForm,today,dateLabel,toast } from './ui.js';
import {euros} from './money.js';
import {installments} from './edition.js';
const paid=i=>i.payments.reduce((n,p)=>n+p.amount,0);
const caption=k=>k==='Solde'?'Facture de solde':k==='Acompte'?'Facture d’acompte':'Facture de situation';
const kinds=['Acompte','Situation','Solde'];
export const invoiceMailSubject=i=>'Facture '+i.number+' · '+i.company.name;
export function invoicePaper(i){
 const party=c=>[c.name,c.address,c.identity,c.email,c.phone].filter(Boolean).map(esc).join('<br>');
 const rows=i.lines.map(l=>'<tr><td>'+esc(l.label)+'</td><td>'+esc(l.quantity/100)+' '+esc(l.unit)+'</td><td>'+euros(l.price)+'</td><td>'+esc(l.tax/100)+' %</td></tr>').join('');
 return '<article class="sheet couture tone-ambre invoice"><header class="q-head"><div class="q-brand"><img src="'+esc(i.logo||'/ma-logo.png')+'" alt=""><b>'+esc(i.company.name)+'</b></div><div><b>'+caption(i.kind)+'</b><span>'+esc(i.number)+'</span></div></header><div class="q-meta"><span>Émission · '+dateLabel(i.issued)+'</span><span>Échéance · '+dateLabel(i.due)+'</span></div><div class="q-parties"><section><small>Entreprise</small>'+party(i.company)+'</section><section><small>Client</small>'+party(i.client)+'</section></div><section class="q-title"><small>Devis '+esc(i.quote)+'</small><h2>'+esc(i.title)+'</h2><p>'+esc(i.site)+'</p></section><p>Prestation ou versement du '+dateLabel(i.service)+'</p><p>'+esc(i.details)+'</p><h3>Prestations du devis de référence</h3><table class="q-items"><thead><tr><th>Désignation</th><th>Quantité</th><th>PU HT</th><th>TVA</th></tr></thead><tbody>'+rows+'</tbody></table><p>Montant contractuel TTC · '+euros(i.quoteTotal)+(i.discount?' · Remise du devis '+esc(i.discount/100)+' %':'')+'</p>'+i.prior.map(p=>'<div>Déjà facturé · '+esc(p.number)+' · '+euros(p.total)+'</div>').join('')+'<h3>Montants de cette facture</h3><table class="q-items"><thead><tr><th>Taux</th><th>Base HT</th><th>TVA</th></tr></thead><tbody>'+i.taxes.map(t=>'<tr><td>'+esc(t.rate/100)+' %</td><td>'+euros(t.base)+'</td><td>'+euros(t.amount)+'</td></tr>').join('')+'</tbody></table><div class="q-sum"><div><span>Total HT</span><b>'+euros(i.taxes.reduce((v,t)=>v+t.base,0))+'</b></div><div class="q-grand"><strong>Total TTC</strong><strong>'+euros(i.total)+'</strong></div></div><h3>Conditions de règlement</h3><p class="preserve">'+esc(i.terms)+'</p></article>';
}
export async function billingDialog(d, { kind, delivery = false, gmail, active = () => true } = {}) {
  let book = await api('billing/' + d.id);
  if (!active()) return false;
  const remaining = () => book.total - book.billed;
  const canIssue = () => d.status === 'Accepté' && remaining() > 0;
  const action = name => $('#modal [data-act="' + name + '"]');
  const hint = text => '<p class="hint">' + esc(text) + '</p>';

  function show(feedback = '') {
    const overview = [['Devis TTC', book.total], ['Facturé', book.billed], ['Encaissé', book.paid], ['Reste à facturer', remaining()]];
    dialog('Factures et règlements', '<p>' + esc(d.number) + ' · ' + esc(d.title) + '</p>' +
      (feedback ? hint(feedback) : '') +
      '<div class="bill-stats">' + overview.map(([label, value]) => '<div><small>' + label + '</small><strong>' + euros(value) + '</strong></div>').join('') + '</div>' +
      book.invoices.map(i => '<section class="bill-entry"><div><strong>' + esc(i.number) + ' · ' + caption(i.kind) +
        '</strong><p>' + euros(i.total) + ' TTC · ' + (paid(i) === i.total ? 'Soldée' : 'À encaisser ' + euros(i.total - paid(i))) +
        '</p></div><div>' + button('view-' + i.seq, 'Ouvrir') +
        (paid(i) < i.total ? button('pay-' + i.seq, 'Saisir un règlement') : '') + '</div></section>').join('') +
      (canIssue() ? button('issue', 'Créer une facture', 'plus', 'primary') : ''));
    for (const i of book.invoices) {
      action('view-' + i.seq).onclick = () => view(i);
      const settle = action('pay-' + i.seq);
      if (settle) settle.onclick = () => payment(i);
    }
    const create = action('issue');
    if (create) create.onclick = () => issue();
  }

  function back() {
    action('ledger').onclick = () => show();
  }

  function view(i) {
    const notice = {
      'préparation': 'Un envoi par Gmail est en cours.',
      'à vérifier': 'Résultat de l’envoi incertain. Consultez le dossier Envoyés de Gmail.',
      'envoyé': 'Facture envoyée par Gmail.'
    }[i.mailState];
    const review = gmail !== undefined && !i.mailState
      ? button('prepareInvoiceMail', 'Préparer l’envoi Gmail', 'arrow', delivery ? 'primary' : '') : '';
    dialog(i.number, '<div class="actions">' + button('ledger', 'Revenir au suivi du devis', 'back') +
      button('printBill', 'Imprimer / PDF', 'print') + review + '</div>' +
      (notice ? hint(notice) : '') + invoicePaper(i) + '<h3>Règlements reçus</h3>' +
      i.payments.map(p => '<p>' + dateLabel(p.day) + ' · ' + esc(p.method) + ' · ' + euros(p.amount) + '</p>').join(''));
    back();
    if (review) action('prepareInvoiceMail').onclick = () => reviewMail(i);
    action('printBill').onclick = () => {
      const copy = document.createElement('div');
      copy.className = 'invoice-print';
      copy.innerHTML = invoicePaper(i);
      document.body.append(copy);
      document.body.classList.add('printing-invoice');
      const clean = () => { copy.remove(); document.body.classList.remove('printing-invoice'); };
      window.addEventListener('afterprint', clean, { once: true });
      try { window.print(); } catch (error) { clean(); throw error; }
    };
  }

  function reviewMail(i) {
    const to = i.client.email;
    const message = 'Bonjour,\n\nVous trouverez en pièce jointe la facture ' + i.number +
      ' liée au devis ' + i.quote + '.\n\nCordialement,\n' + i.company.name;
    dialog('Vérifier l’envoi de la facture', button('backInvoice', 'Revenir à la facture', 'back') +
      '<p>' + caption(i.kind) + ' · ' + esc(i.number) + ' · ' + esc(i.client.name) + ' · ' + euros(i.total) + ' TTC</p>' +
      '<form id="invoiceMailForm">' + input('Destinataire', 'to', to, 'email', 'readonly') +
      input('Objet', 'subject', invoiceMailSubject(i), 'text', 'readonly') +
      area('Message accompagnant le PDF', 'message', message) + '<p>Pièce jointe ' + esc(i.number) + '.pdf</p>' +
      (!gmail ? hint('Configurez Gmail sur le serveur pour activer l’envoi.') : '') +
      (!to ? hint('Cette facture ne contient pas d’adresse e-mail. Vous pouvez imprimer son PDF.') : '') +
      '<button class="primary">Envoyer la facture par Gmail</button></form>');
    action('backInvoice').onclick = () => view(i);
    const form = $('#invoiceMailForm');
    form.elements.message.required = true;
    form.elements.message.maxLength = 4000;
    const submit = form.querySelector('button');
    submit.disabled = !gmail || !to;
    onForm('#invoiceMailForm', async values => {
      if (!gmail || !to) return;
      if (!confirm('Envoyer ' + i.number + ' à ' + to + ' avec son PDF ?')) return;
      book = await api('invoice/mail', { id: d.id, seq: i.seq, to, message: values.message, confirm: true });
      view(book.invoices.find(invoice => invoice.seq === i.seq));
      toast('Facture envoyée par Gmail.', 'sent');
    });
  }

  function issue(requestedKind) {
    const remain = remaining();
    const [deposit, progress] = installments(book.total, d.deposit, d.edition?.middle || 0);
    const next = deposit > book.billed ? deposit - book.billed : deposit + progress > book.billed ? deposit + progress - book.billed : remain;
    const selected = requestedKind || (next === remain ? 'Solde' : book.billed ? 'Situation' : 'Acompte');
    const suggested = requestedKind === 'Solde' ? remain : requestedKind === 'Acompte' ? deposit :
      requestedKind === 'Situation' ? progress : next;
    const amount = suggested > 0 && (selected === 'Solde' || suggested < remain) ? suggested / 100 : '';
    const key = crypto.randomUUID();
    const previous = book.invoices.at(-1);
    dialog('Créer une facture', button('ledger', 'Retour au suivi', 'back') +
      (delivery ? hint('Vérifiez les données de la facture avant de l’émettre. Vous pourrez préparer l’envoi ensuite.') : '') +
      '<form id="issueForm">' + select('Type de facture', 'kind', kinds.map(value => [value, value]), selected) +
      input('Montant TTC (€)', 'amount', amount, 'number', 'required min=".01" max="' + remain / 100 + '" step=".01"') +
      input('Date de prestation ou de versement', 'service', today(), 'date', 'required') +
      input('Échéance', 'due', today(30), 'date', 'required') +
      input('Adresse de facturation du client', 'address', previous?.client.address || d.client.address || '', 'text', 'required maxlength="450"') +
      '<details><summary>Identifiants et coordonnées de facturation</summary>' +
      input('Identification du client professionnel, SIREN et TVA si applicable', 'clientIdentity', previous?.client.identity || '') +
      input('Adresse de l’entreprise', 'sellerAddress', previous?.company.address || d.company.address) +
      area('Identifiants de l’entreprise, dont TVA si applicable', 'sellerIdentity', previous?.company.identity || d.company.identity) + '</details>' +
      area('Travaux ou étape facturée', 'details') +
      area('Conditions de règlement et mentions applicables au client', 'terms', d.edition?.payment || 'Règlement par virement bancaire.') +
      '<button class="primary">Émettre et numéroter</button></form>');
    back();
    const form = $('#issueForm');
    form.elements.kind.onchange = () => {
      if (form.elements.kind.value === 'Solde') form.elements.amount.value = remain / 100;
    };
    onForm('#issueForm', async values => {
      if (!confirm('Émettre définitivement cette facture de ' + values.amount + ' € TTC ?')) return;
      book = await api('invoice', { ...values, id: d.id, amount: Math.round(Number(values.amount) * 100), count: book.invoices.length, request: key });
      const issued = book.invoices.find(invoice => invoice.seq === book.issuedInvoiceSeq);
      if (delivery && issued) view(issued);
      else show();
      toast('Facture émise.');
    });
  }

  function payment(i) {
    const left = i.total - paid(i);
    const key = crypto.randomUUID();
    dialog('Règlement · ' + i.number, button('ledger', 'Retour au suivi', 'back') + '<form id="paymentForm">' +
      input('Montant reçu (€)', 'amount', left / 100, 'number', 'required min=".01" max="' + left / 100 + '" step=".01"') +
      input('Date d’encaissement', 'day', today(), 'date', 'required') +
      select('Mode de paiement', 'method', ['Virement', 'Chèque', 'Carte', 'Espèces'].map(value => [value, value]), 'Virement') +
      '<button class="primary">Enregistrer le règlement</button></form>');
    back();
    onForm('#paymentForm', async values => {
      book = await api('payment', { ...values, id: d.id, seq: i.seq, amount: Math.round(Number(values.amount) * 100), request: key });
      show();
    });
  }

  if (kinds.includes(kind)) {
    const matches = book.invoices.filter(invoice => invoice.kind === kind);
    if (matches.length === 1) view(matches[0]);
    else if (matches.length > 1) show('Plusieurs factures correspondent. Ouvrez celle que vous souhaitez traiter.');
    else if (canIssue()) issue(kind);
    else show(d.status === 'Accepté' ? 'Le devis est déjà entièrement facturé.' : 'Le devis doit être accepté pour émettre une nouvelle facture.');
  } else show(delivery ? 'Ouvrez une facture pour vérifier son destinataire et préparer son envoi.' : '');
  return true;
}
