'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const civic=require('../civic');
const {scanSource,reviewPublicRepo}=require('../security');
test('central gera nome e skin sem entrada manual',()=>{
 const agent=civic.addAgent({provider:'codex',role:'bibliotecaria',service:'library'});
 assert.match(agent.name,/\w+\s+\w+/);
 assert.equal(agent.service,'library');
 assert.match(agent.skin.outfit,/^#[0-9a-f]{6}$/i);
 assert.equal(civic.getAgent(agent.id).id,agent.id);
});
test('biblioteca organiza coleções, perfis e referências',()=>{
 const name='colecao-test-'+require('node:crypto').randomUUID();const coll=civic.addCollection({name});
 const saved=civic.addRepoToCollection({collectionId:coll.id,repo:'nodejs/node'});
 assert.deepEqual(saved.repos,['nodejs/node']);
 const profile=civic.addProfile({username:'lunsanttos-arch'});
 assert.equal(profile.username,'lunsanttos-arch');
 assert.ok(civic.all().collections.some(c=>c.id===coll.id));
});
test('prefeitura permite registrar e concluir lembretes',()=>{
 const notice=civic.addReminder({message:'Revisar os testes da cidade'});
 assert.equal(notice.done,false);
 assert.equal(civic.finishReminder(notice.id).done,true);
});
test('polícia marca linha e tipo da ocorrência sem vazar código',()=>{
 const found=scanSource('const x = 1;\neval(untrusted);\nconst y=2;', 'src/app.js');
 assert.equal(found.length,1);assert.equal(found[0].line,2);assert.equal(found[0].id,'eval');
 assert.ok(!('snippet' in found[0]));
});
test('triagem de repositório público é limitada e usa API do GitHub',async()=>{
 const mock=async (url)=>{
  if(url.endsWith('/owner/repo/'))return {ok:true,json:async()=>({private:false,default_branch:'main'})};
  if(url.includes('/git/trees/'))return {ok:true,json:async()=>({truncated:false,tree:[{type:'blob',path:'src/main.js',size:80},{type:'blob',path:'node_modules/evil.js',size:20}]})};
  return {ok:true,json:async()=>({encoding:'base64',content:Buffer.from('const value=eval(x);').toString('base64')})};
 };
 const report=await reviewPublicRepo('owner/repo',mock);
 assert.equal(report.filesReviewed,1);assert.equal(report.findings[0].id,'eval');
 await assert.rejects(()=>reviewPublicRepo('https://evil.local',mock));
});
