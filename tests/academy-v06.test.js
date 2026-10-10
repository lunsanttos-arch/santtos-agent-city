'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const civic=require('../civic');const academy=require('../academy');const security=require('../security');
function mockGithub(url){
 const pathname=new URL(url).pathname;
 if(pathname.endsWith('/search/repositories'))return {ok:true,status:200,json:async()=>({items:[{name:'playout-ideas',full_name:'santtos-samples/playout-ideas',private:false,archived:false,stargazers_count:355,language:'JavaScript',description:'Video automation and SRT player improvements'}]})};
 if(pathname.endsWith('/readme'))return {ok:true,status:200,json:async()=>({size:80,encoding:'base64',content:Buffer.from('# Video playout and SRT broadcast automation player\nRealtime streaming with low latency.').toString('base64')})};
 if(pathname.endsWith('/repos/santtos-samples/playout-ideas/'))return {ok:true,status:200,json:async()=>({private:false,default_branch:'main'})};
 if(pathname.includes('/git/trees/'))return {ok:true,status:200,json:async()=>({truncated:false,tree:[{type:'blob',path:'src/index.js',size:70}]})};
 if(pathname.endsWith('/contents/src/index.js'))return {ok:true,status:200,json:async()=>({size:50,encoding:'base64',content:Buffer.from('eval(input);').toString('base64')})};
 if(pathname.endsWith('/contents/package.json'))return {ok:true,status:200,json:async()=>({path:'package.json',size:80,encoding:'base64',content:Buffer.from('{"dependencies":{"dep":"latest"}}').toString('base64')})};
 if(pathname.endsWith('/contents/.github/workflows'))return {ok:false,status:404,json:async()=>({})};
 throw Error('Unexpected GitHub request '+url);
}
test('agente nasce persistido e recebe lotação em escritório sem criar sessão de IA',()=>{
 const agent=civic.addAgent({provider:'ollama',role:'engenharia',service:'university'});
 assert.ok(agent.skin&&agent.name);assert.equal(agent.projectId,null);
 const projectId='teste-'+randomUUID();const assigned=civic.assignAgent({agentId:agent.id,projectId,projectRole:'tester',officeFunction:'Tester'},[projectId,'radar']);
 assert.equal(assigned.projectId,projectId);assert.equal(civic.all().agents.find(a=>a.id===agent.id).officeFunction,'Tester');
 assert.throws(()=>civic.assignAgent({agentId:agent.id,projectId:'unknown'},['playout']));
 assert.equal(civic.assignAgent({agentId:agent.id,projectId:null},['playout']).projectId,null);
});
test('Pesquisador descobre projetos GitHub, organiza coleção e arquiva o catálogo',async()=>{
 const result=await academy.discover(mockGithub);
 assert.ok(result.repos.includes('santtos-samples/playout-ideas'));
 assert.ok(civic.all().collections.find(c=>c.name==='Achados da Universidade').repos.includes('santtos-samples/playout-ideas'));
});
test('Engenheiro lê README da Biblioteca e registra proposta na caixa do gerente',async()=>{
 const result=await academy.engineer([{name:'SanTTos Playout',projectId:'playout',github:{name:'owner/playout'}}],mockGithub);
 assert.ok(result.read>=1);
 assert.ok(civic.all().fileIndex.some(f=>f.repo==='santtos-samples/playout-ideas'));
 assert.ok(civic.all().suggestions.some(s=>s.projectId==='playout'&&s.repo==='santtos-samples/playout-ideas'));
});
test('Delegado consolida inspeções de dois policiais e registra ocorrências por projeto',async()=>{
 const result=await academy.policePatrol([{projectId:'playout',github:{name:'santtos-samples/playout-ideas'}}],mockGithub);
 assert.equal(result.analysed,1);
 const report=result.reports[0];assert.equal(report.officers.length,3);
 assert.ok(report.officers[0].findings.some(x=>x.id==='eval'));
 assert.ok(report.officers[1].findings.some(x=>x.id==='unpinned-dependency'));
 assert.equal(report.status,'enviado ao gerente');
});
test('Polícia detecta permissões elevadas, execuções remotas e versões não fixas',()=>{
 const report=security.inspectConfigFiles([{path:'package.json',content:'{"dependencies":{"a":"*"}}'},{path:'.github/workflows/check.yml',content:'permissions: write-all\non: pull_request_target:\nrun: curl https://example.com/install.sh | bash'}]);
 assert.ok(report.some(x=>x.id==='unpinned-dependency'));
 assert.ok(report.some(x=>x.id==='broad-permissions'));
 assert.ok(report.some(x=>x.id==='pr-target'));
 assert.ok(report.every(x=>!('snippet' in x)));
});
test('Pesquisa automática tem controles explícitos e sugestões exigem leitura humana',()=>{
 const original=civic.getSettings();
 try{assert.equal(civic.setAutomation('research',false).researchEnabled,false);assert.equal(civic.setAutomation('research',true).researchEnabled,true);assert.throws(()=>civic.setAutomation('shutdown',true));}
 finally{civic.setAutomation('research',original.researchEnabled);civic.setAutomation('police',original.policeEnabled)}
 const suggestion=civic.all().suggestions.find(s=>s.projectId==='playout');
 assert.ok(suggestion);assert.equal(civic.updateSuggestion(suggestion.id,'lida').status,'lida');
});
