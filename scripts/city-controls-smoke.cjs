// Browser coverage with API fixtures: no real login, repository link or AI mission.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createWorld,editWorld}=require('../world');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/civic',r=>r.fulfill({json:{agents:[],reminders:[]}}));
 const world=createWorld(),office=world.objects.find(o=>o.projectId==='playout');office.x=32;office.y=24;world.objects=[office];let connected=false,login=false,moves=0;
 await page.route('**/api/state',r=>r.fulfill({json:{world,jobs:[],connections:{github:connected,localCli:[]}}}));
 await page.route('**/api/github/repos',r=>r.fulfill({json:{repos:connected?[{name:'owner/project',branch:'main'}]:[]}}));
 await page.route('**/api/github/connect',r=>{login=true;return r.fulfill({json:{pending:true}})});
 await page.route('**/api/github/status',r=>r.fulfill({json:{installed:true,authenticated:connected,pending:!connected,code:'ABCD-1234',url:'https://github.com/login/device'}}));
 await page.route('**/api/map/edit',r=>{editWorld(world,r.request().postDataJSON());moves++;return r.fulfill({json:{world}})});
 await page.goto(process.env.SANTTOS_TEST_URL||'http://127.0.0.1:4317');await page.waitForFunction(()=>document.querySelector('#cursorInfo').textContent==='68 × 52');
 await page.click('#btnProjects');await page.locator('.project-entry').first().click();await page.click('#connectGithub');assert(login);await page.waitForFunction(()=>document.querySelector('#githubLogin').textContent.includes('ABCD-1234'));
 assert.equal(await page.locator('#githubLogin a').getAttribute('href'),'https://github.com/login/device');connected=true;
 await page.waitForFunction(()=>document.querySelector('#projectRepo').textContent.includes('owner/project'));assert.equal(await page.locator('#githubLogin').textContent(),'GitHub conectado.');
 await page.click('#zoomMap');assert.equal(await page.locator('#zoomValue').textContent(),'40%');for(let i=0;i<4;i++)await page.click('#zoomOut');assert.equal(await page.locator('#zoomValue').textContent(),'25%');await page.click('#zoomPlayer');
 await page.click('#btnEditor');await page.click('#toolMove');
 const center={x:530+(34.5-30.5)*17,y:92+65*8.5},p={x:530+(office.x+3-office.y-2.5)*17,y:92+(office.x+3+office.y+2.5)*8.5-60};
 const box=await page.locator('#world').boundingBox();await page.mouse.click(box.x+(480+(p.x-center.x)*1.16)*box.width/960,box.y+(324+(p.y-center.y)*1.16)*box.height/648);
 await page.waitForFunction(()=>!document.querySelector('#moveControls').classList.contains('hidden'));
 const x=office.x;await page.click('[data-nudge="0.25,0"]');await page.waitForFunction(()=>document.querySelector('#movePosition').textContent.includes('32.25'));assert.equal(office.x,x+.25);assert.equal(moves,1);
 await page.screenshot({path:'/tmp/santtos-controls.png'});assert.deepEqual(errors,[]);
 console.log('City controls OK: guided GitHub authorization, repository refresh, 25% zoom and persisted quarter-tile move.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
