const test=require('node:test');const assert=require('node:assert/strict');
const {createApp,extractStatus}=require('../server');
const server=createApp();let base;
test.before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`});
test.after(async()=>{await new Promise(resolve=>server.close(resolve));});
async function post(route,body,header=true){const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',...(header?{'x-santtos-city':'1'}:{})},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};}
test('API e mapa iniciam com nenhum agente fictício',async()=>{
 const r=await fetch(base+'/api/state');assert.equal(r.status,200);const d=await r.json();assert.equal(d.world.w,68);assert.equal(d.jobs.length,0);assert(d.world.objects.filter(p=>p.kind==='office').every(p=>!p.dir));
 const html=await(await fetch(base+'/')).text();assert.match(html,/GITHUB • PROJETO/);assert.doesNotMatch(html,/CAMINHO DO PROJETO NO WINDOWS/);
 const iso=await(await fetch(base+'/isometric.js')).text();assert.match(iso,/projectIso/);
});
test('POST requer proteção de origem',async()=>{
 const r=await post('/api/job',{prompt:'teste',provider:'codex'},false);assert.equal(r.status,403);
 const blocked=await fetch(base+'/api/project',{method:'POST',headers:{'x-santtos-city':'1','content-type':'application/json',origin:'http://evil.example'},body:'{}'});assert.equal(blocked.status,403);
});
test('sem GitHub não aceita uma missão de IA',async()=>{
 const data=await(await fetch(base+'/api/state')).json();const projectId=data.world.objects.find(o=>o.kind==='office').projectId;
 const r=await post('/api/job',{projectId,provider:'codex',prompt:'Revisar fontes de exemplo'});assert.equal(r.status,422);assert.match(r.data.error,/GitHub/);
});
test('rejeita simulação de agente desconectado',async()=>{
 const data=await(await fetch(base+'/api/state')).json();const projectId=data.world.objects.find(o=>o.kind==='office').projectId;
 const r=await post('/api/job',{projectId,provider:'demo',prompt:'Teste sem provedor'});assert.equal(r.status,400);
});
test('não publica pull request inexistente',async()=>{const r=await post('/api/job/publish',{id:'não-existe'});assert.equal(r.status,404);});
test('extrai status real dos eventos Manus',()=>{
 assert.equal(extractStatus([{type:'status_update',status_update:{agent_status:'waiting'}}]),'waiting');
 assert.equal(extractStatus([{type:'tool_used',tool_used:{brief:'rodando'}}]),null);
});

test('prefeitura, universidade e agencia de talentos possuem APIs reais',async()=>{
 const state=await(await fetch(base+'/api/state')).json();assert.equal(state.world.objects.filter(o=>o.kind==='service').length,5);
 const civic=await fetch(base+'/api/civic');assert.equal(civic.status,200);const v=await civic.json();assert(Array.isArray(v.agents));
 const bad=await post('/api/civic/agent',{name:'A',provider:'sem-ia',role:'fake'});assert.equal(bad.status,400);
});
