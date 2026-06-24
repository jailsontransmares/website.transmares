const MODULE_RESOURCE_MAP = {
  'links-corretora': 'links_corretora',
  'links-ar': 'links_ar',
  'links-gestao': 'links_gestao',
  'central-senhas': 'central_senhas',
  'painel-ar': 'painel_ar',
  administracao: 'admin'
};

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
  return MODULE_RESOURCE_MAP[idModulo] || String(idModulo || '').replace(/-/g, '_');
}

export function hasPermission(permissoes, recurso, acao = 'view') {
  const mapa = permissoes?.map || permissoes || {};
  return Boolean(mapa[`${recurso}:${acao}`]);
}

export function canAccessModule(permissoes, idModulo) {
  return hasPermission(permissoes, obterRecursoModulo(idModulo), 'view');
}

export function normalizarPermissoes(permissoes = []) {
  const lista = Array.isArray(permissoes) ? permissoes : [];

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
    'painel_ar.validacoes'
  ];
  const modulos = gestor ? [...modulosBase, 'admin'] : modulosBase;
  const permissoes = modulos.map(recurso_chave => ({
    recurso_chave,
    acao: 'view',
    permitido: true,
    origem: 'legacy'
  }));

  if (gestor) {
    permissoes.push(
      { recurso_chave: 'admin.usuarios', acao: 'view', permitido: true, origem: 'legacy' },
      { recurso_chave: 'admin.perfis', acao: 'view', permitido: true, origem: 'legacy' },
      { recurso_chave: 'admin.permissoes', acao: 'view', permitido: true, origem: 'legacy' },
      { recurso_chave: 'central_senhas', acao: 'view_secret', permitido: true, origem: 'legacy' }
    );
  }

  return permissoes;
}
