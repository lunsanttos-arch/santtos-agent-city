const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const github=require('../github');
test('direct publication pushes an actual commit, supports retry and rejects stale missions',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'santtos-publish-test-')),original=cp.spawnSync;
  const remote=path.join(root,'remote.git'),seed=path.join(root,'seed'),work=path.join(root,'work');
  function git(args,cwd){const r=original('git',args,{cwd,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
  try{
    git(['init','--bare',remote]);git(['init','-b','main',seed]);
    fs.writeFileSync(path.join(seed,'file.txt'),'original');git(['add','-A'],seed);
    git(['-c','user.name=Test','-c','user.email=test@example.com','commit','-m','initial'],seed);
    git(['remote','add','origin',remote],seed);git(['push','origin','main'],seed);git(['clone','--branch','main',remote,work]);
    const baseCommit=git(['rev-parse','HEAD'],work),repo={name:'owner/repo',branch:'main',canPush:true};
    const job={workDir:work,baseCommit,prompt:'Melhorar relatório'};
    fs.writeFileSync(path.join(work,'file.txt'),'updated');
    let rejectPush=true;
    cp.spawnSync=(cmd,args,opts)=>{
      if(cmd==='git'&&args[0]==='push'){assert(!args.some(a=>a.includes('--force')));if(rejectPush)return {status:1,stderr:'branch protected'};}
      return original(cmd,args.map(a=>a==='https://github.com/owner/repo.git'?remote:a),opts);
    };
    assert.throws(()=>github.publishCommit(job,repo),/branch protected/);
    assert(job.commitSha);assert.equal(git(['rev-parse','refs/heads/main'],remote),baseCommit);
    rejectPush=false;const result=github.publishCommit(job,repo);
    assert.equal(git(['rev-parse','refs/heads/main'],remote),result.sha);
    assert.equal(github.publishCommit(job,repo).sha,result.sha);
    assert.equal(git(['rev-list','--count','main'],remote),'2');
    fs.writeFileSync(path.join(work,'file.txt'),'stale edit');
    assert.throws(()=>github.publishCommit({workDir:work,baseCommit,prompt:'stale'},repo),/recebeu alterações/);
    assert.equal(git(['rev-parse','refs/heads/main'],remote),result.sha);
    assert.throws(()=>github.publishCommit(job,{...repo,canPush:false}),/permissão/);
  }finally{cp.spawnSync=original;fs.rmSync(root,{recursive:true,force:true});}
});
