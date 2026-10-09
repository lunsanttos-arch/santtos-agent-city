import {drawPixelAgent} from './sprites.js';
import {renderInterior,renderSpeechBubble} from './interior-world.js';
import {projectIso,unprojectIso,hitIsoObject,renderIsometric,drawActivity} from './isometric.js';
import {openService,showServiceDirectory,openOfficeTeam,openAgentInfo,openStaff} from './institutions.js';
import {PROJECT_ROLES,PLAYER_SKIN,STAFF,roleOf,isWorking,canEnter,hitPerson} from './city-behavior.js';
const $=id=>document.getElementById(id);
const canvas=$('world'),ctx=canvas.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
const TILE=24,W=68,H=52;
const PROVIDER_INFO={codex:{label:'Codex',color:'#74d4ff'},claude:{label:'Claude',color:'#e9a47d'},gemini:{label:'Gemini',color:'#b6a6ff'},ollama:{label:'Ollama',color:'#77eab1'},manus:{label:'Manus',color:'#f8d779'}};
const TOOLS=[['road','🛣️','Rua'],['path','🟨','Caminho'],['grass','🌱','Grama'],['water','💧','Água'],['office','🏢','Prédio'],['house','🏠','Casa'],['tree','🌳','Árvore'],['flower','🌷','Flores'],['lamp','💡','Poste'],['fountain','⛲','Praça']];
let store={world:{objects:[],terrain:[],revision:0},jobs:[],connections:{localCli:[]}},scene='city',editing=false,selectedProject=null,tool='road',selectedObj=null,moveId=null,hover=null,pendingTile=null,drawer=false,painting=false,lastPaint='',busy=false;
const player={x:34.5,y:30.5,facing:'down',walking:false,frame:0};let cityPlayer={x:34.5,y:30.5};const camera={cx:0,cy:0,zoom:1.16,ready:false,follow:true};
const providers={}; // Nunca renderizar agentes fictícios ou slots desconectados.
const jobAvatars=new Map();
let scenePeople=[],departmentState={tasks:{}},playerPath=[];
const patrolAvatars=new Map();
const residentAvatars=new Map(); // Personagem cadastrado existe independentemente da conexão IA.
let githubRepos=[];let toastTimer;let serviceObj=null;let civicState={agents:[],reminders:[]};
function toast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),3300)}
async function api(endpoint,body){const res=await fetch('/api/'+endpoint,{method:body?'POST':'GET',headers:{...(body?{'content-type':'application/json','x-santtos-city':'1'}:{})},body:body?JSON.stringify(body):undefined});const data=await res.json();if(!res.ok)throw Error(data.error||`HTTP ${res.status}`);return data;}
async function refresh(){try{const next=await api('state');const oldRev=store.world.revision;if(!next.world||!Array.isArray(next.world.terrain)||!next.world.terrain.length||!Array.isArray(next.world.objects)||!Array.isArray(next.jobs))throw Error('Mapa inválido recebido do servidor');store=next;updateSceneLabels();civicState=await api('civic');departmentState=await api('civic/departments');updateAgentPick();if(oldRev!==next.world.revision){listProjects();if(selectedProject)drawInspector();}renderJobs();$('manusStatus').textContent=next.connections.manus?'● CONFIGURADO':'○ SEM CHAVE';$('manusStatus').style.color=next.connections.manus?'#82ebb2':'#9f91a6';$('githubTopStatus').textContent=next.connections.github?'GITHUB CONECTADO':'GITHUB NÃO CONECTADO';for(const [id,el] of [['codex','statusCodex'],['claude','statusClaude'],['gemini','statusGemini'],['ollama','statusOllama']]){const connected=id==='ollama'?next.connections.ollama:next.connections.localCli.includes(id);$(el).textContent=connected?(id==='ollama'?'● ONLINE':'● CLI INSTALADO'):'○ OFFLINE';$(el).style.color=connected?'#82ebb2':'#a08ba6'}$('counterBuildings').textContent=String(next.world.objects.filter(x=>x.kind==='office').length).padStart(2,'0')+' PRÉDIOS';$('counterMissions').textContent=String(next.jobs.length).padStart(2,'0')+' MISSÕES';}catch(e){toast('Erro de conexão: '+e.message);}}
const projects=()=>store.world.objects.filter(x=>x.kind==='office');
function chooseProject(p,enter=true){if(enter&&!canEnter(scene==='city'?player:cityPlayer,p)){approachBuilding(p);return;}if(!enter&&scene!=='city'&&p.projectId!==selectedProject){player.x=cityPlayer.x;player.y=cityPlayer.y;scene='city';updateSceneLabels();}if(enter)serviceObj=null;selectedProject=p.projectId;selectedObj=p.id;if(enter){openInspector();if(scene==='city')cityPlayer={x:player.x,y:player.y};player.x=19.5;player.y=12.5;scene='office';editing=false;$('btnEditor').classList.remove('active');$('btnWorld').classList.add('active');$('editorPane').classList.add('hidden');$('inspectorPane').classList.remove('hidden');}
 if(!enter){editing=false;$('editorPane').classList.add('hidden');$('inspectorPane').classList.remove('hidden');openInspector();}
 drawInspector();renderJobs();updateSceneLabels();listProjects();}
