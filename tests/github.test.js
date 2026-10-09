const test=require('node:test');const assert=require('node:assert/strict');
const {checkedRepo}=require('../github');
test('aceita somente owner/repo sem URLs externas ou injeções de argumentos',()=>{
 assert.equal(checkedRepo('lunsanttos-arch/santtos-redacao'),'lunsanttos-arch/santtos-redacao');
 for(const r of ['C:\\Projetos\\repo','/home/me/repo','https://evil.com/repo','owner/../repo','a/b.git','-flag/repo','owner/repo\n--delete','repo'])assert.throws(()=>checkedRepo(r));
});

test('lista todas as páginas de repositórios e preserva privados',()=>{
 const cp=require('node:child_process'),original=cp.spawnSync;
 try{cp.spawnSync=(command,args)=>{assert.equal(command,'gh');assert(args.includes('--paginate'));assert(args.includes('--jq'));return {status:0,stdout:[{full_name:'owner/one',private:true,default_branch:'dev'},{full_name:'owner/two',private:false}].map(r=>JSON.stringify(r)).join('\n')};};
 const repos=require('../github').listGithubRepos();assert.deepEqual(repos.map(r=>r.name),['owner/one','owner/two']);assert.equal(repos[0].private,true);assert.equal(repos[0].branch,'dev');
 }finally{cp.spawnSync=original;}
});

test('conectar informa instalação ausente sem pedir credenciais',()=>{
 const cp=require('node:child_process'),original=cp.spawnSync;
 try{cp.spawnSync=()=>({error:Error('ENOENT'),status:null});const gh=require('../github');assert.equal(gh.githubStatus().installed,false);assert.throws(()=>gh.connectGithub(),/winget install/);}finally{cp.spawnSync=original;}
});

test('conexão guiada extrai somente código de autorização e encerra a espera',()=>{
 const cp=require('node:child_process'),{EventEmitter}=require('node:events');const sync=cp.spawnSync,spawn=cp.spawn;
 const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};
 try{cp.spawnSync=(cmd,args)=>args[0]==='--version'?{status:0,stdout:'gh version'}:{status:1,stderr:'not logged in'};
 cp.spawn=(cmd,args)=>{assert.equal(cmd,'gh');assert(args.includes('--web'));return child;};
 const gh=require('../github');assert.equal(gh.connectGithub().pending,true);
 child.stderr.emit('data',Buffer.from('First copy your one-time code: ABCD-1234\nNever expose private credential contents'));
 const state=gh.githubStatus();assert.equal(state.code,'ABCD-1234');assert(!JSON.stringify(state).includes('private credential'));
 child.emit('close',0);assert.equal(gh.githubStatus().pending,false);assert.equal(gh.githubStatus().code,'');
 }finally{cp.spawnSync=sync;cp.spawn=spawn;child.emit('close',0);}
});
