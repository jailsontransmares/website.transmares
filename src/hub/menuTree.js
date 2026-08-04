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
    route: '/financeiro/dashboard',
    moduleId: 'financeiro',
    permission: { resource: 'financeiro', action: 'view' },
    status: 'active',
    note: 'Fundação técnica preparada. A exibição depende da ativação controlada e de permissão explícita.'
  },
  {
    id: 'rh-dp',
    label: 'RH & DP',
    type: 'route',
    route: '/rh-dp/colaboradores',
    moduleId: 'rh-dp',
    permission: { resource: 'rh_dp', action: 'view' },
    status: 'active',
    note: 'Cadastro pessoal de colaboradores ativo. As demais rotinas serão liberadas nas próximas fases.'
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
          },
          {
            id: 'administracao-sistema-logs',
            label: 'Logs',
            type: 'group',
            permission: { resource: 'admin.logs_integracoes', action: 'view' },
            status: 'active',
            children: [
              {
                id: 'administracao-sistema-logs-integracoes',
                label: 'Logs',
                type: 'route',
                route: '/admin/sistema/logs-integracoes',
                permission: { resource: 'admin.logs_integracoes', action: 'view' },
                status: 'active'
              },
              {
                id: 'administracao-sistema-logs-auditoria',
                label: 'Auditoria',
                type: 'route',
                route: '/admin/sistema/logs-integracoes/auditoria',
                permission: { resource: 'admin', action: 'view' },
                status: 'planned',
                note: 'Submódulo reservado para auditoria administrativa, separado dos logs operacionais.'
              }
            ]
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