function listProjects(){const root=$('projectList');root.replaceChildren();projects().forEach((p,i)=>{const b=document.createElement('button');b.className='project-entry'+(selectedProject===p.projectId?' active':'');const icon=document.createElement('span');icon.className='mini-icon';icon.textContent=['▣','◈','⌘','▤','◎'][i%5];const txt=document.createElement('span');const title=document.createElement('strong');title.textContent=p.name;const sub=document.createElement('small');sub.textContent=`${store.jobs.filter(j=>j.projectId===p.projectId&&j.status==='running').length} AGENTES TRABALHANDO`;if(p.github?.name)sub.textContent=(p.github.name+' · '+sub.textContent);else sub.textContent='SEM REPOSITÓRIO • VINCULE AO GITHUB';txt.append(title,sub);b.append(icon,txt);b.onclick=()=>chooseProject(p,false);root.append(b)});$('projectCount').textContent=String(projects().length).padStart(2,'0')}
function drawInspector(){const p=projects().find(x=>x.projectId===selectedProject);$('projectControls').classList.toggle('hidden',!p);$('missionControls').classList.toggle('hidden',!p);$('infoName').textContent=p?p.name:'Bem-vindo à cidade!';$('infoSubtitle').textContent=p?'Escritório de agentes • Cria missões e acompanha o trabalho em tempo real.':'Clique em um prédio no mapa para entrar no escritório, ou use o modo Construir.';if(p){updateRepoSelect(p.github?.name||'');$('githubHelp').textContent=p.github?.name?`Vinculado a ${p.github.name} (${p.github.branch}). Missões Codex/Claude/Gemini rodam em clone temporário.`:'Clique CONECTAR GITHUB para autorizar sua conta e carregar seus repositórios.';}}
const stat=s=>({pending:'AGUARDANDO',running:'EXECUTANDO',waiting:'PRECISA DE TI',completed:'CONCLUÍDA',failed:'ERRO',cancelled:'CANCELADA'})[s]||s;
function renderJobs(){const root=$('jobList'),jlist=store.jobs.filter(j=>!selectedProject||j.projectId===selectedProject);$('jobCount').textContent=String(jlist.length).padStart(2,'0');root.replaceChildren();if(!jlist.length){const el=document.createElement('p');el.className='empty';el.textContent='Nenhuma missão. Selecione um prédio e crie uma.';root.append(el);return;}
 jlist.forEach(j=>{const card=document.createElement('div');card.className='job';const title=document.createElement('strong');title.textContent=j.prompt.slice(0,100);const meta=document.createElement('div');meta.className='subline';const provider=document.createElement('span');provider.textContent=j.provider.toUpperCase();const status=document.createElement('span');status.className='status '+j.status;status.textContent=stat(j.status);meta.append(provider,status);const phase=document.createElement('small');phase.style.color='#9aa4bb';phase.textContent=' · '+j.phase;card.append(title,meta,phase);const ctrl=document.createElement('div');ctrl.className='controls';if(j.status==='pending'){const b=button('✓ APROVAR',()=>runAction('job/approve',{id:j.id}));b.classList.add('primary');ctrl.append(b);}if(['pending','running','waiting'].includes(j.status))ctrl.append(button('■ CANCELAR',()=>runAction('job/cancel',{id:j.id})));
 const toggle=button(drawer===j.id?'OCULTAR':'LOGS',()=>{drawer=drawer===j.id?null:j.id;renderJobs()});ctrl.append(toggle);
 if(j.remoteUrl&&j.remoteUrl.startsWith('https://')){const b=button('↗ MANUS',()=>window.open(j.remoteUrl,'_blank','noopener,noreferrer'));ctrl.append(b)}
 if(j.status==='completed'&&j.changed&&!j.prUrl)ctrl.append(button('↗ PUBLICAR PR',()=>{if(confirm('Publicar essas alterações em uma branch e criar um Pull Request RASCUNHO no GitHub?'))runAction('job/publish',{id:j.id})}));if(j.prUrl){const link=document.createElement('a');link.href=j.prUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='ABRIR PR';link.className='actionbtn';ctrl.append(link)}card.append(ctrl);if(drawer===j.id){const pre=document.createElement('pre');pre.textContent=j.log||'Sem logs ainda.';card.append(pre);}root.append(card)});
}
function button(text,handler){const b=document.createElement('button');b.className='actionbtn';b.textContent=text;b.onclick=handler;return b;}
async function runAction(ep,body){try{await api(ep,body);await refresh();toast('Alteração salva!')}catch(e){toast(e.message)}}
function makeTools(){const root=$('tools');TOOLS.forEach(([id,emoji,name])=>{const b=document.createElement('button');b.className='tool'+(tool===id?' selected':'');b.dataset.tool=id;const pic=document.createElement('span');pic.className='pict';pic.textContent=emoji;const txt=document.createElement('span');txt.textContent=name;b.append(pic,txt);b.onclick=()=>chooseTool(id);root.append(b)});}
function chooseTool(id){tool=id;moveId=null;$('moveControls').classList.add('hidden');document.querySelectorAll('.tool').forEach(n=>n.classList.toggle('selected',n.dataset.tool===tool));$('editorHelp').textContent=({road:'Pinte ruas arrastando pelo mapa.',house:'Clique num terreno livre para adicionar uma casa.',office:'Clique num espaço livre para cadastrar prédio e projeto.',erase:'Clique sobre algo para apagar.',move:'Clique no prédio, depois na nova posição.',select:'Clique para selecionar uma construção.'})[id]||'Clique no mapa para posicionar este item.';}
function toggleEditor(){editing=!editing;if(editing)openInspector();scene='city';$('btnEditor').classList.toggle('active',editing);$('btnWorld').classList.toggle('active',!editing);$('editorPane').classList.toggle('hidden',!editing);$('inspectorPane').classList.toggle('hidden',editing);updateSceneLabels();}
function updateSceneLabels(){const p=projects().find(x=>x.projectId===selectedProject);$('serviceManage').classList.toggle('hidden',scene!=='service');document.querySelector('.zoom-controls').classList.toggle('hidden',scene!=='city');$('sceneTitle').textContent=scene==='city'?'CIDADE SANTTOS':scene==='service'?(serviceObj?.name||'INSTITUIÇÃO'):scene==='house'?'INTERIOR DA CASA':(p?.name||'ESCRITÓRIO').toUpperCase();$('mapLocation').textContent=scene==='city'?'VILA DOS AGENTES':scene==='service'?'EDIFÍCIO PÚBLICO':scene==='house'?'RESIDÊNCIA':'ESCRITÓRIO '+(p?.name||'');$('currentScene').textContent=scene==='city'?'MAPA 01':'INTERIOR';$('editLabel').textContent=editing?'✎ MODO CONSTRUIR':'● EXPLORANDO';$('editLabel').classList.toggle('edit',editing);$('cursorInfo').textContent=store.world.w+' × '+store.world.h;}
const toIsoScreen=e=>{const r=canvas.getBoundingClientRect();return {x:((e.clientX-r.left)*960/r.width-480)/camera.zoom+camera.cx,y:((e.clientY-r.top)*648/r.height-324)/camera.zoom+camera.cy}};
const tileFromEvent=e=>{const p=toIsoScreen(e);return unprojectIso(p.x,p.y)};
const isometricHit=e=>{const p=toIsoScreen(e);return hitIsoObject(store.world.objects,p.x,p.y)};
const objectAt=(x,y)=>store.world.objects.find(o=>x>=o.x&&x<o.x+o.w&&y>=o.y&&y<o.y+o.h);
function approachBuilding(o){
 if(scene!=='city'){toast('Volte à cidade para chegar à entrada.');return;}
 const choices=[[o.x+Math.floor(o.w/2),o.y+o.h],[o.x+o.w,o.y+Math.floor(o.h/2)],[o.x-1,o.y+Math.floor(o.h/2)],[o.x+Math.floor(o.w/2),o.y-1]];
 const routes=choices.map(([x,y])=>pathTo(player.x,player.y,x,y)).filter(r=>r.length).sort((a,b)=>a.length-b.length);
 playerPath=routes[0]||[];
 toast(playerPath.length?'Caminhando até a entrada. Clique no prédio novamente quando estiver perto.':'Aproxime-se do prédio com WASD para entrar.');
}
function onWorldClick(x,y,e){
 if(e){const point=toIsoScreen(e),person=hitPerson(scenePeople,point.x,point.y);if(person){if(person.staff)openStaff(person.staff,{api,store,toast,projects,chooseProject});else openAgentInfo(person.agent,{api,store,toast,projects,chooseProject,selectAgent});return;}}
 const obj=(e?isometricHit(e):null)||objectAt(x,y);
 if(['service','office','house'].includes(obj?.kind)&&!canEnter(player,obj)){approachBuilding(obj);return;}
 if(obj?.kind==='service'){serviceObj=obj;cityPlayer={x:player.x,y:player.y};playerPath=[];player.x=19.5;player.y=12.5;scene='service';editing=false;updateSceneLabels();toast('Entrou em '+obj.name+'. Clique em um funcionário para ver sua função.');}
 else if(obj?.kind==='office'){playerPath=[];chooseProject(obj,true);}
 else if(obj?.kind==='house'){selectedObj=obj.id;cityPlayer={x:player.x,y:player.y};playerPath=[];player.x=19.5;player.y=12.5;scene='house';player.y=22;editing=false;updateSceneLabels();toast('Entrou na casa: '+(obj.name||'Casa'));}
 else if(obj?.kind==='fountain')toast('Fonte da praça da Prefeitura.');
 else if(!obj){playerPath=pathTo(player.x,player.y,x,y);if(!playerPath.length)toast('Use WASD para andar pela cidade.');}
}
function selectAgent(agent){
 if(!agent)return;selectedProject=agent.projectId||selectedProject;$('provider').value=agent.provider;updateModel();$('agentPick').value=agent.id;openInspector();drawInspector();toast((agent.officeFunction||agent.role)+' selecionado: '+agent.name);
}

