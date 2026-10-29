import { exigirSupabaseConfigurado } from '../supabaseClient.js';

function erroOperacao(mensagem, erro) {
  return new Error(erro?.message || mensagem);
}

export async function carregarDadosCobranca(empresaId) {
  if (!empresaId) return { titulos: [], interacoes: [] };

  const supabase = exigirSupabaseConfigurado();
  const [lancamentosResponse, parcelasResponse, pessoasResponse, linhasResponse, cobrancasResponse, interacoesResponse, estadosResponse] = await Promise.all([
    supabase
      .from('fin_lancamentos')
      .select('id, empresa_id, pessoa_id, cliente_nome, linha_negocio_id, natureza, tipo, descricao, data_emissao, data_vencimento, observacoes, status, created_by')
      .eq('empresa_id', empresaId)
      .eq('natureza', 'entrada')
      .in('tipo', ['conta_receber', 'receita'])
      .not('status', 'in', '(cancelado,estornado,arquivado)')
      .order('data_vencimento', { ascending: true })
      .limit(1000),
    supabase
      .from('fin_lancamento_parcelas')
      .select('id, empresa_id, lancamento_id, numero, total, data_vencimento, status')
      .eq('empresa_id', empresaId)
      .not('status', 'in', '(cancelada,estornada)')
      .order('data_vencimento', { ascending: true })
      .limit(2000),
    supabase
      .from('cad_pessoas')
      .select('id, nome_razao_social, nome_fantasia, cpf, cnpj')
      .eq('empresa_id', empresaId)
      .limit(1000),
    supabase
      .from('fin_linhas_negocio')
      .select('id, nome')
      .eq('empresa_id', empresaId)
      .limit(500),
    supabase
      .from('fin_cobrancas')
      .select('id, empresa_id, cliente_nome, produto, descricao, data_vencimento, status, responsavel_id, responsavel_nome, created_at')
      .eq('empresa_id', empresaId)
      .not('status', 'in', '(cancelada)')
      .order('data_vencimento', { ascending: true })
      .limit(1000),
    supabase
      .from('fin_cobranca_interacoes')
      .select('id, empresa_id, parcela_id, cobranca_id, tipo, anotacao, resultado, proxima_acao_em, usuario_id, usuario_nome, responsavel_id, responsavel_nome, created_at')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase
      .from('fin_cobranca_itens_estado')
      .select('parcela_id, cobranca_id, estado')
      .eq('empresa_id', empresaId)
  ]);

  const falha = [
    [lancamentosResponse, 'Não foi possível carregar os títulos a receber.'],
    [parcelasResponse, 'Não foi possível carregar as parcelas.'],
    [cobrancasResponse, 'Não foi possível carregar as cobranças.'],
    [interacoesResponse, 'Não foi possível carregar o histórico de cobrança.'],
    [estadosResponse, 'Não foi possível carregar as ações da carteira de cobrança.']
  ].find(([response]) => response.error);
  if (falha) throw erroOperacao(falha[1], falha[0].error);

  const lancamentos = lancamentosResponse.data || [];
  const lancamentosPorId = new Map(lancamentos.map(item => [item.id, item]));
  const pessoasPorId = new Map((pessoasResponse.data || []).map(item => [item.id, item]));
  const linhasPorId = new Map((linhasResponse.data || []).map(item => [item.id, item]));
  const titulos = (parcelasResponse.data || [])
    .filter(parcela => lancamentosPorId.has(parcela.lancamento_id))
    .map(parcela => {
      const lancamento = lancamentosPorId.get(parcela.lancamento_id);
      return {
        ...parcela,
        lancamento,
        pessoa: pessoasPorId.get(lancamento.pessoa_id) || (lancamento.cliente_nome ? { nome_razao_social: lancamento.cliente_nome } : null),
        produto: String(lancamento.observacoes || '').match(/(?:^|\n)Produto:\s*([^\n]+)/i)?.[1]?.trim() || linhasPorId.get(lancamento.linha_negocio_id)?.nome || '',
        descricao: lancamento.descricao || ''
      };
    });

  const cobrancas = (cobrancasResponse.data || []).map(item => ({
    ...item,
    pessoa: { nome_razao_social: item.cliente_nome },
    produto: item.produto,
    descricao: item.descricao,
    numero: 1,
    total: 1,
    cobranca_id: item.id,
    parcela_id: null,
    lancamento_id: null
  }));

  const estados = estadosResponse.data || [];
  const estadoPorParcela = new Map(estados.filter(item => item.parcela_id).map(item => [item.parcela_id, item.estado]));
  const estadoPorCobranca = new Map(estados.filter(item => item.cobranca_id).map(item => [item.cobranca_id, item.estado]));
  const titulosComEstado = [...titulos, ...cobrancas].map(titulo => ({
    ...titulo,
    estado_cobranca: titulo.cobranca_id ? estadoPorCobranca.get(titulo.cobranca_id) || '' : estadoPorParcela.get(titulo.id) || ''
  })).filter(titulo => titulo.estado_cobranca !== 'excluida');
  return { titulos: titulosComEstado, interacoes: interacoesResponse.data || [] };
}

