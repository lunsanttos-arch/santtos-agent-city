'use strict';
// Read-only public GitHub discovery. Never executes untrusted repository code.
const civic=require('./civic');
const security=require('./security');
const THEMES=[
 {topic:'automação',query:'topic:automation stars:>100 archived:false'},
 {topic:'inteligência artificial',query:'topic:ai-agent stars:>100 archived:false'},
 {topic:'streaming e vídeo',query:'topic:streaming stars:>100 archived:false'},
 {topic:'ferramentas de desenvolvimento',query:'topic:developer-tools stars:>100 archived:false'},
 {topic:'novas tecnologias',query:'topic:local-ai stars:>60 archived:false'},
 {topic:'infraestrutura',query:'topic:observability stars:>100 archived:false'}
];
const STOP=new Set('para com pela pelo essa esse isto sobre numa umas uns todas novos novo abrir cidade trabalho projetos projeto programa essas esses into from the and with using for this that what'.split(' '));
const domainWords={
 playout:['video','playout','broadcast','ffmpeg','stream','ndi','srt','audio','media','encoding','live','player','obs','web'],
 radar:['news','rss','ai','agent','search','crawler','scraping','feed','nlp','ollama','local','summarization'],
 redacao:['editor','workflow','teleprompter','script','subtitle','caption','newsroom','nrcs','media'],
 signage:['android','tv','kiosk','signage','player','media','cache','playlist','display'],
 chatbox:['whatsapp','chat','customer','messaging','crm','automation','support','bot']
};
function words(value){return [...new Set(String(value||'').toLowerCase().match(/[a-zà-ú0-9]{4,}/g)||[])].filter(w=>!STOP.has(w)).slice(0,75);}
async function githubJson(path,fetchImpl=fetch){
 const u=new URL('https://api.github.com/'+path);
 if(u.origin!=='https://api.github.com')throw Error('Host não permitido');
 const res=await fetchImpl(u.toString(),{headers:{'User-Agent':'SanTTos-Agent-City','Accept':'application/vnd.github+json'},signal:AbortSignal.timeout(10000)});
 if(!res.ok)throw Error('GitHub HTTP '+res.status+' (limite de API, rede ou repositório indisponível)');return res.json();
}
let rotation=0;
async function discover(fetchImpl=fetch){
 const theme=THEMES[rotation++%THEMES.length],u=new URLSearchParams({q:theme.query,sort:'updated',order:'desc',per_page:'8'});
 const response=await githubJson('search/repositories?'+u,fetchImpl);
 const candidates=(response.items||[]).filter(x=>!x.private&&!x.archived&&x.stargazers_count>=30);
 const collected=[];
 for(const repo of candidates.slice(0,6)){
  if(!security.validRepo(repo.full_name))continue;
  const saved=civic.recordDiscovery({repo:repo.full_name,name:repo.name,description:repo.description||'',language:repo.language||'',stars:repo.stargazers_count,topic:theme.topic});collected.push(saved);
 }
 // Library creates an explicit collection and catalogue entries. No repository files are downloaded here.
 const collection=civic.ensureResearchCollection();
 for(const d of collected)civic.curateDiscovery(d.id,collection.id);
 return {topic:theme.topic,total:collected.length,repos:collected.map(d=>d.repo),source:'GitHub Search API pública',note:'Pesquisa amostral por tema, não varredura exaustiva de todo o GitHub.'};
}
async function readReadme(repo,fetchImpl=fetch){
 if(!security.validRepo(repo))throw Error('Repositório inválido');
 try{const r=await githubJson('repos/'+repo+'/readme',fetchImpl);if(r.encoding!=='base64'||!r.content||r.size>130000)return '';
 return Buffer.from(r.content,'base64').toString('utf8').replace(/<[^>]{0,200}>/g,' ').slice(0,14000);
 }catch{return '';}
}
function scoreIdea(d,readme,project){
 const name=project.name||project.projectId;const expected=[...new Set([...(domainWords[project.projectId]||[]),...words(name)].filter(Boolean))];
 const body=(d.repo+' '+d.description+' '+readme).toLowerCase();
 const matched=expected.filter(w=>body.includes(w));
 if(!matched.length)return null;
 const excerpt=String(readme).split(/\r?\n/).find(line=>matched.some(w=>line.toLowerCase().includes(w))&&line.trim().length>15)?.trim().slice(0,200)||d.description.slice(0,200);
 return {repo:d.repo,projectId:project.projectId,reason:`Possível aproveitamento em ${name}: palavras relacionadas ${matched.slice(0,6).join(', ')}. Avaliar licença, arquitetura e compatibilidade antes de integrar.`,evidence:`GitHub ${d.repo} (${d.language||'linguagem não informada'}, ${d.stars||0} estrelas); referência do README: ${excerpt||'README não disponível'}`};
}
async function engineer(projects,fetchImpl=fetch){
 const library=civic.all();const discoveryRepos=new Set(library.discoveries.map(d=>d.repo));
 const manual=library.collections.flatMap(c=>c.repos).filter(repo=>!discoveryRepos.has(repo)).map(repo=>({repo,description:'',language:'',stars:0}));
 const catalogue=[...library.discoveries.slice(-15).reverse(),...manual.slice(-10)];let analysed=0,created=[];
 const indexed=new Set();
 for(const d of catalogue){
  if(analysed>=5)break;
  if(indexed.has(d.repo))continue;indexed.add(d.repo);
  const readme=await readReadme(d.repo,fetchImpl);if(readme)civic.archiveReadme(d.repo,readme);analysed++;
  for(const p of projects.filter(p=>p.github?.name).slice(0,10)){
   const idea=scoreIdea(d,readme,p);if(!idea)continue;
   const saved=civic.recordSuggestion(idea);if(saved)created.push(saved);
  }
 }
 return {read:analysed,created:created.length,suggestions:created.slice(0,15),note:'Engenheiro usa leitura de README e regras de compatibilidade; propostas exigem avaliação do gerente.'};
}
async function policePatrol(projects,fetchImpl=fetch){
 const results=[];
 for(const p of projects.filter(x=>x.github?.name).slice(0,5)){
  try{
   const report=await security.reviewPublicRepo(p.github.name,fetchImpl);
   const officer1=report.findings.filter(f=>['hardcoded-secret','eval','shell','innerHTML','weak-crypto'].includes(f.id));
   const configs=await security.reviewPublicConfig(p.github.name,fetchImpl).catch(e=>({files:[],findings:[],error:e.message}));
   const officer2=[...report.findings.filter(f=>f.id==='hardcoded-secret'),...configs.findings];
   const summary=report.filesReviewed+' fontes e '+configs.files.length+' arquivos de configuração; '+(report.findings.length+configs.findings.length)+' padrões para revisão. Cobertura parcial.';
   const saved=civic.recordPoliceReport({projectId:p.projectId,repo:p.github.name,summary,officers:[
    {name:'Policial de Código',task:'Análise estática de padrões arriscados',files:report.filesReviewed,findings:officer1.slice(0,35)},
    {name:'Policial de Credenciais',task:'Triagem de possíveis segredos e execução de comandos',files:configs.files.length,findings:officer2.slice(0,35)},
    {name:'Delegado',task:'Consolidação e encaminhamento ao gerente',findings:[...report.findings,...configs.findings].slice(0,45)}
   ]});results.push(saved);
  }catch(e){results.push({projectId:p.projectId,repo:p.github.name,error:String(e.message).slice(0,200)});}
 }
 return {reports:results,analysed:results.filter(x=>!x.error).length,note:'Polícia faz triagem de código público com regras heurísticas, sem executar o código. O gerente recebe o relatório.'};
}
module.exports={discover,engineer,policePatrol,readReadme,scoreIdea,githubJson};
