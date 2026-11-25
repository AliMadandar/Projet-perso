import { $,esc,button,dialog,input,select,area,api,onForm,today,dateLabel,toast } from './ui.js';
import {euros} from './money.js';
import {installments} from './edition.js';
const paid=i=>i.payments.reduce((n,p)=>n+p.amount,0);
const caption=k=>k==='Solde'?'Facture de solde':k==='Acompte'?'Facture d’acompte':'Facture de situation';
export function invoicePaper(i){
 const party=c=>[c.name,c.address,c.identity,c.email,c.phone].filter(Boolean).map(esc).join('<br>');
 const rows=i.lines.map(l=>'<tr><td>'+esc(l.label)+'</td><td>'+esc(l.quantity/100)+' '+esc(l.unit)+'</td><td>'+euros(l.price)+'</td><td>'+esc(l.tax/100)+' %</td></tr>').join('');
 return '<article class="sheet couture tone-ambre invoice"><header class="q-head"><div class="q-brand"><img src="'+esc(i.logo||'/ma-logo.png')+'" alt=""><b>'+esc(i.company.name)+'</b></div><div><b>'+caption(i.kind)+'</b><span>'+esc(i.number)+'</span></div></header><div class="q-meta"><span>Émission · '+dateLabel(i.issued)+'</span><span>Échéance · '+dateLabel(i.due)+'</span></div><div class="q-parties"><section><small>Entreprise</small>'+party(i.company)+'</section><section><small>Client</small>'+party(i.client)+'</section></div><section class="q-title"><small>Devis '+esc(i.quote)+'</small><h2>'+esc(i.title)+'</h2><p>'+esc(i.site)+'</p></section><p>Prestation ou versement du '+dateLabel(i.service)+'</p><p>'+esc(i.details)+'</p><h3>Prestations du devis de référence</h3><table class="q-items"><thead><tr><th>Désignation</th><th>Quantité</th><th>PU HT</th><th>TVA</th></tr></thead><tbody>'+rows+'</tbody></table><p>Montant contractuel TTC · '+euros(i.quoteTotal)+(i.discount?' · Remise du devis '+esc(i.discount/100)+' %':'')+'</p>'+i.prior.map(p=>'<div>Déjà facturé · '+esc(p.number)+' · '+euros(p.total)+'</div>').join('')+'<h3>Montants de cette facture</h3><table class="q-items"><thead><tr><th>Taux</th><th>Base HT</th><th>TVA</th></tr></thead><tbody>'+i.taxes.map(t=>'<tr><td>'+esc(t.rate/100)+' %</td><td>'+euros(t.base)+'</td><td>'+euros(t.amount)+'</td></tr>').join('')+'</tbody></table><div class="q-sum"><div><span>Total HT</span><b>'+euros(i.taxes.reduce((v,t)=>v+t.base,0))+'</b></div><div class="q-grand"><strong>Total TTC</strong><strong>'+euros(i.total)+'</strong></div></div><h3>Conditions de règlement</h3><p class="preserve">'+esc(i.terms)+'</p></article>';
}
export async function billingDialog(d){
 let book=await api('billing/'+d.id);
 function show(){
  const outstanding=book.total-book.billed,overview=[['Devis TTC',book.total],['Facturé',book.billed],['Encaissé',book.paid],['Reste à facturer',outstanding]];
  dialog('Factures et règlements','<p>'+esc(d.number)+' · '+esc(d.title)+'</p><div class="bill-stats">'+overview.map(([k,v])=>'<div><small>'+k+'</small><strong>'+euros(v)+'</strong></div>').join('')+'</div>'+book.invoices.map(i=>'<section class="bill-entry"><div><strong>'+esc(i.number)+' · '+caption(i.kind)+'</strong><p>'+euros(i.total)+' TTC · '+(paid(i)===i.total?'Soldée':'À encaisser '+euros(i.total-paid(i)))+'</p></div><div>'+button('view-'+i.seq,'Ouvrir')+(paid(i)<i.total?button('pay-'+i.seq,'Saisir un règlement'):'')+'</div></section>').join('')+(outstanding&&d.status==='Accepté'?button('issue','Créer une facture','plus','primary'):''));
  for(const i of book.invoices){$('#modal [data-act=view-'+i.seq+']').onclick=()=>view(i);const b=$('#modal [data-act=pay-'+i.seq+']');if(b)b.onclick=()=>payment(i);}
  const b=$('#modal [data-act=issue]');if(b)b.onclick=issue;
 }
 function back(){const b=$('#modal [data-act=ledger]');if(b)b.onclick=show;}
 function view(i){
  dialog(i.number,button('ledger','Revenir au suivi du devis','back')+button('printBill','Imprimer / PDF','print')+invoicePaper(i)+'<h3>Règlements reçus</h3>'+i.payments.map(p=>'<p>'+dateLabel(p.day)+' · '+esc(p.method)+' · '+euros(p.amount)+'</p>').join(''));
  back();$('#modal [data-act=printBill]').onclick=()=>{
    const copy=document.createElement('div');copy.className='invoice-print';copy.innerHTML=invoicePaper(i);document.body.append(copy);document.body.classList.add('printing-invoice');
    const clean=()=>{copy.remove();document.body.classList.remove('printing-invoice');};window.addEventListener('afterprint',clean,{once:true});try{window.print();}catch(e){clean();throw e;}
  };
 }
 function issue(){
  const remain=book.total-book.billed,schedule=installments(book.total,d.deposit,d.edition?.middle||0);
  const next=schedule[0]>book.billed?schedule[0]-book.billed:schedule[0]+schedule[1]>book.billed?schedule[0]+schedule[1]-book.billed:remain;
  const kind=next===remain?'Solde':book.billed?'Situation':'Acompte',key=crypto.randomUUID();
  dialog('Créer une facture',button('ledger','Retour au suivi','back')+'<form id="issueForm">'+select('Type de facture','kind',['Acompte','Situation','Solde'].map(x=>[x,x]),kind)+input('Montant TTC (€)','amount',next/100,'number','required min=".01" max="'+remain/100+'" step=".01"')+input('Date de prestation ou de versement','service',today(),'date','required')+input('Échéance','due',today(30),'date','required')+input('Adresse de facturation du client','address',book.invoices.at(-1)?.client.address||d.client.address||'','text','required maxlength="450"')+'<details><summary>Identifiants et coordonnées de facturation</summary>'+input('Identification du client professionnel, SIREN et TVA si applicable','clientIdentity',book.invoices.at(-1)?.client.identity||'')+input('Adresse de l’entreprise','sellerAddress',book.invoices.at(-1)?.company.address||d.company.address)+area('Identifiants de l’entreprise, dont TVA si applicable','sellerIdentity',book.invoices.at(-1)?.company.identity||d.company.identity)+'</details>'+area('Travaux ou étape facturée','details','')+area('Conditions de règlement et mentions applicables au client','terms',d.edition?.payment||'Règlement par virement bancaire.')+'<button class="primary">Émettre et numéroter</button></form>');back();
  const f=$('#issueForm');f.elements.kind.onchange=()=>{if(f.elements.kind.value==='Solde')f.elements.amount.value=remain/100;};
  onForm('#issueForm',async o=>{if(!confirm('Émettre définitivement cette facture de '+o.amount+' € TTC ?'))return;book=await api('invoice',{...o,id:d.id,amount:Math.round(Number(o.amount)*100),count:book.invoices.length,request:key});show();toast('Facture émise.');});
 }
 function payment(i){
  const left=i.total-paid(i),key=crypto.randomUUID();
  dialog('Règlement · '+i.number,button('ledger','Retour au suivi','back')+'<form id="paymentForm">'+input('Montant reçu (€)','amount',left/100,'number','required min=".01" max="'+left/100+'" step=".01"')+input('Date d’encaissement','day',today(),'date','required')+select('Mode de paiement','method',['Virement','Chèque','Carte','Espèces'].map(x=>[x,x]),'Virement')+'<button class="primary">Enregistrer le règlement</button></form>');back();
  onForm('#paymentForm',async o=>{book=await api('payment',{...o,id:d.id,seq:i.seq,amount:Math.round(Number(o.amount)*100),request:key});show();});
 }
 show();
}
