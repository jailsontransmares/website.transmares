import { exigirSupabaseConfigurado } from '../supabaseClient.js';

const ATENDIMENTO_COLUMNS = 'id, empresa_id, pessoa_id, status, responsavel_usuario_id, prioridade_final, scores, consorcio_fit, cliente_snapshot, contexto, iniciado_em, concluido_em, proxima_revisao, observacoes, created_by, created_at, updated_at';

function assertResponse(response, message) {
  if (response.error) throw new Error(response.error.message || message);
  return response.data;
}

export async function listConsultoria360Clients(empresaId, search = '') {
  if (!empresaId) return [];
  const supabase = exigirSupabaseConfigurado();
  let query = supabase
    .from('cad_pessoas')
    .select('id, empresa_id, tipo_pessoa, nome_razao_social, nome_fantasia, status')
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo')
    .order('nome_razao_social', { ascending: true })
    .limit(100);

  const normalizedSearch = String(search || '').trim();
  if (normalizedSearch) query = query.ilike('nome_razao_social', `%${normalizedSearch}%`);

  return assertResponse(await query, 'Não foi possível carregar os clientes da empresa.');
}

export async function listConsultoria360Companies() {
  const supabase = exigirSupabaseConfigurado();
  const memberships = assertResponse(await supabase
    .from('fin_usuario_empresas')
    .select('empresa_id, principal')
    .eq('status', 'ativo')
    .order('principal', { ascending: false }), 'Não foi possível carregar as empresas disponíveis.');
  const ids = (memberships || []).map(item => item.empresa_id).filter(Boolean);
  if (!ids.length) return [];

  const companies = assertResponse(await supabase
    .from('fin_empresas')
    .select('id, codigo, razao_social, nome_fantasia, status')
    .in('id', ids)
    .eq('status', 'ativo')
    .order('nome_fantasia', { ascending: true }), 'Não foi possível carregar as empresas disponíveis.');
  return companies || [];
}

export async function getConsultoria360Dashboard(empresaId) {
  if (!empresaId) return [];
  const supabase = exigirSupabaseConfigurado();
  return assertResponse(await supabase
    .from('consultoria_360_atendimentos')
    .select(ATENDIMENTO_COLUMNS)
    .eq('empresa_id', empresaId)
    .order('updated_at', { ascending: false }), 'Não foi possível carregar o cockpit da Consultoria 360°.');
}

export async function getConsultoria360Atendimento(id, empresaId) {
  if (!id || !empresaId) throw new Error('Atendimento inválido.');
  const supabase = exigirSupabaseConfigurado();
  const [atendimento, respostas, dimensionamentos, propostas] = await Promise.all([
    supabase.from('consultoria_360_atendimentos').select(ATENDIMENTO_COLUMNS).eq('id', id).eq('empresa_id', empresaId).single(),
    supabase.from('consultoria_360_respostas').select('*').eq('atendimento_id', id).maybeSingle(),
    supabase.from('consultoria_360_dimensionamentos').select('*').eq('atendimento_id', id).order('tipo'),
    supabase.from('consultoria_360_propostas').select('*').eq('atendimento_id', id).order('versao', { ascending: false })
  ]);

  return {
    atendimento: assertResponse(atendimento, 'Não foi possível carregar o atendimento.'),
    respostas: assertResponse(respostas, 'Não foi possível carregar as respostas.'),
    dimensionamentos: assertResponse(dimensionamentos, 'Não foi possível carregar os dimensionamentos.') || [],
    propostas: assertResponse(propostas, 'Não foi possível carregar as propostas.') || []
  };
}

export async function createConsultoria360Atendimento(payload = {}) {
  if (!payload.empresa_id || !payload.pessoa_id) throw new Error('Selecione uma empresa e um cliente.');
  const supabase = exigirSupabaseConfigurado();
  return assertResponse(await supabase
    .from('consultoria_360_atendimentos')
    .insert({
      empresa_id: payload.empresa_id,
      pessoa_id: payload.pessoa_id,
      status: payload.status || 'rascunho',
      responsavel_usuario_id: payload.responsavel_usuario_id || null,
      cliente_snapshot: payload.cliente_snapshot || {},
      contexto: payload.contexto || {},
      observacoes: payload.observacoes || null
    })
    .select(ATENDIMENTO_COLUMNS)
    .single(), 'Não foi possível criar o atendimento.');
}

