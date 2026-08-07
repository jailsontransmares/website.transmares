// Contrato único de rotas do Hub.
// Telas e módulos podem evoluir sem espalhar regras de URL pelos consumidores.

export const HUB_ROUTE_SCHEMA_VERSION = '2026-08-route-v1';

export const HUB_ROUTE_ALIASES = Object.freeze({
  'admin/usuarios': 'admin/cadastros/usuarios',
  'admin/perfis': 'admin/cadastros/perfis',
  'admin/permissoes': 'admin/permissoes',
  configuracoes: 'admin#identidade',
  'operacoes/ar-transmares': 'painel-ar',
  'operacoes/ar-transmares/200': 'painel-ar/200',
  'operacoes/ar-transmares/201': 'painel-ar/201',
  'admin/sistema/corretora': 'configuracoes/corretora'
});

export const HUB_ADMIN_ROUTE_TABS = Object.freeze({
  categorias: 'cadastros/categorias',
  grupos: 'cadastros/grupos',
  usuarios: 'cadastros/usuarios',
  perfis: 'cadastros/perfis',
  'parceiros-indicacao': 'cadastros/parceiros-indicacao',
  'logs-integracoes': 'sistema/logs-integracoes',
  auditoria: 'sistema/logs-integracoes/auditoria',
  limites: 'parametros/limites',
  identidade: 'identidade',
  aparencia: 'aparencia',
  logo: 'logo',
  'home-exibicao': 'home-exibicao'
});

export const HUB_ADMIN_TABS = Object.freeze(Object.keys(HUB_ADMIN_ROUTE_TABS));

export const HUB_SPECIAL_ROUTES = Object.freeze({
  perfil: 'perfil',
  notificacoes: 'notificacoes',
  'configuracoes-corretora': 'configuracoes/corretora',
  'operacoes-corretora': 'operacoes/corretora'
});

export function obterBaseHub(pathname = '/') {
  return pathname === '/hub' || pathname.startsWith('/hub/') ? '/hub' : '';
}

export function normalizarRotaHub(pathname = '/') {
  const base = obterBaseHub(pathname);
  const semBase = base ? pathname.slice(base.length) : pathname;

  return semBase
    .replace(/^\/+|\/+$/g, '')
    .replace(/^index\.html$/i, '')
    .toLowerCase();
}

export function obterRotaAdminPorAba(aba = '') {
  return HUB_ADMIN_ROUTE_TABS[aba] || aba;
}

export function obterAbaAdminPorRota(rota = '') {
  const normalizada = String(rota || '').replace(/^\/+|\/+$/g, '').toLowerCase();
  const entrada = Object.entries(HUB_ADMIN_ROUTE_TABS).find(([, caminho]) => caminho === normalizada);

  return entrada?.[0] || normalizada.split('/').pop() || '';
}
