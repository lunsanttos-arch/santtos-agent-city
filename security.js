'use strict';
// Public GitHub code review for common patterns. Read-only, bounded, and heuristic;
// it is not a substitute for SAST, dependency scanning, or manual review.
const MAX_FILES=18;
const RULES=[
 {id:'hardcoded-secret',severity:'high',re:/\b(?:api[_-]?key|access[_-]?token|secret[_-]?key|password)\s*[:=]\s*['"][^'"\s]{12,}['"]/i,message:'Possível segredo fixo no código'},
 {id:'shell',severity:'medium',re:/\b(?:exec|execSync|spawnSync)\s*\(/,message:'Execução de comandos: validar entrada'},
 {id:'eval',severity:'medium',re:/\beval\s*\(/,message:'Uso de eval: verificar entrada e remover se possível'},
 {id:'weak-crypto',severity:'low',re:/\b(?:md5|sha1)\s*\(/i,message:'Uso de hash antigo: revisar finalidade'},
 {id:'innerHTML',severity:'medium',re:/\.innerHTML\s*=/,message:'HTML dinâmico: investigar riscos de XSS'}
];
function scanSource(source,filename){const findings=[];for(const [i,line] of String(source).split(/\r?\n/).entries()){if(line.length>8000)continue;for(const rule of RULES){if(rule.re.test(line)){findings.push({file:filename,line:i+1,id:rule.id,severity:rule.severity,message:rule.message});if(findings.length>=30)return findings;}}}return findings;}
function validRepo(name){return /^[\w.-]+\/[\w.-]+$/.test(name)&&name.length<150;}
async function reviewPublicRepo(repo,fetchImpl=fetch){
 if(!validRepo(repo))throw Error('Nome do repositório inválido');
 const headers={'Accept':'application/vnd.github+json','User-Agent':'SanTTos-Agent-City'};
 async function getApi(path){const response=await fetchImpl('https://api.github.com/repos/'+repo+'/'+path,{headers,signal:AbortSignal.timeout(9000)});if(!response.ok)throw Error('API GitHub '+response.status+' — repositório público não disponível ou limite atingido');return response.json();}
 const info=await getApi('');if(info.private)throw Error('Auditoria pública não pode acessar repositórios privados');
 const branch=encodeURIComponent(info.default_branch||'main');const tree=await getApi('git/trees/'+branch+'?recursive=1');
 if(tree.truncated)throw Error('Árvore muito grande; auditoria incompleta. Escopo menor necessário');
 const sources=(tree.tree||[]).filter(f=>f.type==='blob'&&f.size<=35000&&/\.(?:js|jsx|ts|tsx|py|sh|go|rs|php|java|rb)$/.test(f.path)&&!/(^|\/)(node_modules|dist|build|vendor|\.git|tests|test|__tests__)\//.test(f.path)).slice(0,MAX_FILES);
 const findings=[];let reviewed=0;for(const file of sources){try{const result=await getApi('contents/'+file.path.split('/').map(encodeURIComponent).join('/')+'?ref='+branch);if(result.encoding!=='base64'||!result.content)continue;const text=Buffer.from(result.content,'base64').toString('utf8');findings.push(...scanSource(text,file.path));reviewed++;}catch(e){if(String(e.message).includes('403'))throw e;}}
 return {repo,filesReviewed:reviewed,filesCandidate:sources.length,findings:findings.slice(0,75),status:'triagem parcial',note:'Heurística de até 18 arquivos públicos pequenos. Não é auditoria completa nem prova de segurança.'};
}
module.exports={scanSource,reviewPublicRepo,validRepo};