export async function updateConsultoria360Atendimento(payload = {}) {
  if (!payload.id || !payload.empresa_id) throw new Error('Atendimento inválido.');
  const supabase = exigirSupabaseConfigurado();
  const changes = {
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.responsavel_usuario_id !== undefined ? { responsavel_usuario_id: payload.responsavel_usuario_id } : {}),
    ...(payload.prioridade_final !== undefined ? { prioridade_final: payload.prioridade_final } : {}),
    ...(payload.scores !== undefined ? { scores: payload.scores } : {}),
    ...(payload.consorcio_fit !== undefined ? { consorcio_fit: payload.consorcio_fit } : {}),
    ...(payload.cliente_snapshot !== undefined ? { cliente_snapshot: payload.cliente_snapshot } : {}),
    ...(payload.contexto !== undefined ? { contexto: payload.contexto } : {}),
    ...(payload.concluido_em !== undefined ? { concluido_em: payload.concluido_em } : {}),
    ...(payload.proxima_revisao !== undefined ? { proxima_revisao: payload.proxima_revisao } : {}),
    ...(payload.observacoes !== undefined ? { observacoes: payload.observacoes } : {})
  };
  return assertResponse(await supabase
    .from('consultoria_360_atendimentos')
    .update(changes)
    .eq('id', payload.id)
    .eq('empresa_id', payload.empresa_id)
    .select(ATENDIMENTO_COLUMNS)
    .single(), 'Não foi possível atualizar o atendimento.');
}

export async function saveConsultoria360Responses(payload = {}) {
  if (!payload.atendimento_id) throw new Error('Atendimento inválido.');
  const supabase = exigirSupabaseConfigurado();
  return assertResponse(await supabase
    .from('consultoria_360_respostas')
    .upsert({
      atendimento_id: payload.atendimento_id,
      versao_questionario: payload.versao_questionario || 'diagnostico-360-v1',
      respostas: payload.respostas || {},
      updated_by: payload.updated_by || null
    }, { onConflict: 'atendimento_id' })
    .select('*')
    .single(), 'Não foi possível salvar as respostas.');
}

export async function saveConsultoria360Dimensioning(payload = {}) {
  if (!payload.atendimento_id || !payload.tipo || !payload.versao_regra) throw new Error('Dimensionamento inválido.');
  const supabase = exigirSupabaseConfigurado();
  return assertResponse(await supabase
    .from('consultoria_360_dimensionamentos')
    .upsert({
      atendimento_id: payload.atendimento_id,
      tipo: payload.tipo,
      premissas: payload.premissas || {},
      resultado: payload.resultado || {},
      versao_regra: payload.versao_regra,
      updated_by: payload.updated_by || null
    }, { onConflict: 'atendimento_id,tipo' })
    .select('*')
    .single(), 'Não foi possível salvar o dimensionamento.');
}

export async function saveConsultoria360Proposal(payload = {}) {
  if (!payload.atendimento_id || !Number.isInteger(Number(payload.versao))) throw new Error('Versão de proposta inválida.');
  const supabase = exigirSupabaseConfigurado();
  return assertResponse(await supabase
    .from('consultoria_360_propostas')
    .upsert({
      atendimento_id: payload.atendimento_id,
      versao: Number(payload.versao),
      status: payload.status || 'rascunho',
      titulo: payload.titulo || null,
      data_analise: payload.data_analise || undefined,
      escopo: payload.escopo || {},
      recomendacao: payload.recomendacao || null,
      proximos_passos: payload.proximos_passos || null,
      observacoes: payload.observacoes || null,
      snapshot: payload.snapshot || {},
      arquivo_url: payload.arquivo_url || null
    }, { onConflict: 'atendimento_id,versao' })
    .select('*')
    .single(), 'Não foi possível salvar a proposta.');
}
