const test=require('node:test');const assert=require('node:assert/strict');
const {checkedRepo}=require('../github');
test('aceita somente owner/repo sem URLs externas ou injeções de argumentos',()=>{
 assert.equal(checkedRepo('lunsanttos-arch/santtos-redacao'),'lunsanttos-arch/santtos-redacao');
 for(const r of ['C:\\Projetos\\repo','/home/me/repo','https://evil.com/repo','owner/../repo','a/b.git','-flag/repo','owner/repo\n--delete','repo'])assert.throws(()=>checkedRepo(r));
});
