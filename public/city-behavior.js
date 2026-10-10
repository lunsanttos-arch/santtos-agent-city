export const PROJECT_ROLES = [
 {key:'code',label:'Coder',role:'desenvolvimento',sprite:10,x:30,y:46,w:432,h:220},
 {key:'tester',label:'Tester',role:'tester',sprite:12,x:490,y:46,w:439,h:220}
];
export const PLAYER_SKIN = Object.freeze({player:true,spriteIndex:0});
export const STAFF = [
 {id:'secretary',name:'Secretária',role:'Secretária',service:'cityhall',sprite:1,x:244,y:224,task:'Organiza os lembretes e prioridades.'},
 {id:'works-secretary',name:'Secretário de Obras',role:'Secretário de Obras',service:'cityhall',sprite:9,x:704,y:224,task:'Recebe pedidos, cria funcionalidades e melhora a própria SanTTos City por missões de IA no repositório do aplicativo.'},
 {id:'librarian',name:'Bibliotecária',role:'Bibliotecária',service:'library',sprite:2,x:235,y:520,task:'Pesquisa e organiza o catálogo de repositórios.'},
 {id:'researcher',name:'Pesquisador',role:'Pesquisador',service:'university',sprite:3,x:388,y:507,task:'Busca novidades em repositórios públicos do GitHub.'},
 {id:'engineer',name:'Engenheiro',role:'Engenheiro',service:'university',sprite:4,x:601,y:507,task:'Analisa READMEs e envia sugestões aos Gerentes.'},
 {id:'receptionist',name:'Recepcionista',role:'Recepcionista',service:'talents',sprite:5,x:250,y:230,task:'Recebe visitantes e cadastra novos talentos.'},
 {id:'chief',name:'Delegado',role:'Delegado',service:'police',sprite:6,x:225,y:240,task:'Coordena a inspeção automática e entrega relatórios aos Gerentes.'},
 {id:'code-officer',name:'Policial de Código',role:'Policial de Código',service:'police',sprite:7,x:635,y:248,task:'Inspeciona padrões de risco nos códigos públicos dos projetos.'},
 {id:'credentials-officer',name:'Policial de Credenciais',role:'Policial de Credenciais',service:'police',sprite:8,x:700,y:514,task:'Verifica possíveis segredos, dependências e workflows.'}
];
export function roleOf(agent){
 return PROJECT_ROLES.find(r=>r.key===agent.projectRole)
   || PROJECT_ROLES.find(r=>r.label.toLowerCase()===String(agent.officeFunction||'').toLowerCase())
   || PROJECT_ROLES.find(r=>r.role===agent.role);
}
export function roleTitle(agent){return agent.officeFunction||({gestao:'Gerente',desenvolvimento:'Coder',obras:'Secretário de Obras',qa:'QA',tester:'Tester',ux:'UX',auxiliar:'Auxiliar',pesquisa:'Pesquisador',engenharia:'Engenheiro',secretaria:'Secretária',bibliotecaria:'Bibliotecária',recepcionista:'Recepcionista',seguranca:'Policial'})[agent.role]||agent.role;}
export function isWorking(agentId,jobs){return jobs.some(j=>j.agentId===agentId&&['running','waiting'].includes(j.status));}
export function distanceToBuilding(player,o){
 return Math.hypot(Math.max(o.x-player.x,0,player.x-(o.x+o.w)),Math.max(o.y-player.y,0,player.y-(o.y+o.h)));
}
export function canEnter(player,o){return distanceToBuilding(player,o)<=1.8;}
export function hitPerson(people,x,y){return [...people].reverse().find(p=>Math.abs(x-p.x)<=24&&(y>=p.y-32&&y<=p.y+30));}
export function interiorStaff(service,tasks={}){
 return STAFF.filter(a=>a.service===service&&(a.service!=='police'||a.id==='chief'||tasks.police?.busy));
}

export function canWalkCity(world,x,y,radius=.2){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x-radius<0||y-radius<0||x+radius>world.w||y+radius>world.h)return false;
 if(world.objects.some(o=>x+radius>o.x&&x-radius<o.x+o.w&&y+radius>o.y&&y-radius<o.y+o.h))return false;
 return [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]].every(([dx,dy])=>world.terrain[Math.floor(y+dy)]?.[Math.floor(x+dx)]&&world.terrain[Math.floor(y+dy)]?.[Math.floor(x+dx)]!=='water');
}
