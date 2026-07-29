const SPECIAL_ROUTES = new Map([
  ['perfil', 'hubProfilePage'],
  ['configuracoes/corretora', 'companySettingsPage'],
  ['configuracoes-corretora', 'companySettingsPage']
]);

let observador = null;
let recuperacaoAgendada = false;
let ultimaChave = '';
let tentativas = 0;

function obterBaseHub(pathname = window.location.pathname || '/') {
  return pathname === '/hub' || pathname.startsWith('/hub/') ? '/hub' : '';
}

function obterRotaAtual() {
  const pathname = window.location.pathname || '/';
  const base = obterBaseHub(pathname);
  const rota = base ? pathname.slice(base.length) : pathname;

  return rota
    .replace(/^\/+|\/+$/g, '')
    .replace(/^index\.html$/i, '')
    .toLowerCase();
}

function obterDatasetEsperado() {
  return SPECIAL_ROUTES.get(obterRotaAtual()) || '';
}

function appMostrouModuloIndisponivel() {
  const texto = document.getElementById('app')?.textContent || '';
  return texto.includes('Módulo indisponível') || texto.includes('Modulo indisponivel');
}

function appEstaNaPaginaEspecial(datasetEsperado) {
  return document.getElementById('app')?.dataset?.[datasetEsperado] === 'true';
}

function resetarTentativasSeRotaMudou() {
  const chave = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (chave === ultimaChave) return;

  ultimaChave = chave;
  tentativas = 0;
}

function recuperarRotaEspecial() {
  resetarTentativasSeRotaMudou();

  const datasetEsperado = obterDatasetEsperado();
  if (!datasetEsperado) return;
  if (appEstaNaPaginaEspecial(datasetEsperado)) return;
  if (!appMostrouModuloIndisponivel()) return;
  if (recuperacaoAgendada || tentativas >= 2) return;

  recuperacaoAgendada = true;
  tentativas += 1;

  window.setTimeout(() => {
    recuperacaoAgendada = false;
    window.dispatchEvent(new Event('popstate'));
  }, 80);
}

function agendarRecuperacao() {
  window.requestAnimationFrame(recuperarRotaEspecial);
}

function observarApp() {
  if (observador) return;

  const app = document.getElementById('app');
  if (!app) return;

  observador = new MutationObserver(agendarRecuperacao);
  observador.observe(app, {
    childList: true,
    subtree: false
  });
}

function iniciar() {
  observarApp();
  agendarRecuperacao();
}

window.addEventListener('load', iniciar);
window.addEventListener('popstate', () => {
  resetarTentativasSeRotaMudou();
  agendarRecuperacao();
});
window.addEventListener('hashchange', () => {
  resetarTentativasSeRotaMudou();
  agendarRecuperacao();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
