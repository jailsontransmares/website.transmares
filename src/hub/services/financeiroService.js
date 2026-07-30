import { exigirSupabaseConfigurado } from '../supabaseClient.js';

const COLUNAS_EMPRESA = `
  id,
  codigo,
  razao_social,
  nome_fantasia,
  cnpj,
  status
`;

const COLUNAS_PARAMETRO = `
  empresa_id,
  chave,
  valor,
  sensivel,
  status
`;

const COLUNAS_CADASTROS_RESUMO = `
  empresa_id,
  pessoas,
  pessoas_ativas,
  clientes,
  fornecedores,
  parceiros,
  contas,
  categorias,
  centros_custo,
  linhas_negocio,
  contratos
`;

const COLUNAS_LANCAMENTOS_RESUMO = `
  empresa_id,
  total_lancamentos,
  em_aberto,
  liquidados,
  cancelados,
  valor_entradas_abertas,
  valor_saidas_abertas,
  parcelas_vencidas,
  baixas_confirmadas
`;

const COLUNAS_CONCILIACAO_RESUMO = `
  empresa_id,
  importacoes,
  movimentos,
  pendentes,
  sugeridos,
  conciliados,
  sugestoes_pendentes,
  conciliacoes_confirmadas
`;

const COLUNAS_DASHBOARD_RESUMO = `
  empresa_id,
  saldo_realizado_mes,
  saldo_projetado_30d,
  inadimplencia,
  parcelas_vencidas,
  conciliacao_pendente,
  periodos_fechados,
  relatorios_gerados
`;

const COLUNAS_CONTAS_PAGAR_RECEBER_RESUMO = `
  empresa_id,
  natureza,
  parcelas_abertas,
  vencidas,
  a_vencer,
  valor_aberto,
  valor_vencido
`;

const COLUNAS_FLUXO_CAIXA_RESUMO = `
  empresa_id,
  competencia,
  regime,
  entradas,
  saidas,
  saldo
`;

const COLUNAS_DRE_RESUMO = `
  empresa_id,
  competencia,
  receitas,
  despesas,
  resultado
`;

const COLUNAS_COMPLEMENTARES_RESUMO = `
  empresa_id,
  patrimonios_ativos,
  itens_estoque,
  itens_estoque_baixo,
  compras_abertas,
  recibos_emitidos,
  alertas_abertos,
  importacoes_pendentes,
  importacao_itens_pendentes,
  alertas_agendados,
  backups_falha
`;

const COLUNAS_HOMOLOGACAO_RESUMO = `
  empresa_id,
  ciclos,
  ciclos_abertos,
  checklist_pendente,
  divergencias_abertas,
  backup_restore_pendente
`;

function ordenarEmpresas(empresas = []) {
  return [...empresas].sort((a, b) => {
    const nomeA = a.nome_fantasia || a.razao_social || '';
    const nomeB = b.nome_fantasia || b.razao_social || '';
    return nomeA.localeCompare(nomeB, 'pt-BR');
  });
}

function mapearParametros(parametros = []) {
  return parametros.reduce((acc, item) => {
    const escopo = item.empresa_id || 'global';
    acc[escopo] ||= {};
    acc[escopo][item.chave] = item.valor;
    return acc;
  }, {});
}

function mapearResumoCadastros(resumos = []) {
  return resumos.reduce((acc, item) => {
    acc[item.empresa_id] = item;
    return acc;
  }, {});
}

function mapearResumoLancamentos(resumos = []) {
  return resumos.reduce((acc, item) => {
    acc[item.empresa_id] = item;
    return acc;
  }, {});
}

function mapearResumoConciliacao(resumos = []) {
  return resumos.reduce((acc, item) => {
    acc[item.empresa_id] = item;
    return acc;
  }, {});
}

function mapearResumoPorEmpresa(resumos = []) {
  return resumos.reduce((acc, item) => {
    acc[item.empresa_id] = item;
    return acc;
  }, {});
}

function agruparPorEmpresa(resumos = []) {
  return resumos.reduce((acc, item) => {
    acc[item.empresa_id] ||= [];
    acc[item.empresa_id].push(item);
    return acc;
  }, {});
}

