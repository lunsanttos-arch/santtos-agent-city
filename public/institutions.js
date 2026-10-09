// Edifícios públicos: controles de instituições. Nenhum avatar é criado aqui.
const $=id=>document.getElementById(id);
const SERVICES={cityhall:['🏛','PREFEITURA','Coordenação de missões e prioridades'],library:['📚','BIBLIOTECA','Pesquisa pública de repositórios GitHub'],university:['🎓','UNIVERSIDADE','Habilidades por documentação e instruções'],police:['🛡','DELEGACIA DIGITAL','Triagem técnica e registros de segurança'],talents:['✦','AGÊNCIA DE TALENTOS','Cadastre e configure seus agentes de IA']};
const ROLES=[['desenvolvimento','Programação'],['arquitetura','Arquitetura'],['pesquisa','Pesquisador'],['engenharia','Engenheiro'],['qa','QA'],['seguranca','Segurança'],['redacao','Redação'],['gestao','Gestão'],['secretaria','Secretária'],['bibliotecaria','Bibliotecária']];
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
 const root=$('serviceContent');clear(root);root.append(element('span','AGENT CITY · V0.6','civic-eyebrow'));
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
    const card=nodeCard(body,'💬 '+r.message,'Balão visível na Prefeitura, inclusive sem uma sessão de IA ativa.');card.append(action('MARCAR FEITO',async()=>{try{await api('civic/reminder/done',{id:r.id});await openService(obj,context)}catch(e){toast(e.message)}}));
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
  body.append(element('h3','ARQUIVOS GUARDADOS · ÍNDICE README'));for(const f of (existing.fileIndex||[]).slice(-15))nodeCard(body,'▤ '+f.repo+' / '+f.path,f.excerpt);
  body.append(element('h3','ACHADOS ORGANIZADOS PELA BIBLIOTECÁRIA'));for(const d of (existing.discoveries||[]).slice(-16).reverse())nodeCard(body,'📖 '+d.repo,(d.topic||'descoberta')+' · '+(d.description||'Sem descrição').slice(0,140));
  q.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();body.querySelector('.civic-btn.primary').click();}});
 }else if(obj.service==='university'){
  body.append(element('p','Campus ampliado: duas salas de aula e um laboratório de pesquisa. O Pesquisador descobre repositórios públicos; o Engenheiro lê READMEs e encaminha sugestões aos gerentes. As análises são heurísticas e não fazem alterações no GitHub.'));
  const last=await api('civic');
  const state=await api('civic/departments');
  body.append(element('h3','LABORATÓRIO · ROTINAS DO CAMPUS'));
  const toggle=action(last.settings.researchEnabled?'■ DESATIVAR PESQUISA AUTOMÁTICA':'▶ ATIVAR PESQUISA AUTOMÁTICA',async()=>{try{await api('civic/automation',{name:'research',enabled:!last.settings.researchEnabled});toast('Configuração salva. Funciona enquanto o servidor estiver aberto.');await openService(obj,context);}catch(e){toast(e.message)}},'wide');body.append(toggle);
  const go=async(endpoint,caption)=>{try{toast(caption);const r=await api(endpoint,{});toast(r.result?.note||'Rotina concluída');await openService(obj,context)}catch(e){toast('Não foi possível concluir: '+e.message)}};
  body.append(action('🔎 PESQUISADOR · BUSCAR NOVIDADES GITHUB',()=>go('civic/research/run','Pesquisando tecnologias...'),'primary'));
  body.append(action('⚙ ENGENHEIRO · ANALISAR BIBLIOTECA',()=>go('civic/engineer/run','Lendo arquivos e comparando projetos...'),'primary'));
  const activity=state.tasks||{};
  for(const [key,title] of [['research','PESQUISADOR'],['engineer','ENGENHEIRO']]){
    const task=activity[key],result=task?.result;
    nodeCard(body,title+(task?.busy?' • TRABALHANDO':' • PRONTO'),result?.ok?'Última execução: '+new Date(result.at).toLocaleString('pt-BR'):result?.error||'Ainda não executado nesta sessão');
  }
  body.append(element('h3','NOVOS LIVROS · GITHUB'));
  if(!last.discoveries.length)nodeCard(body,'Sem descobertas','Clique em buscar novidades ou ative a pesquisa periódica.');
  for(const d of last.discoveries.slice(-14).reverse()){
    const card=nodeCard(body,d.repo,`${d.topic} · ★ ${d.stars} · ${d.language||'diversos'} · ${d.description||'Sem descrição'}`);
    const a=element('a','ABRIR GITHUB','civic-btn');a.href='https://github.com/'+d.repo;a.target='_blank';a.rel='noopener noreferrer';card.append(a);
  }
  body.append(element('h3','ENTREGA DO ENGENHEIRO AOS GERENTES'));
  if(!last.suggestions.length)nodeCard(body,'Caixa de sugestões vazia','Vincule repositórios aos projetos e peça ao Engenheiro para analisar.');
  for(const sg of last.suggestions.slice(-16).reverse()){
    const project=projects().find(p=>p.projectId===sg.projectId);
    nodeCard(body,(project?.name||sg.projectId)+'  ←  '+sg.repo,sg.reason+'\n'+sg.evidence+' · '+sg.status);
  }
  body.append(element('h3','AULAS E INSTRUÇÕES'));
  const title=labelled(body,'TÍTULO DA AULA','text','Ex.: Padrões de transmissão SRT');title.maxLength=90;
  const role=options(body,'ÁREA DE ESPECIALIZAÇÃO',ROLES);
  const instructions=labelled(body,'CONTEÚDO / INSTRUÇÕES','textarea','Descreva boas práticas, padrões e convenções...');instructions.maxLength=5000;
  body.append(action('SALVAR AULA',async()=>{try{await api('civic/lesson',{title:title.value,role:role.value,text:instructions.value});toast('Aula registrada');await openService(obj,context)}catch(e){toast(e.message)}},'primary'));
  for(const l of last.lessons.slice(-10).reverse())nodeCard(body,l.title,l.role);
 }else if(obj.service==='police'){
  body.append(element('p','Delegado e dois policiais trabalham por divisão de tarefas. Policial 01 varre padrões perigosos; Policial 02 revisa possíveis segredos e execução de comandos; o Delegado consolida relatórios para os gerentes de projeto. É uma inspeção parcial de repositórios públicos, não uma auditoria completa.'));
  const saved=await api('civic');const status=await api('civic/departments');
  body.append(element('h3','EQUIPE DA DELEGACIA'));
  for(const [n,t] of [['👮 DELEGADO','Coordenação e encaminhamento ao gerente'],['🔍 POLICIAL 01','Análise estática por regras'],['🛡 POLICIAL 02','Triagem de credenciais e comandos']])nodeCard(body,n,t);
  body.append(action(saved.settings.policeEnabled?'■ DESATIVAR RONDA AUTOMÁTICA':'▶ ATIVAR RONDA AUTOMÁTICA',async()=>{try{await api('civic/automation',{name:'police',enabled:!saved.settings.policeEnabled});await openService(obj,context)}catch(e){toast(e.message)}},'wide'));
  body.append(action('🚓 DELEGADO · FISCALIZAR PROJETOS VINCULADOS',async()=>{try{toast('Analisando repositórios públicos...');await api('civic/police/run',{});await openService(obj,context);toast('Relatórios encaminhados aos gerentes.')}catch(e){toast(e.message)}},'primary'));
  const latest=status.tasks?.police;
  nodeCard(body,latest?.busy?'RONDA EM CURSO':'RONDA PRONTA',latest?.result?.error||'Vincule repositórios públicos aos escritórios para inspecioná-los.');
  body.append(element('h3','RELATÓRIOS AO AGENTE GERENTE'));
  if(!saved.policeReports.length)nodeCard(body,'Sem relatórios','Execute a fiscalização para gerar relatórios.');
  for(const report of saved.policeReports.slice(-12).reverse()){
    const card=nodeCard(body,'🚨 '+(projects().find(p=>p.projectId===report.projectId)?.name||report.repo),report.summary+' · '+new Date(report.created).toLocaleString('pt-BR'));
    for(const officer of report.officers||[]){nodeCard(card,officer.name+' · '+officer.task,String(officer.findings.length)+' pontos para revisão');}
  }
  body.append(element('h3','CONSULTA PONTUAL'));
  const target=options(body,'ESCRITÓRIO',projects().filter(p=>p.github?.name).map(p=>[p.projectId,p.name]));
  const results=element('div',null,'civic-results');body.append(action('VERIFICAR REPOSITÓRIO',async()=>{if(!target.value)return toast('Vincule um repositório');try{const r=await api('civic/repo-scan',{projectId:target.value});clear(results);nodeCard(results,r.report.repo,r.report.filesReviewed+' arquivos revisados');for(const x of r.report.findings.slice(0,25))nodeCard(results,x.file+':'+x.line,x.severity+' · '+x.message);}catch(e){toast(e.message)}},'primary'),results);
 }else if(obj.service==='talents'){
  body.append(element('p','Cada cadastro cria nome e skin automaticamente. Tu escolhe função, setor e provedor. O personagem nasce e aparece na cidade imediatamente. Sua IA só trabalha depois de uma conexão real e de uma missão aprovada.'));
  const provider=options(body,'CONECTAR PROVEDOR',[['codex','Codex CLI'],['claude','Claude Code'],['gemini','Gemini CLI'],['ollama','Ollama local'],['manus','Manus API']]);
  const role=options(body,'PROFISSÃO',ROLES);
  const service=options(body,'LOCAL DE TRABALHO',DEPARTMENTS);
  const roleDefaults={secretaria:'cityhall',bibliotecaria:'library',seguranca:'police',pesquisa:'university',engenharia:'university',gestao:'cityhall'};
  role.onchange=()=>{service.value=roleDefaults[role.value]||'office'};
  body.append(action('✦ CRIAR PERSONAGEM',async()=>{try{const r=await api('civic/agent',{provider:provider.value,role:role.value,service:service.value});toast('Novo talento: '+r.agent.name);await openService(obj,context);}catch(e){toast(e.message)}},'primary'));
  try{const data=await api('civic');body.append(element('h3','AGENTES CADASTRADOS'));if(!data.agents.length)body.append(element('p','Nenhum perfil criado.'));
    for(const a of data.agents){const card=nodeCard(body,a.name,a.role+' · '+a.provider+' · '+(DEPARTMENTS.find(x=>x[0]===a.service)?.[1]||a.service)+(a.projectId?' · ESCRITÓRIO '+a.projectId:' · DISPONÍVEL'));const swatch=element('span','■  SKIN GERADA','skin-swatch');swatch.style.color=a.skin?.outfit||'#a880e0';card.append(swatch);}
  }catch(e){body.append(element('p',e.message))}

 }
}

