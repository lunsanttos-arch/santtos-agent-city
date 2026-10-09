// Edifícios públicos: controles de instituições. Nenhum avatar é criado aqui.
const $=id=>document.getElementById(id);
const SERVICES={cityhall:['🏛','PREFEITURA','Coordenação de missões e prioridades'],library:['📚','BIBLIOTECA','Pesquisa pública de repositórios GitHub'],university:['🎓','UNIVERSIDADE','Habilidades por documentação e instruções'],police:['🛡','DELEGACIA DIGITAL','Triagem técnica e registros de segurança'],talents:['✦','AGÊNCIA DE TALENTOS','Cadastre e configure seus agentes de IA']};
const ROLES=[['desenvolvimento','Programação'],['arquitetura','Arquitetura'],['pesquisa','Pesquisa'],['qa','QA'],['seguranca','Segurança'],['redacao','Redação'],['gestao','Gestão'],['secretaria','Secretária'],['bibliotecaria','Bibliotecária']];
function element(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=String(text);if(cls)e.className=cls;return e;}
function action(text,fn,cls=''){const b=element('button',text,'civic-btn '+cls);b.type='button';b.onclick=fn;return b;}
function labelled(parent,title,type='text',placeholder=''){const l=element('label',title,'civic-label'),i=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')i.type=type;i.placeholder=placeholder;l.append(i);parent.append(l);return i;}
function options(parent,title,values){const l=element('label',title,'civic-label'),s=document.createElement('select');for(const [id,label] of values){const o=new Option(label,id);s.add(o)}l.append(s);parent.append(l);return s;}
function clear(node){node.replaceChildren()}
function nodeCard(parent,title,description){const box=element('div',null,'civic-card');box.append(element('strong',title));if(description)box.append(element('p',description));parent.append(box);return box;}
const getActive=j=>j.connected&&['running','waiting'].includes(j.status);
const DEPARTMENTS=[['cityhall','Prefeitura'],['police','Delegacia'],['library','Biblioteca'],['university','Universidade'],['talents','Central de Talentos'],['office','Escritórios de projetos']];
function container(service,context){
 const [emoji,title,subtitle]=SERVICES[service]||['⌂','SAN TTOS','Cidade dos agentes'];
 const root=$('serviceContent');clear(root);root.append(element('span','AGENT CITY · V0.5','civic-eyebrow'));
 const h=element('h2',emoji+'  '+title);root.append(h,element('p',subtitle,'civic-subtitle'));
 const inner=element('div',null,'civic-body');root.append(inner);$('serviceModal').classList.remove('hidden');return inner;
}
export function showServiceDirectory(objects,context){const body=container('cityhall',context);body.append(element('h3','SERVIÇOS DA CIDADE'));
 for(const s of objects.filter(o=>o.kind==='service'))body.append(action('➜ '+s.name,()=>openService(s,context),'wide'));
}
export async function openService(obj,context){const {api,store,toast,projects,chooseProject}=context;const body=container(obj.service,context);
 if(obj.service==='cityhall'){
  const tiles=element('div',null,'civic-metrics');for(const [title,n] of [['PROJETOS',projects().length],['AGENTES TRABALHANDO',store.jobs.filter(getActive).length],['AGUARDANDO APROVAÇÃO',store.jobs.filter(j=>j.status==='pending').length],['ALERTAS',store.jobs.filter(j=>j.status==='failed').length]]){const div=nodeCard(tiles,String(n),title);div.classList.add('metric')}body.append(tiles);
  const memo=labelled(body,'RECADO PARA A SECRETÁRIA','text','Ex.: lembrar de revisar PRs amanhã');memo.maxLength=200;
  body.append(action('CRIAR LEMBRETE',async()=>{try{await api('civic/reminder',{message:memo.value});toast('Lembrete criado');await openService(obj,context)}catch(e){toast(e.message)}},'primary'));
  const saved=await api('civic');body.append(element('h3','BALÕES E LEMBRETES'));if(!saved.reminders?.length)body.append(element('p','Nenhum lembrete cadastrado.'));
  for(const r of (saved.reminders||[]).filter(x=>!x.done).slice(-6).reverse()){
    const card=nodeCard(body,'💬 '+r.message,'Aparece em balão quando houver uma secretária conectada em missão ativa.');card.append(action('MARCAR FEITO',async()=>{try{await api('civic/reminder/done',{id:r.id});await openService(obj,context)}catch(e){toast(e.message)}}));
  }
  body.append(element('h3','MISSÕES RECENTES'));
  if(!store.jobs.length)nodeCard(body,'Nenhuma missão criada','Começa vinculando um repositório a um escritório.');
  for(const j of store.jobs.slice(0,8))nodeCard(body,j.provider.toUpperCase()+' · '+j.status,j.prompt.slice(0,130));
  body.append(action('ABRIR CENTRO DE MISSÕES',()=>{$('serviceModal').classList.add('hidden');$('btnManagement').click();},'primary'));
 }else if(obj.service==='library'){
  const q=labelled(body,'PESQUISAR REPOSITÓRIOS PÚBLICOS','text','Ex.: pixel art engine, lunsanttos-arch...');q.maxLength=120;
  const results=element('div',null,'civic-results');body.append(action('⌕ PESQUISAR NO GITHUB',async()=>{clear(results);results.append(element('p','Consultando GitHub...'));try{const r=await api('library/search?q='+encodeURIComponent(q.value));clear(results);if(!r.repos.length)results.append(element('p','Nenhum resultado.'));r.repos.forEach(repo=>{const card=nodeCard(results,repo.name,(repo.description||'Sem descrição').slice(0,220)+' · ⭐ '+repo.stars);card.append(action('VINCULAR A PRÉDIO',()=>{clear(results);results.append(element('h3','Escolha um projeto'));projects().forEach(p=>results.append(action(p.name,async()=>{try{await api('project',{id:p.projectId,github:repo.name});toast('Repositório vinculado: '+repo.name);await openService(obj,context);}catch(e){toast(e.message)}},'wide')));},'primary'));});}catch(e){clear(results);results.append(element('p',e.message))}},'primary'),results);
  body.append(element('h3','COLEÇÕES & PERFIS DA BIBLIOTECA'));
  const col=labelled(body,'NOVA COLEÇÃO','text','Ex.: Inspirações para Playout');col.maxLength=80;
  body.append(action('CRIAR COLEÇÃO',async()=>{try{await api('civic/collection',{name:col.value});toast('Coleção criada');await openService(obj,context)}catch(e){toast(e.message)}},'primary'));
  const person=labelled(body,'PERFIL GITHUB','text','Ex.: lunsanttos-arch');person.maxLength=39;
  body.append(action('CADASTRAR PERFIL',async()=>{try{await api('civic/profile',{username:person.value});toast('Perfil registrado');await openService(obj,context)}catch(e){toast(e.message)}},'primary'));
  const existing=await api('civic');
  for(const c of existing.collections||[]){const card=nodeCard(body,'📚 '+c.name,`${c.repos.length} repositórios`);const repoInput=labelled(card,'REPOSITÓRIO owner/repo','text','Ex.: nodejs/node');card.append(action('GUARDAR NA COLEÇÃO',async()=>{try{await api('civic/collection/repo',{collectionId:c.id,repo:repoInput.value});await openService(obj,context)}catch(e){toast(e.message)}}));for(const repo of c.repos||[])card.append(element('small','▣ '+repo));}
  for(const p of existing.profiles||[])nodeCard(body,'@'+p.username,'Perfil guardado na Biblioteca');
  q.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();body.querySelector('.civic-btn.primary').click();}});
 }else if(obj.service==='university'){
  body.append(element('p','Pesquisador + 2 auxiliares: atribua agentes reais pela Central de Talentos. A pesquisa usa repositórios públicos e fornece referências; lições contextualizam missões, não treinam pesos do modelo.'));
  const query=labelled(body,'PESQUISAR SOLUÇÕES PÚBLICAS','text','Ex.: NDI playout websocket');
  const references=element('div',null,'civic-results');body.append(action('PESQUISAR NO GITHUB',async()=>{try{const r=await api('library/search?q='+encodeURIComponent(query.value));clear(references);for(const repo of r.repos)nodeCard(references,repo.name,(repo.description||'Sem descrição')+' · ★ '+repo.stars);}catch(e){toast(e.message)}},'primary'),references);
  const title=labelled(body,'TÍTULO DA LIÇÃO','text','Ex.: Padrão de testes do Playout');title.maxLength=90;
  const role=options(body,'ÁREA DE ESPECIALIZAÇÃO',ROLES);
  const instructions=labelled(body,'DOCUMENTAÇÃO / INSTRUÇÕES','textarea','Descreva regras, padrões e convenções...');instructions.maxLength=5000;
  const list=element('div',null,'civic-results');body.append(action('SALVAR LIÇÃO',async()=>{try{await api('civic/lesson',{title:title.value,role:role.value,text:instructions.value});toast('Lição salva');await openService(obj,context)}catch(e){toast(e.message)}},'primary'),list);
  try{const data=await api('civic');body.append(element('h3','CONTEÚDOS REGISTRADOS'));if(!data.lessons.length)body.append(element('p','Nenhuma lição cadastrada.'));for(const l of data.lessons)nodeCard(body,l.title,l.role);}catch(e){body.append(element('p',e.message))}
 }else if(obj.service==='police'){
  body.append(element('p','Delegado + 2 auxiliares: cadastre três agentes de segurança e atribua missões a eles. A triagem inicial procura padrões em logs; auditoria de código completo ainda está em evolução.'));
  const team=(await api('civic')).agents.filter(a=>a.service==='police');body.append(element('h3','EQUIPE DE INVESTIGAÇÃO'));for(let i=0;i<3;i++)nodeCard(body,['DELEGADO','POLICIAL 01','POLICIAL 02'][i],team[i]?team[i].name+' · '+team[i].provider:'VAGA · Crie um agente na Central de Talentos');
  try{const data=await api('civic');if(data.audits.length){body.append(element('h3','ÚLTIMAS INSPEÇÕES'));for(const a of data.audits.slice().reverse().slice(0,6))nodeCard(body,a.status,a.flags.join(' · ')||a.note);}}
  catch(e){body.append(element('p',e.message))}
  body.append(element('h3','FISCALIZAR CÓDIGO PÚBLICO DO GITHUB'));
  body.append(element('p','Análise experimental dos primeiros arquivos-fonte pequenos de um repositório público. Não inspeciona o projeto inteiro nem substitui SAST.'));
  const projectList=projects().filter(p=>p.github?.name);
  const target=options(body,'PROJETO VINCULADO',projectList.map(p=>[p.projectId,p.name+' · '+p.github.name]));
  const findings=element('div',null,'civic-results');body.append(action('🔎 FISCALIZAR CÓDIGO',async()=>{
    if(!target.value)return toast('Vincule um repositório primeiro');
    clear(findings);findings.append(element('p','Pesquisando o código no GitHub...'));
    try{const r=await api('civic/repo-scan',{projectId:target.value});clear(findings);
      nodeCard(findings,'TRIAGEM DE '+r.report.repo,r.report.filesReviewed+' arquivos analisados · '+r.report.findings.length+' pontos para revisão');
      for(const f of r.report.findings)nodeCard(findings,f.severity.toUpperCase()+' · '+f.file+':'+f.line,f.message);
      if(!r.report.findings.length)nodeCard(findings,'Nenhum padrão detectado','Isso não garante ausência de falhas.');
    }catch(e){clear(findings);nodeCard(findings,'FALHA NA TRIAGEM',e.message);}
  },'primary'),findings);
  body.append(element('h3','INSPECIONAR MISSÕES'));
  for(const j of store.jobs.slice(0,20)){const line=nodeCard(body,j.provider+' · '+j.status,j.prompt.slice(0,100));line.append(action('AUDITAR LOG',async()=>{try{const result=await api('civic/audit',{id:j.id});toast(result.audit.flags.length?result.audit.flags.join(', '):'Nenhum padrão perigoso identificado');await openService(obj,context)}catch(e){toast(e.message)}},'primary'))}
  if(!store.jobs.length)body.append(element('p','Ainda não há missões para inspecionar.'));
 }else if(obj.service==='talents'){
  body.append(element('p','Cada cadastro cria nome e skin automaticamente. Tu escolhe função, setor e provedor. O personagem só aparece fisicamente quando o provedor estiver executando uma missão conectada.'));
  const provider=options(body,'CONECTAR PROVEDOR',[['codex','Codex CLI'],['claude','Claude Code'],['gemini','Gemini CLI'],['ollama','Ollama local'],['manus','Manus API']]);
  const role=options(body,'PROFISSÃO',ROLES);
  const service=options(body,'LOCAL DE TRABALHO',DEPARTMENTS);
  const roleDefaults={secretaria:'cityhall',bibliotecaria:'library',seguranca:'police',pesquisa:'university',gestao:'cityhall'};
  role.onchange=()=>{service.value=roleDefaults[role.value]||'office'};
  body.append(action('✦ CRIAR PERSONAGEM',async()=>{try{const r=await api('civic/agent',{provider:provider.value,role:role.value,service:service.value});toast('Novo talento: '+r.agent.name);await openService(obj,context);}catch(e){toast(e.message)}},'primary'));
  try{const data=await api('civic');body.append(element('h3','AGENTES CADASTRADOS'));if(!data.agents.length)body.append(element('p','Nenhum perfil criado.'));
    for(const a of data.agents){const card=nodeCard(body,a.name,a.role+' · '+a.provider+' · '+(DEPARTMENTS.find(x=>x[0]===a.service)?.[1]||a.service));const swatch=element('span','■  SKIN GERADA','skin-swatch');swatch.style.color=a.skin?.outfit||'#a880e0';card.append(swatch);}
  }catch(e){body.append(element('p',e.message))}

 }
}
