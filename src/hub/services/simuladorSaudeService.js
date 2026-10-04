import { exigirSupabaseConfigurado } from '../supabaseClient.js';

const TABLES = {
  operators: 'simulador_saude_operadoras',
  plans: 'simulador_saude_planos',
  prices: 'simulador_saude_tabelas_precos',
  bands: 'simulador_saude_precos_faixa',
  accommodationBands: 'simulador_saude_precos_faixa_acomodacao',
  history: 'simulador_saude_catalogo_historico'
};

function unwrap(response, message) {
  if (response.error) throw new Error(response.error.message || message);
  return response.data;
}

function literalIlike(value) {
  return String(value || '').replace(/[\\%_]/g, '\\$&');
}

async function findMatchingPlan(supabase, plan) {
  const matches = unwrap(await supabase.from(TABLES.plans)
    .select('id')
    .eq('operadora_id', plan.operadora_id)
    .ilike('nome', literalIlike(plan.nome))
    .ilike('modalidade', literalIlike(plan.modalidade))
    .ilike('abrangencia', literalIlike(plan.abrangencia))
    .limit(1), 'Não foi possível consultar o plano.');
  return matches[0] || null;
}

export async function getSimuladorSaudeCatalog() {
  const supabase = exigirSupabaseConfigurado();
  const [operators, plans, tables, bands, accommodationBands, history] = await Promise.all([
    supabase.from(TABLES.operators).select('*').order('nome'),
    supabase.from(TABLES.plans).select('*').order('nome'),
    supabase.from(TABLES.prices).select('*').order('vigencia_inicio', { ascending: false }),
    supabase.from(TABLES.bands).select('*'),
    supabase.from(TABLES.accommodationBands).select('*'),
    supabase.from(TABLES.history).select('*').order('created_at', { ascending: false }).limit(20)
  ]);
  return {
    operators: unwrap(operators, 'Não foi possível carregar as operadoras.'),
    plans: unwrap(plans, 'Não foi possível carregar os planos.'),
    tables: unwrap(tables, 'Não foi possível carregar as tabelas de preços.'),
    bands: unwrap(bands, 'Não foi possível carregar os preços por faixa.'),
    accommodationBands: unwrap(accommodationBands, 'Não foi possível carregar os preços por acomodação.'),
    history: unwrap(history, 'Não foi possível carregar o histórico.')
  };
}

export async function saveSimuladorSaudePlan(draft) {
  const supabase = exigirSupabaseConfigurado();
  const operatorId = draft.operadora_id || await ensureOperator(supabase, draft.operadora_nome);
  const plan = {
    operadora_id: operatorId,
    nome: String(draft.plano_nome || '').trim(),
    modalidade: String(draft.modalidade || '').trim(),
    abrangencia: String(draft.abrangencia || '').trim(),
    detalhes: draft.detalhes && typeof draft.detalhes === 'object' ? draft.detalhes : {},
    status: draft.status || 'ativo'
  };
  if (!plan.nome || !plan.modalidade || !plan.abrangencia) throw new Error('Preencha plano, modalidade e abrangência.');
  if (draft.plano_id) {
    unwrap(await supabase.from(TABLES.plans).update(plan).eq('id', draft.plano_id), 'Não foi possível atualizar o plano.');
    return draft.plano_id;
  }
  const matching = await findMatchingPlan(supabase, plan);
  if (matching) {
    unwrap(await supabase.from(TABLES.plans).update(plan).eq('id', matching.id), 'Não foi possível atualizar os dados do plano.');
    return matching.id;
  }
  return unwrap(await supabase.from(TABLES.plans).insert(plan).select('id').single(), 'Não foi possível cadastrar o plano.').id;
}

export async function setSimuladorSaudePlanStatus(id, status) {
  if (!id || !['ativo', 'inativo'].includes(status)) throw new Error('Informe o plano e um status válido.');
  const supabase = exigirSupabaseConfigurado();
  return unwrap(await supabase.from(TABLES.plans).update({ status }).eq('id', id).select('*').single(), 'Não foi possível alterar o status do plano.');
}

export async function deleteSimuladorSaudePlan(id) {
  if (!id) throw new Error('Informe o plano que deseja excluir.');
  const supabase = exigirSupabaseConfigurado();
  return unwrap(await supabase.rpc('simulador_saude_excluir_plano', { p_plano_id: id }), 'Não foi possível excluir o plano.');
}

export async function saveSimuladorSaudeOperator(draft) {
  const supabase = exigirSupabaseConfigurado();
  const operator = {
    nome: String(draft.nome || '').trim(),
    logo_url: String(draft.logo_url || '').trim() || null,
    cor_marca: /^#[0-9A-Fa-f]{6}$/.test(draft.cor_marca || '') ? draft.cor_marca : '#174A8B',
    status: draft.status || 'ativo'
  };
  if (!operator.nome) throw new Error('Informe o nome da operadora.');
  if (draft.id) {
    unwrap(await supabase.from(TABLES.operators).update(operator).eq('id', draft.id), 'Não foi possível atualizar a operadora.');
    return draft.id;
  }
  return unwrap(await supabase.from(TABLES.operators).insert(operator).select('id').single(), 'Não foi possível cadastrar a operadora.').id;
}

