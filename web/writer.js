import { $, esc, select, input, button, dialog, api } from './ui.js';
export function localRewrite(raw,tone){
  let s=raw.trim().replace(/\s+/g,' ').replace(/\bm(?:2|ètre[s]? carr[ée]s?)\b/gi,'m²')
    .replace(/\bje (?:souhaite|veux) (?:faire )?poser\b/gi,'pose de').replace(/\bon (?:va )?pose(?:r)?\b/gi,'pose de')
    .replace(/\bon (?:va )?enl[eè]ve(?:r)?\b/gi,'dépose de').replace(/\bon (?:va )?pein(?:t|dre)\b/gi,'mise en peinture de')
    .replace(/\ble client (?:fournit|achète) (.+?)(?=[.;]|$)/gi,'$1 à la charge du client')
    .replace(/\b(?:et puis|ensuite on)\b/gi,'puis').replace(/\bde (les|le)\b/g,(_m,v)=>v==='les'?'des':'du');
  if(!s)return '';
  if(tone==='Plus lisible')s=s.replace(/\s*;\s*/g,'.\n').replace(/, puis /g,'.\nPuis ');
  return s.split('\n').map(line=>line[0]?.toLocaleUpperCase('fr')+line.slice(1)).join('\n').replace(/([^.!?])$/,'$1.');
}
export function writer(state,d,apply,initialInstruction=''){
  const targets=[['title','Objet du devis'],['notes','Précisions'],['terms','Conditions particulières'],...(d.edition?[['intro','Présentation du chantier'],['spec','Détail technique']]:[]),...d.lines.map((l,i)=>['line'+i,l.label])];
  const get=k=>k.startsWith('line')?d.lines[Number(k.slice(4))].label:(d.edition?.[k]??d[k]??'');
  let target=d.edition?'intro':'notes',history=[],source=get(target),candidate='',busy=false,generation=0;
  const gemini = state.ai ? input('Consigne pour Gemini (facultative)', 'instruction', initialInstruction.slice(0,600), 'text',
    'maxlength="600" placeholder="Ex. Précise qui fournit le carrelage"') : '';
  const hint = !state.ai && state.geminiModel ? '<p class="hint">Gemini est désactivé. Retrouvez sa configuration dans Paramètres → Intégrations.</p>' : '';
  dialog('Assistant de rédaction', '<div class="writing-chat">' + select('Texte à modifier', 'target', targets, target) +
    '<div id="messages" aria-live="polite"></div><label>Texte à reformuler<textarea id="writerText" rows="4" maxlength="4000"></textarea></label>' +
    gemini + select('Style', 'tone', [['Professionnel', 'Professionnel'], ['Plus lisible', 'Plus lisible']], 'Professionnel') +
    '<div class="actions">' + button('local', 'Reformuler sur cet appareil', 'edit') +
    (state.ai ? button('gem', 'Reformuler avec Gemini', 'arrow', 'primary') : '') + '</div>' + hint +
    '<label>Proposition à relire<textarea id="suggestion" rows="4"></textarea></label>' +
    button('apply', 'Appliquer au champ choisi', 'check', 'primary wide') + '</div>');
  const root=$('#modal'),b=k=>root.querySelector('[data-act="'+k+'"]'),msg=$('#messages'),src=$('#writerText'),out=$('#suggestion');
  const refresh=()=>{
    msg.innerHTML=history.map(([who,t])=>'<p><b>'+esc(who)+'</b> '+esc(t)+'</p>').join('')+
      (busy?'<p>Reformulation en cours…</p>':'');
    msg.scrollTop=msg.scrollHeight;
    b('local').disabled=busy;
    if(b('gem'))b('gem').disabled=busy;
    b('apply').disabled=busy||!out.value.trim();
  };
  src.value=source;out.oninput=refresh;refresh();
  root.addEventListener('close',()=>generation++,{once:true});
  root.querySelector('[name=target]').onchange=e=>{generation++;target=e.target.value;source=get(target);candidate='';history=[];src.value=source;out.value='';busy=false;refresh();};
  async function ask(remote){
    const raw=src.value.trim();if(busy)return;
    if(!raw){history.push(['Assistant','Saisissez le texte à reformuler.']);refresh();return;}
    const job=++generation;
    busy=true;const tone=root.querySelector('[name=tone]').value;const instruction=root.querySelector('[name=instruction]')?.value.trim() ?? '';history.push(['Vous',remote&&instruction?instruction+' — '+raw:raw]);refresh();
    try{
      const next=remote?(await api('rewrite',{text:raw,tone,instruction})).text:localRewrite(raw,tone);
      if(job!==generation)return;
      candidate=next;out.value=candidate;src.value=candidate;history.push([remote?'Gemini':'Assistant local',candidate]);
    }catch(e){if(job===generation)history.push(['Assistant',e.message+' Vous pouvez utiliser la reformulation locale.']);}
    finally{if(job===generation){busy=false;refresh();}}
  }
  b('local').onclick=()=>ask(false);if(b('gem'))b('gem').onclick=()=>ask(true);
  b('apply').onclick=()=>{const value=out.value.trim();const max=target==='title'?160:target.startsWith('line')?250:target==='intro'||target==='spec'?1500:4000;
    if(value.length>max){history.push(['Assistant','Raccourcissez la proposition à '+max+' caractères pour ce champ.']);refresh();return;}
    if(value){apply(target,value);root.close();}
  };
}
