'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const github=require('./github');
const security=require('./security');
const civic=require('./civic');
const academy=require('./academy');
const cp=require('node:child_process');
const {randomUUID}=require('node:crypto');
const {createWorld,editWorld}=require('./world');
const ROOT=__dirname, PUBLIC=path.join(ROOT,'public'),DATA=path.join(ROOT,'data','world.json');
function loadDotEnv(){
  const f=path.join(ROOT,'.env');if(!fs.existsSync(f))return;
  for(const line of fs.readFileSync(f,'utf8').split(/\r?\n/)){
    const match=/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if(match&&!Object.hasOwn(process.env,match[1]))process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');
  }
}
loadDotEnv();
const PORT=Number(process.env.PORT)||4317;
let world;try{world=JSON.parse(fs.readFileSync(DATA,'utf8'));if(!Array.isArray(world.objects)||!Array.isArray(world.terrain))throw Error('invalid');}catch{world=createWorld();}
// Migração: nunca utilizar caminhos de projetos persistidos pela versão anterior.
if(world.version!==4 || world.w!==68 || world.h!==52){
  const previous=world;world=createWorld();
  for(const p of world.objects.filter(o=>o.kind==='office')){const old=previous.objects.find(o=>o.projectId===p.projectId);if(old?.github)p.github=old.github;}
  if(fs.existsSync(DATA)){fs.copyFileSync(DATA,DATA+'.v03-backup');}
}
for (const o of world.objects) { if(o.kind==='office'){delete o.dir; if(!o.github)o.github=null;} }
// Ampliação da universidade existente (preserva todos os vínculos e edifícios customizados).
const campus=world.objects.find(o=>o.kind==='service'&&o.service==='university');
if(campus&&campus.w===8&&campus.h===6){const future={...campus,w:10,h:8};if(!world.objects.some(o=>o.id!==campus.id&&o.x<future.x+future.w&&o.x+o.w>future.x&&o.y<future.y+future.h&&o.y+o.h>future.y)){campus.w=10;campus.h=8;world.revision++;persist();}}
function persist(){fs.mkdirSync(path.dirname(DATA),{recursive:true});const p=DATA+'.tmp';fs.writeFileSync(p,JSON.stringify(world,null,2));fs.renameSync(p,DATA);}
civic.ensureProjectTeams(world.objects.filter(o=>o.kind==='office'));
civic.ensureWorksSecretary();
const jobs=new Map();
const tasks={research:{busy:false,last:0,result:null},engineer:{busy:false,last:0,result:null},police:{busy:false,last:0,result:null}};
async function runDepartment(key,executor){
 const task=tasks[key];if(task.busy){const err=Error('O setor já está trabalhando');err.status=409;throw err;}
 if(Date.now()-task.last<60000){const err=Error('Aguarde 1 minuto para repetir esta operação');err.status=429;throw err;}
 task.busy=true;task.last=Date.now();try{const result=await executor();task.result={ok:true,at:Date.now(),result};return task.result;}
 catch(e){task.result={ok:false,at:Date.now(),error:String(e.message).slice(0,200)};throw e;}finally{task.busy=false;}
}
function projectList(){return world.objects.filter(o=>o.kind==='office');}
let lastResearchAuto=0,lastPoliceAuto=0;
function autoDepartments(){const settings=civic.getSettings(), now=Date.now();
 if(settings.researchEnabled&&now-lastResearchAuto>=30*60000){lastResearchAuto=now;void runDepartment('research',()=>academy.discover()).then(()=>runDepartment('engineer',()=>academy.engineer(projectList()))).catch(e=>console.warn('[Universidade]',e.message));}
 if(settings.policeEnabled&&now-lastPoliceAuto>=45*60000){lastPoliceAuto=now;void runDepartment('police',()=>academy.policePatrol(projectList())).catch(e=>console.warn('[Delegacia]',e.message));}
}