export async function carregarUsuariosAtivosCobranca() {
  const { data, error } = await exigirSupabaseConfigurado().rpc('listar_usuarios_ativos_cobranca');
  if (error) throw erroOperacao('Não foi possível carregar os responsáveis.', error);
  return data || [];
}

export async function registrarInteracaoCobranca(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id || (!payload.parcela_id && !payload.cobranca_id)) throw new Error('Título de cobrança inválido.');
  if (!['contato', 'comentario', 'agendamento', 'cobranca_enviada'].includes(payload.tipo)) {
    throw new Error('Tipo de interação inválido.');
  }
  if (!String(payload.anotacao || '').trim()) throw new Error('Informe uma anotação para o histórico.');

  const { data, error } = await supabase
    .from('fin_cobranca_interacoes')
    .insert({
      empresa_id: payload.empresa_id,
      parcela_id: payload.parcela_id,
      cobranca_id: payload.cobranca_id || null,
      tipo: payload.tipo,
      anotacao: String(payload.anotacao).trim(),
      resultado: payload.resultado || null,
      proxima_acao_em: payload.proxima_acao_em || null,
      usuario_id: payload.usuario_id || null,
      usuario_nome: String(payload.usuario_nome || 'Usuário').trim(),
      responsavel_id: payload.responsavel_id || null,
      responsavel_nome: payload.responsavel_nome || null
    })
    .select('id, empresa_id, parcela_id, cobranca_id, tipo, anotacao, resultado, proxima_acao_em, usuario_id, usuario_nome, responsavel_id, responsavel_nome, created_at')
    .single();

  if (error) throw erroOperacao('Não foi possível registrar a interação de cobrança.', error);
  return data;
}

export async function criarCobrancaOperacional(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.empresa_id || !payload.cliente_nome || !payload.produto || !payload.descricao || !payload.data_vencimento || !payload.responsavel_id) {
    throw new Error('Preencha cliente, produto, descrição, vencimento e responsável.');
  }
  const { data, error } = await supabase.from('fin_cobrancas').insert({
    empresa_id: payload.empresa_id,
    cliente_nome: String(payload.cliente_nome).trim(),
    produto: payload.produto,
    descricao: String(payload.descricao).trim(),
    data_vencimento: payload.data_vencimento,
    responsavel_id: payload.responsavel_id,
    responsavel_nome: payload.responsavel_nome,
    created_by: payload.created_by
  }).select('id, empresa_id, cliente_nome, produto, descricao, data_vencimento, status, responsavel_id, responsavel_nome, created_at').single();
  if (error) throw erroOperacao('Não foi possível criar a cobrança.', error);
  return { ...data, pessoa: { nome_razao_social: data.cliente_nome }, numero: 1, total: 1, cobranca_id: data.id, parcela_id: null, lancamento_id: null };
}

