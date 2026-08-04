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

const COLUNAS_CARTOES_RESUMO = `
  empresa_id,
  cartoes_ativos,
  compras_ativas,
  faturas_abertas,
  valor_faturas_abertas,
  parcelas_pendentes,
  pagamentos_confirmados
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

const COLUNAS_LANCAMENTO = `
  id,
  empresa_id,
  pessoa_id,
  conta_id,
  categoria_id,
  centro_custo_id,
  linha_negocio_id,
  contrato_id,
  natureza,
  tipo,
  descricao,
  valor_total,
  data_emissao,
  data_competencia,
  data_vencimento,
  forma_pagamento,
  observacoes,
  status,
  motivo_status,
  created_at,
  updated_at
`;

const COLUNAS_PARCELA = `
  id,
  empresa_id,
  lancamento_id,
  numero,
  total,
  valor,
  data_vencimento,
  status,
  created_at,
  updated_at
`;

const COLUNAS_BAIXA = `
  id,
  empresa_id,
  lancamento_id,
  parcela_id,
  conta_id,
  data_baixa,
  valor_principal,
  juros,
  multa,
  desconto,
  outros_ajustes,
  valor_total,
  forma_pagamento,
  justificativa,
  status,
  created_at
`;

const COLUNAS_RATEIO = `
  id,
  empresa_id,
  lancamento_id,
  categoria_id,
  centro_custo_id,
  linha_negocio_id,
  percentual,
  valor,
  observacoes,
  created_at
`;

const COLUNAS_RECORRENCIA = `
  id,
  empresa_id,
  lancamento_modelo_id,
  periodicidade,
  data_inicio,
  data_fim,
  proxima_geracao,
  status,
  created_at,
  updated_at
`;

const COLUNAS_CONCILIACAO_IMPORTACAO = `
  id,
  empresa_id,
  conta_id,
  formato,
  nome_arquivo,
  arquivo_hash,
  periodo_inicio,
  periodo_fim,
  total_movimentos,
  total_creditos,
  total_debitos,
  status,
  mensagem_erro,
  created_at,
  updated_at
`;

const COLUNAS_CONCILIACAO_MOVIMENTO = `
  id,
  empresa_id,
  importacao_id,
  conta_id,
  movimento_hash,
  data_movimento,
  data_contabil,
  descricao,
  documento,
  valor,
  tipo,
  saldo_apos,
  status,
  created_at,
  updated_at
`;

const COLUNAS_CONCILIACAO_SUGESTAO = `
  id,
  empresa_id,
  movimento_id,
  lancamento_id,
  parcela_id,
  score,
  criterios,
  status,
  created_at,
  updated_at
`;

const COLUNAS_CONCILIACAO = `
  id,
  empresa_id,
  movimento_id,
  lancamento_id,
  parcela_id,
  baixa_id,
  tipo_vinculo,
  valor_conciliado,
  data_conciliacao,
  status,
  motivo_desconciliacao,
  created_at,
  updated_at
`;

const COLUNAS_CARTAO = `
  id,
  empresa_id,
  conta_id,
  nome,
  bandeira,
  tipo,
  limite_credito,
  dia_fechamento,
  dia_vencimento,
  status,
  created_at,
  updated_at
`;

const COLUNAS_CARTAO_COMPRA = `
  id,
  empresa_id,
  cartao_id,
  lancamento_id,
  descricao,
  estabelecimento,
  data_compra,
  valor_total,
  parcelas,
  categoria_id,
  centro_custo_id,
  linha_negocio_id,
  status,
  observacoes,
  created_at,
  updated_at
`;

const COLUNAS_CARTAO_PARCELA = `
  id,
  empresa_id,
  compra_id,
  fatura_id,
  numero,
  total,
  valor,
  competencia,
  data_vencimento,
  status,
  created_at,
  updated_at
`;

const COLUNAS_CARTAO_FATURA = `
  id,
  empresa_id,
  cartao_id,
  competencia,
  data_fechamento,
  data_vencimento,
  valor_total,
  valor_pago,
  status,
  observacoes,
  created_at,
  updated_at
`;

const COLUNAS_CARTAO_PAGAMENTO = `
  id,
  empresa_id,
  fatura_id,
  conta_id,
  lancamento_id,
  baixa_id,
  data_pagamento,
  valor,
  forma_pagamento,
  status,
  observacoes,
  created_at,
  updated_at
`;

const COLUNAS_FECHAMENTO_PERIODO = `
  id,
  empresa_id,
  periodo_inicio,
  periodo_fim,
  tipo,
  status,
  snapshot,
  hash_snapshot,
  fechado_em,
  reaberto_em,
  motivo_reabertura,
  created_at,
  updated_at
`;

const COLUNAS_RELATORIO_EXECUCAO = `
  id,
  empresa_id,
  tipo_relatorio,
  periodo_inicio,
  periodo_fim,
  filtros,
  filtros_hash,
  resultado,
  status,
  exportado_em,
  created_at,
  updated_at
`;

const COLUNAS_ORCAMENTO = `
  id,
  empresa_id,
  competencia,
  natureza,
  categoria_id,
  centro_custo_id,
  valor_previsto,
  observacoes,
  status,
  created_at,
  updated_at
`;

const CONTEXTO_LANCAMENTOS_VAZIO = {
  lancamentos: [],
  parcelas: [],
  baixas: [],
  rateios: [],
  recorrencias: [],
  pessoas: [],
  contas: [],
  categorias: [],
  centrosCusto: [],
  linhasNegocio: []
};

const CONCILIACAO_FINANCEIRO_VAZIO = {
  importacoes: [],
  movimentos: [],
  sugestoes: [],
  conciliacoes: [],
  contas: [],
  lancamentos: [],
  parcelas: []
};

const CARTOES_FINANCEIRO_VAZIO = {
  cartoes: [],
  compras: [],
  parcelas: [],
  faturas: [],
  pagamentos: [],
  contas: [],
  categorias: [],
  centrosCusto: [],
  linhasNegocio: []
};

const RELATORIOS_FINANCEIRO_VAZIO = {
  periodos: [],
  relatorios: [],
  orcamentos: [],
  fluxo: [],
  contas: [],
  dre: [],
  categorias: [],
  centrosCusto: []
};

const COLUNAS_CONFIG_ALERTA = `
  id,
  empresa_id,
  tipo,
  severidade,
  titulo,
  mensagem,
  status,
  vencimento_em,
  lido_em,
  created_at,
  updated_at
`;

const COLUNAS_CONFIG_AGENDAMENTO = `
  id,
  empresa_id,
  tipo,
  titulo,
  mensagem,
  recorrencia,
  antecedencia_dias,
  proxima_execucao,
  status,
  created_at,
  updated_at
`;

const COLUNAS_CONFIG_BACKUP = `
  id,
  empresa_id,
  tipo,
  armazenamento,
  drive_path,
  status,
  retencao_dias,
  tentativa,
  proxima_tentativa,
  resultado,
  created_at,
  updated_at
`;

const COLUNAS_CONFIG_AUDITORIA = `
  id,
  empresa_id,
  acao,
  entidade,
  registro_id,
  motivo,
  created_at
`;

const COLUNAS_CONFIG_CICLO = `
  id,
  empresa_id,
  nome,
  status,
  iniciado_em,
  concluido_em,
  autorizacao_producao_em,
  created_at,
  updated_at
`;

const COLUNAS_CONFIG_CHECKLIST = `
  id,
  empresa_id,
  ciclo_id,
  grupo,
  item,
  status,
  observacoes,
  validado_at,
  created_at,
  updated_at
`;

const COLUNAS_CONFIG_DIVERGENCIA = `
  id,
  empresa_id,
  ciclo_id,
  tipo,
  severidade,
  descricao,
  valor_referencia,
  valor_financeiro,
  status,
  resolucao,
  resolved_at,
  created_at,
  updated_at
`;

const COLUNAS_CONFIG_RESTORE = `
  id,
  empresa_id,
  ciclo_id,
  tipo,
  referencia,
  status,
  executado_at,
  created_at,
  updated_at
`;

const COLUNAS_CONFIG_PARAMETRO_LINHA = `
  id,
  empresa_id,
  chave,
  valor,
  descricao,
  sensivel,
  status,
  created_at,
  updated_at
