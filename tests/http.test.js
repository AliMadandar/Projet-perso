import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
test('authentification, révocation, isolation des rôles et des origines', async () => {
  const password = randomBytes(20).toString('hex');
  const proc = spawn(process.execPath, ['src/server.js'], {
    env: {
      ...process.env,
      DB_PATH: ':memory:',
      ADMIN_PASSWORD: password,
      ADMIN_LOGIN: 'admin',
      PORT: '0',
      APP_ORIGIN: '',
      NODE_ENV: 'test',
      HOST: '127.0.0.1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    const [startup] = await once(proc.stdout, 'data');
    const port = startup.toString().match(/port (\d+)/)[1],
      base = 'http://127.0.0.1:' + port + '/api/';
    const call = (path, body, cookie = '', method = body ? 'POST' : 'GET', extra = {}) => fetch(base + path, {
      method,
      headers: {
        'content-type': 'application/json',
        cookie,
        ...extra
      },
      body: body ? JSON.stringify(body) : undefined
    });
    assert.equal((await call('state')).status, 401);
    const a = await call('login', {
      login: 'admin',
      password
    });
    assert.equal(a.status, 200);
    const ac = a.headers.get('set-cookie').split(';')[0];
    const state = await (await call('state', null, ac)).json();
    assert.equal(state.services.length, 110);
    assert.equal((await call('company', {
      ...state.company,
      name: 'Entreprise'
    }, ac, 'POST', {
      origin: 'https://invalide.example'
    })).status, 403);
    assert.equal((await call('users', {
      name: 'Test',
      login: 'test',
      password,
      role: 'Lecture'
    }, ac)).status, 200);
    const l = await call('login', {
        login: 'test',
        password
      }),
      lc = l.headers.get('set-cookie').split(';')[0];
    assert.equal((await call('state', null, lc)).status, 200);
    assert.equal((await call('documents', {}, lc)).status, 403);
    assert.equal((await call('billing/00000000-0000-4000-8000-000000000000',null,lc)).status,403);
    assert.equal((await call('invoice',{},lc)).status,403);
    assert.equal((await call('payment',{},lc)).status,403);
    const members = (await (await call('state', null, ac)).json()).members;
    assert.equal((await call('users', {
      id: members.find(m => m.login === 'test').id,
      active: false
    }, ac, 'PUT')).status, 200);
    assert.equal((await call('state', null, lc)).status, 401);
    assert.equal((await call('logout', {}, ac)).status, 200);
    assert.equal((await call('state', null, ac)).status, 401);
  } finally {
    proc.kill();
    await once(proc, 'exit');
  }
});
