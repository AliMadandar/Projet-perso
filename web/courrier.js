import {$,dialog,onForm,input,area,button,api,toast,today} from './ui.js';
export function courrier(state,d,isReminder,update){
 let r=state.reminders?.find(x=>x.id===d.id);
 const msg=isReminder?(r?.message||'Bonjour,\n\nAvez-vous pu consulter notre devis '+d.number+' pour '+d.title+' ? Nous restons disponibles pour en discuter.\n\nMA RENOVATION'):'Bonjour,\n\nVous trouverez en pièce jointe notre devis '+d.number+' pour '+d.title+'. Nous restons disponibles pour toute précision.\n\nMA RENOVATION';
 dialog(isReminder?'Relance du client':'Envoyer le devis par Gmail','<form id="mailForm">'+input('Destinataire','to',d.client.email,'email','readonly')+(isReminder?input('Date du rappel','due',r?.due||today(7),'date','required'):'')+area('Message accompagnant le PDF','message',msg)+(isReminder?'<button>Enregistrer le rappel</button>':'')+(isReminder&&r&&!r.completed?button('finishReminder','Classer le rappel'):'')+button('dispatch',isReminder?'Envoyer la relance avec PDF':'Envoyer le PDF','arrow','primary')+'<p class="hint">'+(state.gmail?'L’envoi utilise la boîte Gmail configurée.':'Connectez votre boîte Gmail depuis la configuration serveur pour activer l’envoi.')+'</p></form>');
 const f=$('#mailForm'),send=f.querySelector('[data-act=dispatch]');
 send.disabled=!state.gmail||!d.client.email||(isReminder&&d.status!=='Envoyé');
 const save=async completed=>{r=await api('reminder',{id:d.id,due:f.elements.due.value,message:f.elements.message.value,version:r?.version||0,completed});state.reminders=[...(state.reminders||[]).filter(x=>x.id!==d.id),r];};
 onForm('#mailForm',async()=>{if(isReminder){await save(false);$('#modal').close();toast('Rappel enregistré.');}});
 const finish=f.querySelector('[data-act=finishReminder]');if(finish)finish.onclick=async()=>{try{await save(true);$('#modal').close();toast('Rappel classé.');}catch(e){toast(e.message);}};
 send.onclick=async()=>{if(!f.reportValidity()||!confirm('Envoyer maintenant '+d.number+' avec son PDF à '+d.client.email+' ?'))return;send.disabled=true;
   try{if(isReminder)await save(false);const result=await api('mail',{id:d.id,kind:isReminder?'relance':'devis',message:f.elements.message.value,confirm:true,version:r?.version});state.reminders=result.reminders;$('#modal').close();update(result.document);toast(isReminder?'Relance envoyée avec le PDF.':'Devis envoyé par Gmail avec le PDF.',isReminder?undefined:'sent');}
   catch(e){toast(e.message);}finally{send.disabled=false;}
 };
}
