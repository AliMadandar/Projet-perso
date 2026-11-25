import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {newEdition,editionPaper,installments} from '../web/edition.js';
import {localRewrite} from '../web/writer.js';
import {paper} from '../web/editor.js';
import {openStore} from '../src/store.js';
import {workspace} from '../src/workspace.js';
import {catalog} from '../src/catalog.js';
test('échéances : les arrondis laissent un solde exact, même au centime',()=>{
  for(const total of [1,2,3,1001,369600]){
    for(const [first,middle] of [[4000,5000],[5000,4000],[5000,5000],[0,0]]){
      const parts=installments(total,first,middle);
      assert.equal(parts.reduce((s,x)=>s+x,0),total);assert.ok(parts.every(x=>x>=0));
    }
  }
});
test('nouveau modèle conservé en base et à la relecture ; ancien devis conservé',()=>{
  const store=openStore(':memory:'),w=workspace(store.db);
  try{
    const base={id:randomUUID(),title:'Plafond',version:0,client:{name:'Exemple'},lines:[],issued:'2026-11-21',valid:'2026-12-21',discount:0,deposit:5000,notes:'',terms:''};
    const old=w.save(base,'Test');assert.doesNotMatch(paper(old),/Échéancier/);
    const d=w.save({...base,id:randomUUID(),edition:{...newEdition('Peinture'),middle:4000,spec:'Finition mate'}},'Test');
    const html=editionPaper(w.findDoc(d.id));assert.match(html,/Finition mate/);assert.match(html,/tone-sauge/);assert.match(html,/50 %/);assert.match(html,/40 %/);
    assert.throws(()=>w.save({...d,edition:{...d.edition,middle:7000}},'Test'));
  }finally{store.close();}
});
test('mise à jour du catalogue sur une base existante et tarifs locaux préservés',()=>{
  const store=openStore(':memory:'),w=workspace(store.db);
  try{
    const old=w.list('services')[0];w.change('services',old.id,{...old,prices:[7800,9100,9900,12100]},old.version,'Test');
    w.run("DELETE FROM services WHERE id='s110'");
    const after=workspace(store.db);assert.equal(after.list('services').length,catalog.length);
    assert.equal(after.list('services').find(s=>s.id===old.id).prices[0],7800);
  }finally{store.close();}
});
test('reformulation locale : quantités et exclusions conservées',()=>{
 const msg=localRewrite('je veux poser 20 m2 de carrelage sans dépose','Professionnel');
 assert.equal(msg,'Pose de 20 m² de carrelage sans dépose.');
});
