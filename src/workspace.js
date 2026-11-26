import { catalog, units } from './catalog.js';
import { amounts } from '../web/money.js';
import { fixedTier } from '../web/pricing.js';
export function fail(message, status = 400) {
  throw Object.assign(new Error(message), {
    status
  });
}
export function str(v, max = 160) {
  if (typeof v !== 'string' || v.length > max) fail('Texte manquant ou trop long.');
  return v.trim();
}
const required = (v, max) => str(v, max) || fail('Renseignez les champs obligatoires.');
export function num(v, min, max) {
  if (!Number.isSafeInteger(v) || v < min || v > max) fail('Valeur numérique hors limites.');
  return v;
}
export function uuid(v) {
  if (typeof v !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v)) fail('Identifiant incorrect.');
  return v;
}
const addr = (o = {}) => ({
  name: str(o.name || ''),
  email: str(o.email || '', 254),
  phone: str(o.phone || '', 50),
  address: str(o.address || '', 700)
});
export function customer(o) {
  return {
    ...addr(o),
    name: required(o.name)
  };
}
export function service(o) {
  if (!units.includes(o.unit) || !Array.isArray(o.prices) || o.prices.length !== 4) fail('Unité ou gamme invalide.');
  return {
    label: required(o.label),
    category: required(o.category),
    unit: o.unit,
    prices: o.prices.map(v => num(v, 0, 10000000))
  };
}
export function company(o) {
  return {
    ...addr(o),
    name: required(o.name),
    insurance: str(o.insurance||'',1000),
    mediator: str(o.mediator||'',1000),
    identity: str(o.identity || '', 800),
    terms: str(o.terms || '', 4000)
  };
}
function date(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v) fail('Date incorrecte.');
  return v;
}
export function edition(e,deposit){
  if(e==null)return undefined;
  const out={};
  for(const k of ['trade','color','layout','font','order','intro','spec','supply','timing','travel','fee','waste','payment'])out[k]=str(e[k]||'',1500);
  if(e.logo && (typeof e.logo!=='string'||e.logo.length>320040||!/^data:image\/(?:png;base64,iVBORw0KGgo|jpeg;base64,\/9j\/)[a-zA-Z0-9+/=]*$/.test(e.logo)))fail('Logo PNG ou JPEG incorrect.');
  out.logo=e.logo||'';
  if(!['Tous corps d’état','Peinture','Carrelage','Revêtements de sol','Salle de bains','Plomberie et ECS','Électricité','Isolation et plâtrerie','Maçonnerie et étanchéité','Menuiseries'].includes(out.trade))fail('Domaine inconnu.');
  out.middle=num(e.middle,0,10000-deposit);return out;
}
export function document(o) {
  if (!Array.isArray(o.lines) || o.lines.length > 150) fail('Maximum 150 lignes par devis.');
  const lines = o.lines.map(l => {
    if (!units.includes(l.unit)) fail('Unité incorrecte.');
    return {
      label: required(l.label, 250),
      strong: l.strong === true,
      lot: str(l.lot || '', 120),
      unit: l.unit,
      quantity: num(l.quantity, 1, 1000000),
      price: num(l.price, 0, 10000000),
      tax: num(l.tax, 0, 10000),
      tier: num(l.tier, 0, 3),
      serviceId: str(l.serviceId || '', 80),
      ...(l.fixedPrice === true && { fixedPrice: true })
    };
  });
  const photos = o.photos ?? [];
  if (!Array.isArray(photos) || photos.length > 4) fail('Quatre photos maximum par devis.');
  const attachments = photos.map(p => {
    if (!p || typeof p.jpeg !== 'string' || p.jpeg.length > 320000 || !/^\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(p.jpeg)) fail('Photo JPEG invalide.');
    return { jpeg:p.jpeg, caption:str(p.caption || '',160) };
  });
  const issued = date(o.issued),
    valid = date(o.valid);
  if (valid < issued) fail('La validité doit suivre la date du devis.');
  return {
    edition: edition(o.edition,o.deposit),
    title: required(o.title),
    client: addr(o.client),
    site: str(o.site || '', 700),
    issued,
    valid,
    terms: str(o.terms || '', 4000),
    notes: str(o.notes || '', 4000),
    lines,
    photos: attachments,
    discount: num(o.discount, 0, 10000),
    deposit: num(o.deposit, 0, 10000)
  };
}
const unpack = r => ({
  ...JSON.parse(r.data),
  id: r.id,
  version: r.version
});
export function workspace(db) {
  const run = (sql, ...v) => db.prepare(sql).run(...v),
    get = (sql, ...v) => db.prepare(sql).get(...v),
    all = (sql, ...v) => db.prepare(sql).all(...v);
  const atomic = fn => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };
  const event = (actor, action, target) => run('INSERT INTO events(time,actor,action,target) VALUES(?,?,?,?)', new Date().toISOString(), actor, action, target);
  const readDoc = r => ({
    ...unpack(r),
    number: 'DEV-' + String(r.seq).padStart(5, '0'),
    status: r.status,
    updated: r.updated
  });
  const settings = () => unpack(get('SELECT * FROM settings WHERE id=1'));
  atomic(() => {
    if (!get('SELECT id FROM settings WHERE id=1')) {
      run('INSERT INTO settings VALUES(1,?,1)', JSON.stringify(company({
        name: 'MA RENOVATION', address:'621 avenue de Mazargues, 13009 Marseille',phone:'06 25 75 09 29',email:'madandarali123@gmail.com',identity:'Madandar Abolfazl · SIRET 79961602400029'
      })));
      const legacy = Object.fromEntries(all('SELECT code,cents FROM prices').map(r => [r.code, r.cents]));
      for (const s of catalog) {
        const prices = [...s.prices];
        if (s.id === 's1') ['pose', 'eco', 'standard', 'premium'].forEach((code, i) => prices[i] = legacy[code]);
        for (const [id, key] of Object.entries({
          s6: 'removal',
          s7: 'primer',
          s8: 'level',
          s10: 'sealing'
        })) if (s.id === id) prices[1] = legacy[key];
        run('INSERT INTO services VALUES(?,?,1)', s.id, JSON.stringify({
          ...s,
          prices
        }));
      }
      for (const old of all('SELECT snapshot FROM quotes ORDER BY created')) {
        const q = JSON.parse(old.snapshot),
          day = q.created.slice(0, 10);
        const d = {
          title: 'Carrelage · ' + q.facts.room,
          issued: day,
          valid: day,
          client: addr(),
          company: settings(),
          site: '',
          terms: '',
          notes: 'Reprise du devis historique (montants HT).',
          discount: 0,
          deposit: 0,
          lines: q.lines.map(l => ({
            label: l.label,
            unit: 'm²',
            quantity: Math.round(l.area * 100),
            price: l.cents,
            tax: 0,
            tier: 0,
            lot: q.facts.room,
            serviceId: ''
          }))
        };
        run('INSERT INTO documents(id,data,status,version,updated) VALUES(?,?,?,1,?)', q.id, JSON.stringify(d), 'Archivé', q.created);
      }
    }
  });
  // Ajout idempotent sur les bases déjà installées, sans modifier les prix personnalisés.
  atomic(() => {
    for (const s of catalog.slice(28)) run('INSERT OR IGNORE INTO services VALUES(?,?,1)',s.id,JSON.stringify(s));
  });
  const findDoc = id => {
    const row = get('SELECT * FROM documents WHERE id=?', id);
    if(!row)fail('Devis introuvable.',404);
    const doc=readDoc(row),proof=get('SELECT data FROM signatures WHERE document_id=?',id);
    if(proof)doc.signature=JSON.parse(proof.data);
    return doc;
  };
  const snapshotPricing = lines => {
    const services = new Map(all('SELECT * FROM services').map(row => [row.id, unpack(row)]));
    return lines.map(line => {
      const service = services.get(line.serviceId) ?? line;
      return !line.serviceId || fixedTier(service) !== undefined
        ? { ...line, fixedPrice: true } : line;
    });
  };
  const check = (actual, version) => {
    if (actual !== version) fail('Une autre personne a modifié cette fiche. Rechargez avant de continuer.', 409);
  };
  return {
    atomic,
    event,
    settings,
    findDoc,
    all,
    get,
    run,
    list: table => all('SELECT * FROM ' + table + ' ORDER BY rowid').map(unpack),
    summaries: () => all(`SELECT id,seq,status,updated,json_extract(data,'$.title') AS title,
 json_extract(data,'$.client.name') AS name,json_extract(data,'$.issued') AS issued,
 json_extract(data,'$.site') AS site,json_extract(data,'$.valid') AS valid,
 json_extract(data,'$.total') AS total FROM documents ORDER BY updated DESC`).map(r => {
      let total = r.total;
      if (total == null) {
        const d = findDoc(r.id);
        total = amounts(d.lines, d.discount, d.deposit).total;
      }
      return {
        id: r.id,
        number: 'DEV-' + String(r.seq).padStart(5, '0'),
        title: r.title,
        client: {
          name: r.name
        },
        status: r.status,
        issued: r.issued,
        valid: r.valid,
        site: r.site,
        updated: r.updated,
        total
      };
    }),
    documents: () => all('SELECT * FROM documents ORDER BY updated DESC').map(readDoc),
    change(table, id, data, version, actor) {
      return atomic(() => {
        const prior = get('SELECT version FROM ' + table + ' WHERE id=?', id);
        check(prior?.version || 0, version);
        run('INSERT INTO ' + table + '(id,data,version) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=version+1', id, JSON.stringify(data));
        event(actor, {
          settings: 'Entreprise mise à jour',
          services: 'Tarif enregistré',
          customers: 'Client enregistré'
        }[table], String(id));
        return {
          id,
          ...data,
          version: version + 1
        };
      });
    },
    save(o, actor) {
      return atomic(() => {
        const id = uuid(o.id),
          row = get('SELECT * FROM documents WHERE id=?', id);
        check(row?.version || 0, o.version);
        if (row && row.status !== 'Brouillon') fail('Ce devis est figé. Dupliquez-le pour le réviser.', 409);
        const d = document(o);
        d.lines = snapshotPricing(d.lines);
        d.company = settings();
        d.total = amounts(d.lines, d.discount, d.deposit).total;
        run("INSERT INTO documents(id,data,status,version,updated) VALUES(?,?,'Brouillon',1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=version+1,updated=excluded.updated", id, JSON.stringify(d), new Date().toISOString());
        event(actor, row ? 'Brouillon modifié' : 'Devis créé', id);
        return findDoc(id);
      });
    },
    status(id, next, version, actor) {
      return atomic(() => {
        const d = findDoc(id);
        check(d.version, version);
        const allowed = {
          Brouillon: ['Validé', 'Archivé'],
          Validé: ['Envoyé', 'Archivé'],
          Envoyé: ['Accepté', 'Refusé'],
          Accepté: ['Archivé'],
          Refusé: ['Archivé']
        };
        if (!allowed[d.status]?.includes(next)) fail('Transition indisponible.');
        if (next === 'Validé' && d.valid < new Date().toISOString().slice(0, 10)) fail('Actualisez la date de validité du devis.');
        if (next === 'Validé' && (!d.client.name || !d.lines.length || !amounts(d.lines, d.discount).total)) fail('Ajoutez un client et au moins une prestation facturable.');
        let pricingSnapshot = null;
        if (d.status === 'Brouillon') {
          const data = JSON.parse(get('SELECT data FROM documents WHERE id=?', id).data);
          data.lines = snapshotPricing(data.lines);
          pricingSnapshot = JSON.stringify(data);
        }
        run('UPDATE documents SET data=COALESCE(?,data),status=?,version=version+1,updated=? WHERE id=?', pricingSnapshot, next, new Date().toISOString(), id);
        event(actor, 'Devis · ' + next, id);
        return findDoc(id);
      });
    }
  };
}
