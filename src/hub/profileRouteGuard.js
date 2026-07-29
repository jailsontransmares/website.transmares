const PROFILE_ROUTE = 'perfil';

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

function estaNaRotaPerfil() {
  return obterRotaAtual() === PROFILE_ROUTE;
}

function appEstaNaPaginaPerfil() {
  return document.getElementById('app')?.dataset?.hubProfilePage === 'true';
}

function appMostrouModuloIndisponivel() {
  const texto = document.getElementById('app')?.textContent || '';
  return texto.includes('Módulo indisponível') || texto.includes('Modulo indisponivel');
}

function solicitarRenderizacaoPerfil() {
  if (!estaNaRotaPerfil() || aplicandoCorrecao) return;
  if (appEstaNaPaginaPerfil() && !appMostrouModuloIndisponivel()) return;

  aplicandoCorrecao = true;
  window.dispatchEvent(new Event('popstate'));

  window.setTimeout(() => {
    aplicandoCorrecao = false;

    if (estaNaRotaPerfil() && (!appEstaNaPaginaPerfil() || appMostrouModuloIndisponivel())) {
      window.dispatchEvent(new Event('popstate'));
    }
  }, 180);
}

function agendarCorrecao() {
  window.setTimeout(solicitarRenderizacaoPerfil, 0);
  window.setTimeout(solicitarRenderizacaoPerfil, 180);
  window.setTimeout(solicitarRenderizacaoPerfil, 520);
  window.setTimeout(solicitarRenderizacaoPerfil, 1100);
}

function observarApp() {
  if (observador) return;

  observador = new MutationObserver(() => {
    if (!estaNaRotaPerfil()) return;
    window.requestAnimationFrame(solicitarRenderizacaoPerfil);
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