`;

const CONFIG_FINANCEIRO_VAZIO = {
  parametros: [],
  alertas: [],
  agendamentos: [],
  backups: [],
  auditoria: [],
  ciclos: [],
  checklist: [],
  divergencias: [],
  restoreValidacoes: []
};

const CADASTROS_FINANCEIRO_VAZIO = {
  pessoas: [],
  contas: [],
  categorias: [],
  centrosCusto: [],
  linhasNegocio: [],
  contratos: []
};

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

function mapearResumoCartoes(resumos = []) {
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

function normalizarErro(mensagemPadrao, erro) {
  return new Error(erro?.message || mensagemPadrao);
}

function normalizarValor(valor) {
  const texto = String(valor || '').trim();
  const normalizado = texto.includes(',')
    ? texto.replace(/\./g, '').replace(',', '.')
    : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

function primeiroDiaMes(data) {
  const valor = String(data || '').slice(0, 10);
  if (!valor) return '';

  return `${valor.slice(0, 7)}-01`;
}

function somarMeses(data, meses) {
  const [ano, mes, dia] = String(data || '').split('-').map(Number);
  const base = new Date(Date.UTC(ano, (mes || 1) - 1, dia || 1));
  base.setUTCMonth(base.getUTCMonth() + meses);
  return base.toISOString().slice(0, 10);
}

function dividirParcelas(valorTotal, total, primeiroVencimento) {
  const totalCentavos = Math.round(Number(valorTotal) * 100);
  const base = Math.floor(totalCentavos / total);
  let resto = totalCentavos - base * total;

  return Array.from({ length: total }, (_, indice) => {
    const ajuste = resto > 0 ? 1 : 0;
    resto -= ajuste;

    return {
      numero: indice + 1,
      total,
      valor: Number(((base + ajuste) / 100).toFixed(2)),
      data_vencimento: somarMeses(primeiroVencimento, indice),
      status: 'aberta'
    };
  });
}

function indexarPorId(lista = []) {
  return lista.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

function enriquecerLancamentos({ lancamentos, parcelas, baixas, rateios, recorrencias, pessoas, contas, categorias, centrosCusto, linhasNegocio }) {
  const pessoasPorId = indexarPorId(pessoas);
  const contasPorId = indexarPorId(contas);
  const categoriasPorId = indexarPorId(categorias);
  const centrosPorId = indexarPorId(centrosCusto);
  const linhasPorId = indexarPorId(linhasNegocio);
  const lancamentosPorId = indexarPorId(lancamentos);

  const lancamentosCompletos = lancamentos.map(item => ({
    ...item,
    pessoa: pessoasPorId[item.pessoa_id] || null,
    conta: contasPorId[item.conta_id] || null,
    categoria: categoriasPorId[item.categoria_id] || null,
    centroCusto: centrosPorId[item.centro_custo_id] || null,
    linhaNegocio: linhasPorId[item.linha_negocio_id] || null
  }));

  return {
    lancamentos: lancamentosCompletos,
    parcelas: parcelas.map(item => ({
      ...item,
      lancamento: lancamentosPorId[item.lancamento_id] || null
    })),
    baixas: baixas.map(item => ({
      ...item,
      lancamento: lancamentosPorId[item.lancamento_id] || null,
      parcela: parcelas.find(parcela => parcela.id === item.parcela_id) || null,
      conta: contasPorId[item.conta_id] || null
    })),
    rateios: rateios.map(item => ({
      ...item,
      lancamento: lancamentosPorId[item.lancamento_id] || null,
      categoria: categoriasPorId[item.categoria_id] || null,
      centroCusto: centrosPorId[item.centro_custo_id] || null,
      linhaNegocio: linhasPorId[item.linha_negocio_id] || null
    })),
    recorrencias: recorrencias.map(item => ({
      ...item,
      lancamento: lancamentosPorId[item.lancamento_modelo_id] || null
    })),
    pessoas,
    contas,
    categorias,
    centrosCusto,
    linhasNegocio
  };
}

function enriquecerConciliacao({ importacoes, movimentos, sugestoes, conciliacoes, contas, lancamentos, parcelas }) {
  const contasPorId = indexarPorId(contas);
  const importacoesPorId = indexarPorId(importacoes);
  const movimentosPorId = indexarPorId(movimentos);
  const lancamentosPorId = indexarPorId(lancamentos);
  const parcelasPorId = indexarPorId(parcelas);

  return {
    importacoes: importacoes.map(item => ({
      ...item,
      conta: contasPorId[item.conta_id] || null
    })),
    movimentos: movimentos.map(item => ({
      ...item,
      conta: contasPorId[item.conta_id] || null,
      importacao: importacoesPorId[item.importacao_id] || null
    })),
    sugestoes: sugestoes.map(item => ({
      ...item,
      movimento: movimentosPorId[item.movimento_id] || null,
      lancamento: lancamentosPorId[item.lancamento_id] || null,
      parcela: parcelasPorId[item.parcela_id] || null
    })),
    conciliacoes: conciliacoes.map(item => ({
      ...item,
      movimento: movimentosPorId[item.movimento_id] || null,
      lancamento: lancamentosPorId[item.lancamento_id] || null,
      parcela: parcelasPorId[item.parcela_id] || null
    })),
    contas,
    lancamentos,
    parcelas: parcelas.map(item => ({
      ...item,
      lancamento: lancamentosPorId[item.lancamento_id] || null
    }))
  };
}

function enriquecerCartoes({ cartoes, compras, parcelas, faturas, pagamentos, contas, categorias, centrosCusto, linhasNegocio }) {
  const cartoesPorId = indexarPorId(cartoes);
  const comprasPorId = indexarPorId(compras);
  const faturasPorId = indexarPorId(faturas);
  const contasPorId = indexarPorId(contas);
  const categoriasPorId = indexarPorId(categorias);
  const centrosPorId = indexarPorId(centrosCusto);
  const linhasPorId = indexarPorId(linhasNegocio);

  return {
    cartoes: cartoes.map(item => ({
      ...item,
      conta: contasPorId[item.conta_id] || null
    })),
    compras: compras.map(item => ({
      ...item,
      cartao: cartoesPorId[item.cartao_id] || null,
      categoria: categoriasPorId[item.categoria_id] || null,
      centroCusto: centrosPorId[item.centro_custo_id] || null,
      linhaNegocio: linhasPorId[item.linha_negocio_id] || null
    })),
    parcelas: parcelas.map(item => ({
      ...item,
      compra: comprasPorId[item.compra_id] || null,
      fatura: faturasPorId[item.fatura_id] || null
    })),
    faturas: faturas.map(item => ({
      ...item,
      cartao: cartoesPorId[item.cartao_id] || null
    })),
    pagamentos: pagamentos.map(item => ({
      ...item,
      fatura: faturasPorId[item.fatura_id] || null,
      conta: contasPorId[item.conta_id] || null
    })),
    contas,
    categorias,
    centrosCusto,
    linhasNegocio
  };
}

function enriquecerRelatorios({ periodos, relatorios, orcamentos, fluxo, contas, dre, categorias, centrosCusto }) {
  const categoriasPorId = indexarPorId(categorias);
  const centrosPorId = indexarPorId(centrosCusto);

  return {
    periodos,
    relatorios,
    orcamentos: orcamentos.map(item => ({
      ...item,
      categoria: categoriasPorId[item.categoria_id] || null,
      centroCusto: centrosPorId[item.centro_custo_id] || null
    })),
    fluxo,
    contas,
    dre,
    categorias,
    centrosCusto
  };
}

function criarHashFinanceiro(...partes) {
  const texto = partes
    .map(parte => String(parte || '').trim().toLowerCase())
    .join('|');
  let hash = 0;
  for (let indice = 0; indice < texto.length; indice += 1) {
    hash = ((hash << 5) - hash) + texto.charCodeAt(indice);
    hash |= 0;
  }
  return `manual-${Date.now()}-${Math.abs(hash)}`;
}

export async function carregarContextoFinanceiro() {
  const supabase = exigirSupabaseConfigurado();
  const [
    empresasResponse,
    parametrosResponse,
    cadastrosResponse,
    lancamentosResponse,
    conciliacaoResponse,
    cartoesResponse,
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
      .from('fin_cartoes_resumo')
      .select(COLUNAS_CARTOES_RESUMO),
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

  if (cartoesResponse.error && cartoesResponse.error.code !== '42P01') {
    throw new Error(cartoesResponse.error.message || 'Nao foi possivel carregar os cartoes do Financeiro.');
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
    cartoesResumo: mapearResumoCartoes(cartoesResponse.data || []),
    dashboardResumo: mapearResumoPorEmpresa(dashboardResponse.data || []),
    contasPagarReceberResumo: agruparPorEmpresa(contasPagarReceberResponse.data || []),
    fluxoCaixaResumo: agruparPorEmpresa(fluxoCaixaResponse.data || []),
    dreResumo: agruparPorEmpresa(dreResponse.data || []),
    complementaresResumo: mapearResumoPorEmpresa(complementaresResponse.data || []),
    homologacaoResumo: mapearResumoPorEmpresa(homologacaoResponse.data || [])
  };
}

export async function carregarCadastrosFinanceiros(empresaId) {
  if (!empresaId) return { ...CADASTROS_FINANCEIRO_VAZIO };

  const supabase = exigirSupabaseConfigurado();
  const [
    pessoasResponse,
    classificacoesResponse,
    contasResponse,
    categoriasResponse,
    centrosResponse,
    linhasResponse,
    contratosResponse
  ] = await Promise.all([
    supabase
      .from('cad_pessoas')
      .select('id, empresa_id, tipo_pessoa, nome_razao_social, nome_fantasia, cpf, cnpj, origem, observacoes, status, created_at, updated_at')
      .eq('empresa_id', empresaId)
      .order('nome_razao_social', { ascending: true })
      .limit(300),
    supabase
      .from('cad_pessoa_classificacoes')
      .select('id, empresa_id, pessoa_id, classificacao, status')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .limit(600),
    supabase
      .from('fin_contas')
      .select('id, empresa_id, nome, tipo, banco, agencia, conta, chave_pix, saldo_inicial, moeda, sensivel, status, created_at, updated_at')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true })
      .limit(300),
    supabase
      .from('fin_categorias')
      .select('id, empresa_id, categoria_pai_id, codigo, nome, natureza, dre_grupo, ordem, status, created_at, updated_at')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true })
      .limit(300),
    supabase
      .from('fin_centros_custo')
      .select('id, empresa_id, codigo, nome, descricao, ordem, status, created_at, updated_at')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true })
      .limit(300),
    supabase
      .from('fin_linhas_negocio')
      .select('id, empresa_id, codigo, nome, descricao, ordem, status, created_at, updated_at')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true })
      .limit(300),
    supabase
      .from('fin_contratos')
      .select('id, empresa_id, pessoa_id, numero, descricao, data_inicio, data_fim, valor_previsto, status, created_at, updated_at')
      .eq('empresa_id', empresaId)
      .order('data_inicio', { ascending: false })
      .limit(300)
  ]);

  const respostas = [
    [pessoasResponse, 'Nao foi possivel carregar pessoas.'],
    [classificacoesResponse, 'Nao foi possivel carregar classificacoes.'],
    [contasResponse, 'Nao foi possivel carregar contas.'],
    [categoriasResponse, 'Nao foi possivel carregar categorias.'],
    [centrosResponse, 'Nao foi possivel carregar centros de custo.'],
    [linhasResponse, 'Nao foi possivel carregar linhas de negocio.'],
    [contratosResponse, 'Nao foi possivel carregar contratos.']
  ];
  const erro = respostas.find(([resposta]) => resposta.error);
  if (erro) throw normalizarErro(erro[1], erro[0].error);

  const classificacoesPorPessoa = (classificacoesResponse.data || []).reduce((acc, item) => {
    acc[item.pessoa_id] ||= [];
    acc[item.pessoa_id].push(item.classificacao);
    return acc;
  }, {});
  const pessoas = (pessoasResponse.data || []).map(item => ({
    ...item,
    classificacoes: classificacoesPorPessoa[item.id] || []
  }));
  const pessoasPorId = indexarPorId(pessoas);

  return {
    pessoas,
    contas: contasResponse.data || [],
    categorias: categoriasResponse.data || [],
    centrosCusto: centrosResponse.data || [],
    linhasNegocio: linhasResponse.data || [],
    contratos: (contratosResponse.data || []).map(item => ({
      ...item,
      pessoa: pessoasPorId[item.pessoa_id] || null
    }))
  };
}

function somenteDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function valorOpcional(valor) {
  const texto = String(valor || '').trim();
  return texto || null;
}

export async function salvarCadastroFinanceiro(tipo, payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');

  if (tipo === 'pessoas') {
    if (!payload.nome_razao_social) throw new Error('Informe o nome da pessoa.');
    const tipoPessoa = payload.tipo_pessoa || 'sem_documento';
    const pessoaPayload = {
      empresa_id: payload.empresa_id,
      tipo_pessoa: tipoPessoa,
      nome_razao_social: payload.nome_razao_social,
      nome_fantasia: valorOpcional(payload.nome_fantasia),
      cpf: tipoPessoa === 'pf' ? somenteDigitos(payload.cpf) : null,
      cnpj: tipoPessoa === 'pj' ? somenteDigitos(payload.cnpj) : null,
      observacoes: valorOpcional(payload.observacoes),
      origem: 'manual',
      status: 'ativo'
    };
    const { data, error } = await supabase
      .from('cad_pessoas')
      .insert(pessoaPayload)
      .select('id')
      .single();
    if (error) throw normalizarErro('Nao foi possivel salvar a pessoa.', error);

    const classificacoes = ['cliente', 'fornecedor', 'parceiro'].filter(item => payload[item] === 'on');
    if (classificacoes.length) {
      const { error: classificacoesError } = await supabase
        .from('cad_pessoa_classificacoes')
        .insert(classificacoes.map(classificacao => ({
          empresa_id: payload.empresa_id,
          pessoa_id: data.id,
          classificacao,
          status: 'ativo'
        })));
      if (classificacoesError) throw normalizarErro('Pessoa salva, mas as classificacoes falharam.', classificacoesError);
    }
    return;
  }

  const mapas = {
    contas: {
      tabela: 'fin_contas',
      payload: {
        empresa_id: payload.empresa_id,
        nome: payload.nome,
        tipo: payload.tipo || 'banco',
        banco: valorOpcional(payload.banco),
        agencia: valorOpcional(payload.agencia),
        conta: valorOpcional(payload.conta),
        chave_pix: valorOpcional(payload.chave_pix),
        saldo_inicial: normalizarValor(payload.saldo_inicial),
        moeda: payload.moeda || 'BRL',
        sensivel: payload.sensivel === 'on',
        status: 'ativo'
      }
    },
    categorias: {
      tabela: 'fin_categorias',
      payload: {
        empresa_id: payload.empresa_id,
        categoria_pai_id: valorOpcional(payload.categoria_pai_id),
        codigo: valorOpcional(payload.codigo),
        nome: payload.nome,
        natureza: payload.natureza || 'entrada',
        dre_grupo: valorOpcional(payload.dre_grupo),
        ordem: Number.parseInt(payload.ordem || '0', 10) || 0,
        status: 'ativo'
      }
    },
    centros_custo: {
      tabela: 'fin_centros_custo',
      payload: {
        empresa_id: payload.empresa_id,
        codigo: valorOpcional(payload.codigo),
        nome: payload.nome,
        descricao: valorOpcional(payload.descricao),
        ordem: Number.parseInt(payload.ordem || '0', 10) || 0,
        status: 'ativo'
      }
    },
    linhas_negocio: {
      tabela: 'fin_linhas_negocio',
      payload: {
        empresa_id: payload.empresa_id,
        codigo: valorOpcional(payload.codigo),
        nome: payload.nome,
        descricao: valorOpcional(payload.descricao),
        ordem: Number.parseInt(payload.ordem || '0', 10) || 0,
        status: 'ativo'
      }
    },
    contratos: {
      tabela: 'fin_contratos',
      payload: {
        empresa_id: payload.empresa_id,
        pessoa_id: payload.pessoa_id,
        numero: valorOpcional(payload.numero),
        descricao: payload.descricao,
        data_inicio: payload.data_inicio,
        data_fim: valorOpcional(payload.data_fim),
        valor_previsto: payload.valor_previsto ? normalizarValor(payload.valor_previsto) : null,
        status: 'ativo'
      }
    }
  };

  const config = mapas[tipo];
  if (!config) throw new Error('Cadastro invalido.');
  if (!config.payload.nome && !config.payload.descricao) throw new Error('Preencha os campos obrigatorios.');

  const { error } = await supabase.from(config.tabela).insert(config.payload);
  if (error) throw normalizarErro('Nao foi possivel salvar o cadastro.', error);
}

export async function arquivarCadastroFinanceiro(tipo, payload) {
  const supabase = exigirSupabaseConfigurado();
  const tabelas = {
    pessoas: 'cad_pessoas',
    contas: 'fin_contas',
    categorias: 'fin_categorias',
    centros_custo: 'fin_centros_custo',
    linhas_negocio: 'fin_linhas_negocio',
    contratos: 'fin_contratos'
  };
  const tabela = tabelas[tipo];
  if (!tabela || !payload.id || !payload.empresa_id) throw new Error('Cadastro invalido.');

  const status = tipo === 'contratos' ? 'arquivado' : 'arquivado';
  const { error } = await supabase
    .from(tabela)
    .update({ status })
    .eq('id', payload.id)
    .eq('empresa_id', payload.empresa_id);
  if (error) throw normalizarErro('Nao foi possivel arquivar o cadastro.', error);
}

export async function salvarConfiguracoesFinanceiras(payload) {
  const supabase = exigirSupabaseConfigurado();
  const empresaId = payload.empresa_id || null;
  const registros = [
    {
      empresa_id: null,
      chave: 'modulo_ativo',
      valor: payload.modulo_ativo === 'on',
      descricao: 'Chave global de ativacao controlada do Financeiro.',
      sensivel: false,
      status: 'ativo'
    },
    {
      empresa_id: null,
      chave: 'moeda_padrao',
      valor: payload.moeda_padrao || 'BRL',
      descricao: 'Moeda operacional padrao do modulo.',
      sensivel: false,
      status: 'ativo'
    },
    {
      empresa_id: null,
      chave: 'timezone_padrao',
      valor: payload.timezone_padrao || 'America/Fortaleza',
      descricao: 'Fuso horario usado nas operacoes e relatorios.',
      sensivel: false,
      status: 'ativo'
    },
    {
      empresa_id: empresaId,
      chave: 'competencia_bloqueada_ate',
      valor: payload.competencia_bloqueada_ate || null,
      descricao: 'Competencia bloqueada para novos lancamentos manuais.',
      sensivel: false,
      status: 'ativo'
    },
    {
      empresa_id: empresaId,
      chave: 'dias_alerta_vencimento',
      valor: Number.parseInt(payload.dias_alerta_vencimento || '7', 10) || 7,
      descricao: 'Janela de alerta para vencimentos financeiros.',
      sensivel: false,
      status: 'ativo'
    },
    {
      empresa_id: empresaId,
      chave: 'baixar_parcela_sem_conta',
      valor: payload.baixar_parcela_sem_conta === 'on',
      descricao: 'Permite registrar baixa sem conta financeira informada.',
      sensivel: false,
      status: 'ativo'
    }
  ].filter(item => item.empresa_id !== undefined);

  if (!empresaId) throw new Error('Selecione uma empresa para salvar as configuracoes.');

  const { error } = await supabase
    .from('fin_parametros')
    .upsert(registros, { onConflict: 'empresa_id,chave' });

  if (error) {
    throw normalizarErro('Nao foi possivel salvar as configuracoes financeiras.', error);
  }
}

function normalizarValorParametro(payload) {
  const tipo = payload.tipo_valor || 'texto';
  const valor = String(payload.valor ?? '').trim();

  if (tipo === 'booleano') return payload.valor_booleano === 'on';
  if (tipo === 'numero') return normalizarValor(valor);
  if (tipo === 'json') {
    try {
      return JSON.parse(valor || 'null');
    } catch {
      throw new Error('Informe um JSON valido para o parametro.');
    }
  }
  if (tipo === 'nulo') return null;
  return valor;
}

export async function criarParametroFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  const chave = String(payload.chave || '').trim().toLowerCase();
  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');
  if (!/^[a-z][a-z0-9_.-]{1,79}$/.test(chave)) {
    throw new Error('Informe uma chave valida para o parametro.');
  }

  const empresaId = payload.escopo === 'global' ? null : payload.empresa_id;
  const registro = {
    empresa_id: empresaId,
    chave,
    valor: normalizarValorParametro(payload),
    descricao: valorOpcional(payload.descricao),
    sensivel: payload.sensivel === 'on',
    status: 'ativo'
  };

  const { error } = await supabase
    .from('fin_parametros')
    .upsert(registro, { onConflict: 'empresa_id,chave' });
  if (error) throw normalizarErro('Nao foi possivel salvar o parametro.', error);
}

export async function carregarConfiguracoesFinanceiras(empresaId) {
  if (!empresaId) return { ...CONFIG_FINANCEIRO_VAZIO };

  const supabase = exigirSupabaseConfigurado();
  const [
    parametrosResponse,
    alertasResponse,
    agendamentosResponse,
    backupsResponse,
    auditoriaResponse,
    ciclosResponse,
    checklistResponse,
    divergenciasResponse,
    restoreResponse
  ] = await Promise.all([
    supabase
      .from('fin_parametros')
      .select(COLUNAS_CONFIG_PARAMETRO_LINHA)
      .or(`empresa_id.eq.${empresaId},empresa_id.is.null`)
      .order('chave', { ascending: true })
      .limit(240),
    supabase
      .from('fin_alertas')
      .select(COLUNAS_CONFIG_ALERTA)
      .or(`empresa_id.eq.${empresaId},empresa_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('fin_alerta_agendamentos')
      .select(COLUNAS_CONFIG_AGENDAMENTO)
      .or(`empresa_id.eq.${empresaId},empresa_id.is.null`)
      .order('proxima_execucao', { ascending: true, nullsFirst: false })
      .limit(120),
    supabase
      .from('fin_backup_execucoes')
      .select(COLUNAS_CONFIG_BACKUP)
      .or(`empresa_id.eq.${empresaId},empresa_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('fin_auditoria')
      .select(COLUNAS_CONFIG_AUDITORIA)
      .or(`empresa_id.eq.${empresaId},empresa_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('fin_homologacao_ciclos')
      .select(COLUNAS_CONFIG_CICLO)
      .eq('empresa_id', empresaId)
      .order('iniciado_em', { ascending: false })
      .limit(80),
    supabase
      .from('fin_homologacao_checklist')
      .select(COLUNAS_CONFIG_CHECKLIST)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('fin_homologacao_divergencias')
      .select(COLUNAS_CONFIG_DIVERGENCIA)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('fin_backup_restore_validacoes')
      .select(COLUNAS_CONFIG_RESTORE)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(80)
  ]);

  const respostas = [
    [parametrosResponse, 'Nao foi possivel carregar parametros.'],
    [alertasResponse, 'Nao foi possivel carregar alertas.'],
    [agendamentosResponse, 'Nao foi possivel carregar agendamentos.'],
    [backupsResponse, 'Nao foi possivel carregar backups.'],
    [auditoriaResponse, 'Nao foi possivel carregar auditoria.'],
    [ciclosResponse, 'Nao foi possivel carregar ciclos de homologacao.'],
    [checklistResponse, 'Nao foi possivel carregar checklist.'],
    [divergenciasResponse, 'Nao foi possivel carregar divergencias.'],
    [restoreResponse, 'Nao foi possivel carregar validacoes de backup/restore.']
  ];
  const erro = respostas.find(([resposta]) => resposta.error && resposta.error.code !== '42P01');
  if (erro) throw normalizarErro(erro[1], erro[0].error);

  return {
    parametros: parametrosResponse.data || [],
    alertas: alertasResponse.data || [],
    agendamentos: agendamentosResponse.data || [],
    backups: backupsResponse.data || [],
    auditoria: auditoriaResponse.data || [],
    ciclos: ciclosResponse.data || [],
    checklist: checklistResponse.data || [],
    divergencias: divergenciasResponse.data || [],
    restoreValidacoes: restoreResponse.data || []
  };
}

