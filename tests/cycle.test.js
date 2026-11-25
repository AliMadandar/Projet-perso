import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {openStore} from '../src/store.js';
import {workspace} from '../src/workspace.js';
import {portal} from '../src/portal.js';
import {billing} from '../src/billing.js';
import {amounts} from '../web/money.js';
import {paper} from '../web/editor.js';
test('devis signé puis facturé en trois fois, TVA mixte et règlements partiels',()=>{
 const db=openStore(':memory:'),w=workspace(db.db),p=portal(w),b=billing(w);
 try{
 const lines=[{price:2999,tax:1000},{price:1703,tax:2000}].map(x=>({...x,label:'Préparation',quantity:213,tier:0,unit:'m²'}));
 const d=w.save({id:randomUUID(),version:0,client:{name:'Exemple',address:'Marseille'},title:'Rénovation',site:'A',issued:'2026-01-01',valid:'2099-01-01',discount:333,deposit:4000,lines},'Test');
 w.status(d.id,'Validé',d.version,'Test');const key=p.create(d.id,'Test').path.split('#')[1];w.status(d.id,'Envoyé',d.version+1,'Test');
 const view=p.view(key),reply={name:'Client',confirm:true,decision:'Accepté',consent:view.consent,digest:view.digest,ink:[[[12,10],[15,12]]]};
 assert.throws(()=>p.reply(key,{...reply,digest:'périmé'}));p.reply(key,reply);assert.throws(()=>p.reply(key,reply));
 assert.match(paper(w.findDoc(d.id)),/Signé électroniquement/);
 const signed=w.get('SELECT snapshot FROM signatures WHERE document_id=?',d.id);assert.equal(createHash('sha256').update(signed.snapshot).digest('hex'),view.digest);
 const make=(count,amount,kind)=>({id:d.id,request:randomUUID(),count,amount,kind,terms:'Virement',due:'2099-01-01',service:'2026-01-01'});
 const one=make(0,467,'Acompte');const x=b.issue(one,'Test');assert.equal(b.issue(one,'Test').invoices.length,1);
 assert.throws(()=>b.issue(make(0,20,'Situation'),'Test'));
 const payment={id:d.id,seq:x.invoices[0].seq,request:randomUUID(),amount:250,method:'Carte',day:'2026-01-01'};
 assert.equal(b.payment(payment,'Test').paid,250);assert.equal(b.payment(payment,'Test').paid,250);
 assert.throws(()=>b.payment({...payment,request:randomUUID(),amount:330},'Test'));
 b.issue(make(1,2051,'Situation'),'Test');
 const y=b.issue(make(2,x.total-2518,'Solde'),'Test');assert.equal(y.billed,y.total);assert.equal(y.paid,250);assert.equal(y.invoices[2].prior.length,2);
 const taxes=amounts(lines,d.discount).taxes;
 taxes.forEach((t,j)=>{for(const k of ['base','amount'])assert.equal(y.invoices.reduce((v,i)=>v+i.taxes[j][k],0),t[k]);});
 assert.throws(()=>b.issue(make(3,1,'Situation'),'Test'));
 }finally{db.close();}
});
