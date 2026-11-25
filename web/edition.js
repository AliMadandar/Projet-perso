import { esc, dateLabel, $, select, input, area, dialog, onForm, button, api, toast } from './ui.js';
import { amounts, euros } from './money.js';
import { photosPaper } from './photos.js';

export const trades = {
  'Tous corps d’état': ['ambre','Périmètre et coordination des différents lots'],
  'Peinture': ['sauge','Supports, préparation, teinte, finition et nombre de couches'],
  'Carrelage': ['terre','Format des carreaux, calepinage, joints et préparation du support'],
  'Revêtements de sol': ['ambre','Type de pose, sous-couche, seuils et plinthes'],
  'Salle de bains': ['ardoise','Zones humides, étanchéité, équipements et raccordements'],
  'Plomberie et ECS': ['ardoise','Capacité, implantation, raccordements et mise en service'],
  'Électricité': ['ambre','Circuits, appareillages et points de raccordement'],
  'Isolation et plâtrerie': ['sauge','Épaisseur, résistance thermique et parement'],
  'Maçonnerie et étanchéité': ['terre','Supports, épaisseurs, relevés et finitions'],
  'Menuiseries': ['ambre','Dimensions, matériaux, sens d’ouverture et finition']
};
export const lotIdeas = {
 'Tous corps d’état':['Installation du chantier','Dépose et préparation','Finitions'],
 'Peinture':['Protection du chantier','Préparation des supports','Murs','Plafonds','Boiseries','Finitions'],
 'Carrelage':['Dépose et préparation','Préparation du support','Carrelage au sol','Faïence murale','Joints et finitions'],
 'Revêtements de sol':['Dépose et préparation','Ragréage','Parquet','Plinthes et seuils'],
 'Salle de bains':['Dépose et préparation','Étanchéité','Équipement douche','Carrelage mural'],
 'Plomberie et ECS':['Dépose','Alimentations et évacuations','Production d’eau chaude','Raccordements'],
 'Électricité':['Distribution','Tableau électrique','Appareillage','Éclairage'],
 'Isolation et plâtrerie':['Isolation','Parements','Bandes et finitions'],
 'Maçonnerie et étanchéité':['Préparation','Maçonnerie','Étanchéité','Relevés et finitions'],
 'Menuiseries':['Dépose','Pose des menuiseries','Habillages et finitions']
};
const colors=['ambre','terre','sauge','ardoise'];
const pairs=arr=>arr.map(v=>[v,v]);
export function newEdition(trade='Tous corps d’état'){
  return {trade,color:trades[trade][0],layout:'Atelier',font:'Éditorial',order:'Échéancier puis modalités',logo:'',intro:'',spec:'',supply:'Les fournitures comprises sont précisées pour chaque prestation. Les postes en pose seule prévoient la fourniture du revêtement ou de l’équipement par le client.',timing:'Le calendrier d’intervention sera convenu avec le client après acceptation du devis.',travel:'Déplacement compris dans les prix indiqués.',fee:'Devis gratuit.',waste:'',payment:'Règlement par virement bancaire.',middle:5000};
}
const pct=v=>(v/100).toLocaleString('fr-FR')+' %';
const safeLines=t=>esc(t||'').replaceAll('\n','<br>');
const fact=(label,text)=>text?'<div class="quote-fact"><b>'+esc(label)+'</b><p>'+safeLines(text)+'</p></div>':'';
export function installments(total,deposit,middle){
  const first=Math.round(total*deposit/10000);
  const progress=Math.min(total-first,Math.round(total*middle/10000));
  return [first,progress,total-first-progress];
}
const tierLabels = ['Pose seule', 'Fourniture et pose · Essentiel', 'Fourniture et pose · Confort', 'Fourniture et pose · Premium'];

