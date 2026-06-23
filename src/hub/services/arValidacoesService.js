import { exigirSupabaseConfigurado } from '../supabaseClient.js';

const STATUS_PENDENTE = 'pendente';

function aplicarFiltrosValidacoes(query, filtros = {}) {
  let consulta = query;

  if (filtros.parceiro) {
    consulta = consulta.ilike('parceiro_nome', `%${filtros.parceiro}%`);
  }

  if (filtros.codigoEntidade) {
    consulta = consulta.ilike('codigo_entidade', `%${filtros.codigoEntidade}%`);
  }

  if (filtros.dataInicio) {
    consulta = consulta.gte('data_validacao', filtros.dataInicio);
  }

  if (filtros.dataFim) {
    consulta = consulta.lte('data_validacao', filtros.dataFim);
  }

  if (filtros.produto) {
    consulta = consulta.ilike('produto', `%${filtros.produto}%`);
  }

  if (filtros.pedido) {
    consulta = consulta.ilike('pedido', `%${filtros.pedido}%`);
  }

  if (filtros.cliente) {
    consulta = consulta.ilike('nome_cliente', `%${filtros.cliente}%`);
  }

  return consulta;
}

function normalizarErroValidacoes(error, fallback) {
  if (!error) return fallback;

  if (error.code === '42P01' || error.code === '42883') {
    return 'Base de Validações ainda não aplicada no Supabase.';
  }

  if (String(error.message || '').includes('Já existe importação de repasse')) {
    return 'Já existe importação de repasse para este mês-base.';
  }

  if (String(error.message || '').includes('lançamentos pagos ou vinculados a recibo')) {
    return 'Não é possível excluir este mês-base porque existem lançamentos pagos ou vinculados a recibo.';
  }

  return error.message || fallback;
}

export async function listarValidacoesPendentes(filtros = {}) {
  const supabase = exigirSupabaseConfigurado();
  let query = supabase
    .from('ar_validacoes')
    .select('*')
    .eq('status_pagamento', STATUS_PENDENTE)
    .order('data_validacao', { ascending: false })
    .limit(300);

  query = aplicarFiltrosValidacoes(query, filtros);

  const { data, error } = await query;

  if (error) {
    throw new Error(normalizarErroValidacoes(error, 'Erro ao carregar lançamentos pendentes.'));
  }

  return data || [];
}

export async function listarRecibosRecentes() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase
    .from('ar_recibos')
    .select('*, ar_recibo_itens(*)')
    .order('data_emissao', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(normalizarErroValidacoes(error, 'Erro ao carregar recibos.'));
  }

  return data || [];
}

export async function carregarDadosValidacoesAR(payload = {}) {
  const [pendentes, recibos] = await Promise.all([
    listarValidacoesPendentes(payload.filtros || {}),
    listarRecibosRecentes()
  ]);

  return { pendentes, recibos };
}

export async function criarValidacaoManual(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const registro = {
    parceiro_id: payload.parceiro_id || null,
    parceiro_nome: payload.parceiro_nome || '',
    codigo_entidade: payload.codigo_entidade || '',
    data_validacao: payload.data_validacao || new Date().toISOString().slice(0, 10),
    produto: payload.produto || '',
    pedido: payload.pedido || '',
    nome_cliente: payload.nome_cliente || '',
    valor_tot_comiss: Number(payload.valor_tot_comiss) || 0,
    origem: 'manual',
    status_pagamento: STATUS_PENDENTE,
    observacao: payload.observacao || ''
  };

  const { data, error } = await supabase
    .from('ar_validacoes')
    .insert(registro)
    .select('*')
    .single();

  if (error) {
    throw new Error(normalizarErroValidacoes(error, 'Erro ao criar lançamento manual.'));
  }

  return data;
}

export async function verificarImportacaoRepasseAR(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const mesBase = payload.mes_base;

  if (!mesBase) {
    return null;
  }

  const { data, error } = await supabase
    .from('ar_importacoes')
    .select('*')
    .eq('tipo', 'repasse')
    .eq('mes_base', mesBase)
    .eq('status', 'importado')
    .maybeSingle();

  if (error) {
    throw new Error(normalizarErroValidacoes(error, 'Erro ao verificar importação de repasse.'));
  }

  return data || null;
}

export async function importarRepasseAR(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.rpc('ar_importar_repasse', {
    p_mes_base: payload.mes_base,
    p_nome_arquivo: payload.nome_arquivo || null,
    p_linhas: payload.linhas || []
  });

  if (error) {
    throw new Error(normalizarErroValidacoes(error, 'Erro ao importar repasse.'));
  }

  return data;
}

export async function excluirImportacaoRepasseAR(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.rpc('ar_excluir_importacao_repasse', {
    p_mes_base: payload.mes_base
  });

  if (error) {
    throw new Error(normalizarErroValidacoes(error, 'Erro ao excluir importação de repasse.'));
  }

  return data;
}

export async function emitirReciboAR(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.rpc('ar_emitir_recibo', {
    p_parceiro_id: payload.parceiro_id || null,
    p_validacao_ids: payload.validacao_ids || [],
    p_observacao: payload.observacao || null
  });

  if (error) {
    throw new Error(normalizarErroValidacoes(error, 'Erro ao emitir recibo.'));
  }

  return data;
}

export async function cancelarReciboAR(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.rpc('ar_cancelar_recibo', {
    p_recibo_id: payload.recibo_id,
    p_motivo: payload.motivo || null
  });

  if (error) {
    throw new Error(normalizarErroValidacoes(error, 'Erro ao cancelar recibo.'));
  }

  return data;
}
