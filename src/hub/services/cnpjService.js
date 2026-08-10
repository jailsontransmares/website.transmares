import { exigirSupabaseConfigurado } from '../supabaseClient.js';

export function normalizarCnpjLocal(value = '') {
  return String(value ?? '').replace(/\D/g, '');
}

export function mapearCnpjConsultado(data = {}) {
  return {
    cnpj: normalizarCnpjLocal(data.cnpj),
    razaoSocial: String(data.razao_social ?? data.razaoSocial ?? '').trim(),
    situacao: String(data.situacao ?? '').trim(),
    endereco: String(data.endereco ?? '').trim(),
    numero: String(data.numero ?? '').trim(),
    complemento: String(data.complemento ?? '').trim(),
    cep: String(data.cep ?? '').trim(),
    bairro: String(data.bairro ?? '').trim(),
    municipio: String(data.municipio ?? '').trim(),
    uf: String(data.uf ?? '').trim().toUpperCase(),
    porte: String(data.porte ?? '').trim(),
    consultadoEm: data.consultado_em ?? data.consultadoEm ?? null
  };
}

export async function consultarCnpj(cnpj) {
  const normalized = normalizarCnpjLocal(cnpj);
  if (normalized.length !== 14) throw new Error('Informe um CNPJ válido.');

  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.functions.invoke('cnpj-lookup', {
    body: { cnpj: normalized }
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.message || 'Não foi possível consultar o CNPJ.');
  return { ...data, data: data.found ? mapearCnpjConsultado(data.data) : null };
}

export async function salvarCnpjTemporario({ oportunidadeId, produtoId, dados, fonte = 'manual', reconsultar = false }) {
  const supabase = exigirSupabaseConfigurado();
  const cnpj = mapearCnpjConsultado(dados);
  const { data, error } = await supabase.rpc('crm_salvar_cnpj_temporario', {
    p_oportunidade_id: String(oportunidadeId || ''),
    p_produto_id: String(produtoId || ''),
    p_cnpj: cnpj.cnpj,
    p_razao_social: cnpj.razaoSocial,
    p_situacao: cnpj.situacao,
    p_endereco: cnpj.endereco,
    p_numero: cnpj.numero,
    p_complemento: cnpj.complemento,
    p_cep: cnpj.cep,
    p_bairro: cnpj.bairro,
    p_municipio: cnpj.municipio,
    p_uf: cnpj.uf,
    p_porte: cnpj.porte,
    p_fonte: fonte,
    p_consultado_em: cnpj.consultadoEm,
    p_reconsultar: Boolean(reconsultar)
  });
  if (error) throw error;
  return data;
}

export async function carregarCnpjTemporarios(oportunidadeId) {
  const supabase = exigirSupabaseConfigurado();
  const [{ data, error }, { data: links, error: linksError }] = await Promise.all([
    supabase
    .from('crm_oportunidades_pj_temporarios')
    .select('*')
    .eq('oportunidade_id', String(oportunidadeId || ''))
    .eq('status', 'ativo')
    .order('versao', { ascending: false }),
    supabase
      .from('crm_oportunidades_pj_temporarios_produtos')
      .select('temporario_id, produto_id')
      .eq('oportunidade_id', String(oportunidadeId || ''))
  ]);
  if (error || linksError) throw error || linksError;
  return (data || []).map((item) => ({
    ...mapearCnpjConsultado(item),
    id: item.id,
    oportunidadeId: item.oportunidade_id,
    produtoIds: (links || []).filter((link) => link.temporario_id === item.id).map((link) => link.produto_id),
    versao: item.versao,
    status: item.status,
    fonte: item.fonte,
    confirmadoEm: item.confirmado_em,
    atualizadoEm: item.updated_at
  }));
}
