// Report module-load failures instead of leaving an unexplained green canvas.
function showStartupError(error) {
  console.error('Falha na inicialização da cidade:', error);
  const toast = document.getElementById('toast');
  toast.textContent = 'Não foi possível iniciar a cidade: ' + error.message + '. Reabra a versão atual pelo .bat e consulte F12 para detalhes.';
  toast.classList.remove('hidden');
}
window.addEventListener('unhandledrejection', event => showStartupError(event.reason instanceof Error ? event.reason : new Error(String(event.reason))));
import('./app.js').catch(showStartupError);