async function ensureOperator(supabase, operatorName) {
  const name = String(operatorName || '').trim();
  if (!name) throw new Error('Informe a operadora.');
  const existing = unwrap(await supabase.from(TABLES.operators).select('id,nome').ilike('nome', name).limit(1), 'Não foi possível consultar a operadora.');
  if (existing[0]) return existing[0].id;
  return unwrap(await supabase.from(TABLES.operators).insert({ nome: name }).select('id').single(), 'Não foi possível cadastrar a operadora.').id;
}

async function ensurePlan(supabase, draft, operatorId) {
  if (draft.plano_id) {
    const existing = unwrap(await supabase.from(TABLES.plans).select('id,operadora_id').eq('id', draft.plano_id).single(), 'Não foi possível localizar o plano selecionado.');
    if (operatorId && existing.operadora_id !== operatorId) throw new Error('O plano selecionado não pertence à operadora escolhida.');
    return existing.id;
  }
  const plan = {
    operadora_id: operatorId,
    nome: String(draft.plano_nome || '').trim(),
    modalidade: String(draft.modalidade || '').trim(),
    abrangencia: String(draft.abrangencia || '').trim(),
    ...(draft.condicoes && Object.keys(draft.condicoes).length ? { detalhes: draft.condicoes } : {}),
    status: 'ativo'
  };
  if (!plan.nome || !plan.modalidade || !plan.abrangencia) throw new Error('Preencha plano, modalidade e abrangência.');
  const matching = await findMatchingPlan(supabase, plan);
  if (matching) {
    unwrap(await supabase.from(TABLES.plans).update(plan).eq('id', matching.id), 'Não foi possível atualizar os dados do plano.');
    return matching.id;
  }
  return unwrap(await supabase.from(TABLES.plans).insert(plan).select('id').single(), 'Não foi possível cadastrar o plano.').id;
}

function normalizePrices(draft, tipoContratacao, accommodations) {
  const primaryAccommodation = draft.acomodacao || accommodations[0];
  const pricesByAccommodation = draft.precos_por_acomodacao || { [primaryAccommodation]: draft.precos || {} };
  return accommodations.flatMap(acomodacao => {
    const prices = pricesByAccommodation[acomodacao] || {};
    const variants = Object.values(prices).some(value => value && typeof value === 'object' && !Array.isArray(value))
      ? prices
      : { [tipoContratacao === 'Individual' ? 'uma_vida' : 'geral']: prices };
    return Object.entries(variants).flatMap(([regra_vidas, bands]) => Object.entries(bands || {}).map(([faixa_etaria, raw]) => ({
      acomodacao,
      faixa_etaria,
      regra_vidas,
      valor: String(raw ?? '').trim() === '' ? null : Number(String(raw).replace(',', '.'))
    })));
  }).filter(row => row.valor !== null && Number.isFinite(row.valor) && row.valor >= 0);
}

