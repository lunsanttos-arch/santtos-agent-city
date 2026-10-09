// Interior environments have their own rooms and props, not generic office copies.
// Only jobs with connected=true can create a worker sprite.
const SERVICES={
 cityhall:{name:'PREFEITURA',theme:['#e8d0ad','#f5e6c9'],rooms:['RECEPÇÃO','GABINETE','ARQUIVO','SALA DO CONSELHO'],props:['desk','desk','shelves','meeting'],roles:['secretaria','gestao']},
 library:{name:'BIBLIOTECA',theme:['#d7c4a4','#eadbb9'],rooms:['CORREDOR DE LIVROS','ESTANTES & COLEÇÕES','CATÁLOGO GITHUB','MESA DE LEITURA'],props:['books','books','terminal','reading'],roles:['bibliotecaria','pesquisa']},
 university:{name:'UNIVERSIDADE',theme:['#c4d5d6','#e5eeee'],rooms:['SALA DE AULA A','SALA DE AULA B','LAB DE PESQUISA','AUDITÓRIO'],props:['class','class','computers','meeting'],roles:['pesquisa']},
 police:{name:'DELEGACIA',theme:['#c1d3de','#e4ebf0'],rooms:['CENTRAL DE ALERTAS','SALA DO DELEGADO','ANÁLISE ESTÁTICA','RELATÓRIOS'],props:['monitor','desk','computers','shelves'],roles:['seguranca']},
 talents:{name:'AGÊNCIA DE TALENTOS',theme:['#d4c3db','#f5e0e9'],rooms:['RECEPÇÃO','CRIAÇÃO DE PERSONAGENS','CONEXÕES IA','ESCOLHA DE FUNÇÃO'],props:['desk','mirror','computers','terminal'],roles:[]}
};
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x|0,y|0,w|0,h|0)};
function label(c,text,x,y,color='#fef8e8',size=12){c.fillStyle='#2d344e';c.font=`bold ${size}px monospace`;c.textAlign='center';const w=Math.min(285,c.measureText(text).width+24);rect(c,x-w/2,y-17,w,24,'#35415a');c.fillStyle=color;c.fillText(text,x,y);}
function drawBookcases(c,x,y,width=200,rows=4){for(let row=0;row<rows;row++){const yy=y+row*38;rect(c,x,yy,width,31,'#72533e');rect(c,x+4,yy+3,width-8,24,'#b28b57');for(let z=0;z<Math.floor((width-16)/12);z++){const shades=['#a95e57','#427a81','#deb46d','#7c609d','#5f9876'];rect(c,x+7+z*12,yy+4,7+(z%3),19,shades[(z+row)%shades.length]);}rect(c,x,yy+26,width,5,'#513d42')}}
function table(c,x,y,w=140,h=58){rect(c,x+9,y+7,w,h,'#715e5b');rect(c,x,y,w,h-9,'#c6a078');rect(c,x+8,y+7,w-16,h-22,'#e0bd87');}
function plant(c,x,y){rect(c,x,y+19,25,28,'#9f7064');rect(c,x-10,y+5,45,25,'#427d56');rect(c,x-3,y-4,31,24,'#61a965');rect(c,x+12,y-13,8,11,'#87c984');}
function computer(c,x,y){table(c,x,y,125,42);rect(c,x+36,y-37,58,41,'#31394c');rect(c,x+40,y-32,50,29,'#85d7df');rect(c,x+44,y-27,38,3,'#d5fff7');rect(c,x+58,y+2,13,15,'#68718c')}
function drawProp(c,type,x,y){
 if(type==='books'){drawBookcases(c,x+12,y+35,204,4);drawBookcases(c,x+230,y+35,196,4);plant(c,x+430,y+143)}
 else if(type==='reading'){table(c,x+145,y+88,170,84);for(let i=0;i<3;i++)rect(c,x+165+i*46,y+48,24,35,'#746d92')}
 else if(type==='computers'){computer(c,x+110,y+105);computer(c,x+290,y+105)}
 else if(type==='terminal'){computer(c,x+195,y+112);drawBookcases(c,x+20,y+46,110,3)}
 else if(type==='class'){rect(c,x+35,y+47,350,80,'#557d75');rect(c,x+49,y+57,321,45,'#2f665d');for(let z=0;z<4;z++)table(c,x+35+z*104,y+175,81,43)}
 else if(type==='meeting'){table(c,x+128,y+86,248,106);for(let z=0;z<5;z++)rect(c,x+143+z*45,y+51,28,28,'#607c92')}
 else if(type==='monitor'){for(let z=0;z<3;z++){rect(c,x+40+z*136,y+40,120,78,'#3e506a');rect(c,x+48+z*136,y+47,104,58,'#86d4c4')}table(c,x+82,y+152,350,42)}
 else if(type==='mirror'){rect(c,x+160,y+34,182,135,'#7a558b');rect(c,x+173,y+46,158,105,'#a5c0d1');rect(c,x+220,y+190,80,32,'#805777')}
 else {computer(c,x+170,y+125);plant(c,x+390,y+140)}
}
export function renderInterior(ctx,{service,world,jobs,civic,time,drawAgent,onBubble}){
 const def=SERVICES[service];if(!def)return false;
 const active=jobs.filter(j=>j.connected&&['running','waiting'].includes(j.status)&&j.agentId);
 const joined=active.map(j=>({job:j,agent:civic.agents?.find(a=>a.id===j.agentId)})).filter(x=>x.agent&&x.agent.service===service);
 rect(ctx,0,0,960,648,'#25374a');rect(ctx,16,18,928,588,'#d3b890');rect(ctx,25,28,910,568,def.theme[0]);
 // Floor tile pattern, interior walls and horizontal corridor.
 for(let y=43;y<590;y+=19)for(let x=40;x<925;x+=19){if((x+y)%3===0)rect(ctx,x,y,18,18,def.theme[1]);}
 const rooms=[{x:38,y:62,w:432,h:214},{x:490,y:62,w:430,h:214},{x:38,y:328,w:432,h:248},{x:490,y:328,w:430,h:248}];
 rooms.forEach((r,i)=>{
   rect(ctx,r.x,r.y,r.w,r.h,'#574b5a');rect(ctx,r.x+7,r.y+7,r.w-14,r.h-14,def.theme[i%2]);
   for(let xx=r.x+22;xx<r.x+r.w-18;xx+=31)rect(ctx,xx,r.y+25,27,r.h-50,def.theme[(i+1)%2]);
   label(ctx,def.rooms[i],r.x+r.w/2,r.y+24,'#fff4dc',11);
   drawProp(ctx,def.props[i],r.x+12,r.y+16);
   // 1x2 doorway to central corridors
   rect(ctx,r.x+r.w/2-28,i<2?r.y+r.h-14:r.y,56,14,'#e7d7b8');
 });
 rect(ctx,25,287,910,28,'#ae997a');for(let x=32;x<930;x+=25)rect(ctx,x,299,15,3,'#e4d9bc');
 label(ctx,def.name+'  •  INTERIOR',480,37,'#fff9ee',14);
 if(joined.length){joined.forEach(({job,agent},i)=>{
   const room=rooms[i%rooms.length],pos= {x:room.x+room.w/2+(i%3-1)*42,y:room.y+165};
   if(service==='library'&&agent.role==='bibliotecaria'){pos.x=room.x+85+Math.abs(Math.sin(time/1300))*200;pos.y=room.y+189+Math.sin(time/800)*4;}
   if(service==='police'&&agent.role==='seguranca'){pos.x=room.x+130+(i%2)*85;pos.y=room.y+178;}
   if(service==='university'&&agent.role==='pesquisa'){pos.x=room.x+120+(i%2)*90;pos.y=room.y+173;}
   drawAgent(ctx,pos.x,pos.y,agent.skin,'down',time/300+i,1.6);
   label(ctx,agent.name.toUpperCase(),pos.x,pos.y-38,'#fff7d2',9);
   if(service==='library'&&agent.role==='bibliotecaria'){rect(ctx,pos.x-18,pos.y-64,9,13,'#78b9da');rect(ctx,pos.x-14,pos.y-64,3,13,'#f1e8b9');}
   if(service==='cityhall'&&agent.role==='secretaria'&&onBubble)onBubble(ctx,pos.x+135,pos.y-110,civic.reminders?.find(r=>!r.done)?.message||'Sem novos recados!',190);
 });}
 else label(ctx,'NENHUM AGENTE IA EM EXECUÇÃO NESTE PRÉDIO',480,316,'#fff3db',10);
 if(service==='library')label(ctx,'Clique em GERENCIAR para organizar coleções e perfis.',480,611,'#f7efdd',11);
 else if(service==='talents')label(ctx,'Clique em GERENCIAR para criar um agente com nome e skin próprios.',480,611,'#f7efdd',11);
 else label(ctx,'As mesas só são ocupadas por agentes realmente conectados.',480,611,'#f7efdd',11);
 return true;
}
export function renderSpeechBubble(ctx,x,y,message,maxWidth=210){const line=String(message).slice(0,120);rect(ctx,x-maxWidth/2,y-24,maxWidth,54,'#32384e');rect(ctx,x-maxWidth/2+4,y-20,maxWidth-8,46,'#fff5d8');ctx.fillStyle='#343c54';ctx.textAlign='center';ctx.font='bold 11px monospace';const words=line.split(' ');let row='',rows=[];for(const w of words){if((row+' '+w).length>25){rows.push(row);row=w;}else row+=(row?' ':'')+w}if(row)rows.push(row);for(let i=0;i<Math.min(3,rows.length);i++)ctx.fillText(rows[i],x,y-4+i*13);rect(ctx,x-6,y+30,12,7,'#fff5d8')}
export function hasInterior(service){return Object.hasOwn(SERVICES,service)};