export async function criarAlertaFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');
  if (!payload.titulo || !payload.mensagem) throw new Error('Informe titulo e mensagem do alerta.');

  const { error } = await supabase.from('fin_alertas').insert({
    empresa_id: payload.global === 'on' ? null : payload.empresa_id,
    tipo: payload.tipo || 'manual',
    severidade: payload.severidade || 'info',
    titulo: payload.titulo,
    mensagem: payload.mensagem,
    vencimento_em: payload.vencimento_em || null,
    status: 'aberto'
  });
  if (error) throw normalizarErro('Nao foi possivel criar o alerta.', error);
}

export async function atualizarStatusAlertaFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  const status = payload.status || 'resolvido';
  if (!payload.alerta_id) throw new Error('Alerta invalido.');

  const { error } = await supabase
    .from('fin_alertas')
    .update({
      status,
      lido_em: status === 'lido' ? new Date().toISOString() : null
    })
    .eq('id', payload.alerta_id);
  if (error) throw normalizarErro('Nao foi possivel atualizar o alerta.', error);
}

export async function criarAgendamentoAlertaFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');
  if (!payload.titulo || !payload.mensagem) throw new Error('Informe titulo e mensagem do agendamento.');

  const { error } = await supabase.from('fin_alerta_agendamentos').insert({
    empresa_id: payload.global === 'on' ? null : payload.empresa_id,
    tipo: payload.tipo || 'manual',
    titulo: payload.titulo,
    mensagem: payload.mensagem,
    recorrencia: payload.recorrencia || 'unico',
    antecedencia_dias: Number.parseInt(payload.antecedencia_dias || '0', 10) || 0,
    proxima_execucao: payload.proxima_execucao || null,
    status: 'ativo'
  });
  if (error) throw normalizarErro('Nao foi possivel criar o agendamento.', error);
}

