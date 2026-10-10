'use strict';
// Public GitHub code review for common patterns. Read-only, bounded, and heuristic;
// it is not a substitute for SAST, dependency scanning, or manual review.
const MAX_FILES=18;
const RULES=[
 {id:'private-key',severity:'high',re:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,message:'Chave privada exposta: remover e revogar a credencial'},
 {id:'public-token',severity:'high',re:/\bgh[pousr]_[a-zA-Z0-9]{20,}\b/,message:'Possível token GitHub exposto: revogar e verificar acessos'},
 {id:'password-literal',severity:'high',re:/\b(?:password|senha)\s*[:=]\s*['"][^'"\s]+['"]/i,message:'Possível senha fixa no código: retirar e usar gestão adequada de credenciais'},
 {id:'password-storage',severity:'high',re:/\b(?:localStorage|sessionStorage)\.setItem\s*\(\s*['"](?:password|senha)['"]|\b(?:password|senha)\s*[:=]\s*(?:req\.(?:body|query)|request\.(?:form|json))\b/i,message:'Possível armazenamento de senha sem proteção: verificar hash apropriado e fluxo de autenticação'},
 {id:'tls-disabled',severity:'high',re:/rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|verify\s*=\s*False/,message:'Verificação TLS desativada: risco de interceptação de dados e credenciais'},
 {id:'destructive-command',severity:'high',re:/\brm\s+-rf\s+(?:\/|\$)|\bDROP\s+(?:DATABASE|TABLE)\b|\bTRUNCATE\s+TABLE\b/i,message:'Operação destrutiva: verificar autorização, escopo e possibilidade de recuperar os dados'},
 {id:'hardcoded-secret',severity:'high',re:/\b(?:api[_-]?key|access[_-]?token|secret[_-]?key|password)\s*[:=]\s*['"][^'"\s]{12,}['"]/i,message:'Possível segredo fixo no código'},
 {id:'shell',severity:'medium',re:/\b(?:exec|execSync|spawnSync)\s*\(/,message:'Execução de comandos: validar entrada'},
 {id:'eval',severity:'medium',re:/\beval\s*\(/,message:'Uso de eval: verificar entrada e remover se possível'},
 {id:'weak-crypto',severity:'medium',re:/\b(?:md5|sha1)\s*\(|createHash\s*\(\s*['"](?:md5|sha1)['"]/i,message:'Hash antigo: inadequado para senhas; verificar finalidade e usar algoritmo apropriado'},
 {id:'innerHTML',severity:'medium',re:/\.innerHTML\s*=/,message:'HTML dinâmico: investigar riscos de XSS'}
];
function scanSource(source,filename){const findings=[];for(const [i,line] of String(source).split(/\r?\n/).entries()){if(line.length>8000)continue;for(const rule of RULES){if(rule.re.test(line)){findings.push({file:filename,line:i+1,id:rule.id,severity:rule.severity,message:rule.message});if(findings.length>=30)return findings;}}}return findings;}
function validRepo(name){return typeof name==='string'&&/^[a-z\d][a-z\d_.-]*\/[a-z\d][a-z\d_.-]*$/i.test(name)&&name.length<150&&!name.includes('..')&&!name.endsWith('.git');}
async function reviewPublicRepo(repo,fetchImpl=fetch){
 if(!validRepo(repo))throw Error('Nome do repositório inválido');
 const headers={'Accept':'application/vnd.github+json','User-Agent':'SanTTos-Agent-City'};
 async function getApi(path){const response=await fetchImpl('https://api.github.com/repos/'+repo+'/'+path,{headers,signal:AbortSignal.timeout(9000)});if(!response.ok)throw Error('API GitHub '+response.status+' — repositório público não disponível ou limite atingido');return response.json();}
 const info=await getApi('');if(info.private)throw Error('Auditoria pública não pode acessar repositórios privados');
 const branch=encodeURIComponent(info.default_branch||'main');const tree=await getApi('git/trees/'+branch+'?recursive=1');
 if(tree.truncated)throw Error('Árvore muito grande; auditoria incompleta. Escopo menor necessário');
 const candidates=(tree.tree||[]).filter(f=>f.type==='blob'&&f.size<=35000&&(/\.(?:js|jsx|ts|tsx|py|sh|go|rs|php|java|rb|pem|key)$/.test(f.path)||/(?:^|\/)\.env(?:\.[\w-]+)?$/.test(f.path)||f.path==='package.json'||/^\.github\/workflows\/[^/]+\.ya?ml$/.test(f.path))&&!/(^|\/)(node_modules|dist|build|vendor|\.git|tests|test|__tests__)\//.test(f.path));
 const priority=f=>/(?:password|auth|login|security|database|backup|\.env|\.pem|\.key|package\.json|\.github)/i.test(f.path)?0:1;
 const sources=candidates.sort((a,b)=>priority(a)-priority(b)||a.path.localeCompare(b.path)).slice(0,MAX_FILES);
 const findings=[],skipped=[];let reviewed=0;for(const file of sources){try{const result=await getApi(file.sha?'git/blobs/'+encodeURIComponent(file.sha):'contents/'+file.path.split('/').map(encodeURIComponent).join('/')+'?ref='+branch);if(result.encoding!=='base64'||!result.content){skipped.push(file.path);continue;}const text=Buffer.from(result.content,'base64').toString('utf8');findings.push(...scanSource(text,file.path),...inspectConfigFiles([{path:file.path,content:text}]));reviewed++;}catch(e){if(String(e.message).includes('403'))throw e;skipped.push(file.path);}}
 return {repo,revision:tree.sha||null,filesReviewed:reviewed,filesCandidate:candidates.length,filesSkipped:skipped.length,findings:findings.sort((a,b)=>({high:0,medium:1,low:2}[a.severity])-({high:0,medium:1,low:2}[b.severity])).slice(0,75),status:'triagem parcial',note:'Inspeção estática de até 18 arquivos públicos pequenos, priorizando segurança e configurações. Não executa código nem confirma ausência de vulnerabilidades; dependências, permissões em produção e recuperação de backups exigem verificação adicional.'};
}
module.exports={scanSource,reviewPublicRepo,validRepo};

// Inspect only files in an approved mission's temporary clone. Never follows symlinks
// or executes the analyzed code, and stores finding metadata rather than source text.
function reviewWorkspace(dir){
 const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
 const root=fs.realpathSync(dir);
 const listing=cp.spawnSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{cwd:root,encoding:'utf8',timeout:5000,maxBuffer:1024*1024});
 if(listing.status!==0)throw Error('Não foi possível listar os arquivos da missão');
 const files=[...new Set(listing.stdout.split('\0').filter(Boolean))];
 const findings=[],configs=[];let reviewed=0;
 for(const filename of files){
  if(/(^|\/)(node_modules|dist|build|vendor|tests|test|__tests__)\//.test(filename))continue;
  const source=/\.(js|jsx|ts|tsx|py|sh|go|rs|php|java|rb)$/.test(filename);
  const config=filename==='package.json'||/^\.github\/workflows\/[^/]+\.ya?ml$/.test(filename);
  if((!source||reviewed>=MAX_FILES)&&(!config||configs.length>=5))continue;
  const full=path.resolve(root,filename);
  if(!full.startsWith(root+path.sep)||!fs.existsSync(full))continue;
  const stat=fs.lstatSync(full);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>(config?90000:35000))continue;
  if(!fs.realpathSync(full).startsWith(root+path.sep))continue;
  const content=fs.readFileSync(full,'utf8');
  if(source&&reviewed<MAX_FILES){findings.push(...scanSource(content,filename));reviewed++;}
  if(config&&configs.length<5)configs.push({path:filename,content});
 }
 return {filesReviewed:reviewed,findings:findings.slice(0,75),configFiles:configs.length,configFindings:inspectConfigFiles(configs)};
}
module.exports.reviewWorkspace=reviewWorkspace;

// Complementary inspection by the second officer: dependencies and GitHub workflows.
function inspectConfigFiles(files){
 const findings=[];
 for(const item of files){
  const content=String(item.content||'').slice(0,90000),lines=content.split(/\r?\n/),file=item.path;
  if(file==='package.json'){
   try{const pkg=JSON.parse(content);for(const [name,version] of Object.entries({...pkg.dependencies,...pkg.devDependencies})){
    if(/^(?:\*|latest|https?:|git\+|file:)/.test(String(version)))findings.push({file,line:1,id:'unpinned-dependency',severity:'medium',message:'Dependência sem versão fixa ou remota: '+String(name).slice(0,70)});
   }}catch{findings.push({file,line:1,id:'invalid-manifest',severity:'low',message:'package.json não pôde ser interpretado'});}
  }
  if(/\.github\/workflows\/.+\.ya?ml$/.test(file)){
   for(const [i,line] of lines.entries()){
    if(/\bpermissions\s*:\s*write-all\b/.test(line))findings.push({file,line:i+1,id:'broad-permissions',severity:'high',message:'Workflow com permissões globais de escrita'});
    if(/\bpull_request_target\s*:/.test(line))findings.push({file,line:i+1,id:'pr-target',severity:'medium',message:'Workflow pull_request_target: conferir checkout de código não confiável'});
    if(/curl\s+.*\|\s*(?:bash|sh)\b/.test(line))findings.push({file,line:i+1,id:'pipe-shell',severity:'medium',message:'Script remoto executado diretamente no shell'});
   }
  }
 }
 return findings.slice(0,40);
}
async function reviewPublicConfig(repo,fetchImpl=fetch){
 if(!validRepo(repo))throw Error('Repositório inválido');
 const headers={'Accept':'application/vnd.github+json','User-Agent':'SanTTos-Agent-City'};
 const files=[];
 async function get(path){const r=await fetchImpl('https://api.github.com/repos/'+repo+'/contents/'+path,{headers,signal:AbortSignal.timeout(8000)});if(r.status===404)return null;if(!r.ok)throw Error('GitHub HTTP '+r.status);return r.json();}
 for(const filename of ['package.json','.github/workflows']){
  const listing=await get(filename);if(!listing)continue;
  const selected=Array.isArray(listing)?listing.filter(x=>x.type==='file'&&/\.ya?ml$/.test(x.path)).slice(0,4):[listing];
  for(const item of selected){if(item.size>90000)continue;const result=item.content?item:await get(item.path);if(result?.encoding==='base64'&&result.content){files.push({path:item.path,content:Buffer.from(result.content,'base64').toString('utf8')});}}
 }
 return {files:files.map(x=>x.path),findings:inspectConfigFiles(files)};
}
module.exports.inspectConfigFiles=inspectConfigFiles;
module.exports.reviewPublicConfig=reviewPublicConfig;
