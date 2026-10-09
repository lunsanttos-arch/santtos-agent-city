import {drawAtlasBuilding,drawAtlasGround,drawAtlasFountain} from './atlas.js';
// SanTTos Agent City — projeção isométrica original 2:1.
// O tile lógico agora é 68 × 52; o mapa do editor e as salas 2D são preservados.
export const ISO={tileWidth:34,tileHeight:17,originX:530,originY:92};
export function projectIso(x,y,z=0){return {x:ISO.originX+(x-y)*ISO.tileWidth/2,y:ISO.originY+(x+y)*ISO.tileHeight/2-z};}
export function unprojectIso(px,py){const a=(px-ISO.originX)/(ISO.tileWidth/2),b=(py-ISO.originY)/(ISO.tileHeight/2);return {x:Math.floor((a+b)/2),y:Math.floor((b-a)/2)};}
function poly(ctx,points,fill,stroke){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function quad(x,y,w=1,h=1,z=0){return [projectIso(x,y,z),projectIso(x+w,y,z),projectIso(x+w,y+h,z),projectIso(x,y+h,z)];}
function pointInside(poly_,p){let inside=false;for(let i=0,j=poly_.length-1;i<poly_.length;j=i++){const a=poly_[i],b=poly_[j];if(((a.y>p.y)!==(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x))inside=!inside;}return inside;}
export function hitIsoObject(objects,px,py){
  // Primeiro os mais à frente; permite clicar no telhado e fachada, além do tile de base.
  for(const o of [...objects].sort((a,b)=>(b.x+b.y+b.w+b.h)-(a.x+a.y+a.w+a.h))){
    const height=o.kind==='service'?Math.max(115,(o.w+o.h)*ISO.tileWidth/2*.64):o.kind==='office'?Math.max(95,(o.w+o.h)*ISO.tileWidth/2*.64):o.kind==='house'?Math.max(80,(o.w+o.h)*ISO.tileWidth/2*.60):o.kind==='tree'?37:o.kind==='lamp'?25:0;
    const foot=quad(o.x,o.y,o.w,o.h),roof=quad(o.x,o.y,o.w,o.h,height);
    const center=projectIso(o.x+o.w/2,o.y+o.h/2);
    const region=[roof[0],roof[1],foot[1],foot[2],foot[3],roof[3]];
    if(pointInside(region,{x:px,y:py}) || (height && Math.abs(px-center.x)<(o.w+o.h)*ISO.tileWidth/5 && py>center.y-height-8&&py<center.y+11))return o;
  }
  return null;
}
function tile(ctx,x,y,t,seed,time,terrain){
  if(drawAtlasGround(ctx,t,quad(x,y),quad(Math.floor(x/4)*4,Math.floor(y/4)*4,4,4)))return;
  const colors={grass:(seed%8===0?'#78b969':seed%4===0?'#84c774':'#8ecf7a'),road:'#778792',path:'#ebd5aa',water:'#53afd6'};
  poly(ctx,quad(x,y),colors[t]||colors.grass,t==='road'?null:'#81bb6f');
  const c=projectIso(x+.5,y+.5);
  if(t==='grass'){
    if(seed%11===0){ctx.fillStyle='#4b9857';ctx.fillRect(c.x-3,c.y-1,2,3);ctx.fillRect(c.x+2,c.y-3,2,2)}
    if(seed%41===0){ctx.fillStyle='#fce3a4';ctx.fillRect(c.x+2,c.y,2,2)}
  }else if(t==='road'){
    const tq=(a,b)=>terrain?.[b]?.[a];
    const edge=(a,b)=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='#e3d5b7';ctx.lineWidth=2;ctx.stroke();};
    const q=quad(x,y);
    if(tq(x,y-1)!=='road')edge(q[0],q[1]);
    if(tq(x+1,y)!=='road')edge(q[1],q[2]);
    if(tq(x,y+1)!=='road')edge(q[2],q[3]);
    if(tq(x-1,y)!=='road')edge(q[3],q[0]);
    if(tq(x,y-1)!=='road'&&tq(x,y+1)==='road'&&x%2===0)poly(ctx,quad(x+.15,y+.93,.7,.13),'#f7dc99');
    if(tq(x-1,y)!=='road'&&tq(x+1,y)==='road'&&y%2===0)poly(ctx,quad(x+.93,y+.15,.13,.7),'#f7dc99');
    if(seed%4===0){ctx.fillStyle='#8d9daa';ctx.fillRect(c.x-2,c.y-1,2,1);}
  }else if(t==='path'){
    ctx.fillStyle='#bfa47d';if(seed%3===0)ctx.fillRect(c.x-2,c.y,3,1);
  }else if(t==='water'){
    poly(ctx,quad(x+.1,y+.1,.8,.8),seed%2?'#6cc6e1':'#70c7e2');
    ctx.fillStyle='#d0f6fc';ctx.fillRect(c.x-3+Math.sin(time/900+seed)*2,c.y-1,4,1);
  }
}
function wallWindows(ctx,start,end,topz,count,color){
  for(let i=1;i<=count;i++){
    const k=i/(count+1),x=start.x+(end.x-start.x)*k,y=start.y+(end.y-start.y)*k-topz+11;
    ctx.fillStyle='#7c6a82';ctx.fillRect(x-5,y-1,10,13);
    ctx.fillStyle=color;ctx.fillRect(x-4,y,8,10);ctx.fillStyle='#efffff';ctx.fillRect(x-3,y+1,4,2);
    ctx.fillStyle='#738ba6';ctx.fillRect(x,y,1,9);
  }
}
function decorativeRoof(ctx,o,z,left,right,trim){
  const f=quad(o.x,o.y,o.w,o.h,z),ra=projectIso(o.x+o.w*.48,o.y,z+15),rb=projectIso(o.x+o.w*.48,o.y+o.h,z+15);
  poly(ctx,[f[0],ra,rb,f[3]],left,trim);poly(ctx,[ra,f[1],f[2],rb],right,trim);
  for(let i=1;i<=3;i++){const p=projectIso(o.x+o.w*.48,o.y+o.h*i/4,z+15);ctx.fillStyle='#fff2d562';ctx.fillRect(p.x-2,p.y-2,3,1)}
}
function signBoard(ctx,o,z,active){
 const p=projectIso(o.x+o.w/2,o.y+o.h/2,z+22);
 const text=String(o.name||'').replace(/^SanTTos /,'').toUpperCase().slice(0,23);
 ctx.font='bold 11px monospace';ctx.textAlign='center';const width=Math.max(70,Math.min(212,ctx.measureText(text).width+18));
 ctx.fillStyle='#283b3c';ctx.fillRect(p.x-width/2-2,p.y-16,width+4,23);
 ctx.fillStyle=active?'#6a4aab':'#405562';ctx.fillRect(p.x-width/2,p.y-14,width,19);
 ctx.fillStyle='#fff7da';ctx.fillText(text,p.x,p.y);if(active){ctx.fillStyle='#81f1c8';ctx.fillRect(p.x+width/2-10,p.y-12,5,5)}
}
function frontDoor(ctx,o,z,accent){
 const d=projectIso(o.x+o.w*.57,o.y+o.h*.96);
 ctx.fillStyle='#3d454d';ctx.fillRect(d.x-10,d.y-z*.42,20,z*.42);
 ctx.fillStyle=accent;ctx.fillRect(d.x-7,d.y-z*.42+3,14,z*.42-3);
 ctx.fillStyle='#f5edb1';ctx.fillRect(d.x+3,d.y-10,3,3);
 const step=projectIso(o.x+o.w*.57,o.y+o.h+0.15);poly(ctx,[{x:step.x-17,y:step.y},{x:step.x,y:step.y-5},{x:step.x+18,y:step.y},{x:step.x,y:step.y+5}],'#c6b2a0');
}
function drawBuilding(ctx,o,count){
 if(drawAtlasBuilding(ctx,o,projectIso(o.x+o.w/2,o.y+o.h/2),(o.w+o.h)*ISO.tileWidth/2+20)){signBoard(ctx,o,95,count);return;}
 const z=62,base=quad(o.x,o.y,o.w,o.h),top=quad(o.x,o.y,o.w,o.h,z);
 poly(ctx,[top[1],top[2],base[2],base[1]],'#c4cbbf','#718b8d');poly(ctx,[top[2],top[3],base[3],base[2]],'#eae3ce','#a9ac98');
 const styles={tv:['#a94b71','#e47990'],radar:['#487fa3','#6bb7c8'],office:['#7a66aa','#b5a0d4'],media:['#bc754e','#eab074'],chat:['#58a09d','#8bcfc0']};
 const [dark,light]=styles[o.theme]||styles.office;decorativeRoof(ctx,o,z,dark,light,'#57435d');
 wallWindows(ctx,base[1],base[2],z,4,'#a2d5f2');wallWindows(ctx,base[3],base[2],z,4,'#b1dee5');frontDoor(ctx,o,z,'#8bcbd2');signBoard(ctx,o,z,count);
}
function drawHouse(ctx,o){
 if(drawAtlasBuilding(ctx,o,projectIso(o.x+o.w/2,o.y+o.h/2),(o.w+o.h)*ISO.tileWidth/2+16))return;
 const z=44,f=quad(o.x,o.y,o.w,o.h),r=quad(o.x,o.y,o.w,o.h,z);
 const skins=[{wall:'#fff0c9',trim:'#8c6c68',roof:['#a6445c','#e98690'],glass:'#a5dbe6'},
   {wall:'#e0f0ed',trim:'#587e84',roof:['#376f9e','#7fbed8'],glass:'#b4e6e7'},
   {wall:'#f7decd',trim:'#96726a',roof:['#a46b57','#f1ab7d'],glass:'#b2d6ff'},
   {wall:'#eee0f8',trim:'#73618a',roof:['#7654a2','#b499dd'],glass:'#b3dbe2'}];
 const style=skins[(Math.abs(o.x*7+o.y*3))%skins.length];
 // Little raised foundation with bright masonry and hardwood porch.
 poly(ctx,quad(o.x-.15,o.y-.1,o.w+.3,o.h+.3,-2),'#9b9f77','#5f745d');
 poly(ctx,[r[1],r[2],f[2],f[1]],style.trim,'#756778');
 poly(ctx,[r[2],r[3],f[3],f[2]],style.wall,'#887e76');
 // Roof ridgeline, opposing dark/shaded slopes and sparkling shingles.
 decorativeRoof(ctx,o,z,style.roof[0],style.roof[1],style.trim);
 for(let i=1;i<4;i++){const q=projectIso(o.x+o.w*.48,o.y+o.h*i/4,z+15);
   ctx.fillStyle='#fff3cb7a';ctx.fillRect(q.x-18,q.y-4,6,2);ctx.fillRect(q.x+15,q.y+7,4,2);
 }
 // Dormer and chimney cast legible pixel silhouettes.
 const dormer=projectIso(o.x+o.w*.43,o.y+o.h*.48,z+21);ctx.fillStyle=style.trim;
 ctx.fillRect(dormer.x-13,dormer.y-13,26,20);ctx.fillStyle=style.glass;ctx.fillRect(dormer.x-9,dormer.y-9,18,14);
 ctx.fillStyle='#fdf7e1';ctx.fillRect(dormer.x-2,dormer.y-9,3,14);
 const chimney=projectIso(o.x+o.w*.77,o.y+o.h*.30,z+18);ctx.fillStyle='#896475';ctx.fillRect(chimney.x-5,chimney.y-13,10,20);
 ctx.fillStyle='#e6c7aa';ctx.fillRect(chimney.x-3,chimney.y-11,6,16);ctx.fillStyle='#4c4858';ctx.fillRect(chimney.x-7,chimney.y-16,14,4);
 wallWindows(ctx,f[1],f[2],z,2,style.glass);wallWindows(ctx,f[3],f[2],z,2,style.glass);
 frontDoor(ctx,o,z,style.trim);
 const porch=projectIso(o.x+o.w*.57,o.y+o.h+0.65);poly(ctx,[{x:porch.x-23,y:porch.y-3},{x:porch.x,y:porch.y-12},{x:porch.x+23,y:porch.y-3},{x:porch.x,y:porch.y+6}],'#caa27a','#957d63');
 // Green hedges and flower pots so every home feels inhabited without fake agents.
 for(const side of [.12,.91]){const hedge=projectIso(o.x+o.w*side,o.y+o.h*.88);
   ctx.fillStyle='#427b52';ctx.fillRect(hedge.x-9,hedge.y-9,17,10);ctx.fillStyle='#69b567';ctx.fillRect(hedge.x-6,hedge.y-13,12,9);
   ctx.fillStyle='#f7b4b7';ctx.fillRect(hedge.x-3,hedge.y-13,4,4);}
 const mailbox=projectIso(o.x+o.w+.45,o.y+o.h+.2);
 ctx.fillStyle='#5d5267';ctx.fillRect(mailbox.x-1,mailbox.y-13,3,13);ctx.fillStyle='#c25c6d';ctx.fillRect(mailbox.x-6,mailbox.y-16,12,7);
}
const SERVICE_STYLES={cityhall:{walls:['#d6c9b3','#f2e9d5'],roof:['#62558c','#a08fbb'],label:'PREFEITURA',symbol:'★'},library:{walls:['#cfb99e','#f8dfbb'],roof:['#795b9e','#c5a3dd'],label:'BIBLIOTECA',symbol:'▤'},university:{walls:['#c6d6d3','#e8f5dc'],roof:['#547fa4','#91bfd7'],label:'UNIVERSIDADE',symbol:'✦'},police:{walls:['#afc4d8','#e6f0ee'],roof:['#405f9e','#8ab5e1'],label:'POLÍCIA',symbol:'◆'},talents:{walls:['#d7c4d7','#f8e1e4'],roof:['#a35c92','#e3a1c8'],label:'TALENTOS',symbol:'✧'}};
function drawService(ctx,o){
 if(drawAtlasBuilding(ctx,o,projectIso(o.x+o.w/2,o.y+o.h/2),(o.w+o.h)*ISO.tileWidth/2+20)){signBoard(ctx,o,115,false);return;}
 const style=SERVICE_STYLES[o.service]||SERVICE_STYLES.cityhall,z=77,f=quad(o.x,o.y,o.w,o.h),r=quad(o.x,o.y,o.w,o.h,z);
 poly(ctx,[r[1],r[2],f[2],f[1]],style.walls[0],'#7d7985');poly(ctx,[r[2],r[3],f[3],f[2]],style.walls[1],'#8c8a8b');decorativeRoof(ctx,o,z,...style.roof,'#544b6c');
 wallWindows(ctx,f[1],f[2],z,Math.max(2,Math.floor(o.h/1.4)),'#b5e7ed');wallWindows(ctx,f[3],f[2],z,Math.max(2,Math.floor(o.w/1.4)),'#b2dcea');frontDoor(ctx,o,z,'#547c9e');
 const center=projectIso(o.x+o.w*.5,o.y+o.h*.5,z+17);ctx.fillStyle='#f9eec2';ctx.fillRect(center.x-10,center.y-16,20,21);ctx.fillStyle=style.roof[0];ctx.font='bold 17px monospace';ctx.textAlign='center';ctx.fillText(style.symbol,center.x,center.y+1);
 if(o.service==='cityhall'){const tower=projectIso(o.x+o.w/2,o.y+o.h/2,z+36);ctx.fillStyle='#efdfc5';ctx.fillRect(tower.x-9,tower.y-10,18,20);ctx.fillStyle='#eac37c';ctx.fillRect(tower.x-3,tower.y-15,6,6);}
 signBoard(ctx,o,z,false);
}
function drawTree(ctx,o){const p=projectIso(o.x+.5,o.y+.5);ctx.fillStyle='#72563d';ctx.fillRect(p.x-3,p.y-18,6,20);
  poly(ctx,[{x:p.x-18,y:p.y-18},{x:p.x-13,y:p.y-30},{x:p.x-4,y:p.y-34},{x:p.x+7,y:p.y-31},{x:p.x+17,y:p.y-19},{x:p.x+12,y:p.y-9},{x:p.x-12,y:p.y-8}],'#377750','#285e43');
  poly(ctx,[{x:p.x-12,y:p.y-20},{x:p.x-10,y:p.y-31},{x:p.x+2,y:p.y-37},{x:p.x+12,y:p.y-25},{x:p.x+6,y:p.y-19}],'#58a76b');ctx.fillStyle='#9bd47f';ctx.fillRect(p.x-5,p.y-31,4,3);
}
function decor(ctx,o){const p=projectIso(o.x+.5,o.y+.5);
  if(o.kind==='tree')drawTree(ctx,o);else if(o.kind==='flower'){ctx.fillStyle='#eb8daf';ctx.fillRect(p.x-4,p.y-4,3,3);ctx.fillStyle='#fff0aa';ctx.fillRect(p.x+3,p.y,3,2)}
  else if(o.kind==='lamp'){ctx.fillStyle='#6c6080';ctx.fillRect(p.x-2,p.y-21,4,21);ctx.fillStyle='#fbe2a7';ctx.fillRect(p.x-5,p.y-26,11,8)}
  else if(o.kind==='fountain'){if(drawAtlasFountain(ctx,projectIso(o.x+o.w/2,o.y+o.h/2),(o.w+o.h)*ISO.tileWidth/2+10))return;poly(ctx,quad(o.x,o.y,o.w,o.h,1),'#d8d4bb');poly(ctx,quad(o.x+.3,o.y+.3,o.w-.6,o.h-.6,2),'#65bde0');ctx.fillStyle='#e9f4ed';ctx.fillRect(p.x-3,p.y-13,7,14);ctx.fillStyle='#91e4f0';ctx.fillRect(p.x-2,p.y-21,4,9)}
  else if(o.kind==='office')drawBuilding(ctx,o,o.activeCount||0);else if(o.kind==='house')drawHouse(ctx,o);else if(o.kind==='service')drawService(ctx,o);
}
export function renderIsometric(ctx,{terrain,objects,jobs,avatars,player,hover,editing,tool,time,drawPerson,camera,playerSkin,onPerson}){
  ctx.fillStyle='#85c776';ctx.fillRect(-4500,-4500,9000,9000);
  for(let y=0;y<terrain.length;y++)for(let x=0;x<terrain[y].length;x++){const p=projectIso(x,y);if(camera&&(Math.abs(p.x-camera.cx)>610/camera.zoom||Math.abs(p.y-camera.cy)>435/camera.zoom))continue;tile(ctx,x,y,terrain[y][x],(x*1337+y*613)%101,time,terrain)}
  const active=jobs.filter(j=>j.connected&&(['running','waiting'].includes(j.status)||(j.status==='completed'&&Date.now()-j.updated<300000)));
  const items=[...objects.map(o=>({depth:o.x+o.y+o.w+o.h,kind:'obj',obj:o})),...avatars.filter(a=>a.resident||a.job&&active.some(j=>j.id===a.job.id)).map(a=>({depth:a.y+a.x,kind:'agent',a})),{depth:player.x+player.y,kind:'mayor'}].sort((a,b)=>a.depth-b.depth);
  for(const i of items){if(i.kind==='obj'){const o=i.obj;const c=projectIso(o.x+o.w/2,o.y+o.h/2);if(camera&&(Math.abs(c.x-camera.cx)>760/camera.zoom||Math.abs(c.y-camera.cy)>590/camera.zoom))continue;decor(ctx,{...o,activeCount:active.filter(j=>j.projectId===o.projectId).length})}
    else if(i.kind==='agent'){const p=projectIso(i.a.x,i.a.y);if(onPerson&&(i.a.agent||i.a.staff))onPerson({x:p.x,y:p.y-21,agent:i.a.agent,staff:i.a.staff});drawPerson(p.x,p.y-21,i.a.color,i.a.dir,i.a.frame,.8);if(i.a.resident){ctx.textAlign='center';ctx.font='bold 8px monospace';ctx.fillStyle=i.a.working?'#0c633e':'#3a425c';ctx.fillText(i.a.name.slice(0,13),p.x,p.y-51);ctx.fillStyle=i.a.working?'#70f3af':'#c6cad7';ctx.fillRect(p.x-2,p.y-47,4,4);}}
    else {const p=projectIso(player.x,player.y);drawPerson(p.x,p.y-21,playerSkin||{player:true,spriteIndex:0},player.facing,player.frame,.8)}
  }
  if(editing&&hover&&hover.x>=0&&hover.y>=0&&hover.x<terrain[0].length&&hover.y<terrain.length){const size=tool==='office'?[6,5]:tool==='house'?[4,4]:tool==='fountain'?[3,3]:[1,1];const f=quad(hover.x,hover.y,size[0],size[1],3);poly(ctx,f,'#deb6f058','#fff6ca')}

}
