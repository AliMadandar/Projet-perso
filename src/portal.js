import { createHash, randomBytes } from 'node:crypto';
import { fail, str } from './workspace.js';
const digest = t => createHash('sha256').update(t).digest('hex');
const expired = d => new Date().toISOString().slice(0, 10) > d.valid;
const consent = 'Je signe ce devis et accepte les travaux, leur prix et les conditions qui y figurent.';
export function portal(w) {
  const find = token => {
    if (!/^[0-9a-f]{64}$/.test(token)) fail('Lien indisponible.', 404);
    const row = w.get('SELECT document_id FROM public_links WHERE token_hash=? AND expires>?', digest(token), Date.now());
    if (!row) fail('Ce lien a expiré ou a été désactivé.', 404);
    const doc = w.findDoc(row.document_id);
    if (doc.status === 'Archivé') fail('Ce devis est archivé.', 410);
    return doc;
  };
  return {
    create(id, actor) {
      return w.atomic(() => {
        const d = w.findDoc(id);
        if (!['Validé', 'Envoyé'].includes(d.status)) fail('Validez ce devis pour créer un lien.');
        const token = randomBytes(32).toString('hex');
        const expires = Date.now() + 30 * 86400000;
        w.run('DELETE FROM public_links WHERE document_id=? OR expires<=?', id, Date.now());
        w.run('INSERT INTO public_links VALUES(?,?,?)', digest(token), id, expires);
        w.event(actor, 'Lien client créé', id);
        return {
          path: '/client#' + token,
          expires
        };
      });
    },
    revoke(id, actor) {
      return w.atomic(() => {
        w.run('DELETE FROM public_links WHERE document_id=?', id);
        w.event(actor, 'Lien client désactivé', id);
        return {
          ok: true
        };
      });
    },
    view(token) {
      const d = find(token);
      return {
        document: d, canReply: d.status === 'Envoyé' && !expired(d), consent, digest:digest(JSON.stringify(d)),
        reply: w.get('SELECT name,decision,at FROM replies WHERE document_id=?', d.id) || null
      };
    },
    reply(token, o) {
      return w.atomic(() => {
        const d = find(token),
          name = str(o.name, 120);
        if (!name || o.confirm !== true || !['Accepté', 'Refusé'].includes(o.decision)) fail('Précisez votre nom et confirmez votre décision.');
        if (d.status !== 'Envoyé') fail('Ce devis ne reçoit plus de réponse.', 409);
        if (expired(d)) fail('La durée de validité est dépassée.', 409);
        const at = new Date().toISOString();
        if(o.decision==='Accepté'){
          const snapshot=JSON.stringify(d),hash=digest(snapshot);
          if(o.digest!==hash||o.consent!==consent)fail('Rechargez le devis et confirmez le texte de signature.',409);
          const ink=o.ink??[];
          if(!Array.isArray(ink)||ink.length>30||ink.some(stroke=>!Array.isArray(stroke)||stroke.length<2||stroke.length>400||stroke.some(point=>!Array.isArray(point)||point.length!==2||!Number.isInteger(point[0])||point[0]<0||point[0]>480||!Number.isInteger(point[1])||point[1]<0||point[1]>128)))fail('Tracé de signature invalide.');
          const proof={name,at,ink,consent,digest:hash,number:d.number,version:d.version,method:'Nom saisi et consentement explicite via lien privé'};
          w.run('INSERT INTO signatures VALUES(?,?,?)',d.id,JSON.stringify(proof),snapshot);
        }
        w.run('INSERT INTO replies VALUES(?,?,?,?)', d.id, o.decision, name, at);
        w.run('UPDATE documents SET status=?,version=version+1,updated=? WHERE id=?', o.decision, at, d.id);
        w.event('Client · ' + name, 'Réponse client · ' + o.decision, d.id);
        return {
          ok: true
        };
      });
    }
  };
}
