const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','public','isometric.js'),'utf8');
const iso=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('projeção isométrica e inversa localizam o mesmo tile',async()=>{
 const {projectIso,unprojectIso}=await iso;
 for(const [x,y] of [[1,1],[5,4],[19,12],[39,26]]){
  const p=projectIso(x+.5,y+.5);const q=unprojectIso(p.x,p.y);assert.deepEqual(q,{x,y});
 }
});
test('hit test do telhado reconhece o prédio correto',async()=>{
 const {projectIso,hitIsoObject}=await iso;
 const objs=[{kind:'office',id:'A',x:5,y:4,w:5,h:4},{kind:'house',id:'B',x:25,y:19,w:3,h:3}];
 const p=projectIso(7.5,6,52);const b=hitIsoObject(objs,p.x,p.y);assert.equal(b?.id,'A');
});
