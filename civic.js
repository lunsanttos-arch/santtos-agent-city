'use strict';
const fs=require('node:fs');
const path=require('node:path');
const FILE=path.join(__dirname,'data','civic.json');
const PROVIDERS=new Set(['codex','claude','gemini','ollama','manus']);
const ROLES=new Set(['desenvolvimento','arquitetura','pesquisa','qa','seguranca','redacao','gestao']);
let db={agents:[],lessons:[],audits:[]};
try{const raw=JSON.parse(fs.readFileSync(FILE,'utf8'));if(Array.isArray(raw.agents)&&Array.isArray(raw.lessons))db=raw;}catch{}
function save(){fs.mkdirSync(path.dirname(FILE),{recursive:true});const tmp=FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,FILE);}
function all(){return {agents:db.agents.map(({id,name,role,provider,created})=>({id,name,role,provider,created})),lessons:db.lessons.map(({id,title,role,created})=>({id,title,role,created})),audits:db.audits.slice(-15)};}
function addAgent(b){
  const name=String(b.name||'').trim().slice(0,45), provider=String(b.provider||''), role=String(b.role||'');
  if(name.length<2||!PROVIDERS.has(provider)||!ROLES.has(role))throw Error('Informe nome, provedor e profissão válidos');
  const a={id:require('node:crypto').randomUUID(),name,provider,role,created:Date.now()};db.agents.push(a);save();return a;
}
function addLesson(b){
  const title=String(b.title||'').trim().slice(0,90),text=String(b.text||'').trim().slice(0,5000),role=String(b.role||'');
  if(title.length<3||text.length<10||!ROLES.has(role))throw Error('Lição inválida. Inclua título, área e instruções');
  const item={id:require('node:crypto').randomUUID(),title,text,role,created:Date.now()};db.lessons.push(item);save();return {id:item.id,title:item.title,role:item.role};
}
function lessonContext(role){return db.lessons.filter(x=>x.role===role).slice(-4).map(x=>x.title+': '+x.text).join('\n').slice(0,7000);}
function scan(text){
  const rules=[[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,'Possível chave privada'],[/gh[pousr]_[a-z0-9]{20,}/i,'Possível token GitHub'],[/\b(?:rm\s+-rf\s+\/|del\s+\/s\s+\/q|format\s+[a-z]:)/i,'Comando de remoção potencialmente perigoso'],[/\beval\s*\(/i,'Uso de eval'],[/\bexec\s*\(/i,'Execução dinâmica deve ser revisada']];
  return rules.filter(([re])=>re.test(text)).map(([,message])=>message);
}
function auditJob(j){const flags=scan((j.log||'').slice(-16000));const result={id:require('node:crypto').randomUUID(),jobId:j.id,created:Date.now(),flags,status:flags.length?'revisao':'sem alertas nas regras básicas',note:'Triagem por padrões no log. Não substitui auditoria de código nem teste de segurança.'};db.audits.push(result);db.audits=db.audits.slice(-50);save();return result;}
module.exports={all,addAgent,addLesson,lessonContext,scan,auditJob};