export async function atualizarCobrancaOperacional(id, payload = {}) {
  if (!id) throw new Error('Cobrança inválida para edição.');
  const responsavelNome = String(payload.responsavel_nome || '').trim();
  const { data, error } = await exigirSupabaseConfigurado()
    .from('fin_cobrancas')
    .update({
      cliente_nome: String(payload.cliente_nome || '').trim(),
      data_vencimento: payload.data_vencimento,
      produto: payload.produto,
      responsavel_id: payload.responsavel_id,
      responsavel_nome: responsavelNome,
      status: payload.status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('id, empresa_id, cliente_nome, produto, descricao, data_vencimento, status, responsavel_id, responsavel_nome, created_at')
    .single();
  if (error) throw erroOperacao('Não foi possível salvar as alterações da cobrança.', error);
  return { ...data, pessoa: { nome_razao_social: data.cliente_nome }, numero: 1, total: 1, cobranca_id: data.id, parcela_id: null, lancamento_id: null };
}

export async function atualizarTituloFinanceiro(titulo, payload = {}) {
  if (!titulo?.id || !titulo?.lancamento_id) throw new Error('Título financeiro inválido para edição.');
  const supabase = exigirSupabaseConfigurado();
  const observacoes = String(titulo.lancamento?.observacoes || '');
  const produtoRegex = /(^|\n)Produto:\s*[^\n]*/i;
  const novasObservacoes = produtoRegex.test(observacoes)
    ? observacoes.replace(produtoRegex, `$1Produto: ${payload.produto}`)
    : `${observacoes}${observacoes ? '\n' : ''}Produto: ${payload.produto}`;

  const { error: lancamentoError } = await supabase.from('fin_lancamentos').update({
    cliente_nome: String(payload.cliente_nome || '').trim(),
    observacoes: novasObservacoes
  }).eq('id', titulo.lancamento_id).eq('empresa_id', titulo.empresa_id);
  if (lancamentoError) throw erroOperacao('Não foi possível atualizar os dados do título financeiro.', lancamentoError);

  const { error: parcelaError } = await supabase.from('fin_lancamento_parcelas').update({
    data_vencimento: payload.data_vencimento,
    status: payload.status
  }).eq('id', titulo.id).eq('empresa_id', titulo.empresa_id);
  if (parcelaError) throw erroOperacao('Não foi possível atualizar vencimento e status do título.', parcelaError);

  return {
    ...titulo,
    data_vencimento: payload.data_vencimento,
    status: payload.status,
    produto: payload.produto,
    lancamento: { ...titulo.lancamento, cliente_nome: String(payload.cliente_nome || '').trim(), observacoes: novasObservacoes },
    pessoa: { ...(titulo.pessoa || {}), nome_razao_social: String(payload.cliente_nome || '').trim() }
  };
}

export async function definirEstadoCobranca({ empresa_id, parcela_id = null, cobranca_id = null, estado, usuario_id }) {
  if (!empresa_id || (!parcela_id && !cobranca_id) || !['arquivada', 'excluida'].includes(estado)) {
    throw new Error('Ação de cobrança inválida.');
  }
  const alvo = cobranca_id ? { empresa_id, cobranca_id } : { empresa_id, parcela_id };
  const alvoConflict = cobranca_id ? 'empresa_id,cobranca_id' : 'empresa_id,parcela_id';
  const { error } = await exigirSupabaseConfigurado()
    .from('fin_cobranca_itens_estado')
    .upsert({ ...alvo, estado, updated_by: usuario_id, updated_at: new Date().toISOString() }, { onConflict: alvoConflict });
  if (error) throw erroOperacao('Não foi possível atualizar a carteira de cobrança.', error);
}

export async function excluirCobrancaOperacional(id, empresaId) {
  if (!id || !empresaId) throw new Error('Cobrança inválida para exclusão.');
  const { error } = await exigirSupabaseConfigurado()
    .from('fin_cobrancas')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaId);
  if (error) throw erroOperacao('Não foi possível excluir a cobrança.', error);
}
