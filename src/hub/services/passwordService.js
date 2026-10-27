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
    seguradoraId: item.seguradora_id || '',
    seguradoraNome: item.seguradora_nome || dados.categoria || '',
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

  return (data || []).map(item => mapearAcesso(item, Boolean(item.chave)));
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
    if (filtros.seguradoraId && item.seguradoraId !== filtros.seguradoraId) return false;
    if (filtros.grupo && item.grupo !== filtros.grupo) return false;
    if (filtros.status && item.status !== filtros.status) return false;
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
  const statusAcessos = payload.status === undefined ? 'ativo' : payload.status;
  const [taxonomias, acessos, seguradorasResult] = await Promise.all([
    carregarTaxonomias(),
    listarAcessosSanitizados(supabase),
    supabase.rpc('app_listar_seguradoras', { p_status: 'todos' })
  ]);

  if (seguradorasResult.error) throw new Error(seguradorasResult.error.message || 'Não foi possível carregar seguradoras.');

  return {
    ...taxonomias,
    seguradoras: seguradorasResult.data || [],
    acessos: filtrarAcessos(acessos, { ...payload, status: statusAcessos }),
    resumo: montarResumo(acessos),
    historico: []
  };
}

export async function salvarPasswordItem(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const item = {
    chave: String(payload.senha || '').trim(),
    descricao: serializarDescricao(payload),
    status: payload.status === 'inativo' ? 'inativo' : 'ativo'
  };

  if (!payload.id || !payload.seguradoraId) {
    throw new Error('Selecione uma seguradora válida para o acesso.');
  }
  if (!payload.titulo || !payload.login || !item.chave) throw new Error('Informe título, login e senha.');

  const { error } = await supabase.rpc('app_salvar_acesso_seguradora', {
    p_id: payload.id,
    p_seguradora_id: payload.seguradoraId,
    p_descricao: item.descricao,
    p_chave: item.chave,
    p_status: item.status
  });
  if (error) throw new Error(error.message || 'Não foi possível salvar o acesso.');
  return { id: payload.id };
}

export async function criarAcessosSeguradora(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.rpc('app_criar_acessos_seguradora', {
    p_seguradora_id: payload.seguradoraId || null,
    p_nome: payload.nome || null,
    p_acessos: payload.acessos || []
  });
  if (error) throw new Error(error.message || 'Não foi possível criar acessos.');
  return Array.isArray(data) ? data[0] : data;
}

export async function renomearSeguradora(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const { error } = await supabase.rpc('app_renomear_seguradora', { p_id: payload.id, p_nome: payload.nome });
  if (error) throw new Error(error.message || 'Não foi possível renomear seguradora.');
  return { id: payload.id };
}

export async function alterarStatusSeguradora(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  if (!payload.id || !['ativo', 'inativo'].includes(payload.status)) {
    throw new Error('Informe a seguradora e o status válido.');
  }
  const { error } = await supabase.rpc('app_alterar_status_seguradora', {
    p_id: payload.id,
    p_status: payload.status
  });
  if (error) throw new Error(error.message || 'Não foi possível alterar o status da seguradora.');
  return { id: payload.id, status: payload.status };
}

export async function excluirSeguradora(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const { error } = await supabase.rpc('app_excluir_seguradora', { p_id: payload.id });
  if (error) throw new Error(error.message || 'Não foi possível excluir seguradora.');
  return { id: payload.id };
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