async function editAt(x,y){if(busy||!editing||x<0||y<0||x>=W||y>=H)return;const obj=objectAt(x,y);
 if(tool==='select'){selectedObj=obj?.id||null;toast(obj?`${obj.name||obj.kind} selecionado`:'Nenhum objeto nesta posição');return;}
 if(tool==='move'){if(!moveId){if(!obj)return toast('Clique numa construção primeiro');moveId=obj.id;updateMoveControls();toast('Clique no destino ou use X/Y para ajuste fino');return;}try{busy=true;const v=await api('map/edit',{tool:'move',x,y,id:moveId,revision:store.world.revision});store.world=v.world;listProjects();updateMoveControls();toast('Construção movida — ajuste fino disponível');}catch(e){toast(e.message)}finally{busy=false}return;}
 if(['office','house'].includes(tool)){pendingTile={tool,x,y};$('newObjectName').value=tool==='office'?'Novo projeto SanTTos':'Nova casa';$('confirmModal').classList.remove('hidden');$('newObjectName').focus();return;}
 try{busy=true;const v=await api('map/edit',{tool,x,y,revision:store.world.revision});store.world=v.world;listProjects();if(obj?.projectId===selectedProject&&tool==='erase'){selectedProject=null;drawInspector();} }catch(e){if(!painting)toast(e.message)}finally{busy=false;}}
function onCanvasDown(e){if(scene!=='city')return;let pt=tileFromEvent(e);const obj=isometricHit(e);if(editing&&['select','move','erase'].includes(tool)&&obj&&(tool!=='move'||!moveId))pt=tool==='erase'?{x:Math.ceil(obj.x),y:Math.ceil(obj.y)}:{x:obj.x,y:obj.y};hover=pt;if(!editing)return;painting=true;lastPaint=pt.x+','+pt.y;void editAt(pt.x,pt.y)}
function onCanvasMove(e){const pt=tileFromEvent(e);hover=pt;if(scene!=='city'||!editing||!painting||!['road','grass','path','water','erase'].includes(tool))return;const key=pt.x+','+pt.y;if(lastPaint===key||busy)return;lastPaint=key;void editAt(pt.x,pt.y)}
function onCanvasUp(){painting=false;lastPaint=''}
function onCanvasClick(e){
 if(scene==='city'){if(editing)return;const pt=tileFromEvent(e);onWorldClick(pt.x,pt.y,e);return;}
 const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*960/r.width,y=(e.clientY-r.top)*648/r.height;
 const person=hitPerson(scenePeople,x,y);
 if(person){if(person.staff)openStaff(person.staff,{api,store,toast,projects,chooseProject});else openAgentInfo(person.agent,{api,store,toast,projects,chooseProject,selectAgent});return;}
 if(scene==='office'){
  const room=PROJECT_ROLES.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);
  if(room){const agent=civicState.agents.find(a=>a.projectId===selectedProject&&roleOf(a)?.key===room.key);if(agent)selectAgent(agent);else toast(room.label+' — função sem agente designado.');}
 }
}

