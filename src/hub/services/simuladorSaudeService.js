import { exigirSupabaseConfigurado } from '../supabaseClient.js';

const TABLES = {
  operators: 'simulador_saude_operadoras',
  plans: 'simulador_saude_planos',
  prices: 'simulador_saude_tabelas_precos',
  bands: 'simulador_saude_precos_faixa',
  history: 'simulador_saude_catalogo_historico'
};

function unwrap(response, message) {
  if (response.error) throw new Error(response.error.message || message);
  return response.data;
}

export async function getSimuladorSaudeCatalog() {
  const supabase = exigirSupabaseConfigurado();
  const [operators, plans, tables, bands, history] = await Promise.all([
    supabase.from(TABLES.operators).select('*').order('nome'),
    supabase.from(TABLES.plans).select('*').order('nome'),
    supabase.from(TABLES.prices).select('*').order('vigencia_inicio', { ascending: false }),
    supabase.from(TABLES.bands).select('*'),
    supabase.from(TABLES.history).select('*').order('created_at', { ascending: false }).limit(20)
  ]);
  return {
    operators: unwrap(operators, 'Não foi possível carregar as operadoras.'),
    plans: unwrap(plans, 'Não foi possível carregar os planos.'),
    tables: unwrap(tables, 'Não foi possível carregar as tabelas de preços.'),
    bands: unwrap(bands, 'Não foi possível carregar os preços por faixa.'),
    history: unwrap(history, 'Não foi possível carregar o histórico.')
  };
}

async function ensureOperator(supabase, operatorName) {
  const name = String(operatorName || '').trim();
  if (!name) throw new Error('Informe a operadora.');
  const existing = unwrap(await supabase.from(TABLES.operators).select('id,nome').ilike('nome', name).limit(1), 'Não foi possível consultar a operadora.');
  if (existing[0]) return existing[0].id;
  return unwrap(await supabase.from(TABLES.operators).insert({ nome: name }).select('id').single(), 'Não foi possível cadastrar a operadora.').id;
}

async function ensurePlan(supabase, draft, operatorId) {
  const plan = {
    operadora_id: operatorId,
    nome: String(draft.plano_nome || '').trim(),
    modalidade: String(draft.modalidade || '').trim(),
    acomodacao: draft.acomodacao,
    coparticipacao: draft.coparticipacao === true || draft.coparticipacao === 'true',
    abrangencia: String(draft.abrangencia || '').trim(),
    codigo_interno: String(draft.codigo_interno || '').trim() || null,
    status: 'ativo'
  };
  if (!plan.nome || !plan.modalidade || !plan.abrangencia) throw new Error('Preencha plano, modalidade e abrangência.');
  if (draft.plano_id) {
    unwrap(await supabase.from(TABLES.plans).update(plan).eq('id', draft.plano_id), 'Não foi possível atualizar os dados do plano.');
    return draft.plano_id;
  }
  const matching = unwrap(await supabase.from(TABLES.plans).select('id').eq('operadora_id', operatorId).ilike('nome', plan.nome).ilike('modalidade', plan.modalidade).eq('acomodacao', plan.acomodacao).eq('coparticipacao', plan.coparticipacao).ilike('abrangencia', plan.abrangencia).limit(1), 'Não foi possível consultar o plano.');
  if (matching[0]) {
    unwrap(await supabase.from(TABLES.plans).update(plan).eq('id', matching[0].id), 'Não foi possível atualizar os dados do plano.');
    return matching[0].id;
  }
  return unwrap(await supabase.from(TABLES.plans).insert(plan).select('id').single(), 'Não foi possível cadastrar o plano.').id;
}

function normalizePrices(prices = {}) {
  return Object.entries(prices).map(([faixa_etaria, raw]) => ({
    faixa_etaria,
    valor: String(raw ?? '').trim() === '' ? null : Number(String(raw).replace(',', '.'))
  })).filter(row => row.valor !== null && Number.isFinite(row.valor) && row.valor >= 0);
}

