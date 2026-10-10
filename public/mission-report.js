// Reports use observed mission state; test results are never inferred from exit codes.
export function missionReport(job) {
  const states = {
    pending: ['Pronta para começar', 'A tarefa ainda não foi executada.', 'Clique em APROVAR para autorizar o agente.'],
    running: ['Agente trabalhando', 'O agente está executando sua solicitação.', 'Acompanhe aqui. O resultado aparecerá ao terminar.'],
    waiting: ['Precisa da sua atenção', 'O agente precisa de uma resposta para continuar.', 'Confira a tarefa e os detalhes técnicos para responder.'],
    failed: ['Não foi possível concluir', 'A execução encontrou um problema.', 'Confira o motivo abaixo. Depois de corrigir, crie uma nova missão.'],
    cancelled: ['Missão cancelada', 'A execução foi interrompida.', 'Alterações parciais podem existir. Crie uma nova missão se quiser continuar.'],
    completed: ['Execução encerrada', job.commitUrl ? 'As alterações foram publicadas no GitHub.' : job.changed ? 'Há alterações locais para você revisar.' : 'Nenhuma alteração local foi registrada.', job.commitUrl ? 'Clique em VER COMMIT para conferir as alterações publicadas.' : job.prUrl ? 'Abra o PR para revisar as alterações no GitHub.' : job.changed ? 'Clique em PUBLICAR COMMIT para enviar diretamente, ou PUBLICAR PR para revisão.' : 'Leia a resposta do agente e decida se precisa de uma nova tarefa.']
  };
  const [title, summary, next] = states[job.status] || ['Acompanhamento da missão', 'Confira o andamento da tarefa.', ''];
  const log = String(job.log || '').replace(/\x1b\[[0-9;]*m/g, '');
  const start = log.lastIndexOf('SANTTOS_RELATORIO_INICIO');
  const end = start >= 0 ? log.indexOf('SANTTOS_RELATORIO_FIM', start) : -1;
  const response = end > start ? log.slice(start + 'SANTTOS_RELATORIO_INICIO'.length, end).trim() : '';
  const error = job.status === 'failed' ? (log.match(/ERRO: ([^\n]+)/g) || []).at(-1)?.replace(/^ERRO: /, '') : '';
  return {title, summary, next, response, error, changes: job.changeSummary || '', tests: 'Os testes devem ser conferidos no relato do agente. A cidade não confirma automaticamente sua aprovação.'};
}

export function renderMissionReport(job, doc = document) {
  const report = missionReport(job), root = doc.createElement('section');
  root.className = 'mission-report';
  function add(tag, text, className) { const el = doc.createElement(tag); el.textContent = text; if (className) el.className = className; root.append(el); }
  add('h3', report.title); add('p', report.summary);
  if (job.publishDirect && !job.commitUrl && !job.prUrl) add('p', 'Publicação direta ativada para esta missão.');
  if (job.publicationError) { add('h4', 'Publicação pendente'); add('p', job.publicationError, 'report-error'); }
  if (report.error) { add('h4', 'O que aconteceu'); add('p', report.error, 'report-error'); }
  if (report.response) { add('h4', 'Relato do agente'); add('div', report.response, 'agent-response'); }
  else if (job.status === 'completed') add('p', 'Esta missão não trouxe um relato separado. Consulte a resposta nos detalhes técnicos.');
  if (report.changes) { add('h4', 'Arquivos alterados'); add('pre', report.changes); }
  if (job.status === 'completed') { add('h4', 'Validação'); add('p', report.tests); }
  add('h4', 'Próximo passo'); add('p', report.next);
  const details = doc.createElement('details'), label = doc.createElement('summary'), log = doc.createElement('pre');
  label.textContent = 'Detalhes técnicos'; log.textContent = job.log || 'Ainda não há saída do agente.';
  details.append(label, log); root.append(details); return root;
}
