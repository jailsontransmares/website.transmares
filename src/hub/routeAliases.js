const ROUTE_ALIASES = {
  'admin/usuarios': 'admin#usuarios',
  'admin/perfis': 'admin#perfis',
  'admin/permissoes': 'admin#permissoes',
  configuracoes: 'admin#identidade',
  'configuracoes/corretora': 'admin#logo'
};

function obterBaseHub(pathname) {
  if (pathname === '/hub' || pathname.startsWith('/hub/')) {
    return '/hub';
  }

  return '';
}

function normalizarRotaHub(pathname) {
  const base = obterBaseHub(pathname);
  const semBase = base ? pathname.slice(base.length) : pathname;

  return semBase
    .replace(/^\/+|\/+$/g, '')
    .replace(/^index\.html$/i, '')
    .toLowerCase();
}

function aplicarAliasDeRotaHub() {
  const base = obterBaseHub(window.location.pathname || '/');

  if (!base) {
    return;
  }

  const rota = normalizarRotaHub(window.location.pathname || '/');
  const destino = ROUTE_ALIASES[rota];

  if (!destino) {
    return;
  }

  const [pathDestino, hashDestino = ''] = destino.split('#');
  const proximaUrl = `${base}/${pathDestino}${hashDestino ? `#${hashDestino}` : ''}`;

  window.history.replaceState({}, '', proximaUrl);
}

aplicarAliasDeRotaHub();