export async function saveSimuladorSaudeTable(draft) {
  const supabase = exigirSupabaseConfigurado();
  const operatorId = await ensureOperator(supabase, draft.operadora_nome);
  const planId = await ensurePlan(supabase, draft, operatorId);
  const requestedStatus = draft.status || 'em_revisao';
  const table = {
    plano_id: planId,
    nome: String(draft.nome || '').trim(),
    vigencia_inicio: draft.vigencia_inicio,
    vigencia_fim: draft.vigencia_fim || null,
    status: 'em_revisao',
    observacoes: String(draft.observacoes || '').trim() || null
  };
  if (!table.nome || !table.vigencia_inicio) throw new Error('Informe o nome da tabela e o início da vigência.');
  let tableId = draft.id;
  if (tableId) {
    unwrap(await supabase.from(TABLES.prices).update(table).eq('id', tableId), 'Não foi possível salvar a tabela.');
  } else {
    table.status = 'em_revisao';
    tableId = unwrap(await supabase.from(TABLES.prices).insert(table).select('id').single(), 'Não foi possível criar a tabela.').id;
  }

  const prices = normalizePrices(draft.precos);
  if (prices.length) {
    const payload = prices.map(row => ({ tabela_preco_id: tableId, faixa_etaria: row.faixa_etaria, valor: row.valor }));
    unwrap(await supabase.from(TABLES.bands).upsert(payload, { onConflict: 'tabela_preco_id,faixa_etaria' }), 'Não foi possível salvar os preços por faixa.');
  }
  if (requestedStatus !== 'em_revisao') {
    unwrap(await supabase.from(TABLES.prices).update({ status: requestedStatus }).eq('id', tableId), 'Não foi possível atualizar o status da tabela.');
  }
  return tableId;
}

export async function setSimuladorSaudeTableStatus(id, status) {
  const supabase = exigirSupabaseConfigurado();
  return unwrap(await supabase.from(TABLES.prices).update({ status }).eq('id', id).select('*').single(), 'Não foi possível alterar o status da tabela.');
}

async function getCurrentSimuladorSaudeUserId(supabase) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user?.id) throw new Error('Sessão inválida. Entre novamente.');

  let profile = unwrap(await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle(), 'Não foi possível identificar o usuário da cotação.');
  if (!profile && authData.user.email) {
    profile = unwrap(await supabase
      .from('usuarios')
      .select('id')
      .eq('email', authData.user.email)
      .maybeSingle(), 'Não foi possível identificar o usuário da cotação.');
  }
  if (!profile?.id) throw new Error('Seu usuário não está cadastrado no Hub.');
  return profile.id;
}

const QUOTE_LIST_COLUMNS = 'id,codigo,cliente_nome,cliente_cnpj,cliente_cidade,status,snapshot_version,snapshot,created_at,updated_at';

export async function getLatestSimuladorSaudeQuote() {
  const supabase = exigirSupabaseConfigurado();
  const userId = await getCurrentSimuladorSaudeUserId(supabase);

  return unwrap(await supabase
    .from('simulador_saude_cotacoes')
    .select(`${QUOTE_LIST_COLUMNS},tipo_contratacao,vigencia`)
    .eq('created_by', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle(), 'Não foi possível carregar a última cotação salva.');
}

export async function getRecentSimuladorSaudeQuotes(limit = 10) {
  const supabase = exigirSupabaseConfigurado();
  const userId = await getCurrentSimuladorSaudeUserId(supabase);
  const safeLimit = Math.max(1, Math.min(50, Math.floor(Number(limit) || 10)));
  return unwrap(await supabase
    .from('simulador_saude_cotacoes')
    .select(QUOTE_LIST_COLUMNS)
    .eq('created_by', userId)
    .order('updated_at', { ascending: false })
    .limit(safeLimit), 'Não foi possível carregar as cotações recentes.');
}

export async function getSimuladorSaudeQuoteById(id) {
  if (!id) return null;
  const supabase = exigirSupabaseConfigurado();
  const userId = await getCurrentSimuladorSaudeUserId(supabase);
  return unwrap(await supabase
    .from('simulador_saude_cotacoes')
    .select(`${QUOTE_LIST_COLUMNS},tipo_contratacao,vigencia`)
    .eq('created_by', userId)
    .eq('id', id)
    .maybeSingle(), 'Não foi possível carregar esta cotação.');
}

export async function saveSimuladorSaudeQuote(payload) {
  const supabase = exigirSupabaseConfigurado();
  const record = {
    cliente_nome: String(payload.cliente_nome || '').trim(),
    cliente_cnpj: String(payload.cliente_cnpj || '').replace(/\D/g, '') || null,
    cliente_cidade: String(payload.cliente_cidade || '').trim() || null,
    tipo_contratacao: payload.tipo_contratacao || 'Empresarial (PJ)',
    vigencia: payload.vigencia || null,
    status: payload.status === 'proposta' ? 'proposta' : 'rascunho',
    snapshot_version: 1,
    snapshot: payload.snapshot || {}
  };
  const response = payload.id
    ? await supabase.from('simulador_saude_cotacoes').update(record).eq('id', payload.id).select('id,codigo,snapshot_version,updated_at').single()
    : await supabase.from('simulador_saude_cotacoes').insert(record).select('id,codigo,snapshot_version,updated_at').single();
  return unwrap(response, 'Não foi possível salvar a cotação.');
}

export async function getSimuladorSaudeBrokerBranding() {
  const supabase = exigirSupabaseConfigurado();
  return unwrap(await supabase.rpc('simulador_saude_dados_corretora'), 'Não foi possível carregar os dados da corretora.');
}
