import { exigirSupabaseConfigurado } from '../supabaseClient.js';

const DEFAULT_COLORS = {
  cor_principal: '#294895',
  cor_secundaria: '#1F3676',
  cor_destaque: '#16A34A'
};

const ENTIDADES_ADMIN = {
  categorias: 'categorias',
  grupos: 'grupos'
};

function normalizarStatus(status) {
  return String(status || 'ativo').trim().toLowerCase() === 'inativo' ? 'inativo' : 'ativo';
}

function getDadosItem(item) {
  return item?.dados && typeof item.dados === 'object' ? item.dados : {};
}

function isModuloItem(item) {
  return String(getDadosItem(item).tipo || item?.tipo || '').trim().toLowerCase() === 'modulo';
}

function normalizarModuloAdmin(item) {
  const dados = getDadosItem(item);
  const slug = String(dados.slug || item.slug || item.id_modulo || item.modulo_id || item.id || '').trim();
  const ordem = Number(dados.ordem);
  const bloqueavel = dados.bloqueavel === false ? false : slug !== 'administracao';

  return {
    id: item.id,
    slug,
    nome: item.titulo || item.nome || item.label || slug,
    descricao: item.descricao || dados.descricao || '',
    status: normalizarStatus(item.status),
    ordem: Number.isFinite(ordem) ? ordem : 9999,
    bloqueavel
  };
}

function normalizarConfigLista(registros) {
  return [...(registros || [])].sort((a, b) => {
    const grupo = String(a.grupo || '').localeCompare(String(b.grupo || ''), 'pt-BR');
    if (grupo !== 0) return grupo;
    return String(a.chave || '').localeCompare(String(b.chave || ''), 'pt-BR');
  });
}

function normalizarConfigObjeto(registros) {
  return (registros || []).reduce((acc, item) => {
    if (item.chave) {
      acc[item.chave] = item.valor ?? '';
    }
    return acc;
  }, {});
}

async function carregarConfiguracoes() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase
    .from('configuracoes')
    .select('*')
    .eq('status', 'ativo')
    .order('grupo', { ascending: true })
    .order('chave', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar configurações.');
  }

  return data || [];
}

function validarEntidade(entidade) {
  const tabela = ENTIDADES_ADMIN[entidade];

  if (!tabela) {
    throw new Error('Cadastro administrativo não suportado.');
  }

  return tabela;
}

export async function carregarAdminData() {
  const config = await carregarConfiguracoes();
  return { config: normalizarConfigLista(config) };
}

export async function listarRegistrosAdmin({ entidade }) {
  const supabase = exigirSupabaseConfigurado();
  const tabela = validarEntidade(entidade);
  const { data, error } = await supabase
    .from(tabela)
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar registros.');
  }

  return { records: data || [] };
}

export async function listarModulosAdmin() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase
    .from('itens')
    .select('*')
    .order('titulo', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar módulos.');
  }

  const modules = (data || [])
    .filter(isModuloItem)
    .map(normalizarModuloAdmin)
    .filter(item => item.slug)
    .sort((a, b) => {
      if (a.ordem !== b.ordem) {
        return a.ordem - b.ordem;
      }

      return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
    });

  return { modules };
}

export async function listarUsuariosAdmin() {
  const supabase = exigirSupabaseConfigurado();
  const [usuarios, perfis] = await Promise.all([
    supabase
      .from('usuarios')
      .select('*')
      .order('nome', { ascending: true }),
    supabase
      .from('perfis')
      .select('*')
      .order('nivel', { ascending: false })
  ]);

  if (usuarios.error) {
    throw new Error(usuarios.error.message || 'Não foi possível carregar usuários.');
  }

  if (perfis.error) {
    throw new Error(perfis.error.message || 'Não foi possível carregar perfis.');
  }

  const perfisPorId = new Map((perfis.data || []).map(perfil => [perfil.id, perfil]));
  const records = (usuarios.data || []).map(usuario => {
    const perfil = perfisPorId.get(usuario.perfil_id) || {};

    return {
      id: usuario.id,
      nome: usuario.nome || usuario.email || 'Usuário',
      email: usuario.email || '',
      perfil_id: usuario.perfil_id || '',
      perfil: perfil.nome || usuario.perfil || '',
      perfil_slug: perfil.slug || usuario.perfil || '',
      status: usuario.status || 'pendente',
      is_master: Boolean(usuario.is_master),
      ultimo_login_em: usuario.ultimo_login_em || '',
      bloqueado_em: usuario.bloqueado_em || ''
    };
  });

  return { records };
}

