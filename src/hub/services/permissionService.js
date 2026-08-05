const MODULE_RESOURCE_MAP = {
  'links-corretora': 'links_corretora',
  'links-ar': 'links_ar',
  'links-gestao': 'links_gestao',
  'central-senhas': 'central_senhas',
  'painel-ar': 'painel_ar',
  administracao: 'admin',
  admin: 'admin',
  'admin-usuarios': 'admin.usuarios',
  'admin-perfis': 'admin.perfis',
  'admin-permissoes': 'admin.permissoes',
  'admin-parceiros-indicacao': 'admin.parceiros_indicacao',
  'admin-modulos': 'admin.modulos',
  'admin-logs-integracoes': 'admin.logs_integracoes',
  financeiro: 'financeiro',
  'rh-dp': 'rh_dp',
  perfil: 'perfil',
  configuracoes: 'configuracoes',
  'configuracoes-corretora': 'configuracoes.corretora',
  'configuracoes-identidade-visual': 'configuracoes.identidade_visual'
};

function normalizarIdentificadorModulo(valor = '') {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function montarMapaPermissoes(permissoes = []) {
  return (permissoes || []).reduce((acc, item) => {
    const recurso = String(item.recurso_chave || item.recurso || '').trim();
    const acao = String(item.acao || 'view').trim();

    if (recurso && acao && item.permitido !== false) {
      acc[`${recurso}:${acao}`] = true;
    }

    return acc;
  }, {});
}

export function obterRecursoModulo(idModulo) {
  const chaveOriginal = String(idModulo || '').trim();
  const slugRota = chaveOriginal
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const chaveNormalizada = normalizarIdentificadorModulo(chaveOriginal);

  return MODULE_RESOURCE_MAP[chaveOriginal]
    || MODULE_RESOURCE_MAP[slugRota]
    || MODULE_RESOURCE_MAP[chaveNormalizada]
    || chaveNormalizada;
}

export function hasPermission(permissoes, recurso, acao = 'view') {
  const mapa = permissoes?.map || permissoes || {};
  return Boolean(mapa[`${recurso}:${acao}`]);
}

export function canAccessModule(permissoes, idModulo) {
  return hasPermission(permissoes, obterRecursoModulo(idModulo), 'view');
}

export function normalizarPermissoes(permissoes = []) {
  const listaOriginal = Array.isArray(permissoes)
    ? permissoes
    : (Array.isArray(permissoes?.lista)
      ? permissoes.lista
      : Object.entries(permissoes?.map || {}).map(([chave, permitido]) => {
        const separador = chave.lastIndexOf(':');
        return {
          recurso_chave: separador > 0 ? chave.slice(0, separador) : chave,
          acao: separador > 0 ? chave.slice(separador + 1) : 'view',
          permitido
        };
      }));

  const listaMapeada = listaOriginal.map((item) => {
    const recurso = String(item.recurso_chave || item.recurso || '').trim();
    const acaoOriginal = String(item.acao || 'view').trim();
    const recursoChave = ['painel_ar.crm', 'painel_ar.crm_2'].includes(recurso)
      ? 'painel_ar'
      : recurso;
    const acao = recurso === 'painel_ar.crm' && acaoOriginal === 'execute'
      ? 'update'
      : acaoOriginal;

    return { ...item, recurso_chave: recursoChave, acao };
  });
  const lista = [...new Map(
    listaMapeada.map((item) => [`${item.recurso_chave}:${item.acao}`, item])
  ).values()];

  return {
    lista,
    map: montarMapaPermissoes(lista)
  };
}

export function montarPermissoesLegadas(usuario) {
  const perfil = String(usuario?.perfil || '').toLowerCase();
  const gestor = perfil === 'gestor' || perfil === 'admin';
  const modulosBase = [
    'links_corretora',
    'links_ar',
    'links_gestao',
    'central_senhas',
    'painel_ar',
    'painel_ar.gerar_links',
    'painel_ar.produtos',
    'painel_ar.validacoes',
    'perfil'
  ];
  const modulos = gestor
    ? [...modulosBase, 'admin', 'configuracoes', 'configuracoes.corretora', 'configuracoes.identidade_visual']
    : modulosBase;
  const permissoes = modulos.map(recurso_chave => ({
    recurso_chave,
    acao: 'view',
    permitido: true,
    origem: 'legacy'
  }));

  permissoes.push({ recurso_chave: 'perfil', acao: 'update', permitido: true, origem: 'legacy' });

  if (gestor) {
    permissoes.push(
      { recurso_chave: 'admin.usuarios', acao: 'view', permitido: true, origem: 'legacy' },
      { recurso_chave: 'admin.perfis', acao: 'view', permitido: true, origem: 'legacy' },
      { recurso_chave: 'admin.permissoes', acao: 'view', permitido: true, origem: 'legacy' },
      { recurso_chave: 'admin.parceiros_indicacao', acao: 'view', permitido: true, origem: 'legacy' },
      { recurso_chave: 'admin.parceiros_indicacao', acao: 'create', permitido: true, origem: 'legacy' },
      { recurso_chave: 'admin.parceiros_indicacao', acao: 'update', permitido: true, origem: 'legacy' },
      { recurso_chave: 'admin.parceiros_indicacao', acao: 'archive', permitido: true, origem: 'legacy' },
      { recurso_chave: 'admin.parceiros_indicacao', acao: 'view_sensitive', permitido: true, origem: 'legacy' },
      { recurso_chave: 'admin.logs_integracoes', acao: 'view', permitido: true, origem: 'legacy' },
      { recurso_chave: 'configuracoes', acao: 'update', permitido: true, origem: 'legacy' },
      { recurso_chave: 'configuracoes.corretora', acao: 'update', permitido: true, origem: 'legacy' },
      { recurso_chave: 'configuracoes.identidade_visual', acao: 'update', permitido: true, origem: 'legacy' },
      { recurso_chave: 'central_senhas', acao: 'view_secret', permitido: true, origem: 'legacy' },
      { recurso_chave: 'painel_ar.produtos', acao: 'update', permitido: true, origem: 'legacy' },
      { recurso_chave: 'painel_ar', acao: 'update', permitido: true, origem: 'legacy' },
      { recurso_chave: 'painel_ar', acao: 'delete', permitido: true, origem: 'legacy' }
    );
  }

  return permissoes;
}
