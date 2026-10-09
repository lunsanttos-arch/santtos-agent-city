'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID,randomInt}=require('node:crypto');
const FILE=path.join(__dirname,'data','civic.json');
const PROVIDERS=new Set(['codex','claude','gemini','ollama','manus']);
const ROLES=new Set(['desenvolvimento','arquitetura','pesquisa','qa','seguranca','redacao','gestao','secretaria','bibliotecaria']);
const SERVICES=new Set(['cityhall','library','university','police','talents','office']);
const FIRST=['Aurora','Bento','Lia','Milo','Nina','Íris','Caio','Gael','Flora','Davi','Zara','Teo','Luna','Eva','Otto','Yara','Sol','Ravi','Tainá','Ayla'];
const LAST=['Pixel','Silva','Norte','Prisma','Luz','Vega','Cobre','Nuvem','Delta','Vale','Code','Azul'];
const COLORS=['#cd506b','#418da5','#9669b2','#65a47a','#e8a456','#5d69b5','#d57f8a'];
let db={agents:[],lessons:[],audits:[],collections:[],profiles:[],reminders:[]};
try {const raw=JSON.parse(fs.readFileSync(FILE,'utf8'));for(const key of Object.keys(db))if(Array.isArray(raw[key]))db[key]=raw[key];}catch{}
function save(){fs.mkdirSync(path.dirname(FILE),{recursive:true});const tmp=FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,FILE);}
function all(){return {agents:db.agents.map(({id,name,role,provider,service,skin,created})=>({id,name,role,provider,service,skin,created})),lessons:db.lessons.map(({id,title,role,created})=>({id,title,role,created})),audits:db.audits.slice(-20),collections:db.collections.slice(-100),profiles:db.profiles.slice(-100),reminders:db.reminders.slice(-30)};}
function generateIdentity(){const name=FIRST[randomInt(FIRST.length)]+' '+LAST[randomInt(LAST.length)];const skin={hair:randomInt(5),outfit:COLORS[randomInt(COLORS.length)],skinTone:randomInt(4),hat:randomInt(4),eyes:randomInt(3)};return {name,skin};}
function serviceFor(role){return ({secretaria:'cityhall',bibliotecaria:'library',seguranca:'police',pesquisa:'university',gestao:'cityhall'})[role]||'office';}
function addAgent(b){
 const provider=String(b.provider||''),role=String(b.role||''),service=String(b.service||serviceFor(role));
 if(!PROVIDERS.has(provider)||!ROLES.has(role)||!SERVICES.has(service))throw Error('Selecione provedor, função e local válidos');
 const {name,skin}=generateIdentity();const a={id:randomUUID(),name,skin,provider,role,service,created:Date.now()};db.agents.push(a);save();return a;
}
function getAgent(id){return db.agents.find(a=>a.id===id)||null;}
function addLesson(b){const title=String(b.title||'').trim().slice(0,90),text=String(b.text||'').trim().slice(0,5000),role=String(b.role||'');if(title.length<3||text.length<10||!ROLES.has(role))throw Error('Lição inválida. Inclua título, área e instruções');const item={id:randomUUID(),title,text,role,created:Date.now()};db.lessons.push(item);save();return {id:item.id,title:item.title,role:item.role};}
function lessonContext(role){return db.lessons.filter(x=>x.role===role).slice(-4).map(x=>x.title+': '+x.text).join('\n').slice(0,7000);}
function addCollection(b){const name=String(b.name||'').trim().slice(0,80),description=String(b.description||'').trim().slice(0,300);if(name.length<2)throw Error('Informe o nome da coleção');if(db.collections.some(c=>c.name.toLowerCase()===name.toLowerCase()))throw Error('Coleção já cadastrada');const c={id:randomUUID(),name,description,repos:[],created:Date.now()};db.collections.push(c);save();return c;}
function addProfile(b){const username=String(b.username||'').trim();if(!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username))throw Error('Perfil GitHub inválido');if(db.profiles.some(p=>p.username.toLowerCase()===username.toLowerCase()))return db.profiles.find(p=>p.username.toLowerCase()===username.toLowerCase());const p={id:randomUUID(),username,created:Date.now()};db.profiles.push(p);save();return p;}
function addRepoToCollection(b){const c=db.collections.find(c=>c.id===String(b.collectionId||''));if(!c)throw Error('Coleção não encontrada');const repo=String(b.repo||'').trim();if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw Error('Formato do repositório inválido');if(!c.repos.includes(repo))c.repos.push(repo);save();return c;}
function addReminder(b){const message=String(b.message||'').trim().slice(0,200);if(message.length<3)throw Error('Lembrete inválido');const r={id:randomUUID(),message,created:Date.now(),done:false};db.reminders.push(r);db.reminders=db.reminders.slice(-100);save();return r;}
function finishReminder(id){const r=db.reminders.find(r=>r.id===id);if(!r)throw Error('Lembrete não encontrado');r.done=true;save();return r;}
function scan(text){const rules=[[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,'Possível chave privada'],[/gh[pousr]_[a-z0-9]{20,}/i,'Possível token GitHub'],[/\b(?:rm\s+-rf\s+\/|del\s+\/s\s+\/q|format\s+[a-z]:)/i,'Comando de remoção potencialmente perigoso'],[/\beval\s*\(/i,'Uso de eval'],[/\bexec\s*\(/i,'Execução dinâmica deve ser revisada']];return rules.filter(([re])=>re.test(text)).map(([,msg])=>msg);}
function auditJob(j){const flags=scan((j.log||'').slice(-16000));const result={id:randomUUID(),jobId:j.id,created:Date.now(),flags,status:flags.length?'revisao':'sem alertas nas regras básicas',note:'Triagem por padrões no log. Não substitui auditoria de código nem teste de segurança.'};db.audits.push(result);db.audits=db.audits.slice(-50);save();return result;}
module.exports={all,addAgent,getAgent,generateIdentity,addLesson,lessonContext,scan,auditJob,addCollection,addProfile,addRepoToCollection,addReminder,finishReminder};
