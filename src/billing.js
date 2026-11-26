import {amounts} from '../web/money.js';
import {uuid,fail,num,str} from './workspace.js';
export const invoiceMailPrefix = 'facture-';
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris'}).format(new Date());
function day(v){
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail('Date incorrecte.');
 return v;
}
// Ventilation du TTC demandé entre les bases et TVA restantes au plus fort reste.
function allocate(target,weights){
 const sum=BigInt(weights.reduce((a,b)=>a+b,0)),parts=weights.map((w,i)=>{
 const product=BigInt(w)*BigInt(target);return {i,value:Number(product/sum),rest:product%sum};
 });
 const missing=target-parts.reduce((n,p)=>n+p.value,0);
 const order=[...parts].sort((a,b)=>a.rest===b.rest?a.i-b.i:a.rest>b.rest?-1:1);
 for(const p of order.slice(0,missing))p.value++;
 return parts.map(p=>p.value);
}
export function billing(w){
 function ledger(id){
  const d=w.findDoc(uuid(id)),rows=w.all(
    'SELECT i.*, m.state AS mailState FROM invoices i LEFT JOIN mail_actions m ON m.id=? || i.seq WHERE i.document_id=? ORDER BY i.seq',
    invoiceMailPrefix, id
  );
  const invoices=rows.map(r=>({...JSON.parse(r.data),seq:r.seq,number:'FAC-'+String(r.seq).padStart(6,'0'),mailState:r.mailState,payments:w.all('SELECT amount,day,method FROM settlements WHERE invoice=? ORDER BY day,rowid',r.seq)}));
  const total=amounts(d.lines,d.discount).total,billed=invoices.reduce((v,i)=>v+i.total,0),paid=invoices.reduce((v,i)=>v+i.payments.reduce((s,p)=>s+p.amount,0),0);
  return {invoices,total,billed,paid};
 }
 function issue(o,actor){return w.atomic(()=>{
  const d=w.findDoc(uuid(o.id)),key=uuid(o.request),existing=w.get('SELECT seq,document_id FROM invoices WHERE request_id=?',key);
  if(existing){if(existing.document_id!==d.id)fail('Référence déjà utilisée.',409);return {...ledger(d.id),issuedInvoiceSeq:existing.seq};}
  if(d.status!=='Accepté')fail('Acceptez le devis avant de facturer.',409);
  const book=ledger(d.id),remaining=book.total-book.billed;
  if(book.invoices.length!==o.count||!remaining)fail('Facturation modifiée ou terminée. Rouvrez le suivi.',409);
  const total=num(o.amount,1,remaining),kind=str(o.kind,18);
  if(!['Acompte','Situation','Solde'].includes(kind)||((kind==='Solde')!==(total===remaining)))fail('Le solde doit correspondre exactement au montant restant.');
  const issued=today(),due=day(o.due),service=day(o.service);
  if(due<issued||service>issued)fail('Vérifiez la date de prestation et l’échéance.');
  const client={...d.client,address:str(o.address||d.client.address,450),identity:str(o.clientIdentity||'',400)};
  const company={...d.company,address:str(o.sellerAddress||d.company.address,450),identity:str(o.sellerIdentity||d.company.identity,800)};
  if(!client.address||!company.address||!company.identity)fail('Coordonnées de facturation incomplètes sur le devis : adresse du client, adresse et identification de l’entreprise requises.');
  const terms=str(o.terms,2000);if(!terms)fail('Renseignez les conditions de règlement.');
  const taxes=amounts(d.lines,d.discount).taxes.map(g=>({...g}));
  for(const inv of book.invoices)inv.taxes.forEach((g,i)=>{taxes[i].base-=g.base;taxes[i].amount-=g.amount;});
  const shares=allocate(total,taxes.flatMap(g=>[g.base,g.amount]));
  taxes.forEach((g,i)=>{g.base=shares[2*i];g.amount=shares[2*i+1];});
  const data={kind,total,taxes,terms,due,service,issued,client,company,logo:d.edition?.logo||'',site:d.site,title:d.title,quote:d.number,quoteId:d.id,quoteTotal:book.total,lines:d.lines,discount:d.discount,prior:book.invoices.map(i=>({number:i.number,total:i.total})),details:str(o.details||'',2000)};
  const inserted=w.run('INSERT INTO invoices(document_id,request_id,data) VALUES(?,?,?)',d.id,key,JSON.stringify(data));
  w.event(actor,'Facture émise · '+kind,d.id);return {...ledger(d.id),issuedInvoiceSeq:Number(inserted.lastInsertRowid)};
 });}
 function payment(o,actor){return w.atomic(()=>{
  const id=uuid(o.id),key=uuid(o.request),book=ledger(id),inv=book.invoices.find(i=>i.seq===o.seq);
  if(!inv)fail('Facture introuvable.',404);
  const previous=w.get('SELECT invoice FROM settlements WHERE request_id=?',key);
  if(previous){if(previous.invoice!==inv.seq)fail('Référence déjà utilisée.',409);return book;}
  const amount=num(o.amount,1,inv.total-inv.payments.reduce((v,p)=>v+p.amount,0)),method=str(o.method,50),when=day(o.day);
  if(when>today()||!['Virement','Chèque','Carte','Espèces'].includes(method))fail('Vérifiez la date et le mode de règlement.');
  w.run('INSERT INTO settlements VALUES(?,?,?,?,?)',key,inv.seq,amount,when,method);w.event(actor,'Règlement enregistré · '+inv.number,id);return ledger(id);
 });}
 return {ledger,issue,payment};
}
