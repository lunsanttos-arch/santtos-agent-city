'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID,randomInt}=require('node:crypto');
const FILE=path.join(__dirname,'data','civic.json');
const PROVIDERS=new Set(['codex','claude','gemini','ollama','manus']);
const ROLES=new Set(['desenvolvimento','arquitetura','pesquisa','engenharia','qa','seguranca','redacao','gestao','secretaria','bibliotecaria','tester','ux','auxiliar','recepcionista','obras']);
const SERVICES=new Set(['cityhall','library','university','police','talents','office']);
const FIRST=['Aurora','Bento','Lia','Milo','Nina','Íris','Caio','Gael','Flora','Davi','Zara','Teo','Luna','Eva','Otto','Yara','Sol','Ravi','Tainá','Ayla'];
const LAST=['Pixel','Silva','Norte','Prisma','Luz','Vega','Cobre','Nuvem','Delta','Vale','Code','Azul'];
const COLORS=['#cd506b','#418da5','#9669b2','#65a47a','#e8a456','#5d69b5','#d57f8a'];
let db={agents:[],lessons:[],audits:[],collections:[],profiles:[],reminders:[],discoveries:[],suggestions:[],policeReports:[],settings:['research','police'],fileIndex:[],staffNames:[]};
try {const raw=JSON.parse(fs.readFileSync(FILE,'utf8'));for(const key of Object.keys(db))if(Array.isArray(raw[key]))db[key]=raw[key];}catch{}
function save(){fs.mkdirSync(path.dirname(FILE),{recursive:true});const tmp=FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,FILE);}
function all(){return {staffNames:db.staffNames,agents:db.agents.filter(a=>!a.archived).map(({id,name,role,provider,service,skin,created,projectId,officeFunction,projectRole,agentType,managerId,fixedStaff})=>({id,name,role,provider,service,skin:{...skin,spriteIndex:skin?.spriteIndex??({secretaria:1,bibliotecaria:2,pesquisa:3,engenharia:4,recepcionista:5,seguranca:7})[role]??(9+(skin?.hair||0)%7)},created,projectId:projectId||null,officeFunction:officeFunction||null,projectRole:projectRole||null,agentType:agentType||'agent',managerId:managerId||null,fixedStaff:!!fixedStaff})),lessons:db.lessons.map(({id,title,role,created})=>({id,title,role,created})),audits:db.audits.slice(-20),collections:db.collections.slice(-100),profiles:db.profiles.slice(-100),reminders:db.reminders.slice(-30),discoveries:db.discoveries.slice(-70),suggestions:db.suggestions.slice(-100),policeReports:db.policeReports.slice(-35),fileIndex:db.fileIndex.slice(-60),settings:getSettings()};}
function generateIdentity(){const name=FIRST[randomInt(FIRST.length)]+' '+LAST[randomInt(LAST.length)];const skin={spriteIndex:9+randomInt(7),hair:randomInt(5),outfit:COLORS[randomInt(COLORS.length)],skinTone:randomInt(4),hat:randomInt(4),eyes:randomInt(3)};return {name,skin};}
function serviceFor(role){return ({secretaria:'cityhall',bibliotecaria:'library',seguranca:'police',pesquisa:'university',engenharia:'university',gestao:'office',recepcionista:'talents'})[role]||'office';}
function addAgent(b){
 const provider=String(b.provider||''),role=String(b.role||''),service=String(b.service||serviceFor(role));
 if(!PROVIDERS.has(provider)||!ROLES.has(role)||!SERVICES.has(service))throw Error('Selecione provedor, função e local válidos');
 const {name,skin}=generateIdentity();const staffSkin={secretaria:1,bibliotecaria:2,pesquisa:3,engenharia:4,recepcionista:5,seguranca:7};if(staffSkin[role])skin.spriteIndex=staffSkin[role];if(b.spriteIndex!==undefined){if(!Number.isInteger(b.spriteIndex)||b.spriteIndex<1||b.spriteIndex>15)throw Error('A skin do jogador é exclusiva; escolha uma skin de agente válida');skin.spriteIndex=b.spriteIndex;}const a={id:randomUUID(),name,skin,provider,role,service,projectId:null,officeFunction:null,created:Date.now()};db.agents.push(a);save();return a;
}
function getAgent(id){return db.agents.find(a=>a.id===id&&!a.archived)||null;}
function assignAgent({agentId,projectId,officeFunction,projectRole},validProjects){
  const agent=getAgent(String(agentId||''));if(!agent)throw Error('Agente não encontrado');
  if(projectId!==null && (typeof projectId!=='string'||!validProjects.includes(projectId)))throw Error('Selecione um escritório válido');
  const name=String(officeFunction||agent.role).trim().slice(0,70);if(name.length<2)throw Error('Informe a função neste escritório');
  const slot=PROJECT_ROLES.find(r=>r.key===projectRole||r.label.toLowerCase()===name.toLowerCase());
  if(projectId&&!slot)throw Error('Escolha Coder ou Tester');
  if(projectRole&&!slot)throw Error('Função de projeto inválida');
  if(projectId&&slot&&db.agents.some(a=>a.id!==agent.id&&a.projectId===projectId&&a.projectRole===slot.key))throw Error('Esta função já tem um agente. Libere a função antes de substituir.');
  const previousProject=agent.projectId;agent.projectId=projectId;agent.officeFunction=slot?.label||name;agent.projectRole=projectId?slot?.key||null:null;
  agent.agentType='agent';agent.managerId=null;
  if(slot)agent.skin={...agent.skin,spriteIndex:slot.sprite};
  if(previousProject)linkManagers(previousProject);if(projectId)linkManagers(projectId);save();return agent;
}
const PROJECT_ROLES=[
 {key:'code',label:'Coder',role:'desenvolvimento',sprite:10},
 {key:'tester',label:'Tester',role:'tester',sprite:12}
];
function linkManagers(projectId){
 for(const a of db.agents.filter(a=>a.projectId===projectId&&!a.archived)){a.agentType='agent';a.managerId=null;}
}
function ensureProjectTeams(projects){
 let changed=false;
 for(const p of projects){
  const selected=new Set();
  for(const slot of PROJECT_ROLES){
   let a=db.agents.find(a=>!a.archived&&a.projectId===p.projectId&&a.projectRole===slot.key);
   if(!a){a=db.agents.find(a=>!a.archived&&a.projectId===p.projectId&&!a.projectRole&&a.role===slot.role);}
   if(!a){a={...generateIdentity(),id:randomUUID(),role:slot.role,provider:'codex',service:'office',projectId:p.projectId,created:Date.now()};db.agents.push(a);changed=true;}
   selected.add(a.id);
   if(a.officeFunction!==slot.label||a.projectRole!==slot.key||a.agentType!=='agent'||a.managerId){changed=true;}
   a.projectRole=slot.key;a.officeFunction=slot.label;a.agentType='agent';a.managerId=null;a.skin={...a.skin,spriteIndex:slot.sprite};
  }
  for(const a of db.agents.filter(a=>a.projectId===p.projectId&&!a.archived&&!selected.has(a.id))){a.archived=true;a.archiveReason='Equipe reduzida a Coder e Tester';changed=true;}
 }
 if(changed)save();return all().agents;
}
function ensureWorksSecretary(){
 if(getAgent('works-secretary'))return;
 db.agents.push({id:'works-secretary',name:'Secretário de Obras',role:'obras',provider:'codex',service:'cityhall',skin:{spriteIndex:9},fixedStaff:true,projectId:null,agentType:'agent',created:Date.now()});save();
}
const STAFF_IDS=new Set(['secretary','works-secretary','librarian','researcher','engineer','receptionist','chief','code-officer','credentials-officer']);
function checkedName(value){if(typeof value!=='string')throw Error('Informe um nome');const name=value.trim();if(name.length<2||name.length>40||/[\x00-\x1f\x7f]/.test(name))throw Error('Nome deve ter entre 2 e 40 caracteres, sem quebras de linha');return name;}
function renameAgent({agentId,name}){
 name=checkedName(name);const a=getAgent(agentId);
 if(a){a.name=name;save();return a;}
 if(!STAFF_IDS.has(agentId))throw Error('Agente não encontrado');
 db.staffNames=db.staffNames.filter(s=>s.id!==agentId);db.staffNames.push({id:agentId,name});save();return {id:agentId,name};
}
function configureProjectAgent({agentId,provider},validProjects){
 const a=getAgent(agentId);if(!a||(!a.fixedStaff&&(!a.projectRole||!validProjects.includes(a.projectId))))throw Error('Agente do projeto não encontrado');
 if(!PROVIDERS.has(provider))throw Error('Provedor inválido');a.provider=provider;save();return a;
}
function getSettings(){return {researchEnabled:db.settings.includes('research'),policeEnabled:db.settings.includes('police')};}
function setAutomation(name,enabled){if(!['research','police'].includes(name)||typeof enabled!=='boolean')throw Error('Configuração inválida');db.settings=db.settings.filter(x=>x!==name);if(enabled)db.settings.push(name);save();return getSettings();}
function recordDiscovery(data){
  const repo=String(data.repo||'');if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw Error('Repositório inválido');
  let d=db.discoveries.find(x=>x.repo.toLowerCase()===repo.toLowerCase());if(d)return d;
  d={id:randomUUID(),repo,name:String(data.name||repo).slice(0,100),description:String(data.description||'').slice(0,400),language:String(data.language||'').slice(0,50),stars:Math.max(0,Number(data.stars)||0),topic:String(data.topic||'geral').slice(0,60),created:Date.now(),curated:false};
  db.discoveries.push(d);db.discoveries=db.discoveries.slice(-200);save();return d;
}
function curateDiscovery(id,collectionId){const d=db.discoveries.find(x=>x.id===id);if(!d)throw Error('Descoberta não encontrada');
  const c=db.collections.find(x=>x.id===collectionId);if(!c)throw Error('Coleção não encontrada');
  if(!c.repos.includes(d.repo))c.repos.push(d.repo);d.curated=true;d.collectionId=c.id;save();return d;
}
function ensureResearchCollection(){let c=db.collections.find(x=>x.name==='Achados da Universidade');if(!c)c=addCollection({name:'Achados da Universidade',description:'Repositórios descobertos pelo Pesquisador; revisão humana recomendada'});return c;}
function archiveReadme(repo,content){
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw Error('Repositório inválido');
 if(!String(content).trim())return null;
 const entry={repo,path:'README',excerpt:String(content).replace(/[#*`<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,350),indexedAt:Date.now()};
 db.fileIndex=db.fileIndex.filter(x=>x.repo!==repo);db.fileIndex.push(entry);db.fileIndex=db.fileIndex.slice(-120);
 db.fileIndex.sort((a,b)=>a.repo.localeCompare(b.repo));save();return entry;
}
function recordSuggestion(data){
  const projectId=String(data.projectId||''),repo=String(data.repo||'');
  if(db.suggestions.some(x=>x.projectId===projectId&&x.repo===repo))return null;
  const s={id:randomUUID(),projectId,repo,reason:String(data.reason||'').slice(0,600),evidence:String(data.evidence||'').slice(0,550),status:'nova',source:'análise heurística de metadados públicos',created:Date.now()};
  db.suggestions.push(s);db.suggestions=db.suggestions.slice(-200);save();return s;
}
function updateSuggestion(id,status){const s=db.suggestions.find(x=>x.id===id);if(!s)throw Error('Sugestão não encontrada');if(!['lida','descartada','nova'].includes(status))throw Error('Status inválido');s.status=status;save();return s;}
function recordPoliceReport(data){const r={id:randomUUID(),repo:String(data.repo||''),projectId:String(data.projectId||''),officers:data.officers,summary:String(data.summary||'').slice(0,500),created:Date.now(),status:'enviado ao gerente'};db.policeReports.push(r);db.policeReports=db.policeReports.slice(-70);save();return r;}

function addLesson(b){const title=String(b.title||'').trim().slice(0,90),text=String(b.text||'').trim().slice(0,5000),role=String(b.role||'');if(title.length<3||text.length<10||!ROLES.has(role))throw Error('Lição inválida. Inclua título, área e instruções');const item={id:randomUUID(),title,text,role,created:Date.now()};db.lessons.push(item);save();return {id:item.id,title:item.title,role:item.role};}
function lessonContext(role){return db.lessons.filter(x=>x.role===role).slice(-4).map(x=>x.title+': '+x.text).join('\n').slice(0,7000);}
function addCollection(b){const name=String(b.name||'').trim().slice(0,80),description=String(b.description||'').trim().slice(0,300);if(name.length<2)throw Error('Informe o nome da coleção');if(db.collections.some(c=>c.name.toLowerCase()===name.toLowerCase()))throw Error('Coleção já cadastrada');const c={id:randomUUID(),name,description,repos:[],created:Date.now()};db.collections.push(c);save();return c;}
function addProfile(b){const username=String(b.username||'').trim();if(!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username))throw Error('Perfil GitHub inválido');if(db.profiles.some(p=>p.username.toLowerCase()===username.toLowerCase()))return db.profiles.find(p=>p.username.toLowerCase()===username.toLowerCase());const p={id:randomUUID(),username,created:Date.now()};db.profiles.push(p);save();return p;}
function addRepoToCollection(b){const c=db.collections.find(c=>c.id===String(b.collectionId||''));if(!c)throw Error('Coleção não encontrada');const repo=String(b.repo||'').trim();if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw Error('Formato do repositório inválido');if(!c.repos.includes(repo))c.repos.push(repo);save();return c;}
function addReminder(b){const message=String(b.message||'').trim().slice(0,200);if(message.length<3)throw Error('Lembrete inválido');const r={id:randomUUID(),message,created:Date.now(),done:false};db.reminders.push(r);db.reminders=db.reminders.slice(-100);save();return r;}
function finishReminder(id){const r=db.reminders.find(r=>r.id===id);if(!r)throw Error('Lembrete não encontrado');r.done=true;save();return r;}
function scan(text){const rules=[[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,'Possível chave privada'],[/gh[pousr]_[a-z0-9]{20,}/i,'Possível token GitHub'],[/\b(?:rm\s+-rf\s+\/|del\s+\/s\s+\/q|format\s+[a-z]:)/i,'Comando de remoção potencialmente perigoso'],[/\beval\s*\(/i,'Uso de eval'],[/\bexec\s*\(/i,'Execução dinâmica deve ser revisada']];return rules.filter(([re])=>re.test(text)).map(([,msg])=>msg);}
function auditJob(j){const flags=scan((j.log||'').slice(-16000));const result={id:randomUUID(),jobId:j.id,created:Date.now(),flags,status:flags.length?'revisao':'sem alertas nas regras básicas',note:'Triagem por padrões no log. Não substitui auditoria de código nem teste de segurança.'};db.audits.push(result);db.audits=db.audits.slice(-50);save();return result;}
module.exports={checkedName,renameAgent,ensureWorksSecretary,PROJECT_ROLES,ensureProjectTeams,configureProjectAgent,all,addAgent,getAgent,assignAgent,getSettings,setAutomation,recordDiscovery,curateDiscovery,ensureResearchCollection,archiveReadme,recordSuggestion,updateSuggestion,recordPoliceReport,generateIdentity,addLesson,lessonContext,scan,auditJob,addCollection,addProfile,addRepoToCollection,addReminder,finishReminder};
