const test=require('node:test');const assert=require('node:assert/strict');
const {createWorld,editWorld,intersects}=require('../world');
test('inicializa cidade com cinco predios e mapa 40x27',()=>{
 const world=createWorld();assert.equal(world.terrain.length,27);assert.equal(world.terrain[0].length,40);
 assert.equal(world.objects.filter(x=>x.kind==='office').length,5);
});
test('construcao, ruas, mover e apagar persistem no objeto do mapa',()=>{
 const world=createWorld();let r=world.revision;editWorld(world,{revision:r,x:0,y:0,tool:'road'});assert.equal(world.terrain[0][0],'road');
 editWorld(world,{revision:world.revision,x:0,y:16,tool:'house',name:'Casa A'});
 const house=world.objects.find(x=>x.kind==='house'&&x.x===0&&x.y===16);assert.equal(house.name,'Casa A');
 editWorld(world,{revision:world.revision,x:0,y:19,tool:'move',id:house.id});assert.equal(house.y,19);
 editWorld(world,{revision:world.revision,x:0,y:19,tool:'erase'});assert(!world.objects.some(x=>x.id===house.id));
});
test('predio novo recebe projeto e rejeita colisao e revisao obsoleta',()=>{
 const world=createWorld();const revision=world.revision;editWorld(world,{revision,x:0,y:14,tool:'office',name:'SanTTos AI Lab'});
 const lab=world.objects.find(o=>o.name==='SanTTos AI Lab');assert(lab.projectId.startsWith('projeto-'));
 assert.throws(()=>editWorld(world,{revision,x:1,y:1,tool:'road'}),/alterado/);
 assert.throws(()=>editWorld(world,{revision:world.revision,x:0,y:14,tool:'house'}),/ocupada/);
});
test('coordenadas malformadas e objetos fora do mapa sao bloqueados',()=>{
 const world=createWorld();assert.throws(()=>editWorld(world,{revision:world.revision,x:38,y:26,tool:'office'}),/fora/);
 assert.throws(()=>editWorld(world,{revision:world.revision,x:1.1,y:1,tool:'road'}),/inválida/);
 assert.equal(intersects({x:1,y:1,w:2,h:2},{x:3,y:3,w:2,h:2}),false);
});