const keys=new Set();let worldBusyKey=0;
function handleKeyboard(dt){if(!$('serviceModal').classList.contains('hidden'))return;if(editing||document.activeElement&&['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;let dx=0,dy=0;if(keys.has('ArrowUp')||keys.has('w'))dy=-1;if(keys.has('ArrowDown')||keys.has('s'))dy=1;if(keys.has('ArrowLeft')||keys.has('a'))dx=-1;if(keys.has('ArrowRight')||keys.has('d'))dx=1;player.walking=!!(dx||dy);
 if(player.walking)playerPath=[];
 if(!player.walking){
  if(scene==='city'&&playerPath.length){const target=playerPath[0];if(!walkable(Math.floor(target.x),Math.floor(target.y))){playerPath=[];return;}const dist=Math.hypot(target.x-player.x,target.y-player.y),step=Math.min(dist,dt*3.2);player.facing=Math.abs(target.x-player.x)>Math.abs(target.y-player.y)?target.x>player.x?'right':'left':target.y>player.y?'down':'up';if(dist>.01){player.x+=(target.x-player.x)/dist*step;player.y+=(target.y-player.y)/dist*step;}player.frame+=dt*8;player.walking=true;if(dist<.12)playerPath.shift();}
  return;
 }const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;player.facing=dy<0?'up':dy>0?'down':dx<0?'left':'right';const speed=3.2*dt;if(scene==='city'){const nextX=Math.min(W-.4,Math.max(.4,player.x+dx*speed)),nextY=Math.min(H-.4,Math.max(.4,player.y+dy*speed));const blocked=objectAt(Math.floor(nextX),Math.floor(nextY));if(!blocked&&store.world.terrain?.[Math.floor(nextY)]?.[Math.floor(nextX)]!=='water'){player.x=nextX;player.y=nextY;}else if(blocked&&blocked.kind==='office'&&Date.now()-worldBusyKey>1200){worldBusyKey=Date.now();} }else{player.x=Math.max(2,Math.min(38,player.x+dx*speed));player.y=Math.max(2,Math.min(24,player.y+dy*speed));}player.frame+=dt*8;}
function walkProvider(a,target,dt){const delta=Math.hypot(target.x-a.x,target.y-a.y);if(delta<.06)return;const step=Math.min(delta,dt*1.1);const dx=(target.x-a.x)/delta,dy=(target.y-a.y)/delta;a.x+=dx*step;a.y+=dy*step;a.dir=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';a.last+=dt*7;}
function walkable(x,y){return x>=0&&y>=0&&x<W&&y<H&&tq(x,y)!=='water'&&!objectAt(x,y)}
function pathTo(sx,sy,tx,ty){
  const start=[Math.floor(sx),Math.floor(sy)],end=[Math.floor(tx),Math.floor(ty)],queue=[start],visited=new Set([start.join(',')]),prev=new Map();
  if(!walkable(...end))return [];
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i],key=x+','+y;if(x===end[0]&&y===end[1])break;
    for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
      const a=x+dx,b=y+dy,k=a+','+b;
      if(!visited.has(k)&&walkable(a,b)){visited.add(k);prev.set(k,key);queue.push([a,b])}
    }
  }
  const dest=end.join(',');if(!visited.has(dest))return [];
  let p=dest;const result=[];
  while(p!==start.join(',')&&result.length<1200){const [x,y]=p.split(',').map(Number);result.push({x:x+.5,y:y+.5});p=prev.get(p);if(!p)return []}
  return result.reverse();
}
function updateProviders(dt,time){
 const active=store.jobs.filter(j=>j.connected&&(['running','waiting'].includes(j.status)||(j.status==='completed'&&Date.now()-j.updated<300000)));
 for(const [id,a] of Object.entries(providers)){
  const i=Object.keys(providers).indexOf(id),waypoints=[[18,12],[20,12],[22,12],[22,9],[20,9],[18,9],[16,9],[16,12]];
  const idleGoal=waypoints[(Math.floor(time/6500)+i*2)%waypoints.length],tx=idleGoal[0],ty=idleGoal[1];
  const targetKey=tx+','+ty;
  if(a.target!==targetKey){a.target=targetKey;a.path=pathTo(a.x,a.y,tx,ty);}
  if(a.path.length){const next=a.path[0];walkProvider(a,next,dt);if(Math.hypot(next.x-a.x,next.y-a.y)<.11)a.path.shift();}
 }
 for(const j of active){
   if(!jobAvatars.has(j.id))jobAvatars.set(j.id,{id:j.provider,jobAgentId:j.agentId,x:34.5,y:28.5,dir:'down',path:[],target:'',last:0});
   const a=jobAvatars.get(j.id),b=projects().find(p=>p.projectId===j.projectId);
   if(!b)continue;
   const house=store.world.objects.find(o=>o.kind==='house');const resting=j.status==='completed'&&house;const tx=resting?house.x+house.w: b.x+Math.floor(b.w/2),ty=resting?house.y+house.h:b.y+b.h,targetKey=tx+','+ty;
   if(a.target!==targetKey){a.target=targetKey;a.path=pathTo(a.x,a.y,tx,ty);}
   if(a.path.length){const next=a.path[0];walkProvider(a,next,dt);if(Math.hypot(next.x-a.x,next.y-a.y)<.11)a.path.shift();}
 }
 for(const key of jobAvatars.keys())if(!active.some(j=>j.id===key))jobAvatars.delete(key);
 const residents=(civicState.agents||[]).slice(0,70);
 for(const [idx,agent] of residents.entries()){
  if(!residentAvatars.has(agent.id))residentAvatars.set(agent.id,{x:33.5+(idx%5)*.45,y:28.5+Math.floor(idx/5)*.45,dir:'down',path:[],target:'',last:0});
  const avatar=residentAvatars.get(agent.id);
  if(avatar.created===undefined)avatar.created=time;
  if(isWorking(agent.id,store.jobs)){avatar.path=[];avatar.place='office';continue;}
  const phase=Math.floor((time-avatar.created+idx*1100)/20000)%8;
  const home=store.world.objects.filter(o=>o.kind==='house')[idx%Math.max(1,store.world.objects.filter(o=>o.kind==='house').length)];
  avatar.phase=phase;avatar.homeId=home?.id;
  if(phase<2){avatar.path=[];avatar.place=agent.projectId?'office':'service';continue;}
  if(phase>=4&&avatar.place==='house')continue;
  if(avatar.place!=='outside'&&avatar.place!=='returning'){
   const base=projects().find(p=>p.projectId===agent.projectId)||(agent.service&&store.world.objects.find(o=>o.service===agent.service))||home;
   if(base){avatar.x=Math.floor(base.x)+idx%Math.max(1,Math.floor(base.w))+.5;avatar.y=Math.ceil(base.y+base.h)+.5;}
   avatar.target='';avatar.place='outside';
  }
  const activeMission=active.find(j=>j.agentId===agent.id);
  const location=phase>=4&&home?home:activeMission?projects().find(p=>p.projectId===activeMission.projectId):agent.projectId?projects().find(p=>p.projectId===agent.projectId):store.world.objects.find(o=>o.kind==='service'&&o.service===agent.service)||store.world.objects.find(o=>o.kind==='house');
  if(!location)continue;
  // Find accessible tile outside the building. Agents cannot walk through walls.
  let point=null;
  for(const [offX,offY] of [[Math.floor(location.w/2),location.h],[location.w,Math.floor(location.h/2)],[-1,Math.floor(location.h/2)],[Math.floor(location.w/2),-1]]){
   const tx=Math.floor(location.x+offX)+idx%3-1,ty=Math.ceil(location.y+offY);if(walkable(tx,ty)){point={x:tx,y:ty};break;}
  }
  if(!point)continue;
  if(phase===2||phase===3){const offset=Math.floor((time-avatar.created)/20000),tx=2+(idx*7+offset*11)%64,ty=[16,32,33][idx%3];if(walkable(tx,ty))point={x:tx,y:ty};}
  const key=point.x+','+point.y;
  if(avatar.target!==key){avatar.target=key;avatar.path=pathTo(avatar.x,avatar.y,point.x,point.y)}
  if(avatar.path.length){const next=avatar.path[0];walkProvider(avatar,next,dt);if(Math.hypot(next.x-avatar.x,next.y-avatar.y)<.11)avatar.path.shift();}
  if(phase>=4&&!avatar.path.length&&Math.hypot(avatar.x-(point.x+.5),avatar.y-(point.y+.5))<1){avatar.place='house';}
 }
 for(const id of residentAvatars.keys())if(!residents.some(a=>a.id===id))residentAvatars.delete(id);
 const patrol=STAFF.filter(a=>a.id.endsWith('-officer'));
 for(const [i,officer] of patrol.entries()){
  if(departmentState.tasks.police?.busy){patrolAvatars.delete(officer.id);continue;}
  const station=store.world.objects.find(o=>o.service==='police');if(!station)continue;
  if(!patrolAvatars.has(officer.id))patrolAvatars.set(officer.id,{x:station.x+station.w/2,y:station.y+station.h+.5,dir:'down',last:0,path:[],target:'',waypoint:i});
  const avatar=patrolAvatars.get(officer.id),points=[[42,32],[59,32],[59,16],[42,16]],goal=points[avatar.waypoint%points.length];
  if(!avatar.path.length){const key=goal.join(',');if(avatar.target===key)avatar.waypoint++;const next=points[avatar.waypoint%points.length];avatar.target=next.join(',');avatar.path=pathTo(avatar.x,avatar.y,...next);}
  if(avatar.path.length){walkProvider(avatar,avatar.path[0],dt);if(Math.hypot(avatar.x-avatar.path[0].x,avatar.y-avatar.path[0].y)<.11)avatar.path.shift();}
 }

}
function pixel(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function outline(x,y,w,h,c='#3c5364',th=2){pixel(x,y,w,th,c);pixel(x,y+h-th,w,th,c);pixel(x,y,th,h,c);pixel(x+w-th,y,th,h,c)}
function line(x1,y1,x2,y2,c,w=2){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(Math.round(x1),Math.round(y1));ctx.lineTo(Math.round(x2),Math.round(y2));ctx.stroke();}
function label(text,x,y,fg='#fff',bg='#342845',font='bold 11px monospace'){ctx.font=font;const width=Math.ceil(ctx.measureText(text).width)+13;pixel(x-width/2-2,y-14,width+4,18,'#242339');pixel(x-width/2,y-12,width,14,bg);ctx.fillStyle=fg;ctx.textAlign='center';ctx.fillText(text,x,y-2)}
function grass(x,y,ix,iy){const seed=(ix*63+iy*31)%9;pixel(x,y,TILE,TILE,seed%2===0?'#91ce75':'#93d37a');pixel(x,y+TILE-3,TILE,3,'#8ac86d');if(seed===2||seed===5){pixel(x+4,y+6,2,4,'#61af5b');pixel(x+7,y+8,2,2,'#66b261');pixel(x+18,y+15,2,3,'#6db75b');}if(seed===8){pixel(x+15,y+8,3,3,'#f5e5a9');pixel(x+14,y+7,2,2,'#fff3c5')}}
function drawTerrain(){const terrain=store.world.terrain;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const X=x*TILE,Y=y*TILE,t=terrain?.[y]?.[x]||'grass';if(t==='grass')grass(X,Y,x,y);else if(t==='road'){pixel(X,Y,24,24,'#596878');pixel(X+1,Y+1,22,22,(x+y)%3?'#566476':'#5c6a7c');const n=tq(x,y-1),s=tq(x,y+1),e=tq(x+1,y),w=tq(x-1,y);if(n!=='road'){pixel(X,Y,24,3,'#ced6bd');pixel(X,Y+3,24,2,'#a7b3a3')}if(s!=='road'){pixel(X,Y+21,24,3,'#d6dfc9');pixel(X,Y+19,24,2,'#9cabaa')}if(e!=='road'){pixel(X+21,Y,3,24,'#cbd3bc');pixel(X+19,Y,2,24,'#9baaab')}if(w!=='road'){pixel(X,Y,3,24,'#cbd3bc');pixel(X+3,Y,2,24,'#9baaab')}if(n==='road'&&s==='road'&&(y%3===0))pixel(X+10,Y+8,4,8,'#f9e8ab');if(e==='road'&&w==='road'&&(x%3===0))pixel(X+8,Y+10,8,4,'#f9e8ab');}else if(t==='path'){pixel(X,Y,24,24,(x+y)%2?'#e8d4ae':'#e2c99e');pixel(X+1,Y+1,23,1,'#f5e6bb');if((x+y)%3===0)pixel(X+12,Y+7,5,2,'#c4ad88');}else if(t==='water'){pixel(X,Y,24,24,'#63b7d7');pixel(X,Y+20,24,4,'#469bc6');pixel(X+3+(x+y)%7,Y+7,9,2,'#a8e9f3');pixel(X+13,Y+14,7,2,'#7cd6ed')}}}
function tq(x,y){return store.world.terrain?.[y]?.[x]}
function drawTree(x,y,s=1){pixel(x+9*s,y+26*s,7*s,12*s,'#855739');pixel(x+4*s,y+12*s,18*s,19*s,'#357d54');pixel(x+2*s,y+17*s,22*s,12*s,'#246448');pixel(x+7*s,y+6*s,12*s,22*s,'#499a5a');pixel(x+7*s,y+8*s,7*s,6*s,'#6fb86a');pixel(x+11*s,y+3*s,7*s,7*s,'#5eae64');pixel(x+18*s,y+18*s,6*s,8*s,'#357d54')}
function drawBuilding(o){const x=o.x*TILE,y=o.y*TILE,w=o.w*TILE,h=o.h*TILE;
 pixel(x+2,y+h-9,w-1,11,'#6a9565');pixel(x+4,y+18,w-8,h-23,'#fff3d4');outline(x+4,y+18,w-8,h-23,'#b78a76',3);
 pixel(x+1,y+9,w-2,15,o.theme==='tv'?'#6d5baa':o.theme==='radar'?'#376a8c':o.theme==='chat'?'#ba6b76':'#815e9f');pixel(x+7,y+4,w-14,12,o.theme==='radar'?'#8ed0df':'#ab8fdd');pixel(x+15,y+1,w-30,8,'#d9c8e9');pixel(x+1,y+23,w-2,3,'#5b526b');
 for(let i=0;i<3;i++){const a=x+15+i*35;if(a+17<x+w-4){pixel(a,y+35,18,18,'#765d70');pixel(a+3,y+38,12,11,'#7dccd6');pixel(a+5,y+40,5,3,'#e7fff1');pixel(a+3,y+49,12,3,'#aac3be');}}
 pixel(x+w/2-13,y+h-36,26,30,'#7c5b82');pixel(x+w/2-9,y+h-32,18,26,'#afc7cb');pixel(x+w/2+4,y+h-21,3,3,'#dfeddb');pixel(x+w/2-16,y+h-7,32,3,'#b8a58e');
 pixel(x+w-20,y+17,11,12,'#fff0bd');pixel(x+w-18,y+20,7,8,'#a5d1c9');
 pixel(x+w/2-26,y-17,52,15,'#2d2947');pixel(x+w/2-23,y-14,46,10,o.theme==='radar'?'#7d8bdb':'#a46be2');ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 9px monospace';ctx.fillText('SANTTOS',x+w/2,y-6);
 const n=store.jobs.filter(j=>j.projectId===o.projectId&&j.status==='running').length;
 label((o.name||'PROJETO').replace(/^SanTTos /,'').slice(0,19).toUpperCase(),x+w/2,y+h+5,n?'#f7e3ae':'#ffffff',n?'#4a4f88':'#353450','bold 11px monospace');if(n){pixel(x+w-9,y+31,7,7,'#77f2ac')}}
