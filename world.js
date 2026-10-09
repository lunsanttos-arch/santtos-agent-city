'use strict';
const {randomUUID}=require('node:crypto');
const W=68,H=52;
const serviceDefs=[
  ['cityhall','PREFEITURA',28,19,8,6],
  ['library','BIBLIOTECA',5,19,7,5],
  ['university','UNIVERSIDADE',6,4,8,6],
  ['police','POLÍCIA',48,20,7,5],
  ['talents','AGÊNCIA DE TALENTOS',49,4,9,6]
];
const projects=[
  ['SanTTos Playout','playout',22,4,'tv'],
  ['SanTTos Radar','radar',31,4,'radar'],
  ['SanTTos Redação','redacao',23,39,'office'],
  ['SanTTos Signage','signage',32,39,'media'],
  ['SanTTos Chatbox','chatbox',47,38,'chat'],
];
function createWorld(){
  const terrain=Array.from({length:H},()=>Array(W).fill('grass'));
  for(const y of [15,16,32,33])for(let x=0;x<W;x++)terrain[y][x]='road';
  for(const x of [17,18,40,41,60,61])for(let y=0;y<H;y++)terrain[y][x]='road';
  for(let y=26;y<31;y++)for(let x=26;x<39;x++)terrain[y][x]='path';
  const objects=projects.map(([name,projectId,x,y,theme])=>({id:randomUUID(),kind:'office',name,projectId,x,y,w:6,h:5,theme,github:null}));
  for(const [service,name,x,y,w,h] of serviceDefs)objects.push({id:randomUUID(),kind:'service',service,name,x,y,w,h});
  const extras=[
    [31,27,'fountain',3,3],
    [4,37,'house',4,4],[10,37,'house',4,4],[4,45,'house',4,4],[11,45,'house',4,4],
    [48,45,'house',4,4],[54,45,'house',4,4],[56,27,'house',4,4],
  ];
  for(const [x,y,kind,w,h] of extras)objects.push({id:randomUUID(),kind,name:kind==='house'?'Casa disponível':'Praça',x,y,w,h});
  const treeCoords=[[2,2],[15,3],[43,4],[64,4],[3,14],[13,13],[25,12],[37,12],[47,13],[57,13],[65,13],[3,29],[12,29],[23,25],[44,27],[63,29],[2,49],[19,48],[38,47],[64,47]];
  for(const [x,y] of treeCoords)objects.push({id:randomUUID(),kind:'tree',x,y,w:1,h:1});
  return {version:4,revision:1,w:W,h:H,terrain,objects};
}
function validCoord(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<W&&y<H;}
function intersects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
const protectedServices=new Set(['cityhall','library','university','police','talents']);
function editWorld(world,payload){
  if(!payload||typeof payload!=='object')throw new Error('Edição inválida');
  if(payload.revision!==world.revision)throw new Error('Mapa foi alterado. Atualize e tente novamente.');
  const {tool,x,y}=payload;
  if(!validCoord(x,y))throw new Error('Posição inválida');
  if(['road','grass','path','water'].includes(tool)){
    if(world.objects.some(o=>x>=o.x&&x<o.x+o.w&&y>=o.y&&y<o.y+o.h))throw new Error('Há uma construção nesta posição');
    world.terrain[y][x]=tool;
  }else if(tool==='erase'){
    const obj=world.objects.find(o=>x>=o.x&&x<o.x+o.w&&y>=o.y&&y<o.y+o.h);
    if(obj){if(obj.kind==='service'&&protectedServices.has(obj.service))throw new Error('Edifício público essencial não pode ser removido');world.objects=world.objects.filter(o=>o.id!==obj.id);}
    else world.terrain[y][x]='grass';
  }else if(tool==='move'){
    const target=world.objects.find(o=>o.id===payload.id);if(!target)throw new Error('Construção não encontrada');
    const rect={...target,x,y};
    if(x+target.w>W||y+target.h>H)throw new Error('Fora do mapa');
    if(world.objects.some(o=>o.id!==target.id&&intersects(o,rect)))throw new Error('Posição ocupada');
    target.x=x;target.y=y;
  }else if(['tree','house','office','fountain','flower','lamp'].includes(tool)){
    const dim=tool==='office'?[6,5]:tool==='house'?[4,4]:tool==='fountain'?[3,3]:[1,1];const [w,h]=dim;
    if(x+w>W||y+h>H)throw new Error('Construção fora do mapa');
    const next={id:randomUUID(),kind:tool,x,y,w,h};
    if(world.objects.some(o=>intersects(o,next)))throw new Error('Área ocupada');
    if(tool==='office'){
      const name=String(payload.name||'Novo Projeto').trim().slice(0,45);if(!name)throw new Error('Informe o nome do prédio');
      Object.assign(next,{name,projectId:'projeto-'+next.id.slice(0,8),github:null,theme:'office'});
    }else if(tool==='house')next.name=String(payload.name||'Casa').trim().slice(0,40)||'Casa';
    world.objects.push(next);
  }else throw new Error('Ferramenta inválida');
  world.revision++;
  return world;
}
module.exports={W,H,serviceDefs,createWorld,editWorld,intersects,validCoord};
