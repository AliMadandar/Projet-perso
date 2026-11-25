import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {openStore} from '../src/store.js';
import {workspace} from '../src/workspace.js';
test('restauration séparée du devis, des révisions et du catalogue depuis une base active', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ma-renovation-test-'));
  const source = join(dir, 'source.sqlite'), backup = join(dir, 'backup.sqlite');
  const store = openStore(source);
  try {
    const w = workspace(store.db);
    const d = w.save({id:randomUUID(),version:0,title:'Salle de bains',issued:'2026-01-01',valid:'2099-01-01',
      client:{name:'Client exemple'},notes:'',terms:'',lines:[],discount:0,deposit:0},'Bureau');
    w.save({...d,title:'Deux pièces'},'Bureau');
    execFileSync(process.execPath,['scripts/backup.js',backup],{env:{...process.env,DB_PATH:source}});
    const restored=openStore(backup);
    try {
      const copy=workspace(restored.db);
      assert.equal(copy.findDoc(d.id).title,'Deux pièces');
      assert.equal(copy.get('SELECT COUNT(*) AS n FROM revisions WHERE document_id=?',d.id).n,2);
      assert.equal(copy.list('services').length,110);
      assert.equal(copy.summaries()[0].total,0);
    } finally { restored.close(); }
  } finally { store.close(); rmSync(dir,{recursive:true,force:true}); }
});
