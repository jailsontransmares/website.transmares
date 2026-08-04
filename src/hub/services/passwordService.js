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

async function usuarioPodeVerSenha() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.rpc('app_tem_permissao', {
    p_recurso: 'central_senhas',
    p_acao: 'view_secret'
  });

  if (error) {
    const usuario = await carregarUsuarioAtual().catch(() => null);
    const perfil = String(usuario?.perfil || '').toLowerCase();
    return perfil === 'gestor' || perfil === 'admin' || Boolean(usuario?.is_master);
  }

  return Boolean(data);
}

function mapearAcesso(item, revelarSenha = false) {
  const dados = parseDescricao(item.descricao);

  return {
    id: item.id,
    titulo: dados.titulo || item.descricao || 'Acesso',
    descricao: dados.descricao || '',
    url: dados.url || '',
    login: dados.login || '',
    senha: revelarSenha ? (item.chave || '') : '',
    categoria: dados.categoria || '',
    grupo: dados.grupo || '',
    status: item.status || 'ativo',
    data_inicio: item.data_inicio || '',
    data_fim: item.data_fim || ''
  };
}

function erroRpcAusente(error, nomeFuncao) {
  return error?.code === 'PGRST202'
    || String(error?.message || '').includes(nomeFuncao);
}

async function listarAcessosCompatibilidade(supabase) {
  const revelarSenha = await usuarioPodeVerSenha();
  const { data, error } = await supabase
    .from('chaves_acesso')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar acessos.');
  }

  return (data || []).map(item => mapearAcesso(item, revelarSenha));
}

async function listarAcessosSanitizados(supabase) {
  const { data, error } = await supabase.rpc('app_listar_chaves_acesso');

  if (error) {
    if (erroRpcAusente(error, 'app_listar_chaves_acesso')) {
      return listarAcessosCompatibilidade(supabase);
    }

    throw new Error(error.message || 'Não foi possível carregar acessos.');
  }

  return (data || []).map(item => mapearAcesso(item, true));
}

async function salvarAcessoCompatibilidade(supabase, payload, item) {
  const query = payload.id
    ? supabase.from('chaves_acesso').update(item).eq('id', payload.id).select('*').single()
    : supabase.from('chaves_acesso').insert(item).select('*').single();

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar o acesso.');
  }

  return data;
}

async function salvarAcessoControlado(supabase, payload, item) {
  const { data, error } = await supabase.rpc('app_salvar_chave_acesso', {
    p_id: payload.id || null,
    p_descricao: item.descricao,
    p_chave: item.chave,
    p_status: item.status
  });

  if (error) {
    if (erroRpcAusente(error, 'app_salvar_chave_acesso')) {
      return salvarAcessoCompatibilidade(supabase, payload, item);
    }

    throw new Error(error.message || 'Não foi possível salvar o acesso.');
  }

  return Array.isArray(data) ? data[0] : data;
}

async function excluirAcessoCompatibilidade(supabase, id) {
  const { error } = await supabase
    .from('chaves_acesso')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'Não foi possível excluir o acesso.');
  }
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
  const [taxonomias, acessos] = await Promise.all([
    carregarTaxonomias(),
    listarAcessosSanitizados(supabase)
  ]);

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

  const data = await salvarAcessoControlado(supabase, payload, item);

  return { acesso: mapearAcesso(data, true) };
}

export async function excluirPasswordItem(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const id = String(payload.id || '').trim();

  if (!id) {
    throw new Error('Acesso inválido para exclusão.');
  }

  const { error } = await supabase.rpc('app_excluir_chave_acesso', {
    p_id: id
  });

  if (error) {
    if (erroRpcAusente(error, 'app_excluir_chave_acesso')) {
      await excluirAcessoCompatibilidade(supabase, id);
      return { id };
    }

    throw new Error(error.message || 'Não foi possível excluir o acesso.');
  }

  return { id };
}
