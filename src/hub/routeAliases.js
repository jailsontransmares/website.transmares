const ROUTE_ALIASES = {
  'admin/usuarios': 'admin/cadastros/usuarios',
  'admin/perfis': 'admin/cadastros/perfis',
  'admin/permissoes': 'admin/permissoes',
  configuracoes: 'admin#identidade',

  // Nova organização planejada do menu — aliases seguros para rotas legadas/existentes.
  'operacoes/ar-transmares': 'painel-ar',
  'admin/sistema/corretora': 'configuracoes/corretora'
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

function montarUrlAliasRotaHub(pathname = window.location.pathname || '/') {
  const [caminho = ''] = String(pathname || '/').split('#');
  const base = obterBaseHub(caminho);
  const rota = normalizarRotaHub(caminho);
  const destino = ROUTE_ALIASES[rota];

  if (!destino) {
    return '';
  }

  const [pathDestino, hashDestino = ''] = destino.split('#');
  const prefixo = base ? `${base}/` : '/';

  return `${prefixo}${pathDestino}${hashDestino ? `#${hashDestino}` : ''}`;
}

function aplicarAliasDeRotaHub() {
  const proximaUrl = montarUrlAliasRotaHub();

  if (!proximaUrl) {
    return;
  }

  window.history.replaceState({}, '', proximaUrl);
}

window.montarUrlAliasRotaHub = montarUrlAliasRotaHub;

aplicarAliasDeRotaHub();