export async function saveSimuladorSaudeTable(draft) {
  const supabase = exigirSupabaseConfigurado();
  const operatorId = draft.operadora_id || (draft.plano_id ? null : await ensureOperator(supabase, draft.operadora_nome));
  const planId = await ensurePlan(supabase, draft, operatorId);
  const requestedStatus = draft.status || 'em_revisao';
  const accommodations = [...new Set((Array.isArray(draft.acomodacoes) ? draft.acomodacoes : [draft.acomodacao]).filter(item => ['Apartamento', 'Enfermaria', 'Ambulatorial'].includes(item)))];
  const primaryAccommodation = draft.acomodacao || accommodations[0];
  const table = {
    plano_id: planId,
    nome: String(draft.nome || '').trim(),
    acomodacao: String(primaryAccommodation || '').trim(),
    acomodacoes: accommodations,
    coparticipacao: draft.coparticipacao === true || draft.coparticipacao === 'true',
    codigo_interno: String(draft.codigo_interno || '').trim() || null,
    vigencia_inicio: draft.vigencia_inicio || null,
    vigencia_fim: draft.vigencia_fim || null,
    tipo_contratacao: draft.tipo_contratacao || 'Empresarial (PJ)',
    min_vidas: Number(draft.min_vidas) || 1,
    condicoes: {},
    status: 'em_revisao',
    observacoes: String(draft.observacoes || '').trim() || null
  };
  if (!table.nome) throw new Error('Informe o nome da tabela.');
  if (!['Apartamento', 'Enfermaria', 'Ambulatorial'].includes(table.acomodacao) || !accommodations.length || !accommodations.includes(table.acomodacao)) throw new Error('Selecione ao menos uma acomodação para a tabela.');
  if (draft.coparticipacao !== true && draft.coparticipacao !== false && draft.coparticipacao !== 'true' && draft.coparticipacao !== 'false') throw new Error('Informe se a tabela possui coparticipação.');
  if (!table.vigencia_inicio && requestedStatus === 'vigente') throw new Error('Informe o início da vigência antes de ativar a tabela.');
  if (!['Individual', 'Empresarial (PJ)'].includes(table.tipo_contratacao)) throw new Error('Selecione Individual ou Empresarial (PJ).');
  table.min_vidas = 1;
  let tableId = draft.id;
  if (tableId) {
    unwrap(await supabase.from(TABLES.prices).update(table).eq('id', tableId), 'Não foi possível salvar a tabela.');
  } else {
    table.status = 'em_revisao';
    tableId = unwrap(await supabase.from(TABLES.prices).insert(table).select('id').single(), 'Não foi possível criar a tabela.').id;
  }

  const prices = normalizePrices({ ...draft, acomodacao: table.acomodacao }, table.tipo_contratacao, accommodations);
  const extraAccommodations = accommodations.filter(accommodation => accommodation !== table.acomodacao);
  const existingExtraBands = unwrap(await supabase.from(TABLES.accommodationBands).select('acomodacao').eq('tabela_preco_id', tableId), 'Não foi possível consultar os preços por acomodação.');
  for (const accommodation of new Set(existingExtraBands.map(row => row.acomodacao))) {
    if (!extraAccommodations.includes(accommodation)) {
      unwrap(await supabase.from(TABLES.accommodationBands).delete().eq('tabela_preco_id', tableId).eq('acomodacao', accommodation), 'Não foi possível remover a acomodação desmarcada.');
    }
  }
  const primaryPrices = prices.filter(row => row.acomodacao === table.acomodacao);
  const extraPrices = prices.filter(row => row.acomodacao !== table.acomodacao);
  if (primaryPrices.length) {
    const payload = primaryPrices.map(row => ({ tabela_preco_id: tableId, faixa_etaria: row.faixa_etaria, regra_vidas: row.regra_vidas, valor: row.valor }));
    unwrap(await supabase.from(TABLES.bands).upsert(payload, { onConflict: 'tabela_preco_id,faixa_etaria,regra_vidas' }), 'Não foi possível salvar os preços da acomodação principal.');
  }
  if (extraPrices.length) {
    const payload = extraPrices.map(row => ({ tabela_preco_id: tableId, acomodacao: row.acomodacao, faixa_etaria: row.faixa_etaria, regra_vidas: row.regra_vidas, valor: row.valor }));
    unwrap(await supabase.from(TABLES.accommodationBands).upsert(payload, { onConflict: 'tabela_preco_id,acomodacao,faixa_etaria,regra_vidas' }), 'Não foi possível salvar os preços por acomodação.');
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

export async function deleteSimuladorSaudeTable(id) {
  if (!id) throw new Error('Informe a tabela que deseja excluir.');
  const supabase = exigirSupabaseConfigurado();
  return unwrap(await supabase.rpc('simulador_saude_excluir_tabela', { p_tabela_preco_id: id }), 'Não foi possível excluir a tabela.');
}

const QUOTE_LIST_COLUMNS = 'id,codigo,cliente_nome,cliente_cnpj,cliente_cidade,status,snapshot_version,snapshot,created_at,updated_at';

export async function getLatestSimuladorSaudeQuote() {
  const supabase = exigirSupabaseConfigurado();

  return unwrap(await supabase
    .from('simulador_saude_cotacoes')
    .select(`${QUOTE_LIST_COLUMNS},tipo_contratacao,vigencia`)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle(), 'Não foi possível carregar a última cotação salva.');
}

export async function getRecentSimuladorSaudeQuotes() {
  const supabase = exigirSupabaseConfigurado();
  const pageSize = 500;
  const quotes = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = unwrap(await supabase
      .from('simulador_saude_cotacoes')
      .select(QUOTE_LIST_COLUMNS)
      .order('updated_at', { ascending: false })
      .range(offset, offset + pageSize - 1), 'Não foi possível carregar as cotações.');
    quotes.push(...page);
    if (page.length < pageSize) return quotes;
  }
}

export async function getSimuladorSaudeQuoteById(id) {
  if (!id) return null;
  const supabase = exigirSupabaseConfigurado();
  return unwrap(await supabase
    .from('simulador_saude_cotacoes')
    .select(`${QUOTE_LIST_COLUMNS},tipo_contratacao,vigencia`)
    .eq('id', id)
    .maybeSingle(), 'Não foi possível carregar esta cotação.');
}

export async function saveSimuladorSaudeQuote(payload) {
  const supabase = exigirSupabaseConfigurado();
  if (!['Individual', 'Empresarial (PJ)'].includes(payload.tipo_contratacao || 'Empresarial (PJ)')) throw new Error('Selecione Individual ou Empresarial (PJ).');
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
