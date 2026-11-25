import { randomBytes, scrypt as scryptCallback, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { fail, str, num } from './workspace.js';
const derive = promisify(scryptCallback);
const digest = s => createHash('sha256').update(s).digest('hex');
const secret = req => req.headers.cookie?.match(/(?:^|; *)ma_session=([0-9a-f]{64})(?:;|$)/)?.[1] || '';
export async function auth(w) {
  const roles = ['Administrateur', 'Bureau', 'Terrain', 'Lecture'];
  async function hash(password) {
    if (typeof password !== 'string' || password.length < 12 || password.length > 256) fail('Mot de passe attendu entre 12 et 256 caractères.');
    const salt = randomBytes(16).toString('hex');
    return salt + ':' + (await derive(password, salt, 64)).toString('hex');
  }
  const dummy = await hash(randomBytes(24).toString('base64url'));
  async function add(o, actor) {
    const name = str(o.name),
      login = str(o.login, 100).toLowerCase();
    if (!name || !/^[-a-z0-9._@+]{2,100}$/.test(login) || !roles.includes(o.role)) fail('Nom, identifiant ou rôle invalide.');
    const encoded = await hash(o.password);
    return w.atomic(() => {
      if (w.get('SELECT id FROM users WHERE login=?', login)) fail('Identifiant déjà utilisé.', 409);
      w.run('INSERT INTO users(name,login,hash,role) VALUES(?,?,?,?)', name, login, encoded, o.role);
      w.event(actor, 'Compte créé', login);
      return {
        ok: true
      };
    });
  }
  if (!w.get('SELECT id FROM users LIMIT 1')) {
    const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_TOKEN;
    if (!password && process.env.NODE_ENV === 'production') fail('Définissez ADMIN_PASSWORD avant le premier lancement.');
    const temp = password || randomBytes(18).toString('base64url');
    await add({
      name: 'Administration',
      login: process.env.ADMIN_LOGIN || 'admin',
      role: roles[0],
      password: temp
    }, 'Installation');
    if (!password) console.log('Premier accès local · admin · mot de passe : ' + temp);
  }
  const failures = new Map();
  return {
    add,
    roles,
    members: () => w.all('SELECT id,name,login,role,active FROM users ORDER BY name'),
    current(req) {
      return w.get('SELECT u.id,u.name,u.login,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>? AND u.active=1', digest(secret(req)), Date.now());
    },
    logout(req) {
      w.run('DELETE FROM sessions WHERE token=?', digest(secret(req)));
    },
    async login(o, ip) {
      const now = Date.now();
      for (const [key, v] of failures) if (v.until <= now) failures.delete(key);
      if ((failures.get(ip)?.n || 0) >= 15) fail('Trop de tentatives. Réessayez dans dix minutes.', 429);
      const login = str(o.login, 100).toLowerCase(),
        password = o.password;
      if (typeof password !== 'string' || password.length > 256) fail('Identifiants invalides.', 401);
      const row = w.get('SELECT * FROM users WHERE login=? AND active=1', login);
      const [salt, expected] = (row?.hash || dummy).split(':');
      const f = failures.get(ip) || {
        n: 0,
        until: now + 600000
      };
      f.n++;
      failures.set(ip, f);
      if (!timingSafeEqual(await derive(password, salt, 64), Buffer.from(expected, 'hex')) || !row) fail('Identifiant ou mot de passe incorrect.', 401);
      const active = w.get('SELECT id FROM users WHERE id=? AND active=1 AND hash=?', row.id, row.hash);
      if (!active) fail('Le compte a changé. Reconnectez-vous.', 401);
      failures.delete(ip);
      const token = randomBytes(32).toString('hex');
      w.run('DELETE FROM sessions WHERE expires<=?', now);
      w.run('INSERT INTO sessions VALUES(?,?,?)', digest(token), row.id, now + 43200000);
      return token;
    },
    async manage(o, me) {
      const id = num(o.id, 1, 2147483647),
        row = w.get('SELECT * FROM users WHERE id=?', id);
      if (!row) fail('Compte introuvable.', 404);
      if (id === me.id && o.active === false) fail('Ce compte est utilisé pour votre session.');
      const encoded = o.password ? await hash(o.password) : null;
      if (typeof o.active !== 'boolean') fail('État du compte requis.');
      w.atomic(() => {
        w.run('UPDATE users SET active=?,hash=COALESCE(?,hash) WHERE id=?', Number(o.active), encoded, id);
        w.run('DELETE FROM sessions WHERE user_id=?', id);
        w.event(me.name, 'Compte mis à jour', row.login);
      });
      return {
        ok: true
      };
    }
  };
}