export function quoteItems(lines, discount) {
  const groups = [];
  for (const line of lines) {
    const lot = line.lot || '';
    if (groups.at(-1)?.lot !== lot) groups.push({ lot, lines: [] });
    groups.at(-1).lines.push(line);
  }
  const bodies = groups.map(group => {
    const heading = group.lot
      ? '<tr class="q-lot" role="row"><th scope="rowgroup" colspan="5" role="rowheader">' + esc(group.lot) + '</th></tr>'
      : '';
    let lotTotal = 0;
    const rows = group.lines.map(({ label, strong, tier, quantity, unit, price, tax }) => {
      const total = Math.round(quantity * price / 100);
      lotTotal += total;
      const detail = (key, name, value) => '<td class="quote-cell quote-' + key + '" role="cell"><span class="quote-cell-label" aria-hidden="true">' + name + '</span>' + value + '</td>';
      return '<tr class="quote-line" role="row"><td class="quote-description" role="cell">' +
        (strong ? '<strong>' + esc(label) + '</strong>' : esc(label)) +
        '<small>' + esc(tierLabels[tier] || '') + '</small></td>' +
        detail('quantity', 'Quantité', esc((quantity / 100).toLocaleString('fr-FR') + ' ' + unit)) +
        detail('price', 'PU HT', euros(price)) + detail('tax', 'TVA', pct(tax)) +
        detail('total', 'Total HT', euros(total)) + '</tr>';
    }).join('');
    const subtotal = group.lot ? '<tr class="quote-subtotal" role="row"><td colspan="5" role="cell"><span>Sous-total HT' +
      (discount ? ' avant remise' : '') + '</span><strong>' + euros(lotTotal) + '</strong></td></tr>' : '';
    return '<tbody role="rowgroup">' + heading + rows + subtotal + '</tbody>';
  }).join('');
  return '<table class="q-items quote-items" role="table" aria-label="Prestations du devis"><thead role="rowgroup"><tr role="row">' +
    ['Prestation', 'Quantité', 'Prix unitaire HT', 'TVA', 'Total HT'].map(name => '<th scope="col" role="columnheader">' + name + '</th>').join('') +
    '</tr></thead>' + (bodies || '<tbody role="rowgroup"><tr class="quote-empty" role="row"><td colspan="5" role="cell">Ajoutez une prestation pour chiffrer le chantier.</td></tr></tbody>') + '</table>';
}

