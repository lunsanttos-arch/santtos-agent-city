// Optional browser tests with deterministic API fixtures; never executes real AI missions.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createWorld}=require('../world');
const roles=[['manager','Gerente',9],['code','Código',10],['qa','QA',11],['tester','Tester',12],['ux','UX',13],['assistant','Auxiliar',14]];
const agents=roles.map(([projectRole,officeFunction,spriteIndex])=>({id:projectRole,name:'Equipe '+officeFunction,projectRole,officeFunction,role:projectRole,projectId:'playout',provider:'codex',agentType:projectRole==='manager'?'agent':'subagent',managerId:projectRole==='manager'?null:'manager',skin:{spriteIndex}}));
const civic={agents,reminders:[],collections:[],profiles:[],fileIndex:[],discoveries:[],suggestions:[],policeReports:[],lessons:[],settings:{policeEnabled:true,researchEnabled:true}};
const world=createWorld();
const office={id:'office',projectId:'playout',kind:'office',name:'Projeto de Teste',x:32,y:24,w:6,h:5};
const far={...office,id:'far',projectId:'far',name:'Escritório Distante',x:44,y:34};
async function clickCanvas(page,x,y){const box=await page.locator('#world').boundingBox();await page.mouse.click(box.x+x*box.width/960,box.y+y*box.height/648);}
async function clickBuilding(page,o){
 const project=(x,y,z=0)=>({x:530+(x-y)*17,y:92+(x+y)*8.5-z});
 const center=project(34.5,30.5),p=project(o.x+o.w/2,o.y+o.h/2,60);
 await clickCanvas(page,480+(p.x-center.x)*1.16,324+(p.y-center.y)*1.16);
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  async function pageFor(objects,jobs=[]){
   const page=await browser.newPage({viewport:{width:1440,height:900}});
   await page.addInitScript(()=>{
    window.spriteCells=[];const draw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(image,sx,sy,...args){if(image?.src?.endsWith('/staff-atlas.png'))window.spriteCells.push([sx,sy]);return draw.call(this,image,sx,sy,...args);};
   });
   const fixture={world:{...world,objects},jobs,connections:{github:false,manus:false,ollama:false,localCli:[]}};
   await page.route('**/api/state',r=>r.fulfill({json:fixture}));
   await page.route('**/api/civic',r=>r.fulfill({json:civic}));
   await page.route('**/api/civic/departments',r=>r.fulfill({json:{tasks:{police:{busy:false},research:{busy:false},engineer:{busy:false}}}}));
   await page.route('**/api/github/repos',r=>r.fulfill({json:{repos:[]}}));
   await page.goto('http://127.0.0.1:4317');
   await page.waitForFunction(()=>document.getElementById('cursorInfo').textContent==='68 × 52');
   await page.waitForTimeout(350);return page;
  }
  const distant=await pageFor([far]);await clickBuilding(distant,far);
  assert.equal(await distant.locator('#sceneTitle').textContent(),'CIDADE SANTTOS');
  assert.match(await distant.locator('#toast').textContent(),/entrada|Aproxime/);await distant.close();
  const job={id:'test-job',agentId:'code',provider:'codex',projectId:'playout',status:'running',connected:false,prompt:'Teste visual',phase:'iniciando',log:''};
  const page=await pageFor([office],[job]);
  assert(!(await page.evaluate(()=>window.spriteCells.some(([x,y])=>x===680&&y===671)))); // Project workers stay indoors.
  await clickBuilding(page,office);await page.waitForTimeout(200);
  assert.equal(await page.locator('#sceneTitle').textContent(),'PROJETO DE TESTE');
  assert(await page.evaluate(()=>window.spriteCells.some(([x,y])=>x===680&&y===671)));
  await clickCanvas(page,478,400); // Empty part of UX room, not a provider hotspot.
  assert.equal(await page.locator('#agentPick').inputValue(),'ux');
  assert.equal(await page.locator('#provider').inputValue(),'codex');
  assert.match(await page.locator('#toast').textContent(),/UX selecionado/);
  await clickCanvas(page,170,209);
  assert.equal(await page.locator('#serviceContent h2').textContent(),'Equipe Gerente');
  assert.equal(await page.locator('#serviceContent .civic-subtitle').textContent(),'Gerente');
  await page.locator('#closeService').click();
  await clickCanvas(page,478,209);
  assert.equal(await page.locator('#serviceContent .civic-subtitle').textContent(),'Código');
  assert.match(await page.locator('#serviceContent').textContent(),/SUBAGENTE|Trabalhando dentro/);
  await page.close();
  for(const [service,x,y,title,action] of [['university',388,507,'Pesquisador','BUSCAR NOVIDADES NO GITHUB'],['university',601,507,'Engenheiro','ANALISAR READMES DA BIBLIOTECA'],['talents',250,230,'Recepcionista','CADASTRAR TALENTO']]){
   const obj={id:service,kind:'service',service,name:service,x:32,y:23,w:6,h:6};
   const p=await pageFor([obj]);await clickBuilding(p,obj);await p.waitForTimeout(100);
   await clickCanvas(p,x,y);assert.equal(await p.locator('#serviceContent h2').textContent(),title);
   await p.getByRole('button',{name:action,exact:true}).waitFor();
   if(title==='Pesquisador')assert.equal(await p.getByRole('button',{name:'ANALISAR READMES DA BIBLIOTECA',exact:true}).count(),0);
   await p.close();
  }
  console.log('City behavior OK: proximity, indoor missions, role rooms, manager hierarchy and individual staff interactions.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