function drawHouse(o){const x=o.x*TILE,y=o.y*TILE;pixel(x+2,y+27,69,46,'#f2e4ba');outline(x+4,y+27,65,44,'#b9a38b',3);pixel(x,y+21,72,13,'#a95255');pixel(x+4,y+14,64,14,'#db7175');pixel(x+11,y+7,50,14,'#d87b7e');pixel(x+19,y+2,33,10,'#f39991');pixel(x+47,y+1,13,12,'#c9a69d');pixel(x+47,y-3,13,6,'#9d6e74');pixel(x+10,y+40,16,17,'#825b62');pixel(x+13,y+43,10,11,'#cde5d3');pixel(x+45,y+40,15,17,'#825b62');pixel(x+48,y+43,9,11,'#cde5d3');pixel(x+29,y+47,15,23,'#a76f74');pixel(x+33,y+56,3,3,'#f4d9a6');}
function drawFountain(o){let x=o.x*TILE,y=o.y*TILE;pixel(x+3,y+20,68,50,'#d9caa6');pixel(x+8,y+26,58,40,'#d6f1ed');pixel(x+14,y+32,46,29,'#6bc4df');pixel(x+23,y+40,29,16,'#4d97c8');pixel(x+32,y+12,10,31,'#ece2ce');pixel(x+29,y+11,16,7,'#ece2ce');pixel(x+35,y+4,4,12,'#97e7e8');pixel(x+20,y+23,4,10,'#8cdce6');pixel(x+50,y+21,3,9,'#8cdce6');}
function drawDecor(o){const x=o.x*TILE,y=o.y*TILE;if(o.kind==='tree'){drawTree(x-3,y-14,1);}else if(o.kind==='flower'){pixel(x+10,y+10,3,12,'#427d4f');pixel(x+4,y+7,8,6,'#f888ad');pixel(x+10,y+3,7,6,'#f5dc8e');pixel(x+15,y+9,8,6,'#d8a3ff')}else if(o.kind==='lamp'){pixel(x+11,y+2,3,20,'#57637c');pixel(x+7,y-3,10,10,'#fff2c8');pixel(x+9,y-1,6,6,'#fffaa9')}else if(o.kind==='house')drawHouse(o);else if(o.kind==='office')drawBuilding(o);else if(o.kind==='fountain')drawFountain(o)}
function legacyDrawPerson(cx,cy,color,dir='down',walk=0,scale=1){const x=Math.round(cx),y=Math.round(cy);const u=scale;pixel(x-8*u,y+9*u,16*u,4*u,'#3b4b5966');pixel(x-5*u,y-5*u,10*u,5*u,'#3d2d45');pixel(x-6*u,y-3*u,12*u,8*u,'#e8b48e');if(dir==='up')pixel(x-5*u,y-2*u,10*u,5*u,'#55394e');else{pixel(x-4*u,y,2*u,2*u,'#3d3546');pixel(x+2*u,y,2*u,2*u,'#3d3546')}
 pixel(x-6*u,y+5*u,12*u,11*u,color);pixel(x-9*u,y+6*u,3*u,7*u,'#ecb48e');pixel(x+6*u,y+6*u,3*u,7*u,'#ecb48e');const step=Math.floor(walk)%2;if(step===0){pixel(x-5*u,y+16*u,4*u,7*u,'#383658');pixel(x+1*u,y+16*u,4*u,7*u,'#353753')}else{pixel(x-6*u,y+16*u,4*u,7*u,'#383658');pixel(x+3*u,y+14*u,4*u,8*u,'#353753')}pixel(x-7*u,y+19*u,5*u,3*u,'#292437');pixel(x+1*u,y+19*u,6*u,3*u,'#292437');}
