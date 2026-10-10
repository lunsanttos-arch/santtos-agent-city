const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const report = import('data:text/javascript;base64,' + fs.readFileSync(require('node:path').join(__dirname, '../public/mission-report.js')).toString('base64'));
test('mission report distinguishes approval, local changes and published PR', async () => {
  const {missionReport} = await report;
  assert.match(missionReport({status:'pending'}).next, /APROVAR/);
  assert.match(missionReport({status:'completed',changed:true}).next, /PUBLICAR PR/);
  assert.match(missionReport({status:'completed',changed:true,prUrl:'https://github.com/example/pr/1'}).next, /Abra o PR/);
  assert.match(missionReport({status:'completed',commitUrl:'https://github.com/owner/repo/commit/123'}).summary, /publicadas no GitHub/);
  assert.match(missionReport({status:'completed'}).summary, /Nenhuma alteração/);
  assert.match(missionReport({status:'completed',log:'tests passed'}).tests, /não confirma/);
});
test('mission report extracts a complete final report and surfaces failure without claiming success', async () => {
  const {missionReport} = await report;
  assert.equal(missionReport({log:'noise SANTTOS_RELATORIO_INICIO\nResultado: pronto\nSANTTOS_RELATORIO_FIM\nnoise'}).response, 'Resultado: pronto');
  assert.equal(missionReport({log:'SANTTOS_RELATORIO_INICIO parcial'}).response, '');
  const failed = missionReport({status:'failed',log:'ERRO: primeiro\nERRO: login necessário\n'});
  assert.equal(failed.error, 'login necessário');
  assert.match(failed.title, /Não foi possível/);
});