export async function listarPermissoesUsuarioAdmin({ usuario_id }) {
  const supabase = exigirSupabaseConfigurado();

  if (!usuario_id) {
    throw new Error('Informe o usuário.');
  }

  const [recursos, permissoes] = await Promise.all([
    supabase
      .from('recursos_acesso')
      .select('*')
      .order('ordem', { ascending: true }),
    supabase
      .from('usuario_permissoes')
      .select('*')
      .eq('usuario_id', usuario_id)
  ]);

  if (recursos.error) {
    throw new Error(recursos.error.message || 'Não foi possível carregar recursos.');
  }

  if (permissoes.error) {
    throw new Error(permissoes.error.message || 'Não foi possível carregar permissões do usuário.');
  }

  return {
    recursos: recursos.data || [],
    permissoes: permissoes.data || []
  };
}

export async function salvarUsuarioAdmin({ id, nome, email, perfil_id, status }) {
  const supabase = exigirSupabaseConfigurado();
  const payload = {
    nome: String(nome || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    perfil_id: perfil_id || null,
    status: ['pendente', 'ativo', 'bloqueado', 'inativo'].includes(status) ? status : 'pendente',
    updated_at: new Date().toISOString()
  };

  if (!payload.nome) {
    throw new Error('Informe o nome do usuário.');
  }

  if (!payload.email) {
    throw new Error('Informe o e-mail do usuário.');
  }

  const query = id
    ? supabase.from('usuarios').update(payload).eq('id', id).select('*').single()
    : supabase.from('usuarios').insert(payload).select('*').single();

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar o usuário.');
  }

  await supabase.rpc('app_registrar_auditoria', {
    p_acao: id ? 'usuario.atualizar' : 'usuario.criar',
    p_recurso: 'admin.usuarios',
    p_alvo_usuario_id: data.id,
    p_detalhes: {
      email: data.email,
      status: data.status,
      perfil_id: data.perfil_id
    }
  });

  return { record: data };
}

export async function listarPerfisAdmin() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase
    .from('perfis')
    .select('*')
    .order('nivel', { ascending: false })
    .order('nome', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar perfis.');
  }

  return { records: data || [] };
}

export async function salvarPerfilAdmin({ id, slug, nome, descricao, nivel, status }) {
  const supabase = exigirSupabaseConfigurado();
  const payload = {
    slug: String(slug || nome || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
    nome: String(nome || '').trim(),
    descricao: String(descricao || '').trim() || null,
    nivel: Number(nivel) || 0,
    status: status === 'inativo' ? 'inativo' : 'ativo',
    updated_at: new Date().toISOString()
  };

  if (!payload.slug) {
    throw new Error('Informe o identificador do perfil.');
  }

  if (!payload.nome) {
    throw new Error('Informe o nome do perfil.');
  }

  const query = id
    ? supabase.from('perfis').update(payload).eq('id', id).select('*').single()
    : supabase.from('perfis').insert(payload).select('*').single();

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar o perfil.');
  }

  await supabase.rpc('app_registrar_auditoria', {
    p_acao: id ? 'perfil.atualizar' : 'perfil.criar',
    p_recurso: 'admin.perfis',
    p_alvo_usuario_id: null,
    p_detalhes: {
      perfil_id: data.id,
      slug: data.slug,
      nivel: data.nivel,
      status: data.status
    }
  });

  return { record: data };
}

export async function listarPermissoesAdmin() {
  const supabase = exigirSupabaseConfigurado();
  const [recursos, perfis, permissoes] = await Promise.all([
    supabase
      .from('recursos_acesso')
      .select('*')
      .order('ordem', { ascending: true }),
    supabase
      .from('perfis')
      .select('*')
      .order('nivel', { ascending: false }),
    supabase
      .from('perfil_permissoes')
      .select('*')
  ]);

  if (recursos.error) {
    throw new Error(recursos.error.message || 'Não foi possível carregar recursos de acesso.');
  }

  if (perfis.error) {
    throw new Error(perfis.error.message || 'Não foi possível carregar perfis.');
  }

  if (permissoes.error) {
    throw new Error(permissoes.error.message || 'Não foi possível carregar permissões.');
  }

  return {
    recursos: recursos.data || [],
    perfis: perfis.data || [],
    permissoes: permissoes.data || []
  };
}

export async function salvarPermissaoPerfilAdmin({ perfil_id, recurso_chave, acao, permitido }) {
  const supabase = exigirSupabaseConfigurado();

  if (!perfil_id || !recurso_chave || !acao) {
    throw new Error('Informe perfil, recurso e ação.');
  }

  const payload = {
    perfil_id,
    recurso_chave,
    acao,
    permitido: Boolean(permitido),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('perfil_permissoes')
    .upsert(payload, { onConflict: 'perfil_id,recurso_chave,acao' })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar a permissão.');
  }

  await supabase.rpc('app_registrar_auditoria', {
    p_acao: 'perfil_permissao.alterar',
    p_recurso: 'admin.permissoes',
    p_alvo_usuario_id: null,
    p_detalhes: {
      perfil_id,
      recurso_chave,
      acao,
      permitido: Boolean(permitido)
    }
  });

  return { permission: data };
}