function drawPerson(cx,cy,color,dir='down',walk=0,scale=1){drawPixelAgent(ctx,cx,cy,typeof color==='object'?color:{outfit:color},dir,walk,scale);}
function drawWorld(time){
 scenePeople=[];
 const center=projectIso(player.x,player.y);
 if(!camera.ready){camera.cx=center.x;camera.cy=center.y;camera.ready=true;}
 if(camera.follow){camera.cx+=(center.x-camera.cx)*.055;camera.cy+=(center.y-camera.cy)*.055;}
 ctx.fillStyle='#78b66e';ctx.fillRect(0,0,960,648);
 ctx.save();ctx.translate(480,324);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.cx,-camera.cy);
 try{renderIsometric(ctx,{terrain:store.world.terrain,objects:store.world.objects,jobs:store.jobs,avatars:[
  ...[...residentAvatars].filter(([id])=>residentAvatars.get(id)?.place==='outside'&&!isWorking(id,store.jobs)).map(([id,a])=>{const resident=civicState.agents?.find(v=>v.id===id);return {...a,agent:resident,resident:true,name:resident?.name||'Agente',color:resident?.skin||'#d5c2ff',frame:a.path.length?a.last:0,moving:!!a.path.length,working:store.jobs.some(j=>j.agentId===id&&j.connected&&['running','waiting'].includes(j.status))}}),
  ...[...jobAvatars].map(([id,a])=>({...a,job:store.jobs.find(j=>j.id===id),color:PROVIDER_INFO[a.id]?.color||'#d5c2ff',frame:a.last})).filter(a=>a.job&&!a.job.agentId&&!['running','waiting'].includes(a.job.status)),
 ...[...patrolAvatars].map(([id,a])=>{const staff=STAFF.find(s=>s.id===id);return {...a,resident:true,staff,name:staff.name,color:{spriteIndex:staff.sprite},frame:a.path.length?a.last:0,moving:!!a.path.length}})
 ],player,hover,editing,tool,time,drawPerson,camera,playerSkin:PLAYER_SKIN,onPerson:p=>scenePeople.push(p)});}finally{ctx.restore();}
 ctx.fillStyle='#1c2c2bc9';ctx.fillRect(710,600,220,28);ctx.fillStyle='#fffbe6';ctx.font='bold 12px monospace';ctx.textAlign='center';
 ctx.fillText(store.jobs.filter(j=>j.connected&&['running','waiting'].includes(j.status)).length+' AGENTES ATIVOS',820,619);
}
function floor(x,y,w,h,a,b){pixel(x,y,w,h,a);for(let xx=x;xx<x+w;xx+=24)for(let yy=y;yy<y+h;yy+=24)if((Math.floor((xx-x)/24)+Math.floor((yy-y)/24))%2===0)pixel(xx+2,yy+2,20,20,b);outline(x,y,w,h,'#575a78',5)}
function desk(x,y,accent='#79cfff'){pixel(x-46,y-17,92,16,'#665071');pixel(x-44,y-20,89,9,'#bf9876');pixel(x-25,y-35,50,19,'#232b4b');pixel(x-22,y-32,44,13,accent);pixel(x-14,y-29,25,3,'#dff0ff');pixel(x-17,y-7,35,7,'#e8d2bb');pixel(x-12,y+2,25,19,'#5e5a86');pixel(x-9,y+12,19,12,'#414c76');}
function plant(x,y){pixel(x-8,y,18,12,'#ad7970');pixel(x-5,y+3,12,4,'#734f53');pixel(x-11,y-9,22,13,'#3e9665');pixel(x-6,y-19,13,18,'#58b87a');pixel(x+4,y-13,12,14,'#378558');}
function bookshelf(x,y){pixel(x,y,80,13,'#8d6d7d');pixel(x,y+10,80,6,'#4f425b');for(let i=0;i<10;i++)pixel(x+3+i*8,y+2,5,9,['#adc6f4','#d2a3bd','#ffdf89','#bb9edb'][i%4]);}
function room(x,y,w,h,name,shade,theme){floor(x,y,w,h,shade,theme);pixel(x+10,y+13,w-20,26,'#ece9e2');pixel(x+12,y+15,w-24,22,'#f6eecb');label(name,x+w/2,y+21,'#f9f5ff','#444057','bold 11px monospace');plant(x+24,y+h-35);plant(x+w-24,y+h-40);}
function drawOffice(time){
 scenePeople=[];pixel(0,0,960,648,'#23364a');
 for(const r of PROJECT_ROLES){
  const colors={manager:['#ead8bd','#f3e7d3'],code:['#d2e2ee','#e5eef4'],qa:['#dfd6ee','#eee5f6'],tester:['#e6dbc2','#f5ecd4'],ux:['#ead5e0','#f9e9f0'],assistant:['#d3e3d9','#e6f3ec']};
  room(r.x,r.y,r.w,r.h,r.label.toUpperCase()+(r.key==='manager'?' • AGENTE':' • SUBAGENTE'),...colors[r.key]);
  desk(r.x+r.w/2,r.y+115,['#e7bf72','#76bbdf','#b5a0df','#edbb77','#e8a5be','#7bbca8'][PROJECT_ROLES.indexOf(r)]);
  const assigned=civicState.agents.filter(a=>(a.projectId===selectedProject||store.jobs.some(j=>j.agentId===a.id&&j.projectId===selectedProject&&['running','waiting'].includes(j.status)))&&(roleOf(a)?.key||'assistant')===r.key).slice(0,3);
  if(!assigned.length)label('SEM AGENTE DESIGNADO',r.x+r.w/2,r.y+175,'#eef','#546074','bold 9px monospace');
  assigned.filter(agent=>!residentAvatars.get(agent.id)||residentAvatars.get(agent.id).place==='office'||isWorking(agent.id,store.jobs)).forEach((agent,i)=>{const walking=residentAvatars.get(agent.id)?.phase===1&&!isWorking(agent.id,store.jobs);const x=r.x+r.w/2+(i-(assigned.length-1)/2)*60+(walking?Math.sin(time/2200)*55:0),y=r.y+163+(walking?Math.cos(time/2400)*23:0),working=isWorking(agent.id,store.jobs);drawPerson(x,y,agent.skin,'down',working||walking?time/700:0,1.25);scenePeople.push({x,y,agent});label(agent.name.toUpperCase(),x,y-36,'#fff7de','#4b6274','bold 8px monospace');drawActivity(ctx,x,y-59,working?'work':walking?'walk':'rest');});
 }
 pixel(30,282,900,60,'#dacbb3');label('CLIQUE NO PERSONAGEM PARA VER SUA FUNÇÃO • ESC PARA SAIR',480,326,'#fff','#5b587c','bold 10px monospace');
 const p=projects().find(o=>o.projectId===selectedProject);label((p?.name||'ESCRITÓRIO').toUpperCase()+' • EQUIPE DO PROJETO',480,36,'#fff','#413354','bold 12px monospace');
 // Missions without a profile also remain inside, in the Código room.
 store.jobs.filter(j=>j.projectId===selectedProject&&!j.agentId&&['running','waiting'].includes(j.status)).slice(0,3).forEach((j,i)=>drawPerson(440+i*45,228,{spriteIndex:10},'down',time/700,1.1));
 drawPerson(player.x*TILE,player.y*TILE-10,PLAYER_SKIN,player.facing,player.walking?player.frame:0,1.2);
}

