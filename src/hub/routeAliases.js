const ROUTE_ALIASES = {
  'admin/usuarios': 'admin#usuarios',
  'admin/perfis': 'admin#perfis',
  'admin/permissoes': 'admin#permissoes',
  configuracoes: 'admin#identidade',

  // Nova organização planejada do menu — aliases seguros para rotas legadas/existentes.
  'operacoes/ar-transmares': 'painel-ar',
  'admin/sistema/corretora': 'configuracoes/corretora',
  'admin/parametros/limites': 'admin#limites',
  'admin/cadastros/categorias': 'admin#categorias',
  'admin/cadastros/grupos': 'admin#grupos',
  'admin/cadastros/usuarios': 'admin#usuarios',
  'admin/cadastros/perfis': 'admin#perfis'
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
  const pathname = window.location.pathname || '/';
  const base = obterBaseHub(pathname);
  const rota = normalizarRotaHub(pathname);
  const destino = ROUTE_ALIASES[rota];

  if (!destino) {
    return;
  }

  const [pathDestino, hashDestino = ''] = destino.split('#');
  const prefixo = base ? `${base}/` : '/';
  const proximaUrl = `${prefixo}${pathDestino}${hashDestino ? `#${hashDestino}` : ''}`;

  window.history.replaceState({}, '', proximaUrl);
}

aplicarAliasDeRotaHub();
