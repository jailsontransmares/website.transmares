import { exigirSupabaseConfigurado } from '../supabaseClient.js';

const STATUS_PENDENTE = 'pendente';

function citarValorFiltroOrPostgrest(valor) {
  return `"${String(valor).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function aplicarFiltrosValidacoes(query, filtros = {}) {
  let consulta = query;

  if (filtros.parceiro) {
    const termo = `%${String(filtros.parceiro).replace(/[\\%_]/g, '\\$&')}%`;
    consulta = consulta.or(`parceiro_nome.ilike.${citarValorFiltroOrPostgrest(termo)},cod_vendedor.ilike.${citarValorFiltroOrPostgrest(termo)}`);
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
  const tamanhoPagina = 1000;
  const registros = [];
  let totalRegistros = null;
  let offset = 0;
  let primeiraPagina = true;

  while (primeiraPagina || offset < totalRegistros) {
    primeiraPagina = false;
    let query = supabase
      .from('ar_validacoes')
      .select('*', { count: 'exact' })
      .eq('status_pagamento', STATUS_PENDENTE)
      .order('data_validacao', { ascending: false })
      .range(offset, offset + tamanhoPagina - 1);

    query = aplicarFiltrosValidacoes(query, filtros);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(normalizarErroValidacoes(error, 'Erro ao carregar lançamentos pendentes.'));
    }

    if (totalRegistros == null) {
      totalRegistros = count ?? offset + (data?.length || 0) + (data?.length === tamanhoPagina ? 1 : 0);
    }
    if (!data?.length) {
      if (offset < totalRegistros) {
        throw new Error('Não foi possível carregar todos os lançamentos pendentes. Atualize a tela e tente novamente.');
      }
      break;
    }

    registros.push(...data);
    offset += data.length;
  }

  return registros;
}

export async function listarRecibosRecentes() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase
    .from('ar_recibos')
    .select('*, ar_recibo_itens(*, ar_validacoes!ar_recibo_itens_validacao_id_fkey(data_validacao, pedido, produto, nome_cliente, valor_bruto, dados_adicionais, cod_vendedor))')
    .order('data_emissao', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(normalizarErroValidacoes(error, 'Erro ao carregar recibos.'));
  }

  return data || [];
}

export async function listarParceirosLancamentoManualAR() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase
    .from('parceiros')
    .select('id, nome, nome_completo, nome_empresa, codigo_revendedor, principal_codigo_revendedor, status')
    .eq('status', 'ativo')
    .order('nome', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar os parceiros ativos.');
  }

  return data || [];
}

export async function carregarDadosValidacoesAR(payload = {}) {
  const [pendentes, recibos] = await Promise.all([
    listarValidacoesPendentes(payload.filtros || {}),
    listarRecibosRecentes()
  ]);

  const codigosRevendedor = [...new Set(
    pendentes
      .map(item => String(item.cod_vendedor || '').trim())
      .filter(Boolean)
  )];
  let nomesParceirosPorCodigo = new Map();

  if (codigosRevendedor.length) {
    const supabase = exigirSupabaseConfigurado();
    const { data, error } = await supabase.rpc('ar_resolver_nomes_parceiros_por_codigo', {
      p_codigos_revendedor: codigosRevendedor
    });

    if (error) {
      throw new Error(error.message || 'Não foi possível localizar os parceiros pelo código do vendedor.');
    }

    nomesParceirosPorCodigo = new Map((data || []).map(item => [
      String(item.codigo_revendedor || '').trim().toLocaleUpperCase('pt-BR'),
      String(item.nome || '').trim()
    ]));
  }

  const pendentesComNomesParceiros = pendentes.map(item => ({
    ...item,
    nome_parceiro_hub: nomesParceirosPorCodigo.get(String(item.cod_vendedor || '').trim().toLocaleUpperCase('pt-BR')) || ''
  }));

  return { pendentes: pendentesComNomesParceiros, recibos };
}

export async function listarImpostosReciboAR() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase
    .from('ar_impostos_configuracoes')
    .select('id, nome, percentual, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(normalizarErroValidacoes(error, 'Não foi possível carregar os impostos do recibo.'));
  }

  return data || [];
}

export async function salvarImpostoReciboAR(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const nome = String(payload.nome || '').trim();
  const percentual = Number(payload.percentual);

  if (!nome) throw new Error('Informe o nome do imposto.');
  if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
    throw new Error('Informe um percentual entre 0 e 100.');
  }

  const { data: atuais, error: erroConsulta } = await supabase
    .from('ar_impostos_configuracoes')
    .select('id, percentual');

  if (erroConsulta) {
    throw new Error(normalizarErroValidacoes(erroConsulta, 'Não foi possível validar o total de impostos.'));
  }

  const somaAtual = (atuais || [])
    .filter(item => item.id !== payload.id)
    .reduce((total, item) => total + (Number(item.percentual) || 0), 0);

  if (somaAtual + percentual > 100) {
    throw new Error('A soma dos percentuais de impostos não pode ultrapassar 100%.');
  }

  const registro = { nome, percentual, updated_at: new Date().toISOString() };
  if (payload.id) registro.id = payload.id;

  const { data, error } = await supabase
    .from('ar_impostos_configuracoes')
    .upsert(registro)
    .select('id, nome, percentual, created_at, updated_at')
    .single();

  if (error) {
    throw new Error(normalizarErroValidacoes(error, 'Não foi possível salvar o imposto.'));
  }

  return data;
}

export async function excluirImpostoReciboAR(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.id) throw new Error('Selecione um imposto para excluir.');

  const { error } = await supabase
    .from('ar_impostos_configuracoes')
    .delete()
    .eq('id', payload.id);

  if (error) {
    throw new Error(normalizarErroValidacoes(error, 'Não foi possível excluir o imposto.'));
  }

  return { id: payload.id };
}

export async function criarValidacaoManual(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const registro = {
    parceiro_id: payload.parceiro_id || null,
    parceiro_nome: payload.parceiro_nome || '',
    cod_vendedor: payload.cod_vendedor || '',
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