function drawServiceInterior(time){scenePeople=[];renderInterior(ctx,{tasks:departmentState.tasks,onActor:a=>scenePeople.push(a),service:serviceObj?.service,world:store.world,jobs:store.jobs,civic:{...civicState,agents:civicState.agents.filter(a=>!residentAvatars.get(a.id)||residentAvatars.get(a.id).place==='service')},time,drawAgent:drawPerson,onBubble:renderSpeechBubble});drawPerson(player.x*TILE,player.y*TILE-10,PLAYER_SKIN,player.facing,player.walking?player.frame:0,1.2);}
function drawResidence(time){
 scenePeople=[];pixel(0,0,960,648,'#263c45');floor(50,100,860,487,'#d4ae79','#dfbd8a');
 // Three rooms with an open corridor, raised walls and original handheld-style furniture.
 pixel(50,55,860,65,'#829e8d');pixel(58,63,844,40,'#d8ecd1');pixel(50,113,860,9,'#5f775e');
 for(const x of [125,445,780]){pixel(x,68,72,40,'#526b6c');pixel(x+5,73,62,28,'#9ee0e7');pixel(x+35,73,4,28,'#edf7dc');pixel(x-6,68,10,39,'#e5ac8d');pixel(x+68,68,10,39,'#e5ac8d');}
 pixel(352,122,8,240,'#8b7155');pixel(641,122,8,240,'#8b7155');pixel(50,355,230,8,'#8b7155');pixel(740,355,170,8,'#8b7155');
 for(let row=0;row<18;row++){const y=125+row*25;pixel(58,y,844,1,'#bb9566');for(let col=0;col<7;col++){const x=60+col*126+(row%2)*59;if(x<895){pixel(x,y,1,24,'#bd986a');pixel(x+13,y+10,30,1,'#d8b780');}}}
 // Bedroom: quilt, pillow, bedside cabinet and wardrobe.
 pixel(82,147,140,193,'#705449');pixel(91,154,121,177,'#f8e8cb');pixel(98,163,108,32,'#fff9e5');pixel(92,208,120,121,'#79adb0');for(let y=217;y<328;y+=22)pixel(96,y,112,3,'#afdad1');for(let y=220;y<318;y+=26)for(let x=102;x<204;x+=26)pixel(x,y,18,16,(x+y)%52?'#83bdba':'#94c7bc');pixel(253,151,70,105,'#856446');pixel(259,158,57,90,'#bb915c');pixel(285,162,3,81,'#73563c');plant(284,308);
 // Sitting room: TV, books, checked carpet, sofa and tea table.
 floor(389,234,216,105,'#7caf9d','#a7d1b2');pixel(395,153,202,57,'#618879');pixel(405,157,181,42,'#b6d1a5');pixel(395,204,202,14,'#3f665b');for(let x=413;x<586;x+=58){pixel(x,163,48,27,'#d3e2bb');pixel(x,192,48,12,'#92bca2');}pixel(398,169,8,36,'#446f60');pixel(586,169,8,36,'#446f60');pixel(434,251,120,57,'#8d6647');pixel(440,255,107,43,'#dcb27c');pixel(457,265,25,17,'#f3f0d3');pixel(495,269,16,10,'#eaa785');bookshelf(386,126);
 // Kitchen: tiled floor, counter, sink, hob, fridge and dining stools.
 floor(672,126,221,220,'#e5dec7','#f1ebd8');pixel(677,132,150,64,'#967553');pixel(681,136,143,42,'#f1e2b5');pixel(690,142,49,29,'#657f87');pixel(697,147,35,18,'#abdbe1');pixel(762,141,47,30,'#52586a');for(const x of [770,792])for(const y of [146,161])pixel(x,y,10,8,'#d5c5ac');pixel(840,134,43,110,'#88a8a0');pixel(845,139,32,99,'#e5ecd8');pixel(845,178,32,5,'#688c85');pixel(870,156,3,14,'#6b8f88');pixel(870,193,3,27,'#6b8f88');pixel(706,268,122,61,'#aa8255');pixel(711,272,112,46,'#edd095');pixel(733,252,28,20,'#698e89');pixel(787,331,28,20,'#698e89');
 // Entrance and small study.
 floor(396,445,170,110,'#cd998c','#e4b9a0');outline(405,454,151,91,'#e8c49b',3);for(let x=416;x<551;x+=20){pixel(x,461,9,7,'#ae7b74');pixel(x,530,9,7,'#ae7b74');}pixel(466,481,28,28,'#e6c09f');pixel(473,488,14,14,'#b48077');desk(186,465,'#8fe4d3');plant(112,526);bookshelf(660,421);pixel(687,449,33,40,'#96714f');pixel(733,450,37,18,'#ba9568');pixel(852,405,20,26,'#8b7659');pixel(856,409,12,18,'#b8dacc');plant(838,525);pixel(449,573,62,14,'#705848');
 label('CASA • SAN✦TTOS',480,43,'#fff','#4e6b66','bold 15px monospace');
 civicState.agents.filter(a=>residentAvatars.get(a.id)?.place==='house'&&residentAvatars.get(a.id)?.homeId===selectedObj&&!isWorking(a.id,store.jobs)).slice(0,3).forEach((agent,i)=>{const x=432+i*55,y=216;drawPerson(x,y,agent.skin,'down',0,1.1);scenePeople.push({x,y,agent});label(agent.name,x,y-36,'#fff','#4e6b66','bold 8px monospace');drawActivity(ctx,x,y-57,'rest');});
 drawPerson(player.x*TILE,player.y*TILE-10,PLAYER_SKIN,player.facing,player.walking?player.frame:0,1.2);
}
let previous=performance.now(),lastRenderError='';
function frame(time){
 const dt=Math.min(.055,(time-previous)/1000);previous=time;
 try{
  handleKeyboard(dt);updateProviders(dt,time);
  if(scene==='city')drawWorld(time);else if(scene==='office')drawOffice(time);else if(scene==='service')drawServiceInterior(time);else drawResidence(time);
  lastRenderError='';
 }catch(e){
  console.error('Falha ao desenhar a cidade:',e);
  if(lastRenderError!==e.message){toast('Falha ao desenhar a cidade: '+e.message+' — abra F12 para detalhes.');lastRenderError=e.message;}
 }finally{requestAnimationFrame(frame);}
}
function updateAgentPick(){const el=$('agentPick');if(!el)return;const value=el.value;el.replaceChildren(new Option('Agente do provedor (sem perfil)',''));(civicState.agents||[]).filter(a=>a.provider===$('provider').value&&(!a.projectId||a.projectId===selectedProject)).forEach(a=>el.add(new Option(a.name+' · '+(a.officeFunction||a.role),a.id)));if([...el.options].some(o=>o.value===value))el.value=value;}
function updateModel(){$('modelRow').classList.toggle('hidden',$('provider').value!=='ollama');updateAgentPick();}
$('btnWorld').onclick=()=>{hidePanels();serviceObj=null;if(scene!=='city'){player.x=cityPlayer.x;player.y=cityPlayer.y;}scene='city';playerPath=[];editing=false;$('btnEditor').classList.remove('active');$('btnWorld').classList.add('active');$('editorPane').classList.add('hidden');$('inspectorPane').classList.remove('hidden');updateSceneLabels()};
$('btnEditor').onclick=toggleEditor;
$('btnProjects').onclick=()=>{hidePanels();document.querySelector('.left-panel').classList.add('open')};
$('btnManagement').onclick=()=>{openInspector();drawInspector();renderJobs()};
$('btnServices').onclick=()=>showServiceDirectory(store.world.objects,{api,store,toast,projects,chooseProject});
$('serviceManage').onclick=()=>{if(serviceObj)openService(serviceObj,{api,store,toast,projects,chooseProject})};
const teamButton=button('♙ EQUIPE DO ESCRITÓRIO',()=>{const project=projects().find(p=>p.projectId===selectedProject);if(project)openOfficeTeam(project,{api,store,toast,projects,chooseProject,selectAgent})});teamButton.classList.add('primary','full');$('projectControls').append(teamButton);
$('closeService').onclick=()=>{ $('serviceModal').classList.add('hidden') };
$('serviceModal').addEventListener('click',e=>{if(e.target===$('serviceModal'))$('closeService').click()});
document.querySelectorAll('.panel-close').forEach(el=>el.onclick=hidePanels);
function hidePanels(){document.querySelector('.right-panel').classList.remove('open');document.querySelector('.left-panel').classList.remove('open')}
function openInspector(){hidePanels();document.querySelector('.right-panel').classList.add('open')}
canvas.addEventListener('wheel',e=>{if(scene!=='city')return;e.preventDefault();setZoom(camera.zoom*(e.deltaY<0?1.11:.90));},{passive:false});

