import { mobileNav, mobileMore, mobileHome, bindPageSwipe } from './mobile.js';
import {terrain} from './terrain.js';
import { priceReference } from './references.js';
import { $, esc, input, select, area, button, icon, dialog, api, onForm, toast, status, dateLabel, csv, today } from './ui.js';
import { euros, amounts } from './money.js';
import { fresh, mountEditor } from './editor.js';
let state,
  page,
  dirty = () => false,
  poll,
  epoch = 0;
const root = $('#root'),
  modal = $('#modal');
const canEdit = () => state.me.role !== 'Lecture',
  admin = () => state.me.role === 'Administrateur';
const navs = {
  Accueil: 'home',
  Devis: 'doc',
  Clients: 'users',
  Catalogue: 'book',
  Activité: 'bell',
  Administration: 'gear'
};
const actions = (...buttons) => '<div class="actions">' + buttons.join('') + '</div>';
const head = (title, sub, buttons = '') => '<div class="pagehead"><div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>' + buttons + '</div>';
const newButton = () => canEdit() ? button('new', 'Nouveau devis', 'plus', 'primary') : '';
const total = d => d.total ?? amounts(d.lines, d.discount, d.deposit).total;
const replace = (arr, v) => {
  const i = arr.findIndex(x => x.id === v.id);
  if (i < 0) arr.unshift(v);else arr[i] = v;
};
const brand = '<span class="brand"><img src="/icon.svg" alt=""><span>Quote<b>Relay</b></span></span>';
const safe = fn => async (...args) => {
  try {
    await fn(...args);
  } catch (e) {
    toast(e.message);
  }
};
function login() {
  clearInterval(poll);
  epoch++;
  state = null;
  dirty = () => false;
  if (modal.open) modal.close();
  root.innerHTML = '<main class="signin" id="main"><section class="signart">' + brand + '<div class="drafting" aria-hidden="true"></div><div><p class="eyebrow">Espace professionnel</p><h1>L’atelier<br>des devis.</h1></div></section><section class="signform"><div><p class="eyebrow">QuoteRelay</p><h2>Connexion</h2><p>Accédez aux chantiers et aux devis de votre équipe.</p><form id="login">' + input('Identifiant', 'login', '', 'text', 'autocomplete="username" required autofocus') + input('Mot de passe', 'password', '', 'password', 'autocomplete="current-password" required') + '<button class="primary wide">Ouvrir mon espace ' + icon('arrow') + '</button></form></div></section></main>';
  onForm('#login', async o => {
    await api('login', o);
    await start();
  });
}
function nav() {
  return Object.entries(navs).filter(([p]) => p !== 'Administration' || admin()).map(([p, i]) => button('nav-' + p, p, i, 'nav ' + (p === (page === 'editor' ? 'Devis' : page) ? 'active' : ''))).join('');
}
function shell() {
  const unread = state.events.filter(e => e.id > state.lastRead).length;
  root.innerHTML = '<div class="shell"><aside id="sidebar">' + brand + '<nav aria-label="Navigation principale">' + nav() + '</nav><div class="profile"><span class="avatar">' + esc(state.me.name.slice(0, 1)) + '</span><div><b>' + esc(state.me.name) + '</b><small>' + esc(state.me.role) + '</small></div>' + button('logout', 'Déconnexion', 'logout', 'icononly') + '</div></aside><div class="workspace"><header class="bar">' + '<span class="mobile-brand">'+brand+'</span>' + '<span>Espace de travail <i>/</i> <b>' + esc(page === 'editor' ? 'Devis' : page) + '</b></span>' + button('terrain','فارسی','users','subtle') + button('nav-Activité', 'Activité' + (unread ? ' (' + unread + ')' : ''), 'bell', 'subtle') + '</header><main id="main" tabindex="-1"></main></div>'+mobileNav(page)+'</div>';
}
function go(p, d, force = false) {
  if (!force && dirty() && !confirm('Quitter sans enregistrer les modifications du devis ?')) return;
  dirty = () => false;
  page = p;
  shell();
  const main = $('#main');
  if(p==='Terrain فارسی'){dirty=terrain({state,main,go,done:v=>replace(state.documents,v),fresh},d);}
  else if (p === 'editor') {
    dirty = mountEditor({
      state,
      main,
      go,
      done: v => replace(state.documents, v)
    }, structuredClone(d));
  } else if(p==='Plus')main.innerHTML=mobileMore(state);else if (p === 'Accueil') home(main);else if (p === 'Devis') docs(main);else if (p === 'Clients') clients(main);else if (p === 'Catalogue') catalogue(main);else if (p === 'Activité') activity(main);else settings(main);
  bindPageSwipe(main,p,next=>safe(navigate)(next));
  window.scrollTo(0, 0);
}
const docTable = docs => docs.length ? '<div class="tablewrap quote-list"><table><thead><tr><th>Devis / chantier</th><th>Client</th><th>Statut</th><th class="num">Montant TTC</th></tr></thead><tbody>' + docs.map(d => '<tr><td><button class="link" data-act="open-' + esc(d.id) + '">' + esc(d.title) + '</button><small>' + esc(d.number) + ' · ' + dateLabel(d.issued) + '</small></td><td>' + esc(d.client.name || 'À renseigner') + '</td><td>' + status(d.status) + '</td><td class="num"><b>' + euros(total(d)) + '</b></td></tr>').join('') + '</tbody></table></div>' : '<div class="empty"><b>Aucun devis à afficher</b><p>Les devis correspondant à cette vue apparaîtront ici.</p></div>';
function localDrafts() {
  if (!canEdit() || location.protocol === 'file:') return [];
  try {
    return Object.keys(sessionStorage).filter(k => k.startsWith('ma-draft-' + state.me.id + '-')).map(k => JSON.parse(sessionStorage.getItem(k))).filter(d => d?.id);
  } catch {
    return [];
  }
}
function home(main) {
  const docs = [...state.documents].sort((a, b) => b.updated.localeCompare(a.updated)),
    sent = docs.filter(d => d.status === 'Envoyé'),
    accepted = docs.filter(d => d.status === 'Accepté');
  main.innerHTML = mobileHome(docs,canEdit())+'<section class="hero"><div class="drafting" aria-hidden="true"></div><div><p class="eyebrow">' + esc(new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date())) + '</p><h1>Atelier des devis</h1><p>Préparez vos chiffrages et suivez les réponses clients.</p>' + newButton() + '</div></section>' + (state.reminders||[]).filter(r=>!r.completed&&r.due<=today()).map(r=>'<div class="assistbar"><div><b>Relance à préparer</b><small>'+esc(state.documents.find(d=>d.id===r.id)?.title||'Devis')+' · '+dateLabel(r.due)+'</small></div>'+button('open-'+r.id,'Ouvrir le devis','arrow')+'</div>').join('') + localDrafts().map(d => '<div class="assistbar"><div><b>Saisie à reprendre</b><small>' + esc(d.title) + '</small></div>' + actions(button('recover-' + d.id, 'Reprendre'), button('forget-' + d.id, 'Écarter')) + '</div>').join('') + '<section class="kpis">' + [['Brouillons', docs.filter(d => d.status === 'Brouillon').length, 'À préparer'], ['Devis envoyés', sent.length, 'En attente de réponse'], ['Montant accepté', euros(accepted.reduce((s, d) => s + total(d), 0)), 'Total TTC des devis acceptés']].map(([s, v, h]) => '<div><small>' + s + '</small><strong>' + v + '</strong><span>' + h + '</span></div>').join('') + '</section><section class="card"><header><h2>Derniers devis</h2>' + button('nav-Devis', 'Tous les devis', 'arrow', 'subtle') + '</header>' + docTable(docs.slice(0, 6)) + '</section><div class="quick">' + button('nav-Catalogue', 'Consulter les tarifs', 'book') + button('nav-Clients', 'Ouvrir le carnet clients', 'users') + '</div>';
}
function docs(main) {
  main.innerHTML = head('Mes devis', 'Retrouvez les chiffrages de toute l’équipe.', actions(button('export', 'Exporter en CSV', 'download'), newButton())) + '<section class="card"><div class="filters">' + input('Recherche', 'query', '', 'search', 'placeholder="Client, chantier, référence…"') + select('Statut', 'filter', ['Tous', 'Brouillon', 'Validé', 'Envoyé', 'Accepté', 'Refusé', 'Archivé'].map(s => [s, s]), 'Tous') + '</div><div id="results"></div></section>';
  let view;
  function render() {
    const q = $('[name=query]').value.toLocaleLowerCase('fr'),
      s = $('[name=filter]').value;
    view = state.documents.filter(d => (s === 'Tous' || s === d.status) && [d.number, d.title, d.site, d.client.name].join(' ').toLocaleLowerCase('fr').includes(q)).sort((a, b) => b.updated.localeCompare(a.updated));
    $('#results').innerHTML = docTable(view);
  }
  main.oninput = render;
  main.querySelector('[data-act=export]').onclick = () => csv('devis.csv', [['Référence', 'Objet', 'Client', 'Statut', 'Émis le', 'Valide au', 'Montant TTC (€)'], ...view.map(d => [d.number, d.title, d.client.name, d.status, d.issued, d.valid, (total(d) / 100).toFixed(2).replace('.', ',')])]);
  render();
}
function clientForm(c = {
  id: crypto.randomUUID(),
  version: 0
}) {
  dialog(c.version ? 'Fiche client' : 'Nouveau client', '<form id="client">' + input('Nom / société', 'name', c.name, 'text', 'required') + area('Adresse de facturation', 'address', c.address) + input('Téléphone', 'phone', c.phone, 'tel') + input('E-mail', 'email', c.email, 'email') + '<button class="primary wide">Enregistrer le client</button></form>');
  onForm('#client', async o => {
    replace(state.customers, await api('customers', {
      ...o,
      id: c.id,
      version: c.version
    }));
    modal.close();
    go('Clients');
  });
}
function clients(main) {
  main.innerHTML = head('Carnet clients', 'Coordonnées réutilisables dans vos devis.', canEdit() ? button('client', 'Nouveau client', 'plus', 'primary') : '') + '<div class="filters">' + input('Rechercher un client', 'query', '', 'search') + '</div><div id="results" class="cards"></div>';
  function render() {
    const q = $('[name=query]').value.toLowerCase(),
      result = state.customers.filter(c => [c.name, c.email, c.phone].join(' ').toLowerCase().includes(q));
    $('#results').innerHTML = result.map(c => '<article class="tile"><span class="avatar">' + esc(c.name.slice(0, 1)) + '</span><h3>' + esc(c.name) + '</h3><p>' + esc(c.address) + '</p><p>' + esc(c.email) + '<br>' + esc(c.phone) + '</p>' + (canEdit() ? button('client-' + c.id, 'Modifier', 'edit', 'subtle') : '') + '</article>').join('') || '<p class="empty">Aucun client dans cette vue.</p>';
  }
  main.oninput = render;
  render();
}
function serviceForm(s = {
  id: crypto.randomUUID(),
  version: 0,
  prices: [0, 0, 0, 0]
}) {
  dialog(s.version ? 'Modifier le tarif' : 'Nouvelle prestation', '<form id="service">' + input('Prestation', 'label', s.label, 'text', 'required') + input('Corps de métier', 'category', s.category, 'text', 'required') + select('Unité', 'unit', state.units.map(x => [x, x]), s.unit) + '<div class="fields">' + state.tiers.map((t, i) => input(t + ' (€ HT)', 'p' + i, s.prices[i] / 100, 'number', 'min="0" max="100000" step=".01" required')).join('') + '</div><button class="primary wide">Enregistrer les tarifs</button></form>');
  onForm('#service', async o => {
    replace(state.services, await api('services', {
      ...s,
      ...o,
      prices: state.tiers.map((_, i) => Math.round(Number(o['p' + i]) * 100))
    }));
    modal.close();
    go('Catalogue');
    toast('Catalogue mis à jour.');
  });
}
function catalogue(main) {
  main.innerHTML = head('Catalogue des prix', 'Tarifs unitaires hors taxes, par formule.', admin() ? button('service', 'Nouvelle prestation', 'plus', 'primary') : '') + '<section class="card"><div class="filters">' + input('Rechercher', 'query', '', 'search', 'placeholder="Carrelage, parquet…"') + select('Corps de métier', 'category', ['Tous', ...new Set(state.services.map(s => s.category))].map(s => [s, s]), 'Tous') + '</div><div id="results" class="tablewrap"></div></section>';
  main.insertAdjacentHTML('beforeend','<details><summary>Rechercher une fourniture</summary>'+input('Produit, format ou référence','produit','','search')+'<div class="actions"><a id="leroy" target="_blank" rel="noopener">Leroy Merlin</a><a id="plateforme" target="_blank" rel="noopener">La Plateforme du Bâtiment</a></div></details>'+priceReference());
  const supplier=()=>{const q=$('[name=produit]').value.trim();$('#leroy').href='https://www.leroymerlin.fr/recherche/?q='+encodeURIComponent(q);
    $('#plateforme').href=q?'https://www.google.com/search?q='+encodeURIComponent('site:laplateforme.com '+q):'https://www.laplateforme.com/';};
  $('[name=produit]').oninput=supplier;supplier();
  function render() {
    const q = $('[name=query]').value.toLowerCase(),
      cat = $('[name=category]').value;
    const rows = state.services.filter(s => (cat === 'Tous' || s.category === cat) && s.label.toLowerCase().includes(q));
    $('#results').innerHTML = '<table><thead><tr><th>Prestation</th>' + state.tiers.map(t => '<th>' + t + '</th>').join('') + '</tr></thead><tbody>' + rows.map(s => '<tr><td>' + (admin() ? button('service-' + s.id, s.label, '', 'link') : esc(s.label)) + '<small>' + esc(s.category) + ' · ' + esc(s.unit) + '</small></td>' + s.prices.map(v => '<td>' + euros(v) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' + (rows.length ? '' : '<p class="empty">Aucune prestation correspondante.</p>');
  }
  main.oninput = render;
  render();
}
function activity(main) {
  main.innerHTML = head('Activité de l’équipe', 'Les 100 derniers événements enregistrés.', actions(button('notify', 'Notifications navigateur', 'bell'), button('read', 'Marquer comme lu', 'check'))) + '<section class="card timeline">' + state.events.map(e => '<div><span class="mark"></span><section><b>' + esc(e.action) + '</b><small>' + esc(e.actor) + ' · ' + esc(new Date(e.time).toLocaleString('fr-FR')) + '</small>' + (state.documents.some(d => d.id === e.target) ? button('open-' + e.target, 'Voir le devis', 'arrow', 'subtle') : '') + '</section>' + (e.id > state.lastRead ? '<span class="badge b4">Nouveau</span>' : '') + '</div>').join('') + '</section>';
}
function settings(main) {
  const c = state.company;
  main.innerHTML = head('Administration', 'Identité de l’entreprise et accès de l’équipe.') + '<div class="admincols"><form class="card pad" id="company"><h2>Entreprise</h2>' + input('Raison sociale', 'name', c.name, 'text', 'required') + area('Adresse', 'address', c.address) + input('Téléphone', 'phone', c.phone) + input('E-mail', 'email', c.email, 'email') + area('Identifiants et mentions professionnelles', 'identity', c.identity) + area('Assurance : assureur, coordonnées, police et couverture géographique','insurance',c.insurance) + area('Médiateur de la consommation : nom et coordonnées','mediator',c.mediator) + area('Conditions par défaut des nouveaux devis', 'terms', c.terms) + '<button class="primary">Enregistrer</button></form><section class="card pad"><header><h2>Équipe</h2>' + button('user', 'Ajouter', 'plus') + '</header>' + state.members.map(m => '<div class="member"><div><b>' + esc(m.name) + '</b><small>' + esc(m.login) + ' · ' + esc(m.role) + ' · ' + (m.active ? 'Actif' : 'Suspendu') + '</small></div>' + button('user-' + m.id, 'Gérer', 'gear', 'subtle') + '</div>').join('') + '<h3>Assistant Gemini</h3><p>' + (state.ai ? 'Clé configurée sur le serveur.' : 'En attente de la clé GEMINI_API_KEY dans le fichier .env du serveur.') + '</p><h3>Notifications sur téléphone</h3><p>' + (state.mobileNotifications ? 'Envoi ntfy configuré.' : 'Le journal intégré est actif. Le serveur peut aussi prévenir un téléphone via un sujet ntfy privé.') + '</p></section></div>';
  onForm('#company', async o => {
    state.company = await api('company', {
      ...o,
      version: c.version
    });
    toast('Identité enregistrée.');
    go('Administration');
  });
}
function userForm(m) {
  dialog(m ? 'Gérer ' + m.name : 'Nouveau membre', '<form id="member">' + (m ? select('Accès', 'active', [['1', 'Actif'], ['0', 'Suspendu']], m.active) : input('Nom', 'name', '', 'text', 'required') + input('Identifiant', 'login', '', 'text', 'required') + select('Rôle', 'role', state.roles.map(s => [s, s]), 'Terrain')) + input(m ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe (12 caractères minimum)', 'password', '', 'password', (m ? '' : 'required ') + 'minlength="12" autocomplete="new-password"') + '<button class="primary wide">Enregistrer</button></form>');
  onForm('#member', async o => {
    await api('users', m ? {
      id: m.id,
      password: o.password,
      active: o.active === '1'
    } : o, m ? 'PUT' : 'POST');
    modal.close();
    if (m?.id === state.me.id) return login();
    state = await api('state');
    go('Administration');
  });
}
let navigation=0;
async function navigate(destination){
  const ticket=++navigation,from=page,session=epoch;
  if(dirty()&&!confirm('Quitter sans enregistrer les modifications du devis ?'))return;
  const data=await api('state');
  if(ticket!==navigation||page!==from||session!==epoch)return;
  state=data;go(destination,null,true);
}
root.onclick = safe(async e => {
  const a = e.target.closest('[data-act]')?.dataset.act;
  if (!a || !state) return;
  if(page==='Terrain فارسی'&&e.target.closest('.terrain'))return;
  if(a==='terrain'){go('Terrain فارسی');return;}
  if (a.startsWith('nav-')||a.startsWith('tab-')) {
    await navigate(a.slice(4));
  } else if (a.startsWith('recover-')) {
    const d = localDrafts().find(x => x.id === a.slice(8));
    if (!d) return;
    const existing = state.documents.find(x => x.id === d.id);
    if (existing) {
      const live = await api('document/' + d.id);
      if (live.version !== d.version || live.status !== 'Brouillon') {
        if (!confirm('Le devis a évolué. Reprendre la saisie dans un nouveau devis ?')) return;
        const originalId = d.id;
        Object.assign(d, {
          id: crypto.randomUUID(),
          number: '',
          version: 0,
          status: 'Brouillon'
        });
        sessionStorage.setItem('ma-draft-' + state.me.id + '-' + d.id, JSON.stringify(d));
        sessionStorage.removeItem('ma-draft-' + state.me.id + '-' + originalId);
      }
    }
    go('editor', d);
  } else if (a.startsWith('forget-')) {
    if (confirm('Écarter la saisie locale ?')) {
      sessionStorage.removeItem('ma-draft-' + state.me.id + '-' + a.slice(7));
      go('Accueil');
    }
  } else if (a === 'new') go('editor', fresh(state));else if (a.startsWith('open-')) go('editor', await api('document/' + a.slice(5)));else if (a === 'menu') $('#sidebar').classList.toggle('show');else if (a === 'logout') {
    if (dirty() && !confirm('Quitter sans enregistrer le devis ?')) return;
    await api('logout', {});
    for (const d of localDrafts()) sessionStorage.removeItem('ma-draft-' + state.me.id + '-' + d.id);
    login();
  } else if (a === 'service' || a.startsWith('service-')) serviceForm(state.services.find(s => s.id === a.slice(8)));else if (a === 'client' || a.startsWith('client-')) clientForm(state.customers.find(c => c.id === a.slice(7)));else if (a === 'user' || a.startsWith('user-')) userForm(state.members.find(m => m.id === Number(a.slice(5))));else if (a === 'read') {
    state.lastRead = state.events[0]?.id || 0;
    await api('read', {
      id: state.lastRead
    });
    go('Activité');
  } else if (a === 'notify') {
    if (!('Notification' in window)) return toast('Ce navigateur ne propose pas les notifications système.');
    const p = await Notification.requestPermission();
    toast(p === 'granted' ? 'Notifications activées pendant l’ouverture de l’application.' : 'Notifications système désactivées.');
  }
});
async function start() {
  state = await api('state');
  const current = ++epoch;
  go('Accueil', null, true);
  clearInterval(poll);
  poll = setInterval(async () => {
    try {
      const events = await api('events');
      if (current !== epoch) return;
      const last = state.events[0]?.id || 0;
      if (events.length && events[0].id > last) {
        state.events = events;
        const b = $('.bar [data-act="nav-Activité"]');
        if (b) b.innerHTML = icon('bell') + 'Activité (' + events.filter(e => e.id > state.lastRead).length + ')';
        if (page === 'Activité') activity($('#main'));
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification('QuoteRelay', {
          body: events[0].action
        });
      }
    } catch {}
  }, 20000);
}
window.addEventListener('sessionexpired', login);
window.addEventListener('beforeunload', e => {
  if (dirty()) {
    e.preventDefault();
    e.returnValue = '';
  }
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('/sw.js').catch(() => {});
start().catch(login);
