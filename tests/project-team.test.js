const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const behavior=import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(__dirname,'../public/city-behavior.js'),'utf8')).toString('base64'));
test('equipes persistem seis funções com cinco subagentes vinculados ao Gerente',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'santtos-team-test-'));
 try{
  fs.copyFileSync(path.join(__dirname,'../civic.js'),path.join(dir,'civic.cjs'));
  const civic=require(path.join(dir,'civic.cjs'));
  const projects=[{projectId:'a'},{projectId:'b'}];
  civic.ensureProjectTeams(projects);
  const first=civic.all().agents;
  assert.equal(first.length,12);
  civic.ensureProjectTeams(projects);
  assert.deepEqual(civic.all().agents.map(a=>a.id),first.map(a=>a.id));
  for(const p of projects){
   const team=first.filter(a=>a.projectId===p.projectId),manager=team.find(a=>a.projectRole==='manager');
   assert.equal(manager.agentType,'agent');assert.equal(manager.managerId,null);
   assert.deepEqual(team.map(a=>a.officeFunction),['Gerente','Código','QA','Tester','UX','Auxiliar']);
   assert(team.filter(a=>a.id!==manager.id).every(a=>a.agentType==='subagent'&&a.managerId===manager.id));
   assert(team.every(a=>a.skin.spriteIndex!==0));
   civic.configureProjectAgent({agentId:manager.id,provider:'claude'},['a','b']);
   assert.equal(civic.getAgent(manager.id).provider,'claude');
  }
  const researcher=civic.addAgent({provider:'codex',role:'pesquisa'});
  assert.equal(researcher.skin.spriteIndex,3);
  assert.throws(()=>civic.addAgent({provider:'codex',role:'qa',spriteIndex:0}),/exclusiva/);
  assert.throws(()=>civic.configureProjectAgent({agentId:researcher.id,provider:'claude'},['a','b']),/não encontrado/);
  assert.throws(()=>civic.assignAgent({agentId:researcher.id,projectId:'a',projectRole:'manager'},['a','b']),/já tem/);
  const saved=JSON.parse(fs.readFileSync(path.join(dir,'data/civic.json'),'utf8'));
  assert.equal(saved.agents.filter(a=>a.projectRole).length,12);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('entrada exige proximidade, missão iniciando já é trabalho e policiais patrulham quando ociosos',async()=>{
 const {canEnter,isWorking,interiorStaff,STAFF,PLAYER_SKIN}=await behavior;
 const building={x:20,y:10,w:6,h:5};
 assert(!canEnter({x:2,y:2},building));
 assert(canEnter({x:23,y:16.5},building));
 assert(!canEnter({x:28,y:17},building));
 assert(isWorking('agent',[{agentId:'agent',status:'running',connected:false}]));
 assert(!isWorking('agent',[{agentId:'agent',status:'pending'}]));
 assert(!isWorking('agent',[{agentId:'agent',status:'completed',connected:true}]));
 assert.equal(interiorStaff('police',{police:{busy:false}}).length,1);
 assert.equal(interiorStaff('police',{police:{busy:true}}).length,3);
 assert.equal(new Set(STAFF.map(a=>a.sprite)).size,STAFF.length);
 assert(STAFF.every(a=>a.sprite!==PLAYER_SKIN.spriteIndex));
 assert.equal(interiorStaff('talents')[0].role,'Recepcionista');
});
test('polícia revisa a missão local com limite de arquivos sem seguir symlinks nem guardar conteúdo',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'santtos-security-test-'));
 try{
  require('node:child_process').execFileSync('git',['init','--quiet'],{cwd:dir});
  fs.writeFileSync(path.join(dir,'00-source.js'),'eval(input);\nconst password = "example_fake_secret_12345";');
  fs.writeFileSync(path.join(dir,'package.json'),'{"dependencies":{"example":"latest"}}');
  try{fs.symlinkSync(path.join(__dirname,'../package.json'),path.join(dir,'01-symlink.js'));}catch(e){if(process.platform!=='win32'||e.code!=='EPERM')throw e;}
  for(let i=0;i<22;i++)fs.writeFileSync(path.join(dir,`file-${i}.js`),'const ok = 1;');
  const report=require('../security').reviewWorkspace(dir);
  assert.equal(report.filesReviewed,18);
  assert.equal(report.configFiles,1);
  assert(report.findings.some(f=>f.id==='eval'));
  assert(report.findings.some(f=>f.id==='hardcoded-secret'));
  assert(report.configFindings.some(f=>f.id==='unpinned-dependency'));
  assert(!report.findings.some(f=>f.file==='01-symlink.js'));
  assert(!JSON.stringify(report).includes('example_fake_secret_12345'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