export async function criarBackupFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');

  const { error } = await supabase.from('fin_backup_execucoes').insert({
    empresa_id: payload.global === 'on' ? null : payload.empresa_id,
    tipo: payload.tipo || 'completo',
    armazenamento: payload.armazenamento || 'google_drive',
    drive_path: payload.drive_path || null,
    retencao_dias: Number.parseInt(payload.retencao_dias || '15', 10) || 15,
    proxima_tentativa: payload.proxima_tentativa || null,
    status: 'agendado'
  });
  if (error) throw normalizarErro('Nao foi possivel agendar o backup.', error);
}

export async function atualizarStatusBackupFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.backup_id) throw new Error('Backup invalido.');

  const { error } = await supabase
    .from('fin_backup_execucoes')
    .update({ status: payload.status || 'cancelado' })
    .eq('id', payload.backup_id);
  if (error) throw normalizarErro('Nao foi possivel atualizar o backup.', error);
}

export async function criarCicloHomologacaoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');
  if (!payload.nome) throw new Error('Informe o nome do ciclo.');

  const { error } = await supabase.from('fin_homologacao_ciclos').insert({
    empresa_id: payload.empresa_id,
    nome: payload.nome,
    status: payload.status || 'preparacao',
    escopo_congelado: { origem: 'hub_financeiro_configuracoes' },
    plano_reversao: { descricao: payload.plano_reversao || '' }
  });
  if (error) throw normalizarErro('Nao foi possivel criar o ciclo.', error);
}

export async function atualizarStatusCicloHomologacaoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.ciclo_id) throw new Error('Ciclo invalido.');
  const status = payload.status || 'concluido';

  const { error } = await supabase
    .from('fin_homologacao_ciclos')
    .update({
      status,
      concluido_em: status === 'concluido' ? new Date().toISOString() : null
    })
    .eq('id', payload.ciclo_id)
    .eq('empresa_id', payload.empresa_id);
  if (error) throw normalizarErro('Nao foi possivel atualizar o ciclo.', error);
}

export async function criarChecklistHomologacaoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id || !payload.ciclo_id) throw new Error('Selecione um ciclo.');
  if (!payload.grupo || !payload.item) throw new Error('Informe grupo e item do checklist.');

  const { error } = await supabase.from('fin_homologacao_checklist').insert({
    empresa_id: payload.empresa_id,
    ciclo_id: payload.ciclo_id,
    grupo: payload.grupo,
    item: payload.item,
    observacoes: payload.observacoes || null,
    status: 'pendente'
  });
  if (error) throw normalizarErro('Nao foi possivel criar o item de checklist.', error);
}

export async function validarChecklistHomologacaoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.checklist_id) throw new Error('Checklist invalido.');

  const { error } = await supabase
    .from('fin_homologacao_checklist')
    .update({ status: 'validado', validado_at: new Date().toISOString() })
    .eq('id', payload.checklist_id)
    .eq('empresa_id', payload.empresa_id);
  if (error) throw normalizarErro('Nao foi possivel validar o checklist.', error);
}

export async function criarDivergenciaHomologacaoFinanceira(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id || !payload.ciclo_id) throw new Error('Selecione um ciclo.');
  if (!payload.descricao) throw new Error('Informe a divergencia.');

  const { error } = await supabase.from('fin_homologacao_divergencias').insert({
    empresa_id: payload.empresa_id,
    ciclo_id: payload.ciclo_id,
    tipo: payload.tipo || 'outro',
    severidade: payload.severidade || 'media',
    descricao: payload.descricao,
    valor_referencia: payload.valor_referencia ? normalizarValor(payload.valor_referencia) : null,
    valor_financeiro: payload.valor_financeiro ? normalizarValor(payload.valor_financeiro) : null,
    status: 'aberta'
  });
  if (error) throw normalizarErro('Nao foi possivel registrar a divergencia.', error);
}

export async function resolverDivergenciaHomologacaoFinanceira(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.divergencia_id) throw new Error('Divergencia invalida.');

  const { error } = await supabase
    .from('fin_homologacao_divergencias')
    .update({
      status: 'corrigida',
      resolucao: payload.resolucao || 'Resolvida pela tela de configuracoes.',
      resolved_at: new Date().toISOString()
    })
    .eq('id', payload.divergencia_id)
    .eq('empresa_id', payload.empresa_id);
  if (error) throw normalizarErro('Nao foi possivel resolver a divergencia.', error);
}

export async function carregarConciliacaoFinanceira(empresaId) {
  if (!empresaId) return { ...CONCILIACAO_FINANCEIRO_VAZIO };

  const supabase = exigirSupabaseConfigurado();
  const [
    importacoesResponse,
    movimentosResponse,
    sugestoesResponse,
    conciliacoesResponse,
    contasResponse,
    lancamentosResponse,
    parcelasResponse
  ] = await Promise.all([
    supabase.from('fin_extrato_importacoes').select(COLUNAS_CONCILIACAO_IMPORTACAO).eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(120),
    supabase.from('fin_movimentos_bancarios').select(COLUNAS_CONCILIACAO_MOVIMENTO).eq('empresa_id', empresaId).order('data_movimento', { ascending: false }).limit(220),
    supabase.from('fin_conciliacao_sugestoes').select(COLUNAS_CONCILIACAO_SUGESTAO).eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(160),
    supabase.from('fin_conciliacoes').select(COLUNAS_CONCILIACAO).eq('empresa_id', empresaId).order('data_conciliacao', { ascending: false }).limit(160),
    supabase.from('fin_contas').select('id, empresa_id, nome, tipo, status').eq('empresa_id', empresaId).eq('status', 'ativo').order('nome', { ascending: true }),
    supabase.from('fin_lancamentos').select('id, empresa_id, descricao, natureza, valor_total, data_vencimento, status').eq('empresa_id', empresaId).order('data_vencimento', { ascending: false }).limit(220),
    supabase.from('fin_lancamento_parcelas').select('id, empresa_id, lancamento_id, numero, total, valor, data_vencimento, status').eq('empresa_id', empresaId).order('data_vencimento', { ascending: true }).limit(260)
  ]);

  const respostas = [
    [importacoesResponse, 'Nao foi possivel carregar importacoes de extrato.'],
    [movimentosResponse, 'Nao foi possivel carregar movimentos bancarios.'],
    [sugestoesResponse, 'Nao foi possivel carregar sugestoes de conciliacao.'],
    [conciliacoesResponse, 'Nao foi possivel carregar conciliacoes.'],
    [contasResponse, 'Nao foi possivel carregar contas financeiras.'],
    [lancamentosResponse, 'Nao foi possivel carregar titulos financeiros.'],
    [parcelasResponse, 'Nao foi possivel carregar parcelas financeiras.']
  ];
  const erro = respostas.find(([resposta]) => resposta.error);
  if (erro) throw normalizarErro(erro[1], erro[0].error);

  return enriquecerConciliacao({
    importacoes: importacoesResponse.data || [],
    movimentos: movimentosResponse.data || [],
    sugestoes: sugestoesResponse.data || [],
    conciliacoes: conciliacoesResponse.data || [],
    contas: contasResponse.data || [],
    lancamentos: lancamentosResponse.data || [],
    parcelas: parcelasResponse.data || []
  });
}