export function editionPaper(d){
  const e=d.edition,c=d.company,m=amounts(d.lines,d.discount,d.deposit);
  const nums=installments(m.total,d.deposit,e.middle),rates=[d.deposit,e.middle,10000-d.deposit-e.middle];
  const schedule=['À la signature','En cours de chantier','À la réception'].map((v,i)=>rates[i]?'<div><b>'+pct(rates[i])+'</b><span>'+v+'</span><strong>'+euros(nums[i])+'</strong></div>':'').join('');
  const sum=(k,v)=>'<div><span>'+esc(k)+'</span><b>'+euros(v)+'</b></div>';
  const html='<article class="sheet couture quote-document '+(e.font==='Contemporain'?'sans-titres ':'')+'tone-'+(colors.includes(e.color)?e.color:'ambre')+(e.layout==='Compact'?' condensed':'')+'">'+
    '<header class="q-head"><div class="q-brand"><img src="'+esc(e.logo||'/ma-logo.png')+'" alt=""><b>'+esc(c.name)+'</b></div><div><b>Devis</b><span>'+esc(d.number||'Brouillon')+'</span></div></header>'+
    '<div class="q-meta"><span>Émis le '+(d.issued?dateLabel(d.issued):'…')+'</span><span>Valable jusqu’au '+(d.valid?dateLabel(d.valid):'…')+'</span></div>'+
    '<div class="q-parties"><section><small>Entreprise</small><strong>'+esc(c.name)+'</strong>'+safeLines([c.address,c.phone,c.email,c.identity].filter(Boolean).join('\n'))+'</section><section><small>Destinataire</small><strong>'+esc(d.client.name||'Client à renseigner')+'</strong>'+safeLines([d.client.address,d.client.phone,d.client.email].filter(Boolean).join('\n'))+'</section></div>'+
    '<section class="q-title"><small>'+esc(e.trade)+'</small><h2>'+esc(d.title)+'</h2>'+(d.site?'<p>Chantier · '+esc(d.site)+'</p>':'')+'</section>'+
    fact('Objet des travaux',e.intro)+fact('Spécifications',e.spec)+fact('Fournitures',e.supply)+
    quoteItems(d.lines,d.discount)+
    '<section class="q-sum">'+(d.discount?sum('Brut HT',m.gross)+sum('Remise '+pct(d.discount),-m.discount):'')+sum('Total HT',m.net)+m.taxes.map(t=>sum('TVA '+pct(t.rate),t.amount)).join('')+'<div class="q-grand"><span>Total TTC</span><strong>'+euros(m.total)+'</strong></div></section>'+
    '<section class="q-pay"><h3>Échéancier de règlement</h3><div>'+schedule+'</div></section>'+
    '<section class="q-conditions"><h3>Modalités du chantier</h3>'+fact('Paiement',e.payment)+fact('Intervention',e.timing)+fact('Déplacement et devis',[e.travel,e.fee].filter(Boolean).join(' '))+fact('Gestion des déchets',e.waste)+fact('Assurance professionnelle',c.insurance)+fact('Médiation de la consommation',c.mediator)+fact('Précisions',d.notes)+fact('Conditions particulières',d.terms)+'</section>'+
    '<footer class="q-sign"><b>Bon pour accord</b><span>Nom, date et signature du client</span></footer>'+photosPaper(d.photos)+'</article>';
  if(e.order==='Modalités puis échéancier'){
    const pay=html.indexOf('<section class="q-pay">'),conditions=html.indexOf('<section class="q-conditions">'),signature=html.indexOf('<footer class="q-sign">');
    return html.slice(0,pay)+html.slice(conditions,signature)+html.slice(pay,conditions)+html.slice(signature);
  }
  return html;
}
export function editionDialog(d,state,done){
  const e=structuredClone(d.edition||newEdition());
  if(!d.edition)e.middle=Math.min(e.middle,10000-d.deposit);
  const template=select('Domaine','trade',pairs(Object.keys(trades)),e.trade)+select('Couleur du document','color',pairs(colors),e.color)+select('Mise en page','layout',pairs(['Atelier','Compact']),e.layout)+select('Typographie','font',pairs(['Éditorial','Contemporain']),e.font)+select('Ordre des rubriques','order',pairs(['Échéancier puis modalités','Modalités puis échéancier']),e.order);
  dialog('Personnaliser le devis','<form id="editionForm"><div class="fields">'+template+'</div><label>Logo pour ce modèle (PNG ou JPEG, 240 Ko maximum)<input id="customLogo" type="file" accept="image/png,image/jpeg"></label>'+button('resetLogo','Reprendre le logo MA RENOVATION')+'<p id="logoState"></p>'+area('Présentation du chantier','intro',e.intro)+area(trades[e.trade][1],'spec',e.spec)+area('Fournitures comprises et exceptions','supply',e.supply)+area('Début, durée et conditions d’intervention','timing',e.timing)+input('Déplacement','travel',e.travel)+input('Coût du devis','fee',e.fee)+area('Déchets : quantité estimée, tri, enlèvement, points de collecte et coûts','waste',e.waste)+input('Mode de règlement','payment',e.payment)+'<div class="fields">'+input('À la signature (%)','first',d.deposit/100,'number','min="0" max="100" step=".01" required')+input('En cours de chantier (%)','middle',e.middle/100,'number','min="0" max="100" step=".01" required')+'</div><p id="rest"></p>'+button('reuse','Reprendre le modèle du domaine','book')+(state.me.role==='Administrateur'?button('preset','Mémoriser pour ce domaine','check'):'')+'<button class="primary wide">Appliquer au devis</button></form>');
  const f=$('#editionForm'),v=f.elements;
  v.trade.onchange=()=>{v.color.value=trades[v.trade.value][0];v.spec.parentNode.firstChild.textContent=trades[v.trade.value][1];};
  let logo=e.logo||'';
  const logoLabel=()=>$('#logoState').textContent=logo?'Logo personnalisé sélectionné.':'Logo MA RENOVATION.';
  $('#customLogo').onchange=async ev=>{const f=ev.target.files[0];if(!f)return;if(!['image/png','image/jpeg'].includes(f.type)||f.size>240000){toast('Utilisez un PNG ou JPEG de moins de 240 Ko.');return;}
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(f);}).catch(()=>null);if(data&&$('#logoState')){logo=data;logoLabel();}};
  f.querySelector('[data-act="resetLogo"]').onclick=()=>{logo='';logoLabel();};logoLabel();
  const balance=()=>{const n=Math.round(Number(v.first.value)*100)+Math.round(Number(v.middle.value)*100);v.middle.setCustomValidity(n>10000?'Le total des deux échéances dépasse 100 %.':'');$('#rest').textContent=n<=10000?'Solde à la réception : '+pct(10000-n):'Le total dépasse 100 %.';};
  f.oninput=balance;balance();
  const values=()=>{const data=Object.fromEntries(new FormData(f));const {first,middle,...rest}=data;
    return {first:Math.round(Number(first)*100),edition:{...rest,logo,middle:Math.round(Number(middle)*100)}};};
  const reuse=()=>{const profile=state.profiles?.[v.trade.value]||{first:4000,edition:newEdition(v.trade.value)};
    for(const [k,val] of Object.entries(profile.edition))if(v[k])v[k].value=k==='middle'?val/100:val;
    v.first.value=profile.first/100;logo=profile.edition.logo||'';logoLabel();balance();};
  f.querySelector('[data-act="reuse"]').onclick=reuse;
  const preset=f.querySelector('[data-act="preset"]');
  if(preset)preset.onclick=async()=>{if(!f.reportValidity())return;const data=values();try{
    const saved=await api('profile',{...data,version:state.profiles?.[data.edition.trade]?.version||0});
    (state.profiles||={})[data.edition.trade]=saved;toast('Modèle enregistré pour ce domaine.');
  }catch(e){toast(e.message);}};
  onForm('#editionForm',async o=>{const {first,middle,...terms}=o;done({...terms,logo,middle:Math.round(Number(middle)*100)},Math.round(Number(first)*100));$('#modal').close();});
}
