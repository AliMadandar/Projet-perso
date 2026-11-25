import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openStore} from '../src/store.js';
import {workspace} from '../src/workspace.js';
import {correspondence} from '../src/correspondance.js';

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