export async function criarImportacaoExtratoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');
  if (!payload.conta_id) throw new Error('Selecione a conta do extrato.');
  if (!payload.nome_arquivo) throw new Error('Informe o nome do arquivo.');

  const { error } = await supabase.from('fin_extrato_importacoes').insert({
    empresa_id: payload.empresa_id,
    conta_id: payload.conta_id,
    formato: payload.formato || 'ofx',
    nome_arquivo: String(payload.nome_arquivo || '').trim(),
    arquivo_hash: criarHashFinanceiro(payload.empresa_id, payload.conta_id, payload.nome_arquivo, payload.periodo_inicio, payload.periodo_fim),
    periodo_inicio: valorOpcional(payload.periodo_inicio),
    periodo_fim: valorOpcional(payload.periodo_fim),
    status: 'importado',
    metadados: { origem: 'manual' }
  });

  if (error) throw normalizarErro('Nao foi possivel registrar a importacao.', error);
}

export async function criarMovimentoBancarioFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  const valorBruto = normalizarValor(payload.valor);
  const tipo = payload.tipo === 'debito' ? 'debito' : 'credito';
  const valor = tipo === 'debito' ? -Math.abs(valorBruto) : Math.abs(valorBruto);

  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');
  if (!payload.importacao_id) throw new Error('Selecione uma importacao.');
  if (!payload.conta_id) throw new Error('Selecione uma conta.');
  if (!payload.data_movimento) throw new Error('Informe a data do movimento.');
  if (!payload.descricao) throw new Error('Informe a descricao do movimento.');
  if (!valorBruto || valorBruto <= 0) throw new Error('Informe um valor maior que zero.');

  const { error } = await supabase.from('fin_movimentos_bancarios').insert({
    empresa_id: payload.empresa_id,
    importacao_id: payload.importacao_id,
    conta_id: payload.conta_id,
    movimento_hash: criarHashFinanceiro(payload.empresa_id, payload.importacao_id, payload.descricao, payload.data_movimento, valor),
    data_movimento: String(payload.data_movimento).slice(0, 10),
    data_contabil: valorOpcional(payload.data_contabil),
    descricao: String(payload.descricao || '').trim(),
    documento: valorOpcional(payload.documento),
    valor,
    tipo,
    saldo_apos: payload.saldo_apos ? normalizarValor(payload.saldo_apos) : null,
    status: 'pendente',
    metadados: { origem: 'manual' }
  });

  if (error) throw normalizarErro('Nao foi possivel registrar o movimento.', error);
}

async function obterAlvoConciliacao(supabase, payload) {
  if (payload.parcela_id) {
    const { data, error } = await supabase
      .from('fin_lancamento_parcelas')
      .select('id, empresa_id, lancamento_id, valor')
      .eq('id', payload.parcela_id)
      .eq('empresa_id', payload.empresa_id)
      .single();
    if (error) throw normalizarErro('Nao foi possivel localizar a parcela.', error);
    return { lancamento_id: data.lancamento_id, parcela_id: data.id, valor: Number(data.valor || 0) };
  }

  if (!payload.lancamento_id) throw new Error('Selecione um titulo ou parcela.');
  return { lancamento_id: payload.lancamento_id, parcela_id: null, valor: normalizarValor(payload.valor_conciliado) };
}

export async function criarSugestaoConciliacaoFinanceira(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');
  if (!payload.movimento_id) throw new Error('Selecione um movimento.');

  const alvo = await obterAlvoConciliacao(supabase, payload);
  const score = Math.min(1, Math.max(0, Number(payload.score || 0.85)));
  const { error } = await supabase.from('fin_conciliacao_sugestoes').insert({
    empresa_id: payload.empresa_id,
    movimento_id: payload.movimento_id,
    lancamento_id: alvo.lancamento_id,
    parcela_id: alvo.parcela_id,
    score,
    criterios: { origem: 'manual', observacao: valorOpcional(payload.observacao) },
    status: 'pendente'
  });

  if (error) throw normalizarErro('Nao foi possivel criar a sugestao.', error);

  const { error: movimentoError } = await supabase
    .from('fin_movimentos_bancarios')
    .update({ status: 'sugerido' })
    .eq('id', payload.movimento_id)
    .eq('empresa_id', payload.empresa_id)
    .eq('status', 'pendente');
  if (movimentoError) throw normalizarErro('Sugestao criada, mas o movimento nao foi atualizado.', movimentoError);
}

async function obterSugestaoConciliacao(supabase, payload) {
  if (!payload.sugestao_id) return null;

  const { data, error } = await supabase
    .from('fin_conciliacao_sugestoes')
    .select(COLUNAS_CONCILIACAO_SUGESTAO)
    .eq('id', payload.sugestao_id)
    .eq('empresa_id', payload.empresa_id)
    .single();
  if (error) throw normalizarErro('Nao foi possivel localizar a sugestao.', error);
  return data;
}

export async function confirmarConciliacaoFinanceira(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');

  const sugestao = await obterSugestaoConciliacao(supabase, payload);
  const base = sugestao || payload;
  if (!base.movimento_id) throw new Error('Selecione um movimento.');

  const alvo = await obterAlvoConciliacao(supabase, {
    ...payload,
    lancamento_id: base.lancamento_id || payload.lancamento_id,
    parcela_id: base.parcela_id || payload.parcela_id
  });
  const valor = Math.abs(normalizarValor(payload.valor_conciliado) || alvo.valor);
  if (!valor || valor <= 0) throw new Error('Informe um valor conciliado maior que zero.');

  const { error } = await supabase.from('fin_conciliacoes').insert({
    empresa_id: payload.empresa_id,
    movimento_id: base.movimento_id,
    lancamento_id: alvo.lancamento_id,
    parcela_id: alvo.parcela_id,
    tipo_vinculo: sugestao ? 'sugestao' : 'manual',
    valor_conciliado: valor,
    data_conciliacao: valorOpcional(payload.data_conciliacao) || new Date().toISOString().slice(0, 10),
    status: 'conciliada'
  });
  if (error) throw normalizarErro('Nao foi possivel confirmar a conciliacao.', error);

  const atualizacoes = [
    supabase.from('fin_movimentos_bancarios').update({ status: 'conciliado' }).eq('id', base.movimento_id).eq('empresa_id', payload.empresa_id)
  ];
  if (sugestao) {
    atualizacoes.push(
      supabase.from('fin_conciliacao_sugestoes').update({ status: 'aceita' }).eq('id', sugestao.id).eq('empresa_id', payload.empresa_id)
    );
  }

  const resultados = await Promise.all(atualizacoes);
  const erroAtualizacao = resultados.find(resultado => resultado.error);
  if (erroAtualizacao) throw normalizarErro('Conciliacao criada, mas os status nao foram atualizados.', erroAtualizacao.error);
}

export async function rejeitarSugestaoConciliacaoFinanceira(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id || !payload.sugestao_id) throw new Error('Sugestao invalida.');

  const sugestao = await obterSugestaoConciliacao(supabase, payload);
  const { error } = await supabase
    .from('fin_conciliacao_sugestoes')
    .update({ status: 'rejeitada' })
    .eq('id', payload.sugestao_id)
    .eq('empresa_id', payload.empresa_id);
  if (error) throw normalizarErro('Nao foi possivel rejeitar a sugestao.', error);

  await supabase
    .from('fin_movimentos_bancarios')
    .update({ status: 'pendente' })
    .eq('id', sugestao.movimento_id)
    .eq('empresa_id', payload.empresa_id)
    .eq('status', 'sugerido');
}

export async function desfazerConciliacaoFinanceira(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id || !payload.conciliacao_id) throw new Error('Conciliacao invalida.');

  const { data, error: consultaError } = await supabase
    .from('fin_conciliacoes')
    .select('id, empresa_id, movimento_id')
    .eq('id', payload.conciliacao_id)
    .eq('empresa_id', payload.empresa_id)
    .single();
  if (consultaError) throw normalizarErro('Nao foi possivel localizar a conciliacao.', consultaError);

  const { error } = await supabase
    .from('fin_conciliacoes')
    .update({
      status: 'desconciliada',
      motivo_desconciliacao: payload.motivo_desconciliacao || 'Desfeito pela tela de conciliacao.'
    })
    .eq('id', payload.conciliacao_id)
    .eq('empresa_id', payload.empresa_id);
  if (error) throw normalizarErro('Nao foi possivel desfazer a conciliacao.', error);

  await supabase
    .from('fin_movimentos_bancarios')
    .update({ status: 'pendente' })
    .eq('id', data.movimento_id)
    .eq('empresa_id', payload.empresa_id);
}

