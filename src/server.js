import {billing} from './billing.js';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { openStore } from './store.js';
import { workspace, edition, customer, service, company, fail, uuid, num, str } from './workspace.js';
import { notifications } from './notifications.js';
import { portal } from './portal.js';
import { auth } from './auth.js';
import { extract, projectBrief } from './gemini.js';
import {correspondence,gmailReady} from './correspondance.js';
import {rewriteText} from './rewrite.js';
import { fields, conditions, validate } from './domain.js';
import { tiers, units } from './catalog.js';
const store = openStore(process.env.DB_PATH || 'data/atelier.sqlite');
const w = workspace(store.db),
  access = await auth(w), mail=correspondence(w),
  clientPortal = portal(w), accounts=billing(w),
  delivery = notifications(w);
const prod = process.env.NODE_ENV === 'production',
  origin = process.env.APP_ORIGIN;
if (prod && (!origin || !origin.startsWith('https://'))) throw Error('APP_ORIGIN doit être une origine HTTPS en production.');
const assets = new Set(['index.html','mobile.js','mobile.css', 'app.js', 'ui.js', 'editor.js', 'photos.js','edition.js','courrier.js','terrain.js','writer.js','ma-logo.png','references.js', 'assistant.js', 'brief.js', 'voice.js', 'style.css', 'money.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'sw.js', 'offline.html', 'client.html', 'client.js','billing.js','sheet.js','signature.js']);
const types = {
  html: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  svg: 'image/svg+xml',
  png: 'image/png',
  webmanifest: 'application/manifest+json'
};
async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) fail('Format JSON requis.', 415);
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > 6000000) fail('Enregistrement trop long.', 413);
    chunks.push(c);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error();
    return data;
  } catch {
    fail('JSON invalide.');
  }
}
const cookie = (token, seconds) => 'ma_session=' + token + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=' + seconds + (prod ? '; Secure' : '');
const ongoing = new Set();
const server = http.createServer(async (req, res) => {
  const path = (req.url || '/').split('?')[0],
    method = req.method;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('Cache-Control', 'no-store');
  const json = (status, data) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify(data));
  };
  try {
    if (!prod && !origin && !['localhost', '127.0.0.1'].includes((req.headers.host || '').split(':')[0])) fail('Configurez APP_ORIGIN pour cet hôte.', 403);
    if (origin && req.headers.host !== new URL(origin).host) fail('Hôte non autorisé.', 403);
    if (req.headers.origin && req.headers.origin !== (origin || 'http://' + req.headers.host)) fail('Origine incorrecte.', 403);
    const file = path === '/' ? 'index.html' : path === '/client' ? 'client.html' : path.slice(1);
    if (method === 'GET' && assets.has(file)) {
      const data = await readFile(new URL('../web/' + file, import.meta.url));
      res.writeHead(200, {
        'Content-Type': types[file.split('.').pop()]
      });
      return res.end(data);
    }
    if (path === '/health' && method === 'GET') {
      w.get('SELECT 1');
      return json(200, {
        ok: true
      });
    }
    if (path === '/api/login' && method === 'POST') {
      const token = await access.login(await body(req), req.socket.remoteAddress);
      res.setHeader('Set-Cookie', cookie(token, 43200));
      return json(200, {
        ok: true
      });
    }
    if (path === '/api/portal' && method === 'POST') {
      const o = await body(req);
      return json(200, o.decision ? clientPortal.reply(o.token, o) : clientPortal.view(o.token));
    }
    const me = access.current(req);
    if (!me) fail('Connexion requise.', 401);
    const admin = () => {
      if (me.role !== 'Administrateur') fail('Accès administrateur requis.', 403);
    };
    const edit = () => {
      if (me.role === 'Lecture') fail('Accès en lecture seule.', 403);
    };
    if (path === '/api/logout' && method === 'POST') {
      access.logout(req);
      res.setHeader('Set-Cookie', cookie('', 0));
      return json(200, {
        ok: true
      });
    }
    const events = () => w.all('SELECT * FROM events ORDER BY id DESC LIMIT 100');
    if (path === '/api/state' && method === 'GET') return json(200, {
      me,
      tiers,
      units,
      mobileNotifications: delivery.enabled,
      roles: access.roles, gmail:gmailReady(process.env), reminders:me.role==='Administrateur'?mail.reminders():[],
      ai: !!process.env.GEMINI_API_KEY,
      fields,
      conditions,
      profiles: Object.fromEntries(w.all('SELECT * FROM quote_profiles').map(r=>[r.trade,{...JSON.parse(r.data),version:r.version}])),
      services: w.list('services'),
      customers: w.list('customers'),
      company: w.settings(),
      documents: w.summaries(),
      events: events(),
      lastRead: w.get('SELECT last_event FROM receipts WHERE user_id=?', me.id)?.last_event || 0,
      members: me.role === 'Administrateur' ? access.members() : []
    });
    if (path === '/api/events' && method === 'GET') return json(200, events());
    if (path.startsWith('/api/document/') && method === 'GET') return json(200, w.findDoc(uuid(path.slice('/api/document/'.length))));
    if (path.startsWith('/api/history/') && method === 'GET') {
      const id = uuid(path.slice('/api/history/'.length));
      w.findDoc(id);
      return json(200, w.all('SELECT version,status,at FROM revisions WHERE document_id=? ORDER BY version DESC', id));
    }
    if (path.startsWith('/api/revision/') && method === 'GET') {
      const [,,, id, v] = path.split('/');
      const d = w.findDoc(uuid(id));
      const r = w.get('SELECT * FROM revisions WHERE document_id=? AND version=?', id, num(Number(v), 1, 2147483647));
      if (!r) fail('Version introuvable.', 404);
      return json(200, {
        ...JSON.parse(r.snapshot),
        id,
        number: d.number,
        status: r.status,
        version: r.version
      });
    }
    if(path.startsWith('/api/billing/')&&method==='GET'){admin();return json(200,accounts.ledger(path.slice('/api/billing/'.length)));}
    if(path.startsWith('/api/evidence/')&&method==='GET'){
      admin(); const record=w.get('SELECT data,snapshot FROM signatures WHERE document_id=?',uuid(path.slice('/api/evidence/'.length)));
      if(!record)fail('Signature introuvable.',404);return json(200,{proof:JSON.parse(record.data),signedSnapshot:record.snapshot});
    }
    const o = await body(req);
    if(path==='/api/invoice'&&method==='POST'){admin();return json(200,accounts.issue(o,me.name));}
    if(path==='/api/payment'&&method==='POST'){admin();return json(200,accounts.payment(o,me.name));}
    if (path === '/api/read' && method === 'POST') {
      const id = num(o.id, 0, w.get('SELECT COALESCE(MAX(id),0) AS n FROM events').n);
      w.run('INSERT INTO receipts VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET last_event=MAX(last_event,excluded.last_event)', me.id, id);
      return json(200, {
        ok: true
      });
    }
    edit();
    if(path==='/api/reminder'&&method==='POST'){admin();return json(200,mail.reminder(o,me.name));}
    if(path==='/api/mail'&&method==='POST'){admin();return json(200,await mail.send(o,me.name));}
    if(path==='/api/rewrite'&&method==='POST'){
      const text=str(o.text,4000);
      if(!text||!['Professionnel','Plus lisible'].includes(o.tone))fail('Texte ou style incorrect.');
      if(ongoing.has(me.id))fail('Une demande est déjà en cours.',429);
      ongoing.add(me.id);
      try { return json(200,await rewriteText(text,o.tone,process.env.GEMINI_API_KEY,process.env.GEMINI_MODEL||'gemini-3.8-flash',str(o.instruction||'',600))); }
      catch(error){ fail(error.message,502); } finally {ongoing.delete(me.id);}
    }
    if (path === '/api/documents' && method === 'POST') {
      if(me.role!=='Administrateur' && Array.isArray(o.lines)){
        const prices=new Map(w.list('services').map(s=>[s.id,s]));
        const prior=o.version?w.findDoc(uuid(o.id)).lines:[];
        for(const l of o.lines){
          if(prices.get(l.serviceId)?.prices?.[l.tier]===l.price)continue;
          if(prior.some(p=>p.serviceId===l.serviceId&&p.tier===l.tier&&p.price===l.price))continue;
          fail('Tarif réservé à l’administration. Choisissez une prestation du catalogue.',403);
        }
      }
      return json(200,w.save(o,me.name));
    }
    if (path === '/api/share' && method === 'POST') {
      if (me.role !== 'Administrateur') fail('Partage réservé à l’administration.', 403);
      return json(200, o.revoke ? clientPortal.revoke(uuid(o.id), me.name) : clientPortal.create(uuid(o.id), me.name));
    }
    if (path === '/api/status' && method === 'POST') {
      if (me.role !== 'Administrateur') fail('Validation réservée à l’administration.', 403);
      return json(200, w.status(uuid(o.id), o.status, o.version, me.name));
    }
    if (path === '/api/customers' && method === 'POST') return json(200, w.change('customers', uuid(o.id), customer(o), o.version, me.name));
    if (['/api/extract', '/api/brief'].includes(path) && method === 'POST') {
      const current = validate(o.current || {}),
        description = str(o.description || '', 8000),
        audio = o.audio || '';
      if (typeof audio !== 'string' || audio.length > 5900000 || !description && !audio) fail('Description ou enregistrement requis.');
      if (ongoing.has(me.id)) fail('Analyse déjà en cours.', 429);
      ongoing.add(me.id);
      try {
        if (path === '/api/brief') {
          if (!Array.isArray(o.history) || JSON.stringify(o.history).length > 60000) fail('Dialogue trop long. Ajoutez les lignes puis ouvrez une nouvelle demande.');
          return json(200, await projectBrief({
            description,
            audio,
            history: o.history
          }, w.list('services'), process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL || 'gemini-3.8-flash'));
        }
        return json(200, await extract({
          current,
          description,
          audio
        }, process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL || 'gemini-3.8-flash'));
      } finally {
        ongoing.delete(me.id);
      }
    }
    admin();
    if(path==='/api/profile'&&method==='POST'){
      admin();const first=num(o.first,0,10000), template=edition(o.edition,first);
      if(!template?.trade)fail('Domaine requis.');
      return json(200,w.atomic(()=>{
        const prior=w.get('SELECT version FROM quote_profiles WHERE trade=?',template.trade)?.version||0;
        if(o.version!==prior)fail('Modèle modifié ailleurs. Rechargez la page.',409);
        const profile={first,edition:template};
        w.run('INSERT INTO quote_profiles VALUES(?,?,?) ON CONFLICT(trade) DO UPDATE SET data=excluded.data,version=excluded.version',template.trade,JSON.stringify(profile),prior+1);
        w.event(me.name,'Modèle de devis enregistré',template.trade);
        return {...profile,version:prior+1};
      }));
    }
    if (path === '/api/services' && method === 'POST') {
      const id = /^s\d+$/.test(o.id) ? o.id : uuid(o.id);
      return json(200, w.change('services', id, service(o), o.version, me.name));
    }
    if (path === '/api/company' && method === 'POST') return json(200, w.change('settings', 1, company(o), o.version, me.name));
    if (path === '/api/users' && method === 'POST') return json(200, await access.add(o, me.name));
    if (path === '/api/users' && method === 'PUT') return json(200, await access.manage(o, me));
    fail('Route introuvable.', 404);
  } catch (e) {
    const status = e.status || (['/api/extract', '/api/brief'].includes(path) ? 400 : 500);
    if (status === 500) console.error(e);
    json(status, {
      error: status === 500 ? 'Erreur interne. Consultez le journal du serveur.' : e.message
    });
  }
});
server.requestTimeout = 60000;
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log('Rivqo · port ' + server.address().port));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => {
  delivery.stop();
  store.close();
  process.exit(0);
}));
