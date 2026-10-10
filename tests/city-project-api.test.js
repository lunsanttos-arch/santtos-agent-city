const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('Coder e Tester recebem missões independentes no mesmo projeto e nomes persistem',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'santtos-pair-api-'));let server;
 try{
  for(const file of ['server.js','civic.js','academy.js','security.js','github.js','world.js'])fs.copyFileSync(path.join(__dirname,'..',file),path.join(dir,file));
  fs.mkdirSync(path.join(dir,'data'));const world=require('../world').createWorld(),office=world.objects.find(o=>o.kind==='office');office.github={name:'example/project',branch:'main'};fs.writeFileSync(path.join(dir,'data/world.json'),JSON.stringify(world));
  server=require(path.join(dir,'server.js')).createApp();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  async function post(route,body){const response=await fetch(base+'/api/'+route,{method:'POST',headers:{'content-type':'application/json','x-santtos-city':'1'},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};}
  const civic=await(await fetch(base+'/api/civic')).json(),team=civic.agents.filter(a=>a.projectId===office.projectId);assert.equal(team.length,2);
  const missions=await Promise.all(team.map(agent=>post('job',{projectId:office.projectId,provider:agent.provider,agentId:agent.id,prompt:'Revisar esta funcionalidade'})));assert(missions.every(r=>r.status===201&&r.data.job.status==='pending'));assert.notEqual(missions[0].data.job.id,missions[1].data.job.id);assert.notEqual(missions[0].data.job.agentId,missions[1].data.job.agentId);
  const extra=await post('job',{projectId:office.projectId,provider:'codex',prompt:'Outro personagem'});assert.equal(extra.status,422);
  assert.equal((await post('civic/agent/name',{agentId:team[0].id,name:'Ana Coder'})).status,200);assert.equal((await post('building/name',{id:office.id,name:'Meu Projeto'})).status,200);
  const saved=JSON.parse(fs.readFileSync(path.join(dir,'data/civic.json'),'utf8'));assert.equal(saved.agents.find(a=>a.id===team[0].id).name,'Ana Coder');assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'data/world.json'),'utf8')).objects.find(o=>o.id===office.id).name,'Meu Projeto');
  const bad=await post('building/name',{id:office.id,name:'x'});assert.equal(bad.status,400);
 }finally{if(server)await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
