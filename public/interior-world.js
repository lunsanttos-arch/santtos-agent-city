import {interiorStaff,isWorking} from './city-behavior.js';
// Interior environments have their own rooms and props, not generic office copies.
// Staff illustrations are labelled as routines, never represented as authenticated AI sessions.
const SERVICES={
 cityhall:{name:'PREFEITURA',theme:['#e8d0ad','#f5e6c9'],rooms:['RECEPÇÃO','GABINETE','ARQUIVO','SALA DO CONSELHO'],props:['desk','desk','shelves','meeting'],roles:['secretaria','gestao']},
 library:{name:'BIBLIOTECA',theme:['#d7c4a4','#eadbb9'],rooms:['CORREDOR DE LIVROS','ESTANTES & COLEÇÕES','CATÁLOGO GITHUB','MESA DE LEITURA'],props:['books','books','terminal','reading'],roles:['bibliotecaria','pesquisa']},
 university:{name:'UNIVERSIDADE',theme:['#c4d5d6','#e5eeee'],rooms:['SALA DE AULA 01','SALA DE AULA 02','CENTRO DE PESQUISA & LABORATÓRIO','OFICINA DE ENGENHARIA'],props:['class','class','computers','meeting'],roles:['pesquisa','engenharia']},
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
function styledRoom(c,x,y,w,h,text,a,b){
 rect(c,x-4,y-4,w+8,h+8,'#4c5167');rect(c,x,y,w,h,a);
 for(let q=0;q<Math.floor(w/29);q++)for(let k=0;k<Math.floor(h/29);k++)if((q+k)%2===0)rect(c,x+q*29,y+k*29,28,28,b);
 rect(c,x+6,y+5,w-12,28,'#334960');label(c,text,x+w/2,y+25,'#fff8e1',12);
}
function universityRooms(c){
 // Two separated classrooms and a research centre occupying the entire lower wing.
 styledRoom(c,30,66,420,211,'01  •  SALA DE AULA', '#d8e5e5','#c0d9d9');
 styledRoom(c,510,66,420,211,'02  •  SALA DE AULA', '#d8e5e5','#c0d9d9');
 styledRoom(c,30,319,900,268,'03  •  CENTRO DE PESQUISA E LABORATÓRIO','#d4e1dc','#bdd6d0');
 rect(c,20,282,920,26,'#b5a68f');rect(c,225,268,55,16,'#efdfbd');rect(c,697,268,55,16,'#efdfbd');rect(c,447,307,65,18,'#efdfbd');
 for(const x of [52,534]){rect(c,x+26,114,330,56,'#48776b');rect(c,x+35,122,312,39,'#325d56');for(let k=0;k<3;k++){table(c,x+34+k*108,197,92,37);rect(c,x+58+k*108,177,35,17,'#688f9d')}}
 for(let i=0;i<3;i++){computer(c,70+i*184,423);computer(c,570+i*133,423)}
 drawBookcases(c,50,350,175,2);drawBookcases(c,737,350,165,2);table(c,351,521,260,47);plant(c,700,512);
 label(c,'PESQUISADOR  •  ENGENHEIRO  •  REFERÊNCIAS PARA OS GERENTES',480,574,'#eafbf4',10);
}
function worker(c,draw,x,y,name,skin,time,speech){
 draw(x,y,skin||{hair:1,skinTone:1,outfit:'#6d85bd',hat:0},'down',time/400,1.5);
 label(c,name,x,y-39,'#fff7d9',9);
 if(speech)label(c,speech,x,y+38,'#baffdf',8);
}
export function renderInterior(ctx,{service,world,jobs,civic,time,drawAgent,onBubble,tasks={},onActor}){
 const def=SERVICES[service];if(!def)return false;
 rect(ctx,0,0,960,648,'#243650');rect(ctx,17,17,926,593,'#937d70');rect(ctx,24,24,912,579,def.theme[0]);
 const agents=(civic.agents||[]).filter(a=>!a.projectId&&a.service===service);
 if(service==='university')universityRooms(ctx);
 else {
  const rooms=[{x:38,y:62,w:432,h:214},{x:490,y:62,w:430,h:214},{x:38,y:328,w:432,h:248},{x:490,y:328,w:430,h:248}];
  rooms.forEach((r,i)=>{
   styledRoom(ctx,r.x,r.y,r.w,r.h,def.rooms[i],def.theme[i%2],def.theme[(i+1)%2]);
   drawProp(ctx,def.props[i],r.x+12,r.y+16);
   rect(ctx,r.x+r.w/2-29,i<2?r.y+r.h-8:r.y,58,9,'#eedfbe');
  });
  rect(ctx,25,287,910,26,'#b2a187');
 }
 label(ctx,def.name+'  •  INTERIOR',480,41,'#fff4e3',13);
 // Staff are civic routines with their own identities and function-specific interaction.
 for(const staff of interiorStaff(service,tasks)){
  const x=staff.id==='librarian'?75+(Math.sin(time/1600)+1)*130:staff.x,y=staff.y;
  const busy=staff.service==='police'?tasks.police?.busy:staff.id==='researcher'?tasks.research?.busy:staff.id==='engineer'?tasks.engineer?.busy:false;
  worker(ctx,drawAgent,x,y,staff.name.toUpperCase(),{spriteIndex:staff.sprite},busy?time:0,busy?'TRABALHANDO':staff.role.toUpperCase());
  onActor?.({x,y,staff});
 }
 if(service==='cityhall'){const reminder=civic.reminders?.find(r=>!r.done);if(reminder&&onBubble)onBubble(ctx,480,186,reminder.message,245);}
 if(service==='police'&&!tasks.police?.busy)label(ctx,'POLICIAIS EM RONDA PELA CIDADE',690,512,'#baffdf',10);

 agents.slice(0,9).forEach((a,i)=>{
  const x=service==='university'?160+i%4*160:service==='library'?520+(i%3)*110:190+(i%4)*166;
  const y=service==='university'?523+(i>=4?35:0):i<4?525:560;
  const active=isWorking(a.id,jobs);onActor?.({x,y,agent:a});
  worker(ctx,drawAgent,x,y,a.name.toUpperCase(),a.skin,time+i*320,active?'IA EM MISSÃO':'PERFIL CADASTRADO');
 });
 label(ctx,'EQUIPE INSTITUCIONAL: AUTOMAÇÕES LOCAIS  •  IA SOMENTE QUANDO CONECTADA',480,628,'#f0e2c8',10);
 return true;
}
export function renderSpeechBubble(ctx,x,y,message,maxWidth=210){const line=String(message).slice(0,120);rect(ctx,x-maxWidth/2,y-24,maxWidth,54,'#32384e');rect(ctx,x-maxWidth/2+4,y-20,maxWidth-8,46,'#fff5d8');ctx.fillStyle='#343c54';ctx.textAlign='center';ctx.font='bold 11px monospace';const words=line.split(' ');let row='',rows=[];for(const w of words){if((row+' '+w).length>25){rows.push(row);row=w;}else row+=(row?' ':'')+w}if(row)rows.push(row);for(let i=0;i<Math.min(3,rows.length);i++)ctx.fillText(rows[i],x,y-4+i*13);rect(ctx,x-6,y+30,12,7,'#fff5d8')}
export function hasInterior(service){return Object.hasOwn(SERVICES,service)};
