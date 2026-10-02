// Rotas que podem ser expostas como atalhos de submódulos na Home.
// A configuração de status/visibilidade fica em recursos_acesso; esta lista
// associa cada recurso a uma rota real da aplicação e ao módulo pai.
export const HOME_SUBMODULES = [
  { key: 'painel_ar.inicio', parent: 'painel-ar', label: 'Início', route: '/painel-ar#inicio', permission: 'painel_ar' },
  { key: 'painel_ar.gerar_links', parent: 'painel-ar', label: 'Gerar Links', route: '/painel-ar#gerar', permission: 'painel_ar.gerar_links' },
  { key: 'painel_ar.crm_2', parent: 'painel-ar', label: 'CRM 2.0', route: '/painel-ar/200', permission: 'painel_ar' },
  { key: 'painel_ar.crm2.cadastro_pf', parent: 'painel-ar', group: 'painel_ar.crm_2', label: 'Pessoa Física', route: '/painel-ar/201', permission: 'painel_ar' },
  { key: 'painel_ar.crm2.cadastro_pj', parent: 'painel-ar', group: 'painel_ar.crm_2', label: 'Pessoa Jurídica', route: '/painel-ar/202', permission: 'painel_ar' },
  { key: 'painel_ar.crm2.vinculos', parent: 'painel-ar', group: 'painel_ar.crm_2', label: 'Vínculos', route: '/painel-ar/203', permission: 'painel_ar' },
  { key: 'painel_ar.crm2.pedidos', parent: 'painel-ar', group: 'painel_ar.crm_2', label: 'Pedidos', route: '/painel-ar/204', permission: 'painel_ar' },
  { key: 'painel_ar.crm2.oportunidades', parent: 'painel-ar', group: 'painel_ar.crm_2', label: 'Oportunidades', route: '/painel-ar/205', permission: 'painel_ar' },
  { key: 'painel_ar.crm2.comunicacao', parent: 'painel-ar', group: 'painel_ar.crm_2', label: 'Comunicação', route: '/painel-ar/206', permission: 'painel_ar' },
  { key: 'painel_ar.crm2.automacoes', parent: 'painel-ar', group: 'painel_ar.crm_2', label: 'Automações', route: '/painel-ar/206/automacoes', permission: 'painel_ar' },
  { key: 'painel_ar.produtos', parent: 'painel-ar', label: 'Lista de Produtos', route: '/painel-ar#produtos', permission: 'painel_ar.gerar_links' },
  { key: 'painel_ar.validacoes', parent: 'painel-ar', label: 'Validações', route: '/painel-ar#validacoes/consultar', matchHash: 'validacoes', permission: 'painel_ar.validacoes' },
  { key: 'painel_ar.historico', parent: 'painel-ar', label: 'Histórico', route: '/painel-ar#historico', permission: 'painel_ar.validacoes' },
  { key: 'painel_ar.crm', parent: 'painel-ar', label: 'CRM', route: '/painel-ar#crm', permission: 'painel_ar' },

  { key: 'central_senhas.acessos', parent: 'central-senhas', label: 'Senhas Salvas', route: '/central-senhas/acessos', permission: 'central_senhas' },
  { key: 'central_senhas.links', parent: 'central-senhas', label: 'Links Úteis', route: '/central-senhas/links', permission: 'central_senhas' },
  { key: 'central_senhas.links_corretora', parent: 'central-senhas', group: 'central_senhas.links', label: 'Corretora', route: '/central-senhas/links/corretora', permission: 'links_corretora' },
  { key: 'central_senhas.links_ar', parent: 'central-senhas', group: 'central_senhas.links', label: 'AR', route: '/central-senhas/links/ar', permission: 'links_ar' },
  { key: 'central_senhas.links_gestao', parent: 'central-senhas', group: 'central_senhas.links', label: 'Gestão', route: '/central-senhas/links/gestao', permission: 'links_gestao' },

  { key: 'operacoes.corretora.visao_geral', parent: 'operacoes-corretora', label: 'Visão geral', route: '/operacoes/corretora' },
  { key: 'operacoes.corretora.consultoria_360', parent: 'operacoes-corretora', label: 'Consultoria 360°', route: '/operacoes/corretora/consultoria-360', permission: 'consultoria_360' },
  { key: 'operacoes.corretora.simulador_saude', parent: 'operacoes-corretora', label: 'Simulador - Saúde', route: '/operacoes/corretora/simulador-saude', permission: 'simulador_saude' },
  { key: 'simulador_saude.catalogo', parent: 'operacoes-corretora', group: 'operacoes.corretora.simulador_saude', label: 'Catálogo de Planos e Preços', route: '/operacoes/corretora/simulador-saude/catalogo', permission: 'simulador_saude.catalogo' },

  { key: 'financeiro.dashboard', parent: 'financeiro', label: 'Dashboard', route: '/financeiro/dashboard', permission: 'financeiro.dashboard' },
  { key: 'financeiro.lancamentos', parent: 'financeiro', label: 'Lançamentos', route: '/financeiro/lancamentos', permission: 'financeiro.lancamentos' },
  { key: 'home.financeiro.lancamentos.titulos', parent: 'financeiro', group: 'financeiro.lancamentos', label: 'Títulos', route: '/financeiro/lancamentos/titulos', permission: 'financeiro.lancamentos' },
  { key: 'home.financeiro.lancamentos.receber', parent: 'financeiro', group: 'financeiro.lancamentos', label: 'A receber', route: '/financeiro/lancamentos/receber', permission: 'financeiro.lancamentos' },
  { key: 'home.financeiro.lancamentos.pagar', parent: 'financeiro', group: 'financeiro.lancamentos', label: 'A pagar', route: '/financeiro/lancamentos/pagar', permission: 'financeiro.lancamentos' },
  { key: 'home.financeiro.lancamentos.parcelas', parent: 'financeiro', group: 'financeiro.lancamentos', label: 'Parcelas', route: '/financeiro/lancamentos/parcelas', permission: 'financeiro.lancamentos' },
  { key: 'home.financeiro.lancamentos.recorrentes', parent: 'financeiro', group: 'financeiro.lancamentos', label: 'Recorrências', route: '/financeiro/lancamentos/recorrentes', permission: 'financeiro.lancamentos' },
  { key: 'home.financeiro.lancamentos.rateios', parent: 'financeiro', group: 'financeiro.lancamentos', label: 'Rateios', route: '/financeiro/lancamentos/rateios', permission: 'financeiro.lancamentos' },
  { key: 'home.financeiro.lancamentos.baixas', parent: 'financeiro', group: 'financeiro.lancamentos', label: 'Baixas', route: '/financeiro/lancamentos/baixas', permission: 'financeiro.lancamentos' },
  { key: 'financeiro.conciliacao', parent: 'financeiro', label: 'Conciliação', route: '/financeiro/conciliacao', permission: 'financeiro.conciliacao' },
  { key: 'financeiro.cartoes', parent: 'financeiro', label: 'Cartões', route: '/financeiro/cartoes', permission: 'financeiro.cartoes' },
  { key: 'financeiro.relatorios', parent: 'financeiro', label: 'Relatórios e Fechamento', route: '/financeiro/relatorios', permission: 'financeiro.relatorios' },
  { key: 'financeiro.cadastros', parent: 'financeiro', label: 'Cadastros', route: '/financeiro/cadastros', permission: 'financeiro.cadastros' },
  { key: 'home.financeiro.cadastros.pessoas', parent: 'financeiro', group: 'financeiro.cadastros', label: 'Pessoas', route: '/financeiro/cadastros/pessoas', permission: 'financeiro.cadastros' },
  { key: 'home.financeiro.cadastros.contas', parent: 'financeiro', group: 'financeiro.cadastros', label: 'Contas', route: '/financeiro/cadastros/contas', permission: 'financeiro.cadastros' },
  { key: 'home.financeiro.cadastros.categorias', parent: 'financeiro', group: 'financeiro.cadastros', label: 'Categorias', route: '/financeiro/cadastros/categorias', permission: 'financeiro.cadastros' },
  { key: 'home.financeiro.cadastros.centros_custo', parent: 'financeiro', group: 'financeiro.cadastros', label: 'Centros de Custo', route: '/financeiro/cadastros/centros-custo', permission: 'financeiro.cadastros' },
  { key: 'home.financeiro.cadastros.linhas_negocio', parent: 'financeiro', group: 'financeiro.cadastros', label: 'Linhas de Negócio', route: '/financeiro/cadastros/linhas-negocio', permission: 'financeiro.cadastros' },
  { key: 'home.financeiro.cadastros.contratos', parent: 'financeiro', group: 'financeiro.cadastros', label: 'Contratos', route: '/financeiro/cadastros/contratos', permission: 'financeiro.cadastros' },
  { key: 'financeiro.configuracoes', parent: 'financeiro', label: 'Configurações', route: '/financeiro/configuracoes', permission: 'financeiro.configuracoes' },
  { key: 'home.financeiro.configuracoes.parametros', parent: 'financeiro', group: 'financeiro.configuracoes', label: 'Parâmetros', route: '/financeiro/configuracoes/parametros', permission: 'financeiro.configuracoes' },
  { key: 'home.financeiro.configuracoes.alertas', parent: 'financeiro', group: 'financeiro.configuracoes', label: 'Alertas', route: '/financeiro/configuracoes/alertas', permission: 'financeiro.configuracoes' },
  { key: 'home.financeiro.configuracoes.backups', parent: 'financeiro', group: 'financeiro.configuracoes', label: 'Backups', route: '/financeiro/configuracoes/backups', permission: 'financeiro.configuracoes' },
  { key: 'home.financeiro.configuracoes.auditoria', parent: 'financeiro', group: 'financeiro.configuracoes', label: 'Auditoria', route: '/financeiro/configuracoes/auditoria', permission: 'financeiro.auditoria' },
  { key: 'home.financeiro.configuracoes.homologacao', parent: 'financeiro', group: 'financeiro.configuracoes', label: 'Homologação', route: '/financeiro/configuracoes/homologacao', permission: 'financeiro.configuracoes' },

  { key: 'rh_dp.dashboard', parent: 'rh-dp', label: 'Dashboard', route: '/rh-dp/dashboard', permission: 'rh_dp.dashboard' },
  { key: 'rh_dp.colaboradores', parent: 'rh-dp', label: 'Colaboradores', route: '/rh-dp/colaboradores', permission: 'rh_dp.colaboradores' },
  { key: 'rh_dp.demandas_contabilidade', parent: 'rh-dp', label: 'Demandas à Contabilidade', route: '/rh-dp/demandas', permission: 'rh_dp.demandas_contabilidade' },
  { key: 'rh_dp.fechamentos', parent: 'rh-dp', label: 'Fechamento Mensal', route: '/rh-dp/fechamentos', permission: 'rh_dp.fechamentos' },

  { key: 'admin.sistema.corretora', parent: 'administracao', group: 'admin.sistema', label: 'Configurações da Corretora', route: '/configuracoes/corretora', permission: 'configuracoes.corretora' },
  { key: 'admin.logs_integracoes', parent: 'administracao', group: 'admin.sistema', label: 'Logs de Integrações', route: '/admin/sistema/logs-integracoes', permission: 'admin.logs_integracoes' },
  { key: 'admin.limites', parent: 'administracao', group: 'admin.parametros', label: 'Limites', route: '/admin/parametros/limites', permission: 'admin' },
  { key: 'admin.categorias', parent: 'administracao', group: 'admin.cadastros', label: 'Categorias', route: '/admin/cadastros/categorias', permission: 'admin' },
  { key: 'admin.grupos', parent: 'administracao', group: 'admin.cadastros', label: 'Grupos', route: '/admin/cadastros/grupos', permission: 'admin' },
  { key: 'admin.usuarios', parent: 'administracao', group: 'admin.cadastros', label: 'Usuários', route: '/admin/cadastros/usuarios', permission: 'admin.usuarios' },
  { key: 'admin.perfis', parent: 'administracao', group: 'admin.cadastros', label: 'Perfis', route: '/admin/cadastros/perfis', permission: 'admin.perfis' },
  { key: 'admin.parceiros_indicacao', parent: 'administracao', group: 'admin.cadastros', label: 'Parceiros de Indicação', route: '/admin/cadastros/parceiros-indicacao', permission: 'admin.parceiros_indicacao' },
];

