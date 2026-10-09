const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {createWorld}=require('../world');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.addInitScript(()=>{window.timeOffset=0;window.names=[];const raf=window.requestAnimationFrame;window.requestAnimationFrame=f=>raf(t=>f(t+window.timeOffset));const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.names.push(text);return fill.call(this,text,...args)};});
 const world=createWorld(),office={id:'office',kind:'office',projectId:'test',name:'Teste',x:32,y:24,w:6,h:5},house={id:'home',kind:'house',name:'Casa',x:32,y:31,w:4,h:4};world.objects=[office,house];
 const agents=[{id:'idle',name:'Passeador',projectId:'test',projectRole:'manager',skin:{spriteIndex:9}},{id:'busy',name:'Trabalhador',projectId:'test',projectRole:'code',skin:{spriteIndex:10}}];
 await page.route('**/api/state',r=>r.fulfill({json:{world,jobs:[{id:'j',agentId:'busy',projectId:'test',status:'running',connected:false}],connections:{localCli:[]}}}));
 await page.route('**/api/civic',r=>r.fulfill({json:{agents,reminders:[]}}));await page.route('**/api/civic/departments',r=>r.fulfill({json:{tasks:{}}}));await page.route('**/api/github/repos',r=>r.fulfill({json:{repos:[]}}));
 await page.goto(process.env.SANTTOS_TEST_URL||'http://127.0.0.1:4317');await page.waitForTimeout(800);await page.evaluate(()=>{window.names=[];window.timeOffset=45000;});await page.waitForTimeout(500);
 let names=await page.evaluate(()=>window.names);assert(names.includes('Passeador'));assert(!names.includes('Trabalhador'));
 const water=await page.evaluate(async()=>{const {renderIsometric}=await import('/isometric.js');const c=document.createElement('canvas');c.width=960;c.height=648;const ctx=c.getContext('2d');const frame=time=>{ctx.clearRect(0,0,960,648);renderIsometric(ctx,{terrain:[['grass']],objects:[{kind:'fountain',x:0,y:0,w:3,h:3}],jobs:[],avatars:[],player:{x:0,y:0},drawPerson:()=>{},time});return c.toDataURL()};return frame(0)!==frame(450)});assert(water);
 await page.evaluate(()=>{window.timeOffset=0;});const box=await page.locator('#world').boundingBox();const center={x:598,y:644.5},p={x:530+(34-33)*17,y:92+(34+33)*8.5-40};await page.mouse.click(box.x+(480+(p.x-center.x)*1.16)*box.width/960,box.y+(324+(p.y-center.y)*1.16)*box.height/648);
 await page.waitForFunction(()=>document.querySelector('#sceneTitle').textContent==='INTERIOR DA CASA');await page.screenshot({path:'/tmp/santtos-house.png'});console.log('Visual OK: idle agents outside, working agents indoors, animated fountain and house interior.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