const PROVIDERS=['codex','claude','gemini','ollama','manus','demo'];
function publicJob(j){return {role:j.role||null,managerId:j.managerId||null,id:j.id,projectId:j.projectId,provider:j.provider,agentId:j.agentId||null,prompt:j.prompt,model:j.model,status:j.status,phase:j.phase,log:j.log.slice(-12000),created:j.created,updated:j.updated,remoteUrl:j.remoteUrl||null,connected:!!j.connected,changed:!!j.changed,changeSummary:j.changeSummary||'',prUrl:j.prUrl||null,commitUrl:j.commitUrl||null,publishDirect:!!j.publishDirect,publicationError:j.publicationError||null};}
function pushLog(j,text){j.log=(j.log+String(text)).slice(-18000);j.updated=Date.now();}
function state(){return {world,jobs:[...jobs.values()].reverse().slice(0,40).map(publicJob),providers:PROVIDERS,connections:{github:github.hasGithubAuth(),manus:!!process.env.MANUS_API_KEY,ollama:ollamaAvailable,localCli:detectedCli},online:'servidor local'};}
let ollamaAvailable=false;let detectedCli=[];
function checkLocalProviders(){detectedCli=['codex','claude','gemini'].filter(cmd=>{try{const r=cp.spawnSync(cmd,['--version'],{encoding:'utf8',timeout:2500,windowsHide:true,shell:process.platform==='win32'});return r.status===0;}catch{return false;}});}checkLocalProviders();
async function checkOllama(){try{const r=await fetch(new URL('/api/tags',process.env.OLLAMA_URL||'http://127.0.0.1:11434'),{signal:AbortSignal.timeout(2200)});ollamaAvailable=r.ok&&Array.isArray((await r.json()).models);}catch{ollamaAvailable=false;}}void checkOllama();const providersTimer=setInterval(()=>{checkLocalProviders();void checkOllama()},14000);providersTimer.unref?.();
function fail(status,msg){const e=Error(msg);e.status=status;throw e;}
function send(res,code,data){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function readJson(req){let text='';for await (const chunk of req){text+=chunk;if(text.length>64000)fail(413,'Payload muito grande');}try{return JSON.parse(text||'{}')}catch{fail(400,'JSON inválido')}}
function project(id){if(id==='city-works')return {projectId:'city-works',name:'Obras da SanTTos City',github:{name:'lunsanttos-arch/santtos-agent-city',branch:'main'}};const p=world.objects.find(o=>o.kind==='office'&&o.projectId===id);if(!p)fail(404,'Prédio/projeto não encontrado');return p;}
function job(id){const j=jobs.get(id);if(!j)fail(404,'Missão não encontrada');return j;}
function validateGithubProject(p){if(!p.github?.name)fail(422,'Conecte este prédio a um repositório do GitHub.');try{return github.lookupGithubRepo(p.github.name)}catch(e){fail(422,'GitHub: '+e.message)}}
function abortJob(j){j.cancelled=true;if(j.provider==='manus'&&j.remoteTaskId){void manusRequest('task.stop',{method:'POST',body:{task_id:j.remoteTaskId}}).catch(e=>pushLog(j,'Não foi possível parar a tarefa Manus remotamente: '+e.message+'\n'));}if(j.abortController)j.abortController.abort();if(j.child){try{if(process.platform==='win32'){cp.spawn('taskkill',['/PID',String(j.child.pid),'/T','/F'],{windowsHide:true});}else j.child.kill('SIGTERM');}catch{}}}
function commandFor(j){
  const agent=j.agentId?civic.getAgent(j.agentId):null;const lesson=civic.lessonContext(agent?.role||'desenvolvimento');
  const instruction='Função neste projeto: '+(agent?.officeFunction||'Código')+'. '+(agent?.managerId?'Subagente vinculado ao Gerente do projeto. ':'')+'Trabalhe somente na pasta deste projeto. Não execute deploy, push ou commit. Não manipule segredos. Faça uma mudança limitada. Ao terminar, entregue um relato em português simples entre SANTTOS_RELATORIO_INICIO e SANTTOS_RELATORIO_FIM, com os títulos: Resultado, O que mudou, Testes e Próximos passos. Explique o efeito para o usuário, evite jargão e liste testes executados e seus resultados reais; declare os não executados e limitações. Não afirme que publicou no GitHub. Contexto de habilidades: '+lesson+'\nTarefa: '+j.prompt;
  if(j.provider==='codex')return ['codex',['exec','--sandbox','workspace-write',instruction]];
  if(j.provider==='claude')return ['claude',['-p','--permission-mode','acceptEdits',instruction]];
  return ['gemini',['-p',instruction,'--approval-mode','auto_edit']];
}
async function runCLI(j,p){
  const repo=validateGithubProject(p);j.phase='baixando repositório do GitHub';pushLog(j,'Clonando '+repo.name+' em workspace temporário isolado.\n');const work=github.cloneForJob(repo,j.id);j.workDir=work.dir;j.workspace=work.workspace;j.publishRepo={...repo};j.baseCommit=github.invoke('git',['rev-parse','HEAD'],{cwd:work.dir});const dir=work.dir;const [cmd,args]=commandFor(j);j.phase='programando';
  await new Promise((resolve,reject)=>{
    let done=false;const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);j.child=null;error?reject(error):resolve();};
    try{
      const child=process.platform==='win32' ? cp.spawn('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from('$ErrorActionPreference="Stop"; $cmd=$env:SAC_CMD; $a=ConvertFrom-Json $env:SAC_ARGS; & $cmd @a; exit $LASTEXITCODE','utf16le').toString('base64')],{cwd:dir,env:{...process.env,SAC_CMD:cmd,SAC_ARGS:JSON.stringify(args)},windowsHide:true,stdio:['ignore','pipe','pipe']}) : cp.spawn(cmd,args,{cwd:dir,shell:false,stdio:['ignore','pipe','pipe']});
      j.child=child;
      child.stdout.on('data',d=>{const output=d.toString();if(output.trim()&&!/not authenticated|unauthorized|login required|authentication required|please login|not logged in/i.test(output)){j.connected=true;j.phase='programando no GitHub';}pushLog(j,output);});child.stderr.on('data',d=>pushLog(j,d.toString()));
      child.on('error',e=>finish(Error('CLI não encontrada ou falhou: '+e.message)));
      child.on('close',code=>finish(code===0||j.cancelled?null:Error('A CLI retornou código '+code)));
    }catch(e){finish(e);}
    var timer=setTimeout(()=>{abortJob(j);finish(Error('Tempo limite de 30 minutos'));},30*60*1000);
  });
  j.changed=github.hasChanges(dir);j.changeSummary=j.changed?github.diffSummary(dir):'';if(j.changed){pushLog(j,'\nAlterações detectadas no checkout temporário. Nenhum push foi feito.\n'+j.changeSummary+'\nUse PUBLICAR COMMIT para enviar diretamente ou PUBLICAR PR para revisão.\n');}else pushLog(j,'\nNenhuma alteração no repositório.\n');
}
async function runOllama(j){
  j.phase='pensando';const base=process.env.OLLAMA_URL||'http://127.0.0.1:11434';
  const parsed=new URL(base);if(!['127.0.0.1','localhost','::1'].includes(parsed.hostname))throw Error('OLLAMA_URL deve apontar para o Ollama local nesta versão');
  const controller=new AbortController();j.abortController=controller;
  const timer=setTimeout(()=>controller.abort(),8*60*1000);
  try{
    const projectGitHub=project(j.projectId).github;
    const context=`Repositório conectado: https://github.com/${projectGitHub.name}, branch ${projectGitHub.branch}. Você não leu os arquivos, a menos que sejam fornecidos expressamente. Não afirme que os modificou.`;
    const response=await fetch(new URL('/api/chat',base),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:j.model||process.env.OLLAMA_MODEL||'qwen3:8b',stream:false,messages:[{role:'system',content:'Você é um agente de planejamento e análise da SanTTos. Sua função é '+(j.role||'Código')+'. Responda em português. Você não tem acesso à pasta local nem permissão para afirmar que modificou arquivos. '+context},{role:'user',content:j.prompt}],options:{num_predict:1600}}),signal:controller.signal});
    if(!response.ok){const data=await response.json();throw Error(data.error||'Ollama respondeu '+response.status);}
    j.connected=true;const data=await response.json();pushLog(j,data.message?.content||'(sem resposta)');
  }finally{clearTimeout(timer);j.abortController=null;}
}
async function manusRequest(endpoint,{method='GET',body,search}={}){
  if(!process.env.MANUS_API_KEY)throw Error('Configure MANUS_API_KEY no arquivo .env');
  const url=new URL('https://api.manus.ai/v2/'+endpoint);
  for(const [k,v] of Object.entries(search||{}))url.searchParams.set(k,v);
  const r=await fetch(url,{method,headers:{'x-manus-api-key':process.env.MANUS_API_KEY,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  const result=await r.json();if(!r.ok||result.ok===false)throw Error(result.error?.message||'Manus API '+r.status);return result;
}
function extractStatus(messages){for(const m of messages){if(m.type==='status_update')return m.status_update?.agent_status;}return null;}
async function runManus(j){
  j.phase='criando tarefa';
  const projectGitHub=project(j.projectId).github;const message='Função no projeto: '+(j.role||'Código')+'. '+j.prompt+'\n\nProjeto: https://github.com/'+projectGitHub.name+' (branch '+projectGitHub.branch+'). Se o repositório for privado, somente acesse caso a integração GitHub da conta Manus tenha sido autorizada.';
  const created=await manusRequest('task.create',{method:'POST',body:{message:{content:message},locale:'pt-BR',interactive_mode:false}});
  if(!created.task_id)throw Error('API Manus não devolveu task_id');
  j.connected=true;j.remoteUrl=created.task_url||null;j.remoteTaskId=created.task_id;j.phase='trabalhando remotamente';pushLog(j,'Manus: tarefa '+created.task_id+' criada.\n');
  const seen=new Set();
  for(let attempt=0;attempt<180;attempt++){
    if(j.cancelled)return;
    await new Promise(r=>setTimeout(r,4000));if(j.cancelled)return;
    const events=await manusRequest('task.listMessages',{search:{task_id:created.task_id,order:'desc',limit:'25',verbose:'true'}});
    const messages=Array.isArray(events.messages)?events.messages:[];
    for(const m of [...messages].reverse()){
      if(seen.has(m.id))continue;seen.add(m.id);
      const t=m.assistant_message?.content||m.tool_used?.brief||m.status_update?.brief||m.error_message?.content;
      if(t)pushLog(j,'\n'+String(t).slice(0,1200)+'\n');
    }
    const status=extractStatus(messages);
    if(status==='waiting'){j.status='waiting';j.phase='precisa de confirmação no Manus';pushLog(j,'Abra o link da tarefa no Manus para responder ou aprovar.\n');return;}
    if(status==='error')throw Error('Manus indicou erro na tarefa');
    if(status==='stopped'){
      const detail=await manusRequest('task.detail',{search:{task_id:created.task_id}});
      if(detail.task?.has_running_background_jobs||detail.has_running_background_jobs)continue;
      return;
    }
  }
  throw Error('Tempo limite para acompanhamento do Manus. Abra a tarefa no Manus para conferir.');
}
async function runDemo(j){j.phase='simulação — sem IA';for(const event of ['Abrindo missão demonstrativa','Personagem chegando à mesa','Executando animação de trabalho','Missão demonstrativa concluída']){if(j.cancelled)return;pushLog(j,event+'\n');await new Promise(r=>setTimeout(r,1350));}}
function publishDirect(j){
  if(j.commitUrl||j.prUrl)fail(409,'Esta missão já foi publicada');
  if(j.publishing)fail(409,'Publicação em andamento');
  j.publishing=true;
  try{const result=github.publishCommit(j,j.publishRepo);j.commitUrl=result.url;j.publicationError=null;pushLog(j,'\nCommit publicado no GitHub: '+result.url+'\n');}
  finally{j.publishing=false;}
}
async function runJob(j){
  try{
    if(j.provider==='ollama')await runOllama(j);
    else if(j.provider==='manus')await runManus(j);
    else if(j.provider==='demo')await runDemo(j);
    else await runCLI(j,project(j.projectId));
    if(!j.cancelled && j.status!=='waiting'){j.status='completed';j.phase='concluído';if(j.publishDirect&&j.changed){try{publishDirect(j);}catch(e){j.publicationError=e.message;pushLog(j,'\nPublicação direta não concluída: '+e.message+'\n');}}}
  }catch(e){if(!j.cancelled){j.status='failed';j.phase='erro';pushLog(j,'\nERRO: '+e.message+'\n');}}
  finally{
    if(j.cancelled){j.status='cancelled';j.phase='cancelado';}
    if(j.workDir&&j.changed&&civic.getSettings().policeEnabled){
      try{const report=security.reviewWorkspace(j.workDir),p=project(j.projectId);
        civic.recordPoliceReport({projectId:j.projectId,repo:p.github.name,summary:'Missão '+j.id+': '+report.filesReviewed+' fontes e '+report.configFiles+' configurações locais revisadas. Cobertura parcial.',officers:[
          {name:'Policial de Código',task:'Inspeção automática do código da missão',findings:report.findings},
          {name:'Policial de Credenciais',task:'Configurações e possíveis segredos',findings:[...report.findings.filter(f=>f.id==='hardcoded-secret'),...report.configFindings]},
          {name:'Delegado',task:'Encaminhamento ao Gerente',findings:[...report.findings,...report.configFindings]}
        ]});pushLog(j,'\nDelegacia: inspeção automática local registrada para o Gerente.\n');
      }catch(e){pushLog(j,'\nDelegacia: inspeção local não concluída: '+e.message+'\n');}
    }
    j.updated=Date.now();
  }
}
const MIME={'.png':'image/png','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
function serveFile(url,res){
  const pathname=new URL(url,'http://localhost').pathname;
  const target=path.resolve(PUBLIC,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(PUBLIC+path.sep))return send(res,404,{error:'Não encontrado'});
  fs.readFile(target,(err,b)=>{if(err)return send(res,404,{error:'Arquivo não encontrado'});res.writeHead(200,{'Content-Type':MIME[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(b);});
}
function createApp(){return http.createServer(async(req,res)=>{
  try{
    const hostname=String(req.headers.host||'').split(':')[0].toLowerCase();
    if(!['127.0.0.1','localhost','[::1]'].includes(hostname))return send(res,403,{error:'Acesso permitido apenas em localhost'});
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET'&&url.pathname==='/api/state')return send(res,200,state());
    if(req.method==='GET'&&url.pathname==='/api/health')return send(res,200,{ok:true});
    if(req.method==='GET'&&url.pathname==='/api/civic')return send(res,200,civic.all());
    if(req.method==='GET'&&url.pathname==='/api/civic/departments')return send(res,200,{tasks});
    if(req.method==='GET'&&url.pathname==='/api/library/search'){
      const q=String(url.searchParams.get('q')||'').trim().slice(0,120);
      if(q.length<2)fail(400,'Pesquise pelo menos dois caracteres');
      try{
        const endpoint=new URL('https://api.github.com/search/repositories');endpoint.searchParams.set('q',q);endpoint.searchParams.set('per_page','12');
        const response=await fetch(endpoint,{headers:{'Accept':'application/vnd.github+json','User-Agent':'SanTTos-Agent-City'},signal:AbortSignal.timeout(7000)});
        if(!response.ok)fail(503,'GitHub indisponível ou limite da API atingido');
        const result=await response.json();return send(res,200,{repos:(result.items||[]).filter(x=>!x.private).slice(0,12).map(x=>({name:x.full_name,description:x.description,stars:x.stargazers_count,branch:x.default_branch,url:x.html_url}))});
      }catch(e){fail(503,'Busca GitHub indisponível: '+e.message)}
    }
    if(req.method==='GET'&&url.pathname==='/api/github/status')return send(res,200,github.githubStatus());
    if(req.method==='GET'&&url.pathname==='/api/github/repos'){try{return send(res,200,{repos:github.listGithubRepos()});}catch(e){return send(res,503,{error:'Conecte-se ao GitHub com gh auth login: '+e.message});}}
    if(req.method==='POST'&&url.pathname.startsWith('/api/')){
      if(req.headers['x-santtos-city']!=='1')fail(403,'Cabeçalho de segurança ausente');
      if(req.headers.origin && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.origin))fail(403,'Origem bloqueada');
      if(!(req.headers['content-type']||'').startsWith('application/json'))fail(415,'JSON obrigatório');
      const b=await readJson(req);
      if(url.pathname==='/api/github/connect'){try{return send(res,200,github.connectGithub());}catch(e){fail(503,e.message)}}
      if(url.pathname==='/api/civic/agent'){try{return send(res,201,{agent:civic.addAgent(b)});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/civic/project-agent'){if([...jobs.values()].some(j=>j.agentId===b.agentId&&['running','waiting','pending'].includes(j.status)))fail(409,'Conclua ou cancele a missão antes de trocar o provedor');try{return send(res,200,{agent:civic.configureProjectAgent(b,projectList().map(p=>p.projectId))});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/civic/agent/name'){try{return send(res,200,{agent:civic.renameAgent(b)});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/building/name'){const o=world.objects.find(o=>o.id===b.id&&['office','house','service'].includes(o.kind));if(!o)fail(404,'Edifício não encontrado');try{o.name=civic.checkedName(b.name);}catch(e){fail(400,e.message)}world.revision++;persist();return send(res,200,{world});}
      if(url.pathname==='/api/civic/agent/assign'){try{return send(res,200,{agent:civic.assignAgent(b,projectList().map(p=>p.projectId))});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/civic/automation'){try{return send(res,200,{settings:civic.setAutomation(b.name,b.enabled)});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/civic/library/review'){
        const repo=String(b.repo||'').trim(),db=civic.all();
        if(!db.collections.some(c=>c.repos.includes(repo))&&!db.discoveries.some(d=>d.repo===repo))fail(404,'Repositório não está na Biblioteca');
        return send(res,200,{review:await academy.reviewLibraryRepo(repo)});
      }
      if(url.pathname==='/api/civic/research/run')return send(res,200,await runDepartment('research',()=>academy.discover()));
      if(url.pathname==='/api/civic/engineer/run')return send(res,200,await runDepartment('engineer',()=>academy.engineer(projectList())));
      if(url.pathname==='/api/civic/police/run')return send(res,200,await runDepartment('police',()=>academy.policePatrol(projectList())));
      if(url.pathname==='/api/civic/discovery/curate'){try{return send(res,200,{discovery:await (async()=>{const d=civic.curateDiscovery(b.id,b.collectionId);await academy.reviewLibraryRepo(d.repo);return d;})()});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/civic/suggestion/status'){try{return send(res,200,{suggestion:civic.updateSuggestion(b.id,b.status)});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/civic/collection'){try{return send(res,201,{collection:civic.addCollection(b)});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/civic/profile'){try{return send(res,201,{profile:civic.addProfile(b)});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/civic/collection/repo'){try{return send(res,200,{collection:await (async()=>{const c=civic.addRepoToCollection(b);await academy.reviewLibraryRepo(String(b.repo).trim());return c;})()});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/civic/reminder'){try{return send(res,201,{reminder:civic.addReminder(b)});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/civic/reminder/done'){try{return send(res,200,{reminder:civic.finishReminder(b.id)});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/civic/lesson'){try{return send(res,201,{lesson:civic.addLesson(b)});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/civic/audit'){const j=job(b.id);return send(res,200,{audit:civic.auditJob(j)});}
      if(url.pathname==='/api/civic/repo-scan'){
        const p=project(b.projectId);if(!p.github?.name)fail(422,'Vincule um repositório no GitHub antes de fiscalizar');
        const report=await security.reviewPublicRepo(p.github.name);
        return send(res,200,{report});
      }
      if(url.pathname==='/api/map/edit'){try{editWorld(world,b)}catch(e){fail(409,e.message)}persist();civic.ensureProjectTeams(projectList());return send(res,200,{world});}
      if(url.pathname==='/api/project'){
        const p=project(b.id);
        const repo=github.lookupGithubRepo(b.github);
        if(typeof b.name==='string'&&b.name.trim())p.name=b.name.trim().slice(0,45);
        p.github=repo;world.revision++;persist();if(civic.getSettings().policeEnabled&&!tasks.police.busy){tasks.police.last=0;void runDepartment('police',()=>academy.policePatrol(projectList())).catch(e=>console.warn('[Delegacia]',e.message));}return send(res,200,{ok:true,project:p});
      }
      if(url.pathname==='/api/job/commit'){
        const j=job(b.id);
        if(!['codex','claude','gemini'].includes(j.provider)||j.status!=='completed'||!j.changed||!j.connected)fail(409,'Só uma missão concluída com alterações pode publicar commit');
        publishDirect(j);return send(res,200,{job:publicJob(j)});
      }
      if(url.pathname==='/api/job/publish'){
        const j=job(b.id);
        if(!['codex','claude','gemini'].includes(j.provider)||j.status!=='completed'||!j.changed||!j.connected)fail(409,'Só uma missão concluída com alterações pode publicar PR');
        if(j.prUrl||j.commitUrl)fail(409,'Missão já publicada');
        const p={github:j.publishRepo||project(j.projectId).github};if(!p.github?.name)fail(422,'Projeto GitHub não vinculado');
        if(j.publishing)fail(409,'Publicação em andamento');j.publishing=true;
        try{j.prUrl=github.publishPR(j,p.github);pushLog(j,'\nPR em rascunho criado: '+j.prUrl+'\n');if(j.workspace){try{fs.rmSync(j.workspace,{recursive:true,force:true})}catch{}}j.workDir=null;return send(res,200,{job:publicJob(j)});}finally{j.publishing=false;}
      }
      if(url.pathname==='/api/job'){
        const p=project(b.projectId), provider=String(b.provider||''),prompt=String(b.prompt||'').trim();
        const agent=b.agentId?civic.getAgent(b.agentId):null;
        if(p.projectId==='city-works'&&agent?.id!=='works-secretary')fail(422,'As obras da cidade são responsabilidade do Secretário de Obras');
        if(b.agentId&&(!agent||agent.provider!==provider))fail(422,'Agente não encontrado ou pertence a outro provedor');
        if(agent&&[...jobs.values()].some(j=>j.agentId===agent.id&&['running','waiting','pending'].includes(j.status)))fail(409,'Este agente já tem uma missão em andamento ou aguardando aprovação');
        if(agent?.projectId&&agent.projectId!==p.projectId)fail(422,'Este agente está designado para outro escritório');
        if(!PROVIDERS.includes(provider)||provider==='demo')fail(400,'Selecione um agente de IA real (modo demonstração desativado)');
        if(!p.github?.name)fail(422,'Vincule primeiro um repositório do GitHub a este projeto.');
        if(p.projectId!=='city-works'&&(!agent||agent.projectId!==p.projectId||!['code','tester'].includes(agent.projectRole)))fail(422,'Escolha o Coder ou Tester deste projeto');
        if(b.publishDirect===true&&!['codex','claude','gemini'].includes(provider))fail(422,'Publicação direta exige Codex, Claude ou Gemini CLI; Ollama e Manus não alteram este checkout local.');
        if(prompt.length<4||prompt.length>5500)fail(400,'Missão deve ter entre 4 e 5500 caracteres');
        const j={role:agent?.projectRole||agent?.role||null,managerId:agent?.managerId||null,id:randomUUID(),projectId:p.projectId,provider,agentId:agent?.id||null,model:String(b.model||'').slice(0,80),prompt,publishDirect:b.publishDirect===true,status:'pending',phase:'aguardando aprovação',log:'',created:Date.now(),updated:Date.now(),cancelled:false};
        jobs.set(j.id,j);if(jobs.size>100){const old=[...jobs.values()].find(x=>!['running','pending'].includes(x.status));if(old)jobs.delete(old.id);}
        return send(res,201,{job:publicJob(j)});
      }
      if(url.pathname==='/api/job/approve'){
        const j=job(b.id);if(j.status!=='pending')fail(409,'Missão já iniciada');
        if([...jobs.values()].filter(x=>x.status==='running').length>=3)fail(429,'Limite de três agentes simultâneos');
        if(['codex','claude','gemini'].includes(j.provider)){if(!detectedCli.includes(j.provider))fail(422,'CLI não instalada: '+j.provider);validateGithubProject(project(j.projectId));}
        if(j.provider==='ollama'&&!ollamaAvailable)fail(422,'Ollama não está conectado; inicie o servidor local');
        if(j.provider==='manus'&&!process.env.MANUS_API_KEY)fail(422,'Configure a chave da API Manus no arquivo .env');
        j.status='running';j.phase='iniciando';j.updated=Date.now();pushLog(j,'Missão aprovada para '+j.provider+'.\n');
        void runJob(j);return send(res,200,{job:publicJob(j)});
      }
      if(url.pathname==='/api/job/cancel'){
        const j=job(b.id);if(!['pending','running','waiting'].includes(j.status))fail(409,'Missão já finalizada');
        abortJob(j);j.status='cancelled';j.phase='cancelado';j.updated=Date.now();return send(res,200,{job:publicJob(j)});
      }
      fail(404,'Rota não encontrada');
    }
    if(req.method==='GET')return serveFile(req.url,res);
    send(res,405,{error:'Método não permitido'});
  }catch(e){send(res,e.status||500,{error:e.status?e.message:'Erro interno: '+e.message});}
});}
if(require.main===module){const app=createApp();app.listen(PORT,'127.0.0.1',()=>{console.log('SanTTos Agent City: http://127.0.0.1:'+PORT);autoDepartments();});const autoTimer=setInterval(autoDepartments,120000);autoTimer.unref?.();}
module.exports={createApp,publicJob,extractStatus};