export async function carregarCartoesFinanceiros(empresaId) {
  if (!empresaId) return { ...CARTOES_FINANCEIRO_VAZIO };

  const supabase = exigirSupabaseConfigurado();
  const [
    cartoesResponse,
    comprasResponse,
    parcelasResponse,
    faturasResponse,
    pagamentosResponse,
    contasResponse,
    categoriasResponse,
    centrosResponse,
    linhasResponse
  ] = await Promise.all([
    supabase.from('fin_cartoes').select(COLUNAS_CARTAO).eq('empresa_id', empresaId).order('nome', { ascending: true }).limit(120),
    supabase.from('fin_cartao_compras').select(COLUNAS_CARTAO_COMPRA).eq('empresa_id', empresaId).order('data_compra', { ascending: false }).limit(180),
    supabase.from('fin_cartao_parcelas').select(COLUNAS_CARTAO_PARCELA).eq('empresa_id', empresaId).order('data_vencimento', { ascending: true }).limit(240),
    supabase.from('fin_cartao_faturas').select(COLUNAS_CARTAO_FATURA).eq('empresa_id', empresaId).order('data_vencimento', { ascending: false }).limit(160),
    supabase.from('fin_cartao_pagamentos').select(COLUNAS_CARTAO_PAGAMENTO).eq('empresa_id', empresaId).order('data_pagamento', { ascending: false }).limit(160),
    supabase.from('fin_contas').select('id, empresa_id, nome, tipo, status').eq('empresa_id', empresaId).eq('status', 'ativo').order('nome', { ascending: true }),
    supabase.from('fin_categorias').select('id, nome, natureza, status').eq('empresa_id', empresaId).eq('status', 'ativo').order('nome', { ascending: true }),
    supabase.from('fin_centros_custo').select('id, nome, status').eq('empresa_id', empresaId).eq('status', 'ativo').order('nome', { ascending: true }),
    supabase.from('fin_linhas_negocio').select('id, nome, status').eq('empresa_id', empresaId).eq('status', 'ativo').order('nome', { ascending: true })
  ]);

  const respostas = [
    [cartoesResponse, 'Nao foi possivel carregar cartoes.'],
    [comprasResponse, 'Nao foi possivel carregar compras de cartao.'],
    [parcelasResponse, 'Nao foi possivel carregar parcelas de cartao.'],
    [faturasResponse, 'Nao foi possivel carregar faturas.'],
    [pagamentosResponse, 'Nao foi possivel carregar pagamentos de faturas.'],
    [contasResponse, 'Nao foi possivel carregar contas.'],
    [categoriasResponse, 'Nao foi possivel carregar categorias.']
  ];
  const erro = respostas.find(([resposta]) => resposta.error);
  if (erro) throw normalizarErro(erro[1], erro[0].error);

  return enriquecerCartoes({
    cartoes: cartoesResponse.data || [],
    compras: comprasResponse.data || [],
    parcelas: parcelasResponse.data || [],
    faturas: faturasResponse.data || [],
    pagamentos: pagamentosResponse.data || [],
    contas: contasResponse.data || [],
    categorias: categoriasResponse.data || [],
    centrosCusto: centrosResponse.error ? [] : centrosResponse.data || [],
    linhasNegocio: linhasResponse.error ? [] : linhasResponse.data || []
  });
}

function competenciaMes(data) {
  return primeiroDiaMes(data || new Date().toISOString().slice(0, 10));
}

function dividirParcelasCartao(valorTotal, total, primeiraCompetencia, primeiroVencimento) {
  return dividirParcelas(valorTotal, total, primeiroVencimento).map(parcela => ({
    ...parcela,
    competencia: somarMeses(primeiraCompetencia, parcela.numero - 1),
    status: 'aberta'
  }));
}

export async function criarCartaoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');
  if (!payload.conta_id) throw new Error('Selecione a conta vinculada.');
  if (!payload.nome) throw new Error('Informe o nome do cartao.');

  const { error } = await supabase.from('fin_cartoes').insert({
    empresa_id: payload.empresa_id,
    conta_id: payload.conta_id,
    nome: String(payload.nome || '').trim(),
    bandeira: valorOpcional(payload.bandeira),
    tipo: payload.tipo || 'credito',
    limite_credito: normalizarValor(payload.limite_credito),
    dia_fechamento: Number.parseInt(payload.dia_fechamento || '1', 10) || 1,
    dia_vencimento: Number.parseInt(payload.dia_vencimento || '10', 10) || 10,
    status: 'ativo'
  });

  if (error) throw normalizarErro('Nao foi possivel criar o cartao.', error);
}

export async function criarCompraCartaoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  const valorTotal = normalizarValor(payload.valor_total);
  const totalParcelas = Math.max(1, Number.parseInt(payload.parcelas || '1', 10) || 1);
  const dataCompra = String(payload.data_compra || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const primeiraCompetencia = competenciaMes(payload.competencia || dataCompra);
  const primeiroVencimento = String(payload.data_vencimento || dataCompra).slice(0, 10);

  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');
  if (!payload.cartao_id) throw new Error('Selecione um cartao.');
  if (!payload.descricao) throw new Error('Informe a descricao da compra.');
  if (!valorTotal || valorTotal <= 0) throw new Error('Informe um valor maior que zero.');

  const { data: compra, error } = await supabase
    .from('fin_cartao_compras')
    .insert({
      empresa_id: payload.empresa_id,
      cartao_id: payload.cartao_id,
      descricao: String(payload.descricao || '').trim(),
      estabelecimento: valorOpcional(payload.estabelecimento),
      data_compra: dataCompra,
      valor_total: valorTotal,
      parcelas: totalParcelas,
      categoria_id: valorOpcional(payload.categoria_id),
      centro_custo_id: valorOpcional(payload.centro_custo_id),
      linha_negocio_id: valorOpcional(payload.linha_negocio_id),
      observacoes: valorOpcional(payload.observacoes),
      status: 'ativa'
    })
    .select('id')
    .single();

  if (error) throw normalizarErro('Nao foi possivel registrar a compra.', error);

  const parcelasPayload = dividirParcelasCartao(valorTotal, totalParcelas, primeiraCompetencia, primeiroVencimento).map(parcela => ({
    ...parcela,
    empresa_id: payload.empresa_id,
    compra_id: compra.id
  }));
  const { error: parcelasError } = await supabase.from('fin_cartao_parcelas').insert(parcelasPayload);
  if (parcelasError) throw normalizarErro('Compra criada, mas as parcelas nao foram geradas.', parcelasError);
}

export async function criarFaturaCartaoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  const competencia = competenciaMes(payload.competencia || payload.data_fechamento);
  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');
  if (!payload.cartao_id) throw new Error('Selecione um cartao.');
  if (!payload.data_fechamento || !payload.data_vencimento) throw new Error('Informe fechamento e vencimento.');

  const { data: fatura, error } = await supabase
    .from('fin_cartao_faturas')
    .insert({
      empresa_id: payload.empresa_id,
      cartao_id: payload.cartao_id,
      competencia,
      data_fechamento: String(payload.data_fechamento).slice(0, 10),
      data_vencimento: String(payload.data_vencimento).slice(0, 10),
      valor_total: 0,
      valor_pago: 0,
      status: payload.status || 'aberta',
      observacoes: valorOpcional(payload.observacoes)
    })
    .select('id')
    .single();

  if (error) throw normalizarErro('Nao foi possivel criar a fatura.', error);

  const { data: parcelas, error: parcelasConsultaError } = await supabase
    .from('fin_cartao_parcelas')
    .select('id, valor')
    .eq('empresa_id', payload.empresa_id)
    .eq('competencia', competencia)
    .eq('status', 'aberta');
  if (parcelasConsultaError) throw normalizarErro('Fatura criada, mas as parcelas nao foram localizadas.', parcelasConsultaError);

  const total = (parcelas || []).reduce((acc, item) => acc + Number(item.valor || 0), 0);
  if ((parcelas || []).length) {
    const { error: parcelasUpdateError } = await supabase
      .from('fin_cartao_parcelas')
      .update({ fatura_id: fatura.id, status: 'faturada' })
      .eq('empresa_id', payload.empresa_id)
      .eq('competencia', competencia)
      .eq('status', 'aberta');
    if (parcelasUpdateError) throw normalizarErro('Fatura criada, mas as parcelas nao foram vinculadas.', parcelasUpdateError);
  }

  const { error: faturaUpdateError } = await supabase
    .from('fin_cartao_faturas')
    .update({ valor_total: Number(total.toFixed(2)) })
    .eq('id', fatura.id)
    .eq('empresa_id', payload.empresa_id);
  if (faturaUpdateError) throw normalizarErro('Fatura criada, mas o total nao foi atualizado.', faturaUpdateError);
}

export async function pagarFaturaCartaoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  const valor = normalizarValor(payload.valor);
  if (!payload.empresa_id || !payload.fatura_id) throw new Error('Selecione uma fatura.');
  if (!valor || valor <= 0) throw new Error('Informe um valor de pagamento maior que zero.');

  const { data: fatura, error: consultaError } = await supabase
    .from('fin_cartao_faturas')
    .select('id, empresa_id, valor_total, valor_pago')
    .eq('id', payload.fatura_id)
    .eq('empresa_id', payload.empresa_id)
    .single();
  if (consultaError) throw normalizarErro('Nao foi possivel localizar a fatura.', consultaError);

  const { error } = await supabase.from('fin_cartao_pagamentos').insert({
    empresa_id: payload.empresa_id,
    fatura_id: payload.fatura_id,
    conta_id: valorOpcional(payload.conta_id),
    data_pagamento: String(payload.data_pagamento || new Date().toISOString().slice(0, 10)).slice(0, 10),
    valor,
    forma_pagamento: valorOpcional(payload.forma_pagamento),
    observacoes: valorOpcional(payload.observacoes),
    status: 'confirmado'
  });
  if (error) throw normalizarErro('Nao foi possivel registrar o pagamento.', error);

  const valorPago = Number(fatura.valor_pago || 0) + valor;
  const status = valorPago >= Number(fatura.valor_total || 0) ? 'paga' : 'parcial';
  const { error: faturaError } = await supabase
    .from('fin_cartao_faturas')
    .update({ valor_pago: Number(valorPago.toFixed(2)), status })
    .eq('id', payload.fatura_id)
    .eq('empresa_id', payload.empresa_id);
  if (faturaError) throw normalizarErro('Pagamento registrado, mas a fatura nao foi atualizada.', faturaError);

  if (status === 'paga') {
    await supabase
      .from('fin_cartao_parcelas')
      .update({ status: 'paga' })
      .eq('empresa_id', payload.empresa_id)
      .eq('fatura_id', payload.fatura_id);
  }
}