export async function openOfficeTeam(project,context){
 const {api,toast,store,projects}=context,body=container('talents',context);
 const title=body.parentElement?.querySelector('h2');if(title)title.textContent='🏢  EQUIPE · '+project.name.toUpperCase();
 body.append(element('p','Escolhe um agente já criado na Central de Talentos e atribui uma função ao escritório. O personagem aparece na cidade mesmo enquanto sua IA estiver offline.'));
 const a=await api('civic');const optionsAgent=a.agents.map(agent=>[agent.id,agent.name+' · '+agent.role+(agent.projectId?' ('+agent.projectId+')':'')]);
 if(!optionsAgent.length){nodeCard(body,'Nenhum talento','Vai à Central de Talentos, cadastra um agente e volta aqui.');return;}
 const selected=options(body,'AGENTE DA CIDADE',optionsAgent);
 const profession=labelled(body,'FUNÇÃO NESTE PROJETO','text','Ex.: Gerente de QA, arquiteto do Playout');profession.maxLength=70;
 selected.onchange=()=>{profession.value=a.agents.find(x=>x.id===selected.value)?.officeFunction||a.agents.find(x=>x.id===selected.value)?.role||''};selected.onchange();
 body.append(action('DESIGNAR AO ESCRITÓRIO',async()=>{try{await api('civic/agent/assign',{agentId:selected.value,projectId:project.projectId,officeFunction:profession.value});toast('Agente designado');await openOfficeTeam(project,context)}catch(e){toast(e.message)}},'primary'));
 body.append(element('h3','EQUIPE DESIGNADA'));
 const assigned=a.agents.filter(x=>x.projectId===project.projectId);
 if(!assigned.length)nodeCard(body,'Escritório sem pessoal','Designa um agente acima.');
 for(const agent of assigned){const running=store.jobs.some(j=>j.agentId===agent.id&&j.connected&&['running','waiting'].includes(j.status));const card=nodeCard(body,agent.name,(agent.officeFunction||agent.role)+' · '+agent.provider+' · '+(running?'EM MISSÃO REAL':'CADASTRADO · AGUARDANDO IA'));
 card.append(action('LIBERAR DO ESCRITÓRIO',async()=>{try{await api('civic/agent/assign',{agentId:agent.id,projectId:null,officeFunction:agent.role});await openOfficeTeam(project,context)}catch(e){toast(e.message)}}));}
 body.append(element('h3','RECOMENDAÇÕES DA UNIVERSIDADE'));
 for(const suggestion of a.suggestions.filter(s=>s.projectId===project.projectId&&s.status==='nova').slice(-12).reverse()){
  const card=nodeCard(body,suggestion.repo,suggestion.reason+' · '+suggestion.evidence);
  card.append(action('MARCAR COMO LIDA',async()=>{await api('civic/suggestion/status',{id:suggestion.id,status:'lida'});await openOfficeTeam(project,context)}));
 }
 body.append(element('h3','ALERTAS DA DELEGACIA'));
 for(const report of a.policeReports.filter(r=>r.projectId===project.projectId).slice(-6).reverse())nodeCard(body,report.repo,report.summary);
}
