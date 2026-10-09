'use strict';
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const REPO = /^[a-z\d](?:[a-z\d_.-]{0,99})\/[a-z\d_.-]{1,100}$/i;
function checkedRepo(fullName) {
  if (typeof fullName !== 'string' || !REPO.test(fullName) || fullName.includes('..') || fullName.endsWith('.git')) throw new Error('Escolha um repositório GitHub válido');
  return fullName;
}
function invoke(cmd,args,{cwd,timeout=15000}={}) {
  const r=cp.spawnSync(cmd,args,{cwd,encoding:'utf8',windowsHide:true,timeout,maxBuffer:2*1024*1024,env:{...process.env,GH_PROMPT_DISABLED:'1',GIT_TERMINAL_PROMPT:'0'}});
  if(r.error || r.status!==0) throw new Error((r.stderr||r.stdout||r.error?.message||`Falha ${cmd}`).trim().slice(0,340));
  return (r.stdout||'').trim();
}
function hasGithubAuth(){try{invoke('gh',['auth','status','--hostname','github.com'],{timeout:8000});return true;}catch{return false;}}
function listGithubRepos(){
  const arr=JSON.parse(invoke('gh',['api','user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member'],{timeout:20000}));
  if(!Array.isArray(arr))throw Error('Resposta inesperada do GitHub');
  return arr.filter(r=>REPO.test(r.full_name)).map(r=>({name:r.full_name,private:!!r.private,branch:r.default_branch||'main',url:r.html_url}));
}
function lookupGithubRepo(name){
  const full=checkedRepo(name);
  const r=JSON.parse(invoke('gh',['api',`repos/${full}`],{timeout:14000}));
  if(r.full_name?.toLowerCase()!==full.toLowerCase())throw Error('Repositório não encontrado');
  if(r.archived || r.disabled)throw Error('Repositório arquivado ou desativado');
  if(!r.permissions?.push)throw Error('É necessário acesso de escrita ao repositório para publicar um PR');
  return {name:r.full_name,branch:r.default_branch||'main',url:r.html_url};
}
function cloneForJob(repo, id){
  checkedRepo(repo.name);
  const workspace=fs.mkdtempSync(path.join(os.tmpdir(),'santtos-github-'));
  const dir=path.join(workspace,'repo');
  try{
    invoke('gh',['repo','clone',repo.name,dir,'--','--depth','1','--branch',repo.branch],{timeout:120000});
    // O agente não deve publicar; só uma segunda ação explícita pode criar o PR.
    invoke('git',['remote','set-url','--push','origin','DISABLED_BY_SANTTOS_CITY'],{cwd:dir});
    return {workspace,dir};
  }catch(e){fs.rmSync(workspace,{recursive:true,force:true});throw e;}
}
function hasChanges(dir){return !!invoke('git',['status','--porcelain'],{cwd:dir,timeout:10000});}
function diffSummary(dir){return invoke('git',['diff','--stat'],{cwd:dir})+'\n'+invoke('git',['status','--short'],{cwd:dir});}
function publishPR(j,repo){
  if(!j.workDir||!fs.existsSync(j.workDir))throw Error('Workspace temporário da missão não encontrado');
  const dir=j.workDir; if(!hasChanges(dir))throw Error('A missão não modificou arquivos');
  const branch='santtos-agent/'+j.id.slice(0,8);
  invoke('git',['checkout','-b',branch],{cwd:dir});
  invoke('git',['add','-A'],{cwd:dir});
  invoke('git',['-c','user.name=SanTTos Agent City','-c','user.email=santtos-agent@users.noreply.github.com','commit','-m',`Agent City: ${j.prompt.replace(/\s+/g,' ').slice(0,65)}`],{cwd:dir});
  invoke('git',['remote','set-url','--push','origin',`https://github.com/${checkedRepo(repo.name)}.git`],{cwd:dir});
  invoke('git',['push','-u','origin',branch],{cwd:dir,timeout:120000});
  const url=invoke('gh',['pr','create','--repo',repo.name,'--base',repo.branch,'--head',branch,'--title',`SanTTos Agent City: ${j.prompt.slice(0,65)}`,'--body',`Mudanças propostas pela missão ${j.id}.\n\nRevisar o diff e os testes antes de aprovar o merge.`, '--draft'],{cwd:dir,timeout:60000});
  return url.match(/https:\/\/github\.com\/\S+/)?.[0]||url;
}
module.exports={checkedRepo,hasGithubAuth,listGithubRepos,lookupGithubRepo,cloneForJob,hasChanges,diffSummary,publishPR,invoke};
