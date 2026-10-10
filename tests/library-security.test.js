const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const security=require('../security');
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'santtos-library-test-'));
 for(const file of ['civic.js','security.js','academy.js'])fs.copyFileSync(path.join(__dirname,'..',file),path.join(dir,file));
 return {dir,civic:require(path.join(dir,'civic.js')),academy:require(path.join(dir,'academy.js'))};
}
function mockSource(source,{failed=false,empty=false}={}){
 return async url=>{
  assert.equal(new URL(url).hostname,'api.github.com');
  if(url.endsWith('/'))return {ok:true,json:async()=>({private:false,default_branch:'main'})};
  if(url.includes('/git/trees/'))return {ok:true,json:async()=>({sha:'revision-one',tree:empty?[]:[{type:'blob',path:'src/auth.js',size:200}]})};
  if(failed)return {ok:false,status:404};
  return {ok:true,json:async()=>({encoding:'base64',content:Buffer.from(source).toString('base64')})};
 };
}
test('incoming library repositories receive persistent risk findings without storing secrets',async()=>{
 const {dir,civic,academy}=fixture();try{
  const c=civic.addCollection({name:'Entrada'});civic.addRepoToCollection({collectionId:c.id,repo:'owner/repo'});
  const secret='ghp_'+'a'.repeat(30),r=await academy.reviewLibraryRepo('owner/repo',mockSource(`const token="${secret}";`));
  assert.equal(r.verdict,'quarantine');assert.equal(r.revision,'revision-one');assert(r.findings.some(f=>f.id==='public-token'));
  assert(!fs.readFileSync(path.join(dir,'data/civic.json'),'utf8').includes(secret));
  const engineer=await academy.engineer([{projectId:'video',name:'video',github:{name:'owner/video'}}],()=>{throw Error('Quarantined repository must not be read');});assert.equal(engineer.read,0);
  const again=await academy.reviewLibraryRepo('owner/repo',mockSource('const safe=1;'));
  assert.equal(again.verdict,'partial');assert.match(again.summary,/não comprova/);assert.equal(civic.all().libraryReviews.length,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('unreadable, unavailable and empty repositories never receive a clean verdict',async()=>{
 const {dir,academy}=fixture();try{
  assert.equal((await academy.reviewLibraryRepo('owner/unreadable',mockSource('',{failed:true}))).verdict,'incomplete');
  assert.equal((await academy.reviewLibraryRepo('owner/empty',mockSource('',{empty:true}))).verdict,'incomplete');
  assert.equal((await academy.reviewLibraryRepo('owner/offline',async()=>{throw Error('network unavailable');})).verdict,'unavailable');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('inspection prioritizes security files and configurations within the 18-file budget',async()=>{
 const tree=[...Array.from({length:22},(_,i)=>({type:'blob',path:`src/feature${i}.js`,size:10})),{type:'blob',path:'src/password.js',size:50},{type:'blob',path:'.github/workflows/run.yml',size:50}];
 const read=[];
 const report=await security.reviewPublicRepo('owner/repo',async url=>{
  if(url.endsWith('/'))return {ok:true,json:async()=>({private:false,default_branch:'main'})};
  if(url.includes('/git/trees/'))return {ok:true,json:async()=>({tree})};
  const file=new URL(url).pathname.split('/contents/')[1];read.push(file);
  return {ok:true,json:async()=>({encoding:'base64',content:Buffer.from(file.includes('workflows')?'permissions: write-all':"createHash('md5');").toString('base64')})};
 });
 assert.equal(report.filesCandidate,24);assert.equal(report.filesReviewed,18);assert(read.includes('src/password.js'));assert(read.includes('.github/workflows/run.yml'));assert(report.findings.some(f=>f.id==='broad-permissions'));
});
test('security rules flag password, TLS and data destruction patterns with metadata only',()=>{
 const source=`localStorage.setItem('password', value);\ncreateHash('sha1');\nconst tls={rejectUnauthorized:false};\nconst sql='DROP DATABASE app';\n-----BEGIN PRIVATE KEY-----`;
 const findings=security.scanSource(source,'security.js');
 for(const id of ['password-storage','weak-crypto','tls-disabled','destructive-command','private-key'])assert(findings.some(f=>f.id===id));
 assert(findings.every(f=>!('snippet' in f)&&!('source' in f)));
});
