import {randomUUID} from 'node:crypto';
import {str,num,fail,uuid} from './workspace.js';
import {exportPdf} from './exportpdf.js';
export const gmailReady=env=>!!(env.GMAIL_CLIENT_ID&&env.GMAIL_CLIENT_SECRET&&env.GMAIL_REFRESH_TOKEN);
function mime(to,subject,text,pdf,number){
 const boundary='atelier-'+randomUUID(),b64=v=>Buffer.from(v).toString('base64').match(/.{1,72}/g)?.join('\r\n')||'';
 return Buffer.from(['To: '+to,'Subject: =?UTF-8?B?'+Buffer.from(subject).toString('base64')+'?=','MIME-Version: 1.0','Content-Type: multipart/mixed; boundary="'+boundary+'"','','--'+boundary,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',b64(text),'--'+boundary,'Content-Type: application/pdf','Content-Disposition: attachment; filename="'+number+'.pdf"','Content-Transfer-Encoding: base64','',b64(pdf),'--'+boundary+'--',''].join('\r\n')).toString('base64url');
}
export function correspondence(w,env=process.env,fetcher=fetch,render=exportPdf){
 w.run("DELETE FROM mail_actions WHERE state='préparation'");
 const reminders=()=>w.all('SELECT r.document_id AS id,r.due,r.message,r.version,r.completed FROM reminders r JOIN documents d ON d.id=r.document_id WHERE d.status IN (\'Validé\',\'Envoyé\')');
 function reminder(o,actor){return w.atomic(()=>{
   const d=w.findDoc(uuid(o.id));if(!['Validé','Envoyé'].includes(d.status))fail('Validez le devis avant de planifier une relance.');
   const due=str(o.due,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(Date.parse(due))||new Date(due).toISOString().slice(0,10)!==due)fail('Date de rappel incorrecte.');
   const message=str(o.message,4000);if(!message)fail('Saisissez un message de relance.');
   const last=w.get('SELECT version FROM reminders WHERE document_id=?',d.id)?.version||0;
   if(num(o.version,0,2147483647)!==last)fail('Rappel modifié ailleurs.',409);
   w.run('INSERT INTO reminders VALUES(?,?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET due=excluded.due,message=excluded.message,version=excluded.version,completed=excluded.completed',d.id,due,message,last+1,Number(o.completed===true));w.event(actor,'Relance mise à jour',d.id);
   return {id:d.id,due,message,version:last+1,completed:Number(o.completed===true)};
 });}
 async function send(o,actor){
   if(!gmailReady(env))fail('Gmail doit être configuré dans le fichier .env du serveur.');
   const d=w.findDoc(uuid(o.id)),follow=o.kind==='relance';if(!['devis','relance'].includes(o.kind)||d.status!==(follow?'Envoyé':'Validé'))fail('Statut incompatible avec cet envoi.',409);
   const to=str(d.client.email,254);if(!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(to))fail('Renseignez une adresse e-mail valide dans le devis avant sa validation.');
   const message=str(o.message,4000);if(!message||o.confirm!==true)fail('Confirmez le destinataire et le texte.');
   const r=follow?w.get('SELECT * FROM reminders WHERE document_id=?',d.id):null;
   if(follow&&(!r||r.completed||r.version!==o.version))fail('Enregistrez votre rappel avant envoi.',409);
   if(w.get("SELECT id FROM mail_actions WHERE document_id=? AND state IN ('préparation','à vérifier')",d.id))fail('Un envoi est en cours ou son résultat doit être vérifié dans Gmail.',409);
   const id=d.id+'-'+(follow?'relance-'+r.version:'devis');
   if(!w.run("INSERT OR IGNORE INTO mail_actions VALUES(?,?,'préparation',NULL,?)",id,d.id,new Date().toISOString()).changes)fail('Envoi déjà enregistré ou à vérifier dans Gmail.',409);
   let dispatched=false;
   try{
     const pdf=await render(d);
     const token=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:env.GMAIL_CLIENT_ID,client_secret:env.GMAIL_CLIENT_SECRET,refresh_token:env.GMAIL_REFRESH_TOKEN,grant_type:'refresh_token'}),signal:AbortSignal.timeout(15000)});
     if(!token.ok)fail('Autorisation Gmail refusée. Vérifiez le consentement OAuth et les identifiants.');
     const access=(await token.json()).access_token;if(!access)fail('Gmail a retourné une autorisation vide.');
     if(w.findDoc(d.id).version!==d.version)fail('Le devis a évolué pendant la préparation.',409);
     if(follow&&w.get('SELECT version FROM reminders WHERE document_id=?',d.id)?.version!==r.version)fail('Le rappel a évolué.',409);
     w.run("UPDATE mail_actions SET state='à vérifier' WHERE id=?",id);dispatched=true;
     const result=await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({raw:mime(to,(follow?'Relance · ':'')+'MA RENOVATION · '+d.number,message,pdf,d.number)}),signal:AbortSignal.timeout(30000)});
     if(!result.ok){if(result.status<500)dispatched=false;fail('Gmail a répondu '+result.status+'. Vérifiez le compte expéditeur et les messages envoyés.');}
     const sent=await result.json();w.atomic(()=>{
       w.run("UPDATE mail_actions SET state='envoyé',gmail_id=? WHERE id=?",sent.id,id);
       if(!follow)w.run("UPDATE documents SET status='Envoyé',version=version+1,updated=? WHERE id=? AND status='Validé'",new Date().toISOString(),d.id);
       else w.run('UPDATE reminders SET completed=1 WHERE document_id=? AND version=?',d.id,r.version);
       w.event(actor,follow?'Relance envoyée via Gmail':'Devis · Envoyé',d.id);
     });return {document:w.findDoc(d.id),reminders:reminders()};
   }catch(e){if(!dispatched)w.run('DELETE FROM mail_actions WHERE id=?',id);fail(e.status?e.message:(dispatched?'Envoi incertain. Vérifiez le dossier Envoyés de Gmail avant toute autre action.':e.message),e.status||502);}
 }
 return {reminders,reminder,send};
}