function setZoom(value){camera.zoom=Math.max(.25,Math.min(2.4,value));$('zoomValue').textContent=Math.round(camera.zoom*100)+'%';}
$('zoomOut').onclick=()=>setZoom(camera.zoom*.8);
$('zoomIn').onclick=()=>setZoom(camera.zoom*1.25);
$('zoomMap').onclick=()=>{camera.follow=false;const center=projectIso(W/2,H/2);camera.cx=center.x;camera.cy=center.y-40;camera.ready=true;setZoom(.4);};
$('zoomPlayer').onclick=()=>{camera.follow=true;setZoom(1.16);};
function updateMoveControls(){const obj=store.world.objects.find(o=>o.id===moveId);$('moveControls').classList.toggle('hidden',!obj);if(obj)$('movePosition').textContent=obj.name+': X '+obj.x+' / Y '+obj.y;}
$('finishMove').onclick=()=>{moveId=null;updateMoveControls();};
document.querySelectorAll('[data-nudge]').forEach(button=>button.onclick=()=>{const obj=store.world.objects.find(o=>o.id===moveId);if(!obj)return;const [dx,dy]=button.dataset.nudge.split(',').map(Number);void editAt(obj.x+dx,obj.y+dy);});
$('toolSelect').onclick=()=>chooseTool('select');$('toolMove').onclick=()=>chooseTool('move');$('toolErase').onclick=()=>chooseTool('erase');
$('cancelAdd').onclick=()=>{$('confirmModal').classList.add('hidden');pendingTile=null};
$('confirmAdd').onclick=async()=>{if(!pendingTile)return;const {tool,x,y}=pendingTile;const name=$('newObjectName').value;pendingTile=null;$('confirmModal').classList.add('hidden');try{const v=await api('map/edit',{tool,x,y,name,revision:store.world.revision});store.world=v.world;listProjects();toast(tool==='house'?'Casa construída!':'Prédio criado — pronto para receber um projeto!');}catch(e){toast(e.message)}};
function updateRepoSelect(value=''){const el=$('projectRepo');el.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=githubRepos.length?'Escolha um repositório':'Nenhum repositório carregado';el.append(placeholder);for(const r of githubRepos){const o=document.createElement('option');o.value=r.name;o.textContent=r.name+(r.private?' 🔒':'');el.append(o)}if(value&&!githubRepos.some(r=>r.name===value)){const option=document.createElement('option');option.value=value;option.textContent=value+' (vinculado)';el.append(option)}el.value=value;}
async function refreshGithubRepos(){try{const data=await api('github/repos');githubRepos=data.repos;updateRepoSelect(projects().find(p=>p.projectId===selectedProject)?.github?.name||'');$('githubHelp').textContent=githubRepos.length?`Encontrados ${githubRepos.length} repositórios no GitHub. Selecione e clique VINCULAR.`:'Nenhum repositório encontrado na conta autenticada.';}catch(e){$('githubHelp').textContent='Instale o GitHub CLI e rode no PowerShell: gh auth login. '+e.message;}}
let githubPoll=null;
async function pollGithub(){try{const state=await api('github/status');const el=$('githubLogin');el.replaceChildren();if(state.authenticated){el.textContent='GitHub conectado.';clearInterval(githubPoll);githubPoll=null;await refreshGithubRepos();return;}if(state.code){el.append(document.createTextNode('Código: '+state.code+' — '));const link=document.createElement('a');link.href=state.url;link.target='_blank';link.rel='noopener';link.textContent='Autorizar no GitHub';el.append(link);}else el.textContent=state.error||'Aguardando autorização no GitHub…';if(!state.pending){clearInterval(githubPoll);githubPoll=null;}}catch(e){$('githubLogin').textContent=e.message;clearInterval(githubPoll);githubPoll=null;}}
$('connectGithub').onclick=async()=>{try{await api('github/connect',{});if(!githubPoll)githubPoll=setInterval(pollGithub,1500);await pollGithub();}catch(e){$('githubLogin').textContent=e.message;}};
$('reloadRepos').onclick=refreshGithubRepos;
$('saveRepo').onclick=async()=>{if(!selectedProject)return;const repo=$('projectRepo').value;if(!repo)return toast('Escolha um repositório no GitHub');await runAction('project',{id:selectedProject,github:repo});drawInspector()};
$('createMission').onclick=async()=>{if(!selectedProject)return;const provider=$('provider').value,prompt=$('prompt').value,model=$('model').value,agentId=$('agentPick').value;if(prompt.trim().length<4)return toast('Descreva uma missão primeiro');try{await api('job',{projectId:selectedProject,provider,prompt,model,agentId});$('prompt').value='';await refresh();toast('Missão criada: aprove antes de executar!');}catch(e){toast(e.message)}};
$('provider').onchange=updateModel;
canvas.onpointerdown=onCanvasDown;canvas.onpointermove=onCanvasMove;window.addEventListener('pointerup',onCanvasUp);canvas.onclick=onCanvasClick;
window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('serviceModal').classList.contains('hidden')){$('closeService').click();return;}hidePanels();if(!$('confirmModal').classList.contains('hidden')){$('cancelAdd').click();return;}if(scene!=='city'){$('btnWorld').click();return;}}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName||'')){e.preventDefault();keys.add(e.key)}});
window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());
async function boot(){makeTools();updateModel();drawInspector();updateSceneLabels();await refresh();void refreshGithubRepos();requestAnimationFrame(frame);setInterval(refresh,1700)}boot();
