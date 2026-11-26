import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openStore} from '../src/store.js';
import {workspace} from '../src/workspace.js';
import {correspondence} from '../src/correspondance.js';
import {billing} from '../src/billing.js';

test('envoi Gmail simulé avec PDF, rappel modifiable et absence de double envoi',async()=>{
 const store=openStore(':memory:'),w=workspace(store.db),messages=[];
 try{
   const d=w.save({id:randomUUID(),version:0,title:'Cuisine',issued:'2026-01-01',valid:'2099-02-01',client:{name:'Exemple',email:'exemple@example.org'},discount:0,deposit:4000,lines:[{label:'Pose',unit:'m²',price:4000,quantity:200,tax:1000,tier:0}]},'Test');
   w.status(d.id,'Validé',1,'Test');
   const mock=async(url,options)=>{
     if(url.endsWith('/token'))return Response.json({access_token:'test'});
     messages.push(Buffer.from(JSON.parse(options.body).raw,'base64url').toString());
     return Response.json({id:'mail-test'});
   };
   const mail=correspondence(w,{GMAIL_CLIENT_ID:'test',GMAIL_CLIENT_SECRET:'test',GMAIL_REFRESH_TOKEN:'test'},mock,async()=>Buffer.from('%PDF-test'));
   const send={id:d.id,message:'Bonjour, voici le devis.',kind:'devis',confirm:true};
   assert.equal((await mail.send(send,'Test')).document.status,'Envoyé');
   await assert.rejects(mail.send(send,'Test'));
   let r=mail.reminder({id:d.id,due:'2027-01-05',message:'Premier rappel',version:0},'Test');
   r=mail.reminder({...r,due:'2027-01-06',message:'Deuxième texte'},'Test');
   assert.equal(messages.length,1);assert.match(messages[0],/Content-Type: application\/pdf/);
   await mail.send({...send,kind:'relance',version:r.version,message:r.message},'Test');
   assert.equal(mail.reminders()[0].completed,1);assert.equal(messages.length,2);
 }finally{store.close();}
});

test('envoi d’une facture à son destinataire figé et protection contre les renvois', async () => {
  const store = openStore(':memory:');
  const w = workspace(store.db);
  const accounts = billing(w);
  const messages = [];
  const renders = [];
  try {
    const quote = w.save({
      id: randomUUID(), version: 0, title: 'Cuisine', issued: '2026-01-01', valid: '2099-02-01',
      client: { name: 'Client test', address: 'Marseille', email: 'facture@example.org' },
      discount: 0, deposit: 4000, lines: [{ label: 'Pose', unit: 'm²', price: 4000, quantity: 200, tax: 1000, tier: 0 }]
    }, 'Test');
    for (const [version, status] of ['Validé', 'Envoyé', 'Accepté'].entries()) {
      w.status(quote.id, status, version + quote.version, 'Test');
    }
    const issue = { id: quote.id, request: randomUUID(), count: 0, kind: 'Acompte', amount: 3500,
      due: '2099-02-01', service: '2026-01-01', terms: 'Par virement' };
    const { issuedInvoiceSeq: seq } = accounts.issue(issue, 'Test');
    const { issuedInvoiceSeq: otherSeq } = accounts.issue({ ...issue, request: randomUUID(), count: 1,
      kind: 'Situation', amount: 2000 }, 'Test');
    assert.equal(accounts.issue(issue, 'Test').issuedInvoiceSeq, seq);
    const fetcher = async (url, options) => {
      if (url.endsWith('/token')) return Response.json({ access_token: 'test' });
      messages.push(Buffer.from(JSON.parse(options.body).raw, 'base64url').toString());
      return messages.length === 1 ? Response.json({ id: 'test-acompte' }) : new Response(null, { status: 503 });
    };
    const render = async (document, kind) => {
      renders.push([document.seq, kind]);
      return Buffer.from('%PDF-test');
    };
    const mail = correspondence(w, { GMAIL_CLIENT_ID: 'test', GMAIL_CLIENT_SECRET: 'test', GMAIL_REFRESH_TOKEN: 'test' }, fetcher, render);
    const request = { id: quote.id, seq, to: 'facture@example.org', message: 'Voici la facture émise.', confirm: true };
    await assert.rejects(mail.sendInvoice({ ...request, confirm: false }, 'Test'), /Confirmez/);
    await assert.rejects(mail.sendInvoice({ ...request, to: 'autre@example.org' }, 'Test'), /Confirmez/);
    await assert.rejects(mail.sendInvoice({ ...request, seq: otherSeq + 1 }, 'Test'), /Facture introuvable/);
    assert.equal(messages.length, 0);

    const sending = mail.sendInvoice(request, 'Test');
    await assert.rejects(mail.sendInvoice(request, 'Test'), /Envoi déjà enregistré/);
    const ledger = await sending;
    assert.equal(ledger.invoices[0].mailState, 'envoyé');
    assert.match(messages[0], /^To: facture@example\.org\r\n/);
    assert.match(messages[0], /filename="FAC-000001\.pdf"/);
    assert.deepEqual(renders, [[seq, 'facture']]);
    assert.equal(w.findDoc(quote.id).status, 'Accepté');
    await assert.rejects(mail.sendInvoice(request, 'Test'), /Envoi déjà enregistré/);

    const next = { ...request, seq: otherSeq };
    await assert.rejects(mail.sendInvoice(next, 'Test'), /Gmail a répondu 503/);
    assert.equal(accounts.ledger(quote.id).invoices[1].mailState, 'à vérifier');
    await assert.rejects(mail.sendInvoice(next, 'Test'), /Envoi déjà enregistré/);
    assert.equal(messages.length, 2);
  } finally {
    store.close();
  }
});
