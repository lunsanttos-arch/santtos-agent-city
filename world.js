'use strict';
const {randomUUID}=require('node:crypto');
const W=40,H=27;
const DEFAULT = [
  ['SanTTos Playout','playout',5,4,'tv'],
  ['SanTTos Radar','radar',15,4,'radar'],
  ['SanTTos Redação','redacao',26,4,'office'],
  ['SanTTos Signage','signage',5,15,'media'],
  ['SanTTos Chatbox','chatbox',26,15,'chat'],
];
const decorate = [
  [2,2,'tree'],[11,2,'tree'],[22,2,'tree'],[35,3,'tree'],
  [2,11,'tree'],[11,11,'tree'],[22,11,'tree'],[35,11,'tree'],
  [2,23,'tree'],[10,24,'tree'],[22,23,'tree'],[36,24,'tree'],
  [17,19,'fountain'],[32,16,'house'],[14,17,'house']
];
function createWorld(){
  const terrain=Array.from({length:H},()=>Array(W).fill('grass'));
  for(const y of [10,11,12,22,23])for(let x=0;x<W;x++)terrain[y][x]='road';
  for(const x of [12,13,23,24,36,37])for(let y=0;y<H;y++)terrain[y][x]='road';
  const objects=DEFAULT.map(([name,projectId,x,y,theme])=>({id:randomUUID(),kind:'office',name,projectId,x,y,w:5,h:4,theme,github:null}));
  for(const [x,y,kind] of decorate){if(kind==='house')objects.push({id:randomUUID(),kind,name:'Casa',x,y,w:3,h:3}); else if(kind==='fountain')objects.push({id:randomUUID(),kind,x,y,w:3,h:3}); else objects.push({id:randomUUID(),kind,x,y,w:1,h:1});}
  return {revision:1,w:W,h:H,terrain,objects};
}
function validCoord(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<W&&y<H;}
function intersects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
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
    if(obj)world.objects=world.objects.filter(o=>o.id!==obj.id);
    else world.terrain[y][x]='grass';
  }else if(tool==='move'){
    const target=world.objects.find(o=>o.id===payload.id);if(!target)throw new Error('Construção não encontrada');
    const rect={...target,x,y};
    if(x+target.w>W||y+target.h>H)throw new Error('Fora do mapa');
    if(world.objects.some(o=>o.id!==target.id&&intersects(o,rect)))throw new Error('Posição ocupada');
    target.x=x;target.y=y;
  }else if(['tree','house','office','fountain','flower','lamp'].includes(tool)){
    const dim=tool==='office'?[5,4]:tool==='house'||tool==='fountain'?[3,3]:[1,1];
    const [w,h]=dim;
    if(x+w>W||y+h>H)throw new Error('Construção fora do mapa');
    const newObj={id:randomUUID(),kind:tool,x,y,w,h};
    if(world.objects.some(o=>intersects(o,newObj)))throw new Error('Área ocupada');
    if(tool==='office'){
      let name=String(payload.name||'Novo Projeto').trim().slice(0,45);
      if(!name)throw new Error('Informe o nome do prédio');
      const projectId='projeto-'+newObj.id.slice(0,8);
      Object.assign(newObj,{name,projectId,github:null,theme:'office'});
    }else if(tool==='house')newObj.name=String(payload.name||'Casa').trim().slice(0,40)||'Casa';
    world.objects.push(newObj);
  }else throw new Error('Ferramenta inválida');
  world.revision++;
  return world;
}
module.exports={W,H,createWorld,editWorld,intersects,validCoord};