export const HOME_SUBMODULE_GROUPS = {
  'painel_ar.crm_2': { label: 'CRM 2.0', parent: 'painel-ar', route: '/painel-ar/200', permission: 'painel_ar' },
  'central_senhas.links': { label: 'Links Úteis', parent: 'central-senhas', route: '/central-senhas/links', permission: 'central_senhas' },
  'operacoes.corretora.simulador_saude': { label: 'Simulador - Saúde', parent: 'operacoes-corretora', route: '/operacoes/corretora/simulador-saude', permission: 'simulador_saude' },
  'admin.sistema': { label: 'Sistema', parent: 'administracao' },
  'admin.parametros': { label: 'Parâmetros', parent: 'administracao' },
  'admin.cadastros': { label: 'Cadastros', parent: 'administracao' }
};

export function obterSubmodulosHomeConfigurados(registros = []) {
  const porChave = new Map((registros || []).map(item => [item.chave, item]));

  return HOME_SUBMODULES.map(definicao => {
    const registro = porChave.get(definicao.key);
    return {
      ...definicao,
      status: String(registro?.status || 'ativo').toLowerCase() === 'inativo' ? 'inativo' : 'ativo',
      exibir_home: registro?.exibir_home !== false && String(registro?.exibir_home || '').toLowerCase() !== 'false'
    };
  });
}