export async function carregarContextoFinanceiro() {
  const supabase = exigirSupabaseConfigurado();
  const [
    empresasResponse,
    parametrosResponse,
    cadastrosResponse,
    lancamentosResponse,
    conciliacaoResponse,
    dashboardResponse,
    contasPagarReceberResponse,
    fluxoCaixaResponse,
    dreResponse,
    complementaresResponse,
    homologacaoResponse
  ] = await Promise.all([
    supabase
      .from('fin_empresas')
      .select(COLUNAS_EMPRESA)
      .eq('status', 'ativo'),
    supabase
      .from('fin_parametros')
      .select(COLUNAS_PARAMETRO)
      .eq('status', 'ativo'),
    supabase
      .from('fin_cadastros_resumo')
      .select(COLUNAS_CADASTROS_RESUMO),
    supabase
      .from('fin_lancamentos_resumo')
      .select(COLUNAS_LANCAMENTOS_RESUMO),
    supabase
      .from('fin_conciliacao_resumo')
      .select(COLUNAS_CONCILIACAO_RESUMO),
    supabase
      .from('fin_dashboard_resumo')
      .select(COLUNAS_DASHBOARD_RESUMO),
    supabase
      .from('fin_contas_pagar_receber_resumo')
      .select(COLUNAS_CONTAS_PAGAR_RECEBER_RESUMO),
    supabase
      .from('fin_fluxo_caixa_resumo')
      .select(COLUNAS_FLUXO_CAIXA_RESUMO),
    supabase
      .from('fin_dre_gerencial_resumo')
      .select(COLUNAS_DRE_RESUMO),
    supabase
      .from('fin_complementares_resumo')
      .select(COLUNAS_COMPLEMENTARES_RESUMO),
    supabase
      .from('fin_homologacao_resumo')
      .select(COLUNAS_HOMOLOGACAO_RESUMO)
  ]);

  if (empresasResponse.error) {
    throw new Error(empresasResponse.error.message || 'Nao foi possivel carregar as empresas do Financeiro.');
  }

  if (parametrosResponse.error) {
    throw new Error(parametrosResponse.error.message || 'Nao foi possivel carregar as configuracoes do Financeiro.');
  }

  if (cadastrosResponse.error && cadastrosResponse.error.code !== '42P01') {
    throw new Error(cadastrosResponse.error.message || 'Nao foi possivel carregar os cadastros do Financeiro.');
  }

  if (lancamentosResponse.error && lancamentosResponse.error.code !== '42P01') {
    throw new Error(lancamentosResponse.error.message || 'Nao foi possivel carregar os lancamentos do Financeiro.');
  }

  if (conciliacaoResponse.error && conciliacaoResponse.error.code !== '42P01') {
    throw new Error(conciliacaoResponse.error.message || 'Nao foi possivel carregar a conciliacao do Financeiro.');
  }

  if (dashboardResponse.error && dashboardResponse.error.code !== '42P01') {
    throw new Error(dashboardResponse.error.message || 'Nao foi possivel carregar o dashboard do Financeiro.');
  }

  if (contasPagarReceberResponse.error && contasPagarReceberResponse.error.code !== '42P01') {
    throw new Error(contasPagarReceberResponse.error.message || 'Nao foi possivel carregar os relatorios do Financeiro.');
  }

  if (fluxoCaixaResponse.error && fluxoCaixaResponse.error.code !== '42P01') {
    throw new Error(fluxoCaixaResponse.error.message || 'Nao foi possivel carregar o fluxo de caixa do Financeiro.');
  }

  if (dreResponse.error && dreResponse.error.code !== '42P01') {
    throw new Error(dreResponse.error.message || 'Nao foi possivel carregar a DRE do Financeiro.');
  }

  if (complementaresResponse.error && complementaresResponse.error.code !== '42P01') {
    throw new Error(complementaresResponse.error.message || 'Nao foi possivel carregar os complementares do Financeiro.');
  }

  if (homologacaoResponse.error && homologacaoResponse.error.code !== '42P01') {
    throw new Error(homologacaoResponse.error.message || 'Nao foi possivel carregar a homologacao do Financeiro.');
  }

  return {
    empresas: ordenarEmpresas(empresasResponse.data || []),
    parametros: mapearParametros(parametrosResponse.data || []),
    cadastrosResumo: mapearResumoCadastros(cadastrosResponse.data || []),
    lancamentosResumo: mapearResumoLancamentos(lancamentosResponse.data || []),
    conciliacaoResumo: mapearResumoConciliacao(conciliacaoResponse.data || []),
    dashboardResumo: mapearResumoPorEmpresa(dashboardResponse.data || []),
    contasPagarReceberResumo: agruparPorEmpresa(contasPagarReceberResponse.data || []),
    fluxoCaixaResumo: agruparPorEmpresa(fluxoCaixaResponse.data || []),
    dreResumo: agruparPorEmpresa(dreResponse.data || []),
    complementaresResumo: mapearResumoPorEmpresa(complementaresResponse.data || []),
    homologacaoResumo: mapearResumoPorEmpresa(homologacaoResponse.data || [])
  };
}