export async function cancelarItemCartaoFinanceiro(tipo, payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id || !payload.id) throw new Error('Registro invalido para cancelamento.');

  const mapas = {
    cartao: { tabela: 'fin_cartoes', status: 'cancelado' },
    compra: { tabela: 'fin_cartao_compras', status: 'cancelada' },
    fatura: { tabela: 'fin_cartao_faturas', status: 'cancelada' },
    pagamento: { tabela: 'fin_cartao_pagamentos', status: 'cancelado' }
  };
  const mapa = mapas[tipo];
  if (!mapa) throw new Error('Tipo de cartao invalido.');

  const { error } = await supabase
    .from(mapa.tabela)
    .update({ status: mapa.status })
    .eq('id', payload.id)
    .eq('empresa_id', payload.empresa_id);
  if (error) throw normalizarErro('Nao foi possivel cancelar o registro.', error);
}

export async function carregarRelatoriosFechamentoFinanceiro(empresaId) {
  if (!empresaId) return { ...RELATORIOS_FINANCEIRO_VAZIO };

  const supabase = exigirSupabaseConfigurado();
  const [
    periodosResponse,
    relatoriosResponse,
    orcamentosResponse,
    fluxoResponse,
    contasResponse,
    dreResponse,
    categoriasResponse,
    centrosResponse
  ] = await Promise.all([
    supabase.from('fin_fechamento_periodos').select(COLUNAS_FECHAMENTO_PERIODO).eq('empresa_id', empresaId).order('periodo_inicio', { ascending: false }).limit(120),
    supabase.from('fin_relatorio_execucoes').select(COLUNAS_RELATORIO_EXECUCAO).eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(160),
    supabase.from('fin_orcamentos').select(COLUNAS_ORCAMENTO).eq('empresa_id', empresaId).order('competencia', { ascending: false }).limit(180),
    supabase.from('fin_fluxo_caixa_resumo').select(COLUNAS_FLUXO_CAIXA_RESUMO).eq('empresa_id', empresaId).order('competencia', { ascending: false }).limit(120),
    supabase.from('fin_contas_pagar_receber_resumo').select(COLUNAS_CONTAS_PAGAR_RECEBER_RESUMO).eq('empresa_id', empresaId),
    supabase.from('fin_dre_gerencial_resumo').select(COLUNAS_DRE_RESUMO).eq('empresa_id', empresaId).order('competencia', { ascending: false }).limit(120),
    supabase.from('fin_categorias').select('id, nome, natureza, status').eq('empresa_id', empresaId).eq('status', 'ativo').order('nome', { ascending: true }),
    supabase.from('fin_centros_custo').select('id, nome, status').eq('empresa_id', empresaId).eq('status', 'ativo').order('nome', { ascending: true })
  ]);

  const respostas = [
    [periodosResponse, 'Nao foi possivel carregar periodos de fechamento.'],
    [relatoriosResponse, 'Nao foi possivel carregar relatorios.'],
    [orcamentosResponse, 'Nao foi possivel carregar orcamentos.'],
    [fluxoResponse, 'Nao foi possivel carregar fluxo de caixa.'],
    [contasResponse, 'Nao foi possivel carregar contas a pagar e receber.'],
    [dreResponse, 'Nao foi possivel carregar DRE.'],
    [categoriasResponse, 'Nao foi possivel carregar categorias.']
  ];
  const erro = respostas.find(([resposta]) => resposta.error);
  if (erro) throw normalizarErro(erro[1], erro[0].error);

  return enriquecerRelatorios({
    periodos: periodosResponse.data || [],
    relatorios: relatoriosResponse.data || [],
    orcamentos: orcamentosResponse.data || [],
    fluxo: fluxoResponse.data || [],
    contas: contasResponse.data || [],
    dre: dreResponse.data || [],
    categorias: categoriasResponse.data || [],
    centrosCusto: centrosResponse.error ? [] : centrosResponse.data || []
  });
}

function filtrosHashRelatorio(payload) {
  return criarHashFinanceiro(payload.empresa_id, payload.tipo_relatorio, payload.periodo_inicio, payload.periodo_fim, payload.regime, payload.natureza);
}

export async function gerarRelatorioFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');
  if (!payload.tipo_relatorio) throw new Error('Selecione o tipo do relatorio.');
  if (!payload.periodo_inicio || !payload.periodo_fim) throw new Error('Informe o periodo do relatorio.');

  const filtros = {
    regime: valorOpcional(payload.regime),
    natureza: valorOpcional(payload.natureza),
    categoria_id: valorOpcional(payload.categoria_id),
    centro_custo_id: valorOpcional(payload.centro_custo_id)
  };

  const { error } = await supabase.from('fin_relatorio_execucoes').insert({
    empresa_id: payload.empresa_id,
    tipo_relatorio: payload.tipo_relatorio,
    periodo_inicio: String(payload.periodo_inicio).slice(0, 10),
    periodo_fim: String(payload.periodo_fim).slice(0, 10),
    filtros,
    filtros_hash: filtrosHashRelatorio(payload),
    resultado: {
      origem: 'hub_financeiro',
      gerado_em: new Date().toISOString(),
      observacoes: valorOpcional(payload.observacoes)
    },
    status: 'gerado'
  });

  if (error) throw normalizarErro('Nao foi possivel gerar o relatorio.', error);
}

export async function exportarRelatorioFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id || !payload.relatorio_id) throw new Error('Relatorio invalido.');

  const { error } = await supabase
    .from('fin_relatorio_execucoes')
    .update({ status: 'exportado', exportado_em: new Date().toISOString() })
    .eq('id', payload.relatorio_id)
    .eq('empresa_id', payload.empresa_id);
  if (error) throw normalizarErro('Nao foi possivel exportar o relatorio.', error);
}

export async function salvarOrcamentoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  const valorPrevisto = normalizarValor(payload.valor_previsto);
  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');
  if (!payload.competencia) throw new Error('Informe a competencia.');
  if (!valorPrevisto && valorPrevisto !== 0) throw new Error('Informe o valor previsto.');

  const { error } = await supabase.from('fin_orcamentos').insert({
    empresa_id: payload.empresa_id,
    competencia: competenciaMes(payload.competencia),
    natureza: payload.natureza === 'saida' ? 'saida' : 'entrada',
    categoria_id: valorOpcional(payload.categoria_id),
    centro_custo_id: valorOpcional(payload.centro_custo_id),
    valor_previsto: valorPrevisto,
    observacoes: valorOpcional(payload.observacoes),
    status: 'ativo'
  });

  if (error) throw normalizarErro('Nao foi possivel salvar o orcamento.', error);
}

export async function arquivarOrcamentoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id || !payload.orcamento_id) throw new Error('Orcamento invalido.');

  const { error } = await supabase
    .from('fin_orcamentos')
    .update({ status: 'arquivado' })
    .eq('id', payload.orcamento_id)
    .eq('empresa_id', payload.empresa_id);
  if (error) throw normalizarErro('Nao foi possivel arquivar o orcamento.', error);
}

export async function criarPeriodoFechamentoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');
  if (!payload.periodo_inicio || !payload.periodo_fim) throw new Error('Informe o periodo.');

  const status = payload.status === 'fechado' ? 'fechado' : 'aberto';
  const { error } = await supabase.from('fin_fechamento_periodos').insert({
    empresa_id: payload.empresa_id,
    periodo_inicio: String(payload.periodo_inicio).slice(0, 10),
    periodo_fim: String(payload.periodo_fim).slice(0, 10),
    tipo: payload.tipo || 'mensal',
    status,
    snapshot: {
      origem: 'hub_financeiro',
      criado_em: new Date().toISOString(),
      observacoes: valorOpcional(payload.observacoes)
    }
  });

  if (error) throw normalizarErro('Nao foi possivel criar o periodo de fechamento.', error);
}

export async function atualizarPeriodoFechamentoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id || !payload.periodo_id) throw new Error('Periodo invalido.');

  const status = payload.status;
  if (!['fechado', 'reaberto', 'cancelado'].includes(status)) throw new Error('Status de fechamento invalido.');

  const { error } = await supabase
    .from('fin_fechamento_periodos')
    .update({
      status,
      motivo_reabertura: status === 'reaberto'
        ? (payload.motivo_reabertura || 'Periodo reaberto pela tela de relatorios.')
        : null
    })
    .eq('id', payload.periodo_id)
    .eq('empresa_id', payload.empresa_id);
  if (error) throw normalizarErro('Nao foi possivel atualizar o periodo.', error);
}