export async function salvarPermissaoUsuarioAdmin({ usuario_id, recurso_chave, acao, efeito }) {
  const supabase = exigirSupabaseConfigurado();
  const efeitoNormalizado = ['permitir', 'negar'].includes(efeito) ? efeito : '';

  if (!usuario_id || !recurso_chave || !acao) {
    throw new Error('Informe usuário, recurso e ação.');
  }

  if (!efeitoNormalizado) {
    const { error } = await supabase
      .from('usuario_permissoes')
      .delete()
      .eq('usuario_id', usuario_id)
      .eq('recurso_chave', recurso_chave)
      .eq('acao', acao);

    if (error) {
      throw new Error(error.message || 'Não foi possível remover a permissão individual.');
    }

    await supabase.rpc('app_registrar_auditoria', {
      p_acao: 'usuario_permissao.remover',
      p_recurso: 'admin.usuarios',
      p_alvo_usuario_id: usuario_id,
      p_detalhes: {
        recurso_chave,
        acao
      }
    });

    return { permission: null };
  }

  const payload = {
    usuario_id,
    recurso_chave,
    acao,
    efeito: efeitoNormalizado,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('usuario_permissoes')
    .upsert(payload, { onConflict: 'usuario_id,recurso_chave,acao' })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar a permissão individual.');
  }

  await supabase.rpc('app_registrar_auditoria', {
    p_acao: 'usuario_permissao.alterar',
    p_recurso: 'admin.usuarios',
    p_alvo_usuario_id: usuario_id,
    p_detalhes: {
      recurso_chave,
      acao,
      efeito: efeitoNormalizado
    }
  });

  return { permission: data };
}

export async function salvarRegistroAdmin({ entidade, id, nome, descricao, status }) {
  const supabase = exigirSupabaseConfigurado();
  const tabela = validarEntidade(entidade);
  const payload = {
    nome: String(nome || '').trim(),
    descricao: String(descricao || '').trim() || null,
    status: status === 'inativo' ? 'inativo' : 'ativo'
  };

  if (!payload.nome) {
    throw new Error('Informe o nome do registro.');
  }

  const query = id
    ? supabase.from(tabela).update(payload).eq('id', id).select('*').single()
    : supabase.from(tabela).insert(payload).select('*').single();

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar o registro.');
  }

  return { record: data };
}

export async function salvarStatusModuloAdmin({ id, status }) {
  const supabase = exigirSupabaseConfigurado();
  const statusNormalizado = normalizarStatus(status);

  if (!id) {
    throw new Error('Informe o módulo que será atualizado.');
  }

  const { data: atual, error: erroConsulta } = await supabase
    .from('itens')
    .select('*')
    .eq('id', id)
    .single();

  if (erroConsulta) {
    throw new Error(erroConsulta.message || 'Não foi possível localizar o módulo.');
  }

  if (!isModuloItem(atual)) {
    throw new Error('O registro informado não é um módulo.');
  }

  const modulo = normalizarModuloAdmin(atual);

  if (!modulo.bloqueavel && statusNormalizado === 'inativo') {
    throw new Error('O módulo Administração não pode ser inativado.');
  }

  const { error } = await supabase
    .from('itens')
    .update({ status: statusNormalizado })
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'Não foi possível atualizar o status do módulo.');
  }

  const { data: atualizado, error: erroVerificacao } = await supabase
    .from('itens')
    .select('*')
    .eq('id', id)
    .single();

  if (erroVerificacao) {
    throw new Error(erroVerificacao.message || 'Não foi possível confirmar o status do módulo.');
  }

  const moduloAtualizado = normalizarModuloAdmin(atualizado);

  if (moduloAtualizado.status !== statusNormalizado) {
    throw new Error('O Supabase não confirmou a alteração. Verifique as permissões de update da tabela itens.');
  }

  return { module: moduloAtualizado };
}

export async function salvarConfig({ chave, valor }) {
  const supabase = exigirSupabaseConfigurado();
  const { error } = await supabase
    .from('configuracoes')
    .update({ valor: valor ?? '' })
    .eq('chave', chave);

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar a configuração.');
  }

  const config = await carregarConfiguracoes();
  return { config: normalizarConfigObjeto(config) };
}

export async function restaurarCoresPadrao() {
  const supabase = exigirSupabaseConfigurado();
  const updates = Object.entries(DEFAULT_COLORS).map(([chave, valor]) =>
    supabase.from('configuracoes').update({ valor }).eq('chave', chave)
  );
  const resultados = await Promise.all(updates);
  const erro = resultados.find(resultado => resultado.error)?.error;

  if (erro) {
    throw new Error(erro.message || 'Não foi possível restaurar as cores.');
  }

  const config = await carregarConfiguracoes();
  return { config: normalizarConfigObjeto(config) };
}

export async function salvarTemaUsuario() {
  return { saved: false, reason: 'A tabela usuarios ainda não possui campo de preferência visual.' };
}
