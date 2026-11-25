import { paper } from './editor.js';
import { $, api, button, esc, input, onForm, select, status } from './ui.js';
const token = location.hash.slice(1);
async function render() {
  const {
    document: d,
    reply,consent,digest
  } = await api('portal', {
    token
  });
  const ink=[];
  const main = $('#clientView');
  main.innerHTML = '<section class="clienttools">' + status(d.status) + button('print', 'Imprimer / PDF', 'print') + '</section>' + paper(d) + (reply ? '<div class="card pad clienttools"><b>Réponse enregistrée</b><p>' + esc(reply.decision) + ' · ' + esc(reply.name) + ' · ' + esc(new Date(reply.at).toLocaleDateString('fr-FR')) + '</p></div>' : d.status === 'Envoyé' ? '<form class="card pad clienttools" id="decision"><h2>Votre réponse</h2>' + input('Votre nom complet', 'name', '', 'text', 'required maxlength="120"') + select('Décision', 'decision', [['', 'Choisir…'], ['Accepté', 'Signer et accepter le devis'], ['Refusé', 'Refuser le devis']], '') + '<div id="inkArea" hidden><label>Tracer votre signature au doigt ou à la souris (facultatif)</label><canvas id="ink" width="480" height="128" aria-label="Zone de signature manuscrite"></canvas>'+button('erase','Effacer le tracé')+'</div><label class="agree"><input type="checkbox" required><span id="consentText">Je confirme ma décision pour ce devis.</span></label><button class="primary">Transmettre ma réponse</button></form>' : '');
  $('[data-act=print]').onclick = () => window.print();
  const canvas=$('#ink');
  if(canvas){
    const ctx=canvas.getContext('2d');let current=null;
    function point(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(480,Math.round((e.clientX-r.left)*480/r.width))),Math.max(0,Math.min(128,Math.round((e.clientY-r.top)*128/r.height)))];}
    canvas.onpointerdown=e=>{if(!e.isPrimary||ink.length>=30)return;canvas.setPointerCapture(e.pointerId);current=[point(e)];ink.push(current);ctx.lineWidth=2.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...current[0]);};
    canvas.onpointermove=e=>{if(!e.isPrimary||!current||current.length>=400)return;const p=point(e);current.push(p);ctx.lineTo(...p);ctx.stroke();};
    canvas.onpointerup=canvas.onpointercancel=()=>{if(current?.length===1)ink.pop();current=null;};
    $('[data-act=erase]').onclick=()=>{ink.length=0;current=null;ctx.clearRect(0,0,480,128);};
  }
  if($('#decision'))$('[name=decision]').onchange=e=>{
    const signing=e.target.value==='Accepté';
    $('#decision [type=checkbox]').checked=false;
    $('#inkArea').hidden=!signing;
    $('#consentText').textContent=signing?consent:'Je confirme mon refus de ce devis.';
    $('#decision button.primary').textContent=signing?'Signer le devis':'Transmettre ma réponse';
  };
  if ($('#decision')) onForm('#decision', async o => {
    await api('portal', {
      token,
      ...o,
      confirm: true, consent,digest,ink
    });
    await render();
  });
}
render().catch(e => {
  $('#clientView').textContent = e.message;
});
