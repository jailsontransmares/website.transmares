import { exigirSupabaseConfigurado } from '../supabaseClient.js';

function normalizarStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function parseDescricao(valor) {
  if (!valor) return {};

  try {
    const dados = JSON.parse(valor);
    return dados && typeof dados === 'object' ? dados : { descricao: valor };
  } catch {
    return { titulo: valor, descricao: valor };
  }
}

function serializarDescricao(payload) {
  return JSON.stringify({
    titulo: String(payload.titulo || '').trim(),
    descricao: String(payload.descricao || '').trim(),
    url: String(payload.url || '').trim(),
    login: String(payload.login || '').trim(),
    categoria: String(payload.categoria || '').trim(),
    grupo: String(payload.grupo || '').trim()
  });
}

async function carregarUsuarioAtual() {
  const supabase = exigirSupabaseConfigurado();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user?.email) {
    throw new Error('Sessão inválida. Entre novamente.');
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', authData.user.email)
    .single();

  if (error || !data) {
    throw new Error('Seu usuário não está cadastrado no painel.');
  }

  return data;
}

async function carregarTaxonomias() {
  const supabase = exigirSupabaseConfigurado();
  const [categorias, grupos] = await Promise.all([
    supabase.from('categorias').select('*').order('nome', { ascending: true }),
    supabase.from('grupos').select('*').order('nome', { ascending: true })
  ]);

  if (categorias.error) throw new Error(categorias.error.message || 'Não foi possível carregar categorias.');
  if (grupos.error) throw new Error(grupos.error.message || 'Não foi possível carregar grupos.');

  return {
    categorias: (categorias.data || []).filter(item => normalizarStatus(item.status) !== 'inativo'),
    grupos: (grupos.data || []).filter(item => normalizarStatus(item.status) !== 'inativo')
  };
}

function mapearAcesso(item) {
  const dados = parseDescricao(item.descricao);

  return {
    id: item.id,
    titulo: dados.titulo || item.descricao || 'Acesso',
    descricao: dados.descricao || '',
    url: dados.url || '',
    login: dados.login || '',
    senha: item.chave || '',
    categoria: dados.categoria || '',
    grupo: dados.grupo || '',
    status: item.status || 'ativo',
    data_inicio: item.data_inicio || '',
    data_fim: item.data_fim || ''
  };
}

function filtrarAcessos(acessos, filtros = {}) {
  return acessos.filter(item => {
    if (filtros.categoria && item.categoria !== filtros.categoria) return false;
    if (filtros.grupo && item.grupo !== filtros.grupo) return false;
    if (filtros.status && item.status !== filtros.status) return false;
    if (!filtros.status && normalizarStatus(item.status) === 'inativo') return false;
    return true;
  });
}

function montarResumo(acessos) {
  return {
    total: acessos.length,
    ativos: acessos.filter(item => normalizarStatus(item.status) !== 'inativo').length,
    inativos: acessos.filter(item => normalizarStatus(item.status) === 'inativo').length
  };
}

export async function carregarPasswordsData(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const taxonomias = await carregarTaxonomias();
  const { data, error } = await supabase
    .from('chaves_acesso')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar acessos.');
  }

  const acessos = (data || []).map(mapearAcesso);

  return {
    ...taxonomias,
    acessos: filtrarAcessos(acessos, payload),
    resumo: montarResumo(acessos),
    historico: []
  };
}

export async function salvarPasswordItem(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const usuario = await carregarUsuarioAtual();
  const item = {
    usuario_id: usuario.id,
    chave: String(payload.senha || '').trim(),
    descricao: serializarDescricao(payload),
    status: payload.status === 'inativo' ? 'inativo' : 'ativo'
  };

  if (!payload.titulo || !payload.login || !item.chave) {
    throw new Error('Informe título, login e senha.');
  }

  const query = payload.id
    ? supabase.from('chaves_acesso').update(item).eq('id', payload.id).select('*').single()
    : supabase.from('chaves_acesso').insert(item).select('*').single();

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar o acesso.');
  }

  return { acesso: mapearAcesso(data) };
}
