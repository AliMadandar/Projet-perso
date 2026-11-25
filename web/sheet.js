export function bindSheet(root,d,changed,lineDialog,style,moveLine){
  function text(el,object,key,label,max){
    if(!el)return;
    el.textContent=object[key]||'';
    el.contentEditable='plaintext-only';el.dataset.hint=label;el.setAttribute('role','textbox');el.setAttribute('aria-label',label);
    el.oninput=()=>{object[key]=el.innerText.slice(0,max);if(el.innerText.length>max)el.textContent=object[key];changed();};
    el.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();el.blur();}};
  }
  function action(el,label,fn){
    if(!el)return;
    el.classList.add('sheet-target');el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',label);el.title=label;el.onclick=fn;
    el.onkeydown=e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();fn();}};
  }
  text(root.querySelector('.q-title h2'),d,'title','Objet du devis',160);
  text(root.querySelector('.q-parties section:last-child strong'),d.client,'name','Nom du client',120);
  let address=root.querySelector('.q-title p');
  if(!address){address=document.createElement('p');root.querySelector('.q-title').append(address);}
  text(address,d,'site','Adresse du chantier',250);
  const facts={'Objet des travaux':'intro','Spécifications':'spec','Fournitures':'supply','Paiement':'payment','Intervention':'timing','Gestion des déchets':'waste','Précisions':'notes','Conditions particulières':'terms'};
  for(const f of root.querySelectorAll('.quote-fact')){
    const label=f.querySelector('b')?.textContent,k=facts[label];if(k)text(f.querySelector('p'),['notes','terms'].includes(k)?d:d.edition,k,label,['notes','terms'].includes(k)?4000:1500);
  }
  let dragged=-1;
  const rows=root.querySelectorAll('.q-items tbody tr:not(.q-lot)');
  rows.forEach((row,index)=>{
    action(row,d.lines[index]?'Modifier '+d.lines[index].label:'Ajouter une prestation',()=>lineDialog(d.lines[index]?index:-1));
    if(!d.lines[index]||rows.length<2)return;
    row.draggable=true;
    row.title='Cliquer pour modifier, glisser pour déplacer';
    row.ondragstart=e=>{dragged=index;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(index));};
    row.ondragover=e=>{if(dragged>=0){e.preventDefault();row.classList.add('drop-line');}};
    row.ondragleave=()=>row.classList.remove('drop-line');
    row.ondrop=e=>{e.preventDefault();if(dragged>=0&&dragged!==index)moveLine(dragged,index);dragged=-1;row.classList.remove('drop-line');};
    row.ondragend=()=>{dragged=-1;rows.forEach(r=>r.classList.remove('drop-line'));};
  });
  action(root.querySelector('.q-brand'),'Personnaliser le logo et les couleurs',style);
  action(root.querySelector('.q-pay'),'Modifier les échéances',style);
}
