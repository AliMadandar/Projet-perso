// Ce module est injecté uniquement dans APERCU.html. Tous les exemples restent en mémoire.
function createDemoApi({
  catalog,
  tiers,
  units,
  fields,
  conditions,
  today
}) {
  const company = {
    id: 1,
    version: 1,
    name: 'MA RENOVATION',
    address: 'Marseille',
    email: '',
    phone: '',
    identity: '',
    terms: ''
  };
  const me = {
    id: 1,
    name: 'Atelier démo',
    role: 'Administrateur',
    login: 'demo'
  };
  const clients = [{
    id: crypto.randomUUID(),
    name: 'Camille Martin (exemple)',
    address: 'Marseille 8ᵉ',
    email: '',
    phone: '',
    version: 1
  }, {
    id: crypto.randomUUID(),
    name: 'Atelier du Parc (exemple)',
    address: 'Marseille 6ᵉ',
    phone: '',
    email: '',
    version: 1
  }];
  const line = (i, quantity, lot, tier) => ({
    serviceId: catalog[i].id,
    unit: catalog[i].unit,
    label: catalog[i].label,
    quantity: quantity * 100,
    lot,
    tier,
    price: catalog[i].prices[tier],
    tax: 1000
  });
  const doc = (i, title, status, client, lines) => ({
    id: crypto.randomUUID(),
    number: 'DEV-' + String(i).padStart(5, '0'),
    title,
    status,
    client,
    lines,
    company,
    issued: today(),
    valid: today(30),
    discount: 0,
    deposit: 4000,
    edition:{...modules.edition.newEdition(i===3?'Peinture':'Carrelage'),intro:'Réfection des revêtements selon les prestations détaillées ci-dessous.'},
    version: 1,
    site: client.address,
    terms: company.terms,
    notes: '',
    updated: new Date().toISOString()
  });
  const documents = [doc(1, 'Rénovation de la cuisine', 'Brouillon', clients[0], [line(5, 30, 'Cuisine', 1), line(7, 30, 'Cuisine', 1), line(0, 30, 'Cuisine', 2)]), doc(2, 'Parquet de la boutique', 'Envoyé', clients[1], [line(1, 50, 'Boutique', 0)]), doc(3, 'Peinture du séjour', 'Accepté', clients[0], [line(16, 42, 'Séjour', 1)])];
  const data = {
    me,
    profiles:{},reminders:[],gmail:false,
    company,
    services: catalog.map(s => ({
      ...s,
      version: 1
    })),
    tiers,
    units,
    fields,
    conditions,
    customers: clients,
    documents,
    roles: ['Administrateur', 'Bureau', 'Terrain', 'Lecture'],
    members: [{
      ...me,
      active: 1
    }],
    events: [],
    lastRead: 0,
    ai: false
  };
  function event(action, target) {
    data.events.unshift({
      id: (data.events[0]?.id || 0) + 1,
      actor: me.name,
      time: new Date().toISOString(),
      action,
      target
    });
  }
  event('Exemple de devis préparé', documents[0].id);
  return async (path, o) => {
    if (path.startsWith('document/')) return structuredClone(documents.find(d => d.id === path.slice(9)));
    if(path==='reminder'){const r={...o,version:o.version+1};data.reminders=[...data.reminders.filter(x=>x.id!==r.id),r];return structuredClone(r);}
    if(path==='profile'){data.profiles[o.edition.trade]={...o,version:o.version+1};return structuredClone(data.profiles[o.edition.trade]);}
    if (path === 'state') return structuredClone(data);
    if (path === 'events') return structuredClone(data.events);
    if (path === 'read') {
      data.lastRead = o.id;
      return {};
    }
    if (path === 'company') {
      data.company = {
        ...o,
        version: o.version + 1
      };
      return structuredClone(data.company);
    }
    if (['services', 'customers', 'documents'].includes(path)) {
      const items = data[path],
        i = items.findIndex(x => x.id === o.id);
      const v = {
        ...structuredClone(o),
        version: (o.version || 0) + 1
      };
      if (path === 'documents') {
        v.number = v.number || 'DEV-' + String(items.length + 1).padStart(5, '0');
        v.updated = new Date().toISOString();
      }
      if (i < 0) items.unshift(v);else items[i] = v;
      event('Enregistré dans l’aperçu', v.id);
      return structuredClone(v);
    }
    if (path === 'status') {
      const d = documents.find(d => d.id === o.id);
      if (o.status === 'Validé' && (!d.client.name || !d.lines.length)) throw Error('Renseignez le client et les prestations.');
      d.status = o.status;
      d.version++;
      event('Devis · ' + d.status, d.id);
      return structuredClone(d);
    }
    throw Error('Cette action nécessite l’application serveur incluse dans le ZIP.');
  };
}
