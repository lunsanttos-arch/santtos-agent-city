'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const github=require('./github');
const civic=require('./civic');
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
function persist(){fs.mkdirSync(path.dirname(DATA),{recursive:true});const p=DATA+'.tmp';fs.writeFileSync(p,JSON.stringify(world,null,2));fs.renameSync(p,DATA);}
const jobs=new Map();
const PROVIDERS=['codex','claude','gemini','ollama','manus','demo'];
function publicJob(j){return {id:j.id,projectId:j.projectId,provider:j.provider,prompt:j.prompt,model:j.model,status:j.status,phase:j.phase,log:j.log.slice(-12000),created:j.created,updated:j.updated,remoteUrl:j.remoteUrl||null,connected:!!j.connected,changed:!!j.changed,prUrl:j.prUrl||null};}
function pushLog(j,text){j.log=(j.log+String(text)).slice(-18000);j.updated=Date.now();}
function state(){return {world,jobs:[...jobs.values()].reverse().slice(0,40).map(publicJob),providers:PROVIDERS,connections:{github:github.hasGithubAuth(),manus:!!process.env.MANUS_API_KEY,ollama:ollamaAvailable,localCli:detectedCli},online:'servidor local'};}
let ollamaAvailable=false;let detectedCli=[];
function checkLocalProviders(){detectedCli=['codex','claude','gemini'].filter(cmd=>{try{const r=cp.spawnSync(cmd,['--version'],{encoding:'utf8',timeout:2500,windowsHide:true,shell:process.platform==='win32'});return r.status===0;}catch{return false;}});}checkLocalProviders();
async function checkOllama(){try{const r=await fetch(new URL('/api/tags',process.env.OLLAMA_URL||'http://127.0.0.1:11434'),{signal:AbortSignal.timeout(2200)});ollamaAvailable=r.ok&&Array.isArray((await r.json()).models);}catch{ollamaAvailable=false;}}void checkOllama();const providersTimer=setInterval(()=>{checkLocalProviders();void checkOllama()},14000);providersTimer.unref?.();
function fail(status,msg){const e=Error(msg);e.status=status;throw e;}
function send(res,code,data){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function readJson(req){let text='';for await (const chunk of req){text+=chunk;if(text.length>64000)fail(413,'Payload muito grande');}try{return JSON.parse(text||'{}')}catch{fail(400,'JSON inválido')}}
function project(id){const p=world.objects.find(o=>o.kind==='office'&&o.projectId===id);if(!p)fail(404,'Prédio/projeto não encontrado');return p;}
function job(id){const j=jobs.get(id);if(!j)fail(404,'Missão não encontrada');return j;}
function validateGithubProject(p){if(!p.github?.name)fail(422,'Conecte este prédio a um repositório do GitHub.');try{return github.lookupGithubRepo(p.github.name)}catch(e){fail(422,'GitHub: '+e.message)}}
function abortJob(j){j.cancelled=true;if(j.provider==='manus'&&j.remoteTaskId){void manusRequest('task.stop',{method:'POST',body:{task_id:j.remoteTaskId}}).catch(e=>pushLog(j,'Não foi possível parar a tarefa Manus remotamente: '+e.message+'\n'));}if(j.abortController)j.abortController.abort();if(j.child){try{if(process.platform==='win32'){cp.spawn('taskkill',['/PID',String(j.child.pid),'/T','/F'],{windowsHide:true});}else j.child.kill('SIGTERM');}catch{}}}
function commandFor(j){
  const lesson=civic.lessonContext('desenvolvimento');
  const instruction='Trabalhe somente na pasta deste projeto. Não execute deploy, push ou commit. Não manipule segredos. Faça uma mudança limitada e relatório de testes. Contexto de habilidades: '+lesson+'\nTarefa: '+j.prompt;
  if(j.provider==='codex')return ['codex',['exec','--sandbox','workspace-write',instruction]];
  if(j.provider==='claude')return ['claude',['-p','--permission-mode','acceptEdits',instruction]];
  return ['gemini',['-p',instruction,'--approval-mode','auto_edit']];
}
async function runCLI(j,p){
  const repo=validateGithubProject(p);j.phase='baixando repositório do GitHub';pushLog(j,'Clonando '+repo.name+' em workspace temporário isolado.\n');const work=github.cloneForJob(repo,j.id);j.workDir=work.dir;j.workspace=work.workspace;const dir=work.dir;const [cmd,args]=commandFor(j);j.phase='programando';
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
  j.changed=github.hasChanges(dir);if(j.changed){pushLog(j,'\nAlterações detectadas no checkout temporário. Nenhum push foi feito.\n'+github.diffSummary(dir)+'\nUse PUBLICAR PR para criar um Pull Request de revisão.\n');}else pushLog(j,'\nNenhuma alteração no repositório.\n');
}
async function runOllama(j){
  j.phase='pensando';const base=process.env.OLLAMA_URL||'http://127.0.0.1:11434';
  const parsed=new URL(base);if(!['127.0.0.1','localhost','::1'].includes(parsed.hostname))throw Error('OLLAMA_URL deve apontar para o Ollama local nesta versão');
  const controller=new AbortController();j.abortController=controller;
  const timer=setTimeout(()=>controller.abort(),8*60*1000);
  try{
    const projectGitHub=project(j.projectId).github;
    const context=`Repositório conectado: https://github.com/${projectGitHub.name}, branch ${projectGitHub.branch}. Você não leu os arquivos, a menos que sejam fornecidos expressamente. Não afirme que os modificou.`;
    const response=await fetch(new URL('/api/chat',base),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:j.model||process.env.OLLAMA_MODEL||'qwen3:8b',stream:false,messages:[{role:'system',content:'Você é um agente de planejamento e análise da SanTTos. Responda em português. Você não tem acesso à pasta local nem permissão para afirmar que modificou arquivos. '+context},{role:'user',content:j.prompt}],options:{num_predict:1600}}),signal:controller.signal});
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
  const projectGitHub=project(j.projectId).github;const message=j.prompt+'\n\nProjeto: https://github.com/'+projectGitHub.name+' (branch '+projectGitHub.branch+'). Se o repositório for privado, somente acesse caso a integração GitHub da conta Manus tenha sido autorizada.';
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
async function runJob(j){
  try{
    if(j.provider==='ollama')await runOllama(j);
    else if(j.provider==='manus')await runManus(j);
    else if(j.provider==='demo')await runDemo(j);
    else await runCLI(j,project(j.projectId));
    if(!j.cancelled && j.status!=='waiting'){j.status='completed';j.phase='concluído';}
  }catch(e){if(!j.cancelled){j.status='failed';j.phase='erro';pushLog(j,'\nERRO: '+e.message+'\n');}}
  finally{if(j.cancelled){j.status='cancelled';j.phase='cancelado';}j.updated=Date.now();}
}
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
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
    if(req.method==='GET'&&url.pathname==='/api/github/repos'){try{return send(res,200,{repos:github.listGithubRepos()});}catch(e){return send(res,503,{error:'Conecte-se ao GitHub com gh auth login: '+e.message});}}
    if(req.method==='POST'&&url.pathname.startsWith('/api/')){
      if(req.headers['x-santtos-city']!=='1')fail(403,'Cabeçalho de segurança ausente');
      if(req.headers.origin && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.origin))fail(403,'Origem bloqueada');
      if(!(req.headers['content-type']||'').startsWith('application/json'))fail(415,'JSON obrigatório');
      const b=await readJson(req);
      if(url.pathname==='/api/civic/agent'){try{return send(res,201,{agent:civic.addAgent(b)});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/civic/lesson'){try{return send(res,201,{lesson:civic.addLesson(b)});}catch(e){fail(400,e.message)}}
      if(url.pathname==='/api/civic/audit'){const j=job(b.id);return send(res,200,{audit:civic.auditJob(j)});}
      if(url.pathname==='/api/map/edit'){try{editWorld(world,b)}catch(e){fail(409,e.message)}persist();return send(res,200,{world});}
      if(url.pathname==='/api/project'){
        const p=project(b.id);
        const repo=github.lookupGithubRepo(b.github);
        if(typeof b.name==='string'&&b.name.trim())p.name=b.name.trim().slice(0,45);
        p.github=repo;world.revision++;persist();return send(res,200,{ok:true,project:p});
      }
      if(url.pathname==='/api/job/publish'){
        const j=job(b.id);
        if(!['codex','claude','gemini'].includes(j.provider)||j.status!=='completed'||!j.changed||!j.connected)fail(409,'Só uma missão concluída com alterações pode publicar PR');
        if(j.prUrl)fail(409,'PR já criado');
        const p=project(j.projectId);if(!p.github?.name)fail(422,'Projeto GitHub não vinculado');
        if(j.publishing)fail(409,'Publicação em andamento');j.publishing=true;
        try{j.prUrl=github.publishPR(j,p.github);pushLog(j,'\nPR em rascunho criado: '+j.prUrl+'\n');if(j.workspace){try{fs.rmSync(j.workspace,{recursive:true,force:true})}catch{}}j.workDir=null;return send(res,200,{job:publicJob(j)});}finally{j.publishing=false;}
      }
      if(url.pathname==='/api/job'){
        const p=project(b.projectId), provider=String(b.provider||''),prompt=String(b.prompt||'').trim();
        if(!PROVIDERS.includes(provider)||provider==='demo')fail(400,'Selecione um agente de IA real (modo demonstração desativado)');
        if(!p.github?.name)fail(422,'Vincule primeiro um repositório do GitHub a este projeto.');
        if(prompt.length<4||prompt.length>5500)fail(400,'Missão deve ter entre 4 e 5500 caracteres');
        const j={id:randomUUID(),projectId:p.projectId,provider,model:String(b.model||'').slice(0,80),prompt,status:'pending',phase:'aguardando aprovação',log:'',created:Date.now(),updated:Date.now(),cancelled:false};
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
if(require.main===module){const app=createApp();app.listen(PORT,'127.0.0.1',()=>console.log('SanTTos Agent City: http://127.0.0.1:'+PORT));}
module.exports={createApp,publicJob,extractStatus};