export async function carregarLancamentosFinanceiros(empresaId) {
  if (!empresaId) return { ...CONTEXTO_LANCAMENTOS_VAZIO };

  const supabase = exigirSupabaseConfigurado();
  const [
    lancamentosResponse,
    parcelasResponse,
    baixasResponse,
    rateiosResponse,
    recorrenciasResponse,
    pessoasResponse,
    contasResponse,
    categoriasResponse,
    centrosCustoResponse,
    linhasNegocioResponse
  ] = await Promise.all([
    supabase
      .from('fin_lancamentos')
      .select(COLUNAS_LANCAMENTO)
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: false })
      .limit(120),
    supabase
      .from('fin_lancamento_parcelas')
      .select(COLUNAS_PARCELA)
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: true })
      .limit(180),
    supabase
      .from('fin_lancamento_baixas')
      .select(COLUNAS_BAIXA)
      .eq('empresa_id', empresaId)
      .order('data_baixa', { ascending: false })
      .limit(120),
    supabase
      .from('fin_lancamento_rateios')
      .select(COLUNAS_RATEIO)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('fin_lancamento_recorrencias')
      .select(COLUNAS_RECORRENCIA)
      .eq('empresa_id', empresaId)
      .order('proxima_geracao', { ascending: true, nullsFirst: false })
      .limit(120),
    supabase
      .from('cad_pessoas')
      .select('id, nome_razao_social, nome_fantasia, status')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .order('nome_razao_social', { ascending: true })
      .limit(300),
    supabase
      .from('fin_contas')
      .select('id, nome, tipo, status')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .order('nome', { ascending: true }),
    supabase
      .from('fin_categorias')
      .select('id, nome, natureza, status')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .order('nome', { ascending: true }),
    supabase
      .from('fin_centros_custo')
      .select('id, nome, status')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .order('nome', { ascending: true }),
    supabase
      .from('fin_linhas_negocio')
      .select('id, nome, status')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .order('nome', { ascending: true })
  ]);

  const respostasObrigatorias = [
    [lancamentosResponse, 'Nao foi possivel carregar os titulos financeiros.'],
    [parcelasResponse, 'Nao foi possivel carregar as parcelas financeiras.'],
    [baixasResponse, 'Nao foi possivel carregar as baixas financeiras.'],
    [rateiosResponse, 'Nao foi possivel carregar os rateios financeiros.'],
    [recorrenciasResponse, 'Nao foi possivel carregar as recorrencias financeiras.'],
    [contasResponse, 'Nao foi possivel carregar as contas financeiras.'],
    [categoriasResponse, 'Nao foi possivel carregar as categorias financeiras.']
  ];

  const erroObrigatorio = respostasObrigatorias.find(([resposta]) => resposta.error);
  if (erroObrigatorio) {
    throw normalizarErro(erroObrigatorio[1], erroObrigatorio[0].error);
  }

  return enriquecerLancamentos({
    lancamentos: lancamentosResponse.data || [],
    parcelas: parcelasResponse.data || [],
    baixas: baixasResponse.data || [],
    rateios: rateiosResponse.data || [],
    recorrencias: recorrenciasResponse.data || [],
    pessoas: pessoasResponse.error ? [] : pessoasResponse.data || [],
    contas: contasResponse.data || [],
    categorias: categoriasResponse.data || [],
    centrosCusto: centrosCustoResponse.error ? [] : centrosCustoResponse.data || [],
    linhasNegocio: linhasNegocioResponse.error ? [] : linhasNegocioResponse.data || []
  });
}

export async function salvarLancamentoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  const valorTotal = normalizarValor(payload.valor_total);
  const totalParcelas = Math.max(1, Number.parseInt(payload.total_parcelas || '1', 10) || 1);
  const dataVencimento = String(payload.data_vencimento || '').slice(0, 10);
  const dataCompetencia = primeiroDiaMes(payload.data_competencia || dataVencimento);

  if (!payload.empresa_id) throw new Error('Selecione uma empresa.');
  if (!payload.descricao) throw new Error('Informe a descricao do lancamento.');
  if (!valorTotal || valorTotal <= 0) throw new Error('Informe um valor maior que zero.');
  if (!dataVencimento) throw new Error('Informe a data de vencimento.');
  if (!dataCompetencia) throw new Error('Informe a competencia.');

  const lancamentoPayload = {
    empresa_id: payload.empresa_id,
    pessoa_id: payload.pessoa_id || null,
    conta_id: payload.conta_id || null,
    categoria_id: payload.categoria_id || null,
    centro_custo_id: payload.centro_custo_id || null,
    linha_negocio_id: payload.linha_negocio_id || null,
    natureza: payload.natureza === 'saida' ? 'saida' : 'entrada',
    tipo: payload.natureza === 'saida' ? 'conta_pagar' : 'conta_receber',
    descricao: String(payload.descricao || '').trim(),
    valor_total: valorTotal,
    data_emissao: String(payload.data_emissao || new Date().toISOString().slice(0, 10)).slice(0, 10),
    data_competencia: dataCompetencia,
    data_vencimento: dataVencimento,
    forma_pagamento: payload.forma_pagamento || null,
    observacoes: payload.observacoes || null,
    status: 'aberto'
  };

  const { data: lancamento, error: lancamentoError } = await supabase
    .from('fin_lancamentos')
    .insert(lancamentoPayload)
    .select(COLUNAS_LANCAMENTO)
    .single();

  if (lancamentoError) {
    throw normalizarErro('Nao foi possivel criar o lancamento financeiro.', lancamentoError);
  }

  const parcelasPayload = dividirParcelas(valorTotal, totalParcelas, dataVencimento).map(parcela => ({
    ...parcela,
    empresa_id: payload.empresa_id,
    lancamento_id: lancamento.id
  }));

  const { error: parcelasError } = await supabase
    .from('fin_lancamento_parcelas')
    .insert(parcelasPayload);

  if (parcelasError) {
    await supabase
      .from('fin_lancamentos')
      .update({ status: 'cancelado', motivo_status: 'Falha ao gerar parcelas automaticamente.' })
      .eq('id', lancamento.id)
      .eq('empresa_id', payload.empresa_id);
    throw normalizarErro('O titulo foi criado, mas nao foi possivel gerar as parcelas.', parcelasError);
  }

  if (payload.categoria_id || payload.centro_custo_id || payload.linha_negocio_id) {
    const { error: rateioError } = await supabase
      .from('fin_lancamento_rateios')
      .insert({
        empresa_id: payload.empresa_id,
        lancamento_id: lancamento.id,
        categoria_id: payload.categoria_id || null,
        centro_custo_id: payload.centro_custo_id || null,
        linha_negocio_id: payload.linha_negocio_id || null,
        percentual: 100,
        valor: valorTotal,
        observacoes: 'Rateio automatico do lancamento.'
      });

    if (rateioError) {
      throw normalizarErro('Lancamento criado, mas o rateio automatico falhou.', rateioError);
    }
  }

  if (payload.recorrente === 'on') {
    await salvarRecorrenciaFinanceira({
      empresa_id: payload.empresa_id,
      lancamento_modelo_id: lancamento.id,
      periodicidade: payload.periodicidade || 'mensal',
      data_inicio: payload.recorrencia_inicio || dataVencimento,
      data_fim: payload.recorrencia_fim || null,
      proxima_geracao: payload.proxima_geracao || payload.recorrencia_inicio || dataVencimento
    });
  }

  return lancamento;
}

export async function baixarParcelaFinanceira(payload) {
  const supabase = exigirSupabaseConfigurado();
  const valorPrincipal = normalizarValor(payload.valor_principal);
  const dataBaixa = String(payload.data_baixa || new Date().toISOString().slice(0, 10)).slice(0, 10);

  if (!payload.empresa_id || !payload.lancamento_id || !payload.parcela_id) {
    throw new Error('Parcela invalida para baixa.');
  }
  if (!valorPrincipal || valorPrincipal <= 0) {
    throw new Error('Informe um valor de baixa maior que zero.');
  }

  const { error: baixaError } = await supabase
    .from('fin_lancamento_baixas')
    .insert({
      empresa_id: payload.empresa_id,
      lancamento_id: payload.lancamento_id,
      parcela_id: payload.parcela_id,
      conta_id: payload.conta_id || null,
      data_baixa: dataBaixa,
      valor_principal: valorPrincipal,
      juros: normalizarValor(payload.juros),
      multa: normalizarValor(payload.multa),
      desconto: normalizarValor(payload.desconto),
      outros_ajustes: normalizarValor(payload.outros_ajustes),
      forma_pagamento: payload.forma_pagamento || null,
      justificativa: payload.justificativa || null,
      status: 'confirmada'
    });

  if (baixaError) {
    throw normalizarErro('Nao foi possivel registrar a baixa.', baixaError);
  }

  const { error: parcelaError } = await supabase
    .from('fin_lancamento_parcelas')
    .update({ status: 'liquidada' })
    .eq('id', payload.parcela_id)
    .eq('empresa_id', payload.empresa_id);

  if (parcelaError) {
    throw normalizarErro('A baixa foi registrada, mas a parcela nao foi liquidada.', parcelaError);
  }

  const { data: abertas, error: abertasError } = await supabase
    .from('fin_lancamento_parcelas')
    .select('id')
    .eq('empresa_id', payload.empresa_id)
    .eq('lancamento_id', payload.lancamento_id)
    .in('status', ['aberta', 'parcial']);

  if (abertasError) {
    throw normalizarErro('Parcela liquidada, mas nao foi possivel revisar o status do titulo.', abertasError);
  }

  const { error: lancamentoError } = await supabase
    .from('fin_lancamentos')
    .update({ status: (abertas || []).length ? 'parcial' : 'liquidado' })
    .eq('id', payload.lancamento_id)
    .eq('empresa_id', payload.empresa_id);

  if (lancamentoError) {
    throw normalizarErro('Parcela liquidada, mas o status do titulo nao foi atualizado.', lancamentoError);
  }
}

export async function cancelarLancamentoFinanceiro(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id || !payload.lancamento_id) throw new Error('Lancamento invalido para cancelamento.');

  const { error: lancamentoError } = await supabase
    .from('fin_lancamentos')
    .update({
      status: 'cancelado',
      motivo_status: payload.motivo_status || 'Cancelado pela tela de lancamentos.'
    })
    .eq('id', payload.lancamento_id)
    .eq('empresa_id', payload.empresa_id);

  if (lancamentoError) {
    throw normalizarErro('Nao foi possivel cancelar o lancamento.', lancamentoError);
  }

  const { error: parcelasError } = await supabase
    .from('fin_lancamento_parcelas')
    .update({ status: 'cancelada' })
    .eq('empresa_id', payload.empresa_id)
    .eq('lancamento_id', payload.lancamento_id)
    .in('status', ['aberta', 'parcial']);

  if (parcelasError) {
    throw normalizarErro('Lancamento cancelado, mas as parcelas abertas nao foram canceladas.', parcelasError);
  }
}

export async function salvarRecorrenciaFinanceira(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id || !payload.lancamento_modelo_id) {
    throw new Error('Selecione um titulo modelo para recorrencia.');
  }
  if (!payload.periodicidade || !payload.data_inicio) {
    throw new Error('Informe periodicidade e data inicial.');
  }

  const { error } = await supabase
    .from('fin_lancamento_recorrencias')
    .insert({
      empresa_id: payload.empresa_id,
      lancamento_modelo_id: payload.lancamento_modelo_id,
      periodicidade: payload.periodicidade,
      data_inicio: payload.data_inicio,
      data_fim: payload.data_fim || null,
      proxima_geracao: payload.proxima_geracao || payload.data_inicio,
      status: 'ativa'
    });

  if (error) {
    throw normalizarErro('Nao foi possivel criar a recorrencia.', error);
  }
}
