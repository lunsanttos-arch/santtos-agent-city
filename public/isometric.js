// SanTTos Agent City — projeção isométrica original 2:1.
// O tile lógico continua 40 × 27; o mapa do editor e as salas 2D são preservados.
export const ISO={tileWidth:25,tileHeight:13,originX:435,originY:103};
export function projectIso(x,y,z=0){return {x:ISO.originX+(x-y)*ISO.tileWidth/2,y:ISO.originY+(x+y)*ISO.tileHeight/2-z};}
export function unprojectIso(px,py){const a=(px-ISO.originX)/(ISO.tileWidth/2),b=(py-ISO.originY)/(ISO.tileHeight/2);return {x:Math.floor((a+b)/2),y:Math.floor((b-a)/2)};}
function poly(ctx,points,fill,stroke){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function quad(x,y,w=1,h=1,z=0){return [projectIso(x,y,z),projectIso(x+w,y,z),projectIso(x+w,y+h,z),projectIso(x,y+h,z)];}
function pointInside(poly_,p){let inside=false;for(let i=0,j=poly_.length-1;i<poly_.length;j=i++){const a=poly_[i],b=poly_[j];if(((a.y>p.y)!==(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x))inside=!inside;}return inside;}
export function hitIsoObject(objects,px,py){
  // Primeiro os mais à frente; permite clicar no telhado e fachada, além do tile de base.
  for(const o of [...objects].sort((a,b)=>(b.x+b.y+b.w+b.h)-(a.x+a.y+a.w+a.h))){
    const height=o.kind==='office'?52:o.kind==='house'?34:o.kind==='tree'?24:o.kind==='lamp'?18:0;
    const foot=quad(o.x,o.y,o.w,o.h),roof=quad(o.x,o.y,o.w,o.h,height);
    const center=projectIso(o.x+o.w/2,o.y+o.h/2);
    const region=[roof[0],roof[1],foot[1],foot[2],foot[3],roof[3]];
    if(pointInside(region,{x:px,y:py}) || (height && Math.abs(px-center.x)<(o.w+o.h)*ISO.tileWidth/5 && py>center.y-height-8&&py<center.y+11))return o;
  }
  return null;
}
function tile(ctx,x,y,t,seed,time){
  const colors={grass:(seed%8===0?'#8dc870':seed%4===0?'#94d077':'#a3d880'),road:'#53596c',path:'#e8cc9f',water:'#60bada'};
  poly(ctx,quad(x,y),colors[t]||colors.grass,t==='road'?'#67677b':undefined);
  const c=projectIso(x+.5,y+.5);
  if(t==='grass'){
    if(seed%11===0){ctx.fillStyle='#3b925e';ctx.fillRect(c.x-3,c.y-1,2,3);ctx.fillRect(c.x+2,c.y-3,2,2)}
    if(seed%41===0){ctx.fillStyle='#fce3a4';ctx.fillRect(c.x+2,c.y,2,2)}
  }else if(t==='road'){
    if((x+y)%3===0){ctx.strokeStyle='#e7d69b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(c.x-3,c.y);ctx.lineTo(c.x+3,c.y);ctx.stroke()}
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
function drawBuilding(ctx,o,count){
  const z=52,base=quad(o.x,o.y,o.w,o.h),top=quad(o.x,o.y,o.w,o.h,z);
  poly(ctx,[top[1],top[2],base[2],base[1]],'#c9b5aa','#988ca4');
  poly(ctx,[top[2],top[3],base[3],base[2]],'#f7e5cb','#ae9b9e');
  const roofs={tv:['#7254bd','#b18ee1'],radar:['#327598','#71bad2'],office:['#735f9f','#ad95d0'],media:['#9a607a','#d39bb3'],chat:['#8a516f','#c58ba9']};
  const [r1,r2]=roofs[o.theme]||['#7560a1','#b59ade'];
  poly(ctx,top,r1,'#463b65');
  poly(ctx,quad(o.x+.28,o.y+.25,o.w-.56,o.h-.5,z+7),r2,'#5f4d85');
  const chimney=projectIso(o.x+o.w*.3,o.y+o.h*.35,z+7);ctx.fillStyle='#e5c8c7';ctx.fillRect(chimney.x-5,chimney.y-11,10,11);ctx.fillStyle='#6b4b69';ctx.fillRect(chimney.x-6,chimney.y-12,12,3);
  wallWindows(ctx,base[1],base[2],z,3,'#82c4d9');wallWindows(ctx,base[3],base[2],z,3,'#91d2d7');
  const d=projectIso(o.x+o.w*.52,o.y+o.h*.98);ctx.fillStyle='#6c547b';ctx.fillRect(d.x-8,d.y-22,16,22);ctx.fillStyle='#b0d8d2';ctx.fillRect(d.x-5,d.y-19,10,17);ctx.fillStyle='#fef3d4';ctx.fillRect(d.x+3,d.y-11,2,2);
  const sign=projectIso(o.x+o.w/2,o.y+o.h/2,z+12);
  const text=(o.name||'PROJETO').replace(/^SanTTos /,'').toUpperCase().slice(0,20);
  ctx.textAlign='center';ctx.font='bold 11px monospace';const len=Math.min(158,ctx.measureText(text).width+20);
  ctx.fillStyle='#222238';ctx.fillRect(sign.x-len/2-2,sign.y-18,len+4,19);
  ctx.fillStyle=count>0?'#744fb8':'#333452';ctx.fillRect(sign.x-len/2,sign.y-16,len,15);
  ctx.fillStyle='#fff8e9';ctx.fillText(text,sign.x,sign.y-5);
  if(count>0){ctx.fillStyle='#7df0b9';ctx.fillRect(sign.x+len/2-6,sign.y-13,5,5)}
}
function drawHouse(ctx,o){
  const h=31;const f=quad(o.x,o.y,o.w,o.h),r=quad(o.x,o.y,o.w,o.h,h);
  poly(ctx,[r[1],r[2],f[2],f[1]],'#cba77f','#9b816a');poly(ctx,[r[2],r[3],f[3],f[2]],'#fff2c4','#af9e7f');
  const ridge1=projectIso(o.x+o.w/2,o.y,h+16),ridge2=projectIso(o.x+o.w/2,o.y+o.h,h+16);
  poly(ctx,[r[0],ridge1,ridge2,r[3]],'#dc7977','#8e4d59');poly(ctx,[ridge1,r[1],r[2],ridge2],'#ab5d69','#754451');
  const door=projectIso(o.x+o.w*.55,o.y+o.h*.95);ctx.fillStyle='#835b62';ctx.fillRect(door.x-6,door.y-18,12,18);
  const win=projectIso(o.x+o.w*.19,o.y+o.h*.8);ctx.fillStyle='#a4d5d9';ctx.fillRect(win.x-5,win.y-18,11,9);
}
function drawTree(ctx,o){const p=projectIso(o.x+.5,o.y+.5);ctx.fillStyle='#72563d';ctx.fillRect(p.x-3,p.y-18,6,20);
  poly(ctx,[{x:p.x-18,y:p.y-18},{x:p.x-13,y:p.y-30},{x:p.x-4,y:p.y-34},{x:p.x+7,y:p.y-31},{x:p.x+17,y:p.y-19},{x:p.x+12,y:p.y-9},{x:p.x-12,y:p.y-8}],'#377750','#285e43');
  poly(ctx,[{x:p.x-12,y:p.y-20},{x:p.x-10,y:p.y-31},{x:p.x+2,y:p.y-37},{x:p.x+12,y:p.y-25},{x:p.x+6,y:p.y-19}],'#58a76b');ctx.fillStyle='#9bd47f';ctx.fillRect(p.x-5,p.y-31,4,3);
}
function decor(ctx,o){const p=projectIso(o.x+.5,o.y+.5);
  if(o.kind==='tree')drawTree(ctx,o);else if(o.kind==='flower'){ctx.fillStyle='#eb8daf';ctx.fillRect(p.x-4,p.y-4,3,3);ctx.fillStyle='#fff0aa';ctx.fillRect(p.x+3,p.y,3,2)}
  else if(o.kind==='lamp'){ctx.fillStyle='#6c6080';ctx.fillRect(p.x-2,p.y-21,4,21);ctx.fillStyle='#fbe2a7';ctx.fillRect(p.x-5,p.y-26,11,8)}
  else if(o.kind==='fountain'){poly(ctx,quad(o.x,o.y,o.w,o.h,1),'#d8d4bb');poly(ctx,quad(o.x+.3,o.y+.3,o.w-.6,o.h-.6,2),'#65bde0');ctx.fillStyle='#e9f4ed';ctx.fillRect(p.x-3,p.y-13,7,14);ctx.fillStyle='#91e4f0';ctx.fillRect(p.x-2,p.y-21,4,9)}
  else if(o.kind==='office')drawBuilding(ctx,o,o.activeCount||0);else if(o.kind==='house')drawHouse(ctx,o);
}
export function renderIsometric(ctx,{terrain,objects,jobs,avatars,player,hover,editing,tool,time,drawPerson}){
  ctx.fillStyle='#7fb96e';ctx.fillRect(0,0,960,648);ctx.fillStyle='#93c17d';ctx.fillRect(0,30,960,570);
  for(let y=0;y<terrain.length;y++)for(let x=0;x<terrain[y].length;x++){tile(ctx,x,y,terrain[y][x],(x*1337+y*613)%101,time)}
  const active=jobs.filter(j=>j.connected&&['running','waiting'].includes(j.status));
  const items=[...objects.map(o=>({depth:o.x+o.y+o.w+o.h,kind:'obj',obj:o})),...avatars.filter(({job})=>active.some(j=>j.id===job.id)).map(a=>({depth:a.y+a.x,kind:'agent',a})),{depth:player.x+player.y,kind:'mayor'}].sort((a,b)=>a.depth-b.depth);
  for(const i of items){if(i.kind==='obj'){const o=i.obj;decor(ctx,{...o,activeCount:active.filter(j=>j.projectId===o.projectId).length})}
    else if(i.kind==='agent'){const p=projectIso(i.a.x,i.a.y);drawPerson(p.x,p.y-21,i.a.color,i.a.dir,i.a.frame,.8);}
    else {const p=projectIso(player.x,player.y);drawPerson(p.x,p.y-21,'#995bcb',player.facing,player.frame,.8)}
  }
  if(editing&&hover&&hover.x>=0&&hover.y>=0&&hover.x<40&&hover.y<27){const size=tool==='office'?[5,4]:['house','fountain'].includes(tool)?[3,3]:[1,1];const f=quad(hover.x,hover.y,size[0],size[1],3);poly(ctx,f,'#deb6f058','#fff6ca')}
  ctx.textAlign='center';ctx.fillStyle='#24223bdc';ctx.fillRect(325,593,310,29);ctx.font='bold 12px monospace';ctx.fillStyle='#f5ebff';ctx.fillText(`${active.length} AGENTE${active.length===1?'':'S'} CONECTADO${active.length===1?'':'S'} EM ATIVIDADE`,480,612);
}
