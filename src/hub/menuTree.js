// Estrutura declarativa oficial do menu lateral do Hub.
// Fase 5: o menu passa a ser renderizado como navegação em árvore.
// Itens planejados podem aparecer desabilitados até que tenham tela/rota própria.

export const HUB_MENU_TREE_VERSION = '2026-07-menu-v1';

export const HUB_MENU_TREE = [
  {
    id: 'inicio',
    label: 'Início',
    type: 'route',
    route: '/',
    legacyRoute: '/',
    status: 'active'
  },
  {
    id: 'dashboards',
    label: 'Dashboards',
    type: 'route',
    route: '/dashboards',
    status: 'planned',
    note: 'Item previsto no novo menu. Ainda não possui rota/tela dedicada no roteador atual.'
  },
  {
    id: 'central-senhas',
    label: 'Central de Senhas',
    type: 'route',
    route: '/central-senhas',
    legacyRoute: '/central-senhas',
    moduleId: 'central-senhas',
    permission: { resource: 'central_senhas', action: 'view' },
    status: 'active'
  },
  {
    id: 'operacoes',
    label: 'Operações',
    type: 'group',
    status: 'active',
    children: [
      {
        id: 'operacoes-ar-transmares',
        label: 'AR Transmares',
        type: 'route',
        route: '/operacoes/ar-transmares',
        legacyRoute: '/painel-ar',
        moduleId: 'painel-ar',
        permission: { resource: 'painel_ar', action: 'view' },
        status: 'alias-required',
        note: 'Substitui visualmente o item Painel AR, mantendo /painel-ar como rota legada.'
      },
      {
        id: 'operacoes-corretora',
        label: 'Corretora',
        type: 'route',
        route: '/operacoes/corretora',
        status: 'reserved',
        note: 'Rota reservada com placeholder seguro para a futura tela operacional da corretora. Não confundir com Configurações da Corretora.'
      }
    ]
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    type: 'route',
    route: '/financeiro',
    status: 'planned',
    note: 'Item previsto no novo menu. Ainda não possui rota/tela dedicada no roteador atual.'
  },
  {
    id: 'rh-dp',
    label: 'RH & DP',
    type: 'route',
    route: '/rh-dp',
    status: 'planned',
    note: 'Item previsto no novo menu. Ainda não possui rota/tela dedicada no roteador atual.'
  },
  {
    id: 'administracao',
    label: 'Administração',
    type: 'group',
    status: 'active',
    permission: { resource: 'admin', action: 'view' },
    children: [
      {
        id: 'administracao-sistema',
        label: 'Sistema',
        type: 'group',
        status: 'active',
        children: [
          {
            id: 'administracao-sistema-configuracoes-corretora',
            label: 'Configurações da Corretora',
            type: 'route',
            route: '/admin/sistema/corretora',
            legacyRoute: '/configuracoes/corretora',
            permission: { resource: 'configuracoes.corretora', action: 'view' },
            status: 'alias-required',
            note: 'Absorve as antigas opções Identidade do Painel, Aparência, Logo e Marca e Home e Exibição.'
          }
        ]
      },
      {
        id: 'administracao-parametros',
        label: 'Parâmetros',
        type: 'group',
        status: 'active',
        children: [
          {
            id: 'administracao-parametros-limites',
            label: 'Limites',
            type: 'route',
            route: '/admin/parametros/limites',
            legacyRoute: '/admin#limites',
            permission: { resource: 'admin', action: 'view' },
            status: 'alias-required'
          }
        ]
      },
      {
        id: 'administracao-cadastros',
        label: 'Cadastros',
        type: 'group',
        status: 'active',
        children: [
          {
            id: 'administracao-cadastros-categorias',
            label: 'Categorias',
            type: 'route',
            route: '/admin/cadastros/categorias',
            legacyRoute: '/admin#categorias',
            permission: { resource: 'admin', action: 'view' },
            status: 'alias-required'
          },
          {
            id: 'administracao-cadastros-grupos',
            label: 'Grupos',
            type: 'route',
            route: '/admin/cadastros/grupos',
            legacyRoute: '/admin#grupos',
            permission: { resource: 'admin', action: 'view' },
            status: 'alias-required'
          },
          {
            id: 'administracao-cadastros-usuarios',
            label: 'Usuários',
            type: 'route',
            route: '/admin/cadastros/usuarios',
            legacyRoute: '/admin/usuarios',
            permission: { resource: 'admin.usuarios', action: 'view' },
            status: 'alias-required'
          },
          {
            id: 'administracao-cadastros-perfis',
            label: 'Perfis',
            type: 'route',
            route: '/admin/cadastros/perfis',
            legacyRoute: '/admin/perfis',
            permission: { resource: 'admin.perfis', action: 'view' },
            status: 'alias-required'
          },
          {
            id: 'administracao-cadastros-parceiros-indicacao',
            label: 'Parceiros de Indicação',
            type: 'route',
            route: '/admin/cadastros/parceiros-indicacao',
            legacyRoute: '/admin#parceiros-indicacao',
            permission: { resource: 'admin.parceiros_indicacao', action: 'view' },
            status: 'alias-required'
          }
        ]
      }
    ]
  }
];

export function flattenHubMenuTree(items = HUB_MENU_TREE, parents = []) {
  return items.flatMap(item => {
    const current = {
      ...item,
      parentIds: parents.map(parent => parent.id),
      parentLabels: parents.map(parent => parent.label)
    };
    const children = Array.isArray(item.children)
      ? flattenHubMenuTree(item.children, [...parents, item])
      : [];

    return [current, ...children];
  });
}

export function getHubMenuRouteItems() {
  return flattenHubMenuTree().filter(item => item.type === 'route');
}