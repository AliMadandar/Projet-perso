import {esc,icon,button} from './ui.js';
const tabs=[['Accueil','home','خانه'],['Devis','doc','پیش‌فاکتورها'],['Clients','users','مشتریان'],['Plus','grid','بیشتر']];
export function mobileNav(page){
 const current=page==='editor'?'Devis':tabs.some(([name])=>name===page)?page:'Plus';
 const fa=page==='Terrain فارسی';
 return '<nav class="mobile-tabs" aria-label="Navigation mobile">'+tabs.map(([name,mark,translation])=>'<button type="button" data-act="tab-'+name+'"'+(current===name?' aria-current="page"':'')+'><span>'+icon(mark)+'</span>'+esc(fa?translation:name)+'</button>').join('')+'</nav>';
}
export function mobileHome(documents,canEdit){
 const draft=documents.find(d=>d.status==='Brouillon');
 return '<section class="mobile-home"><div><p class="mobile-greeting">VOTRE ESPACE RIVQO</p><h1>Mes projets</h1></div>'+(canEdit?button('new','Nouveau devis','plus','primary'):'')+(draft?'<div class="resume-card"><small>Dernier brouillon</small><strong>'+esc(draft.title)+'</strong><p>'+esc([draft.client.name,draft.number].filter(Boolean).join(' · '))+'</p>'+button('open-'+draft.id,canEdit?'Reprendre le devis':'Consulter le devis','arrow')+'</div>':'')+'</section>';
}
export function mobileMore(state){
 const links=[['terrain','Saisie chantier · فارسی','users'],['nav-Catalogue','Catalogue des prix','book'],['nav-Activité','Activité de l’équipe','bell'],['nav-Paramètres','Paramètres','gear']];
 return '<div class="pagehead"><h1>Plus</h1></div><section class="mobile-account"><span class="avatar">'+esc(state.me.name.slice(0,1))+'</span><div><strong>'+esc(state.me.name)+'</strong><small>'+esc(state.me.role)+'</small></div></section><div class="mobile-menu-list">'+links.map(([action,label,mark])=>button(action,label,mark)).join('')+'</div>'+button('logout','Déconnexion','logout','subtle');
}
export function bindPageSwipe(root,page,navigate){
 const index=tabs.findIndex(([name])=>name===page);
 if(index<0)return;
 let start=null;
 const excluded='input,textarea,select,button,a,canvas,dialog,[contenteditable],.tablewrap,.mobile-tabs';
 root.addEventListener('touchstart',event=>{
   start=null;
   if(window.innerWidth>900||event.touches.length!==1||document.querySelector('dialog[open]')||(event.target.closest(excluded)&&!event.target.closest('.quote-list tbody td:not(:first-child)')))return;
   const t=event.touches[0];if(t.clientX<24||t.clientX>window.innerWidth-24)return;
   start={x:t.clientX,y:t.clientY};
 },{passive:true});
 root.addEventListener('touchmove',event=>{
   if(!start)return;
   if(event.touches.length!==1||Math.abs(event.touches[0].clientY-start.y)>40)start=null;
 },{passive:true});
 root.addEventListener('touchcancel',()=>{start=null;},{passive:true});
 root.addEventListener('touchend',event=>{
   if(!start||event.touches.length||!event.changedTouches.length)return;
   const t=event.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;start=null;
   if(Math.abs(dx)<65||Math.abs(dx)<2*Math.abs(dy))return;
   const next=tabs[index+(dx<0?1:-1)];if(next)navigate(next[0]);
 },{passive:true});
}
