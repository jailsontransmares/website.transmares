const COMPANY_ROUTE = 'configuracoes/corretora';
const COMPANY_ROUTE_SLUG = 'configuracoes-corretora';

let aplicandoCorrecao = false;
let observador = null;

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

function estaNaRotaCorretora() {
  const rota = obterRotaAtual();
  return rota === COMPANY_ROUTE || rota === COMPANY_ROUTE_SLUG;
}

function normalizarUrlCorretora() {
  if (obterRotaAtual() !== COMPANY_ROUTE_SLUG) return;

  const base = obterBaseHub();
  const destino = `${base || ''}/${COMPANY_ROUTE}${window.location.search || ''}${window.location.hash || ''}`;
  window.history.replaceState({}, '', destino);
}

function appEstaNaPaginaCorretora() {
  return document.getElementById('app')?.dataset?.companySettingsPage === 'true';
}

function appMostrouModuloIndisponivel() {
  const texto = document.getElementById('app')?.textContent || '';
  return texto.includes('Módulo indisponível') || texto.includes('Modulo indisponivel');
}

function solicitarRenderizacaoCorretora() {
  if (!estaNaRotaCorretora() || aplicandoCorrecao) return;

  normalizarUrlCorretora();

  if (appEstaNaPaginaCorretora() && !appMostrouModuloIndisponivel()) return;

  aplicandoCorrecao = true;
  window.dispatchEvent(new Event('popstate'));

  window.setTimeout(() => {
    aplicandoCorrecao = false;

    if (estaNaRotaCorretora() && (!appEstaNaPaginaCorretora() || appMostrouModuloIndisponivel())) {
      window.dispatchEvent(new Event('popstate'));
    }
  }, 180);
}

function agendarCorrecao() {
  window.setTimeout(solicitarRenderizacaoCorretora, 0);
  window.setTimeout(solicitarRenderizacaoCorretora, 180);
  window.setTimeout(solicitarRenderizacaoCorretora, 520);
  window.setTimeout(solicitarRenderizacaoCorretora, 1100);
}

function observarApp() {
  if (observador) return;

  observador = new MutationObserver(() => {
    if (!estaNaRotaCorretora()) return;
    window.requestAnimationFrame(solicitarRenderizacaoCorretora);
  });

  observador.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function iniciar() {
  observarApp();
  agendarCorrecao();
}

window.addEventListener('load', agendarCorrecao);
window.addEventListener('popstate', agendarCorrecao);
window.addEventListener('hashchange', agendarCorrecao);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
