const ADMIN_ABAS_ROTEAVEIS = new Set([
  'identidade',
  'limites',
  'categorias',
  'grupos',
  'usuarios',
  'perfis',
  'permissoes'
]);

let ultimaSincronizacao = '';
let sincronizacaoPendente = false;
let observador = null;

function obterBaseHub(pathname = window.location.pathname || '/') {
  return pathname === '/hub' || pathname.startsWith('/hub/') ? '/hub' : '';
}

function normalizarParte(valor = '') {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/^\/+|\/+$/g, '');
}

function obterRotaSemBase() {
  const base = obterBaseHub();
  const pathname = window.location.pathname || '/';
  const semBase = base ? pathname.slice(base.length) : pathname;
  return normalizarParte(semBase).replace(/^index\.html$/i, '');
}

function obterAbaAdministrativaAlvo() {
  const rota = obterRotaSemBase();
  const hash = normalizarParte(window.location.hash || '');

  if (rota === 'admin' && ADMIN_ABAS_ROTEAVEIS.has(hash)) {
    return hash;
  }

  if (rota.startsWith('admin/')) {
    const partes = rota.split('/').filter(Boolean);
    const ultimaParte = normalizarParte(partes[partes.length - 1] || '');
    return ADMIN_ABAS_ROTEAVEIS.has(ultimaParte) ? ultimaParte : '';
  }

  return '';
}

function estaNaAdministracao() {
  return Boolean(document.querySelector('.admin-shell'));
}

function sincronizarRotaAdministrativa() {
  if (sincronizacaoPendente) return;

  const aba = obterAbaAdministrativaAlvo();
  if (!aba) return;

  const chave = `${window.location.pathname}${window.location.hash}:${aba}`;
  if (ultimaSincronizacao === chave) return;

  if (!estaNaAdministracao()) return;

  const selecionarAbaAdmin = window.selecionarAbaAdmin;
  if (typeof selecionarAbaAdmin !== 'function') return;

  sincronizacaoPendente = true;

  Promise.resolve(selecionarAbaAdmin(aba))
    .then(() => {
      ultimaSincronizacao = chave;
    })
    .catch(erro => {
      ultimaSincronizacao = '';
      console.warn('Não foi possível sincronizar a aba administrativa:', erro);
    })
    .finally(() => {
      sincronizacaoPendente = false;
    });
}

function agendarSincronizacao() {
  window.setTimeout(sincronizarRotaAdministrativa, 0);
  window.setTimeout(sincronizarRotaAdministrativa, 120);
  window.setTimeout(sincronizarRotaAdministrativa, 420);
}

function instalarInterceptadoresHistorico() {
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  if (window.history.__adminRouteSyncInstalled) return;
  window.history.__adminRouteSyncInstalled = true;

  window.history.pushState = function pushStateAdminRouteSync(...args) {
    const retorno = originalPushState.apply(this, args);
    ultimaSincronizacao = '';
    agendarSincronizacao();
    return retorno;
  };

  window.history.replaceState = function replaceStateAdminRouteSync(...args) {
    const retorno = originalReplaceState.apply(this, args);
    agendarSincronizacao();
    return retorno;
  };
}

function observarRenderizacaoAdmin() {
  if (observador) return;

  observador = new MutationObserver(() => {
    if (obterAbaAdministrativaAlvo()) {
      window.requestAnimationFrame(sincronizarRotaAdministrativa);
    }
  });

  observador.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function iniciar() {
  instalarInterceptadoresHistorico();
  observarRenderizacaoAdmin();
  agendarSincronizacao();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}

window.addEventListener('popstate', () => {
  ultimaSincronizacao = '';
  agendarSincronizacao();
});
window.addEventListener('hashchange', () => {
  ultimaSincronizacao = '';
  agendarSincronizacao();
});
