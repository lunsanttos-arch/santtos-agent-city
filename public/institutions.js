// Edifícios públicos: controles de instituições. Nenhum avatar é criado aqui.
const $=id=>document.getElementById(id);
const SERVICES={cityhall:['🏛','PREFEITURA','Coordenação de missões e prioridades'],library:['📚','BIBLIOTECA','Pesquisa pública de repositórios GitHub'],university:['🎓','UNIVERSIDADE','Habilidades por documentação e instruções'],police:['🛡','DELEGACIA DIGITAL','Triagem técnica e registros de segurança'],talents:['✦','AGÊNCIA DE TALENTOS','Cadastre e configure seus agentes de IA']};
const ROLES=[['desenvolvimento','Programação'],['arquitetura','Arquitetura'],['pesquisa','Pesquisa'],['qa','QA'],['seguranca','Segurança'],['redacao','Redação'],['gestao','Gestão']];
function element(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=String(text);if(cls)e.className=cls;return e;}
function action(text,fn,cls=''){const b=element('button',text,'civic-btn '+cls);b.type='button';b.onclick=fn;return b;}
function labelled(parent,title,type='text',placeholder=''){const l=element('label',title,'civic-label'),i=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')i.type=type;i.placeholder=placeholder;l.append(i);parent.append(l);return i;}
function options(parent,title,values){const l=element('label',title,'civic-label'),s=document.createElement('select');for(const [id,label] of values){const o=new Option(label,id);s.add(o)}l.append(s);parent.append(l);return s;}
function clear(node){node.replaceChildren()}
function nodeCard(parent,title,description){const box=element('div',null,'civic-card');box.append(element('strong',title));if(description)box.append(element('p',description));parent.append(box);return box;}
const getActive=j=>j.connected&&['running','waiting'].includes(j.status);
function container(service,context){
 const [emoji,title,subtitle]=SERVICES[service]||['⌂','SAN TTOS','Cidade dos agentes'];
 const root=$('serviceContent');clear(root);root.append(element('span','AGENT CITY · V0.4','civic-eyebrow'));
 const h=element('h2',emoji+'  '+title);root.append(h,element('p',subtitle,'civic-subtitle'));
 const inner=element('div',null,'civic-body');root.append(inner);$('serviceModal').classList.remove('hidden');return inner;
}
export function showServiceDirectory(objects,context){const body=container('cityhall',context);body.append(element('h3','SERVIÇOS DA CIDADE'));
 for(const s of objects.filter(o=>o.kind==='service'))body.append(action('➜ '+s.name,()=>openService(s,context),'wide'));
}
export async function openService(obj,context){const {api,store,toast,projects,chooseProject}=context;const body=container(obj.service,context);
 if(obj.service==='cityhall'){
  const tiles=element('div',null,'civic-metrics');for(const [title,n] of [['PROJETOS',projects().length],['AGENTES TRABALHANDO',store.jobs.filter(getActive).length],['AGUARDANDO APROVAÇÃO',store.jobs.filter(j=>j.status==='pending').length],['ALERTAS',store.jobs.filter(j=>j.status==='failed').length]]){const div=nodeCard(tiles,String(n),title);div.classList.add('metric')}body.append(tiles);
  body.append(element('h3','MISSÕES RECENTES'));
  if(!store.jobs.length)nodeCard(body,'Nenhuma missão criada','Começa vinculando um repositório a um escritório.');
  for(const j of store.jobs.slice(0,8))nodeCard(body,j.provider.toUpperCase()+' · '+j.status,j.prompt.slice(0,130));
  body.append(action('ABRIR CENTRO DE MISSÕES',()=>{$('serviceModal').classList.add('hidden');$('btnManagement').click();},'primary'));
 }else if(obj.service==='library'){
  const q=labelled(body,'PESQUISAR REPOSITÓRIOS PÚBLICOS','text','Ex.: pixel art engine, lunsanttos-arch...');q.maxLength=120;
  const results=element('div',null,'civic-results');body.append(action('⌕ PESQUISAR NO GITHUB',async()=>{clear(results);results.append(element('p','Consultando GitHub...'));try{const r=await api('library/search?q='+encodeURIComponent(q.value));clear(results);if(!r.repos.length)results.append(element('p','Nenhum resultado.'));r.repos.forEach(repo=>{const card=nodeCard(results,repo.name,(repo.description||'Sem descrição').slice(0,220)+' · ⭐ '+repo.stars);card.append(action('VINCULAR A PRÉDIO',()=>{clear(results);results.append(element('h3','Escolha um projeto'));projects().forEach(p=>results.append(action(p.name,async()=>{try{await api('project',{id:p.projectId,github:repo.name});toast('Repositório vinculado: '+repo.name);await openService(obj,context);}catch(e){toast(e.message)}},'wide')));},'primary'));});}catch(e){clear(results);results.append(element('p',e.message))}},'primary'),results);
  q.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();body.querySelector('.civic-btn.primary').click();}});
 }else if(obj.service==='university'){
  body.append(element('p','Crie instruções por profissão. Elas são incluídas no contexto de futuras missões compatíveis; isto não é treinamento dos pesos do modelo.'));
  const title=labelled(body,'TÍTULO DA LIÇÃO','text','Ex.: Padrão de testes do Playout');title.maxLength=90;
  const role=options(body,'ÁREA DE ESPECIALIZAÇÃO',ROLES);
  const instructions=labelled(body,'DOCUMENTAÇÃO / INSTRUÇÕES','textarea','Descreva regras, padrões e convenções...');instructions.maxLength=5000;
  const list=element('div',null,'civic-results');body.append(action('SALVAR LIÇÃO',async()=>{try{await api('civic/lesson',{title:title.value,role:role.value,text:instructions.value});toast('Lição salva');await openService(obj,context)}catch(e){toast(e.message)}},'primary'),list);
  try{const data=await api('civic');body.append(element('h3','CONTEÚDOS REGISTRADOS'));if(!data.lessons.length)body.append(element('p','Nenhuma lição cadastrada.'));for(const l of data.lessons)nodeCard(body,l.title,l.role);}catch(e){body.append(element('p',e.message))}
 }else if(obj.service==='police'){
  body.append(element('p','A triagem procura padrões suspeitos nos logs. Não executa uma auditoria profunda do código e não garante ausência de vulnerabilidades.'));
  try{const data=await api('civic');if(data.audits.length){body.append(element('h3','ÚLTIMAS INSPEÇÕES'));for(const a of data.audits.slice().reverse().slice(0,6))nodeCard(body,a.status,a.flags.join(' · ')||a.note);}}
  catch(e){body.append(element('p',e.message))}
  body.append(element('h3','INSPECIONAR MISSÕES'));
  for(const j of store.jobs.slice(0,20)){const line=nodeCard(body,j.provider+' · '+j.status,j.prompt.slice(0,100));line.append(action('AUDITAR LOG',async()=>{try{const result=await api('civic/audit',{id:j.id});toast(result.audit.flags.length?result.audit.flags.join(', '):'Nenhum padrão perigoso identificado');await openService(obj,context)}catch(e){toast(e.message)}},'primary'))}
  if(!store.jobs.length)body.append(element('p','Ainda não há missões para inspecionar.'));
 }else if(obj.service==='talents'){
  body.append(element('p','A Agência cadastra perfis. Um personagem só aparece no mapa durante uma execução realmente conectada à IA — criar perfil não simula uma conexão.'));
  const name=labelled(body,'NOME DO AGENTE','text','Ex.: Aurora · Revisora de código');name.maxLength=45;
  const provider=options(body,'PROVEDOR',[['codex','Codex CLI'],['claude','Claude Code'],['gemini','Gemini CLI'],['ollama','Ollama local'],['manus','Manus API']]);
  const role=options(body,'PROFISSÃO',ROLES);body.append(action('CRIAR PERFIL',async()=>{try{await api('civic/agent',{name:name.value,provider:provider.value,role:role.value});toast('Perfil criado. Vincule a uma missão para trabalhar.');await openService(obj,context);}catch(e){toast(e.message)}},'primary'));
  try{const data=await api('civic');body.append(element('h3','TALENTOS CADASTRADOS'));if(!data.agents.length)body.append(element('p','Nenhum perfil criado.'));for(const a of data.agents)nodeCard(body,a.name,a.role+' · '+a.provider+' · não implica sessão ativa');}catch(e){body.append(element('p',e.message))}
 }
}
