// Notification mobile optionnelle via un sujet ntfy privé, configuré par l’exploitant.
export function notifications(w, env = process.env, send = fetch) {
  if (!env.NTFY_URL) return {
    stop() {},
    enabled: false
  };
  const url = new URL(env.NTFY_URL);
  if (url.protocol !== 'https:' || url.pathname === '/') throw Error('NTFY_URL doit désigner un sujet HTTPS.');
  const enqueue = w.run;
  // Le déclencheur temporaire appartient à cette connexion et disparaît à son arrêt.
  enqueue(`CREATE TEMP TRIGGER IF NOT EXISTS notify_event AFTER INSERT ON main.events
 WHEN NEW.action IN ('Devis créé','Devis · Validé','Devis · Envoyé','Devis · Accepté','Devis · Refusé','Réponse client · Accepté','Réponse client · Refusé')
 BEGIN INSERT INTO delivery_queue(event_id) VALUES(NEW.id); END`);
  let busy = false,
    stopped = false;
  const tick = async () => {
    if (busy || stopped) return;
    busy = true;
    try {
      const pending = w.all('SELECT q.event_id,q.attempts,e.action,d.seq FROM delivery_queue q JOIN events e ON e.id=q.event_id LEFT JOIN documents d ON d.id=e.target WHERE q.retry_after<=? ORDER BY q.event_id LIMIT 10', Date.now());
      for (const p of pending) {
        if (stopped) break;
        try {
          const headers = {
            'Content-Type': 'text/plain; charset=utf-8',
            'Title': 'QuoteRelay'
          };
          if (env.NTFY_TOKEN) headers.Authorization = 'Bearer ' + env.NTFY_TOKEN;
          const result = await send(url, {
            method: 'POST',
            headers,
            body: p.action + (p.seq ? ' · DEV-' + String(p.seq).padStart(5, '0') : ''),
            signal: AbortSignal.timeout(5000),
            redirect: 'error'
          });
          if (!result.ok) throw Error('Envoi refusé.');
          if (!stopped) w.run('DELETE FROM delivery_queue WHERE event_id=?', p.event_id);
        } catch {
          if (!stopped) w.run('UPDATE delivery_queue SET attempts=attempts+1,retry_after=? WHERE event_id=?', Date.now() + Math.min(3600000, 10000 * 2 ** Math.min(10, p.attempts)), p.event_id);
        }
      }
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => tick().catch(() => console.error('Service de notifications indisponible.')), 10000);
  timer.unref();
  return {
    enabled: true,
    tick,
    stop() {
      stopped = true;
      clearInterval(timer);
    }
  };
}
